// Barra del editor con "Generar con IA" (todos los tipos menos Memoria; con servidor propio o con la clave de Gemini del docente)
// e "Importar" (todos los tipos: pegar JSON hecho en un chat, sin gastar API).
// Nada se guarda solo: el contenido llega al editor para que el docente lo revise.
import { esc, el, $, toast } from '../ui.js';
import { gradeLabel } from '../logic.js';
import { puedeGenerar, generar, validarContenido, TIPOS_IA } from '../ia.js';

// Sin el ícono de destellos (estereotipo de IA, revisión 2026-11-19).
const SPARK = '';
const UPLOAD = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>';

// Opción propia de cada tipo en el formulario de IA.
const OPCION = {
  quiz: { name: 'formato', label: 'Tipo de preguntas', opts: [['multiple', 'Opción múltiple'], ['tf', 'Verdadero / falso'], ['mixto', 'Mezcla']] },
  matching: { name: 'relacion', label: 'Qué se empareja', opts: [['traduccion', 'Inglés ↔ español'], ['definicion', 'Palabra ↔ definición'], ['antonimo', 'Palabra ↔ contrario'], ['libre', 'Lo que mejor sirva']] },
  fill: { name: 'banco', label: 'Banco de palabras', opts: [['si', 'Con banco (más fácil)'], ['no', 'Sin banco (escriben)']] },
  listening: { name: 'formato', label: 'Tipo de audio', opts: [['dialogo', 'Diálogo (varias voces)'], ['narracion', 'Una persona cuenta algo (una voz)']] },
};
// Campo "Cantidad": nombre, valor inicial y máximo por tipo.
const CANT = { matching: ['Cantidad', 6, 10], listening: ['Preguntas', 5, 10], reading: ['Preguntas', 5, 10], reorder: ['Oraciones', 6, 15], classify: ['Cantidad', 8, 12], dictation: ['Cantidad', 8, 15], wordsearch: ['Palabras', 10, 15], hangman: ['Palabras', 6, 15], crossword: ['Palabras', 8, 15] };
const cant = t => CANT[t] || ['Cantidad', 8, 15];
const EJEMPLO_TEMA = {
  quiz: 'Ej. present simple con rutinas diarias',
  matching: 'Ej. animales de la granja',
  fill: 'Ej. there is / there are con objetos del salón',
  listening: 'Ej. pedir comida en un restaurante (would like, can I have)',
  reorder: 'Ej. preguntas con do / does',
  classify: 'Ej. countable vs uncountable',
  reading: 'Ej. un correo contando las vacaciones (past simple)',
  dictation: 'Ej. días de la semana y meses',
  wordsearch: 'Ej. frutas y verduras',
  hangman: 'Ej. profesiones',
  crossword: 'Ej. partes de la casa',
};

// Formato que se le pide a un chat para "Importar" (memoria no: lleva imágenes).
const PREG = '{ "q": "Where does Tom live?", "options": ["In Bogotá", "In Cali", "In Lima"], "correct": 0 }, { "q": "Tom has a dog.", "options": ["True", "False"], "correct": 1, "tf": true }';
const FORMATO = {
  quiz: `{ "questions": [ ${PREG} ] }`,
  matching: '{ "pairs": [ { "left": "happy", "right": "feliz" } ] }   (3 a 10 parejas)',
  fill: '{ "items": [ { "text": "She {{goes}} to school by bus.", "bank": ["goes", "go"] } ] }   (cada hueco entre {{ }}; respuestas alternativas con |, ej. {{is not|isn\'t}}; el banco es opcional pero debe tener una ficha por hueco)',
  reorder: '{ "items": [ { "sentence": "I have been living here for two years." } ] }',
  classify: '{ "groups": [ { "name": "Countable", "items": ["apple", "egg"] }, { "name": "Uncountable", "items": ["water", "rice"] } ] }   (2 a 4 grupos)',
  reading: `{ "title": "My weekend", "text": "Párrafo 1.\\n\\nPárrafo 2.", "questions": [ ${PREG} ] }`,
  listening: `{ "audio": { "kind": "tts", "script": "Diálogo, una línea por turno: Tom: Hi, Lucy!\\nLucy: Hello, Tom! (o un texto sin nombres para una narradora)", "rate": 1 }, "maxPlays": 0, "showScript": false, "questions": [ ${PREG} ] }`,
  dictation: '{ "items": [ { "text": "vegetables" } ], "rate": 0.9, "voz": "variada" }',
  wordsearch: '{ "items": [ { "word": "apple" }, { "word": "banana" }, { "word": "orange" } ], "diagonal": true, "backwards": false }   (3 a 15 palabras, máx. 12 letras)',
  hangman: '{ "items": [ { "word": "elephant", "hint": "A very big grey animal with a trunk." } ], "lives": 6 }',
  crossword: '{ "items": [ { "answer": "Monday", "clue": "The first day of the school week." } ] }   (3 a 15 respuestas de una palabra, máx. 15 letras)',
};

const tieneContenido = (tpl, c) => {
  // Compara con lo que devuelve un editor vacío del mismo tipo (ya normalizado).
  try { return JSON.stringify(c) !== JSON.stringify(tpl.editor(document.createElement('div'), tpl.empty()).getContent()); } catch { return true; }
};

// Agrega al final las listas (preguntas, parejas, frases…); lo demás se reemplaza.
// Audio: un guion nuevo trae sus propias preguntas → se reemplazan guion y preguntas (quedan las opciones del docente).
function unir(actual, nuevo, tipo) {
  if (tipo === 'reading') return nuevo;
  if (tipo === 'listening') return { ...nuevo, maxPlays: actual.maxPlays ?? nuevo.maxPlays, showScript: actual.showScript ?? nuevo.showScript };
  const r = { ...actual };
  for (const [k, v] of Object.entries(nuevo)) r[k] = Array.isArray(v) && Array.isArray(actual[k]) ? [...actual[k], ...v] : v;
  if (tipo === 'matching' && r.pairs.length > 10) { r.pairs = r.pairs.slice(0, 10); toast('Emparejar admite 10 parejas: se dejaron las primeras 10.'); }
  return r;
}

// Revisa un contenido importado con el mismo editor de la plantilla (y la regla de IA si existe).
function revisarImportado(tpl, c) {
  const vacio = tpl.empty();
  for (const [k, v] of Object.entries(vacio)) {
    if (Array.isArray(v) ? !Array.isArray(c?.[k]) : typeof c?.[k] !== typeof v) return [`Falta "${k}" o no tiene el formato de ${tpl.label}.`];
  }
  let errs;
  try { errs = tpl.editor(document.createElement('div'), c).validate(); } catch { return [`El JSON no tiene el formato de ${tpl.label}.`]; }
  if (!errs.length && TIPOS_IA.includes(tpl.type)) errs = validarContenido(tpl.type, c);
  return errs;
}

function leerJSON(texto) {
  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const a = limpio.indexOf('{'), b = limpio.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('No encontré un JSON (debe empezar con { y terminar con }).');
  try { return JSON.parse(limpio.slice(a, b + 1)); } catch { throw new Error('El JSON está incompleto o mal escrito. Pídele al chat que lo devuelva completo.'); }
}

function dialogo(html) {
  const d = el(`<dialog class="ia-dialog">${html}</dialog>`);
  document.body.append(d);
  d.addEventListener('close', () => d.remove(), { once: true });
  d.showModal();
  return d;
}

const REEMPLAZA = ['listening', 'reading']; // traen texto propio: se reemplaza todo
const modoHTML = (hay, tipo) => (hay && REEMPLAZA.includes(tipo)
  ? '<p class="small muted" style="margin:0 0 12px">Ya hay contenido: el guion y las preguntas actuales se reemplazarán.</p>'
  : hay ? `<fieldset class="ia-modo"><legend>Ya hay contenido en el editor</legend>
  <label><input type="radio" name="modo" value="agregar" checked> Agregar al final</label>
  <label><input type="radio" name="modo" value="reemplazar"> Reemplazar todo</label></fieldset>` : '');

// opts = { tpl, grados, getGrado(), setGrado(g), getTitulo(), setTitulo(t), getContenido(), aplicar(contenido) }
export async function iaBar(root, opts) {
  const { tpl } = opts;
  const conIA = await puedeGenerar(tpl.type);
  root.innerHTML = `<div class="ia-bar">
    ${conIA ? `<button class="btn ghost sm ia-gen" type="button">${SPARK} Generar con IA</button>` : ''}
    <button class="btn ghost sm" type="button" data-import>${UPLOAD} Importar</button>
    <span class="small muted">${conIA ? 'Crea el contenido en segundos; lo revisas antes de guardar.' : 'Pega una actividad hecha en un chat (JSON).'}</span></div>`;
  if (conIA) $('.ia-gen', root).onclick = () => abrirGenerar(opts);
  $('[data-import]', root).onclick = () => abrirImportar(opts);
}

function abrirGenerar(o) {
  const { tpl } = o;
  const op = OPCION[tpl.type];
  const g = o.getGrado();
  const hay = tieneContenido(tpl, o.getContenido());
  const d = dialogo(`<form method="dialog" novalidate>
    <h2 class="ia-h">${SPARK} Generar ${esc(tpl.label)} con IA</h2>
    <div class="field"><label for="iaTema">¿Qué quieres practicar?</label>
      <textarea id="iaTema" maxlength="600" placeholder="${esc(EJEMPLO_TEMA[tpl.type])}"></textarea></div>
    <div class="row" style="align-items:flex-start">
      <div class="field grow"><label for="iaGrado">Grado</label>
        <select id="iaGrado"><option value="">Elige…</option>${o.grados.map(x => `<option value="${x}" ${x === g ? 'selected' : ''}>${gradeLabel(x)}</option>`).join('')}</select></div>
      <div class="field" style="width:110px"><label for="iaCant">${cant(tpl.type)[0]}</label>
        <input id="iaCant" type="number" min="3" max="${cant(tpl.type)[2]}" value="${cant(tpl.type)[1]}"></div>
    </div>
    ${op ? `<div class="field"><label for="iaOp">${op.label}</label>
      <select id="iaOp">${op.opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>` : ''}
    <div class="field"><label for="iaNotas">Indicaciones extra <span class="muted small">(opcional)</span></label>
      <input id="iaNotas" maxlength="400" placeholder="Ej. usa nombres colombianos; evita el pasado"></div>
    ${modoHTML(hay, tpl.type)}
    <p class="errors" id="iaErr" hidden role="alert"></p>
    <div class="row end" style="margin-top:8px">
      <button class="btn ghost" type="button" data-cancel>Cancelar</button>
      <button class="btn" type="submit" data-go>${SPARK} Generar</button>
    </div></form>`);
  const err = $('#iaErr', d), go = $('[data-go]', d);
  let ctl = null;
  $('[data-cancel]', d).onclick = () => { ctl?.abort(); d.close(); };
  d.addEventListener('cancel', () => ctl?.abort());
  $('#iaTema', d).focus();
  $('form', d).onsubmit = async e => {
    e.preventDefault();
    const tema = $('#iaTema', d).value.trim(), grado = Number($('#iaGrado', d).value);
    const falta = [!tema && 'Escribe qué quieres practicar.', !grado && 'Elige el grado.'].filter(Boolean);
    err.hidden = !falta.length; err.textContent = falta.join(' ');
    if (falta.length) return;
    const v = $('#iaOp', d)?.value;
    const pedido = { tipo: tpl.type, tema, grado, cantidad: Number($('#iaCant', d).value), notas: $('#iaNotas', d).value,
      ...(!op ? {} : op.name === 'banco' ? { banco: v === 'si' } : { [op.name]: v }) };
    ctl = new AbortController();
    go.disabled = true; go.innerHTML = '<span class="ia-spin" aria-hidden="true"></span> Generando…';
    d.querySelectorAll('textarea,input,select').forEach(x => (x.disabled = true));
    try {
      const r = await generar(pedido, { signal: ctl.signal });
      const modo = $('input[name=modo]:checked', d)?.value || (hay ? 'agregar' : 'reemplazar');
      o.aplicar(modo === 'agregar' ? unir(o.getContenido(), r.contenido, tpl.type) : r.contenido);
      if (!o.getGrado()) o.setGrado(grado);
      if (!o.getTitulo().trim() && r.titulo) o.setTitulo(r.titulo);
      o.setInstruccion?.(r.instruccion);
      d.close();
      toast('Listo. Revisa y ajusta antes de guardar.');
    } catch (e2) {
      if (e2.name === 'AbortError') return;
      err.hidden = false; err.textContent = e2.message;
      go.disabled = false; go.innerHTML = `${SPARK} Intentar de nuevo`;
      d.querySelectorAll('textarea,input,select').forEach(x => (x.disabled = false));
    }
  };
}

function abrirImportar(o) {
  const { tpl } = o;
  const hay = tieneContenido(tpl, o.getContenido());
  const formato = FORMATO[tpl.type];
  const d = dialogo(`<form method="dialog" novalidate>
    <h2 class="ia-h">${UPLOAD} Importar ${esc(tpl.label)}</h2>
    ${formato ? `<p class="small muted" style="margin-top:0">1. Copia las instrucciones y pégalas en un chat (Gemini, ChatGPT…) junto con tu tema.<br>2. Pega aquí la respuesta.</p>
      <button class="btn ghost sm" type="button" data-copy style="margin-bottom:12px">Copiar instrucciones</button>`
      : '<p class="small muted" style="margin-top:0">Pega el JSON de una actividad de este tipo.</p>'}
    <div class="field"><label for="impTxt">JSON de la actividad</label>
      <textarea id="impTxt" rows="8" spellcheck="false" style="font-family:ui-monospace,Consolas,monospace;font-size:13px"></textarea></div>
    ${modoHTML(hay, tpl.type)}
    <ul class="errors" id="impErr" hidden role="alert"></ul>
    <div class="row end" style="margin-top:8px">
      <button class="btn ghost" type="button" data-cancel>Cancelar</button>
      <button class="btn" type="submit">Importar</button>
    </div></form>`);
  const err = $('#impErr', d);
  const mostrar = list => { err.hidden = !list.length; err.innerHTML = list.slice(0, 6).map(x => `<li>${esc(x)}</li>`).join(''); };
  $('[data-cancel]', d).onclick = () => d.close();
  $('[data-copy]', d)?.addEventListener('click', async e => {
    const g = o.getGrado();
    const texto = `Crea una actividad de "${tpl.label}" para practicar inglés${g ? ` con estudiantes de ${gradeLabel(g)} grado` : ''} en un colegio de Colombia.
Tema: [ESCRIBE AQUÍ EL TEMA]
El contenido para el estudiante va en inglés, con frases cortas y claras para su nivel. Cada pregunta tiene una sola respuesta correcta ("correct" es la posición de la opción correcta, empezando en 0).
Responde SOLO con un JSON válido (sin explicaciones) con este formato:
${formato}
Puedes añadir "title" con un título corto en inglés.`;
    try { await navigator.clipboard.writeText(texto); toast('Instrucciones copiadas'); e.target.textContent = 'Copiadas ✓'; }
    catch { $('#impTxt', d).value = texto; $('#impTxt', d).select(); toast('No se pudo copiar: selecciona el texto y cópialo.'); }
  });
  $('#impTxt', d).focus();
  $('form', d).onsubmit = e => {
    e.preventDefault();
    let j;
    try { j = leerJSON($('#impTxt', d).value); } catch (e2) { return mostrar([e2.message]); }
    if (j.type && j.type !== tpl.type) return mostrar([`Ese JSON es de otro tipo de actividad ("${j.type}").`]);
    const titulo = typeof j.title === 'string' && tpl.type !== 'reading' ? j.title : (j.content && typeof j.title === 'string' ? j.title : '');
    const c = j.content && typeof j.content === 'object' ? j.content : j;
    if (tpl.type !== 'reading') delete c.title;
    const errs = revisarImportado(tpl, c);
    if (errs.length) return mostrar(errs);
    const modo = $('input[name=modo]:checked', d)?.value || (hay ? 'agregar' : 'reemplazar');
    o.aplicar(modo === 'agregar' ? unir(o.getContenido(), c, tpl.type) : c);
    if (!o.getTitulo().trim() && titulo) o.setTitulo(titulo.trim().slice(0, 80));
    d.close();
    toast('Actividad importada. Revisa antes de guardar.');
  };
}
