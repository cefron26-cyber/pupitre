// Envoltura de la plataforma alrededor de cualquier plantilla: barra de progreso, cronómetro,
// autoguardado y protección ante errores (nunca sacar al estudiante de la actividad).
// Con un estilo visual (js/temas.js) la actividad se juega dentro de un "escenario": portada con ¡Empezar!,
// barra inferior (avance en puntos, sonido, pantalla completa), chispas al acertar y cierre con estrellas.
import { el, esc, fmtDuration, evalMode, confirmDialog } from './ui.js';
import { templates } from './templates/index.js';
import { themeById, themeSound, DEFAULT_THEME } from './temas.js';
import { mostrarEmote, urlEmote } from './cebollo.js';

const IDLE_MS = 60_000; // sin interacción por más de 1 min → no cuenta tiempo
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Sonido encendido/apagado: preferencia de este navegador (solo comodidad).
const muted = () => { try { return localStorage.getItem('plat.sonido') === 'off'; } catch { return false; } };
const setMuted = v => { try { localStorage.setItem('plat.sonido', v ? 'off' : 'on'); } catch {} };

const ICON = {
  on: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  off: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  cerrar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
  full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// Nota parcial si se acaba el tiempo: con las respuestas guardadas (correctas sobre el total); si la plantilla no las guarda, lo avanzado.
function partialResult(st) {
  if (!st) return { score: 0, maxScore: 1, answers: [] };
  if (Array.isArray(st.answers)) {
    const answers = st.answers;
    return { score: answers.filter(a => a?.correct).length, maxScore: Math.max(st.total || 0, answers.length, 1), answers };
  }
  return { score: st.done || 0, maxScore: Math.max(st.total || 0, 1), answers: [] };
}

// Instrucción general por tipo (si la actividad no trae una propia).
const CONSIGNA = {
  quiz: 'Choose the correct answer.',
  matching: 'Match the words.',
  fill: 'Complete the sentences.',
  reorder: 'Put the words in order.',
  classify: 'Put each word in the correct group.',
  memory: 'Find the pairs.',
  reading: 'Read the text and answer the questions.',
  listening: 'Listen and answer the questions.',
  dictation: 'Listen and write what you hear.',
  wordsearch: 'Find the words.',
  hangman: 'Guess the word.',
  crossword: 'Complete the crossword.',
};

// clock: { mode: 'up' (cronómetro) | 'down' (cuenta regresiva) | 'none', limitSec, deadlineAt (ms), onHidden(n) }. Lo decide el docente.
// La cuenta regresiva usa una hora fija de fin (deadlineAt): sigue corriendo aunque cambie de pestaña o cierre la página.
// theme: fuerza un estilo visual (vista previa del editor, presentar); si no, el de la actividad.
// ceremonia: portada y cierre del escenario (Presentar lo apaga: va pregunta por pregunta).
// salir: { href } → reproductor a pantalla completa (estudiante): ✕ arriba, una sola barra de avance, franja de respuesta.
// tramo: { index, total } → la barra muestra el avance de toda la unidad (actividad index de total).
// portada: false la quita (dentro de una unidad se pasa directo a la actividad).
// colores: true deja las fichas de colores del estilo (Presentar en clase); si no, fichas neutras y verde/rojo solo al corregir.
export function mountPlayer(root, { activity, saved = null, durationSec = 0, onProgress = () => {}, onFinish = () => {}, clock = { mode: 'up' }, hideAnswers = false, theme = null, ceremonia = true,
  salir = null, tramo = null, portada = true, colores = false, encabezado = null }) {
  evalMode.hide = !!hideAnswers;
  const hide = !!hideAnswers;
  // Modo serio (elegido por el estudiante o forzado en una evaluación): sin decoración ni sonidos.
  const serio = document.documentElement.dataset.modo === 'serio';
  const tema = serio ? 'sencillo' : themeById(theme || activity.theme || DEFAULT_THEME).id;
  const decorado = tema !== 'sencillo';
  const sound = kind => { if (decorado && !muted()) themeSound(tema, kind); };
  const tpl = templates[activity.type];
  // Instrucción para el estudiante (como en Cambridge One): la del docente/IA o una general del tipo.
  const consigna = (activity.instruction || '').trim() || CONSIGNA[activity.type] || '';
  let seconds = durationSec || 0;
  let lastInteraction = Date.now();
  let finished = false;
  let lastState = saved;
  // Portada solo al empezar de cero (al retomar se entra directo).
  const conPortada = decorado && ceremonia && portada && !(saved && (saved.done || saved.answers?.length || saved.i));
  let started = !conPortada;

  root.innerHTML = '';
  const inmersivo = !!salir;
  const botones = `<span class="esc-btns">
        <button type="button" class="esc-btn" data-b="sonido" aria-label="${muted() ? 'Activar sonido' : 'Silenciar'}" aria-pressed="${!muted()}">${muted() ? ICON.off : ICON.on}</button>
        <button type="button" class="esc-btn" data-b="full" aria-label="Pantalla completa">${ICON.full}</button></span>`;
  const shell = el(`<div class="player escenario ${decorado ? 'tematico' : ''} ${inmersivo ? 'inmersivo' : ''} ${colores ? '' : 'neutro'}" data-tema="${tema}">
    ${decorado ? '<div class="esc-fondo" aria-hidden="true"></div>' : ''}
    <div class="player-top">
      ${inmersivo ? `<button type="button" class="esc-btn esc-salir" data-b="salir" aria-label="Salir (tu avance queda guardado)">${ICON.cerrar}</button>` : ''}
      ${inmersivo && !decorado && encabezado ? `<div class="pt-head"><b>${esc(encabezado.titulo)}</b>${encabezado.detalle ? `<span>${esc(encabezado.detalle)}</span>` : ''}</div>` : ''}
      <div class="progress" role="progressbar" aria-label="Progreso" aria-valuemin="0" aria-valuemax="100"><i style="width:0%"></i></div>
      <span class="timer ${clock.mode === 'none' ? 'off' : ''} ${clock.mode === 'down' ? 'down' : ''}" aria-label="${clock.mode === 'down' ? 'Tiempo restante' : 'Tiempo'}" ${clock.mode === 'none' ? 'hidden' : ''}></span>
      ${inmersivo && decorado ? botones : ''}
    </div>
    <div class="esc-cuerpo ${decorado ? '' : 'card'}">
      <p class="consigna">${esc(consigna)}</p>
      <div class="stage"></div></div>
    ${decorado && !inmersivo ? `<div class="esc-barra">
      <span class="esc-puntos" aria-hidden="true"></span><span class="esc-cuenta"></span>
      ${botones}</div>` : ''}
  </div>`);
  root.append(shell);
  const bar = shell.querySelector('.progress');
  const timerEl = shell.querySelector('.timer');
  const stage = shell.querySelector('.stage');

  // ---------- Barra inferior: avance en puntos (o "n / total"), sonido y pantalla completa ----------
  const puntos = shell.querySelector('.esc-puntos'), cuenta = shell.querySelector('.esc-cuenta');
  // Avance: de la actividad o, dentro de una unidad, de la unidad completa (actividades anteriores + la fracción de esta).
  const avance = frac => tramo ? ((tramo.index + frac) / tramo.total) * 100 : frac * 100;
  const setBar = st => {
    const p = Math.round(avance(st && st.total ? Math.min(st.done / st.total, 1) : 0));
    bar.firstElementChild.style.width = p + '%';
    bar.setAttribute('aria-valuenow', p);
    if (!puntos || !st?.total) return;
    const total = st.total, done = Math.min(st.done || 0, total);
    if (total <= 12) puntos.innerHTML = Array.from({ length: total }, (_, k) => `<i class="${k < done ? 'hecho' : k === done ? 'actual' : ''}"></i>`).join('');
    else puntos.innerHTML = '';
    cuenta.textContent = total > 12 ? `${Math.min(done + 1, total)} / ${total}` : '';
  };
  setBar(saved);
  shell.querySelector('[data-b="sonido"]')?.addEventListener('click', e => {
    const b = e.currentTarget, off = !muted();
    setMuted(off);
    b.innerHTML = off ? ICON.off : ICON.on;
    b.setAttribute('aria-pressed', !off);
    b.setAttribute('aria-label', off ? 'Activar sonido' : 'Silenciar');
  });
  shell.querySelector('[data-b="salir"]')?.addEventListener('click', async () => {
    if (finished || await confirmDialog('¿Salir de la actividad? Tu avance queda guardado y puedes seguir después.', 'Salir')) location.hash = salir.href;
  });
  shell.querySelector('[data-b="full"]')?.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else shell.requestFullscreen?.().catch(() => {});
  });

  // ---------- Chispas al acertar (desde el centro de la ficha) ----------
  const chispas = target => {
    if (!decorado || reduced() || !target?.getBoundingClientRect) return;
    const a = shell.getBoundingClientRect(), b = target.getBoundingClientRect();
    const x = b.left - a.left + b.width / 2, y = b.top - a.top + b.height / 2;
    const box = el('<div class="chispas" aria-hidden="true"></div>');
    box.style.left = x + 'px'; box.style.top = y + 'px';
    for (let k = 0; k < 14; k++) {
      const ang = (k / 14) * Math.PI * 2 + Math.random() * .4, dist = 60 + Math.random() * 70;
      const s = document.createElement('i');
      s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      s.style.setProperty('--c', `var(--chispa${k % 4})`);
      box.append(s);
    }
    shell.append(box);
    setTimeout(() => box.remove(), 900);
  };

  // ---------- Textos largos: clases para achicar la letra y que quepa ----------
  const ajustar = () => {
    stage.querySelectorAll('.option, .q-title').forEach(x => {
      const n = x.textContent.trim().length, q = x.classList.contains('q-title');
      x.classList.toggle('t-largo', n > (q ? 60 : 24));
      x.classList.toggle('t-muy-largo', n > (q ? 120 : 48));
    });
  };

  // ---------- Sonidos y chispas según las clases que ponen las plantillas ----------
  // Con respuestas ocultas (evaluación) no suena ni brilla nada que delate si acertó.
  const TAP = '.option, .chip, .word, .match-item, .mem-card, .bin-chip, .bin, .classify-card';
  const OK = ['correct', 'matched', 'ok'], BAD = ['wrong', 'miss', 'bad'];
  // Se agrupan los cambios de un mismo momento: si hubo algún error suena (y no brilla) solo el error;
  // así, al fallar en el quiz, la ficha correcta que se muestra no lanza chispas.
  let pend = null, okTargets = [];
  const queue = (kind, target) => {
    if (hide) return;
    if (kind === 'ok' && target && !target.classList.contains('feedback')) okTargets.push(target);
    if (!pend) setTimeout(() => {
      if (pend) sound(pend);
      if (pend === 'ok') okTargets.forEach(chispas);
      pend = null; okTargets = [];
    }, 60);
    if (pend !== 'bad') pend = kind === 'bad' ? 'bad' : pend || kind;
  };
  const judge = node => {
    if (node.nodeType !== 1) return;
    for (const x of [node, ...node.querySelectorAll('.correct, .matched, .ok, .wrong, .miss, .bad')]) {
      if (BAD.some(c => x.classList.contains(c))) queue('bad', x);
      else if (OK.some(c => x.classList.contains(c))) queue('ok', x);
    }
  };
  // ---------- Franja de respuesta (pantalla completa): Cebollo reacciona y racha de aciertos ----------
  // Acierto: pulgar (copa desde 3 seguidas). Error: triste.
  let racha = 0;
  const franja = node => {
    if (!inmersivo || hide || node.nodeType !== 1) return;
    const fb = node.matches?.('.feedback') ? node : node.querySelector?.('.feedback');
    if (!fb || fb.dataset.franja || !(fb.classList.contains('ok') || fb.classList.contains('bad'))) return;
    fb.dataset.franja = '1';
    const ok = fb.classList.contains('ok');
    racha = ok ? racha + 1 : 0;
    fb.classList.add('franja');
    const emote = ok ? (racha >= 3 ? 'copa' : 'pulgar') : 'triste';
    fb.insertAdjacentHTML('afterbegin', `<span class="fb-masc ${ok ? 'feliz' : 'triste'}" aria-hidden="true"><img src="${urlEmote(emote)}" alt=""></span>`);
    if (ok && racha >= 2) fb.querySelector(':scope > span:not(.fb-masc)')?.insertAdjacentHTML('beforeend', ` <span class="fb-racha">🔥 ${racha} seguidas</span>`);
  };
  const franjas = inmersivo ? new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(franja))) : null;
  let watcher = null;
  if (decorado) {
    root.addEventListener('pointerdown', e => { if (e.target.closest?.(TAP) && !e.target.closest(':disabled')) sound('tap'); });
    watcher = new MutationObserver(list => {
      let nuevos = false;
      list.forEach(m => {
        if (m.type !== 'attributes') { nuevos = true; return m.addedNodes.forEach(judge); }
        const was = (m.oldValue || '').split(/\s+/);
        const added = [...m.target.classList].filter(c => !was.includes(c));
        if (added.some(c => BAD.includes(c))) queue('bad', m.target); else if (added.some(c => OK.includes(c))) queue('ok', m.target);
      });
      if (nuevos) ajustar();
    });
  }

  const mark = () => { lastInteraction = Date.now(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => root.addEventListener(ev, mark, { passive: true }));

  // Reloj visible: el cronómetro muestra el tiempo activo; la cuenta regresiva va contra la hora de fin.
  const deadline = clock.mode === 'down' ? (clock.deadlineAt || Date.now() + (clock.limitSec || 0) * 1000) : 0;
  const secsLeft = () => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  // Salidas de la pestaña durante la actividad (el docente las ve en Resultados).
  let hidden = clock.hiddenCount || 0;
  const onVis = () => { if (document.visibilityState === 'hidden' && !finished && root.isConnected) { hidden++; safe(() => clock.onHidden?.(hidden)); } };
  document.addEventListener('visibilitychange', onVis);
  const showClock = () => {
    if (clock.mode === 'up') timerEl.textContent = fmtDuration(seconds);
    if (clock.mode === 'down') {
      const left = secsLeft();
      timerEl.textContent = fmtDuration(left);
      timerEl.classList.toggle('warn', left <= 30);
    }
  };
  showClock();
  const timeUp = () => {
    finished = true; clearInterval(tick);
    shell.querySelector('.esc-portada')?.remove();
    sound('bad');
    stage.insertAdjacentHTML('afterbegin', '<div class="time-up" role="alert"><b>¡Se acabó el tiempo!</b><span>Se guardan las respuestas que alcanzaste a dar.</span></div>');
    stage.querySelectorAll('button, input, select, textarea').forEach(x => { x.disabled = true; });
    const r = partialResult(lastState);
    setTimeout(() => safe(() => onFinish({ ...r, durationSec: seconds, timeUp: true })), 1800);
  };
  const tick = setInterval(() => {
    if (finished || !root.isConnected) return stop();
    if (clock.mode === 'down') {
      showClock();
      if (secsLeft() <= 0) return timeUp();
    }
    if (started && document.visibilityState === 'visible' && Date.now() - lastInteraction < IDLE_MS) {
      seconds++;
      showClock();
      if (seconds % 5 === 0 && lastState) safe(() => onProgress(lastState, seconds));
    }
  }, 1000);
  let inst = null; // lo que devuelve la plantilla (opcional { destroy })
  const stop = () => {
    evalMode.hide = false; watcher?.disconnect(); franjas?.disconnect(); clearInterval(tick); document.removeEventListener('visibilitychange', onVis);
    if (document.fullscreenElement === shell) document.exitFullscreen().catch(() => {});
    try { inst?.destroy?.(); } catch {} inst = null;
  };

  const safe = fn => { try { return fn(); } catch (e) { console.error(e); } };

  // ---------- Cierre: puntaje grande y estrellas; luego sigue la plataforma (resultado, siguiente actividad) ----------
  const cierre = (result, done) => {
    const pct = result.maxScore ? result.score / result.maxScore : 0;
    const estrellas = pct >= .9 ? 3 : pct >= .6 ? 2 : pct > 0 ? 1 : 0;
    const frase = hide ? '¡Terminaste!' : ['¡Sigue practicando!', '¡Casi lo logras!', '¡Muy bien!', '¡Excelente!'][estrellas];
    const box = el(`<div class="esc-final" role="status">
      <div class="esc-final-in">
        <div class="esc-emote"></div>
        ${hide ? '' : `<div class="esc-estrellas">${[0, 1, 2].map(k => `<span class="${k < estrellas ? 'on' : ''}" style="animation-delay:${.25 + k * .18}s">★</span>`).join('')}</div>`}
        <b class="esc-final-t">${frase}</b>
        ${hide ? '<span class="esc-final-s">Tu docente revisará tus respuestas.</span>' : `<span class="esc-final-n">${result.score} / ${result.maxScore}</span>`}
        <button type="button" class="esc-empezar">Continuar</button></div></div>`);
    let ido = false;
    const seguir = () => { if (ido) return; ido = true; box.remove(); done(); };
    box.querySelector('button').onclick = seguir;
    // Cebollo reacciona al resultado: copa (3 estrellas), pulgar (2, o evaluación sin nota visible), triste (0-1).
    const emote = hide ? 'pulgar' : ['triste', 'triste', 'pulgar', 'copa'][estrellas];
    safe(() => mostrarEmote(box.querySelector('.esc-emote'), emote, { duracion: 0 }));
    shell.append(box);
    box.querySelector('button').focus({ preventScroll: true });
    setTimeout(seguir, 2800);
  };

  const callbacks = {
    onProgreso(state) {
      if (finished) return;
      lastState = state;
      setBar(state);
      safe(() => onProgress(state, seconds));
    },
    onTerminar(result) {
      if (finished) return;
      finished = true; clearInterval(tick);
      bar.firstElementChild.style.width = avance(1) + '%';
      if (puntos) puntos.querySelectorAll('i').forEach(i => { i.className = 'hecho'; });
      setTimeout(() => sound('end'), 350);
      const fin = () => safe(() => onFinish({ ...result, durationSec: seconds }));
      if (decorado && ceremonia) setTimeout(() => cierre(result, fin), 500); else fin();
    },
  };

  const pintar = () => {
    try {
      inst = tpl.render(stage, activity.content, saved, callbacks) || null;
      ajustar();
      // Se observa después de pintar la primera vez: al retomar no suenan las respuestas viejas.
      watcher?.observe(stage, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
      franjas?.observe(stage, { subtree: true, childList: true });
      // Al retomar, la respuesta ya dada se pinta antes de observar: convertirla también en franja.
      stage.querySelectorAll('.feedback').forEach(franja);
    } catch (e) {
      console.error(e);
      // Si el progreso guardado no sirve, empezar limpio en vez de bloquear.
      if (saved) {
        try { stage.innerHTML = ''; inst = tpl.render(stage, activity.content, null, callbacks) || null; return; } catch (e2) { console.error(e2); }
      }
      stage.innerHTML = `<div class="empty">Esta actividad no se pudo mostrar. Avísale a tu docente.<br><span class="small">${esc(e.message)}</span></div>`;
    }
  };

  // ---------- Portada: título grande y ¡Empezar! ----------
  if (conPortada) {
    const portada = el(`<div class="esc-portada">
      <span class="esc-portada-k">${esc(tpl.label)}</span>
      <h2 class="esc-portada-t">${esc(activity.title || tpl.label)}</h2>
      ${consigna ? `<p class="esc-portada-c">${esc(consigna)}</p>` : ''}
      <button type="button" class="esc-empezar">¡Empezar!</button></div>`);
    shell.append(portada);
    setTimeout(() => sound('start'), 150);
    const go = () => {
      started = true; lastInteraction = Date.now();
      portada.classList.add('sale');
      setTimeout(() => portada.remove(), reduced() ? 0 : 280);
      pintar();
    };
    portada.querySelector('button').onclick = go;
  } else {
    if (decorado) setTimeout(() => sound('start'), 150);
    pintar();
  }
  return { stop };
}
