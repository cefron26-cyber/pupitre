// Docente: Asignar (actividad o unidad) y Resultados.
import { activities, units, assignments, attempts, courses } from '../storage.js';
import { esc, el, $, toast, confirmDialog, fmtDate, fmtAgo, fmtDuration, grade, icons } from '../ui.js';
import { templates } from '../templates/index.js';
import { statusLabel, gradeLabel, UNIT_MAX_TRIES, bestAttempt, points, FASES, faseDe } from '../logic.js';
// Íconos de datos con significado fijo en toda la plataforma (como Cambridge One): completado, promedio, meta, fecha.
export const DATO = {
  hecho: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#1b6e3a"/><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  promedio: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" fill="#1f3a68"/><text x="12" y="16" text-anchor="middle" font-size="9" font-weight="700" fill="#fff" font-family="Lexend,sans-serif">AVG</text></svg>',
  meta: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#fff0eb" stroke="#ff6b4a" stroke-width="2"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="#ff6b4a" stroke-width="2"/><circle cx="12" cy="12" r="1.8" fill="#ff6b4a"/></svg>',
  fecha: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="#5a6478" stroke-width="2"/><path d="M12 7v5l3.5 2" stroke="#5a6478" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
};
import { describe, courseProgress, missedQuestions } from './teacher.js';

// ---------- Asignar ----------
// Primero el grado, luego el curso (de ese grado) y una actividad o unidad ya clasificada en ese grado.
// No se puede asignar una de 5° a sexto. El reloj (cronómetro o cuenta regresiva) lo decide solo el docente.
export async function assign(root, { user, query }) {
  const acts = await activities.list(user.id);
  const uns = (await units.list(user.id)).filter(u => u.activityIds.length);
  const crs = await courses.list();
  const grades = await courses.grades();
  let kind = query.unit ? 'unit' : 'activity';
  const actQ = query.activity || query.act;
  const pre = query.unit ? uns.find(u => u.id === query.unit) : actQ ? acts.find(a => a.id === actQ) : null;
  // Desde la página de un curso se llega con ?course=: ese curso queda elegido.
  const preCourse = crs.find(c => c.id === query.course);
  let gradeSel = preCourse?.grade || pre?.grade || grades[0] || null;
  let courseId = preCourse?.id || null;
  let timerMode = 'none';
  // Lo que el docente ya llenó se conserva al cambiar grado, curso o tipo.
  let picked = pre?.id || null, dueVal = '', minutes = 5, serious = false, focusSel = null, tries = '', showAns = true;
  const draw = async () => {
    const asgs = await assignments.listAll(user.id);
    const gCourses = crs.filter(c => c.grade === gradeSel);
    if (!gCourses.some(c => c.id === courseId)) courseId = gCourses[0]?.id || null;
    const course = crs.find(c => c.id === courseId);
    const pool = kind === 'unit' ? uns : acts;
    const fit = pool.filter(x => x.grade === gradeSel);
    const noGrade = pool.filter(x => !x.grade).length;
    const options = fit.map(x => kind === 'unit'
      ? `<option value="${x.id}" ${picked === x.id ? 'selected' : ''}>${esc(x.title)} · ${x.activityIds.length} actividades</option>`
      : `<option value="${x.id}" ${picked === x.id ? 'selected' : ''}>${esc(x.title)} · ${templates[x.type].label}</option>`);
    const wrongPre = pre && !pre.grade;
    root.innerHTML = `<div class="page-head"><div><h1>Asignaciones</h1><p class="muted">Elige el grado y el curso, y envíale una actividad o una unidad de ese grado.</p></div></div>
      <form class="card" id="f" novalidate>
        <div class="row" style="align-items:flex-start">
          <div class="field grow"><label for="grd">Grado</label>
            <select id="grd">${grades.map(g => `<option value="${g}" ${g === gradeSel ? 'selected' : ''}>${gradeLabel(g)}</option>`).join('')}</select></div>
          <div class="field grow"><label for="crs">Curso</label>
            <select id="crs">${gCourses.map(c => `<option value="${c.id}" ${c.id === courseId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        </div>
        <label>¿Qué quieres asignar?</label>
        <div class="seg" role="radiogroup" aria-label="Qué asignar">
          <button type="button" class="seg-btn ${kind === 'activity' ? 'active' : ''}" data-k="activity" role="radio" aria-checked="${kind === 'activity'}">${icons.quiz} Una actividad</button>
          <button type="button" class="seg-btn ${kind === 'unit' ? 'active' : ''}" data-k="unit" role="radio" aria-checked="${kind === 'unit'}">${icons.unit} Una unidad</button>
        </div>
        ${wrongPre ? `<div class="feedback bad"><span>"${esc(pre.title)}" aún no tiene grado. Elígelo en ${kind === 'unit' ? '<a href="#/t/units">Unidades</a>' : '<a href="#/t/activities?grade=none">Mis actividades</a>'} para poder asignarla.</span></div>` : ''}
        ${options.length && course ? `
        <div class="field"><label for="what">${kind === 'unit' ? 'Unidad' : 'Actividad'} de ${gradeLabel(gradeSel)}</label>
          <select id="what">${options.join('')}</select></div>
        <div class="field"><label for="due">Fecha límite <span class="muted">(opcional)</span></label>
          <input id="due" type="datetime-local" value="${esc(dueVal)}">
          <p class="hint">Después de la fecha la pueden hacer igual, pero queda marcada como atrasada.</p></div>
        <div class="row" style="align-items:flex-start">
          <div class="field grow"><label for="tmode">Reloj${kind === 'unit' ? ' (en cada actividad)' : ''}</label>
            <select id="tmode">
              <option value="none" ${timerMode === 'none' ? 'selected' : ''}>Sin reloj</option>
              <option value="up" ${timerMode === 'up' ? 'selected' : ''}>Cronómetro: ven cuánto tiempo llevan</option>
              <option value="down" ${timerMode === 'down' ? 'selected' : ''}>Cuenta regresiva: tiempo límite</option></select>
            <p class="hint">El estudiante solo ve el reloj que elijas; no lo puede quitar.</p></div>
          <div class="field" id="tminWrap" ${timerMode === 'down' ? '' : 'hidden'} style="max-width:160px"><label for="tmin">Minutos</label>
            <input id="tmin" type="number" min="1" max="120" step="1" value="${esc(minutes)}"></div>
        </div>
        ${kind === 'unit' ? `<p class="hint" style="margin-top:0">En una unidad cada actividad tiene ${UNIT_MAX_TRIES} intentos y cuenta el mejor.</p>` : `
        <div class="field" style="max-width:260px"><label for="tries">Intentos</label>
          <select id="tries">${[['', 'Ilimitados'], ['1', '1 intento'], ['2', '2 intentos'], ['3', '3 intentos']].map(([v, l]) => `<option value="${v}" ${String(tries) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <p class="hint">Cuenta el mejor intento.</p></div>`}
        <label class="check"><input type="checkbox" id="showAns" ${showAns ? 'checked' : ''}> Mostrar si acertó y la respuesta correcta (después de cada pregunta y al terminar)</label>
        <label class="check"><input type="checkbox" id="serious" ${serious ? 'checked' : ''}> Es una evaluación: los estudiantes la hacen en modo serio, sin animaciones</label>
        <div class="row end"><button class="btn" type="submit">Asignar a ${esc(course.name)}</button></div>`
        : !course ? `<p class="muted">No hay cursos de ${gradeLabel(gradeSel)}.</p>`
        : `<p class="muted">No tienes ${kind === 'unit' ? 'unidades' : 'actividades'} de ${gradeLabel(gradeSel)}.
            Clasifícalas en <a href="${kind === 'unit' ? '#/t/units' : '#/t/activities'}">${kind === 'unit' ? 'Unidades' : 'Mis actividades'}</a> eligiendo su grado.</p>`}
        ${noGrade ? `<p class="small muted">${noGrade} ${kind === 'unit' ? 'unidad(es)' : 'actividad(es)'} sin grado no aparecen aquí: elige su grado en la lista de ${kind === 'unit' ? 'Unidades' : 'Mis actividades'}.</p>` : ''}
      </form>
      <div class="card"><h2>Asignaciones</h2><div class="list" id="list"></div></div>`;
    $('#grd', root).onchange = e => { gradeSel = Number(e.target.value); focusSel = '#grd'; draw(); };
    const crsSel = $('#crs', root);
    if (crsSel) crsSel.onchange = e => { courseId = e.target.value; focusSel = '#crs'; draw(); };
    root.querySelectorAll('.seg-btn').forEach(b => { b.onclick = () => { kind = b.dataset.k; focusSel = `.seg-btn[data-k="${kind}"]`; draw(); }; });
    if (focusSel) { $(focusSel, root)?.focus(); focusSel = null; }
    if (options.length && course) {
      const due = $('#due', root), tmode = $('#tmode', root), tmin = $('#tmin', root);
      due.oninput = () => { dueVal = due.value; };
      tmin.oninput = () => { minutes = tmin.value; };
      // Al marcarla como evaluación se proponen 1 intento y respuestas ocultas (se pueden cambiar).
      $('#serious', root).onchange = e => {
        serious = e.target.checked;
        if (serious) { showAns = false; $('#showAns', root).checked = false; if (kind === 'activity') { tries = '1'; $('#tries', root).value = '1'; } }
      };
      $('#showAns', root).onchange = e => { showAns = e.target.checked; };
      if ($('#tries', root)) $('#tries', root).onchange = e => { tries = e.target.value; };
      $('#what', root).onchange = e => { picked = e.target.value; };
      tmode.onchange = () => { timerMode = tmode.value; $('#tminWrap', root).hidden = timerMode !== 'down'; };
      due.min = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
      $('#f', root).onsubmit = async e => {
        e.preventDefault();
        const id = $('#what', root).value;
        const dueAt = due.value ? new Date(due.value).toISOString() : null;
        const minutes = Math.round(Number(tmin.value));
        if (tmode.value === 'down' && !(minutes >= 1 && minutes <= 120)) { tmin.classList.add('invalid'); toast('Escribe los minutos (de 1 a 120).', 'err'); return; }
        const timer = tmode.value === 'none' ? null : { mode: tmode.value, minutes: tmode.value === 'down' ? minutes : null };
        const exists = asgs.find(a => (kind === 'unit' ? a.unitId : a.activityId) === id && a.courseId === courseId);
        if (exists && !(await confirmDialog('Ya está asignada a ese curso. ¿Asignarla otra vez?', 'Asignar'))) return;
        try {
          await assignments.create({ [kind === 'unit' ? 'unitId' : 'activityId']: id, courseId, dueAt, timer, forceSerious: $('#serious', root).checked, ownerId: user.id,
            maxTries: kind === 'unit' ? null : Number($('#tries', root).value) || null, showAnswers: $('#showAns', root).checked });
        } catch (err) { toast(err.message, 'err'); return; }
        toast(kind === 'unit' ? 'Unidad asignada' : 'Actividad asignada');
        dueVal = ''; serious = false; tries = ''; showAns = true;
        draw();
      };
    }
    const box = $('#list', root);
    if (!asgs.length) { box.innerHTML = '<p class="muted">Aún no hay asignaciones.</p>'; return; }
    for (const a of asgs) {
      const d = await describe(a);
      const c = crs.find(x => x.id === a.courseId);
      const row = el(`<div class="item" style="box-shadow:none;border:1px solid var(--line)">
        <div class="type-icon ${d.isUnit ? 'unit' : ''}">${d.icon}</div>
        <div class="info"><p class="title">${esc(d.title)}</p>
          <div class="meta">${esc(d.kind)} · ${esc(c?.name)} · ${a.dueAt ? 'Entrega ' + fmtDate(a.dueAt) : 'Sin fecha límite'}${a.forceSerious ? ' · Modo serio' : ''}${a.maxTries ? ` · ${a.maxTries} intento${a.maxTries === 1 ? '' : 's'}` : ''}${a.showAnswers === false ? ' · Respuestas ocultas' : ''}${a.timer?.mode === 'down' ? ` · Tiempo límite ${a.timer.minutes} min` : a.timer?.mode === 'up' ? ' · Con cronómetro' : ''} · asignada ${fmtDate(a.createdAt, false)}</div></div>
        <div class="row"><a class="btn ghost sm" href="#/t/results?a=${a.id}">Resultados</a>
          <button class="btn danger sm" type="button">Quitar</button></div></div>`);
      row.querySelector('button').onclick = async () => {
        if (!(await confirmDialog('¿Quitar esta asignación? Se borrarán sus resultados.', 'Quitar', true))) return;
        await assignments.remove(a.id); toast('Asignación quitada'); draw();
      };
      box.append(row);
    }
  };
  await draw();
}

// ---------- Resultados ----------
export async function results(root, { user, query }) {
  const asgs = await assignments.listAll(user.id);
  const crs = await courses.list();
  if (!asgs.length) {
    root.innerHTML = `<div class="page-head"><h1>Resultados</h1></div><div class="card empty">Aún no hay asignaciones. <a href="#/t/assign">Asignar una actividad o unidad</a></div>`;
    return;
  }
  const opts = [];
  for (const a of asgs) opts.push({ a, d: await describe(a), course: crs.find(c => c.id === a.courseId) });
  const sel = opts.find(o => o.a.id === query.a) || opts[0];
  const { a, d } = sel;
  const acts = [];
  for (const id of d.ids) { const x = await activities.get(id); if (x) acts.push(x); }
  const rows = (await courseProgress(a, acts.map(x => x.id))).sort((x, y) => x.s.name.localeCompare(y.s.name));
  const tries = await attempts.listFor(a.id);
  const hiddenOf = sid => tries.filter(t => t.userId === sid).reduce((s, t) => s + (t.hiddenCount || 0), 0);
  // Análisis por pregunta: el mejor intento de cada estudiante en cada actividad.
  const bests = rows.flatMap(({ s }) => acts.map(x => bestAttempt(tries.filter(t => t.userId === s.id && t.activityId === x.id)))).filter(Boolean);
  const qa = missedQuestions(bests, 1);
  const actName = Object.fromEntries(acts.map(x => [x.id, x.title]));
  const finished = rows.filter(r => r.p.status === 'done');
  // Nota sobre 10: actividad suelta = mejor intento; unidad = promedio de puntajes 0-100 / 10.
  const noteOf = p => p.ratio === null ? null : d.isUnit ? p.unitPoints / 10 : p.ratio * 10;
  const avg = finished.length ? finished.reduce((s, r) => s + noteOf(r.p), 0) / finished.length : null;
  const late = rows.filter(r => r.p.lateDone).length;
  const short = t => t.length > 16 ? t.slice(0, 15) + '…' : t;
  // Meta de nota (como el "Target Score" de Cambridge One): colorea el mapa de calor. Preferencia de este navegador.
  let meta = 6; try { meta = Number(localStorage.getItem('plat.meta')) || 6; } catch {}
  const heat = n => n === null || n === undefined ? 'h-none' : n >= meta + 2 ? 'h-top' : n >= meta ? 'h-ok' : n >= meta - 2 ? 'h-low' : 'h-bad';
  const bajo = finished.filter(r => noteOf(r.p) < meta).length;

  root.innerHTML = `<div class="page-head"><div><h1>Resultados</h1></div>
      <details class="info-tip dark"><summary aria-label="Cómo se calcula la nota">i</summary><p>Nota sobre 10 con el mejor intento${d.isUnit ? `. En la unidad cada actividad vale de 0 a 100 (${UNIT_MAX_TRIES} intentos) y la nota es el promedio` : ''}. El tiempo es informativo. Los colores comparan con tu meta.</p></details>
      <button class="btn ghost sm" type="button" id="csv">Exportar CSV</button></div>
    <div class="card">
      <div class="field" style="max-width:620px"><label for="sel">Asignación</label>
        <select id="sel">${opts.map(o => `<option value="${o.a.id}" ${o === sel ? 'selected' : ''}>${o.d.isUnit ? 'Unidad: ' : ''}${esc(o.d.title)} · ${esc(o.course?.name)}${o.a.dueAt ? ' · ' + fmtDate(o.a.dueAt, false) : ''}</option>`).join('')}</select></div>
      <div class="stats" style="margin-bottom:8px">
        <div class="stat flat dato"><span class="dato-ico">${DATO.hecho}</span><div><div class="n">${finished.length}/${rows.length}</div><div class="l">${d.isUnit ? 'Completaron' : 'Terminaron'}</div></div></div>
        <div class="stat flat dato"><span class="dato-ico">${DATO.promedio}</span><div><div class="n">${avg === null ? '—' : avg.toFixed(1)}</div><div class="l">Promedio</div></div></div>
        <div class="stat flat dato"><span class="dato-ico">${DATO.meta}</span><div><div class="n ${bajo ? 'bad-txt' : ''}">${bajo}</div><div class="l">Bajo la meta de <select id="meta" aria-label="Meta de nota">${[5, 6, 7, 8].map(m => `<option ${m === meta ? 'selected' : ''}>${m}</option>`).join('')}</select></div></div></div>
        <div class="stat flat dato"><span class="dato-ico">${DATO.fecha}</span><div><div class="n" style="font-size:16px;padding-top:4px">${a.dueAt ? fmtDate(a.dueAt, false) : 'Sin fecha'}</div><div class="l">Entrega${late ? ` · ${late} tarde` : ''}</div></div></div>
      </div>
      <div class="tabs" role="tablist" aria-label="Ver resultados por">
        <button type="button" role="tab" aria-selected="true" data-tab="st">Por estudiante</button>
        <button type="button" role="tab" aria-selected="false" data-tab="qa">Por pregunta</button>
        ${d.isUnit ? '<button type="button" role="tab" aria-selected="false" data-tab="hab">Por habilidad</button>' : ''}</div>
      <div data-panel="st">
      <div class="table-wrap heat"><table>
        <thead><tr><th>Estudiante</th><th>Estado</th><th>${d.isUnit ? 'Nota unidad' : 'Nota'}</th>${d.isUnit ? '<th>Puntaje</th>' : ''}
          ${d.isUnit ? `<th>Progreso</th>${acts.map((x, i) => `<th class="num" title="${esc(x.title)}">${i + 1}</th>`).join('')}` : '<th>Aciertos</th><th>Intentos</th>'}
          <th>Tiempo</th><th>Última conexión</th></tr></thead>
        <tbody>${rows.map(({ s, p }, ri) => {
          const one = p.items[0];
          const hid = hiddenOf(s.id);
          return `<tr class="clickable" data-row="${ri}">
          <td class="name"><button type="button" class="linklike" aria-expanded="false" data-open="${ri}">${esc(s.name)}</button>${hid ? ` <span class="badge hid" title="Veces que salió de la pestaña durante la actividad">salió ${hid}×</span>` : ''}</td>
          <td><span class="badge ${statusLabel(p).cls}">${statusLabel(p).label}</span></td>
          <td class="nota ${heat(p.ratio === null ? null : noteOf(p))}"><b>${p.ratio === null ? '—' : noteOf(p).toFixed(1)}</b></td>${d.isUnit ? `<td>${p.unitPoints === null ? '—' : p.unitPoints + '/100'}</td>` : ''}
          ${d.isUnit
            ? `<td>${p.done}/${p.total}</td>${p.items.map((i, k) => `<td class="cell ${heat(i.best ? i.points / 10 : null)}" title="${esc(acts[k].title)} · ${i.tries} intento${i.tries === 1 ? '' : 's'}">${i.best ? i.points : i.status === 'doing' ? '…' : '—'}</td>`).join('')}`
            : `<td>${one?.best ? `${one.best.score}/${one.best.maxScore}` : '—'}</td><td>${one?.tries || 0}</td>`}
          <td>${p.time ? fmtDuration(p.time) : '—'}</td>
          <td title="${s.lastSeenAt ? fmtDate(s.lastSeenAt) : ''}">${fmtAgo(s.lastSeenAt)}</td></tr>`;
        }).join('')}
        </tbody></table></div>
      ${rows.length ? '' : '<p class="muted">Este curso aún no tiene estudiantes.</p>'}
      </div>
      <div data-panel="qa" hidden>
        ${qa.length ? `<div class="table-wrap"><table>
          <thead><tr><th>Pregunta</th>${d.isUnit ? '<th>Actividad</th>' : ''}<th>Acertaron</th><th>Respuesta correcta</th><th>Error más común</th><th></th></tr></thead>
          <tbody>${qa.map(m => `<tr><td style="white-space:normal;min-width:220px">${esc(m.q)}</td>${d.isUnit ? `<td>${esc(short(actName[m.actId] || ''))}</td>` : ''}
            <td><div class="row" style="gap:8px;flex-wrap:nowrap"><div class="qa-bar grow"><i style="width:${Math.round((1 - m.rate) * 100)}%"></i></div><span class="small">${m.total - m.wrong}/${m.total}</span></div></td>
            <td>${esc(String(m.expected ?? ''))}</td><td>${m.topWrong ? esc(m.topWrong) : '—'}</td>
            <td>${m.rate >= .4 ? `<a class="btn ghost sm" href="#/t/assign?course=${a.courseId}&act=${m.actId}">Asignar refuerzo</a>` : ''}</td></tr>`).join('')}</tbody></table></div>
          <p class="small muted" style="margin:10px 0 0">Ordenadas de la más fallada a la menos (mejor intento de cada estudiante). Las más falladas son buenas para repasar con "Presentar".</p>`
          : '<p class="muted">Aún no hay respuestas para analizar.</p>'}
      </div>
      ${d.isUnit ? (() => {
        const fases = FASES.filter(f => acts.some(x => faseDe(d.unit, x) === f));
        const prom = (p, f) => { const v = p.items.filter((it, k) => faseDe(d.unit, acts[k]) === f && it.best).map(it => it.points / 10); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
        return `<div data-panel="hab" hidden><div class="table-wrap heat"><table><thead><tr><th>Estudiante</th>${fases.map(f => `<th class="num">${esc(f)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(({ s, p }) => `<tr><td class="name">${esc(s.name)}</td>${fases.map(f => { const v = prom(p, f); return `<td class="cell ${heat(v)}">${v === null ? '—' : v.toFixed(1)}</td>`; }).join('')}</tr>`).join('')}
          <tr class="hab-total"><td class="name"><b>Curso</b></td>${fases.map(f => { const v = rows.map(r => prom(r.p, f)).filter(x => x !== null); const m = v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; return `<td class="cell ${heat(m)}"><b>${m === null ? '—' : m.toFixed(1)}</b></td>`; }).join('')}</tr></tbody></table></div>
          <p class="small muted" style="margin:10px 0 0">Promedio sobre 10 en cada sección de la unidad (mejor intento).</p></div>`;
      })() : ''}
      ${d.isUnit ? `<ol class="heat-legend">${acts.map(x => `<li>${esc(x.title)} <span class="muted">(${templates[x.type].label})</span></li>`).join('')}</ol>` : ''}
    </div>`;

  $('#sel', root).onchange = e => { location.hash = `#/t/results?a=${e.target.value}`; };
  $('#meta', root).onchange = e => { try { localStorage.setItem('plat.meta', e.target.value); } catch {} results(root, { user, query: { a: a.id } }); };
  root.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => {
    root.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
    root.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== b.dataset.tab; });
  }; });
  // Detalle de un estudiante: intentos, salidas de pestaña y respuestas falladas del mejor intento.
  const cols = root.querySelector('[data-panel="st"] thead tr').children.length;
  root.querySelectorAll('[data-panel="st"] tr.clickable').forEach(tr => {
    tr.onclick = () => {
      const btn = tr.querySelector('[data-open]');
      const nxt = tr.nextElementSibling;
      if (nxt?.classList.contains('detail')) { nxt.remove(); btn.setAttribute('aria-expanded', 'false'); return; }
      const { s, p } = rows[+tr.dataset.row];
      const parts = acts.map((x, i) => {
        const it = p.items[i];
        const mine = tries.filter(t => t.userId === s.id && t.activityId === x.id);
        const hid = mine.reduce((n, t) => n + (t.hiddenCount || 0), 0);
        const wrong = (it.best?.answers || []).filter(q => q && q.correct === false);
        return `<div style="margin:6px 0 10px"><b>${d.isUnit ? `${i + 1}. ` : ''}${esc(x.title)}</b>
          <span class="small muted"> · ${it.best ? `mejor: ${points(it.best.score, it.best.maxScore)}/100 (${it.best.score}/${it.best.maxScore})` : 'sin terminar'} · ${it.tries} intento${it.tries === 1 ? '' : 's'}${hid ? ` · salió de la pestaña ${hid} ${hid === 1 ? 'vez' : 'veces'}` : ''}</span>
          ${it.best ? (wrong.length ? `<ul class="ans-list">${wrong.map(q => `<li>${esc(String(q.question ?? ''))} <span class="bad">${q.given !== undefined && q.given !== '' ? esc(String(q.given)) : '(sin respuesta)'}</span> → <b>${esc(String(Array.isArray(q.expected) ? q.expected[0] : q.expected ?? ''))}</b></li>`).join('')}</ul>` : '<div class="small" style="color:var(--success)">Todo correcto.</div>') : ''}</div>`;
      }).join('');
      tr.after(el(`<tr class="detail"><td colspan="${cols}">${parts}</td></tr>`));
      btn.setAttribute('aria-expanded', 'true');
    };
  });
  $('#csv', root).onclick = () => {
    const comma = s => String(s).replace('.', ','); // Excel en español: coma decimal
    const head = ['Estudiante', 'Usuario', 'Curso', d.isUnit ? 'Unidad' : 'Actividad', 'Estado', 'Nota (0-10)',
      ...(d.isUnit ? ['Puntaje (0-100)', 'Actividades terminadas', ...acts.map((x, i) => `${i + 1}. ${x.title} (0-100)`)] : ['Aciertos', 'Puntaje máximo', 'Intentos']),
      'Tiempo total (min:seg)', 'Última conexión'];
    const lines = rows.map(({ s, p }) => {
      const one = p.items[0];
      return [s.name, s.username, sel.course?.name, d.title, statusLabel(p).label, p.ratio === null ? '' : comma(noteOf(p).toFixed(1)),
        ...(d.isUnit ? [p.unitPoints ?? '', `${p.done}/${p.total}`, ...p.items.map(i => i.best ? i.points : '')]
          : [one?.best?.score ?? '', one?.best?.maxScore ?? '', one?.tries || 0]),
        p.time ? fmtDuration(p.time) : '', s.lastSeenAt ? fmtDate(s.lastSeenAt) : 'Nunca'];
    });
    // Un texto que empiece con = + - @ se volvería fórmula en Excel: se antepone un apóstrofo.
    const cell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
    const csv = [head, ...lines].map(l => l.map(cell).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resultados-${d.title.replace(/[^\w\d-]+/g, '_')}-${(sel.course?.name || '').replace(/\s+/g, '_')}.csv`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    toast('CSV descargado');
  };
}
