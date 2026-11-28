// Envoltura de la plataforma alrededor de cualquier plantilla: barra de progreso, cronómetro,
// autoguardado y protección ante errores (nunca sacar al estudiante de la actividad).
// Con un estilo visual (js/temas.js) la actividad se juega dentro de un "escenario": portada con ¡Empezar!,
// barra inferior (avance en puntos, sonido, pantalla completa), chispas al acertar y cierre con estrellas.
import { el, esc, fmtDuration, evalMode, confirmDialog, icons } from './ui.js';
import { templates } from './templates/index.js';
import { themeById, themeSound, DEFAULT_THEME, temaPara } from './temas.js';
import { mostrarEmote, urlEmote, emoteAcierto, emoteFig, cambiarEmote } from './cebollo.js';

const IDLE_MS = 60_000; // sin interacción por más de 1 min → no cuenta tiempo
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Sonido encendido/apagado: preferencia de este navegador (solo comodidad).
const muted = () => { try { return localStorage.getItem('plat.sonido') === 'off'; } catch { return false; } };
const setMuted = v => { try { localStorage.setItem('plat.sonido', v ? 'off' : 'on'); } catch {} };

const ICON = {
  on: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  off: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  cerrar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
  unidad: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="6" r="1.8" fill="currentColor"/><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="5" cy="18" r="1.8" fill="currentColor"/><path d="M10 6h10M10 12h10M10 18h10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
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
  anagram: 'Put the letters in order.',
  diagram: 'Drag the labels to the picture.',
  random: '',
};

// clock: { mode: 'up' (cronómetro) | 'down' (cuenta regresiva) | 'none', limitSec, deadlineAt (ms), onHidden(n) }. Lo decide el docente.
// La cuenta regresiva usa una hora fija de fin (deadlineAt): sigue corriendo aunque cambie de pestaña o cierre la página.
// theme: fuerza un estilo visual (vista previa del editor, presentar); si no, el de la actividad.
// ceremonia: portada y cierre del escenario (Presentar lo apaga: va pregunta por pregunta).
// salir: { href } → reproductor a pantalla completa (estudiante): ✕ arriba, una sola barra de avance, franja de respuesta.
// tramo: { index, total } → la barra muestra el avance de toda la unidad (actividad index de total).
// unidad: { href } → botón "Ver unidad" junto a la ✕: muestra el camino de la unidad (el avance queda guardado).
// portada: false la quita (dentro de una unidad se pasa directo a la actividad).
// colores: true deja las fichas de colores del estilo (Presentar en clase); si no, fichas neutras y verde/rojo solo al corregir.
// finalFijo + onReplay: el cierre queda dentro del escenario (puntaje, tiempo, "Volver a empezar"); lo usa la vista previa del docente.
export function mountPlayer(root, { activity, saved = null, durationSec = 0, onProgress = () => {}, onFinish = () => {}, clock = { mode: 'up' }, hideAnswers = false, theme = null, ceremonia = true,
  salir = null, unidad = null, tramo = null, portada = true, colores = false, encabezado = null, finalFijo = false, onReplay = null, revisar = null }) {
  evalMode.hide = !!hideAnswers;
  evalMode.alFinal = revisar === 'final' ? true : revisar === 'auto' ? false : null;
  evalMode.fin = tramo ? 'Continuar' : 'Ver resultado';
  const hide = !!hideAnswers;
  // Modo serio (elegido por el estudiante o forzado en una evaluación): sin decoración ni sonidos.
  const serio = document.documentElement.dataset.modo === 'serio';
  const tema = serio ? 'sencillo' : temaPara(theme || activity.theme || DEFAULT_THEME, activity.type);
  const decorado = tema !== 'sencillo';
  const sound = kind => { if (decorado && !muted()) themeSound(tema, kind); };
  const tpl = templates[activity.type];
  // Instrucción para el estudiante (como en Cambridge One): la del docente/IA o una general del tipo.
  const consigna = (activity.instruction || '').trim() || CONSIGNA[activity.type] || '';
  // Estilo por defecto en las actividades de unidad (2026-11-28, maqueta aprobada por el docente): la instrucción va en un globo
  // (sin Cebollo: un solo Cebollo por escena, el que reacciona abajo al responder),
  // en español grande y debajo la consigna en inglés. Los demás estilos y plantillas siguen con la consigna de siempre.
  const GLOBO = { reorder: 'Ordena la oración', quiz: 'Elige la respuesta correcta', reading: 'Lee el texto y responde',
    listening: 'Escucha y responde', fill: 'Completa la oración' };
  const globo = tema === 'clasico' ? GLOBO[activity.type] || '' : '';
  let seconds = durationSec || 0;
  let lastInteraction = Date.now();
  let finished = false;
  let lastState = saved;
  // Portada solo al empezar de cero (al retomar se entra directo).
  const conPortada = decorado && ceremonia && portada && !(saved && (saved.done || saved.answers?.length || saved.i));
  let started = !conPortada;

  root.innerHTML = '';
  const inmersivo = !!salir;
  // Como en WordWall: fuera de la pantalla completa del estudiante, tras responder se avanza solo (un toque adelanta).
  // No en evaluaciones (respuestas ocultas) ni en Presentar (sin ceremonia: el docente lleva el ritmo).
  const autoAvance = decorado && !inmersivo && !hide && ceremonia;
  // Cebollo del cierre: se precarga para que su marco no aparezca vacío.
  if (decorado && ceremonia && !finalFijo) ['pulgar', 'sonrisa', 'ok', 'brazos', 'triste', 'copa'].forEach(n => { const i = new Image(); i.src = urlEmote(n); });
  const botones = `<span class="esc-btns">
        <button type="button" class="esc-btn" data-b="sonido" aria-label="${muted() ? 'Activar sonido' : 'Silenciar'}" aria-pressed="${!muted()}">${muted() ? ICON.off : ICON.on}</button>
        <button type="button" class="esc-btn" data-b="full" aria-label="Pantalla completa">${ICON.full}</button></span>`;
  const shell = el(`<div class="player escenario ${decorado ? 'tematico' : ''} ${inmersivo ? 'inmersivo' : ''} ${colores ? '' : 'neutro'}" data-tema="${tema}" data-tipo="${esc(activity.type)}">
    ${decorado ? '<div class="esc-fondo" aria-hidden="true"></div>' : ''}
    <div class="player-top">
      ${inmersivo ? `<button type="button" class="esc-btn esc-salir" data-b="salir" aria-label="Salir (tu avance queda guardado)">${ICON.cerrar}</button>` : ''}
      ${inmersivo && unidad ? `<button type="button" class="esc-btn esc-unidad" data-b="unidad" title="Ver las actividades de la unidad (tu avance queda guardado)">${ICON.unidad}<span>Ver unidad</span></button>` : ''}
      ${inmersivo && !decorado && encabezado ? `<div class="pt-head"><b>${esc(encabezado.titulo)}</b>${encabezado.detalle ? `<span>${esc(encabezado.detalle)}</span>` : ''}</div>` : ''}
      <div class="progress" role="progressbar" aria-label="Progreso" aria-valuemin="0" aria-valuemax="100"><i style="width:0%"></i></div>
      <span class="timer ${clock.mode === 'none' ? 'off' : ''} ${clock.mode === 'down' ? 'down' : ''}" aria-label="${clock.mode === 'down' ? 'Tiempo restante' : 'Tiempo'}" ${clock.mode === 'none' ? 'hidden' : ''}></span>
      ${decorado && !inmersivo && !hide ? '<span class="esc-aciertos" aria-label="Aciertos">✓ <b>0</b></span>' : ''}
      ${inmersivo && decorado ? botones : ''}
    </div>
    <div class="esc-cuerpo ${decorado ? '' : 'card'}">
      ${globo ? `<div class="consigna con-ceb"><p><b>${globo}</b>${consigna ? `<small>${esc(consigna)}</small>` : ''}</p></div>` : `<p class="consigna">${esc(consigna)}</p>`}
      <div class="stage"></div></div>
    ${decorado && !inmersivo ? `<div class="esc-barra">
      <span class="esc-puntos" aria-hidden="true"></span><span class="esc-cuenta"></span>
      ${botones}</div>` : ''}
  </div>`);
  root.append(shell);
  // ---------- Cebollo acompaña (pantalla completa del estudiante, 2026-11-22) ----------
  // Aparece en la esquina al responder (Comprobar, elegir opción, hacer una pareja…) y se va a los 2 s; en todas las plantillas (antes solo salía en la franja de respuesta, que Emparejar, Memoria,
  // Clasificar, Sopa o Crucigrama no tienen). Reacciona a los mismos aciertos/errores que suenan (queue); en evaluación
  // (respuestas ocultas) se queda quieto para no delatar nada.
  const compa = inmersivo && decorado ? el(`<div class="esc-compa emote-caja" aria-hidden="true">${emoteFig('sonrisa')}</div>`) : null;
  if (compa) shell.append(compa);
  let rachaCompa = 0, compaT = null, compaFb = null;
  // fb: mensaje con botón (Siguiente/Continuar). Entonces Cebollo se queda hasta que ese mensaje se va (al avanzar);
  // si no hay mensaje (una pareja, una carta…), se va solo a los 2 s.
  const reaccionar = (ok, fb = null) => {
    if (!compa) return;
    rachaCompa = ok ? rachaCompa + 1 : 0;
    cambiarEmote(compa.querySelector('.emote-fig'), ok ? (rachaCompa >= 3 ? 'copa' : emoteAcierto()) : 'triste');
    compa.classList.remove('feliz', 'triste'); void compa.offsetWidth; compa.classList.add(ok ? 'feliz' : 'triste');
    compa.classList.add('ve');
    clearTimeout(compaT);
    compaFb = fb;
    if (!fb) compaT = setTimeout(() => compa.classList.remove('ve'), 2200); // se va solo: no está siempre en pantalla
  };
  // Lo llama el observador de la actividad: el mensaje se fue (pulsó Siguiente) → Cebollo también.
  const compaSigue = () => { if (compaFb && !compaFb.isConnected) { compaFb = null; compa?.classList.remove('ve'); } };
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
    const aciertos = shell.querySelector('.esc-aciertos b');
    if (aciertos && Array.isArray(st?.answers)) aciertos.textContent = st.answers.filter(a => a?.correct).length;
    if (!puntos || !st?.total) return;
    const total = st.total, done = Math.min(st.done || 0, total);
    // Como en WordWall: "2 de 4" (los puntos quedan solo en Presentar, que oculta esta barra).
    puntos.innerHTML = '';
    const actual = Number.isInteger(st.i) ? st.i + 1 : done + 1; // la pregunta en pantalla (no cambia al responder)
    cuenta.textContent = `${Math.min(actual, total)} de ${total}`;
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
  // Ver la unidad no pide confirmar: se guarda el avance (y el tiempo) y se vuelve a la actividad desde el camino.
  shell.querySelector('[data-b="unidad"]')?.addEventListener('click', () => {
    if (!finished && lastState) safe(() => onProgress(lastState, seconds));
    location.hash = unidad.href;
  });
  // Pantalla completa; si el navegador no la concede (iPhone, marcos), el escenario se agranda a toda la ventana.
  shell.querySelector('[data-b="full"]')?.addEventListener('click', () => {
    if (document.fullscreenElement) return void document.exitFullscreen().catch(() => {});
    if (shell.classList.contains('esc-max')) return void shell.classList.remove('esc-max');
    const pedir = shell.requestFullscreen || shell.webkitRequestFullscreen;
    const max = () => shell.classList.add('esc-max');
    try { const p = pedir?.call(shell); if (p?.catch) p.catch(max); else if (!pedir) max(); } catch { max(); }
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
    encajar();
  };
  // Escenario fijo (quiz fuera de la pantalla completa): la letra de cada ficha es la más grande que cabe en ella.
  const fichasFijas = decorado && !inmersivo && activity.type === 'quiz';
  const encajar = () => {
    if (!fichasFijas) return;
    stage.querySelectorAll('.option').forEach(b => {
      const t = b.querySelector('span:not(.key)');
      if (!t || !b.clientHeight) return;
      const cs = getComputedStyle(b);
      const w = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 8;
      const h = b.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 4;
      let px = Math.min(80, Math.floor(h * .5));
      t.style.display = 'block'; t.style.width = w + 'px'; t.style.lineHeight = '1.1'; t.style.overflowWrap = 'normal'; // una palabra larga achica la letra, no se corta
      t.style.fontSize = px + 'px';
      while (px > 14 && (t.scrollWidth > t.clientWidth + 1 || t.offsetHeight > h)) { px -= 2; t.style.fontSize = px + 'px'; }
    });
  };
  if (fichasFijas) new ResizeObserver(() => encajar()).observe(shell);

  // ---------- Sonidos y chispas según las clases que ponen las plantillas ----------
  // Con respuestas ocultas (evaluación) no suena ni brilla nada que delate si acertó.
  const TAP = '.option, .chip, .word, .match-item, .mem-card, .bin-chip, .bin, .classify-card';
  const OK = ['correct', 'matched', 'ok'], BAD = ['wrong', 'miss', 'bad'];
  // Se agrupan los cambios de un mismo momento: si hubo algún error suena (y no brilla) solo el error;
  // así, al fallar en el quiz, la ficha correcta que se muestra no lanza chispas.
  let pend = null, okTargets = [], reacciona = false, fbBoton = null, logro = false;
  const queue = (kind, target) => {
    if (hide) return;
    // En "Colores" la ficha correcta lleva su palomita dibujada (como WordWall): sin chispas encima.
    // Tampoco en las letras del ahorcado ni en las palabras de reordenar (destellan y se marcan solas).
    if (kind === 'ok' && target && !target.classList.contains('feedback') && !target.matches('.hm-key, .slots.linea .word, input.gap')
      && !(tema === 'clasico' && target.classList.contains('option'))) okTargets.push(target);
    // Cebollo no sale por cada palabra que se fija en Ordenar: solo cuando la oración entera queda revisada (la línea y el
    // mensaje de correcto/incorrecto también entran por aquí). Pedido del docente, 2026-11-22.
    if (!target?.matches?.('.slots.linea .word')) reacciona = true;
    if (target?.matches?.('.feedback') && target.querySelector('button')) fbBoton = target;
    // Oración de Ordenar completa: sonido de logro (más largo) en vez del acierto de cada palabra.
    if (kind === 'ok' && activity.type === 'reorder' && target?.matches?.('.feedback.ok, .slots.linea.ok')) logro = true;
    if (!pend) setTimeout(() => {
      if (pend) { sound(pend === 'ok' && logro ? 'logro' : pend); if (reacciona) reaccionar(pend === 'ok', fbBoton); }
      if (pend === 'ok') okTargets.forEach(chispas);
      pend = null; okTargets = []; reacciona = false; fbBoton = null; logro = false;
    }, 60);
    if (pend !== 'bad') pend = kind === 'bad' ? 'bad' : pend || kind;
  };
  const judge = node => {
    if (node.nodeType !== 1) return;
    for (const x of [node, ...node.querySelectorAll('.correct, .matched, .ok, .wrong, .miss, .bad')]) {
      // Ordenar reacomoda las palabras volviéndolas a insertar: eso no es un acierto nuevo (lo nuevo llega como cambio de clase).
      if (x.matches('.slots.linea .word')) continue;
      if (BAD.some(c => x.classList.contains(c))) queue('bad', x);
      else if (OK.some(c => x.classList.contains(c))) queue('ok', x);
    }
  };
  // ---------- Franja de respuesta (pantalla completa): Cebollo reacciona y racha de aciertos ----------
  // La franja muestra la racha; la reacción de Cebollo la hace el compañero de la esquina (pulgar, sonrisa, 👌 o brazos; copa desde 3 seguidas; triste al fallar).
  let racha = 0;
  const franja = node => {
    if (!inmersivo || hide || node.nodeType !== 1) return;
    const fb = node.matches?.('.feedback') ? node : node.querySelector?.('.feedback');
    if (!fb || fb.dataset.franja || !(fb.classList.contains('ok') || fb.classList.contains('bad'))) return;
    fb.dataset.franja = '1';
    const ok = fb.classList.contains('ok');
    racha = ok ? racha + 1 : 0;
    fb.classList.add('franja');
    // Cebollo ya no va dentro de la franja: es el compañero de la esquina (esc-compa), que reacciona solo.
    if (ok && racha >= 2) fb.querySelector(':scope > span:not(.fb-masc)')?.insertAdjacentHTML('beforeend', ` <span class="fb-racha">${icons.flame} ${racha} seguidas</span>`);
  };
  const franjas = inmersivo ? new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(franja))) : null;
  // ---------- Avance automático (vista previa y actividades sueltas con estilo) ----------
  // La plantilla sigue poniendo su mensaje con "Siguiente"; aquí se oculta el botón y se pulsa solo.
  // Quiz y ahorcado ya muestran la respuesta en las fichas/letras; Reordenar y Completar dejan ver la corrección un poco más.
  const conCorreccion = ['reorder', 'fill', 'dictation'].includes(activity.type);
  let autoT = null;
  const auto = node => {
    if (node.nodeType !== 1) return;
    const fb = node.matches?.('.feedback') ? node : node.querySelector?.('.feedback');
    if (!fb || fb.dataset.auto || !(fb.classList.contains('ok') || fb.classList.contains('bad'))) return;
    // Solo el botón de avanzar (data-next); si hay varios sin marcar, o ninguno (avisos por palabra), no se avanza solo.
    const btns = fb.querySelectorAll('button');
    const btn = fb.querySelector('[data-next]') || (btns.length === 1 ? btns[0] : null);
    if (!btn) return;
    fb.dataset.auto = '1';
    const ok = fb.classList.contains('ok');
    fb.classList.add('auto', (conCorreccion && !ok) || btns.length > 1 ? 'auto-ver' : 'auto-oculto');
    let ido = false;
    const ir = () => { if (ido || !btn.isConnected) return; ido = true; clearTimeout(autoT); stage.removeEventListener('pointerdown', ir); btn.click(); };
    clearTimeout(autoT);
    autoT = setTimeout(ir, ok ? 1600 : conCorreccion ? 3200 : 2300);
    // Un toque en el escenario adelanta (después de un instante, para no saltarse la animación de la marca).
    setTimeout(() => stage.addEventListener('pointerdown', ir, { once: true }), 500);
  };
  const autos = autoAvance ? new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(auto))) : null;
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
      if (nuevos) { ajustar(); compaSigue(); }
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
    evalMode.hide = false; evalMode.alFinal = null; clearTimeout(compaT); watcher?.disconnect(); franjas?.disconnect(); autos?.disconnect(); clearTimeout(autoT); clearInterval(tick); document.removeEventListener('visibilitychange', onVis);
    if (document.fullscreenElement === shell) document.exitFullscreen().catch(() => {});
    try { inst?.destroy?.(); } catch {} inst = null;
  };

  const safe = fn => { try { return fn(); } catch (e) { console.error(e); } };

  // ---------- Cierre: puntaje grande y estrellas; luego sigue la plataforma (resultado, siguiente actividad) ----------
  // Vista previa (finalFijo): "¡Terminaste!" con contorno y una tarjeta compacta que se queda: puntaje, tiempo, volver a empezar.
  const cierreFijo = (result, done) => {
    stage.replaceChildren();
    const box = el(`<div class="esc-final fijo" role="status">
      <b class="esc-fin-titulo">¡Terminaste!</b>
      <div class="esc-fin-tarjeta">
        <div class="esc-fin-datos">
          ${hide ? '' : `<span><small>Puntuación</small><b>${result.score}<i>/${result.maxScore}</i></b></span>`}
          <span><small>Tiempo</small><b>${fmtDuration(seconds)}</b></span></div>
        ${onReplay ? '<button type="button" class="esc-fin-op" data-replay>Volver a empezar</button>' : ''}</div></div>`);
    box.querySelector('[data-replay]')?.addEventListener('click', () => onReplay());
    shell.append(box);
    done();
  };
  const cierre = (result, done) => {
    if (finalFijo) return cierreFijo(result, done);
    // La última pregunta no queda asomada (con su "Ver resultado") detrás ni después del cierre.
    stage.replaceChildren();
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
    // Cebollo reacciona al resultado: copa (3 estrellas), un gesto de acierto (2, o evaluación sin nota visible), triste (0-1).
    const emote = hide || estrellas === 2 ? emoteAcierto() : estrellas === 3 ? 'copa' : 'triste';
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
      autos?.observe(stage, { subtree: true, childList: true });
      // Al retomar, la respuesta ya dada se pinta antes de observar: convertirla también en franja.
      stage.querySelectorAll('.feedback').forEach(franja);
      if (autos) stage.querySelectorAll('.feedback').forEach(auto);
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
