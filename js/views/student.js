// Vistas del estudiante: Misiones, ruta de la unidad, hacer actividad, resultado.
import { assignments, activities, units, attempts, xp, events, users, chests, userRewards, periodos, compras, CHESTS_PER_DAY } from '../storage.js';
import { BACKGROUNDS, ROPA, SLOTS, RARITY, DEFAULT_PREFS, ponerPrenda, llevaPuesta, backgroundSwatch, rewardPreview, rollReward, odds, ownedSet, byId, rachaDelPeriodo, diasRacha, urlIconoRopa, comprable, precioDe, moneda } from '../rewards.js';
import { cebolloMini, emoteFig } from '../cebollo.js';
import { openChest } from '../chest.js';
import { esc, el, fmtDate, fmtDue, fmtDuration, grade, pct, icons, $, toast, insignia, confirmDialog } from '../ui.js';
import { templates } from '../templates/index.js';
import { templateArt } from '../iconos.js';
import { mountPlayer } from '../player.js';
import { UNIT_THEME } from '../temas.js';
import { tieneExplicacion, montarExplicacion, videoHTML, youtube } from '../explicacion.js';
import { progressOf, activityIdsOf, xpFor, STATUS, UNIT_BONUS_XP, statusLabel, UNIT_MAX_TRIES, points, starsOf, contentHash, reviewQuestions, REVIEW_XP, RETOS, faseDe, rangoDe, siguienteRango } from '../logic.js';

// Estrellas 0-3 según el puntaje 0-100 (solo motivación).
const starsHTML = p => { const n = starsOf(p); return `<span class="stars" aria-label="${n} de 3 estrellas">${[0, 1, 2].map(i => `<span class="${i < n ? '' : 'off'}">★</span>`).join('')}</span>`; };

export const xpTotal = userId => xp.total(userId);

// Barra de una misión de unidad en segmentos, uno por actividad, que se van llenando.
const segmentos = p => `<div class="segmentos" role="img" aria-label="${p.done} de ${p.total} actividades">${p.items.map(i =>
  `<i class="${i.best ? 'lleno' : i.status === 'doing' ? 'medio' : ''}"></i>`).join('')}</div>`;
// Tiempo hasta el próximo cofre (medianoche): "5 h" o "40 min".
function faltaManana() {
  const m = new Date(); m.setHours(24, 0, 0, 0);
  const min = Math.max(1, Math.round((m - Date.now()) / 60000));
  return min >= 60 ? `${Math.round(min / 60)} h` : `${min} min`;
}

// ---------- Nivel, cofre diario y colección ----------
// Cada nivel cuesta más que el anterior: 100, 150, 225, 340… (tope de 500 XP por nivel).
export const levelCost = n => Math.min(500, Math.round(100 * 1.5 ** (n - 1) / 5) * 5);
export function levelOf(total) {
  let level = 1, rest = total;
  while (rest >= levelCost(level)) { rest -= levelCost(level); level++; }
  return { level, inLevel: rest, need: levelCost(level) };
}
export const prefsOf = user => ({ ...DEFAULT_PREFS, ...(user.prefs || {}) });
// Guardar lo elegido: la ropa va en su ranura (los accesorios se suman a los que lleva); un fondo, directo.
export const equipar = (user, r) => users.setPrefs(user.id, r.kind === 'ropa'
  ? { ropa: ponerPrenda(prefsOf(user).ropa, r.slot, r.id) } : { [r.kind]: r.id });

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
  ${icons.flame}<b>${dias}</b> ${dias === 1 ? 'día' : 'días'}</span>`;
const modoOf = () => document.documentElement.dataset.modo || 'serio';

// Estado de los cofres de hoy (hasta 3, uno por actividad terminada): 'ready' (hay alguno por abrir), 'locked' (le
// falta terminar otra actividad) u 'opened' (ya abrió los 3). opened = el último que abrió.
export async function chestState(userId) {
  const abiertos = await chests.openedToday(userId);
  const ganados = await chests.earnedToday(userId);
  const state = abiertos.length < ganados ? 'ready' : abiertos.length >= CHESTS_PER_DAY ? 'opened' : 'locked';
  return { state, opened: abiertos.at(-1) || null, abiertos: abiertos.length, ganados };
}

// Sortea, guarda y anima un cofre. Devuelve true si se abrió.
export async function openDailyChest(user) {
  const { state } = await chestState(user.id);
  if (state !== 'ready') return false;
  const owned = (await userRewards.list(user.id)).map(r => r.rewardId);
  const result = rollReward(owned, Math.random, (await periodos.actual()).periodo);
  // Se guarda ANTES de animar: si cierran la pestaña a mitad, el premio no se pierde ni se repite el sorteo.
  // Repetido: las monedas quedan guardadas en el cofre (compras.saldo las suma); ya no da XP.
  await chests.open(user.id, { rewardId: result.reward.id, duplicate: result.duplicate, monedas: result.monedas });
  if (!result.duplicate) await userRewards.add(user.id, result.reward.id);
  events.log(user.id, 'open_chest', { rewardId: result.reward.id, duplicate: result.duplicate });
  const choice = await openChest({ modo: modoOf(), result });
  if (choice === 'equip') await equipar(await users.get(user.id), result.reward);
  dispatchEvent(new Event('plat-refresh'));
  return true;
}
// Puntos de los 3 cofres del día: abierto, listo o por ganar.
const chestDots = ({ abiertos, ganados }) => `<span class="chest-dots" role="img" aria-label="${abiertos} de ${CHESTS_PER_DAY} cofres abiertos hoy">${
  Array.from({ length: CHESTS_PER_DAY }, (_, i) => `<i class="${i < abiertos ? 'abierto' : i < ganados ? 'listo' : ''}"></i>`).join('')}</span>`;
// Aviso de cofre ganado en las pantallas de resultado (repaso, retos, actividad, unidad).
export const chestWonHTML = () => `<div class="chest-card ready result-chest"><div class="chest-mini" aria-hidden="true"><img src="img/cofre/cerrado-mini.png" alt=""></div>
  <div class="chest-txt"><b>Ganaste un cofre</b></div>
  <button class="btn chest-open" id="open-chest">Abrir</button></div>`;

// ---------- Ropa de la racha (por periodo) ----------
const sigDia = d => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + 1); return dayKey(x); };
// Racha dentro del periodo actual: la mejor (para los premios) y la de ahora (para mostrar cuánto falta).
export async function rachaPeriodo(userId) {
  const { periodo, desde } = await periodos.actual();
  const days = (await attempts.activeDays(userId)).filter(d => d >= desde);
  let mejor = 0, run = 0, prev = null;
  for (const d of days) { run = prev && sigDia(prev) === d ? run + 1 : 1; mejor = Math.max(mejor, run); prev = d; }
  const set = new Set(days), d = new Date();
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let ahora = 0;
  while (set.has(dayKey(d))) { ahora++; d.setDate(d.getDate() - 1); }
  return { periodo, desde, mejor, ahora, premios: rachaDelPeriodo(periodo) };
}
// Entrega las prendas de racha que ya alcanzó en este periodo (una vez cada una; si ya la tenía, da su XP de repetido).
// El hito (inicio del periodo + días) evita entregarla dos veces.
async function revisarPremiosRacha(user) {
  const { desde, mejor, premios } = await rachaPeriodo(user.id);
  const mias = await userRewards.list(user.id);
  const hitos = new Set(mias.map(r => r.hito).filter(Boolean)), tiene = new Set(mias.map(r => r.rewardId));
  const nuevos = [];
  for (const p of premios) {
    const hito = `${desde}:${p.dias}`;
    if (p.dias > mejor || hitos.has(hito)) continue;
    const r = byId(p.id), bono = tiene.has(p.id) ? RARITY[r.rarity].dupMonedas : 0;
    await userRewards.add(user.id, p.id, 'racha', hito);
    if (bono) await xp.add(user.id, bono, `racha:${p.id}`);
    events.log(user.id, 'streak_reward', { rewardId: p.id, dias: p.dias });
    nuevos.push({ ...p, r, bono });
  }
  return nuevos;
}
// Celebración de una prenda de racha recién ganada.
function premioRachaDialog(user, { dias, r, bono }) {
  return new Promise(resolve => {
    const d = el(`<dialog class="racha-dialog" aria-label="Premio de racha">
      <p class="kicker">${icons.flame} ${dias} días seguidos</p>
      <img class="ropa-icono" src="${urlIconoRopa(r.id)}" alt="" width="120" height="120">
      <h2>${esc(r.name)}</h2>
      <p class="small muted">${bono ? `Ya la tenías: ganas +${bono} XP.` : 'Nueva ropa para Cebollo.'}</p>
      <div class="row">${bono ? '<button class="btn" type="button" value="ok">¡Genial!</button>'
        : '<button class="btn ghost" type="button" value="ok">Luego</button><button class="btn" type="button" value="equip">Ponérsela</button>'}</div></dialog>`);
    document.body.append(d);
    let out = 'ok';
    d.addEventListener('click', e => { const v = e.target.closest('button')?.value; if (v) { out = v; d.close(); } });
    d.addEventListener('close', async () => {
      d.remove();
      if (out === 'equip') await equipar(await users.get(user.id), { ...r, kind: 'ropa' });
      resolve(out);
    }, { once: true });
    d.showModal();
    d.querySelector('.btn:last-child')?.focus();
  });
}
// Ventana de la ropa por racha (se abre desde la racha de la portada).
function rachaDialog(html) {
  const d = el(`<dialog class="racha-dialog racha-ver" aria-label="Ropa por racha">${html}
    <div class="row"><button class="btn" type="button" value="ok">Listo</button></div></dialog>`);
  document.body.append(d);
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('button')) d.close(); });
  d.addEventListener('close', () => d.remove(), { once: true });
  d.showModal();
}
// Las 4 prendas de la racha del periodo y cuánto falta para la siguiente.
function rachaCardHTML({ periodo, desde, ahora, premios }, hitos) {
  const sig = premios.find(p => !hitos.has(`${desde}:${p.dias}`));
  const falta = sig ? sig.dias - ahora : 0;
  return `<div class="racha-card">
    <div class="rc-head"><b>Ropa por racha</b>
      <span class="small">${sig ? `Faltan ${falta} ${falta === 1 ? 'día' : 'días'} para la próxima` : 'Ya tienes toda la de este periodo'}</span></div>
    <ol class="rc-list">${premios.map(p => {
      const r = byId(p.id), ok = hitos.has(`${desde}:${p.dias}`);
      return `<li class="${ok ? 'ok' : ''}" title="${esc(r.name)} · ${p.dias} días de racha" style="--rc:${RARITY[r.rarity].color}">
        <span class="rc-img"><img src="${urlIconoRopa(r.id)}" alt="" draggable="false">${ok ? `<span class="rc-check" aria-hidden="true">${icons.check}</span>` : `<span class="rc-lock" aria-hidden="true">${icons.lock}</span>`}</span>
        <span class="rc-dias">${icons.flame}${p.dias}</span><span class="sr-only">${esc(r.name)}${ok ? ', ganada' : ''}</span></li>`;
    }).join('')}</ol></div>`;
}

async function drawHero(box, user) {
  const total = await xp.total(user.id);
  const { level, inLevel, need } = levelOf(total);
  const nuevos = await revisarPremiosRacha(user);
  const cs = await chestState(user.id), { state, opened, abiertos, ganados } = cs;
  const racha = await streakOf(user.id);
  const rp = await rachaPeriodo(user.id);
  const hitos = new Set((await userRewards.list(user.id)).map(r => r.hito).filter(Boolean));
  const prefs = prefsOf(user);
  const first = esc(user.name.split(' ')[0]);
  const reward = opened && byId(opened.rewardId);
  const rango = rangoDe(level), sig = siguienteRango(level);
  // Falta poco para subir de nivel (un cuarto del nivel o menos): la barra brilla y lo dice.
  const cerca = inLevel > 0 && need - inLevel <= Math.max(20, need / 4);
  const listos = ganados - abiertos;
  // Cofre resumido (2026-11-27, pedido del docente): una frase corta, los tres puntos y el reloj hasta medianoche.
  // Lo que puede salir del cofre quedó en la "i" de Mi colección.
  const chestText = {
    locked: abiertos ? 'Haz otra actividad y gana el siguiente' : 'Haz una actividad y gana uno',
    ready: listos === 1 ? 'Hay uno listo' : `Hay ${listos} listos`,
    opened: 'Mañana hay más',
  }[state];
  box.innerHTML = `<div class="hero-me">
      <a class="hero-avatar" href="#/s/cuarto" aria-label="Ir al cuarto de Cebollo">${cebolloMini(prefs.ropa, 72, { vivo: true, triste: !racha.hoy })}</a>
      <div class="hero-txt">
        <h1 class="hero-hi">Hola, ${first}</h1>
        ${modoOf() === 'juego' ? `<button type="button" class="streak-btn" id="racha-btn" aria-haspopup="dialog" aria-label="Ver la ropa por racha">${streakHTML(racha)}</button>` : streakHTML(racha)}
        <a class="rango-chip" href="#/s/ranking" style="--rc:${rango.color}" title="${sig ? `Siguiente rango: ${sig.name} (nivel ${sig.desde})` : 'Rango máximo'}">${insignia(rango.id, 18)}<b>${rango.name}</b></a>
        <div class="level-row"><span class="level-badge">Nivel ${level}</span>
          <div class="level-bar ${cerca ? 'cerca' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="${need}" aria-valuenow="${inLevel}" aria-label="Experiencia del nivel"><i style="width:${Math.round(inLevel / need * 100)}%"></i></div>
          <span class="small">${inLevel}/${need} XP</span>
          ${cerca ? `<span class="nivel-cerca">Te faltan ${need - inLevel} para el nivel ${level + 1}</span>` : ''}</div>
      </div>
    </div>
    <div class="chest-card ${state}">
      <div class="chest-mini" aria-hidden="true"><img src="img/cofre/cerrado-mini.png" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'chest-ico',innerHTML:this.dataset.ico}))" data-ico='${icons.chest}'></div>
      <div class="chest-txt"><b>${chestText}</b>${chestDots(cs)}<span class="chest-timer" title="Los cofres se renuevan a medianoche">${icons.clock}<span>Nuevos en ${faltaManana()}</span></span></div>
      ${state === 'ready' ? '<button class="btn chest-open" id="open-chest">Abrir</button>' : ''}
    </div>
`;
  // Ropa por racha (2026-11-27, pedido del docente): ya no va en la portada; sale en una ventana al tocar la racha.
  const rb = $('#racha-btn', box);
  if (rb) rb.onclick = () => rachaDialog(rachaCardHTML(rp, hitos));
  const b = $('#open-chest', box);
  if (b) b.onclick = () => { b.disabled = true; openDailyChest(user); };
  // Prenda de racha recién ganada: se celebra encima de la portada ya pintada.
  if (nuevos.length) (async () => { for (const n of nuevos) await premioRachaDialog(user, n); dispatchEvent(new Event('plat-refresh')); })();
}

export async function collection(root, { user }) {
  const owned = ownedSet((await userRewards.list(user.id)).map(r => r.rewardId));
  const prefs = prefsOf(user);
  const { state } = await chestState(user.id);
  const { periodo } = await periodos.actual();
  const saldo = await compras.saldo(user.id);
  const tile = (r, kind) => {
    const has = owned.has(r.id), using = kind === 'ropa' ? llevaPuesta(prefs.ropa, r.slot, r.id) : prefs[kind] === r.id;
    return `<li class="reward-tile ${has ? 'has' : 'locked'} rr-${r.rarity}" style="--rc:${RARITY[r.rarity].color}">
      <div class="rt-prev">${kind === 'ropa' ? rewardPreview({ ...r, kind }, 64) : backgroundSwatch(r.id)}${has ? '' : `<span class="rt-lock">${icons.lock}</span>`}</div>
      <b class="rt-name">${esc(r.name)}</b>
      <span class="rt-rarity">${RARITY[r.rarity].label}</span>
      ${has ? (using ? '<span class="rt-using">En uso</span>' : `<button class="btn sm ghost" data-kind="${kind}" data-id="${r.id}">Usar</button>`)
        : comprable(r) ? `<button class="btn sm rt-comprar ${saldo < precioDe(r) ? 'caro' : ''}" data-comprar="${r.id}" aria-label="Comprar ${esc(r.name)} por ${precioDe(r)} monedas">${moneda(18)}${precioDe(r)}</button>`
        : `<span class="small muted">${r.free ? '' : r.source === 'reto' ? `Supera el reto ${esc(RETOS.find(x => x.reward === r.id)?.name || '')}` : diasRacha(r.id, periodo) ? `${icons.flame} ${diasRacha(r.id, periodo)} días de racha` : 'Sale del cofre'}</span>`}
    </li>`;
  };
  const count = list => list.filter(r => owned.has(r.id)).length;
  const tot = ROPA.length + BACKGROUNDS.length, mine = count(ROPA) + count(BACKGROUNDS);
  root.innerHTML = `<div class="page-head"><div><h1>Mi colección</h1>
      <div class="coll-prog"><div class="progress"><i style="width:${Math.round(mine / tot * 100)}%"></i></div><b>${mine}/${tot}</b></div>
      <div class="coll-monedas" role="status" aria-label="${saldo} monedas" title="Monedas">${moneda(24)}<b>${saldo}</b></div></div>
      <details class="info-tip dark"><summary aria-label="Qué puede salir del cofre">i</summary><p>Cada actividad que terminas te da un cofre (hasta ${CHESTS_PER_DAY} al día). Premios del cofre: ${odds()}. Si te sale uno repetido, ganas monedas. Con monedas puedes comprar los premios raros, épicos y legendarios que te falten. Algunos solo se ganan en los <a href="#/s/retos">Retos</a>, y en cada periodo hay ropa que se gana con 5, 10, 15 y 20 días de racha.</p></details>
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
  root.querySelectorAll('[data-comprar]').forEach(b => {
    b.onclick = async () => {
      const r = byId(b.dataset.comprar), precio = precioDe(r), tengo = await compras.saldo(user.id);
      if (!comprable(r)) return;
      if (tengo < precio) { toast(`Te faltan ${precio - tengo} monedas para ${r.name}.`); return; }
      if (!await confirmDialog(`¿Comprar ${r.name} por ${precio} monedas? Te quedan ${tengo - precio}.`, 'Comprar')) return;
      await compras.add(user.id, r.id, precio);
      await userRewards.add(user.id, r.id);
      events.log(user.id, 'compra_premio', { rewardId: r.id, precio });
      toast(`¡${r.name} es tuyo!`);
      dispatchEvent(new Event('plat-refresh'));
    };
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
  const todas = [];
  for (const a of await assignments.listForCourses(user.courseIds)) {
    const r = await load(a, user.id);
    if (r) todas.push(r);
  }
  // Periodos (2026-11-26): arriba las misiones del periodo actual; las de otros periodos, plegadas al final.
  const { periodo } = await periodos.actual();
  const perDe = r => (r.unit || r.acts[0]).periodo || periodo;
  const rows = todas.filter(r => perDe(r) === periodo);
  const otros = [...new Set(todas.map(perDe))].filter(n => n !== periodo).sort((a, b) => b - a);
  // Primero las atrasadas (para que no se queden olvidadas), luego en curso, pendientes y al final las terminadas.
  const order = { late: 0, doing: 1, todo: 2, done: 3 };
  const cmp = (x, y) => order[x.p.status] - order[y.p.status] || (x.a.dueAt || '9').localeCompare(y.a.dueAt || '9');
  todas.sort(cmp); rows.sort(cmp);
  const open = rows.filter(r => r.p.status !== 'done'), closed = rows.filter(r => r.p.status === 'done');
  const review = reviewQuestions(await attempts.doneByUser(user.id));

  // Grupos como Cambridge One ("To do" / "Completed"), separando lo atrasado y lo de esta semana.
  const week = Date.now() + 7 * 864e5;
  const grupo = r => r.p.status === 'late' ? 'late' : r.a.dueAt && new Date(r.a.dueAt).getTime() <= week ? 'week' : 'later';
  const rest = open.slice(1);
  const GRUPOS = [['late', 'Atrasadas'], ['week', 'Esta semana'], ['later', 'Después']];
  // Recompensa de cada misión: XP de la primera vez (máximo) + el bono de unidad.
  const premio = (acts, unit) => `<span class="mision-xp" title="XP máxima que puedes ganar">+${acts.length * 30 + (unit ? UNIT_BONUS_XP : 0)} XP</span>`;
  root.innerHTML = `<section class="hero" id="hero"></section>
    <div class="page-head"><div><h1>Misiones</h1>
    <p class="muted">Periodo ${periodo}${!open.length && rows.length ? ' · Hiciste todo' : ''}</p></div></div>
    <div id="next"></div>
    ${review.length ? `<a class="practice-card" href="#/s/practice"><div class="type-icon">${icons.quiz}</div>
      <div class="grow"><b>Repasa lo que fallaste</b><div class="small muted">No cuenta para la nota</div></div>
      <span class="practice-n" aria-label="${review.length} preguntas">${review.length}</span></a>` : ''}
    ${GRUPOS.map(([k, t]) => rest.some(r => grupo(r) === k) ? `<h2 class="task-group ${k}">${t} <span>${rest.filter(r => grupo(r) === k).length}</span></h2><div class="list" id="g-${k}"></div>` : '').join('')}
    ${closed.length ? `<details class="done-group"><summary>Hechas · ${closed.length}</summary><div class="list" id="done"></div></details>` : ''}
    ${otros.map(n => { const k = todas.filter(r => perDe(r) === n).length; return `<details class="done-group periodo-group"><summary>Periodo ${n} · ${k} ${k === 1 ? 'misión' : 'misiones'}</summary><div class="list" id="p-${n}"></div></details>`; }).join('')}`;
  await drawHero($('#hero', root), user);
  if (!rows.length) {
    $('#next', root).innerHTML = `<div class="card empty">Aún no tienes misiones${todas.length ? ` del periodo ${periodo}` : ''}.${review.length ? ' Mientras tanto, puedes repasar.' : ''}${modoOf() === 'juego' ? ' <a href="#/s/collection">Mira tu colección</a>' : ''}</div>`;
    if (!todas.length) return;
  }

  // Tarjeta "Próxima misión": la más urgente, a un toque.
  if (open.length) {
    const { a, unit, acts, p } = open[0];
    const k = unit ? p.items.findIndex(i => !i.best) : 0;
    const act = acts[Math.max(0, k)];
    const due = fmtDue(a.dueAt);
    const busy = unit ? p.items[k]?.status === 'doing' : p.status === 'doing';
    $('#next', root).append(el(`<div class="next-card">
      <div class="next-masc" aria-hidden="true">${emoteFig('pulgar', prefsOf(user).ropa, 'next-emote')}</div>
      <div class="grow"><p class="kicker">Sigue con ${premio(acts, unit)}</p>
        <h2>${esc(unit ? unit.title : act.title)}</h2>
        <div class="small">${unit ? `Actividad ${k + 1} de ${acts.length}` : templates[act.type].label}${a.dueAt ? ` · <span class="${due.cls}">${due.text}</span>` : ''}</div>
        ${unit ? segmentos(p) : ''}</div>
      <a class="btn" href="${unit && empiezaConExplicacion(unit, p) ? `#/s/leccion/${a.id}` : unit ? `#/s/play/${a.id}/${act.id}` : `#/s/play/${a.id}`}">${busy || (unit && p.done) ? 'Continuar' : 'Empezar'}</a></div>`));
  }

  const doneBox = $('#done', root);
  // Cada unidad de la lista lleva a Cebollo en una pose distinta (2026-11-27, pedido del docente).
  const POSES = ['sonrisa', 'ok', 'brazos', 'copa', 'pulgar'];
  let nUnidad = 0;
  for (const row of todas) {
    // La misión de "Próxima misión" no se repite en la lista.
    if (row === open[0]) continue;
    const { a, unit, acts, p } = row;
    const s = statusLabel(p);
    const box = perDe(row) !== periodo ? $(`#p-${perDe(row)}`, root) : p.status === 'done' ? doneBox : $(`#g-${grupo(row)}`, root);
    const dd = fmtDue(a.dueAt);
    const due = !a.dueAt ? '' : p.status === 'done' ? ` · Entrega: ${fmtDate(a.dueAt, false)}` : ` · <span class="${dd.cls}">${dd.text}</span>`;
    // Sin chip para lo que no ha empezado; "Empezada" en vez de "En curso".
    const chip = p.status === 'todo' ? '' : p.status === 'doing' ? 'Empezada' : s.label;
    if (unit) {
      box.append(el(`<div class="item unit-item">
        ${modoOf() === 'juego' ? `<div class="type-icon unit unit-ceb" aria-hidden="true"><img src="img/cebollo/emotes/${POSES[(nUnidad++) % POSES.length]}.webp" alt=""></div>` : `<div class="type-icon unit">${icons.unit}</div>`}
        <div class="info">
          <p class="title">${esc(unit.title)}</p>
          <div class="meta">Unidad · ${acts.length} actividades${due}</div>
          ${segmentos(p)}
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
        <div class="meta">${tpl.label}${due}</div>
      </div>
      ${chip ? `<span class="badge ${s.cls}">${chip}${it.best ? ` · ${grade(it.best.score, it.best.maxScore)}` : ''}</span>` : ''}
      <a class="btn ${p.status === 'done' ? 'ghost' : ''}" href="${href}">${btn}</a>
    </div>`));
  }
}

// XP ganado en la pasada actual por la unidad (se suma actividad tras actividad hasta el resumen final).
function leerRecorrido(id) {
  try { const r = JSON.parse(sessionStorage.getItem('plat.unitRun')); return r?.id === id ? r : null; } catch { return null; }
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
  // Resumen al terminar la pasada por la unidad (las actividades se encadenan sin resultado intermedio).
  let fin = null;
  try { const f = JSON.parse(sessionStorage.getItem('plat.unitFin')); if (f?.id === a.id) { fin = f; sessionStorage.removeItem('plat.unitFin'); } } catch {}
  const subio = fin && levelOf(fin.xpBefore + fin.gained).level > levelOf(fin.xpBefore).level ? levelOf(fin.xpBefore + fin.gained).level : null;
  const cofre = fin && (await chestState(user.id)).state === 'ready';
  const resumen = !fin ? '' : `<div class="card result unit-fin" role="status">
      <h2>${fin.unitDone ? '¡Completaste la unidad!' : '¡Terminaste las actividades!'}</h2>
      ${p.status === 'done' ? `<div class="score-ring" style="--p:${p.unitPoints}"><b>${(p.unitPoints / 10).toFixed(1)}</b><span>de 10</span></div>` : ''}
      ${fin.gained ? `<p><span class="xp-gain">${icons.star} +${fin.gained} XP</span>${fin.unitDone ? ` <span class="small muted">(incluye +${UNIT_BONUS_XP} de bono)</span>` : ''}</p>` : ''}
      ${subio ? `<div class="level-up">¡Subiste al nivel ${subio}!${rangoDe(subio).desde === subio ? ` <b>Nuevo rango: ${rangoDe(subio).name}</b>` : ''}${RETOS.some(x => x.level === subio) ? ` Se abrió el reto <a href="#/s/retos">${esc(RETOS.find(x => x.level === subio).name)}</a>.` : ''}</div>` : ''}
      <p class="small muted">Toca cada actividad del camino para ver tu puntaje y revisar tus respuestas.</p>
      ${cofre ? `${chestWonHTML()}` : ''}
    </div>`;
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
    ${resumen}
    ${cur >= 0 ? (empiezaConExplicacion(u, p) ? `<a class="btn unit-go" href="#/s/leccion/${a.id}">Empezar: ver la explicación</a>`
      : `<a class="btn unit-go" href="#/s/play/${a.id}/${acts[cur].id}">${p.done || p.items[cur].status === 'doing' ? 'Continuar' : 'Empezar'}: ${esc(acts[cur].title)}</a>`) : ''}
    <ol class="path2" id="path"></ol></div>`;
  const oc = $('#open-chest', root);
  if (oc) oc.onclick = () => { oc.disabled = true; openDailyChest(user); };
  if (fin?.gained) { const chip = document.getElementById('xp-chip'); chip?.classList.remove('bump'); void chip?.offsetWidth; chip?.classList.add('bump'); }
  const path = $('#path', root);
  // La explicación (si el docente la puso) va primero en el camino; se puede volver a ver cuando quiera.
  if (tieneExplicacion(u)) {
    const conVideo = !!youtube(u.explicacion.video), conTexto = !!u.explicacion.texto?.trim();
    const nombre = conTexto && conVideo ? 'Explicación y video' : conTexto ? 'Explicación' : 'Video';
    path.append(el(`<li class="node leccion-node ${empiezaConExplicacion(u, p) ? 'next' : 'done'}" style="--off:0">
      <a class="node-btn" href="#/s/leccion/${a.id}" aria-label="${nombre} de la unidad"><span class="node-ico">${conTexto ? icons.bookOpen : icons.play}</span></a>
      <div class="node-txt"><b>${nombre}</b><span>${empiezaConExplicacion(u, p) ? 'Empieza por aquí' : 'Vuelve a verla cuando quieras'}</span></div></li>`));
  }
  let fasePrev = null;
  acts.forEach((act, i) => {
    const it = p.items[i], tpl = templates[act.type];
    // Secciones de la unidad (Vocabulario, Gramática…) como separadores del camino.
    const fase = faseDe(u, act);
    if (fase !== fasePrev) path.append(el(`<li class="path-fase"><span>${esc(fase)}</span></li>`));
    fasePrev = fase;
    const href = it.best ? `#/s/result/${it.best.id}` : `#/s/play/${a.id}/${act.id}`;
    const estado = it.best ? 'done' : i === cur && !empiezaConExplicacion(u, p) ? 'next' : 'todo';
    path.append(el(`<li class="node ${estado}" style="--off:${[0, 1, 0, -1][i % 4]}">
      <a class="node-btn" href="${href}" aria-label="${i + 1}. ${esc(act.title)} · ${tpl.label}${it.best ? ` · ${it.points} de 100` : ''}">
        <span class="node-ico">${it.best ? '✓' : templateArt(tpl.type)}</span></a>
      <div class="node-txt"><b>${esc(act.title)}</b><span>${tpl.label}${it.best ? ` · ${it.points}/100` : it.status === 'doing' ? ' · en curso' : ''}</span>
        ${it.best ? starsHTML(it.points) : ''}</div>
    </li>`));
  });
}

// Explicación de la unidad (opcional, la pone el docente): pantalla completa. Primero la explicación sola; con Siguiente,
// el video de YouTube solo. Al final, a la primera actividad pendiente. Se puede volver a ver desde el camino de la unidad.
// Una unidad empieza por aquí mientras el estudiante no haya empezado ninguna actividad.
export const empiezaConExplicacion = (unit, p) => tieneExplicacion(unit) && !p.done && p.items.every(i => i.status !== 'doing');

export async function leccion(root, { user, params, query }) {
  const a = await assignments.get(params.id);
  const r = a && a.unitId && user.courseIds.includes(a.courseId) ? await load(a, user.id) : null;
  if (!r) { location.hash = '#/s/tasks'; return; }
  const back = `#/s/unit/${a.id}`;
  if (!tieneExplicacion(r.unit)) { location.hash = back; return; }
  const ex = r.unit.explicacion;
  const pantallas = [ex.texto?.trim() ? 'texto' : null, youtube(ex.video) ? 'video' : null].filter(Boolean);
  const k = r.p.items.findIndex(i => !i.best);
  const despues = k >= 0 ? `#/s/play/${a.id}/${r.acts[k].id}` : back;
  const fin = k < 0 ? 'Volver a la unidad' : r.p.done ? 'Seguir con las actividades' : 'Empezar las actividades';
  let i = Math.max(0, Math.min(pantallas.length - 1, Number(query.p) || 0));
  events.log(user.id, 'open_lesson', { assignmentId: a.id });

  root.innerHTML = `<div class="leccion">
    <div class="leccion-top">
      <a class="icon-btn leccion-salir" href="${back}" aria-label="Volver a la unidad">✕</a>
      <h1 class="grow"><small>${esc(r.unit.title)}</small><span id="lecT"></span></h1>
      ${pantallas.length > 1 ? `<span class="leccion-puntos" aria-hidden="true">${pantallas.map(() => '<i></i>').join('')}</span>` : ''}
    </div>
    <div class="leccion-cuerpo" id="lecC"></div>
    <div class="leccion-pie">
      <button type="button" class="btn ghost" id="lecAtras">← Atrás</button>
      <button type="button" class="btn" id="lecSig"></button>
    </div></div>`;
  const cuerpo = $('#lecC', root), atras = $('#lecAtras', root), sig = $('#lecSig', root);
  let cortar = null;
  const pintar = () => {
    cortar?.(); cortar = null;
    const p = pantallas[i];
    $('#lecT', root).textContent = p === 'texto' ? 'Explicación' : 'Mira el video';
    if (p === 'texto') cortar = montarExplicacion(cuerpo, ex.texto);
    else cuerpo.innerHTML = videoHTML(ex.video, `Video: ${r.unit.title}`);
    root.querySelectorAll('.leccion-puntos i').forEach((x, j) => x.classList.toggle('on', j === i));
    atras.hidden = i === 0;
    sig.textContent = i < pantallas.length - 1 ? 'Siguiente →' : `${fin} →`;
    window.scrollTo(0, 0);
    sig.focus({ preventScroll: true });
  };
  atras.onclick = () => { i--; pintar(); };
  sig.onclick = () => { if (i < pantallas.length - 1) { i++; pintar(); } else location.hash = despues; };
  pintar();
  return () => cortar?.();
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
    theme: r.unit ? UNIT_THEME : null, // dentro de una unidad, un solo estilo
    salir: { href: back },
    unidad: r.unit ? { href: back } : null,
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
      // Unidad en curso: sin pantalla de resultado entre actividades; pasa directo a la siguiente pendiente
      // (primero las que siguen en orden). Al terminar la última, el camino de la unidad muestra el resumen.
      // Una unidad que ya estaba completa (reintento) sigue mostrando el resultado de esa actividad.
      if (r.unit && !unitDoneBefore) {
        const run = leerRecorrido(a.id) || { id: a.id, xpBefore: before, gained: 0 };
        run.gained += gained;
        const mine = await attempts.listFor(a.id, user.id);
        const pend = r.acts.filter(x => !mine.some(t => t.activityId === x.id && t.state === 'done'));
        const i = r.acts.indexOf(act);
        const next = pend.find(x => r.acts.indexOf(x) > i) || pend[0];
        if (next) { sessionStorage.setItem('plat.unitRun', JSON.stringify(run)); navT = setTimeout(() => { location.hash = `#/s/play/${a.id}/${next.id}`; }, 400); return; }
        sessionStorage.removeItem('plat.unitRun');
        sessionStorage.setItem('plat.unitFin', JSON.stringify({ ...run, unitDone }));
        navT = setTimeout(() => { location.hash = back; }, 400);
        return;
      }
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
      <div class="rs-racha"><b>${icons.flame} ${racha.dias}</b><span>${racha.dias === 1 ? 'día' : 'días'} de racha</span></div>
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
    ${chestReady ? `${chestWonHTML()}` : ''}
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
          ${up ? `<div class="level-up" role="status">¡Subiste al nivel ${up}!${rangoDe(up).desde === up ? ` <b>Nuevo rango: ${rangoDe(up).name}</b>` : ''}${RETOS.some(x => x.level === up) ? ` Se abrió el reto <a href="#/s/retos">${esc(RETOS.find(x => x.level === up).name)}</a>.` : ''}</div>` : ''}
          ${chestReady ? `${chestWonHTML()}` : ''}
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
