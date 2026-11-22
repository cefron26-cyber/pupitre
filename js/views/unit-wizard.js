// Crear unidad: el docente elige entre "Necesito ayuda" (asistente paso a paso + IA) y "La armo yo" (editor de siempre).
// Asistente: 1 actividades → 2 tema y grado → 3 vocabulario (opcional) → 4 gramática (opcional) → 5 revisar → generar.
// La IA genera una actividad a la vez (plan gratis); nada se guarda hasta que el docente pulsa "Guardar unidad".
import { activities, units, courses } from '../storage.js';
import { gradeLabel } from '../logic.js';
import { esc, $, $$, toast, confirmDialog, icons } from '../ui.js';
import { templates } from '../templates/index.js';
import { UNIT_THEME } from '../temas.js';
import { templateArt } from '../iconos.js';
import { estadoIA, generar, TIPOS_IA, asegurarClave } from '../ia.js';

// Sin el ícono de destellos (estereotipo de IA, revisión 2026-11-19).
const SPARK = '';
const HAND = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';

// Como Cambridge One: la unidad tiene 10 ejercicios cortos (máx. 20 preguntas). El docente elige los tipos
// y se mezclan al azar (completar, quiz, lectura, quiz, completar…) hasta llegar a 10, sin dos iguales seguidos.
const TOTAL = 10;
const ORDEN = ['reorder', 'quiz', 'fill', 'listening', 'reading', 'matching', 'classify', 'dictation', 'crossword', 'wordsearch', 'hangman'];
// Nombre y descripción del ejercicio en el asistente (más cercanos a Cambridge que los de la plantilla).
const NOMBRE = {
  quiz: ['Opción múltiple (ABCD)', 'Preguntas con 4 opciones; una es la correcta.'],
  fill: ['Completar escribiendo', 'Frases con un espacio; el estudiante escribe la palabra.'],
  reorder: ['Ordenar la oración', 'Palabras desordenadas para armar la frase.'],
  listening: ['Audio', 'Escucha un diálogo y responde preguntas.'],
  reading: ['Lectura', 'Un texto corto con preguntas de comprensión.'],
  matching: ['Emparejar', 'Une cada palabra con su traducción.'],
  classify: ['Clasificar', 'Ordena palabras en dos o tres grupos.'],
  dictation: ['Dictado', 'Escucha y escribe palabras o frases.'],
  crossword: ['Crucigrama', 'Palabras del vocabulario con pistas.'],
  wordsearch: ['Sopa de letras', 'Encuentra las palabras escondidas.'],
  hangman: ['Ahorcado', 'Adivina la palabra con una pista.'],
};
// Toda la unidad suma como máximo 20 preguntas (≈ 2 por ejercicio), repartidas en `repartir()`.
const PREGUNTAS = 20;
// Mínimo de preguntas que necesita cada tipo para funcionar (Emparejar: 3 parejas; Clasificar: 4 palabras).
const MINIMO = { matching: 3, classify: 4, crossword: 4, wordsearch: 4 };
// Opciones fijas por tipo para no hacer más preguntas al docente.
const PEDIDO = {
  quiz: { formato: 'multiple' },
  matching: { relacion: 'traduccion' },
  fill: { banco: false },
  listening: { formato: 'dialogo' },
};
// La regla de Clasificar pide cantidad × 2 palabras.
const cantidadPara = (tipo, preguntas) => (tipo === 'classify' ? Math.ceil(preguntas / 2) : preguntas);
const SUGERIDA = ['reorder', 'quiz', 'fill', 'listening', 'reading'];
const GRAMATICA = ['Present simple', 'Present continuous', 'Past simple', 'Can / can\'t', 'There is / there are', 'Comparatives', 'Going to', 'Countable / uncountable', 'Possessive adjectives', 'Prepositions of place'];
const PASOS = ['Actividades', 'Tema', 'Vocabulario', 'Gramática', 'Revisar'];

// ---------- Elegir cómo crear ----------
// Nueva unidad: va directo al editor; el asistente con IA queda como enlace dentro del editor (sin pantalla de "elige cómo").
export async function unitStart() { location.hash = '#/t/units/manual'; }
async function unitStartViejo(root) {
  const ia = (await estadoIA()).activa;
  root.innerHTML = `<div class="page-head"><div><a href="#/t/units" class="small">← Unidades</a>
      <h1 style="margin-top:6px">Nueva unidad</h1><p class="muted">¿Cómo quieres crearla?</p></div></div>
    <div class="uw-choice">
      ${ia ? `<a class="uw-option ia" href="#/t/units/ayuda">` : '<div class="uw-option ia" aria-disabled="true">'}
        <span class="uw-option-ico">${SPARK}</span>
        <b>Necesito ayuda</b>
        <span>Te guío paso a paso: eliges las actividades, el tema, el vocabulario y la gramática, y la IA crea la unidad completa. Luego la revisas.</span>
        ${ia ? '<span class="uw-go">Empezar →</span>' : '<span class="uw-off">La IA no está activa en este servidor.</span>'}
      ${ia ? '</a>' : '</div>'}
      <a class="uw-option" href="#/t/units/manual">
        <span class="uw-option-ico">${HAND}</span>
        <b>La armo yo</b>
        <span>Eliges actividades que ya tienes o creas cada una por tu cuenta, en el orden que quieras.</span>
        <span class="uw-go">Abrir el editor →</span>
      </a>
    </div>`;
}

// ---------- Asistente ----------
export async function unitWizard(root, { user }) {
  if (!(await estadoIA()).activa) { location.hash = '#/t/units/new'; return; }
  const grades = await courses.grades();
  let last = null; try { last = Number(localStorage.getItem('plat.lastGrade')) || null; } catch {}
  const s = { paso: 0, tipos: [], grado: grades.includes(last) ? last : null, tema: '', titulo: '', vocabulario: '', gramatica: '' };
  const tipos = ORDEN.filter(t => TIPOS_IA.includes(t) && templates[t]);

  root.innerHTML = `<div class="page-head"><div><a href="#/t/units/new" class="small">← Nueva unidad</a>
      <h1 style="margin-top:6px">${SPARK} Crear unidad con ayuda</h1></div></div>
    <ol class="uw-steps" id="pasos"></ol>
    <form class="card uw-card" id="form" novalidate></form>`;
  const form = $('#form', root);

  const pintarPasos = () => {
    $('#pasos', root).innerHTML = PASOS.map((p, i) =>
      `<li class="${i === s.paso ? 'now' : i < s.paso ? 'done' : ''}" ${i === s.paso ? 'aria-current="step"' : ''}><span>${i < s.paso ? '✓' : i + 1}</span><em class="uw-lbl">${p}</em></li>`).join('');
  };
  const pie = (sig = 'Siguiente', { opcional = false } = {}) => `<p class="errors" id="err" hidden role="alert"></p>
    <div class="row between uw-foot">
      ${s.paso ? '<button class="btn ghost" type="button" data-back>← Atrás</button>' : '<span></span>'}
      <div class="row">${opcional ? '<button class="btn ghost" type="button" data-skip>Saltar</button>' : ''}
        <button class="btn" type="submit">${sig}</button></div></div>`;
  const error = msg => { const e = $('#err', form); e.hidden = !msg; e.textContent = msg || ''; };
  const ir = n => { s.paso = n; pintar(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const vistas = [
    // 1. Actividades
    () => {
      const lista = plan();
      form.innerHTML = `<h2>¿Qué tipos de ejercicio quieres?</h2>
        <p class="muted">${TOTAL} ejercicios en total, mezclados sin repetir el mismo tipo seguido.</p>
        <button class="btn ghost sm" type="button" data-sug style="margin-bottom:14px">Usar la mezcla recomendada</button>
        <div class="uw-types">${tipos.map(t => {
          const pos = s.tipos.indexOf(t);
          return `<button type="button" class="uw-type ${pos >= 0 ? 'on' : ''}" data-t="${t}" aria-pressed="${pos >= 0}">
            <span class="tpl-ico">${templateArt(t)}</span>
            <span class="tpl-txt"><b>${NOMBRE[t][0]}</b><span>${NOMBRE[t][1]}</span></span>
            <span class="uw-pick" aria-hidden="true">${pos >= 0 ? '✓' : ''}</span></button>`;
        }).join('')}</div>
        ${lista.length ? `<div class="row between uw-plan-h"><h3 style="margin:0;font-size:16px">Así queda la unidad</h3>
            <button class="btn ghost sm" type="button" data-mix>Mezclar otra vez</button></div>
          <ol class="uw-plan">${lista.map(x => `<li><span class="mini-art">${templateArt(x.tipo)}</span>${esc(NOMBRE[x.tipo][0])} <span class="muted">· ${x.preguntas}</span></li>`).join('')}</ol>
          <p class="uw-total"><b>${totalPreguntas(lista)} preguntas</b> en total (máximo ${PREGUNTAS}).</p>`
          : '<p class="uw-total">Todavía no has elegido tipos de ejercicio.</p>'}

        ${pie()}`;
      $$('.uw-type', form).forEach(b => b.onclick = () => {
        const t = b.dataset.t, i = s.tipos.indexOf(t);
        if (i >= 0) s.tipos.splice(i, 1); else s.tipos.push(t);
        s.mezcla = mezclar(s.tipos);
        pintar();
        $(`.uw-type[data-t="${t}"]`, form)?.focus();
      });
      $('[data-sug]', form).onclick = () => { s.tipos = [...SUGERIDA]; s.mezcla = mezclar(s.tipos); pintar(); };
      $('[data-mix]', form)?.addEventListener('click', () => { s.mezcla = mezclar(s.tipos); pintar(); $('[data-mix]', form)?.focus(); });
      return () => (!s.tipos.length ? 'Elige al menos un tipo de ejercicio.'
        : totalPreguntas(lista) > PREGUNTAS ? `Emparejar y Clasificar necesitan más preguntas: combínalos con otros tipos para no pasar de ${PREGUNTAS}.` : '');
    },
    // 2. Tema y grado
    () => {
      form.innerHTML = `<h2>¿Qué tema vas a evaluar?</h2>
        <div class="row" style="align-items:flex-start">
          <div class="field grow"><label for="wTema">Tema de la unidad</label>
            <input id="wTema" maxlength="200" placeholder="Ej. Food and drinks · la comida y las bebidas" value="${esc(s.tema)}"></div>
          <div class="field" style="min-width:150px"><label for="wGrado">Grado</label>
            <select id="wGrado"><option value="">Elige…</option>${grades.map(g => `<option value="${g}" ${g === s.grado ? 'selected' : ''}>${gradeLabel(g)}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label for="wTitulo">Nombre de la unidad <span class="muted">(opcional)</span></label>
          <input id="wTitulo" maxlength="80" placeholder="Si lo dejas vacío, se usa el tema" value="${esc(s.titulo)}"></div>
        ${pie()}`;
      $('#wTema', form).focus();
      return () => {
        s.tema = $('#wTema', form).value.trim(); s.grado = Number($('#wGrado', form).value) || null; s.titulo = $('#wTitulo', form).value.trim();
        $('#wTema', form).classList.toggle('invalid', s.tema.length < 3); $('#wGrado', form).classList.toggle('invalid', !s.grado);
        return [s.tema.length < 3 && 'Escribe el tema.', !s.grado && 'Elige el grado.'].filter(Boolean).join(' ');
      };
    },
    // 3. Vocabulario
    () => {
      form.innerHTML = `<h2>¿Qué vocabulario te gustaría incluir? <span class="muted small">(opcional)</span></h2>
        <p class="muted">Escribe las palabras separadas por comas o una por línea. Si lo dejas vacío, la IA elige el vocabulario típico del tema.</p>
        <div class="field"><label for="wVoc">Vocabulario</label>
          <textarea id="wVoc" rows="5" maxlength="600" placeholder="apple, bread, cheese, milk, rice, water…">${esc(s.vocabulario)}</textarea>
          <p class="hint" id="wVocN"></p></div>
        ${pie('Siguiente', { opcional: true })}`;
      const t = $('#wVoc', form), n = $('#wVocN', form);
      const contar = () => { const k = palabrasDe(t.value).length; n.textContent = k ? `${k} palabra${k === 1 ? '' : 's'}` : ''; };
      t.oninput = contar; contar(); t.focus();
      return () => { s.vocabulario = palabrasDe(t.value).join(', '); return ''; };
    },
    // 4. Gramática
    () => {
      form.innerHTML = `<h2>¿Qué gramática vas a evaluar? <span class="muted small">(opcional)</span></h2>
        <p class="muted">Toca una sugerencia o escríbela. Si lo dejas vacío, las actividades se centran en el vocabulario.</p>
        <div class="chips" style="margin:0 0 14px">${GRAMATICA.map(g => `<button type="button" class="chip-filter" data-g="${esc(g)}">${esc(g)}</button>`).join('')}</div>
        <div class="field"><label for="wGram">Gramática</label>
          <input id="wGram" maxlength="400" placeholder="Ej. countable / uncountable with some and any" value="${esc(s.gramatica)}"></div>
        ${pie('Siguiente', { opcional: true })}`;
      const inp = $('#wGram', form);
      const marcar = () => $$('[data-g]', form).forEach(b => b.classList.toggle('active', inp.value.toLowerCase().includes(b.dataset.g.toLowerCase())));
      $$('[data-g]', form).forEach(b => b.onclick = () => {
        const v = inp.value.trim(), g = b.dataset.g;
        inp.value = b.classList.contains('active') ? v.split(/\s*,\s*/).filter(x => x.toLowerCase() !== g.toLowerCase()).join(', ') : v ? `${v}, ${g}` : g;
        marcar();
      });
      inp.oninput = marcar; marcar(); inp.focus();
      return () => { s.gramatica = inp.value.trim(); return ''; };
    },
    // 5. Revisar
    () => {
      const lista = plan();
      form.innerHTML = `<h2>Revisa y crea la unidad</h2>
        <dl class="uw-sum">
          <dt>Unidad</dt><dd>${esc(s.titulo || s.tema)} · ${gradeLabel(s.grado)}</dd>
          <dt>Tema</dt><dd>${esc(s.tema)}</dd>
          <dt>Vocabulario</dt><dd>${s.vocabulario ? esc(s.vocabulario) : '<span class="muted">Lo elige la IA</span>'}</dd>
          <dt>Gramática</dt><dd>${s.gramatica ? esc(s.gramatica) : '<span class="muted">Sin gramática específica</span>'}</dd>
          <dt>Ejercicios</dt><dd>${lista.map((x, i) => `${i + 1}. ${esc(NOMBRE[x.tipo][0])} (${x.preguntas})`).join(' · ')}</dd>
          <dt>Preguntas</dt><dd>${totalPreguntas(lista)} en total</dd>
        </dl>
        <p class="small muted">La IA crea los ${lista.length} ejercicios uno por uno (en total, menos de un minuto). Después podrás revisarlos y editarlos antes de asignar.</p>
        ${pie(`${SPARK} Crear unidad con IA`)}`;
      return () => '';
    },
  ];

  let revisar = null;
  function pintar() {
    pintarPasos();
    revisar = vistas[s.paso]();
    $('[data-back]', form)?.addEventListener('click', () => ir(s.paso - 1));
    $('[data-skip]', form)?.addEventListener('click', () => { if (s.paso === 2) s.vocabulario = ''; if (s.paso === 3) s.gramatica = ''; ir(s.paso + 1); });
  }
  form.onsubmit = e => {
    e.preventDefault();
    const msg = revisar();
    if (msg) return error(msg);
    if (s.paso < PASOS.length - 1) return ir(s.paso + 1);
    generarUnidad();
  };

  // Los 10 ejercicios: los tipos elegidos, en su orden, repetidos hasta llegar a TOTAL.
  function plan() {
    if (!s.tipos.length) return [];
    if (s.mezcla?.length !== TOTAL) s.mezcla = mezclar(s.tipos);
    const lista = s.mezcla.map(tipo => ({ tipo }));
    const vistos = {};
    for (const x of lista) x.n = vistos[x.tipo] = (vistos[x.tipo] || 0) + 1;
    for (const x of lista) x.de = vistos[x.tipo];
    repartir(lista);
    return lista;
  }

  async function generarUnidad() {
    try { localStorage.setItem('plat.lastGrade', s.grado); } catch {}
    const lista = plan().map(x => ({ ...x, estado: 'pendiente', res: null, error: '' }));
    // Vocabulario repartido: cada ejercicio se centra en unas pocas palabras distintas (así no sale todo con las mismas dos).
    const voc = palabrasDe(s.vocabulario);
    if (voc.length) {
      const porEj = Math.max(2, Math.ceil(voc.length / lista.length) + 1);
      lista.forEach((x, i) => { x.foco = Array.from({ length: Math.min(porEj, voc.length) }, (_, k) => voc[(i * (porEj - 1) + k) % voc.length]); });
    }
    // Verdadero/falso: se alterna cuál debe ser la respuesta, porque la IA casi siempre escribe afirmaciones verdaderas.
    lista.forEach((x, i) => { x.vf = (i + Math.floor(Math.random() * 2)) % 2 ? 'FALSE' : 'TRUE'; });
    const ctl = new AbortController();
    let guardada = false;
    addEventListener('hashchange', () => ctl.abort(), { once: true }); // salir de la página detiene la generación
    $('#pasos', root).hidden = true;
    form.innerHTML = `<h2 id="gTit">Creando la unidad…</h2>
      <p class="muted" id="gSub">No cierres esta página. Puedes cancelar en cualquier momento.</p>
      <div class="list uw-gen" id="gList"></div>
      <div class="row between uw-foot">
        <button class="btn ghost" type="button" data-cancel>Cancelar</button>
        <button class="btn" type="button" data-save disabled>Guardar unidad</button></div>`;
    const caja = $('#gList', form), btnSave = $('[data-save]', form);
    const ESTADO = { pendiente: 'En espera', generando: 'Creando…', listo: 'Lista', error: 'No se pudo' };
    const dibujar = () => {
      caja.innerHTML = lista.map((x, i) => {
        const tpl = templates[x.tipo];
        const det = x.estado === 'listo' ? `${esc(x.res.instruccion || x.res.titulo || tpl.label)} · ${tpl.summary(x.res.contenido)}` : x.estado === 'error' ? esc(x.error) : esc(NOMBRE[x.tipo][1]);
        return `<div class="item uw-gen-row" data-estado="${x.estado}">
          <span class="step-n">${i + 1}</span>
          <div class="type-icon art">${templateArt(x.tipo)}</div>
          <div class="info"><p class="title">Ejercicio ${i + 1} · ${esc(NOMBRE[x.tipo][0])}</p><div class="meta">${det}</div></div>
          <span class="uw-state">${x.estado === 'generando' ? '<span class="ia-spin" aria-hidden="true"></span>' : ''}${x.reintento ? 'Reintentando…' : ESTADO[x.estado]}</span>
          ${x.estado === 'error' ? `<div class="row" style="gap:6px"><button class="btn ghost sm" type="button" data-retry="${i}">Reintentar</button>
            <button class="icon-btn" type="button" data-drop="${i}" aria-label="Quitar ${esc(tpl.label)} de la unidad">×</button></div>` : ''}
        </div>`;
      }).join('');
      $$('[data-retry]', caja).forEach(b => b.onclick = () => { lista[b.dataset.retry].estado = 'pendiente'; correr(); });
      $$('[data-drop]', caja).forEach(b => b.onclick = () => { lista.splice(Number(b.dataset.drop), 1); dibujar(); terminar(); });
    };
    const terminar = () => {
      const ok = lista.filter(x => x.estado === 'listo').length, mal = lista.filter(x => x.estado === 'error').length;
      const ocupado = lista.some(x => x.estado === 'generando' || x.estado === 'pendiente');
      btnSave.disabled = ocupado || !ok;
      if (ocupado) return;
      $('#gTit', form).textContent = mal ? `${ok} de ${lista.length} actividades listas` : '¡Unidad lista!';
      $('#gSub', form).textContent = mal ? 'Reintenta las que fallaron o quítalas. Puedes guardar con las que ya están listas.'
        : 'Guárdala para revisar y editar cada actividad antes de asignarla.';
      if (!mal) btnSave.focus();
    };
    let corriendo = false;
    async function correr() {
      if (corriendo) return;
      corriendo = true;
      if (!(await asegurarClave())) {
        corriendo = false;
        lista.forEach(x => { if (x.estado === 'pendiente') { x.estado = 'error'; x.error = 'Falta tu clave de Gemini.'; } });
        dibujar(); terminar(); return;
      }
      $('#gTit', form).textContent = 'Creando la unidad…';
      for (const x of lista) {
        if (x.estado !== 'pendiente') continue;
        if (ctl.signal.aborted) break;
        x.estado = 'generando'; dibujar(); terminar();
        const pedido = { tipo: x.tipo, tema: s.tema, grado: s.grado, vocabulario: s.vocabulario, gramatica: s.gramatica,
          notas: notasDe(x, lista), cantidad: cantidadPara(x.tipo, x.preguntas), ...PEDIDO[x.tipo] };
        // Hasta 3 intentos solos: un corte de red o la cuota por minuto del plan gratis no deben dañar la unidad.
        for (let intento = 1; intento <= 3; intento++) {
          try {
            x.res = await generar(pedido, { signal: ctl.signal });
            x.estado = 'listo';
            break;
          } catch (e) {
            if (e.name === 'AbortError') { x.estado = 'pendiente'; break; }
            x.estado = 'error'; x.error = e.message;
            if (intento === 3) break;
            x.estado = 'generando'; x.error = ''; x.reintento = true; dibujar();
            const espera = /cuota/i.test(e.message) ? 20_000 : 4_000;
            await new Promise(r => setTimeout(r, espera));
            if (ctl.signal.aborted) { x.estado = 'pendiente'; break; }
          }
        }
        x.reintento = false;
        if (ctl.signal.aborted) break;
        dibujar();
      }
      corriendo = false;
      dibujar(); terminar();
    }
    $('[data-cancel]', form).onclick = async () => {
      if (lista.some(x => x.res) && !(await confirmDialog('¿Cancelar? Se perderán las actividades ya creadas.', 'Sí, cancelar', true))) return;
      ctl.abort();
      location.hash = '#/t/units';
    };
    btnSave.onclick = async () => {
      if (guardada) return;
      guardada = true; btnSave.disabled = true;
      const ids = [], listos = lista.filter(y => y.estado === 'listo');
      equilibrarRespuestas(listos);
      for (const x of listos) {
        const tpl = templates[x.tipo];
        const a = await activities.save({ type: x.tipo, title: (x.res.titulo || `${tpl.label} · ${s.tema}`).slice(0, 80), content: x.res.contenido,
          instruction: x.res.instruccion || '', ownerId: user.id, grade: s.grado, theme: UNIT_THEME });
        ids.push(a.id);
      }
      const desc = [s.gramatica, s.vocabulario && `Vocabulario: ${s.vocabulario}`].filter(Boolean).join(' · ').slice(0, 140);
      const u = await units.save({ title: (s.titulo || s.tema).slice(0, 80), description: desc, grade: s.grado, activityIds: ids, ownerId: user.id });
      toast('Unidad creada. Revisa cada actividad antes de asignarla.');
      location.hash = `#/t/units/edit/${u.id}`;
    };
    dibujar();
    correr();
  }

  pintar();
}

// Los TOTAL ejercicios: cada tipo elegido aparece casi las mismas veces, en orden al azar y sin dos iguales seguidos.
function mezclar(tipos) {
  if (!tipos.length) return [];
  const bolsa = Array.from({ length: TOTAL }, (_, i) => tipos[i % tipos.length]);
  let mejor = bolsa;
  for (let intento = 0; intento < 200; intento++) {
    const a = [...bolsa];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    mejor = a;
    if (tipos.length === 1 || a.every((t, i) => i === 0 || t !== a[i - 1])) break;
  }
  return mejor;
}

// Indicaciones para la IA de un ejercicio dentro de la unidad (máx. 400 caracteres, límite del servidor).
function notasDe(x, lista) {
  const partes = [];
  if (x.foco?.length) partes.push(`Focus mainly on these words: ${x.foco.join(', ')}.`);
  if (['quiz', 'reading', 'listening'].includes(x.tipo)) partes.push(`If you write a True/False statement, its answer must be ${x.vf}.`);
  // Lo que ya salió en otros ejercicios (primero los del mismo tipo), para no repetirlo.
  const otros = lista.filter(y => y !== x && y.res).sort((a, b) => (b.tipo === x.tipo) - (a.tipo === x.tipo));
  const ya = otros.flatMap(y => muestras(y.tipo, y.res.contenido).slice(0, y.tipo === x.tipo ? 4 : 1));
  if (ya.length) partes.push(`Other exercises of this unit already use these; write NEW sentences, people and situations: ${ya.join(' | ')}`);
  return partes.join(' ').slice(0, 400);
}

// Reparte la posición de la respuesta correcta (A, B, C, D) en toda la unidad para que no se repita un patrón.
function equilibrarRespuestas(lista) {
  const preguntas = lista.flatMap(x => x.res.contenido.questions || []).filter(q => !q.tf && q.options?.length > 1);
  let bolsa = [];
  for (const q of preguntas) {
    const n = q.options.length;
    if (!bolsa.length) { bolsa = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bolsa[i], bolsa[j]] = [bolsa[j], bolsa[i]]; } }
    let k = bolsa.findIndex(p => p < n); if (k < 0) k = 0;
    const destino = Math.min(bolsa.splice(k, 1)[0], n - 1);
    const correcta = q.options[q.correct], resto = q.options.filter((_, i) => i !== q.correct);
    q.options = [...resto.slice(0, destino), correcta, ...resto.slice(destino)];
    q.correct = destino;
  }
}

// Reparte PREGUNTAS entre los ejercicios: cada uno arranca con su mínimo y se suma de a una, en orden, hasta llegar al total.
function repartir(lista) {
  for (const x of lista) x.preguntas = MINIMO[x.tipo] || 1;
  let resto = PREGUNTAS - lista.reduce((a, x) => a + x.preguntas, 0);
  while (resto > 0) {
    let dio = false;
    for (const x of lista) {
      if (resto <= 0) break;
      if (x.preguntas >= (MINIMO[x.tipo] || 1) + 2) continue; // nadie se agranda mucho más que su mínimo
      x.preguntas++; resto--; dio = true;
    }
    if (!dio) break;
  }
}
const totalPreguntas = lista => lista.reduce((a, x) => a + x.preguntas, 0);

// Frases cortas de un ejercicio ya generado (para decirle a la IA qué no repetir).
function muestras(tipo, c) {
  const corta = s => String(s || '').replace(/\{\{(.+?)(\|.*?)?\}\}/g, '$1').slice(0, 50);
  const lista = {
    reorder: () => c.items.map(i => i.sentence),
    fill: () => c.items.map(i => i.text),
    quiz: () => c.questions.map(q => q.q),
    matching: () => c.pairs.map(p => p.left),
    classify: () => c.groups.flatMap(g => g.items),
    dictation: () => c.items.map(i => i.text),
    wordsearch: () => c.items.map(i => i.word),
    hangman: () => c.items.map(i => i.word),
    crossword: () => c.items.map(i => i.answer),
    reading: () => [c.title, c.text.split('\n')[0]],
    listening: () => c.audio.script.split('\n').slice(0, 2),
  }[tipo];
  try { return lista().filter(Boolean).slice(0, 6).map(corta); } catch { return []; }
}

const palabrasDe = t => [...new Set(t.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean))];
