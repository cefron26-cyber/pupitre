// Reproductor de voces (Audio y Dictado). Con servidor propio: voces neuronales de Microsoft (MP3 de /api/voz).
// Sin servidor (GitHub Pages): voces del navegador, una distinta por personaje (mujer, hombre, niña, acento
// británico, abuelos…), con tono y velocidad propios para que los diálogos se distingan.
import { stopSpeaking, ttsAvailable } from './ui.js';
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
  turno++;
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
    if (!ttsAvailable()) return { ok: false, microsoft: false };
    const ok = await hablarNavegador(segmentos, velocidad, { onInicio, onAvance });
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

// ---------- Voces del navegador ----------
// Para cada voz del catálogo: género de la voz base, acento, tono (pitch 0-2) y ajuste de velocidad.
const PERFIL = {
  nina: ['f', 'US', 1.5, 0.95, 0], nina_uk: ['f', 'GB', 1.5, 0.95, 0],
  nino: ['m', 'US', 1.55, 0.97, 0], nino_uk: ['m', 'GB', 1.55, 0.97, 0],
  mujer: ['f', 'US', 1, 1, 0], mujer2: ['f', 'US', 1.08, 1, 1], mujer3: ['f', 'US', 0.94, 1, 2], mujer_uk: ['f', 'GB', 1, 1, 0],
  hombre: ['m', 'US', 1, 1, 0], hombre2: ['m', 'US', 0.92, 1, 1], hombre3: ['m', 'US', 1.06, 1, 2], hombre_uk: ['m', 'GB', 1, 1, 0],
  abuela: ['f', 'GB', 0.85, 0.85, 1], abuelo: ['m', 'US', 0.7, 0.85, 1],
  narradora: ['f', 'US', 1, 0.97, 1], narrador: ['m', 'US', 0.95, 0.97, 1],
};
// Nombres de voces conocidas (Windows, macOS, iOS, Android, Chrome, Edge) para adivinar el género.
const FEM = /female|woman|jenny|aria|ava|emma|michelle|ana\b|libby|sonia|maisie|samantha|zira|susan|hazel|karen|moira|tessa|victoria|allison|serena|kate|fiona|catherine|nicky|joanna|salli|kimberly|ivy|amy|emily|natasha|clara|jane|nancy|sara|google us english$/i;
const MAS = /\bmale|\bman\b|guy|andrew|brian|ryan|christopher|eric|thomas|david|mark|daniel|alex|fred|george|james|aaron|arthur|gordon|oliver|rishi|tom\b|matthew|joey|justin|roger|steffan|william|liam/i;
const generoDe = v => (MAS.test(v.name) && !/female/i.test(v.name) ? 'm' : FEM.test(v.name) ? 'f' : '?');

function vocesIngles() {
  const v = speechSynthesis.getVoices().filter(x => /^en[-_]/i.test(x.lang) || x.lang === 'en');
  // Primero las naturales/en línea (suenan mejor), luego las locales.
  return v.sort((a, b) => /natural|online|enhanced|premium/i.test(b.name) - /natural|online|enhanced|premium/i.test(a.name));
}

// Elige la voz del navegador y su tono para una voz del catálogo. Si el dispositivo no tiene una voz de ese
// género, se usa cualquiera en inglés y el tono hace la diferencia (más grave para hombres).
export function vozNavegador(id) {
  const [gen, acento, tono, vel, n] = PERFIL[id] || PERFIL.mujer;
  const todas = vocesIngles();
  const deAcento = todas.filter(x => new RegExp(`en[-_]${acento}`, 'i').test(x.lang));
  const pool = deAcento.length ? deAcento : todas;
  const mismas = pool.filter(x => generoDe(x) === gen).length ? pool.filter(x => generoDe(x) === gen) : todas.filter(x => generoDe(x) === gen);
  const voice = mismas.length ? mismas[n % mismas.length] : (pool.find(x => /en[-_]US/i.test(x.lang)) || pool[0] || null);
  const ajusteTono = !mismas.length && gen === 'm' ? -0.35 : 0; // sin voz masculina: más grave
  return { voice, pitch: Math.max(0.1, Math.min(2, tono + ajusteTono)), rate: vel, lang: voice?.lang || (acento === 'GB' ? 'en-GB' : 'en-US') };
}

let turno = 0;
function decir(texto, perfil, velocidad) {
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = perfil.lang; u.pitch = perfil.pitch; u.rate = Math.max(0.5, Math.min(2, velocidad * perfil.rate));
    if (perfil.voice) u.voice = perfil.voice;
    // Chrome a veces no dispara onend: tope de tiempo estimado para no quedarse esperando.
    const cap = setTimeout(() => resolve(true), (texto.split(/\s+/).length * 550) / u.rate + 4000);
    u.onend = () => { clearTimeout(cap); resolve(true); };
    u.onerror = e => { clearTimeout(cap); resolve(e.error === 'interrupted' || e.error === 'canceled' ? null : false); };
    speechSynthesis.speak(u);
  });
}

// Las voces del navegador cargan después de abrir la página (Chrome): esperar un momento la lista.
const listas = () => (speechSynthesis.getVoices().length ? Promise.resolve()
  : new Promise(r => { const t = setTimeout(r, 1200); speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(t); r(); }, { once: true }); }));

async function hablarNavegador(segmentos, velocidad, { onInicio, onAvance } = {}) {
  const yo = ++turno;
  stopSpeaking();
  await listas();
  const segs = segmentos.filter(s => s.texto?.trim());
  if (!segs.length) return false;
  onInicio?.();
  for (let i = 0; i < segs.length; i++) {
    if (yo !== turno) return false;
    onAvance?.(i / segs.length);
    const r = await decir(segs[i].texto.trim(), vozNavegador(esVoz(segs[i].voz) ? segs[i].voz : VOZ_DEFECTO), velocidad);
    if (r === null || yo !== turno) return false; // detenido
    if (r === false) { onAvance?.(0); return false; }
  }
  onAvance?.(0);
  return true;
}
