// Cliente de la generación con IA. Dos caminos:
//  1. Con servidor propio (servidor/ en el computador del docente): se usa /api/generar y la clave vive en el servidor.
//  2. Sin servidor (GitHub Pages): el navegador llama directo a Gemini con la clave gratuita del docente,
//     guardada solo en ESTE navegador (localStorage). Nunca se sube al repositorio ni a otro sitio.
// Ambos caminos usan las mismas reglas (ia-reglas.mjs): mismo esquema, misma conversión y misma validación.
import { TIPOS_IA, REGLAS, validarContenido, limpiarPedido, limpiarInstruccion } from './ia-reglas.mjs';
import { el, esc, $ } from './ui.js';

export { TIPOS_IA, validarContenido };

const CLAVE_LS = 'plat.ia.clave';
// Mismos modelos que el servidor (servidor/ia.mjs). Primero el más rápido y gratuito (lite): para estas actividades
// basta y responde en segundos (probado 2026-11-21: quiz coherente en 9 s). Los otros quedan de respaldo.
const MODELOS = ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.8-flash'];
const ESPERA_MS = 45_000; // tope por modelo: antes no había y el botón se quedaba en "Generando…" para siempre
const ESCALON_MS = 6000; // si un modelo no ha contestado en este tiempo, se lanza también el siguiente
const API = 'https://generativelanguage.googleapis.com/v1beta/models';

export const claveIA = () => { try { return localStorage.getItem(CLAVE_LS) || ''; } catch { return ''; } };
const guardarClave = v => { try { v ? localStorage.setItem(CLAVE_LS, v) : localStorage.removeItem(CLAVE_LS); } catch {} };

let cache;
// { activa, servidor } — activa siempre es true: sin servidor, se usa Gemini con la clave del docente (se pide al generar).
export async function estadoIA() {
  cache ??= fetch('api/ia/estado', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then(j => (j.activa ? { ...j, servidor: true } : { activa: true, servidor: false }));
  return cache;
}

export const puedeGenerar = async tipo => TIPOS_IA.includes(tipo) && (await estadoIA()).activa;

// Diálogo para pegar (o cambiar / quitar) la clave de Gemini. → Promise<clave | ''>
export function configurarClave({ motivo = '' } = {}) {
  return new Promise(resolve => {
    const actual = claveIA();
    const d = el(`<dialog class="ia-dialog"><form method="dialog" novalidate>
      <h2 class="ia-h">Clave de IA (Gemini)</h2>
      ${motivo ? `<p class="errors" role="alert" style="list-style:none;padding:0">${esc(motivo)}</p>` : ''}
      <p class="small" style="margin-top:0">Para generar con IA se usa tu propia clave gratuita de Google Gemini:</p>
      <ol class="small" style="margin:0 0 12px; padding-left:20px; line-height:1.5">
        <li>Abre <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> e inicia sesión con tu cuenta de Google.</li>
        <li>Toca <b>Create API key</b> y copia la clave.</li>
        <li>Pégala aquí.</li>
      </ol>
      <div class="field"><label for="iaClave">Clave</label>
        <input id="iaClave" type="password" autocomplete="off" spellcheck="false" placeholder="AIza…" value="${esc(actual)}"></div>
      <p class="small muted">Se guarda solo en este navegador. No la compartas con estudiantes.</p>
      <div class="row end" style="margin-top:8px">
        ${actual ? '<button class="btn ghost danger-txt" type="button" data-quitar>Quitar clave</button>' : ''}
        <button class="btn ghost" type="button" data-cancel>Cancelar</button>
        <button class="btn" type="submit">Guardar</button>
      </div></form></dialog>`);
    document.body.append(d);
    let res = null;
    $('[data-cancel]', d).onclick = () => d.close();
    $('[data-quitar]', d)?.addEventListener('click', () => { guardarClave(''); res = ''; d.close(); });
    $('form', d).onsubmit = e => {
      e.preventDefault();
      const v = $('#iaClave', d).value.trim();
      if (v.length < 20) { $('#iaClave', d).setAttribute('aria-invalid', 'true'); $('#iaClave', d).focus(); return; }
      guardarClave(v); res = v; d.close();
    };
    d.addEventListener('close', () => { d.remove(); resolve(res ?? actual); }, { once: true });
    d.showModal();
    $('#iaClave', d).focus();
  });
}

// pedido = { tipo, tema, grado, cantidad, formato?, relacion?, banco?, notas?, vocabulario?, gramatica? }
// → { titulo, contenido, instruccion, modelo }. Lanza Error con un mensaje en español listo para mostrar.
// Lista que debe tener tantos elementos como pidió el docente (las demás actividades tienen su propio largo).
const LISTA = { quiz: ['questions', x => x.q], fill: ['items', x => x.text], reorder: ['items', x => x.sentence], dictation: ['items', x => x.text] };

export async function generar(pedido, { signal } = {}) {
  const { servidor } = await estadoIA();
  const pedir = pp => servidor ? conServidor(pp, signal) : conGemini(pp, signal);
  const j = await pedir(pedido);
  // A veces el modelo entrega menos de los pedidos (p. ej. 15 de 20): se piden los que faltan, sin repetir, y se juntan.
  const [clave, texto] = LISTA[pedido.tipo] || [];
  const quiere = Math.round(Number(pedido.cantidad) || 0);
  // Quiz de opción múltiple: dos preguntas con la misma respuesta correcta (p. ej. "eating" dos veces) cuentan como una;
  // la repetida se quita y entra en las que faltan.
  const respuesta = x => (!x.tf && x.options ? String(x.options[x.correct] || '').toLowerCase().trim() : null);
  const sinRepetir = l => { if (pedido.tipo !== 'quiz') return l; const vistas = new Set();
    return l.filter(x => { const r = respuesta(x); if (!r) return true; if (vistas.has(r)) return false; vistas.add(r); return true; }); };
  if (clave) j.contenido = { ...j.contenido, [clave]: sinRepetir(j.contenido?.[clave] || []) };
  for (let vuelta = 0; clave && vuelta < 2; vuelta++) {
    const lista = j.contenido?.[clave] || [];
    const falta = quiere - lista.length;
    if (falta <= 0 || signal?.aborted) break;
    try {
      const usadas = lista.map(x => respuesta(x)).filter(Boolean);
      const extra = await pedir({ ...pedido, cantidad: Math.max(falta, 1),
        evitar: lista.map(texto).join(' | ') + (usadas.length ? ` · Correct answers already used: ${usadas.join(', ')}` : '') });
      const vistos = new Set(lista.map(x => String(texto(x)).toLowerCase()));
      const nuevos = (extra.contenido?.[clave] || []).filter(x => !vistos.has(String(texto(x)).toLowerCase()));
      j.contenido = { ...j.contenido, [clave]: sinRepetir([...lista, ...nuevos]).slice(0, quiere) };
    } catch (e) { if (e.name === 'AbortError') throw e; break; }   // si falla, se queda con lo que ya hay
  }
  // Segunda revisión en el navegador (misma regla que el servidor).
  const errores = validarContenido(pedido.tipo, j.contenido);
  if (errores.length) throw new Error(`El contenido generado tiene problemas: ${errores[0]} Intenta de nuevo.`);
  return j;
}

async function conServidor(pedido, signal) {
  let r;
  try {
    r = await fetch('api/generar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido), signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error('No hay conexión con el servidor de la plataforma.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 429) throw new Error('Se agotó la cuota de la IA por ahora. Intenta en un minuto.');
    throw new Error(j.error || 'No se pudo generar. Intenta de nuevo.');
  }
  return j;
}

// ---------- Gemini directo desde el navegador ----------
const nivel = g => (g <= 3 ? 'pre-A1 (very simple words, present tense, very short sentences)' : g <= 5 ? 'A1' : g <= 7 ? 'A1-A2' : g <= 9 ? 'A2-B1' : 'B1');
const edad = g => `${g + 5}-${g + 6}`;

const SISTEMA = p => `You write English-as-a-foreign-language practice activities for students in a Colombian school (their first language is Spanish).
Students are in grade ${p.grado} of 11 (about ${edad(p.grado)} years old). Their English level is ${nivel(p.grado)}: use vocabulary and sentence length suited to that level.
Rules:
- Everything the student reads is in English, except Spanish translations or Spanish clues when the task asks for them.
- Content must be accurate, natural, school-appropriate and kind: no violence, romance, brands, politics, religion or real celebrities. Contexts from everyday school and family life (Colombian names and places are welcome).
- Every item has exactly one clearly correct answer. No duplicated items.
- "instruction": one short instruction in English for the student (max 12 words), e.g. "Complete the sentences with can or can't."
- "title": a short English title for the activity (max 6 words).
- Answer only with JSON that follows the given schema.`;

function mensaje(p) {
  const datos = [
    `Topic: ${p.tema}`,
    p.vocabulario ? `Target vocabulary (use these words): ${p.vocabulario}` : '',
    p.gramatica ? `Target grammar: ${p.gramatica}` : '',
    p.notas ? `Teacher notes (follow them): ${p.notas}` : '',
    p.evitar ? `Already written (do NOT repeat these items, their sentences or their target words): ${p.evitar}` : '',
  ].filter(Boolean);
  return `${datos.join('\n')}\n\n${REGLAS[p.tipo].pedido(p)}`;
}

async function conGemini(pedido, signal) {
  const p = limpiarPedido(pedido);
  let clave = claveIA();
  if (!clave) clave = await configurarClave();
  if (!clave) throw new Error('Para generar con IA necesitas pegar tu clave de Gemini.');
  const cuerpo = {
    systemInstruction: { parts: [{ text: SISTEMA(p) }] },
    contents: [{ role: 'user', parts: [{ text: mensaje(p) }] }],
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: REGLAS[p.tipo].esquema, temperature: 0.8 },
  };
  // Un intento con un modelo. ctlPropio corta este intento si otro modelo ganó la carrera.
  const pedir = async (modelo, body, ctlPropio = new AbortController()) => {
    const t = setTimeout(() => ctlPropio.abort(), ESPERA_MS);
    const cortar = () => ctlPropio.abort();
    signal?.addEventListener('abort', cortar, { once: true });
    try {
      return await fetch(`${API}/${modelo}:generateContent`, {
        method: 'POST', signal: ctlPropio.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (signal?.aborted) throw e;   // el docente canceló
      if (e.name === 'AbortError') return { status: 504, ok: false, json: async () => ({}) };   // tardó demasiado (o perdió la carrera)
      throw new Error('No hay conexión a internet o Gemini no responde. Intenta de nuevo.');
    } finally { clearTimeout(t); signal?.removeEventListener('abort', cortar); }
  };
  // Carrera escalonada (como servidor/ia.mjs): se pide al primer modelo; si en ESCALON_MS no ha contestado, se pide
  // también al siguiente, y gana la primera respuesta útil. Si uno falla (sin modelo, sin cuota, saturado, colgado),
  // se pasa al siguiente enseguida. Así un modelo colgado no deja al docente esperando.
  const FALLA = [404, 429, 500, 503, 504];
  const carrera = body => new Promise((resolver, rechazar) => {
    let i = 0, listo = false, ultimo = null;
    const enCurso = new Map();
    const lanzar = () => {
      if (listo || i >= MODELOS.length) return;
      const modelo = MODELOS[i++], ctl = new AbortController();
      const escalon = setTimeout(lanzar, ESCALON_MS);
      enCurso.set(modelo, { ctl, escalon });
      pedir(modelo, body, ctl).then(r => {
        clearTimeout(escalon); enCurso.delete(modelo);
        if (listo) return;
        if (!FALLA.includes(r.status)) {
          listo = true;
          for (const x of enCurso.values()) { clearTimeout(x.escalon); x.ctl.abort(); }
          return resolver({ r, modelo });
        }
        // Lo que se cuenta al final: la falta de cuota pesa más que la saturación, y esta más que un modelo inexistente.
        if (!ultimo || (ultimo.r.status !== 429 && r.status !== 404)) ultimo = { r, modelo };
        if (i < MODELOS.length) lanzar();
        else if (!enCurso.size) resolver(ultimo);
      }, e => {
        clearTimeout(escalon); enCurso.delete(modelo);
        if (listo) return;
        listo = true;
        for (const x of enCurso.values()) { clearTimeout(x.escalon); x.ctl.abort(); }
        rechazar(e);
      });
    };
    lanzar();
  });
  let { r, modelo } = await carrera(cuerpo);
  // Todos saturados (no por cuota ni colgados, para no doblar la espera): Gemini suele recuperarse en segundos; un reintento.
  if ([500, 503].includes(r.status) && !signal?.aborted) {
    await new Promise(ok => setTimeout(ok, 2500));
    ({ r, modelo } = await carrera(cuerpo));
  }
  let j = await r.json().catch(() => ({}));
  // Si el modelo no acepta el esquema como parámetro, se le manda dentro del texto (modo JSON simple).
  if (r.status === 400 && /schema/i.test(j.error?.message || '')) {
    const { responseJsonSchema, ...config } = cuerpo.generationConfig;
    r = await pedir(modelo, { ...cuerpo, generationConfig: config,
      contents: [{ role: 'user', parts: [{ text: `${mensaje(p)}\n\nJSON schema of the answer:\n${JSON.stringify(responseJsonSchema)}` }] }] });
    j = await r.json().catch(() => ({}));
  }
  if (!r.ok) {
    const msg = j.error?.message || '';
    if (r.status === 429) throw new Error(/day|día|quota/i.test(msg) ? 'Se agotó la cuota de Gemini de tu clave (por hoy o por falta de créditos). Intenta más tarde.' : 'Se agotó la cuota gratuita de Gemini por ahora. Intenta en un minuto.');
    if (r.status === 504) throw new Error('Gemini tardó demasiado en responder. Prueba con menos preguntas o intenta de nuevo.');
    if (/api key|API_KEY/i.test(msg) || r.status === 401 || r.status === 403) {
      guardarClave('');
      throw new Error('Gemini no aceptó la clave. Revisa que la copiaste completa y vuelve a intentarlo.');
    }
    if (r.status >= 500) throw new Error('Gemini está ocupado en este momento. Intenta de nuevo en unos segundos.');
    throw new Error('No se pudo generar. Intenta de nuevo.');
  }
  const texto = (j.candidates?.[0]?.content?.parts || []).map(x => x.text || '').join('');
  let o;
  try { o = JSON.parse(texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')); }
  catch { throw new Error(j.candidates?.[0]?.finishReason === 'SAFETY' ? 'Gemini no quiso generar ese tema. Prueba con otras palabras.' : 'La respuesta de la IA llegó incompleta. Intenta de nuevo.'); }
  return {
    titulo: String(o.title || '').trim().slice(0, 80),
    instruccion: limpiarInstruccion(o.instruction),
    contenido: REGLAS[p.tipo].convertir(o, p),
    modelo,
  };
}

// true si se puede generar ya (hay servidor o clave); si falta la clave, la pide una vez.
export async function asegurarClave() {
  if ((await estadoIA()).servidor || claveIA()) return true;
  return !!(await configurarClave());
}
