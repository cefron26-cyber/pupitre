// Vistas del estudiante: Misiones, ruta de la unidad, hacer actividad, resultado.
import { assignments, activities, units, attempts, xp, events, users, chests, userRewards } from '../storage.js';
import { BACKGROUNDS, ROPA, SLOTS, RARITY, DEFAULT_PREFS, backgroundSwatch, rewardPreview, rollReward, odds, ownedSet, byId } from '../rewards.js';
import { cebolloMini } from '../cebollo.js';
import { openChest } from '../chest.js';
import { esc, el, fmtDate, fmtDue, fmtDuration, grade, pct, icons, $, toast } from '../ui.js';
import { templates } from '../templates/index.js';
import { templateArt } from '../iconos.js';
import { mountPlayer } from '../player.js';
import { progressOf, activityIdsOf, xpFor, STATUS, UNIT_BONUS_XP, statusLabel, UNIT_MAX_TRIES, points, starsOf, contentHash, reviewQuestions, REVIEW_XP, RETOS, faseDe, rangoDe, siguienteRango } from '../logic.js';

// Estrellas 0-3 según el puntaje 0-100 (solo motivación).
const starsHTML = p => { const n = starsOf(p); return `<span class="stars" aria-label="${n} de 3 estrellas">${[0, 1, 2].map(i => `<span class="${i < n ? '' : 'off'}">★</span>`).join('')}</span>`; };

export const xpTotal = userId => xp.total(userId);

// ---------- Nivel, cofre diario y colección ----------
// Cada nivel cuesta más que el anterior: 100, 150, 225, 340… (tope de 500 XP por nivel).
export const levelCost = n => Math.min(500, Math.round(100 * 1.5 ** (n - 1) / 5) * 5);
export function levelOf(total) {
  let level = 1, rest = total;
  while (rest >= levelCost(level)) { rest -= levelCost(level); level++; }
  return { level, inLevel: rest, need: levelCost(level) };
}
export const prefsOf = user => ({ ...DEFAULT_PREFS, ...(user.prefs || {}) });
// Guardar lo elegido: la ropa va en su ranura; un fondo, directo.
export const equipar = (user, r) => users.setPrefs(user.id, r.kind === 'ropa'
  ? { ropa: { ...prefsOf(user).ropa, [r.slot]: r.id } } : { [r.kind]: r.id });

// Racha diaria (como Duolingo): días seguidos con al menos una actividad terminada. Si hoy aún no jugó,
// la racha de ayer sigue viva (se pierde solo si pasa un día entero sin jugar). Meta diaria: 1 actividad.
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export async function streakOf(userId) {
  const days = new Set(await attempts.activeDays(userId));
  const d = new Date(), today = dayKey(d);
  const hoy = days.has(today);
  if (!hoy) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return { dias: n, hoy };
}
export const streakHTML = ({ dias, hoy }) => `<span class="streak-chip ${hoy ? 'on' : ''}" title="${hoy ? 'Meta de hoy cumplida' : 'Termina una actividad hoy para mantener tu racha'}">
  <span aria-hidden="true">🔥</span><b>${dias}</b> ${dias === 1 ? 'día' : 'días'}<span class="streak-meta">${hoy ? '· meta de hoy ✓' : '· juega hoy'}</span></span>`;
const modoOf = () => document.documentElement.dataset.modo || 'serio';

// Estado del cofre de hoy: 'locked' (aún no termina una actividad), 'ready' o 'opened'.
export async function chestState(userId) {
  const opened = await chests.openedToday(userId);
  if (opened) return { state: 'opened', opened };
  return { state: (await chests.earnedToday(userId)) ? 'ready' : 'locked' };
}

// Sortea, guarda y anima el cofre. Devuelve true si se abrió.
export async function openDailyChest(user) {
  const { state } = await chestState(user.id);
  if (state !== 'ready') return false;
  const owned = (await userRewards.list(user.id)).map(r => r.rewardId);
  const result = rollReward(owned);
  // Se guarda ANTES de animar: si cierran la pestaña a mitad, el premio no se pierde ni se repite el sorteo.
  await chests.open(user.id, { rewardId: result.reward.id, duplicate: result.duplicate, xp: result.xp });
  if (result.duplicate) await xp.add(user.id, result.xp, `chest:${result.reward.id}`);
  else await userRewards.add(user.id, result.reward.id);
  events.log(user.id, 'open_chest', { rewardId: result.reward.id, duplicate: result.duplicate });
  const choice = await openChest({ modo: modoOf(), result });
  if (choice === 'equip') await equipar(await users.get(user.id), result.reward);
  dispatchEvent(new Event('plat-refresh'));
  return true;
}

async function drawHero(box, user) {
  const total = await xp.total(user.id);
  const { level, inLevel, need } = levelOf(total);
  const { state, opened } = await chestState(user.id);
  const racha = await streakOf(user.id);
  const prefs = prefsOf(user);
  const first = esc(user.name.split(' ')[0]);
  const reward = opened && byId(opened.rewardId);
  const rango = rangoDe(level), sig = siguienteRango(level);
  const chestText = {
    locked: ['Cofre del día', 'Completa una misión o un repaso hoy para ganarlo.'],
    ready: ['¡Tu cofre está listo!', 'Ábrelo para ganar ropa para Cebollo o un fondo.'],
    opened: ['Cofre abierto', reward ? `Hoy te salió: <b>${esc(reward.name)}</b>${opened.duplicate ? ` (+${opened.xp} XP)` : ''}. Vuelve mañana.` : 'Vuelve mañana.'],
  }[state];
  box.innerHTML = `<div class="hero-me">
      <a class="hero-avatar" href="#/s/cuarto" aria-label="Visitar a Cebollo">${cebolloMini(prefs.ropa, 72, { vivo: true, triste: !racha.hoy })}</a>
      <div class="hero-txt">
        <h1 class="hero-hi">¡Hola, ${first}!</h1>
        ${streakHTML(racha)}
        <a class="rango-chip" href="#/s/ranking" style="--rc:${rango.color}" title="${sig ? `Siguiente rango: ${sig.name} (nivel ${sig.desde})` : 'Rango máximo'}"><span aria-hidden="true">${rango.icon}</span>Rango <b>${rango.name}</b>${sig ? `<span class="rango-next">→ ${sig.name} en nivel ${sig.desde}</span>` : ''}</a>
        <div class="level-row"><span class="level-badge">Nivel ${level}</span>
          <div class="level-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${need}" aria-valuenow="${inLevel}" aria-label="Experiencia del nivel"><i style="width:${Math.round(inLevel / need * 100)}%"></i></div>
          <span class="small">${inLevel}/${need} XP</span></div>
      </div>
    </div>
    <div class="chest-card ${state}">
      <div class="chest-mini" aria-hidden="true"><img src="img/cofre/cerrado-mini.png" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'chest-ico',innerHTML:this.dataset.ico}))" data-ico='${icons.chest}'></div>
      <div class="chest-txt"><b>${chestText[0]}</b><span class="small">${chestText[1]}</span></div>
      ${state === 'ready' ? '<button class="btn chest-open" id="open-chest">Abrir cofre</button>'
        : `<a class="btn ghost sm" href="#/s/collection">${state === 'opened' ? 'Mi colección' : 'Qué puede salir'}</a>`}
    </div>`;
  const b = $('#open-chest', box);
  if (b) b.onclick = () => { b.disabled = true; openDailyChest(user); };
}

export async function collection(root, { user }) {
  const owned = ownedSet((await userRewards.list(user.id)).map(r => r.rewardId));
  const prefs = prefsOf(user);
  const { state } = await chestState(user.id);
  const tile = (r, kind) => {
    const has = owned.has(r.id), using = kind === 'ropa' ? prefs.ropa?.[r.slot] === r.id : prefs[kind] === r.id;
    return `<li class="reward-tile ${has ? 'has' : 'locked'} rr-${r.rarity}" style="--rc:${RARITY[r.rarity].color}">
      <div class="rt-prev">${kind === 'ropa' ? rewardPreview({ ...r, kind }, 64) : backgroundSwatch(r.id)}${has ? '' : `<span class="rt-lock">${icons.lock}</span>`}</div>
      <b class="rt-name">${esc(r.name)}</b>
      <span class="rt-rarity">${RARITY[r.rarity].label}</span>
      ${has ? (using ? '<span class="rt-using">En uso</span>' : `<button class="btn sm ghost" data-kind="${kind}" data-id="${r.id}">Usar</button>`)
        : `<span class="small muted">${r.free ? '' : r.source === 'reto' ? `Supera el reto ${esc(RETOS.find(x => x.reward === r.id)?.name || '')}` : 'Sale del cofre'}</span>`}
    </li>`;
  };
  const count = list => list.filter(r => owned.has(r.id)).length;
  const tot = ROPA.length + BACKGROUNDS.length, mine = count(ROPA) + count(BACKGROUNDS);
  root.innerHTML = `<div class="page-head"><div><h1>Mi colección</h1>
      <div class="coll-prog"><div class="progress"><i style="width:${Math.round(mine / tot * 100)}%"></i></div><b>${mine}/${tot}</b></div></div>
      <details class="info-tip dark"><summary aria-label="Qué puede salir del cofre">i</summary><p>Premios del cofre diario: ${odds()}. Si te sale uno repetido, ganas XP. Algunos solo se ganan en los <a href="#/s/retos">Retos</a>.</p></details>
      ${state === 'ready' ? '<button class="btn chest-open" id="open-chest">Abrir cofre</button>' : ''}</div>
    <div class="card"><h2>Ropa de Cebollo <span class="small muted">${count(ROPA)}/${ROPA.length}</span></h2>
      <p class="small muted" style="margin-top:-6px">Vístelo en el armario de <a href="#/s/cuarto">su cuarto</a>.</p>
      ${Object.entries(SLOTS).map(([k, t]) => `<h3 class="coll-sub">${t}</h3><ul class="reward-grid">${ROPA.filter(r => r.slot === k).map(r => tile(r, 'ropa')).join('')}</ul>`).join('')}</div>
    <div class="card"><h2>Fondos <span class="small muted">${count(BACKGROUNDS)}/${BACKGROUNDS.length}</span></h2>
      <p class="small muted" style="margin-top:-6px">Los fondos se ven en el modo juego.</p>
      <ul class="reward-grid">${BACKGROUNDS.map(r => tile(r, 'fondo')).join('')}</ul></div>`;
  root.querySelectorAll('[data-kind]').forEach(b => {
    b.onclick = async () => { await equipar(user, { ...byId(b.dataset.id), kind: b.dataset.kind }); dispatchEvent(new Event('plat-refresh')); };
  });
  const o = $('#open-chest', root);
  if (o) o.onclick = () => { o.disabled = true; openDailyChest(user); };
}

// Asignación + su contenido + el progreso de este estudiante.
async function load(a, userId) {
  const unit = a.unitId ? await units.get(a.unitId) : null;
  if (a.unitId && !unit) return null;
  const acts = [];
  for (const id of activityIdsOf(a, unit)) { const x = await activities.get(id); if (x) acts.push(x); }
  if (!acts.length) return null;
  const mine = await attempts.listFor(a.id, userId);
  return { a, unit, acts, p: progressOf(a, acts.map(x => x.id), mine) };
}

export async function tasks(root, { user }) {
  const rows = [];
  for (const a of await assignments.listForCourses(user.courseIds)) {
    const r = await load(a, user.id);
    if (r) rows.push(r);
  }
  // Primero las atrasadas (para que no se queden olvidadas), luego en curso, pendientes y al final las terminadas.
  const order = { late: 0, doing: 1, todo: 2, done: 3 };
  rows.sort((x, y) => order[x.p.status] - order[y.p.status] || (x.a.dueAt || '9').localeCompare(y.a.dueAt || '9'));
  const open = rows.filter(r => r.p.status !== 'done'), closed = rows.filter(r => r.p.status === 'done');
  const review = reviewQuestions(await attempts.doneByUser(user.id));

  // Grupos como Cambridge One ("To do" / "Completed"), separando lo atrasado y lo de esta semana.
  const week = Date.now() + 7 * 864e5;
  const grupo = r => r.p.status === 'late' ? 'late' : r.a.dueAt && new Date(r.a.dueAt).getTime() <= week ? 'week' : 'later';
  const rest = open.slice(1);
  const GRUPOS = [['late', 'Misiones atrasadas'], ['week', 'Misiones de esta semana'], ['later', 'Más adelante']];
  // Recompensa de cada misión: XP de la primera vez (máximo) + el bono de unidad.
  const premio = (acts, unit) => `<span class="mision-xp" title="XP máxima que puedes ganar">+${acts.length * 30 + (unit ? UNIT_BONUS_XP : 0)} XP</span>`;
  root.innerHTML = `<section class="hero" id="hero"></section>
    <div class="page-head"><div><h1>Misiones</h1>
    <p class="muted">${open.length ? `${open.length} ${open.length === 1 ? 'misión activa' : 'misiones activas'}` : rows.length ? '¡Completaste todas tus misiones!' : ''}</p></div></div>
    <div id="next"></div>
    ${review.length ? `<a class="practice-card" href="#/s/practice"><div class="type-icon">${icons.quiz}</div>
      <div class="grow"><b>Misión extra: repasa lo que fallaste</b><div class="small muted">No cuenta como nota · +${REVIEW_XP} XP por acierto</div></div>
      <span class="practice-n" aria-label="${review.length} preguntas">${review.length}</span></a>` : ''}
    ${GRUPOS.map(([k, t]) => rest.some(r => grupo(r) === k) ? `<h2 class="task-group ${k}">${t} <span>${rest.filter(r => grupo(r) === k).length}</span></h2><div class="list" id="g-${k}"></div>` : '').join('')}
    ${closed.length ? `<details class="done-group"><summary>Misiones completadas · ${closed.length}</summary><div class="list" id="done"></div></details>` : ''}`;
  await drawHero($('#hero', root), user);
  if (!rows.length) { $('#next', root).innerHTML = `<div class="card empty">Aún no tienes misiones.${review.length ? ' Mientras tanto, puedes repasar.' : ''} <a href="#/s/collection">Mira tu colección</a></div>`; return; }

  // Tarjeta "Próxima misión": la más urgente, a un toque.
  if (open.length) {
    const { a, unit, acts, p } = open[0];
    const k = unit ? p.items.findIndex(i => !i.best) : 0;
    const act = acts[Math.max(0, k)];
    const due = fmtDue(a.dueAt);
    const busy = unit ? p.items[k]?.status === 'doing' : p.status === 'doing';
    $('#next', root).append(el(`<div class="next-card">
      <div class="next-masc" aria-hidden="true">${cebolloMini(prefsOf(user).ropa, 64)}</div>
      <div class="grow"><p class="kicker">Próxima misión ${premio(acts, unit)}</p>
        <h2>${esc(unit ? unit.title : act.title)}</h2>
        <div class="small">${unit ? `Actividad ${k + 1} de ${acts.length}: ${esc(act.title)} · ` : `${templates[act.type].label} · `}<span class="${due.cls}">${due.text}</span></div>
        ${unit ? `<div class="mini-progress" aria-label="${p.done} de ${p.total} actividades"><i style="width:${p.total ? p.done / p.total * 100 : 0}%"></i></div>` : ''}</div>
      <a class="btn" href="${unit ? `#/s/play/${a.id}/${act.id}` : `#/s/play/${a.id}`}">${busy || (unit && p.done) ? 'Continuar' : 'Empezar'}</a></div>`));
  }

  const doneBox = $('#done', root);
  for (const row of rows) {
    // La misión de "Próxima misión" no se repite en la lista.
    if (row === open[0]) continue;
    const { a, unit, acts, p } = row;
    const s = statusLabel(p);
    const box = p.status === 'done' ? doneBox : $(`#g-${grupo(row)}`, root);
    const dd = fmtDue(a.dueAt);
    const due = p.status === 'done' ? (a.dueAt ? `Entrega: ${fmtDate(a.dueAt, false)}` : 'Sin fecha límite') : `<span class="${dd.cls}">${dd.text}</span>`;
    if (unit) {
      box.append(el(`<div class="item unit-item">
        <div class="type-icon unit">${icons.unit}</div>
        <div class="info">
          <p class="title">${esc(unit.title)}</p>
          <div class="meta">Misión de unidad · ${acts.length} actividades · ${due} ${p.status === 'done' ? '' : premio(acts, unit)}</div>
          <div class="mini-progress" aria-label="${p.done} de ${p.total} actividades"><i style="width:${p.total ? p.done / p.total * 100 : 0}%"></i></div>
        </div>
        <span class="badge ${s.cls}">${p.status === 'done' ? `${s.label} · ${p.unitPoints}/100` : p.status === 'late' ? `${s.label} · ${p.done}/${p.total}` : `${p.done}/${p.total}`}</span>
        <a class="btn ${p.status === 'done' ? 'ghost' : ''}" href="#/s/unit/${a.id}">${p.status === 'done' ? 'Ver unidad' : p.done || p.status === 'doing' ? 'Continuar' : 'Empezar'}</a>
      </div>`));
      continue;
    }
    const act = acts[0], tpl = templates[act.type], it = p.items[0];
    const btn = p.status === 'done' ? 'Ver resultado' : p.status === 'doing' ? 'Continuar' : 'Empezar';
    const href = p.status === 'done' ? `#/s/result/${it.best.id}` : `#/s/play/${a.id}`;
    box.append(el(`<div class="item">
      <div class="type-icon art">${templateArt(tpl.type)}</div>
      <div class="info">
        <p class="title">${esc(act.title)}</p>
        <div class="meta">${tpl.label} · ${tpl.summary(act.content)} · ${due} ${p.status === 'done' ? '' : premio(acts, null)}</div>
      </div>
      <span class="badge ${s.cls}">${s.label}${it.best ? ` · ${grade(it.best.score, it.best.maxScore)}` : ''}</span>
      <a class="btn ${p.status === 'done' ? 'ghost' : ''}" href="${href}">${btn}</a>
    </div>`));
  }
}

// Ruta de la unidad: actividades en orden, con su estado. El estudiante puede hacerlas en cualquier orden.
export async function unit(root, { user, params }) {
  const a = await assignments.get(params.id);
  const r = a && a.unitId && user.courseIds.includes(a.courseId) ? await load(a, user.id) : null;
  if (!r) { root.innerHTML = '<div class="card empty">Esta unidad ya no está disponible. <a href="#/s/tasks">Volver a misiones</a></div>'; return; }
  const { unit: u, acts, p } = r;
  const nextIdx = p.items.findIndex(i => !i.best);

  const reglas = `Cada actividad vale de 0 a 100 y tienes ${UNIT_MAX_TRIES} intentos (cuenta el mejor). La nota de la unidad es el promedio. Al completarla ganas +${UNIT_BONUS_XP} XP.`;
  const cur = nextIdx >= 0 ? nextIdx : -1;
  root.innerHTML = `<div class="unit-page">
    <a href="#/s/tasks" class="back-link">← Misiones</a>
    <header class="unit-banner">
      <div class="grow"><p class="kicker">Unidad${a.dueAt ? ` · <span class="${fmtDue(a.dueAt).cls}">${fmtDue(a.dueAt).text}</span>` : ''}</p>
        <h1>${esc(u.title)}</h1>
        ${u.description ? `<p class="unit-desc">${esc(u.description)}</p>` : ''}
        <div class="unit-prog"><div class="progress grow"><i style="width:${p.total ? p.done / p.total * 100 : 0}%"></i></div><b>${p.done}/${p.total}</b></div></div>
      <details class="info-tip"><summary aria-label="Cómo se calcula la nota">i</summary><p>${reglas}</p></details>
    </header>
    ${p.status === 'done' ? `<div class="unit-done">¡Unidad completada${p.lateDone ? ' (entregada tarde)' : ''}! Nota <b>${(p.unitPoints / 10).toFixed(1)}</b> · ${p.unitPoints}/100</div>`
      : p.status === 'late' ? '<div class="unit-late">Está atrasada: puedes hacerla, pero quedará como entregada tarde.</div>' : ''}
    ${cur >= 0 ? `<a class="btn unit-go" href="#/s/play/${a.id}/${acts[cur].id}">${p.done || p.items[cur].status === 'doing' ? 'Continuar' : 'Empezar'}: ${esc(acts[cur].title)}</a>` : ''}
    <ol class="path2" id="path"></ol></div>`;
  const path = $('#path', root);
  let fasePrev = null;
  acts.forEach((act, i) => {
    const it = p.items[i], tpl = templates[act.type];
    // Secciones de la unidad (Vocabulario, Gramática…) como separadores del camino.
    const fase = faseDe(u, act);
    if (fase !== fasePrev) path.append(el(`<li class="path-fase"><span>${esc(fase)}</span></li>`));
    fasePrev = fase;
    const href = it.best ? `#/s/result/${it.best.id}` : `#/s/play/${a.id}/${act.id}`;
    const estado = it.best ? 'done' : i === cur ? 'next' : 'todo';
    path.append(el(`<li class="node ${estado}" style="--off:${[0, 1, 0, -1][i % 4]}">
      <a class="node-btn" href="${href}" aria-label="${i + 1}. ${esc(act.title)} · ${tpl.label}${it.best ? ` · ${it.points} de 100` : ''}">
        <span class="node-ico">${it.best ? '✓' : templateArt(tpl.type)}</span></a>
      <div class="node-txt"><b>${esc(act.title)}</b><span>${tpl.label}${it.best ? ` · ${it.points}/100` : it.status === 'doing' ? ' · en curso' : ''}</span>
        ${it.best ? starsHTML(it.points) : ''}</div>
    </li>`));
  });
}

export async function play(root, { user, params, query }) {
  const a = await assignments.get(params.id);
  const r = a && user.courseIds.includes(a.courseId) ? await load(a, user.id) : null;
  if (!r) {
    root.innerHTML = '<div class="card empty">Esta actividad ya no está disponible. <a href="#/s/tasks">Volver a misiones</a></div>';
    return;
  }
  if (r.unit && !params.act) { location.hash = `#/s/unit/${a.id}`; return; }
  const act = r.unit ? r.acts.find(x => x.id === params.act) : r.acts[0];
  if (!act) { location.hash = r.unit ? `#/s/unit/${a.id}` : '#/s/tasks'; return; }
  const back = r.unit ? `#/s/unit/${a.id}` : '#/s/tasks';

  let attempt = await attempts.current(a.id, user.id, act.id);
  const item = r.p.items.find(i => i.id === act.id);
  // En una unidad hay ${UNIT_MAX_TRIES} intentos por actividad; con 100 ya no hace falta otro.
  // Actividad suelta: los intentos que puso el docente (sin límite si no puso).
  const maxT = r.unit ? UNIT_MAX_TRIES : (a.maxTries || Infinity);
  const noMore = item.best && (item.tries >= maxT || (r.unit && item.points === 100));
  if (attempt?.state === 'done' && (!query.retry || noMore)) { location.hash = `#/s/result/${item.best?.id || attempt.id}`; return; }
  // Si el docente cambió el contenido después de que empezó, el avance guardado ya no sirve: empezar de cero.
  const ver = contentHash(act.content);
  let changed = false;
  if (attempt?.state === 'inprogress' && attempt.progress && attempt.contentVersion && attempt.contentVersion !== ver) changed = true;
  if (!attempt || attempt.state === 'done' || changed) attempt = await attempts.start(a.id, user.id, act.id, ver);
  // Cuenta regresiva con hora fija de fin: cambiar de pestaña o cerrar la página no detiene el reloj.
  if (a.timer?.mode === 'down' && !attempt.deadlineAt) {
    const deadlineAt = Date.now() + Math.max(0, a.timer.minutes * 60 - (attempt.clockSec || 0)) * 1000;
    attempt = await attempts.setMeta(attempt.id, { deadlineAt });
  }
  const resuming = !!attempt.progress;
  events.log(user.id, 'start_activity', { assignmentId: a.id, activityId: act.id, resume: resuming });

  const tpl = templates[act.type];
  const pos = r.unit ? r.acts.indexOf(act) + 1 : 0;
  // Pantalla completa: solo la actividad. Los avisos importantes salen una vez arriba y se pueden cerrar.
  const avisos = [
    a.dueAt && new Date(a.dueAt) < new Date() && !item.best ? `Esta misión está atrasada (era para el ${fmtDate(a.dueAt)}). Quedará como entregada tarde.` : '',
    changed ? 'Tu docente cambió esta actividad, así que empieza de nuevo.' : '',
    a.timer?.mode === 'down' && !resuming ? `Tienes ${a.timer.minutes} min. El reloj sigue aunque salgas.` : '',
  ].filter(Boolean);
  root.innerHTML = `<h1 class="sr-only">${esc(act.title)}${r.unit ? ` · ${esc(r.unit.title)}, actividad ${pos} de ${r.acts.length}` : ''}</h1>
    ${avisos.length ? `<div class="juego-aviso" role="status"><span>${avisos.map(esc).join(' ')}</span><button type="button" class="icon-btn" aria-label="Cerrar aviso">×</button></div>` : ''}
    <div id="stage"></div>`;
  root.querySelector('.juego-aviso button')?.addEventListener('click', e => e.currentTarget.parentElement.remove());

  const doneBefore = r.p.items.find(i => i.id === act.id).best !== null;
  const unitDoneBefore = r.p.status === 'done';
  const player = mountPlayer($('#stage', root), {
    activity: act,
    saved: attempt.progress,
    durationSec: attempt.durationSec,
    onProgress: (state, sec) => attempts.saveProgress(attempt.id, state, sec),
    hideAnswers: a.showAnswers === false,
    salir: { href: back },
    tramo: r.unit ? { index: r.acts.indexOf(act), total: r.acts.length } : null,
    portada: !r.unit,
    // En modo serio/evaluación se ve el título y el intento (estilo examen); en modo juego, solo la actividad.
    encabezado: { titulo: act.title, detalle: [r.unit ? `${r.unit.title} · ${pos} de ${r.acts.length}` : templates[act.type].label, a.showAnswers === false ? 'Evaluación' : '', maxT !== Infinity ? `Intento ${item.tries + 1} de ${maxT}` : ''].filter(Boolean).join(' · ') },
    // El reloj lo decide el docente al asignar; el estudiante no lo puede quitar.
    clock: {
      mode: a.timer?.mode === 'down' ? 'down' : a.timer?.mode === 'up' ? 'up' : 'none',
      limitSec: (a.timer?.minutes || 0) * 60, deadlineAt: attempt.deadlineAt || null,
      hiddenCount: attempt.hiddenCount || 0, onHidden: n => attempts.setMeta(attempt.id, { hiddenCount: n }),
    },
    async onFinish(res) {
      const before = await xp.total(user.id);
      const done = await attempts.finish(attempt.id, res);
      const prev = item.best && item.best.maxScore ? item.best.score / item.best.maxScore : 0;
      let gained = xpFor(res, !doneBefore, prev);
      if (gained) await xp.add(user.id, gained, `attempt:${attempt.id}`);
      let unitDone = false;
      if (r.unit && !unitDoneBefore) {
        const after = progressOf(a, r.acts.map(x => x.id), await attempts.listFor(a.id, user.id));
        if (after.status === 'done') { unitDone = true; gained += UNIT_BONUS_XP; await xp.add(user.id, UNIT_BONUS_XP, `unit:${a.id}`); }
      }
      events.log(user.id, 'finish_activity', { assignmentId: a.id, activityId: act.id, score: res.score, maxScore: res.maxScore });
      const levelUp = levelOf(before + gained).level > levelOf(before).level ? levelOf(before + gained).level : null;
      sessionStorage.setItem('plat.xpGained', JSON.stringify({ attemptId: done.id, gained, unitDone, levelUp }));
      navT = setTimeout(() => { location.hash = `#/s/result/${done.id}`; }, 400);
    },
  });
  let navT = null;
  // Si sale antes de los 400 ms, no se le lleva al resultado.
  return () => { clearTimeout(navT); player.stop(); };
}

export async function result(root, { user, params }) {
  const t = await attempts.get(params.id);
  const a = t && await assignments.get(t.assignmentId);
  if (!t || t.userId !== user.id || t.state !== 'done' || !a) { location.hash = '#/s/tasks'; return; }
  const act = await activities.get(t.activityId);
  const r = await load(a, user.id);
  if (!act || !r) { location.hash = '#/s/tasks'; return; }
  const it = r.p.items.find(i => i.id === act.id);
  let gained = null, unitDone = false, levelUp = null;
  try {
    const g = JSON.parse(sessionStorage.getItem('plat.xpGained'));
    if (g?.attemptId === t.id) { gained = g.gained; unitDone = g.unitDone; levelUp = g.levelUp || null; sessionStorage.removeItem('plat.xpGained'); }
  } catch {}

  const chestReady = (await chestState(user.id)).state === 'ready';
  const p = pct(t.score, t.maxScore);
  const msg = a.showAnswers === false ? '¡Entregada!' : p === 100 ? '¡Perfecto!' : p >= 80 ? '¡Muy bien!' : p >= 60 ? '¡Buen trabajo!' : '¡Buen intento!';
  const maxT = r.unit ? UNIT_MAX_TRIES : a.maxTries || null;
  const left = maxT ? Math.max(0, maxT - it.tries) : null;
  const canRetry = r.unit ? left > 0 && it.points < 100 : left === null || left > 0;
  const hide = a.showAnswers === false;
  // Revisión de respuestas (como "Review test" de Cambridge): todas, con ✓/✗ y la correcta cuando falló.
  const answers = (t.answers || []).filter(x => x && x.question !== undefined);
  const wrong = answers.filter(x => x.correct === false);
  const exp = x => esc(String(Array.isArray(x.expected) ? x.expected[0] : x.expected ?? ''));
  const review = hide || !answers.length ? '' : `<details class="review-box" ${wrong.length ? 'open' : ''}><summary>Revisar respuestas · ${answers.length - wrong.length} de ${answers.length} bien</summary>
    <ol>${answers.map(x => `<li class="${x.correct ? 'ok' : 'bad'}"><span class="rv-mark" aria-label="${x.correct ? 'Correcta' : 'Incorrecta'}">${x.correct ? '✓' : '✗'}</span>
      <span class="rv-q">${esc(String(x.question))}</span>
      <span class="rv-a">${x.correct ? esc(String(x.given ?? '')) : `${x.given !== undefined && x.given !== '' ? `<s>${esc(String(x.given))}</s> ` : ''}→ <b>${exp(x)}</b>`}</span></li>`).join('')}</ol></details>`;
  const back = r.unit ? `#/s/unit/${a.id}` : '#/s/tasks';
  const nextAct = r.unit ? r.acts.find((x, i) => !r.p.items[i].best) : null;
  const retry = r.unit ? `#/s/play/${a.id}/${act.id}?retry=1` : `#/s/play/${a.id}?retry=1`;
  const racha = await streakOf(user.id);
  const continuar = nextAct ? { href: `#/s/play/${a.id}/${nextAct.id}`, label: 'Continuar' } : { href: back, label: 'Continuar' };
  root.innerHTML = `<div class="player"><div class="card result">
    <p class="platform" style="margin:0">${r.unit ? esc(r.unit.title) + ' · ' : ''}${esc(act.title)}</p>
    <h1>${msg}</h1>
    ${r.unit
      ? `<div class="score-ring" style="--p:${p}"><b>${points(t.score, t.maxScore)}</b><span>de 100</span></div>
    <p style="margin:6px 0 0">${starsHTML(points(t.score, t.maxScore))}</p>`
      : `<div class="score-ring" style="--p:${p}"><b>${grade(t.score, t.maxScore)}</b><span>de 10</span></div>`}
    <div class="result-stats">
      <div><b>${t.score}/${t.maxScore}</b><span>Aciertos</span></div>
      ${gained ? `<div class="rs-xp"><b>+<span id="xp-count">0</span></b><span>XP</span></div>` : ''}
      <div class="rs-racha"><b>🔥 ${racha.dias}</b><span>${racha.dias === 1 ? 'día' : 'días'} de racha</span></div>
      <div><b>${fmtDuration(t.durationSec)}</b><span>Tiempo</span></div>
    </div>
    ${levelUp ? `<div class="level-up" role="status">¡Subiste al nivel ${levelUp}!${rangoDe(levelUp).desde === levelUp ? ` <b>¡Nuevo rango: ${rangoDe(levelUp).icon} ${rangoDe(levelUp).name}!</b>` : ''}${RETOS.some(x => x.level === levelUp) ? ` Se abrió el reto <a href="#/s/retos">${esc(RETOS.find(x => x.level === levelUp).name)}</a>.` : ''}</div>` : ''}
    ${unitDone ? `<div class="feedback ok" style="justify-content:center;text-align:center">${icons.unit}<span>¡Completaste la unidad! Nota <b>${(r.p.unitPoints / 10).toFixed(1)}</b> · ${r.p.unitPoints}/100 · +${UNIT_BONUS_XP} XP de bono</span></div>` : ''}
    ${hide ? '<p class="small muted">Tu docente revisará tus respuestas.</p>' : review}
    <a class="btn result-go" href="${continuar.href}">${continuar.label}${nextAct ? `: ${esc(nextAct.title)}` : ''}</a>
    <div class="result-more">
      ${canRetry ? `<a href="${retry}">${left !== null ? `Intentar de nuevo (quedan ${left})` : 'Intentar de nuevo'}</a>` : ''}
      ${wrong.length && !hide ? '<a href="#/s/practice">Repasar lo que fallé</a>' : ''}
      ${nextAct ? `<a href="${back}">Ver la unidad</a>` : ''}
    </div>
    <p class="small muted result-note">${r.unit ? (it.points === 100 ? 'Tienes el máximo en esta actividad.' : `Cuenta tu mejor puntaje (${it.points}/100) · intento ${it.tries} de ${UNIT_MAX_TRIES}.`)
      : maxT ? `Intento ${it.tries} de ${maxT}${it.tries > 1 ? ` · cuenta el mejor (${grade(it.best.score, it.best.maxScore)})` : ''}.` : it.tries > 1 ? `Cuenta tu mejor nota: ${grade(it.best.score, it.best.maxScore)}.` : ''}</p>
    ${chestReady ? `<div class="chest-card ready result-chest"><div class="chest-mini" aria-hidden="true"><img src="img/cofre/cerrado-mini.png" alt=""></div>
      <div class="chest-txt"><b>¡Ganaste el cofre de hoy!</b><span class="small">Ábrelo para ver tu premio.</span></div>
      <button class="btn chest-open" id="open-chest">Abrir cofre</button></div>` : ''}
  </div></div>`;
  // XP que sube contando (sin animación si se pidió reducir movimiento).
  const xc = $('#xp-count', root);
  if (xc) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) xc.textContent = gained;
    else { const t0 = performance.now(); const step = now => { const k = Math.min(1, (now - t0) / 900); xc.textContent = Math.round(gained * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
  }
  const oc = $('#open-chest', root);
  if (oc) oc.onclick = () => { oc.disabled = true; openDailyChest(user); };
  if (gained) {
    const chip = document.getElementById('xp-chip');
    chip?.classList.remove('bump'); void chip?.offsetWidth; chip?.classList.add('bump');
  }
}

// Repaso: preguntas que falló antes y no ha vuelto a acertar. Sin nota; da XP y cuenta para el cofre del día.
export async function practice(root, { user }) {
  const qs = reviewQuestions(await attempts.doneByUser(user.id));
  // Sin nada que repasar no se abre la pantalla completa: se vuelve a Misiones con un aviso.
  if (!qs.length) { toast('¡Nada que repasar! Cuando falles una pregunta, aparecerá aquí.'); location.hash = '#/s/tasks'; return; }
  if (!qs.length) {
    root.innerHTML = `<div class="player"><a href="#/s/tasks" class="small">← Misiones</a><div class="card empty" style="margin-top:12px">
      <h1 style="font-size:22px">¡Nada que repasar!</h1><p>Cuando falles una pregunta en una actividad, aparecerá aquí para que la practiques.</p>
      <a class="btn" href="#/s/tasks">Volver a misiones</a></div></div>`;
    return;
  }
  root.innerHTML = `<h1 class="sr-only">Repaso</h1>
    <div class="juego-aviso" role="status"><span><b>Repaso</b> · ${qs.length} pregunta${qs.length === 1 ? '' : 's'} que fallaste antes. No cuenta como nota: ganas ${REVIEW_XP} XP por acierto.</span><button type="button" class="icon-btn" aria-label="Cerrar aviso">×</button></div>
    <div id="stage"></div>`;
  root.querySelector('.juego-aviso button')?.addEventListener('click', e => e.currentTarget.parentElement.remove());
  const before = await xp.total(user.id);
  let navT = null;
  const player = mountPlayer($('#stage', root), {
    activity: { type: 'quiz', title: 'Repaso', content: { questions: qs } },
    clock: { mode: 'none' }, salir: { href: '#/s/tasks' },
    async onFinish(res) {
      // Se guarda como intento de repaso (sin asignación): así se sabe qué ya domina y abre el cofre del día.
      const t = await attempts.start(null, user.id, null, null, { practice: true });
      await attempts.finish(t.id, res);
      const gained = res.score * REVIEW_XP;
      if (gained) await xp.add(user.id, gained, `practice:${t.id}`);
      events.log(user.id, 'finish_practice', { score: res.score, maxScore: res.maxScore });
      const up = levelOf(before + gained).level > levelOf(before).level ? levelOf(before + gained).level : null;
      const chestReady = (await chestState(user.id)).state === 'ready';
      const left = reviewQuestions(await attempts.doneByUser(user.id)).length;
      navT = setTimeout(() => {
        const box = el(`<div class="player"><div class="card result" style="margin-top:16px">
          <h2>${res.score === res.maxScore ? '¡Todo bien esta vez!' : '¡Buen repaso!'}</h2>
          <p>${res.score}/${res.maxScore} aciertos${left ? ` · te quedan ${left} por repasar` : ' · ya no te queda nada por repasar'}</p>
          ${gained ? `<p><span class="xp-gain">${icons.star} +${gained} XP</span></p>` : ''}
          ${up ? `<div class="level-up" role="status">¡Subiste al nivel ${up}!${rangoDe(up).desde === up ? ` <b>¡Nuevo rango: ${rangoDe(up).icon} ${rangoDe(up).name}!</b>` : ''}${RETOS.some(x => x.level === up) ? ` Se abrió el reto <a href="#/s/retos">${esc(RETOS.find(x => x.level === up).name)}</a>.` : ''}</div>` : ''}
          ${chestReady ? `<div class="chest-card ready result-chest"><div class="chest-mini" aria-hidden="true"><img src="img/cofre/cerrado-mini.png" alt=""></div>
            <div class="chest-txt"><b>¡Ganaste el cofre de hoy!</b><span class="small">Ábrelo para ver tu premio.</span></div>
            <button class="btn chest-open" id="open-chest">Abrir cofre</button></div>` : ''}
          <div class="row" style="justify-content:center;margin-top:20px">
            ${left ? '<button class="btn ghost" type="button" id="again">Repasar otra vez</button>' : ''}
            <a class="btn" href="#/s/tasks">Volver a misiones</a></div></div></div>`);
        $('#stage', root).append(box);
        const oc = $('#open-chest', box);
        if (oc) oc.onclick = () => { oc.disabled = true; openDailyChest(user); };
        const ag = $('#again', box);
        if (ag) ag.onclick = () => dispatchEvent(new Event('plat-refresh'));
        const v = document.getElementById('xp-val'); if (v) v.textContent = before + gained;
        const chip = document.getElementById('xp-chip'); chip?.classList.remove('bump'); void chip?.offsetWidth; chip?.classList.add('bump');
        box.querySelector('h2').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    },
  });
  return () => { clearTimeout(navT); player.stop(); };
}
