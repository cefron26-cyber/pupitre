// Estudiante: Retos. Se desbloquean al subir de nivel; sin nota. Dan XP (una vez al día cada reto)
// y, la primera vez que se superan, un premio exclusivo de la colección.
// Dos clases: automáticos (RETOS en logic.js, armados con lo que ya terminó) y los que el docente marca (activity.challengeLevel).
import { assignments, activities, units, attempts, xp, events, users, userRewards, courses } from '../storage.js';
import { esc, el, $, icons, fmtDuration } from '../ui.js';
import { templates } from '../templates/index.js';
import { mountPlayer } from '../player.js';
import { RETOS, RETO_XP, retoPassed, itemCount, quizFromAnswers, activityIdsOf, progressOf } from '../logic.js';
import { byId, rewardPreview, DESBLOQUEADO, ALIAS } from '../rewards.js';
import { levelOf, levelCost, chestState, openDailyChest, equipar, chestWonHTML } from './student.js';

// XP que falta para llegar a un nivel.
function xpToLevel(total, target) {
  let need = 0;
  for (let n = 1; n < target; n++) need += levelCost(n);
  return Math.max(0, need - total);
}
const sameDay = (iso, d = new Date()) => { const x = new Date(iso); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate(); };

// Lo que el estudiante ya terminó: actividades (para el contrarreloj) y unidades completas (para la maratón).
async function finishedOf(user) {
  const acts = new Map(), unitsDone = [];
  for (const a of await assignments.listForCourses(user.courseIds)) {
    if (a.showAnswers === false) continue; // evaluaciones con respuestas ocultas: no se reutilizan
    const unit = a.unitId ? await units.get(a.unitId) : null;
    const ids = activityIdsOf(a, unit);
    const mine = await attempts.listFor(a.id, user.id);
    const p = progressOf(a, ids, mine);
    p.items.forEach(i => { if (i.best) acts.set(i.id, true); });
    if (unit && p.status === 'done') unitsDone.push({ a, unit, attempts: mine.filter(t => t.state === 'done') });
  }
  const list = [];
  for (const id of acts.keys()) { const x = await activities.get(id); if (x) list.push(x); }
  return { acts: list, unitsDone };
}

export async function retosList(root, { user }) {
  const total = await xp.total(user.id);
  const { level } = levelOf(total);
  const done = await attempts.doneByUser(user.id);
  const misPremios = (await userRewards.list(user.id)).map(r => r.rewardId);
  // "¡Ganado!" solo si de verdad lo ganó (en la demo ownedSet desbloquea todo para poder probar la ropa).
  const ganado = new Set(misPremios.map(id => ALIAS[id] || id));
  const fin = await finishedOf(user);
  const teacher = await activities.challenges(await courses.gradesOf(user.courseIds));
  const best = id => { const l = done.filter(t => t.reto === id); return l.length ? l.reduce((m, t) => t.score > m.score ? t : m) : null; };
  const xpToday = id => done.some(t => t.reto === id && sameDay(t.finishedAt));

  const card = r => {
    const open = DESBLOQUEADO || level >= r.level;
    const prize = byId(r.reward);
    const b = best(r.id);
    const src = r.id === 'reloj' ? fin.acts : r.id === 'maraton' ? fin.unitsDone : null;
    const need = r.id === 'perfecto' || r.id === 'mezcla' ? done.some(t => (t.answers || []).some(a => a?.question && a?.expected)) : src?.length;
    const picker = !open || !need ? '' : r.id === 'reloj'
      ? `<select class="reto-src" aria-label="Actividad para el contrarreloj">${fin.acts.map(x => `<option value="${x.id}">${esc(x.title)}</option>`).join('')}</select>`
      : r.id === 'maraton' ? `<select class="reto-src" aria-label="Unidad para la maratón">${fin.unitsDone.map(u => `<option value="${u.a.id}">${esc(u.unit.title)}</option>`).join('')}</select>` : '';
    return `<li class="reto ${open ? 'open' : 'locked'}" data-id="${r.id}">
      <div class="reto-ico" aria-hidden="true">${open ? icons[r.icon] : icons.lock}</div>
      <div class="reto-txt"><div class="reto-top"><b>${esc(r.name)}</b><span class="badge ${open ? 'done' : 'todo'}">Nivel ${r.level}</span></div>
        <p class="small">${esc(r.desc)}</p>
        ${open ? (b || xpToday(r.id) ? `<p class="small muted">${b ? `Tu récord: <b>${b.score}/${b.maxScore}</b>` : ''}${b && xpToday(r.id) ? ' · ' : ''}${xpToday(r.id) ? 'Hoy ya ganaste sus puntos' : ''}</p>` : '')
          : `<p class="small muted">Se abre en el nivel ${r.level}</p>`}
        ${open ? (need ? `<div class="row">${picker}<button class="btn sm" type="button" data-play>Jugar</button></div>`
          : `<p class="small muted">${r.id === 'maraton' ? 'Primero termina una unidad.' : 'Primero termina una actividad.'}</p>`) : ''}
      </div>
      <div class="reto-prize ${ganado.has(prize.id) ? 'ganado' : 'por-ganar'}" title="Premio exclusivo">${rewardPreview(prize, 48)}<span class="small">${ganado.has(prize.id) ? '¡Ganado!' : esc(prize.name)}</span></div>
    </li>`;
  };
  const tcard = a => {
    const open = DESBLOQUEADO || level >= a.challengeLevel, tpl = templates[a.type], id = 'act:' + a.id, b = best(id);
    return `<li class="reto ${open ? 'open' : 'locked'}" data-id="${id}">
      <div class="reto-ico" aria-hidden="true">${open ? tpl.icon : icons.lock}</div>
      <div class="reto-txt"><div class="reto-top"><b>${esc(a.title)}</b><span class="badge ${open ? 'done' : 'todo'}">Nivel ${a.challengeLevel}</span></div>
        <p class="small">${tpl.label} · ${esc(tpl.summary(a.content))}</p>
        <p class="small muted">${open ? `${b ? `Tu récord: <b>${b.score}/${b.maxScore}</b>` : 'Reto de tu docente.'}${xpToday(id) ? ' · Ya ganaste su XP hoy' : ''}` : `Se abre en el nivel ${a.challengeLevel}: te faltan ${xpToLevel(total, a.challengeLevel)} XP.`}</p>
        ${open ? '<div class="row"><button class="btn sm" type="button" data-play>Jugar</button></div>' : ''}
      </div></li>`;
  };

  // Escalera: primero los abiertos, luego los bloqueados en una lista compacta. Las reglas, en el ⓘ.
  const abiertos = RETOS.filter(r => DESBLOQUEADO || level >= r.level), cerrados = RETOS.filter(r => !DESBLOQUEADO && level < r.level);
  root.innerHTML = `<div class="page-head"><div><h1>Retos</h1>
      <p class="muted">Vas en el nivel ${level}</p></div>
      <details class="info-tip dark"><summary aria-label="Cómo funcionan los retos">i</summary><p>Los retos se abren al subir de nivel. No cuentan para la nota: dan ${RETO_XP} XP por acierto (una vez al día cada reto) y, si lo superas, un premio que no sale del cofre.</p></details></div>
    <ul class="retos">${abiertos.map(card).join('')}</ul>
    ${cerrados.length ? `<h2 class="task-group">Próximos</h2><ul class="retos-locked">${cerrados.map(r => `<li><span aria-hidden="true">${icons.lock}</span><span class="rl-txt"><b>${esc(r.name)}</b><span class="small">${esc(r.desc)}</span></span><span class="badge todo">Nivel ${r.level}</span><span class="rl-prize">${rewardPreview(byId(r.reward), 32)}<span class="small">${esc(byId(r.reward).name)}</span></span></li>`).join('')}</ul>` : ''}
    ${teacher.length ? `<h2 class="task-group">Retos de tu docente</h2><ul class="retos">${teacher.map(tcard).join('')}</ul>` : ''}`;
  root.querySelectorAll('.reto.open [data-play]').forEach(b => {
    b.onclick = () => {
      const li = b.closest('.reto'), src = li.querySelector('.reto-src')?.value;
      location.hash = `#/s/reto/${encodeURIComponent(li.dataset.id)}${src ? `?src=${encodeURIComponent(src)}` : ''}`;
    };
  });
}

export async function retoPlay(root, { user, params, query }) {
  const id = params.id;
  const total0 = await xp.total(user.id);
  const { level } = levelOf(total0);
  const fail = msg => { root.innerHTML = `<div class="player"><a href="#/s/retos" class="small">← Retos</a><div class="card empty" style="margin-top:12px">${msg}</div></div>`; };
  const auto = RETOS.find(r => r.id === id);
  let activity, clock = { mode: 'none' }, name, goal = '', teacherAct = null;

  if (auto) {
    if (!DESBLOQUEADO && level < auto.level) return fail(`Este reto se abre en el nivel ${auto.level}.`);
    name = auto.name; goal = auto.goal;
    const done = await attempts.doneByUser(user.id);
    if (id === 'reloj') {
      const fin = await finishedOf(user);
      activity = fin.acts.find(a => a.id === query.src);
      if (!activity) return fail('Elige una actividad que ya hayas terminado.');
      const limit = Math.max(60, itemCount(activity.content) * 15);
      clock = { mode: 'down', limitSec: limit, deadlineAt: Date.now() + limit * 1000 };
      goal += ` Tienes ${fmtDuration(limit)}.`;
    } else if (id === 'maraton') {
      const fin = await finishedOf(user);
      const u = fin.unitsDone.find(x => x.a.id === query.src);
      if (!u) return fail('Elige una unidad que ya hayas terminado.');
      const qs = quizFromAnswers(u.attempts, { max: 40 });
      if (!qs.length) return fail('Esta unidad no tiene preguntas para la maratón.');
      activity = { type: 'quiz', title: `Maratón · ${u.unit.title}`, content: { questions: qs } };
    } else {
      const qs = quizFromAnswers(done, { max: id === 'perfecto' ? 25 : 10 });
      if (!qs.length) return fail('Termina una actividad para jugar este reto.');
      activity = { type: 'quiz', title: name, content: { questions: qs } };
    }
  } else if (id.startsWith('act:')) {
    teacherAct = await activities.get(id.slice(4));
    const grades = await courses.gradesOf(user.courseIds);
    if (!teacherAct || !teacherAct.challengeLevel || !grades.includes(teacherAct.grade)) return fail('Este reto ya no está disponible.');
    if (!DESBLOQUEADO && level < teacherAct.challengeLevel) return fail(`Este reto se abre en el nivel ${teacherAct.challengeLevel}.`);
    activity = teacherAct; name = 'Reto de tu docente';
  } else return fail('Este reto no existe.');

  root.innerHTML = `<h1 class="sr-only">${esc(auto ? name : activity.title)}</h1>
    <div class="juego-aviso" role="status"><span><b>${esc(auto ? `${auto.icon} ${name}` : activity.title)}</b> · ${auto && id === 'reloj' ? `${esc(activity.title)} · ` : ''}${esc(goal || name)} No cuenta para la nota.</span><button type="button" class="icon-btn" aria-label="Cerrar aviso">×</button></div>
    <div id="stage"></div>`;

  let ended = false, navT = null, player = null;
  const finish = async res => {
    if (ended) return; ended = true;
    const t = await attempts.start(null, user.id, teacherAct?.id || (id === 'reloj' ? activity.id : null), null, { reto: id });
    await attempts.finish(t.id, res);
    // XP: una vez al día por reto (así no se sube de nivel repitiendo).
    const already = (await attempts.doneByUser(user.id)).some(x => x.reto === id && x.id !== t.id && sameDay(x.finishedAt));
    const gained = already ? 0 : res.score * RETO_XP;
    if (gained) await xp.add(user.id, gained, `reto:${id}`);
    // Premio exclusivo (solo retos automáticos), la primera vez que se supera.
    let prize = null;
    if (auto && retoPassed(id, res)) {
      // Se mira lo que de verdad ganó (no ownedSet, que en la demo da todo por ganado y nunca guardaría el premio).
      const owned = (await userRewards.list(user.id)).map(r => ALIAS[r.rewardId] || r.rewardId);
      if (!owned.includes(auto.reward)) { await userRewards.add(user.id, auto.reward); prize = byId(auto.reward); }
    }
    events.log(user.id, 'finish_reto', { reto: id, score: res.score, maxScore: res.maxScore });
    const up = levelOf(total0 + gained).level > level ? levelOf(total0 + gained).level : null;
    const opened = up ? RETOS.filter(r => r.level > level && r.level <= up) : [];
    const chestReady = (await chestState(user.id)).state === 'ready';
    const passed = auto ? retoPassed(id, res) : null;
    navT = setTimeout(() => {
      const box = el(`<div class="player"><div class="card result" style="margin-top:16px">
        <h2>${auto ? (passed ? '¡Reto superado!' : id === 'reloj' && res.timeUp ? '¡Se acabó el tiempo!' : '¡Casi! Inténtalo otra vez') : '¡Reto terminado!'}</h2>
        <p>${id === 'perfecto' ? `${res.score} acierto${res.score === 1 ? '' : 's'} seguido${res.score === 1 ? '' : 's'}` : `${res.score}/${res.maxScore} aciertos`}</p>
        ${gained ? `<p><span class="xp-gain">${icons.star} +${gained} XP</span></p>` : '<p class="small muted">Ya ganaste la XP de este reto hoy. Vuelve mañana por más.</p>'}
        ${prize ? `<div class="reto-won">${rewardPreview(prize, 72)}<div><b>¡Ganaste ${esc(prize.name)}!</b><span class="small">Premio exclusivo del reto.</span>
          <button class="btn sm" type="button" id="equip">Usar ahora</button></div></div>` : ''}
        ${up ? `<div class="level-up" role="status">¡Subiste al nivel ${up}!${opened.length ? ` Se abrió: ${opened.map(r => r.name).join(', ')}.` : ''}</div>` : ''}
        ${chestReady ? `${chestWonHTML()}` : ''}
        <div class="row" style="justify-content:center;margin-top:20px">
          <button class="btn ghost" type="button" id="again">Jugar otra vez</button>
          <a class="btn" href="#/s/retos">Volver a los retos</a></div></div></div>`);
      $('#stage', root).append(box);
      const eq = $('#equip', box);
      if (eq) eq.onclick = async () => { await equipar(await users.get(user.id), prize); dispatchEvent(new Event('plat-refresh')); };
      const oc = $('#open-chest', box);
      if (oc) oc.onclick = () => { oc.disabled = true; openDailyChest(user); };
      $('#again', box).onclick = () => dispatchEvent(new Event('plat-refresh'));
      const v = document.getElementById('xp-val'); if (v) v.textContent = total0 + gained;
      box.querySelector('h2').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
  };

  root.querySelector('.juego-aviso button')?.addEventListener('click', e => e.currentTarget.parentElement.remove());
  player = mountPlayer($('#stage', root), {
    activity, clock, salir: { href: '#/s/retos' },
    // Sin errores: al primer fallo se ve la respuesta correcta y el reto termina con la racha lograda.
    onProgress: st => {
      if (id !== 'perfecto' || ended || !Array.isArray(st?.answers)) return;
      const miss = st.answers.findIndex(a => a && a.correct === false);
      if (miss === -1) return;
      const answers = st.answers.slice(0, miss + 1);
      setTimeout(() => { player?.stop(); finish({ score: miss, maxScore: activity.content.questions.length, answers, durationSec: 0 }); }, 1400);
    },
    onFinish: res => finish(res),
  });
  return () => { clearTimeout(navT); player?.stop(); };
}
