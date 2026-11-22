// Docente: Unidades = varias actividades de distintos tipos, en orden, que se asignan juntas.
import { activities, units, assignments, courses } from '../storage.js';
import { gradeLabel, UNIT_MAX_TRIES, FASES, faseDe } from '../logic.js';
import { gradeBadge, gradeDialog, refocusGrade } from './teacher.js';
import { esc, el, $, toast, confirmDialog, icons } from '../ui.js';
import { templates, templateList } from '../templates/index.js';
import { templateArt } from '../iconos.js';
import { MCER } from './cursos-admin.js';
import { AYUDA, LIMITE_TEXTO, montarExplicacion, youtube, videoHTML, tieneExplicacion } from '../explicacion.js';
import { generar, asegurarClave } from '../ia.js';

export async function unitsList(root, { user }) {
  const list = await units.list(user.id);
  const grades = await courses.grades();
  root.innerHTML = `<div class="page-head"><div><h1>Unidades</h1></div>
    <a class="btn" href="#/t/units/new">${icons.plus} Crear unidad</a></div>
    <div class="list" id="list"></div>`;
  const box = $('#list', root);
  if (!list.length) {
    box.innerHTML = `<div class="card empty">${icons.unit}<p style="margin:8px 0 16px">Aún no tienes unidades. Una unidad junta, por ejemplo,
      una lectura, un quiz, un emparejar y un dictado del mismo tema.</p><a class="btn" href="#/t/units/new">${icons.plus} Crear la primera unidad</a></div>`;
    return;
  }
  for (const u of list) {
    const acts = (await Promise.all(u.activityIds.map(id => activities.get(id)))).filter(Boolean);
    const asg = await assignments.listForUnit(u.id);
    const row = el(`<div class="item">
      <div class="type-icon unit">${icons.unit}</div>
      <div class="info"><p class="title">${esc(u.title)} ${gradeBadge(u.grade, u.title, u.id)}</p>
        <div class="meta">${acts.length} actividad${acts.length === 1 ? '' : 'es'} · ${asg.length ? `Asignada ${asg.length} ${asg.length === 1 ? 'vez' : 'veces'}` : 'Sin asignar'}${u.description ? ' · ' + esc(u.description) : ''}</div>
        <div class="unit-types">${acts.map(a => `<span class="mini-type art" title="${esc(a.title)} (${templates[a.type].label})">${templateArt(a.type)}</span>`).join('')}</div>
      </div>
      <div class="row">
        <a class="btn sm" href="#/t/assign?unit=${u.id}" ${acts.length ? '' : 'aria-disabled="true" style="pointer-events:none;opacity:.5"'}>Asignar</a>
        <details class="more"><summary class="icon-btn" aria-label="Más acciones para ${esc(u.title)}">⋮</summary>
          <div class="more-menu"><a href="#/t/units/edit/${u.id}">Editar</a>
            ${acts.length ? `<a href="#/t/present/1?unit=${u.id}">Presentar en clase</a>` : ''}
            <button type="button" data-del class="danger-txt">Eliminar</button></div></details>
      </div></div>`);
    row.querySelector('.grade-badge').onclick = async () => {
      const g = await gradeDialog(u.title, u.grade, grades);
      if (g === undefined || g === u.grade) return;
      await units.setGrade(u.id, g);
      toast(`Ahora es de ${gradeLabel(g)}`);
      await unitsList(root, { user });
      refocusGrade(root, u.id);
    };
    row.querySelector('[data-del]').onclick = async () => {
      const extra = asg.length ? ' También se quitarán sus asignaciones y resultados.' : '';
      if (!(await confirmDialog(`¿Eliminar la unidad "${u.title}"? Las actividades no se borran.${extra}`, 'Eliminar', true))) return;
      await units.remove(u.id); toast('Unidad eliminada'); unitsList(root, { user });
    };
    box.append(row);
  }
}

export async function unitEditor(root, { user, params }) {
  let unit = params.id ? await units.get(params.id) : { title: '', description: '', activityIds: [], ownerId: user.id, grade: null, fases: {} };
  if (!unit) { location.hash = '#/t/units'; return; }
  unit.fases ||= {};
  const all = await activities.list(user.id);
  const byId = Object.fromEntries(all.map(a => [a.id, a]));
  const grades = await courses.grades();
  if (!params.id && !unit.grade) { let last = null; try { last = Number(localStorage.getItem('plat.lastGrade')) || null; } catch {} if (grades.includes(last)) unit.grade = last; }
  unit.activityIds = unit.activityIds.filter(id => byId[id]);
  let filter = null, term = '';
  const asgN = params.id ? (await assignments.listForUnit(params.id)).length : 0;
  const original = JSON.stringify(unit.activityIds);

  // Dos columnas: a la izquierda la unidad armada por secciones (se reordena arrastrando); a la derecha el panel
  // para buscar o crear actividades (como el "Switch template" lateral de Wordwall). Guardar queda fijo arriba.
  root.innerHTML = `<form id="form" novalidate>
    <div class="unit-ed-bar">
      <a href="#/t/units" class="back-link">← Unidades</a>
      <span class="grow"></span>
      ${params.id ? '' : '<a class="btn link" href="#/t/units/ayuda">Crear con el asistente de IA</a>'}
      <span class="small muted" id="estado"></span>
      <button class="btn" type="submit">Guardar unidad</button>
    </div>
    <div class="unit-ed">
      <section class="card unit-ed-main">
        <div class="row" style="align-items:flex-start">
          <div class="field grow"><label for="title">Nombre de la unidad</label>
            <input id="title" placeholder="Ej. Unit 3 · Food and drinks" value="${esc(unit.title)}" maxlength="80"></div>
          <div class="field" style="min-width:120px"><label for="ugrade">Grado</label>
            <select id="ugrade"><option value="">Elige…</option>${grades.map(g => `<option value="${g}" ${g === unit.grade ? 'selected' : ''}>${gradeLabel(g)}</option>`).join('')}</select></div>
          <div class="field" style="min-width:120px"><label for="ucefr">Nivel MCER</label>
            <select id="ucefr"><option value="">—</option>${MCER.map(m => `<option ${m === unit.cefr ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label for="desc">Descripción <span class="muted">(opcional)</span></label>
          <input id="desc" placeholder="Ej. Vocabulario de comida, countable/uncountable, some/any" value="${esc(unit.description)}" maxlength="140"></div>
        <details class="ex-editor" id="exEd" ${tieneExplicacion(unit) ? 'open' : ''}>
          <summary>Explicación y video <span class="muted small">(opcional)</span></summary>
          <div class="ex-editor-in">
            <p class="small muted" style="margin:0">Si la agregas, el estudiante la ve antes de las actividades: primero la explicación y, al tocar Siguiente, el video. Si la dejas vacía, la unidad empieza directo.</p>
            <div class="ex-ia"><button class="btn ghost sm" type="button" id="exGen">✨ Generar explicación con IA</button><span class="small muted" id="exEstado" role="status"></span></div>
            <div class="field" style="margin:0"><label for="exTexto">Explicación</label>
              <textarea id="exTexto" maxlength="${LIMITE_TEXTO}" spellcheck="false" placeholder="# How many or how much?&#10;We use **how many** with things we can count.&#10;= How many + plural noun + are there?&#10;ej: How many apples are there? (¿Cuántas manzanas hay?)&#10;! Con cosas que no se cuentan usamos how much.">${esc(unit.explicacion?.texto || '')}</textarea></div>
            <details><summary class="small" style="cursor:pointer">¿Cómo se escribe? (se pone bonito solo)</summary>
              <dl class="ex-ayuda" style="margin-top:8px">${AYUDA.map(([c, d]) => `<dt><code>${esc(c)}</code></dt><dd style="margin:0">${esc(d)}</dd>`).join('')}</dl></details>
            <div class="field" style="margin:0"><label for="exVideo">Video de YouTube</label>
              <input id="exVideo" inputmode="url" placeholder="Pega el link, por ejemplo https://www.youtube.com/watch?v=…" value="${esc(unit.explicacion?.video || '')}">
              <span class="small" id="exVideoMsg"></span></div>
            <div class="ex-vista" id="exVista" hidden><p class="ex-vista-t">Así lo verá el estudiante</p><div id="exVistaTexto"></div><div id="exVistaVideo" style="margin-top:12px"></div></div>
          </div></details>
        <div class="row between"><h2 style="margin:8px 0">Actividades <span class="muted small" id="count"></span></h2>
          <details class="info-tip dark"><summary aria-label="Cómo funciona la unidad">i</summary><p>Recomendado: unas 10 mini actividades que mezclen vocabulario, gramática y habilidades, y una evaluación al final. Cada actividad vale de 0 a 100, el estudiante tiene ${UNIT_MAX_TRIES} intentos y cuenta el mejor. La nota de la unidad es el promedio. Arrastra para cambiar el orden.</p></details></div>
        <ol class="unit-steps" id="chosen"></ol>
        <ul class="errors" id="errs" hidden></ul>
      </section>
      <aside class="card unit-ed-side">
        <h2>Agregar</h2>
        <button class="btn ghost block" type="button" id="newAct">${icons.plus} Crear actividad nueva</button>
        <label class="grade-search" style="margin:12px 0 8px">${icons.search}<input id="poolq" type="search" placeholder="Buscar en mi biblioteca…" aria-label="Buscar actividades"></label>
        <select id="poolt" aria-label="Tipo"></select>
        <div class="pool-list" id="pool"></div>
      </aside>
    </div></form>`;

  const title = $('#title', root), desc = $('#desc', root), errs = $('#errs', root), ugrade = $('#ugrade', root);
  $('#ucefr', root).onchange = e => { unit.cefr = e.target.value; marcar(); };
  ugrade.onchange = () => { unit.grade = Number(ugrade.value) || null; ugrade.classList.remove('invalid'); drawChosen(); drawPool(); };
  const marcar = () => { $('#estado', root).textContent = 'Cambios sin guardar'; };
  [title, desc].forEach(x => x.addEventListener('input', marcar));

  // ---------- Explicación y video (opcional) ----------
  const exTexto = $('#exTexto', root), exVideo = $('#exVideo', root), exMsg = $('#exVideoMsg', root);
  const vista = $('#exVista', root), vistaVideo = $('#exVistaVideo', root);
  let cortarVoz = null, videoPintado = null, pintarT = null;
  const pintarVista = () => {
    unit.explicacion = { texto: exTexto.value, video: exVideo.value.trim() };
    cortarVoz?.();
    cortarVoz = montarExplicacion($('#exVistaTexto', root), exTexto.value);
    const v = youtube(exVideo.value);
    exMsg.textContent = exVideo.value.trim() && !v ? 'Ese link no es de un video de YouTube.' : '';
    exMsg.style.color = 'var(--danger)';
    exVideo.classList.toggle('invalid', !!exMsg.textContent);
    const clave = v ? `${v.id}:${v.inicio}` : null;
    if (clave !== videoPintado) { vistaVideo.innerHTML = v ? videoHTML(exVideo.value) : ''; videoPintado = clave; } // no recargar el video por cada tecla
    vista.hidden = !exTexto.value.trim() && !v;
  };
  [exTexto, exVideo].forEach(x => x.addEventListener('input', () => { marcar(); clearTimeout(pintarT); pintarT = setTimeout(pintarVista, 250); }));
  pintarVista();
  $('#exGen', root).onclick = async e => {
    const b = e.currentTarget, estado = $('#exEstado', root);
    const tema = [title.value.trim(), desc.value.trim()].filter(Boolean).join(' · ');
    if (tema.length < 3) { toast('Primero escribe el nombre o la descripción de la unidad: la IA explica ese tema.'); title.focus(); return; }
    if (exTexto.value.trim() && !(await confirmDialog('Ya hay una explicación escrita. ¿Reemplazarla por una nueva generada con IA?', 'Reemplazar'))) return;
    if (!(await asegurarClave())) return;
    b.disabled = true; estado.textContent = 'Generando…';
    try {
      const r = await generar({ tipo: 'explicacion', tema, grado: unit.grade || 6, gramatica: desc.value.trim() });
      exTexto.value = r.contenido.texto;
      marcar(); pintarVista();
      estado.textContent = 'Listo. Revísala y cámbiala si quieres.';
    } catch (err) {
      estado.textContent = '';
      toast(err.message || 'No se pudo generar. Intenta de nuevo.', 'err');
    } finally { b.disabled = false; }
  };

  let arrastrado = null;
  const drawChosen = () => {
    const box = $('#chosen', root);
    $('#count', root).textContent = unit.activityIds.length ? `· ${unit.activityIds.length}` : '';
    box.innerHTML = unit.activityIds.length ? '' : '<li class="panel empty" style="padding:24px">Todavía no hay actividades. Agrégalas desde el panel de la derecha.</li>';
    let prev = null;
    unit.activityIds.forEach((id, i) => {
      const a = byId[id], tpl = templates[a.type], fase = faseDe(unit, a);
      if (fase !== prev) box.append(el(`<li class="unit-fase" aria-hidden="true">${esc(fase)}</li>`));
      prev = fase;
      const wrong = unit.grade && a.grade && a.grade !== unit.grade;
      const row = el(`<li class="unit-step ${wrong ? 'mal' : ''}" draggable="true" data-i="${i}">
        <span class="drag" aria-hidden="true">⋮⋮</span>
        <span class="step-n">${i + 1}</span>
        <div class="type-icon art">${templateArt(tpl.type)}</div>
        <div class="info grow"><p class="title">${esc(a.title)}</p><div class="meta">${wrong ? `<b style="color:var(--danger)">Es de ${gradeLabel(a.grade)}</b> · ` : ''}${tpl.label} · ${tpl.summary(a.content)}</div></div>
        <select class="fase-sel" aria-label="Sección de ${esc(a.title)}">${FASES.map(f => `<option ${f === fase ? 'selected' : ''}>${f}</option>`).join('')}</select>
        <details class="more"><summary class="icon-btn" aria-label="Más acciones para ${esc(a.title)}">⋮</summary>
          <div class="more-menu">
            ${unit.id ? `<a href="#/t/edit/${a.id}?unit=${unit.id}">Editar contenido</a>` : ''}
            <button type="button" data-up ${i === 0 ? 'disabled' : ''}>Subir</button>
            <button type="button" data-down ${i === unit.activityIds.length - 1 ? 'disabled' : ''}>Bajar</button>
            <button type="button" data-rm class="danger-txt">Quitar de la unidad</button>
          </div></details></li>`);
      const move = d => { const ids = unit.activityIds; [ids[i], ids[i + d]] = [ids[i + d], ids[i]]; marcar(); drawChosen(); };
      row.querySelector('[data-up]').onclick = () => move(-1);
      row.querySelector('[data-down]').onclick = () => move(1);
      row.querySelector('[data-rm]').onclick = () => { unit.activityIds.splice(i, 1); marcar(); drawChosen(); drawPool(); };
      row.querySelector('.fase-sel').onchange = e => { unit.fases[a.id] = e.target.value; marcar(); drawChosen(); };
      // Arrastrar para reordenar (ratón). En táctil o con teclado: menú ⋮ → Subir/Bajar.
      row.addEventListener('dragstart', e => { arrastrado = i; row.classList.add('arrastrando'); e.dataTransfer.effectAllowed = 'move'; });
      row.addEventListener('dragend', () => row.classList.remove('arrastrando'));
      row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('sobre'); });
      row.addEventListener('dragleave', () => row.classList.remove('sobre'));
      row.addEventListener('drop', e => {
        e.preventDefault(); row.classList.remove('sobre');
        if (arrastrado === null || arrastrado === i) return;
        const [x] = unit.activityIds.splice(arrastrado, 1); unit.activityIds.splice(i, 0, x); arrastrado = null; marcar(); drawChosen();
      });
      box.append(row);
    });
  };

  const drawPool = () => {
    const box = $('#pool', root);
    const mine = unit.grade ? all.filter(a => !a.grade || a.grade === unit.grade) : all;
    const types = templateList.filter(t => mine.some(a => a.type === t.type));
    $('#poolt', root).innerHTML = `<option value="">Todos los tipos</option>${types.map(t => `<option value="${t.type}" ${filter === t.type ? 'selected' : ''}>${t.plural}</option>`).join('')}`;
    const free = mine.filter(a => !unit.activityIds.includes(a.id) && (!filter || a.type === filter) && (!term || a.title.toLowerCase().includes(term)));
    box.innerHTML = free.length ? '' : `<p class="muted small">${mine.length ? 'No hay más actividades con ese filtro.' : unit.grade ? `Aún no tienes actividades de ${gradeLabel(unit.grade)}.` : 'Aún no has creado actividades.'}</p>`;
    for (const a of free) {
      const tpl = templates[a.type];
      const row = el(`<button type="button" class="pool-item" aria-label="Agregar ${esc(a.title)}">
        <span class="type-icon art">${templateArt(tpl.type)}</span>
        <span class="grow"><b>${esc(a.title)}</b><span class="small muted">${tpl.label}</span></span><span class="pool-add" aria-hidden="true">+</span></button>`);
      row.onclick = () => { unit.activityIds.push(a.id); marcar(); drawChosen(); drawPool(); };
      box.append(row);
    }
  };
  $('#poolt', root).onchange = e => { filter = e.target.value || null; drawPool(); };
  $('#poolq', root).oninput = e => { term = e.target.value.trim().toLowerCase(); drawPool(); };

  const validate = () => {
    const mismatch = unit.activityIds.filter(id => byId[id].grade && byId[id].grade !== unit.grade).length;
    const list = [...(title.value.trim() ? [] : ['Escribe el nombre de la unidad.']), ...(unit.grade ? [] : ['Elige el grado.']),
      ...(unit.activityIds.length ? [] : ['Agrega al menos una actividad.']),
      ...(exVideo.value.trim() && !youtube(exVideo.value) ? ['El link del video no es de YouTube: corrígelo o bórralo.'] : []), ...(mismatch ? [`Hay ${mismatch} actividad(es) de otro grado: quítalas o cambia su grado.`] : [])];
    ugrade.classList.toggle('invalid', !unit.grade);
    errs.hidden = !list.length; errs.innerHTML = list.map(e => `<li>${esc(e)}</li>`).join('');
    title.classList.toggle('invalid', !title.value.trim());
    return !list.length;
  };
  const save = async () => {
    if (unit.grade) try { localStorage.setItem('plat.lastGrade', unit.grade); } catch {}
    const saved = await units.save({ ...unit, title: title.value.trim(), description: desc.value.trim() });
    unit = { ...unit, id: saved.id };
    $('#estado', root).textContent = 'Guardado';
    return saved;
  };

  $('#form', root).onsubmit = async e => {
    e.preventDefault();
    if (!validate()) return errs.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Aviso solo si cambió la lista de una unidad ya asignada (cambia el progreso y la nota de los estudiantes).
    if (asgN && JSON.stringify(unit.activityIds) !== original
      && !(await confirmDialog(`Esta unidad está asignada ${asgN === 1 ? 'a 1 curso' : `${asgN} veces`}. Si agregas o quitas actividades, cambian el progreso y la nota de la unidad de los estudiantes.`, 'Guardar'))) return;
    await save();
    toast(params.id ? 'Unidad guardada' : 'Unidad creada');
    location.hash = '#/t/units';
  };
  $('#newAct', root).onclick = async () => {
    if (!title.value.trim()) { title.classList.add('invalid'); title.focus(); toast('Primero escribe el nombre de la unidad.'); return; }
    const saved = await save();
    location.hash = `#/t/create?unit=${saved.id}`;
  };

  drawChosen(); drawPool();
  return () => cortarVoz?.();
}
