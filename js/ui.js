// Utilidades de interfaz compartidas.

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const $ = (sel, root = document) => root.querySelector(sel);

// Evaluación sin respuestas: mientras dura la actividad, las plantillas no muestran si acertó ni la respuesta correcta.
// La pone el reproductor (player.js) según la asignación; vuelve a false al salir.
export const evalMode = { hide: false };

// Funciones guardadas pero apagadas. codeLogin: entrada con código de clase + dibujos y la vista "Mis cursos y accesos".
export const FEATURES = { codeLogin: false };
const savedFb = '<span>Respuesta guardada.</span>';
export const neutralFb = () => savedFb;
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let toastTimer;
export function toast(text, kind = '') {
  const t = document.getElementById('toast');
  t.textContent = text; t.className = 'toast ' + kind; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

export function confirmDialog(message, okText = 'Aceptar', danger = false) {
  return new Promise(resolve => {
    const d = el(`<dialog>
      <p style="margin:0 0 20px;font-size:16px">${esc(message)}</p>
      <div class="row end">
        <button class="btn ghost" value="no">Cancelar</button>
        <button class="btn ${danger ? 'danger' : ''}" value="yes">${esc(okText)}</button>
      </div></dialog>`);
    document.body.append(d);
    d.addEventListener('click', e => {
      const v = e.target.closest('button')?.value;
      if (v) d.close(v);
    });
    // Se resuelve una sola vez, al cerrar (botón, Escape o fuera).
    d.addEventListener('close', () => { d.remove(); resolve(d.returnValue === 'yes'); }, { once: true });
    d.showModal();
  });
}

export function fmtDate(iso, withTime = true) {
  if (!iso) return '—';
  const d = new Date(iso);
  const opts = { day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString('es-CO', opts);
}

export function fmtAgo(iso) {
  if (!iso) return 'Nunca';
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 90) return 'Hace un momento';
  if (s < 3600) return `Hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `Hace ${Math.round(s / 3600)} h`;
  if (s < 7 * 86400) return `Hace ${Math.round(s / 86400)} d`;
  return fmtDate(iso, false);
}

// Fecha límite en palabras: "Vence hoy", "Vence mañana", "Vence en 3 días", "Atrasada desde…".
export function fmtDue(iso) {
  if (!iso) return { text: 'Sin fecha límite', cls: '' };
  const d = new Date(iso), now = new Date();
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const days = Math.round((day(d) - day(now)) / 864e5);
  const hour = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  if (d < now) return { text: `Venció ${days === 0 ? 'hoy' : days === -1 ? 'ayer' : 'el ' + fmtDate(iso, false)}`, cls: 'due-late' };
  if (days === 0) return { text: `Vence hoy, ${hour}`, cls: 'due-soon' };
  if (days === 1) return { text: `Vence mañana, ${hour}`, cls: 'due-soon' };
  if (days < 7) return { text: `Vence en ${days} días`, cls: '' };
  return { text: `Vence el ${fmtDate(iso, false)}`, cls: '' };
}

export function fmtDuration(sec) {
  sec = Math.round(sec || 0);
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Nota sobre 10, con un decimal.
export const grade = (score, max) => max ? (Math.round((score / max) * 100) / 10).toFixed(1) : '—';
export const pct = (score, max) => max ? Math.round((score / max) * 100) : 0;

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const svg = (paths, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

// Dibujos de la contraseña de los más pequeños (el índice es lo que se guarda).
export const PICTURES = [
  { e: '🐶', n: 'perro' }, { e: '🐱', n: 'gato' }, { e: '🦊', n: 'zorro' }, { e: '🐸', n: 'rana' }, { e: '🐼', n: 'panda' },
  { e: '🦁', n: 'león' }, { e: '🐵', n: 'mono' }, { e: '🐧', n: 'pingüino' }, { e: '🐢', n: 'tortuga' },
];

export const icons = {
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  quiz: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5v.7"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>'),
  fill: svg('<path d="M4 7h7M15 7h5M4 12h3M11 12h9M4 17h9"/><rect x="11" y="5" width="4" height="4" rx="1"/><rect x="7" y="10" width="4" height="4" rx="1"/>'),
  reorder: svg('<rect x="3" y="5" width="7" height="5" rx="1.5"/><rect x="14" y="5" width="7" height="5" rx="1.5"/><rect x="3" y="14" width="18" height="5" rx="1.5"/><path d="M12 10.5v2"/>'),
  memory: svg('<rect x="3" y="4" width="8" height="11" rx="2"/><rect x="13" y="9" width="8" height="11" rx="2"/><path d="M6 9.5h2M16 14.5h2"/>'),
  matching: svg('<rect x="2.5" y="4" width="7" height="5" rx="1.5"/><rect x="2.5" y="15" width="7" height="5" rx="1.5"/><rect x="14.5" y="4" width="7" height="5" rx="1.5"/><rect x="14.5" y="15" width="7" height="5" rx="1.5"/><path d="M9.5 6.5l5 11M9.5 17.5l5-11"/>'),
  classify: svg('<path d="M4 14h6v6H4zM14 14h6v6h-6z"/><path d="M12 3v5M12 8l-5 5M12 8l5 5"/>'),
  reading: svg('<path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5v13c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path d="M12 6v13"/>'),
  listening: svg('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'),
  dictation: svg('<path d="M4 10v4h3l4 4V6L7 10z"/><path d="M15 9.5a3.5 3.5 0 0 1 0 5"/><path d="M13 20h8"/>'),
  wordsearch: svg('<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M7 8h.01M12 8h.01M17 8h.01M7 16h.01M12 16h.01M17 16h.01"/><rect x="5" y="10" width="14" height="4" rx="2"/>'),
  hangman: svg('<path d="M4 21h9M7 21V3h9v3"/><circle cx="16" cy="9" r="2.5"/><path d="M16 11.5V16M13.5 14h5M16 16l-2 3M16 16l2 3"/>'),
  crossword: svg('<path d="M3 9h6V3h6v6h6v6h-6v6H9v-6H3z"/><path d="M9 9h6v6H9zM3 15h6M15 3v6"/>'),
  unit: svg('<path d="m12 3 9 4.5-9 4.5-9-4.5z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/>'),
  play: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>', 22),
  up: svg('<path d="m6 15 6-6 6 6"/>', 18),
  down: svg('<path d="m6 9 6 6 6-6"/>', 18),
  folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  star: svg('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>', 18),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 18),
  logout: svg('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 8l-4 4 4 4M6 12h10"/>', 20),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 20),
  game: svg('<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="15.5" cy="11.5" r=".9" fill="currentColor"/><circle cx="17.5" cy="13.8" r=".9" fill="currentColor"/>', 20),
  book: svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>', 20),
  chest: svg('<path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 11V9a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v2"/><rect x="10" y="9.5" width="4" height="5" rx="1"/>', 22),
  home: svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>', 20),
  send: svg('<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4z"/>', 20),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', 20),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', 20),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 16),
};

// Encabezado institucional: espacio de logo + nombre del colegio + plataforma.
// Marca provisional de la plataforma ("Pupitre"): pupitre visto de lado con una chispa. Ver contexto/diseno.md.
export const BRAND = 'Pupitre';
export const brandMark = (size = 40) => `<svg class="brand-mark" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
  <rect width="48" height="48" rx="10" fill="#1f3a68"/>
  <path d="M11 21.5h26l-3.2 5.2H14.2z" fill="#fff"/>
  <path d="M15.5 26.7v10.3M32.5 26.7v10.3" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M17 14.6h9.5" stroke="#9fb4dc" stroke-width="3.4" stroke-linecap="round"/>
  <circle cx="34.5" cy="13.5" r="4.2" fill="#ff6b4a"/></svg>`;
// Nombre del colegio solo si es real (el dato de ejemplo "Nombre del colegio" no se muestra).
export const realSchool = name => name && !/^nombre del colegio$/i.test(name.trim()) ? name.trim() : '';
export const brandHTML = (school = {}, size = 40) => `<a class="brand-row" href="#/" aria-label="${BRAND}${realSchool(school.name) ? ' · ' + esc(realSchool(school.name)) : ''}">
  ${school.logo ? `<img class="school-logo" src="${esc(school.logo)}" alt="">` : ''}${brandMark(size)}
  <span><span class="brand-name">${BRAND}</span>${realSchool(school.name) ? `<span class="brand-school">${esc(realSchool(school.name))}</span>` : ''}</span></a>`;

export function headerHTML({ school = {}, user, nav = [], active = '', xp = null, student = null }) {
  const modeBtn = student ? `<button class="mode-toggle" id="mode-toggle" aria-pressed="${student.modo === 'juego'}"
      ${student.forced ? 'aria-disabled="true" title="Tu docente pidió modo serio para esta evaluación"' : 'title="Cambiar entre modo juego y modo serio"'}>
      ${student.modo === 'juego' ? icons.game : icons.book}<span>${student.forced ? 'Modo serio · evaluación' : student.modo === 'juego' ? 'Modo juego' : 'Modo serio'}</span></button>` : '';
  return `<button class="skip-link" id="skip" type="button">Saltar al contenido</button>
  <header class="app-header">
    <div class="bar">
      <div class="brand">${brandHTML(school, 40)}</div>
      <div class="user-box">
        ${modeBtn}
        ${xp !== null ? `<span class="xp-chip" id="xp-chip" title="Tu experiencia acumulada">${icons.star}<span id="xp-val">${xp}</span> XP</span>` : ''}
        ${student ? `<span class="head-avatar">${student.avatarHTML}</span>` : ''}
        ${user.role === 'teacher' ? `
        <details class="more create-menu"><summary class="btn sm">${icons.plus}<span>Crear</span></summary>
          <div class="more-menu"><a href="#/t/create">Actividad</a><a href="#/t/units/new">Unidad</a></div></details>
        <details class="more user-menu"><summary class="user-sum" aria-label="Menú de ${esc(user.name)}">${icons.user}<span class="user-name"><b>${esc(user.name)}</b>Docente</span><span aria-hidden="true">▾</span></summary>
          <div class="more-menu">
            ${FEATURES.codeLogin ? '<a href="#/t/courses">Mis cursos y accesos</a>' : ''}
            <button type="button" id="ia-clave">Clave de IA (Gemini)</button>
            <button type="button" id="reset-demo" class="danger-txt">Reiniciar demo</button>
            <button type="button" id="logout">Salir</button>
          </div></details>` : `
        <div class="user-name"><b>${esc(user.name)}</b>Estudiante</div>
        <button class="btn ghost sm reset-avance" id="reset-progress" type="button" title="Borra tus resultados para hacer las actividades otra vez" aria-label="Reiniciar mi avance"><span aria-hidden="true">↺</span><span class="ra-txt">Reiniciar</span></button>
        <a class="visitar-cebollo ${active === 'cuarto' ? 'active' : ''}" href="#/s/cuarto" title="Visitar a Cebollo" ${active === 'cuarto' ? 'aria-current="page"' : ''}>
          <span class="vc-ceb" aria-hidden="true"><span class="vc-halo"></span><img src="img/cebollo/emotes/sonrisa.webp" alt=""></span><span class="vc-txt">Visitar a Cebollo</span></a>
        <button class="btn ghost sm" id="logout" aria-label="Salir">${icons.logout}<span>Salir</span></button>`}
      </div>
    </div>
    ${nav.length ? `<nav class="nav ${user.role === 'teacher' ? 'bottom' : ''}" aria-label="Secciones">${nav.map(n =>
      `<a href="${n.href}" class="${n.key === active ? 'active' : ''}" ${n.key === active ? 'aria-current="page"' : ''}>${n.icon ? `<span class="nav-ico">${n.icon}</span>` : ''}<span>${esc(n.label)}</span></a>`).join('')}</nav>` : ''}
  </header>`;
}

// Voz del navegador (Web Speech API) para listening y dictado. Gratis y sin red, la calidad depende del equipo.
export const ttsAvailable = () => 'speechSynthesis' in window;
function englishVoice() {
  const v = speechSynthesis.getVoices();
  return v.find(x => /^en(-|_)US/i.test(x.lang) && /natural|online/i.test(x.name)) || v.find(x => /^en(-|_)US/i.test(x.lang))
    || v.find(x => /^en/i.test(x.lang)) || null;
}
if (ttsAvailable()) speechSynthesis.getVoices(); // precarga la lista de voces
export function speak(text, { rate = 1 } = {}) {
  return new Promise(resolve => {
    if (!ttsAvailable()) return resolve(false);
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = rate;
    const v = englishVoice(); if (v) u.voice = v;
    // Chrome a veces no dispara onend: tope de tiempo estimado para no dejar el botón bloqueado.
    const words = text.trim().split(/\s+/).length;
    const cap = setTimeout(() => resolve(true), (words * 500) / rate + 4000);
    u.onend = () => { clearTimeout(cap); resolve(true); };
    u.onerror = () => { clearTimeout(cap); resolve(false); };
    speechSynthesis.speak(u);
  });
}
export const stopSpeaking = () => { if (ttsAvailable()) speechSynthesis.cancel(); };

// Reduce una imagen a máx. 400 px (lado mayor) y la devuelve como dataURL JPEG/PNG.
export function compressImage(file, max = 400) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('El archivo no es una imagen.'));
    const r = new FileReader();
    r.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    r.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen no válida.'));
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

// Menús desplegables (⋮, Ajustes): si al abrirse se salen de la pantalla, se anclan del otro lado.
document.addEventListener('toggle', e => {
  const d = e.target;
  if (!(d instanceof HTMLDetailsElement) || !d.open) return;
  const m = d.querySelector(':scope > .more-menu');
  if (!m) return;
  m.style.left = m.style.right = '';
  const r = m.getBoundingClientRect(), vw = document.documentElement.clientWidth;
  if (r.left < 8) { m.style.left = '0'; m.style.right = 'auto'; }
  else if (r.right > vw - 8) { m.style.right = '0'; m.style.left = 'auto'; }
}, true);
