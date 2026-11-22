// Arranque, sesión, enrutador por hash y seguimiento de conexión.
import { juegosList, juegoPlay } from './views/juegos.js';
import { session, users, schools, events, assignments, resetDemo } from './storage.js';
import { headerHTML, toast, confirmDialog, icons, FEATURES, $ } from './ui.js';
import { coursesView } from './views/courses.js';
import { retosList, retoPlay } from './views/retos.js';
import { cuarto } from './views/cuarto.js';
import { ranking } from './views/ranking.js';
import { renderLogin } from './views/login.js';
import * as teacher from './views/teacher.js';
import * as student from './views/student.js';
import { assign, results } from './views/assign.js';
import { unitsList, unitEditor } from './views/units.js';
import { unitStart, unitWizard } from './views/unit-wizard.js';
import { present } from './views/present.js';
import { DEFAULT_PREFS, backgroundVars, fijarDesbloqueo } from './rewards.js';
import { cebolloMini } from './cebollo.js';
import { mundoHTML } from './mundo.js';
import { configurarClave, claveIA } from './ia.js';

const app = document.getElementById('app');

// Docente: 4 secciones. "Crear" está en el encabezado; Mis actividades y Unidades viven en Biblioteca.
const TEACHER_NAV = [
  { key: 'home', label: 'Mis cursos', href: '#/t/home', icon: icons.home },
  { key: 'library', label: 'Biblioteca', href: '#/t/activities', icon: icons.folder },
  { key: 'assign', label: 'Asignaciones', href: '#/t/assign', icon: icons.send },
  { key: 'results', label: 'Resultados', href: '#/t/results', icon: icons.chart },
];
// Pestañas de la Biblioteca (debajo del menú).
const LIBRARY_TABS = [
  { path: '/t/activities', label: 'Mis actividades' },
  { path: '/t/units', label: 'Unidades' },
  { path: '/t/juegos', label: 'Juegos' },
];
// Gamificación (2026-11-21): Misiones (antes "Mis tareas") y Clasificación. La colección se abre desde el cofre
// y el cuarto de Cebollo desde el botón "Visitar a Cebollo" del encabezado (ui.js), no desde las pestañas.
const STUDENT_NAV = [
  { key: 'tasks', label: 'Misiones', href: '#/s/tasks' },
  { key: 'retos', label: 'Retos', href: '#/s/retos' },
  { key: 'juegos', label: 'Juegos', href: '#/s/juegos' },
  { key: 'ranking', label: 'Clasificación', href: '#/s/ranking' },
];

// Rutas: patrón → [rol, sección activa, vista]
const routes = [
  ['/t/home', 'teacher', 'home', teacher.home],
  ['/t/course/:id', 'teacher', 'home', teacher.course],
  ['/t/create', 'teacher', 'library', teacher.chooseType],
  ['/t/new/:type', 'teacher', 'library', teacher.editor],
  ['/t/edit/:id', 'teacher', 'library', teacher.editor],
  ['/t/preview/:id', 'teacher', 'library', teacher.preview],
  ['/t/activities', 'teacher', 'library', teacher.activitiesList],
  ['/t/present/:id', 'teacher', 'library', present],
  ['/t/units', 'teacher', 'library', unitsList],
  ['/t/units/new', 'teacher', 'library', unitStart],
  ['/t/units/manual', 'teacher', 'library', unitEditor],
  ['/t/units/ayuda', 'teacher', 'library', unitWizard],
  ['/t/units/edit/:id', 'teacher', 'library', unitEditor],
  ...(FEATURES.codeLogin ? [['/t/courses', 'teacher', 'courses', coursesView]] : []),
  ['/t/assign', 'teacher', 'assign', assign],
  ['/t/results', 'teacher', 'results', results],
  ['/s/tasks', 'student', 'tasks', student.tasks],
  ['/s/unit/:id', 'student', 'tasks', student.unit],
  ['/s/play/:id', 'student', 'tasks', student.play],
  ['/s/play/:id/:act', 'student', 'tasks', student.play],
  ['/s/result/:id', 'student', 'tasks', student.result],
  ['/s/collection', 'student', '', student.collection],
  ['/s/ranking', 'student', 'ranking', ranking],
  ['/s/cuarto', 'student', 'cuarto', cuarto],
  ['/s/practice', 'student', 'tasks', student.practice],
  ['/s/retos', 'student', 'retos', retosList],
  ['/s/juegos', 'student', 'juegos', juegosList],
  ['/s/juego/:id', 'student', 'juegos', juegoPlay],
  ['/t/juegos', 'teacher', 'library', juegosList],
  ['/t/juego/:id', 'teacher', 'library', juegoPlay],
  ['/s/reto/:id', 'student', 'retos', retoPlay],
];

function match(path) {
  for (const [pattern, role, section, view] of routes) {
    const pp = pattern.split('/'), xp = path.split('/');
    if (pp.length !== xp.length) continue;
    const params = {};
    if (pp.every((p, i) => p.startsWith(':') ? (params[p.slice(1)] = decodeURIComponent(xp[i]), true) : p === xp[i]))
      return { role, section, view, params };
  }
  return null;
}

export const go = hash => { location.hash = hash; };

// Skin del estudiante: modo juego (estética del portal) o modo serio (institucional). El docente siempre ve el institucional.
function applySkin(info) {
  const r = document.documentElement;
  if (!info) { delete r.dataset.modo; r.removeAttribute('style'); return; }
  r.dataset.modo = info.modo;
  r.setAttribute('style', info.modo === 'juego' ? backgroundVars(info.fondo) : '');
}
// Las vistas piden volver a pintar (p. ej. al equipar un fondo) sin importar app.js.
addEventListener('plat-refresh', () => router());
// Otra pestaña cambió los datos: repintar, salvo en pantallas donde se está trabajando (actividad, editor, presentar).
addEventListener('plat-external', e => {
  if (e.detail === 'session') return router();
  const path = location.hash.slice(1).split('?')[0];
  if (/^\/(s\/play|t\/present|t\/new|t\/edit|t\/units\/(new|manual|ayuda|edit))/.test(path)) return;
  router();
});

let currentUser = null;
let cleanup = null;

async function router() {
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  const s = await session.get();
  const school = await schools.current();

  if (!s) { currentUser = null; applySkin(null); return renderLogin(app, school, onLogin); }
  currentUser = await users.get(s.userId);
  fijarDesbloqueo(currentUser);
  const home = currentUser.role === 'teacher' ? '#/t/home' : '#/s/tasks';
  const m = match(path);
  if (!m || m.role !== currentUser.role) return go(home);

  const isStudent = currentUser.role === 'student';
  const xp = isStudent ? await student.xpTotal(currentUser.id) : null;
  let info = null;
  if (isStudent) {
    const prefs = { ...DEFAULT_PREFS, ...(currentUser.prefs || {}) };
    // El docente puede forzar el modo serio en una evaluación: solo mientras se hace esa actividad.
    const forced = path.startsWith('/s/play/') && !!(await assignments.get(m.params.id))?.forceSerious;
    // Cebollo del encabezado: triste mientras el estudiante no ha jugado hoy.
    const jugoHoy = (await student.streakOf(currentUser.id)).hoy;
    info = { ...prefs, modo: forced ? 'serio' : prefs.modo, forced, avatarHTML: cebolloMini(prefs.ropa, 36, { vivo: true, triste: !jugoHoy }) };
    currentUser.prefs = prefs;
  }
  applySkin(info);
  // Jugar (tarea, repaso o reto) es a pantalla completa: sin encabezado ni pestañas de la plataforma.
  const inmersivo = isStudent && /^\/s\/(play|practice|reto|juego)\//.test(path + '/');
  document.body.classList.toggle('inmersivo', inmersivo);
  if (inmersivo) app.innerHTML = '<main class="main juego-main" id="main"></main>';
  else app.innerHTML = headerHTML({
    school, user: currentUser, active: m.section, xp, student: info,
    nav: currentUser.role === 'teacher' ? TEACHER_NAV : STUDENT_NAV,
  }) + (LIBRARY_TABS.some(t => t.path === path) ? `<nav class="subnav" aria-label="Biblioteca">${LIBRARY_TABS.map(t =>
    `<a href="#${t.path}" class="${t.path === path ? 'active' : ''}" ${t.path === path ? 'aria-current="page"' : ''}>${t.label}</a>`).join('')}</nav>` : '')
    + '<main class="main" id="main"></main>' + (info?.modo === 'juego' ? mundoHTML() : '');
  document.body.classList.toggle('has-bottom-nav', currentUser.role === 'teacher');
  const mt = $('#mode-toggle');
  const lo = $('#logout'), sk = $('#skip');
  if (mt) mt.onclick = async () => {
    if (info.forced) return toast('Tu docente pidió modo serio para esta evaluación.');
    await users.setPrefs(currentUser.id, { modo: info.modo === 'juego' ? 'serio' : 'juego' });
    router();
  };
  if (lo) lo.onclick = async () => { await session.logout(); currentUser = null; navigate('#/login'); };
  if (sk) sk.onclick = () => { const h = $('#main h1') || $('#main'); h.tabIndex = -1; h.focus(); };
  const rp = $('#reset-progress');
  if (rp) rp.onclick = async () => {
    if (await confirmDialog('Se borrarán tus resultados, XP, cofres y colección para que puedas hacer todas las actividades otra vez.', 'Reiniciar', true)) {
      await users.resetProgress(currentUser.id); toast('Listo: puedes hacer las actividades de nuevo.'); router();
    }
  };
  const ik = $('#ia-clave');
  if (ik) ik.onclick = async () => {
    ik.closest('details').open = false;
    const antes = claveIA(), ahora = await configurarClave();
    if (ahora !== antes) toast(ahora ? 'Clave guardada en este navegador.' : 'Clave quitada.');
  };
  const rd = $('#reset-demo');
  if (rd) rd.onclick = async () => {
    if (await confirmDialog('Prototipo: los datos viven en este navegador. Se borrarán todas las actividades, asignaciones y resultados.', 'Reiniciar', true)) {
      await resetDemo(); location.hash = '#/login'; location.reload();
    }
  };
  events.log(currentUser.id, 'open_section', { path });
  window.scrollTo(0, 0);
  try {
    cleanup = await m.view($('#main'), { user: currentUser, school, params: m.params, query }) || null;
    // Lectores de pantalla: el foco va al título de la nueva vista (en actividades lo maneja la plantilla).
    const h = !/^\/(s\/play|t\/present)/.test(path) && $('#main h1');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    // Modo juego: la letra pixel solo en títulos cortos; los largos usan la letra normal para leerse bien.
    document.querySelectorAll('#main .page-head h1, #main .hero-hi').forEach(t => t.classList.toggle('long', t.textContent.trim().length > 20));
  } catch (e) {
    console.error(e);
    events.log(currentUser.id, 'error', { path, message: String(e?.message || e).slice(0, 200) });
    $('#main').innerHTML = `<div class="card empty">Algo salió mal al abrir esta sección.
      <div class="row" style="justify-content:center;margin-top:12px"><button class="btn" type="button" id="retry">Reintentar</button>
      <a class="btn ghost" href="${home}">Ir al inicio</a></div></div>`;
    $('#retry').onclick = () => router();
  }
}

// Si el hash no cambia, hashchange no se dispara: renderizar a mano.
function navigate(hash) {
  if (location.hash === hash) router(); else go(hash);
}

function onLogin(user) {
  navigate(user.role === 'teacher' ? '#/t/home' : '#/s/tasks');
}

// Presencia: actualizar "última conexión" cada 30 s si la pestaña está visible y hubo interacción reciente.
let lastAct = Date.now();
['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
setInterval(() => {
  if (currentUser && document.visibilityState === 'visible' && Date.now() - lastAct < 120_000) users.touch(currentUser.id);
}, 30_000);
addEventListener('pagehide', () => { if (currentUser) users.touch(currentUser.id); });

// Cerrar los menús desplegables (Crear, usuario, "Más") al tocar fuera o con Escape.
document.addEventListener('click', e => { document.querySelectorAll('details.more[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; }); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('details.more[open]').forEach(d => { d.open = false; d.querySelector('summary')?.focus(); }); });
// Un menú desplegable abierto nunca debe salirse de la pantalla (en celular el botón puede quedar a la izquierda).
document.addEventListener('toggle', e => {
  const d = e.target;
  if (!(d instanceof HTMLDetailsElement) || !d.open) return;
  const m = d.querySelector(':scope > .more-menu');
  if (!m) return;
  m.style.left = m.style.right = '';
  const r = m.getBoundingClientRect(), W = document.documentElement.clientWidth;
  if (r.left < 8) { m.style.left = '0'; m.style.right = 'auto'; }
  else if (r.right > W - 8) { m.style.right = '0'; m.style.left = 'auto'; }
}, true);
addEventListener('storage-error', () => toast('No se pudo guardar en este navegador (¿espacio lleno?). Tu avance sigue en pantalla.', 'err'));
addEventListener('hashchange', router);
router();
