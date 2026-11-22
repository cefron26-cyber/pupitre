// Vistas del docente: Inicio, Crear/Editar, Vista previa, Mis actividades, Asignar, Resultados.
import { activities, units, assignments, attempts, courses, users, resetDemo } from '../storage.js';
import { esc, el, $, toast, confirmDialog, fmtDate, fmtAgo, fmtDuration, grade, icons } from '../ui.js';
import { templates, templateList } from '../templates/index.js';
import { armarCrucigrama } from '../templates/crossword.js';
import { letras } from '../templates/wordsearch.js';
import { safeSrc } from '../imagenes.js';
import { mountPlayer } from '../player.js';
import { progressOf, activityIdsOf, gradeLabel } from '../logic.js';
import { themePicker, DEFAULT_THEME, themeById } from '../temas.js';
import { templateArt, ALL_ART } from '../iconos.js';
import { iaBar } from './ia-panel.js';
import { nuevoCurso, editarCurso, eliminarCurso, agregarEstudiantes, mostrarAccesos, renombrarEstudiante, nuevaContrasena, moverEstudiante, eliminarEstudiante } from './cursos-admin.js';
import { GRADE_NAMES } from '../storage.js';

// Después de redibujar una lista, devolver el foco a la insignia de grado que se usó (teclado).
export const refocusGrade = (root, id) => root.querySelector(`.grade-badge[data-id="${CSS.escape(id)}"]`)?.focus();

// Preguntas más falladas en un conjunto de intentos: [{ q, expected, wrong, total, rate, actId, topWrong }].
export function missedQuestions(attemptList, minAnswers = 2) {
  const map = new Map();
  for (const t of attemptList) for (const a of t.answers || []) {
    const q = String(a?.question ?? '').trim(); if (!q) continue;
    const key = t.activityId + '\u0000' + q;
    const m = map.get(key) || { q, expected: Array.isArray(a.expected) ? a.expected[0] : a.expected, wrong: 0, total: 0, actId: t.activityId, given: {} };
    m.total++;
    if (a.correct === false) { m.wrong++; const g = String(a.given ?? '').trim(); if (g) m.given[g] = (m.given[g] || 0) + 1; }
    map.set(key, m);
  }
  return [...map.values()].filter(m => m.total >= minAnswers).map(m => ({ ...m, rate: m.wrong / m.total,
    topWrong: Object.entries(m.given).sort((a, b) => b[1] - a[1])[0]?.[0] || '' })).sort((a, b) => b.rate - a.rate || b.total - a.total);
}

// Insignia de grado en las listas: un color por grado (5° naranja, 6° morado…); "Sin grado" en ámbar.
// Al tocarla se abre "Cambiar grado".
export function gradeBadge(value, label, id = '') {
  return `<button type="button" class="grade-badge ${value ? `g${value % 6}` : 'none'}" data-id="${esc(id)}"
    aria-label="${value ? `Grado: ${gradeLabel(value)}` : 'Sin grado'}. Cambiar el grado de ${esc(label)}" title="Cambiar grado">${value ? gradeLabel(value) : 'Sin grado'}</button>`;
}

// Diálogo "Cambiar grado": un botón grande por grado. Devuelve el grado elegido o undefined (cancelar).
export function gradeDialog(title, value, grades) {
  return new Promise(resolve => {
    const d = el(`<dialog aria-label="Cambiar grado">
      <h2 style="margin-top:0">Cambiar grado</h2>
      <p class="small muted" style="margin-top:-6px">${esc(title)}</p>
      <div class="grade-choices">${grades.map(g => `<button type="button" class="grade-badge big g${g % 6} ${g === value ? 'current' : ''}" value="${g}"
        ${g === value ? 'aria-current="true"' : ''}>${gradeLabel(g)}</button>`).join('')}</div>
      <p class="small muted">Al asignarla solo aparecerán los cursos de ese grado.</p>
      <div class="row end"><button class="btn ghost" value="cancel" type="button">Cancelar</button></div></dialog>`);
    document.body.append(d);
    let out;
    d.addEventListener('click', e => {
      const v = e.target.closest('button')?.value; if (!v) return;
      out = v === 'cancel' ? undefined : Number(v);
      d.close();
    });
    d.addEventListener('close', () => { d.remove(); resolve(out); }, { once: true });
    d.showModal();
    (d.querySelector('.grade-badge.current') || d.querySelector('.grade-badge'))?.focus();
  });
}

// Qué es una asignación (actividad suelta o unidad), para mostrarla igual en todas partes.
export async function describe(a) {
  if (a.unitId) {
    const u = await units.get(a.unitId);
    const ids = activityIdsOf(a, u);
    return { title: u?.title || '(unidad eliminada)', icon: icons.unit, kind: `Unidad · ${ids.length} actividad${ids.length === 1 ? '' : 'es'}`, ids, unit: u, isUnit: true };
  }
  const act = await activities.get(a.activityId);
  const tpl = templates[act?.type];
  return { title: act?.title || '(eliminada)', icon: tpl?.icon || '', kind: tpl?.label || '', ids: [a.activityId], act, isUnit: false };
}

// Progreso de cada estudiante del curso en la asignación.
export async function courseProgress(a, ids) {
  const st = await users.studentsOf(a.courseId);
  const all = await attempts.listFor(a.id);
  return st.map(s => ({ s, p: progressOf(a, ids, all.filter(t => t.userId === s.id)) }));
}

// ---------- Inicio: mis cursos (como Cambridge One, todo se organiza por curso) ----------
// Datos de un curso: asignaciones con su avance, vencimientos, estudiantes (con alerta de riesgo) e intentos recientes.
async function courseData(course, ownerId) {
  const now = Date.now();
  const students = await users.studentsOf(course.id);
  const asgs = (await assignments.listAll(ownerId)).filter(a => a.courseId === course.id);
  const items = [], recentAttempts = [];
  const porEst = Object.fromEntries(students.map(s => [s.id, { s, hechas: 0, atrasadas: 0, notas: [] }]));
  for (const a of asgs) {
    const d = await describe(a);
    const rows = await courseProgress(a, d.ids);
    const n = rows.filter(r => r.p.status === 'done').length;
    const due = a.dueAt ? new Date(a.dueAt).getTime() : null;
    items.push({ a, d, n, total: rows.length, due, soon: !!(due && due > now && due - now < 48 * 36e5 && n < rows.length), late: !!(due && due < now && n < rows.length) });
    for (const r of rows) {
      const e = porEst[r.s.id]; if (!e) continue;
      if (r.p.status === 'late') e.atrasadas++;
      if (r.p.status !== 'done') continue;
      e.hechas++;
      const best = r.p.items?.[0]?.best;
      const nota = d.isUnit ? r.p.unitPoints / 10 : best ? Number(grade(best.score, best.maxScore)) : NaN;
      if (!isNaN(nota)) e.notas.push(nota);
    }
    for (const t of await attempts.listFor(a.id)) if (t.state === 'done' && t.finishedAt && now - new Date(t.finishedAt) < 14 * 864e5) recentAttempts.push(t);
  }
  const est = Object.values(porEst).map(e => {
    const prom = e.notas.length ? e.notas.reduce((x, y) => x + y, 0) / e.notas.length : null;
    const inactivo = !e.s.lastSeenAt || now - new Date(e.s.lastSeenAt) > 7 * 864e5;
    // Sin entrar solo cuenta como riesgo si ya hay algo asignado (un curso recién creado no se ve todo en rojo).
    return { ...e, prom, inactivo, riesgo: (inactivo && items.length > 0) || e.atrasadas > 0 || (prom !== null && prom < 6) };
  }).sort((x, y) => y.riesgo - x.riesgo || x.s.name.localeCompare(y.s.name));
  const done = items.reduce((t, i) => t + i.n, 0), expected = items.reduce((t, i) => t + i.total, 0);
  return { students, items, est, recentAttempts, done, expected };
}

const COURSE_COLORS = ['#1f3a68', '#ff6b4a', '#0f8a7e', '#b4458f', '#c98a00', '#2f5aa8'];
// Color fijo por curso según su sección (A siempre azul tinta, B coral…), no según su posición en la lista.
const courseColor = c => { const s = (c.section || c.name.split(' ').pop() || 'A').toUpperCase(); const k = s.length === 1 && s >= 'A' && s <= 'Z' ? s.charCodeAt(0) - 65 : [...s].reduce((t, ch) => t + ch.charCodeAt(0), 0); return COURSE_COLORS[k % COURSE_COLORS.length]; };

export async function home(root, { user }) {
  const crs = (await courses.list()).sort((a, b) => (a.grade || 99) - (b.grade || 99) || a.name.localeCompare(b.name));
  const datos = [];
  for (const c of crs) datos.push({ c, ...(await courseData(c, user.id)) });
  const grados = [...new Set(crs.map(c => c.grade || 0))];
  const sueltos = await users.withoutCourse();
  const atencion = datos.flatMap(x => x.items.filter(i => i.soon || i.late).map(i => ({ ...i, c: x.c })));
  root.innerHTML = `<div class="page-head"><div><h1>Mis cursos</h1><p class="muted">${crs.length} curso${crs.length === 1 ? '' : 's'}</p></div>
      <button class="btn" type="button" id="newCourse">${icons.plus} Nuevo curso</button></div>
    ${atencion.length ? `<div class="attn" aria-label="Pide atención">${atencion.slice(0, 4).map(i => `<a class="attn-item ${i.late ? 'bad' : ''}" href="#/t/results?a=${i.a.id}">
      <b>${esc(i.d.title)}</b><span>${esc(i.c.name)} · ${i.late ? `venció ${fmtDate(i.a.dueAt, false)}` : `vence ${fmtDate(i.a.dueAt)}`} · faltan ${i.total - i.n}</span></a>`).join('')}</div>` : ''}
    ${sueltos.length && crs.length ? `<div class="card sueltos"><h2>Estudiantes sin curso <span class="muted small">· ${sueltos.length}</span></h2>
      <ul class="st-list">${sueltos.map(s => `<li data-s="${s.id}"><span class="grow"><b>${esc(s.name)}</b><span class="small muted">${esc(s.username)}</span></span>
        <select aria-label="Curso para ${esc(s.name)}"><option value="">Mover a…</option>${crs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></li>`).join('')}</ul></div>` : ''}
    ${crs.length ? '' : `<div class="card empty"><p>Aún no tienes cursos. Crea los de un grado de una vez (por ejemplo Sexto A, B, C y D) y luego agrega a los estudiantes.</p><button class="btn" type="button" data-new>${icons.plus} Crear cursos</button></div>`}
    ${grados.map(g => `<h2 class="grade-group">${g ? `${GRADE_NAMES[g] || g + '°'} <span class="muted small">· ${crs.filter(c => (c.grade || 0) === g).length}</span>` : 'Sin grado'}</h2>
    <div class="course-grid">${datos.filter(x => (x.c.grade || 0) === g).map(({ c, students, items, est, done, expected }) => { const k = crs.indexOf(c);
      const activas = items.filter(i => !i.due || i.due > Date.now() || i.n < i.total);
      const prox = items.filter(i => i.due && i.due > Date.now()).sort((x, y) => x.due - y.due)[0];
      const riesgo = est.filter(e => e.riesgo).length;
      return `<a class="course-card" href="#/t/course/${c.id}" style="--cc:${courseColor(c)}">
        <div class="cc-top"><span class="cc-grade">${c.cefr || (c.grade ? c.grade + '°' : '')}</span><h2>${esc(c.name)}</h2><span class="cc-n">${students.length} estudiante${students.length === 1 ? '' : 's'}${c.cefr ? ` · meta ${esc(c.cefr)}` : ''}</span></div>
        <div class="cc-body">
          <div class="cc-row"><span>Entregas</span><div class="progress"><i style="width:${expected ? done / expected * 100 : 0}%"></i></div><b>${done}/${expected}</b></div>
          <p>${activas.length} asignaci${activas.length === 1 ? 'ón activa' : 'ones activas'}${prox ? ` · próxima: <b>${esc(prox.d.title)}</b> (${fmtDate(prox.a.dueAt, false)})` : ''}</p>
          ${riesgo ? `<p class="cc-risk">${riesgo} estudiante${riesgo === 1 ? '' : 's'} necesita${riesgo === 1 ? '' : 'n'} atención</p>` : ''}
          ${students.length ? '' : '<p class="cc-empty">Sin estudiantes: agrégalos desde el curso</p>'}
        </div></a>`;
    }).join('')}</div>`).join('')}`;
  const crear = async () => { const nuevos = await nuevoCurso(user, crs.at(-1)?.grade || 6); if (nuevos.length) home(root, { user }); };
  $('#newCourse', root).onclick = crear;
  root.querySelectorAll('.sueltos [data-s] select').forEach(sel => { sel.onchange = async () => {
    if (!sel.value) return;
    await users.moveToCourse(sel.closest('[data-s]').dataset.s, sel.value);
    toast(`Movido a ${crs.find(c => c.id === sel.value)?.name}`); home(root, { user });
  }; });
  root.querySelector('[data-new]')?.addEventListener('click', crear);
}

// ---------- Un curso: asignaciones con avance, estudiantes (en riesgo primero) y lo que más fallaron ----------
export async function course(root, { user, params }) {
  const c = await courses.get(params.id);
  if (!c) { root.innerHTML = '<div class="card empty">Este curso no existe. <a href="#/t/home">Volver</a></div>'; return; }
  const { students, items, est, recentAttempts } = await courseData(c, user.id);
  const missed = missedQuestions(recentAttempts).filter(m => m.rate >= 0.4).slice(0, 4);
  const actTitle = {};
  for (const m of missed) actTitle[m.actId] ??= (await activities.get(m.actId))?.title || '';
  const orden = [...items].sort((x, y) => (y.late - x.late) || (y.soon - x.soon) || ((x.due || 9e15) - (y.due || 9e15)));
  root.innerHTML = `<a href="#/t/home" class="back-link">← Mis cursos</a>
    <div class="page-head"><div><h1>${esc(c.name)}</h1><p class="muted">${c.grade ? `${c.grade}° · ` : ''}${c.cefr ? `Nivel ${esc(c.cefr)} (MCER) · ` : ''}${students.length} estudiantes</p></div>
      <div class="row"><a class="btn link" href="#/t/results">Resultados</a><a class="btn" href="#/t/assign?course=${c.id}">${icons.send} Asignar</a>
        <details class="more"><summary class="btn ghost icon-only" aria-label="Opciones del curso">⋮</summary>
          <div class="more-menu"><button type="button" data-c="edit">Editar curso…</button><button type="button" data-c="acc">Ver usuarios y contraseñas</button>
            <button type="button" data-c="del" class="danger-txt">Eliminar curso</button></div></details></div></div>
    <div class="course-cols">
      <section class="card cc-asg"><h2>Asignaciones</h2>
        ${orden.length ? `<ul class="asg-list">${orden.map(i => `<li>
          <div class="type-icon ${i.d.isUnit ? 'unit' : 'art'}">${i.d.isUnit ? icons.unit : templateArt(i.d.act?.type)}</div>
          <div class="grow"><b>${esc(i.d.title)}</b><span class="small muted">${esc(i.d.kind)} · ${i.a.dueAt ? `<span class="${i.late ? 'bad-txt' : i.soon ? 'warn-txt' : ''}">${i.late ? 'Venció' : 'Vence'} ${fmtDate(i.a.dueAt, false)}</span>` : 'Sin fecha'}</span>
            <div class="progress thin"><i style="width:${i.total ? i.n / i.total * 100 : 0}%"></i></div></div>
          <span class="asg-n">${i.n}/${i.total}</span>
          <a class="btn link sm" href="#/t/results?a=${i.a.id}">Ver</a></li>`).join('')}</ul>`
          : `<p class="muted">Aún no hay nada asignado a este curso.</p><a class="btn" href="#/t/assign?course=${c.id}">Asignar una actividad o unidad</a>`}
      </section>
      <section class="card"><div class="row between"><h2 style="margin:0">Estudiantes <span class="muted small">· ${students.length}</span></h2>
          <button class="btn ghost sm" type="button" id="addSt">${icons.plus} Agregar</button></div>
        ${students.length ? '' : '<p class="muted small" style="margin-top:12px">Sin estudiantes todavía.</p>'}
        <ul class="st-list">${est.map(e => `<li class="${e.riesgo ? 'riesgo' : ''}" data-s="${e.s.id}">
          <span class="st-av" aria-hidden="true">${esc(e.s.name.split(' ').map(x => x[0]).join('').slice(0, 2))}</span>
          <span class="grow"><b>${esc(e.s.name)}</b><span class="small muted">${e.inactivo ? (e.s.lastSeenAt ? `Sin entrar: ${fmtAgo(e.s.lastSeenAt).toLowerCase()}` : 'Nunca ha entrado') : `Entró ${fmtAgo(e.s.lastSeenAt).toLowerCase()}`}${e.atrasadas ? ` · ${e.atrasadas} atrasada${e.atrasadas === 1 ? '' : 's'}` : ''}</span></span>
          <span class="st-nota ${e.prom !== null && e.prom < 6 ? 'baja' : ''}" title="Promedio de lo entregado">${e.prom !== null ? e.prom.toFixed(1) : '—'}</span>
          <details class="more"><summary class="icon-btn" aria-label="Opciones de ${esc(e.s.name)}">⋮</summary>
            <div class="more-menu"><button type="button" data-a="name">Cambiar nombre</button><button type="button" data-a="pass">Nueva contraseña</button>
              <button type="button" data-a="move">Mover a otro curso</button><button type="button" data-a="del" class="danger-txt">Eliminar estudiante</button></div></details></li>`).join('')}</ul>
      </section>
      <section class="card"><h2>Lo que más fallaron</h2>
        ${missed.length ? `<ul class="miss-list">${missed.map(m => `<li><b>${esc(m.q)}</b>
          <span class="small muted">${Math.round(m.rate * 100)}% falló${m.expected ? ` · correcta: ${esc(String(m.expected))}` : ''}${m.topWrong ? ` · respuesta común: ${esc(m.topWrong)}` : ''} · ${esc(actTitle[m.actId])}</span>
          <span class="row"><a class="btn link sm" href="#/t/present/${m.actId}">Repasar en clase</a><a class="btn link sm" href="#/t/assign?course=${c.id}&act=${m.actId}">Asignar refuerzo</a></span></li>`).join('')}</ul>`
          : '<p class="small muted">Sin datos todavía.</p>'}
      </section>
    </div>`;
  const otra = () => course(root, { user, params });
  $('#addSt', root).onclick = async () => { if ((await agregarEstudiantes(c)).length) otra(); };
  root.querySelector('[data-c="edit"]').onclick = async () => { if (await editarCurso(c)) otra(); };
  root.querySelector('[data-c="acc"]').onclick = async () => {
    const l = await users.credentialsOf(c.id);
    if (!l.length) return toast('Este curso aún no tiene estudiantes.');
    mostrarAccesos(`Usuarios y contraseñas · ${c.name}`, l);
  };
  root.querySelector('[data-c="del"]').onclick = async () => { if (await eliminarCurso(c)) location.hash = '#/t/home'; };
  root.querySelectorAll('.st-list [data-s]').forEach(li => {
    const s = students.find(x => x.id === li.dataset.s);
    const acc = { name: renombrarEstudiante, pass: nuevaContrasena, move: x => moverEstudiante(x, c), del: eliminarEstudiante };
    li.querySelectorAll('[data-a]').forEach(b => { b.onclick = async () => { li.querySelector('details').open = false; if (await acc[b.dataset.a](s)) otra(); }; });
  });
}

// ---------- Crear: elegir tipo ----------
export async function chooseType(root, { query }) {
  // ?unit=ID: la actividad nueva se agrega a esa unidad al guardarla.
  const unit = query.unit ? await units.get(query.unit) : null;
  const q = unit ? `?unit=${unit.id}` : '';
  // Distribución como el selector de plantillas de Wordwall: encabezado con título y buscador; debajo,
  // "Ordenar por" en pestañas y la lista en 2 columnas (ícono ilustrado a la izquierda, nombre y descripción).
  root.innerHTML = `<ol class="steps" aria-label="Pasos"><li class="actual" aria-current="step">Plantilla</li><li>Contenido</li><li>Jugar y asignar</li></ol>
    ${unit ? `<a href="#/t/units/edit/${unit.id}" class="back-link">← Unidad: ${esc(unit.title)}</a>` : ''}
    <div class="page-head"><div><h1>Elige una plantilla</h1></div>
      <label class="grade-search">${icons.search}<input id="tplq" type="search" placeholder="Buscar plantillas…" autocomplete="off" aria-label="Buscar plantillas"></label></div>
    <div class="tpl-body">
      ${unit ? `<p class="tpl-note">La actividad nueva se agregará a la unidad <b>${esc(unit.title)}</b>.</p>` : ''}
      <div class="tpl-sort" role="tablist" aria-label="Ordenar por">
        <button type="button" role="tab" data-s="rec" aria-selected="true">Por propósito</button>
        <button type="button" role="tab" data-s="abc" aria-selected="false">A-Z</button></div>
      <div id="tpls"></div>
    </div>`;
  let sort = 'rec';
  const draw = () => {
    const term = $('#tplq', root).value.trim().toLowerCase();
    const list = templateList.filter(t => !term || `${t.label} ${t.description}`.toLowerCase().includes(term));
    const card = t => `<a class="tpl-card" href="#/t/new/${t.type}${q}">
        <span class="tpl-ico">${templateArt(t.type)}</span>
        <span class="tpl-txt"><b>${t.label}</b><span>${t.description}</span></span></a>`;
    if (!list.length) { $('#tpls', root).innerHTML = '<p class="muted">Ninguna plantilla coincide con la búsqueda.</p>'; return; }
    if (sort === 'abc' || term) {
      list.sort((a, b) => a.label.localeCompare(b.label, 'es'));
      $('#tpls', root).innerHTML = `<div class="tpl-list">${list.map(card).join('')}</div>`;
      return;
    }
    // Agrupadas por propósito, como se arma una clase.
    const GRUPOS = [['Vocabulario', ['matching', 'memory', 'anagram', 'diagram', 'wordsearch', 'crossword', 'hangman', 'classify']],
      ['Gramática', ['quiz', 'fill', 'reorder']], ['Comprensión', ['reading', 'listening', 'dictation']], ['Para la clase', ['random']]];
    $('#tpls', root).innerHTML = GRUPOS.map(([n, tipos]) => { const ts = list.filter(t => tipos.includes(t.type)); return ts.length ? `<h2 class="tpl-group">${n}</h2><div class="tpl-list">${ts.map(card).join('')}</div>` : ''; }).join('');
  };
  $('#tplq', root).oninput = draw;
  root.querySelectorAll('.tpl-sort button').forEach(b => b.onclick = () => {
    sort = b.dataset.s;
    root.querySelectorAll('.tpl-sort button').forEach(x => x.setAttribute('aria-selected', x === b));
    draw();
  });
  draw();
}

// ---------- Crear / Editar ----------
// Ejemplo de instrucción por tipo (placeholder del editor; el reproductor usa la misma idea si queda vacía).
const INSTR_EJ = {
  quiz: 'Choose the correct answer.', matching: 'Match the words.', fill: 'Complete the sentences.',
  reorder: 'Put the words in order.', classify: 'Put each word in the correct group.', memory: 'Find the pairs.',
  reading: 'Read the text and answer the questions.', listening: 'Listen and answer the questions.', dictation: 'Listen and write what you hear.',
  wordsearch: 'Find the words.', hangman: 'Guess the word.', crossword: 'Complete the crossword.',
  anagram: 'Put the letters in order.', diagram: 'Drag the labels to the picture.', random: 'Spin the wheel and answer.',
};

export async function editor(root, { user, params, query }) {
  const unit = query.unit ? await units.get(query.unit) : null;
  let act;
  if (params.id) {
    act = await activities.get(params.id);
    if (!act) { location.hash = '#/t/activities'; return; }
  } else {
    const tpl = templates[params.type];
    if (!tpl) { location.hash = '#/t/create'; return; }
    // Sin grado al crear; si se crea dentro de una unidad con grado, hereda el de la unidad.
    act = { type: tpl.type, title: '', content: tpl.empty(), ownerId: user.id, grade: unit?.grade || null };
  }
  const tpl = templates[act.type];
  // Grado: obligatorio al crear. Por defecto el de la unidad o el último que usó el docente.
  const grades = await courses.grades();
  let last = null; try { last = Number(localStorage.getItem('plat.lastGrade')) || null; } catch {}
  const gradeVal = act.grade || unit?.grade || (grades.includes(last) ? last : null);
  // Pasos arriba, como Wordwall: Plantilla › Contenido › Jugar. El estilo visual se elige en la página de la actividad.
  root.innerHTML = `<ol class="steps" aria-label="Pasos">
      <li class="hecho"><a href="${unit ? `#/t/create?unit=${unit.id}` : '#/t/create'}">Plantilla</a></li>
      <li class="actual" aria-current="step">Contenido</li><li>Jugar y asignar</li></ol>
    <div class="page-head"><div>
      ${unit ? `<a href="#/t/units/edit/${unit.id}" class="back-link">← Unidad: ${esc(unit.title)}</a>` : params.id ? `<a href="#/t/preview/${act.id}" class="back-link">← ${esc(act.title)}</a>` : ''}
      <h1>${tpl.label}</h1></div></div>
    <form class="card editor-card" id="form" novalidate>
      <div class="ed-top">
        <span class="ed-ico">${templateArt(tpl.type)}</span>
        <div class="field grow"><label for="title">Título</label>
          <input id="title" placeholder="Ej. Present simple – Unit 3" value="${esc(act.title)}" maxlength="80"></div>
        <div class="field" style="min-width:140px"><label for="grade">Grado</label>
          <select id="grade"><option value="">Elige…</option>${grades.map(g => `<option value="${g}" ${g === gradeVal ? 'selected' : ''}>${gradeLabel(g)}</option>`).join('')}</select></div>
      </div>
      <div class="ed-extras">
        <div id="iaBar"></div>
        <details class="instr-box" ${act.instruction ? 'open' : ''}><summary>+ Instrucción</summary>
          <input id="instr" maxlength="120" aria-label="Instrucción para el estudiante" placeholder="${esc(INSTR_EJ[act.type] || 'Ej. Choose the correct answer.')}" value="${esc(act.instruction || '')}"></details>
      </div>
      <div id="ed"></div>
      <ul class="errors" id="errs" hidden></ul>
      <div class="ed-save">
        <button class="btn ghost" type="button" id="prev">Vista previa</button>
        <button class="btn" type="submit">${params.id ? 'Guardar cambios' : 'Listo'}</button>
      </div>
    </form>
    <div id="preview" hidden style="margin-top:24px">
      <div class="row between" style="margin-bottom:12px"><h2 style="margin:0">Vista previa</h2>
        <button class="btn ghost sm" type="button" id="closePrev">Cerrar vista previa</button></div>
      <div class="preview-box"><div id="pstage"></div></div>
    </div>`;
  // Aviso de actividad asignada: solo al guardar (cuadro de confirmación), no como banda permanente.
  const asignada = params.id ? (await assignments.listForActivity(act.id)).length + (await activities.assignedUnitsWith(act.id)).length : 0;
  let ed = tpl.editor($('#ed', root), act.content);
  const title = $('#title', root);
  const errs = $('#errs', root);
  let player = null;

  const gradeSel = $('#grade', root);
  // Generar con IA / Importar: el contenido nuevo reemplaza el editor (no se guarda hasta "Guardar").
  iaBar($('#iaBar', root), {
    tpl, grados: grades,
    getGrado: () => Number(gradeSel.value) || null,
    setGrado: g => { if ([...gradeSel.options].some(o => o.value === String(g))) gradeSel.value = String(g); },
    getTitulo: () => title.value,
    setTitulo: t => { title.value = t; },
    setInstruccion: t => { if (t && !$('#instr', root).value.trim()) $('#instr', root).value = t; },
    getContenido: () => ed.getContent(),
    aplicar: c => {
      ed = tpl.editor($('#ed', root), c);
      errs.hidden = true;
      if (!$('#preview', root).hidden) { player?.stop(); $('#preview', root).hidden = true; }
      $('#ed', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  });
  const check = () => {
    const list = [...(title.value.trim() ? [] : ['Escribe un título.']), ...(gradeSel.value ? [] : ['Elige el grado.']), ...ed.validate()];
    errs.hidden = !list.length;
    errs.innerHTML = list.map(e => `<li>${esc(e)}</li>`).join('');
    title.classList.toggle('invalid', !title.value.trim());
    gradeSel.classList.toggle('invalid', !gradeSel.value);
    return !list.length;
  };
  let theme = themeById(act.theme || DEFAULT_THEME).id;
  const showPreview = () => {
    player?.stop();
    $('#preview', root).hidden = false;
    player = mountPlayer($('#pstage', root), {
      activity: { type: act.type, title: title.value, content: ed.getContent(), theme, instruction: $('#instr', root).value.trim() },
      onFinish: r => toast(`Vista previa terminada: ${r.score}/${r.maxScore} · nota ${grade(r.score, r.maxScore)}`),
    });
  };
  $('#prev', root).onclick = () => {
    const list = ed.validate();
    errs.hidden = !list.length;
    errs.innerHTML = list.map(e => `<li>${esc(e)}</li>`).join('');
    if (list.length) return;
    showPreview();
    $('#preview', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $('#closePrev', root).onclick = () => { player?.stop(); $('#preview', root).hidden = true; };
  $('#form', root).onsubmit = async e => {
    e.preventDefault();
    if (!check()) { errs.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const g = Number(gradeSel.value);
    if (asignada && JSON.stringify(ed.getContent()) !== JSON.stringify(act.content)
      && !(await confirmDialog(`Esta actividad ya está asignada${asignada > 1 ? ` (${asignada} veces, contando unidades)` : ''}. Si cambias el contenido, quien la tenga a medias empezará de nuevo; los resultados ya entregados se mantienen.`, 'Guardar'))) return;
    try { localStorage.setItem('plat.lastGrade', g); } catch {}
    const saved = await activities.save({ ...act, title: title.value.trim(), content: ed.getContent(), grade: g, theme, instruction: $('#instr', root).value.trim() });
    if (unit) {
      await units.addActivity(unit.id, saved.id);
      toast('Actividad creada y agregada a la unidad');
      location.hash = `#/t/units/edit/${unit.id}`;
      return;
    }
    toast(params.id ? 'Cambios guardados' : 'Actividad creada');
    location.hash = `#/t/preview/${saved.id}`;
  };
  return () => player?.stop();
}

// ---------- Página de la actividad (como la de Wordwall): vista previa, acciones, cambiar plantilla y estilo ----------
// "Cambiar plantilla": el mismo vocabulario se puede jugar como otro tipo. Se crea una COPIA del nuevo tipo
// (la original y sus asignaciones no cambian).
const PALABRA = /^[a-z]+$/i;
function termsOf(a) {
  const c = a.content || {};
  switch (a.type) {
    case 'matching': return (c.pairs || []).map(p => ({ term: p.left, def: p.right })).filter(x => x.term);
    case 'memory': return (c.pairs || []).map(p => ({ term: p.word, def: '' })).filter(x => x.term);
    case 'crossword': return (c.items || []).map(i => ({ term: i.answer, def: i.clue })).filter(x => x.term);
    case 'hangman': return (c.items || []).map(i => ({ term: i.word, def: i.hint })).filter(x => x.term);
    case 'wordsearch': return (c.items || []).map(i => ({ term: i.word, def: '' })).filter(x => x.term);
    case 'anagram': return (c.items || []).map(i => ({ term: i.word, def: i.hint || '' })).filter(x => x.term);
    case 'random': return (c.items || []).map(i => ({ term: i.text, def: '' })).filter(x => x.term);
    default: return null;
  }
}
const CONVERTIR = {
  matching: { need: t => t.filter(x => x.def).length >= 3, why: 'Hace falta una definición o traducción para cada palabra (al menos 3).',
    make: t => ({ pairs: t.filter(x => x.def).slice(0, 10).map(x => ({ left: x.term, right: x.def })) }) },
  memory: { need: t => t.length >= 3, why: 'Hacen falta al menos 3 palabras.',
    make: t => ({ pairs: t.slice(0, 8).map(x => ({ word: x.term, image: '' })) }) },
  crossword: { need: t => t.filter(x => PALABRA.test(x.term) && x.def).length >= 3, why: 'Hacen falta 3 palabras de una sola palabra, cada una con su pista.',
    make: t => ({ items: t.filter(x => PALABRA.test(x.term) && x.def).slice(0, 15).map(x => ({ answer: x.term.toLowerCase(), clue: x.def })) }) },
  wordsearch: { need: t => t.filter(x => PALABRA.test(x.term) && x.term.length <= 12).length >= 3, why: 'Hacen falta 3 palabras sin espacios (máx. 12 letras).',
    make: t => ({ items: t.filter(x => PALABRA.test(x.term) && x.term.length <= 12).slice(0, 15).map(x => ({ word: x.term.toLowerCase() })), diagonal: true, backwards: false }) },
  hangman: { need: t => t.some(x => PALABRA.test(x.term)), why: 'Hace falta al menos una palabra sin espacios.',
    make: t => ({ items: t.filter(x => PALABRA.test(x.term)).slice(0, 15).map(x => ({ word: x.term.toLowerCase(), hint: x.def || '' })), lives: 6 }) },
  anagram: { need: t => t.some(x => PALABRA.test(x.term) && x.term.length <= 16), why: 'Hace falta al menos una palabra sin espacios (máx. 16 letras).',
    make: t => ({ items: t.filter(x => PALABRA.test(x.term) && x.term.length <= 16).slice(0, 20).map(x => ({ word: x.term.toLowerCase(), hint: x.def || '' })) }) },
  random: { need: t => t.length >= 2, why: 'Hacen falta al menos 2 palabras.',
    make: t => ({ look: 'wheel', items: t.slice(0, 24).map(x => ({ text: x.term })) }) },
};

export async function preview(root, { params }) {
  const act = await activities.get(params.id);
  if (!act) { location.hash = '#/t/activities'; return; }
  const tpl = templates[act.type];
  const asg = await assignments.listForActivity(act.id);
  const crs = await courses.list();
  const terms = termsOf(act);
  const destinos = terms ? Object.keys(CONVERTIR).filter(t => t !== act.type) : [];
  root.innerHTML = `<a href="#/t/activities" class="back-link">← Biblioteca</a>
    <div class="act-page">
      <div class="act-main">
        <div id="stage"></div>
        <div class="act-head">
          <div class="grow"><h1>${esc(act.title)}</h1>
            <p class="muted">${tpl.label} · ${esc(tpl.summary(act.content))} ${gradeBadge(act.grade, act.title, act.id)}</p></div>
          <a class="btn" href="#/t/assign?activity=${act.id}">${icons.send} Asignar</a>
        </div>
        <div class="act-tools">
          <a class="btn ghost sm" href="#/t/present/${act.id}">Presentar en clase</a>
          <a class="btn ghost sm" href="#/t/edit/${act.id}">Editar contenido</a>
          <button class="btn ghost sm" type="button" id="dup">Duplicar</button>
        </div>
        <section class="card act-asg"><h2>Asignaciones</h2>
          ${asg.length ? `<ul class="asg-list">${asg.map(a => `<li><div class="grow"><b>${esc(crs.find(c => c.id === a.courseId)?.name || '')}</b>
            <span class="small muted">${a.dueAt ? `Entrega ${fmtDate(a.dueAt)}` : 'Sin fecha'}${a.forceSerious ? ' · evaluación' : ''}${a.maxTries ? ` · ${a.maxTries} intento${a.maxTries === 1 ? '' : 's'}` : ''}</span></div>
            <a class="btn ghost sm" href="#/t/results?a=${a.id}">Resultados</a></li>`).join('')}</ul>`
            : '<p class="muted small">Aún no la has asignado. El reloj, los intentos y el modo evaluación se eligen al asignar.</p>'}
        </section>
      </div>
      <aside class="act-side">
        ${destinos.length ? `<section class="side-box"><h2>Cambiar plantilla</h2>
          <p class="small muted">Crea una copia con otro juego.</p>
          <div class="switch-list">${destinos.map(t => { const ok = CONVERTIR[t].need(terms); return `<button type="button" class="switch-op" data-t="${t}" ${ok ? '' : `disabled title="${esc(CONVERTIR[t].why)}"`}>
            <span class="switch-ico">${templateArt(t)}</span><span>${templates[t].label}</span></button>`; }).join('')}</div></section>` : ''}
        <section class="side-box"><h2>Estilo visual</h2><div id="temas"></div></section>
      </aside>
    </div>`;
  themePicker($('#temas', root), themeById(act.theme || DEFAULT_THEME).id, async id => {
    act.theme = id;
    await activities.setTheme(act.id, id);
    toast(`Estilo: ${themeById(id).name}`);
    start();
  });
  // El estilo en uso va primero (así siempre se ve marcado aunque solo se muestren 4).
  const tg = root.querySelector('#temas .tema-grid'), on = tg?.querySelector('[aria-checked="true"]');
  if (tg && on) tg.prepend(on);
  const vt = el('<button type="button" class="btn ghost sm ver-todos">Ver todos los estilos</button>');
  vt.onclick = () => { const g = root.querySelector('#temas .tema-grid'); const on = g.classList.toggle('todos'); vt.textContent = on ? 'Ver menos' : 'Ver todos los estilos'; };
  $('#temas', root).after(vt);
  const gb = root.querySelector('.grade-badge');
  if (gb) gb.onclick = async () => {
    const g = await gradeDialog(act.title, act.grade, await courses.grades());
    if (g === undefined || g === act.grade) return;
    await activities.setGrade(act.id, g); toast(`Ahora es de ${gradeLabel(g)}`); preview(root, { params });
  };
  $('#dup', root).onclick = async () => { const copy = await activities.duplicate(act.id); toast('Copia creada'); location.hash = `#/t/preview/${copy.id}`; };
  root.querySelectorAll('.switch-op').forEach(b => b.onclick = async () => {
    const t = b.dataset.t;
    const copy = await activities.save({ ownerId: act.ownerId, type: t, title: `${act.title} (${templates[t].label})`.slice(0, 80), grade: act.grade || null, theme: act.theme || null, instruction: '', content: CONVERTIR[t].make(terms) });
    toast(`Copia creada como ${templates[t].label.toLowerCase()}`);
    location.hash = `#/t/preview/${copy.id}`;
  });
  let player;
  const start = () => {
    player?.stop();
    // El resultado se queda dentro del escenario (como WordWall); con "Sencillo" no hay escenario y se muestra la tarjeta.
    player = mountPlayer($('#stage', root), {
      activity: act, finalFijo: true, onReplay: start,
      onFinish: r => {
        if ($('#stage', root).querySelector('.esc-final.fijo')) return;
        const box = el(`<div class="card result" style="margin-top:12px">
          <h2>Vista previa terminada</h2><p>${r.score}/${r.maxScore} aciertos · nota <b>${grade(r.score, r.maxScore)}</b> · ${fmtDuration(r.durationSec)}</p>
          <button class="btn ghost" type="button">Jugar de nuevo</button></div>`);
        box.querySelector('button').onclick = start;
        $('#stage', root).append(box);
      },
    });
  };
  start();
  return () => player?.stop();
}

// Elegir desde qué nivel se abre la actividad como reto. Devuelve el nivel, null (quitar) o undefined (cancelar).
function retoDialog(a) {
  return new Promise(resolve => {
    const d = el(`<dialog aria-label="Marcar como reto">
      <h2 style="margin-top:0">Reto: ${esc(a.title)}</h2>
      <p class="small muted">Los estudiantes de ${gradeLabel(a.grade)} la verán en "Retos" desde el nivel que elijas. No tiene nota: da XP. Sigue en tu biblioteca y la puedes asignar igual.</p>
      <div class="field"><label for="rl">Se abre en el nivel</label>
        <select id="rl">${Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<option value="${n}" ${n === (a.challengeLevel || 3) ? 'selected' : ''}>Nivel ${n}</option>`).join('')}</select></div>
      <div class="row end">
        ${a.challengeLevel ? '<button class="btn ghost danger-txt" value="off" type="button">Quitar reto</button>' : ''}
        <button class="btn ghost" value="cancel" type="button">Cancelar</button>
        <button class="btn" value="ok" type="button">Guardar</button></div></dialog>`);
    document.body.append(d);
    let out;
    d.addEventListener('click', e => {
      const v = e.target.closest('button')?.value; if (!v) return;
      out = v === 'ok' ? Number(d.querySelector('#rl').value) : v === 'off' ? null : undefined;
      d.close();
    });
    d.addEventListener('close', () => { d.remove(); resolve(out); }, { once: true });
    d.showModal();
  });
}

// ---------- Mis actividades (estilo Wordwall: tarjetas con miniatura real, un botón principal y menú ⋮) ----------
// Texto corto del contenido para la miniatura (la primera pregunta, palabras, frase…).
export function snippet(a) {
  const c = a.content || {};
  const words = list => list.filter(Boolean).slice(0, 4).join(' · ');
  switch (a.type) {
    case 'quiz': case 'listening': return c.questions?.[0]?.q || '';
    case 'reading': return c.title || c.text?.slice(0, 60) || '';
    case 'matching': return words((c.pairs || []).map(p => p.left && p.right ? `${p.left} = ${p.right}` : p.left));
    case 'memory': return words((c.pairs || []).map(p => p.word));
    case 'fill': return (c.items?.[0]?.text || '').replace(/\{\{.+?\}\}/g, '____');
    case 'reorder': return c.items?.[0]?.sentence || '';
    case 'classify': return (c.groups || []).map(g => g.name).filter(Boolean).join(' / ');
    case 'dictation': return c.items?.[0]?.text || '';
    case 'wordsearch': return words((c.items || []).map(i => i.word));
    case 'hangman': return (c.items || []).map(i => '_ '.repeat(Math.min(i.word?.length || 0, 8)).trim())[0] || '';
    case 'crossword': return words((c.items || []).map(i => i.answer));
    case 'anagram': return words((c.items || []).map(i => i.word));
    case 'random': return words((c.items || []).map(i => i.text));
    case 'diagram': return words((c.labels || []).map(l => l.text));
    default: return '';
  }
}
const cwCache = new Map();
// Miniatura real (como las de Wordwall): una vista en pequeño de la actividad con su contenido, no arte decorativo.
export function actThumb(a) {
  const c = a.content || {}, e = x => esc(String(x ?? '')), cut = (x, n) => { x = String(x ?? ''); return x.length > n ? x.slice(0, n - 1) + '…' : x; };
  let body = '';
  switch (a.type) {
    case 'quiz': case 'reading': case 'listening': {
      const q = c.questions?.[0] || { q: c.title || '', options: [] };
      body = `${a.type !== 'quiz' ? `<span class="mt-doc">${a.type === 'reading' ? '📖 ' + e(cut(c.title || 'Lectura', 26)) : '🔊 Audio'}</span>` : ''}
        <b class="mt-q">${e(cut(q.q, 60))}</b><span class="mt-opts">${(q.options || []).slice(0, 4).map(o => `<i>${e(cut(o, 14))}</i>`).join('')}</span>`;
      break;
    }
    case 'matching': body = `<span class="mt-match">${(c.pairs || []).slice(0, 3).map(p => `<i>${e(cut(p.left, 12))}</i><em></em><i>${e(cut(p.right, 12))}</i>`).join('')}</span>`; break;
    case 'memory': body = `<span class="mt-mem">${Array.from({ length: 8 }, (_, k) => `<i>${k === 1 || k === 6 ? e(cut(c.pairs?.[k === 1 ? 0 : 1]?.word, 8)) : ''}</i>`).join('')}</span>`; break;
    case 'fill': body = `<b class="mt-q">${e(cut(c.items?.[0]?.text || '', 70)).replace(/\{\{.+?\}\}/g, '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>')}</b>`; break;
    case 'reorder': body = `<span class="mt-chips">${String(c.items?.[0]?.sentence || '').split(/\s+/).filter(Boolean).slice(0, 6).sort((x, y) => x.length - y.length).map(w => `<i>${e(w)}</i>`).join('')}</span>`; break;
    case 'classify': body = `<span class="mt-bins">${(c.groups || []).slice(0, 3).map(g => `<span><b>${e(cut(g.name, 12))}</b>${g.items.slice(0, 2).map(x => `<i>${e(cut(x, 10))}</i>`).join('')}</span>`).join('')}</span>`; break;
    case 'dictation': body = `<span class="mt-doc">🔊 Dictado</span><span class="mt-lines"><i></i><i></i><i></i></span>`; break;
    case 'wordsearch': {
      const words = (c.items || []).map(i => String(i.word || '').toUpperCase());
      const letras = (words.join('') + 'ABCDEFGHIJKLMNOPRSTU').slice(0, 42).split('');
      body = `<span class="mt-grid" style="--n:7">${letras.map((l, k) => `<i class="${k < (words[0]?.length || 0) ? 'on' : ''}">${l}</i>`).join('')}</span>`;
      break;
    }
    case 'hangman': body = `<span class="mt-hang">${'<i></i>'.repeat(Math.min(String(c.items?.[0]?.word || '').length, 9))}</span><span class="mt-doc">${e(cut(c.items?.[0]?.hint || '', 30))}</span>`; break;
    case 'crossword': {
      // Un crucigrama de verdad en pequeño (palabras cruzadas); se arma una vez por actividad y se recuerda.
      const ans = (c.items || []).map(i => String(i.answer || '')).filter(x => letras(x).length >= 2).slice(0, 6);
      if (!ans.length) { body = `<b class="mt-q">${e(snippet(a))}</b>`; break; }
      const clave = a.id + '|' + ans.join(',');
      if (!cwCache.has(clave)) cwCache.set(clave, armarCrucigrama(ans));
      const L = cwCache.get(clave), px = Math.max(5, Math.min(13, Math.floor(92 / L.h), Math.floor(200 / L.w)));
      const casillas = new Set();
      for (const p of L.words) for (let k = 0; k < p.len; k++) casillas.add(p.dir === 'h' ? `${p.r},${p.c + k}` : `${p.r + k},${p.c}`);
      body = `<span class="mt-cw" style="--px:${px}px;grid-template-columns:repeat(${L.w},${px}px);grid-template-rows:repeat(${L.h},${px}px)">${[...casillas].map(k => { const [r, cc] = k.split(',').map(Number); return `<i style="grid-area:${r + 1}/${cc + 1}"></i>`; }).join('')}</span>`;
      break;
    }
    case 'anagram': {
      const w = String(c.items?.[0]?.word || '').replace(/\s+/g, '').slice(0, 7);
      body = `<span class="mt-an">${[...w].reverse().map(l => `<i>${e(l)}</i>`).join('')}</span><span class="mt-an vacias">${[...w].map(() => '<i></i>').join('')}</span>`;
      break;
    }
    case 'diagram': body = `<span class="mt-dg">${safeSrc(c.image) ? `<img src="${safeSrc(c.image)}" alt="">` : ''}${(c.labels || []).slice(0, 5).map(l => `<i style="left:${Number(l.x) || 0}%;top:${Number(l.y) || 0}%"></i>`).join('')}</span>`; break;
    case 'random': body = c.look === 'boxes' ? `<span class="mt-cajas">${(c.items || []).slice(0, 8).map((_, k) => `<i>${k + 1}</i>`).join('')}</span>`
      : c.look === 'cards' ? `<span class="mt-cartas"><i></i><b>${e(cut(c.items?.[0]?.text || '', 22))}</b></span>`
      : '<span class="mt-rueda"></span>'; break;
    default: body = `<b class="mt-q">${e(snippet(a))}</b>`;
  }
  return `<div class="act-thumb mini" data-tipo="${a.type}" aria-hidden="true"><span class="at-k">${e(templates[a.type]?.label || '')}</span>${body}</div>`;
}
export async function activitiesList(root, { user, query }) {
  const everything = await activities.list(user.id);
  const grades = await courses.grades();
  const anyNone = everything.some(a => !a.grade);
  const gf = query.grade === 'none' ? (anyNone ? 'none' : null) : query.grade ? Number(query.grade) : null;
  const all = gf === 'none' ? everything.filter(a => !a.grade) : gf ? everything.filter(a => a.grade === gf) : everything;
  const noGrade = everything.filter(a => !a.grade).length;
  const orden = query.sort === 'name' ? 'name' : 'recent';
  const link = (t, g, s = orden) => { const q = new URLSearchParams({ ...(t ? { type: t } : {}), ...(g ? { grade: g } : {}), ...(s !== 'recent' ? { sort: s } : {}) }).toString(); return '#/t/activities' + (q ? '?' + q : ''); };
  const fromNew = query.new && all.find(a => a.id === query.new)?.type;
  const type = templates[query.type] ? query.type : fromNew || null;
  let acts = type ? all.filter(a => a.type === type) : all;
  if (orden === 'name') acts = [...acts].sort((x, y) => x.title.localeCompare(y.title));
  const usados = templateList.filter(t => all.some(a => a.type === t.type));
  const unidades = (await units.list(user.id)).filter(u => !gf || u.grade === gf).slice(0, 4);
  root.innerHTML = `<div class="page-head"><div><h1>Biblioteca</h1></div>
    <a class="btn" href="${type ? `#/t/new/${type}` : '#/t/create'}">${icons.plus} Crear actividad</a></div>
    ${unidades.length ? `<div class="unit-folders">${unidades.map(u => `<a class="unit-folder" href="#/t/units/edit/${u.id}">
      <span class="uf-ico">${icons.unit}</span><span class="grow"><b>${esc(u.title)}</b><span class="small">${u.activityIds.length} actividades${u.grade ? ` · ${gradeLabel(u.grade)}` : ''}</span></span></a>`).join('')}
      <a class="btn link unit-all" href="#/t/units">Ver todas las unidades</a></div>` : ''}
    <div class="lib-bar">
      <nav class="grade-seg" aria-label="Grado">${[{ g: null, l: 'Todos', n: everything.length }, ...grades.map(g => ({ g, l: gradeLabel(g), n: everything.filter(a => a.grade === g).length }))].map(o =>
        `<a class="${o.g ? `g${o.g % 6}` : ''} ${o.g === gf ? 'active' : ''}" href="${link(type, o.g)}" ${o.g === gf ? 'aria-current="true"' : ''}>${o.l} <span class="n">${o.n}</span></a>`).join('')}</nav>
      ${noGrade ? `<a class="grade-warn ${gf === 'none' ? 'active' : ''}" href="${link(type, gf === 'none' ? null : 'none')}" title="Sin grado no se pueden asignar. Toca su insignia para elegirlo.">⚠ ${noGrade} sin grado</a>` : ''}
      <select id="tipo" aria-label="Tipo de actividad"><option value="">Todos los tipos</option>${usados.map(t => `<option value="${t.type}" ${t.type === type ? 'selected' : ''}>${t.plural} (${all.filter(a => a.type === t.type).length})</option>`).join('')}</select>
      <select id="orden" aria-label="Ordenar"><option value="recent">Recientes</option><option value="name" ${orden === 'name' ? 'selected' : ''}>Nombre</option></select>
      <label class="grade-search">${icons.search}<input id="actq" type="search" placeholder="Buscar…" aria-label="Buscar en mis actividades"></label>
    </div>
    <div class="act-grid" id="list"></div>`;
  $('#tipo', root).onchange = e => { location.hash = link(e.target.value || null, gf); };
  $('#orden', root).onchange = e => { location.hash = link(type, gf, e.target.value); };
  const box = $('#list', root);
  if (!acts.length) {
    box.outerHTML = `<div class="card empty">${type ? `Aún no tienes ${templates[type].plural.toLowerCase()}. <a href="#/t/new/${type}">Crear una</a>.` : 'No tienes actividades. <a href="#/t/create">Crea la primera</a>.'}</div>`;
    return;
  }
  const q = { ...(type ? { type } : {}), ...(gf ? { grade: gf } : {}), ...(orden !== 'recent' ? { sort: orden } : {}) };
  for (const a of acts) {
    const tpl = templates[a.type];
    const asg = await assignments.listForActivity(a.id);
    const card = el(`<article class="act-card ${query.new === a.id ? 'nuevo' : ''}">
      <a href="#/t/preview/${a.id}" class="act-open" aria-label="Abrir ${esc(a.title)}">${actThumb(a)}</a>
      <div class="act-body">
        <h3><a href="#/t/preview/${a.id}">${esc(a.title)}</a></h3>
        <div class="act-meta">${gf && a.grade ? '' : gradeBadge(a.grade, a.title, a.id)}<span>${tpl.label} · ${asg.length ? `asignada ${asg.length}×` : 'sin asignar'}</span>${a.challengeLevel ? `<span class="badge reto-badge">Reto ${a.challengeLevel}</span>` : ''}</div>
      </div>
      <div class="act-actions">
        <a class="btn ghost sm" href="#/t/assign?activity=${a.id}">Asignar</a>
        <details class="more"><summary class="icon-btn" aria-label="Más acciones para ${esc(a.title)}">⋮</summary>
          <div class="more-menu">
            <a href="#/t/edit/${a.id}">Editar contenido</a>
            <a href="#/t/present/${a.id}">Presentar en clase</a>
            <button type="button" data-grade>Cambiar grado…</button>
            <button type="button" data-dup>Duplicar</button>
            <button type="button" data-reto>${a.challengeLevel ? `Reto desde nivel ${a.challengeLevel}…` : 'Marcar como reto…'}</button>
            <button type="button" data-del class="danger-txt">Eliminar</button>
          </div></details>
      </div></article>`);
    card.dataset.title = a.title.toLowerCase();
    const changeGrade = async () => {
      card.querySelector('details.more')?.removeAttribute('open');
      const g = await gradeDialog(a.title, a.grade, grades);
      if (g === undefined || g === a.grade) return;
      await activities.setGrade(a.id, g);
      toast(`Ahora es de ${gradeLabel(g)}`);
      await activitiesList(root, { user, query: q });
      refocusGrade(root, a.id);
    };
    const gbd = card.querySelector('.grade-badge'); if (gbd) gbd.onclick = changeGrade;
    card.querySelector('[data-grade]').onclick = changeGrade;
    card.querySelector('[data-reto]').onclick = async () => {
      if (!a.grade) return toast('Primero elige su grado: los retos se muestran a los estudiantes de ese grado.', 'err');
      const lv = await retoDialog(a);
      if (lv === undefined) return;
      await activities.setChallenge(a.id, lv);
      toast(lv ? `Ahora es un reto desde el nivel ${lv} para ${gradeLabel(a.grade)}` : 'Ya no es un reto');
      await activitiesList(root, { user, query: q });
    };
    card.querySelector('[data-dup]').onclick = async () => {
      const copy = await activities.duplicate(a.id);
      toast('Copia creada: cámbiale el título o el grado');
      location.hash = `#/t/activities?new=${copy.id}`;
    };
    card.querySelector('[data-del]').onclick = async () => {
      const inUnits = await activities.assignedUnitsWith(a.id);
      const extra = (asg.length ? ' También se borrarán sus asignaciones y resultados.' : '')
        + (inUnits.length ? ` Está en ${inUnits.length === 1 ? 'la unidad asignada' : 'las unidades asignadas'} ${inUnits.map(u => `"${u.title}"`).join(', ')}: saldrá de ahí y cambiará la nota de la unidad.` : '');
      if (!(await confirmDialog(`¿Eliminar "${a.title}"?${extra}`, 'Eliminar', true))) return;
      await activities.remove(a.id);
      toast('Actividad eliminada');
      activitiesList(root, { user, query: q });
    };
    box.append(card);
  }
  const none = el('<div class="card empty" hidden>Ninguna actividad coincide con la búsqueda.</div>');
  box.after(none);
  $('#actq', root).oninput = e => {
    const t = e.target.value.trim().toLowerCase();
    let shown = 0;
    box.querySelectorAll('.act-card').forEach(r => { r.hidden = !!t && !r.dataset.title.includes(t); if (!r.hidden) shown++; });
    none.hidden = shown > 0;
  };
}

