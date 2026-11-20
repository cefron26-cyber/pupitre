// Reproductor de las voces de Microsoft (Audio y Dictado). Pide el MP3 a nuestro servidor (/api/voz)
// y lo guarda en memoria; si no hay servidor, internet o edge-tts, usa la voz del navegador (speak).
import { speak, stopSpeaking, ttsAvailable } from './ui.js';
import { VOCES, VOZ_DEFECTO, esVoz } from './voces.mjs';

export { VOCES, VOZ_DEFECTO };

let estado;
export function vozMicrosoft() {
  estado ??= fetch('/api/ia/estado', { cache: 'no-store' }).then(r => (r.ok ? r.json() : {})).then(j => !!j.voz).catch(() => false);
  return estado;
}

const audios = new Map(); // clave → Promise<objectURL>
const claveDe = (segs, vel) => JSON.stringify([vel, segs.map(s => [s.voz, s.texto])]);

// segmentos [{ texto, voz }] → Promise<url> (lanza Error si no se pudo)
export function prepararVoz(segmentos, velocidad = 1) {
  const segs = segmentos.filter(s => s.texto?.trim()).map(s => ({ texto: s.texto.trim(), voz: esVoz(s.voz) ? s.voz : VOZ_DEFECTO }));
  const k = claveDe(segs, velocidad);
  if (!audios.has(k)) {
    const p = (async () => {
      if (!segs.length) throw new Error('No hay texto para leer.');
      if (!(await vozMicrosoft())) throw new Error('sin-voz');
      const r = await fetch('/api/voz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ segmentos: segs, velocidad }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'No se pudo preparar la voz.');
      return URL.createObjectURL(await r.blob());
    })();
    p.catch(() => audios.delete(k)); // si falla, se puede volver a intentar
    audios.set(k, p);
  }
  return audios.get(k);
}

let actual = null; // { audio, fin }
export function detenerVoz() {
  stopSpeaking();
  if (actual) { actual.audio.pause(); actual.fin(false); actual = null; }
}

// Reproduce de principio a fin. → Promise<{ ok, microsoft }>. onInicio se llama cuando suena de verdad;
// onAvance(0..1) mientras suena (solo con voz de Microsoft).
export async function reproducirVoz(segmentos, { velocidad = 1, onInicio, onAvance } = {}) {
  detenerVoz();
  let url = null;
  try { url = await prepararVoz(segmentos, velocidad); } catch (e) {
    if (e.message !== 'sin-voz') console.warn('[Voz]', e.message);
  }
  if (!url) {
    // Respaldo: voz del navegador.
    if (!ttsAvailable()) return { ok: false, microsoft: false };
    onInicio?.();
    const ok = await speak(segmentos.map(s => s.texto).join('\n'), { rate: velocidad });
    return { ok, microsoft: false };
  }
  return new Promise(resolve => {
    const audio = new Audio(url);
    const yo = { audio, fin: ok => { onAvance?.(0); resolve({ ok, microsoft: true }); } };
    detenerVoz();
    actual = yo;
    audio.ontimeupdate = () => { if (audio.duration) onAvance?.(audio.currentTime / audio.duration); };
    audio.onended = () => { if (actual === yo) actual = null; yo.fin(true); };
    audio.onerror = () => { if (actual === yo) actual = null; yo.fin(false); };
    audio.play().then(() => onInicio?.()).catch(() => { if (actual === yo) actual = null; yo.fin(false); });
  });
}
