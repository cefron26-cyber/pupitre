// Estilos visuales de las actividades (como los "visual styles" de Wordwall, con arte propio).
// El docente elige uno por actividad (activity.theme). Solo cambia el aspecto, las animaciones y los sonidos:
// el contenido, la nota y el guardado son los mismos. Estilos en css/temas.css bajo .escenario[data-tema="…"].
// Modo serio del estudiante (o evaluación con modo serio forzado) → siempre "sencillo" y sin sonidos.
import { audio, tone, noise, bell, vary } from './sfx.js';

export const DEFAULT_THEME = 'clasico';
// Regla del docente (2026-11-22): una unidad se ve siempre con un solo estilo, el básico; el estilo propio de cada
// actividad solo se usa cuando se juega suelta. Lo aplican student.js (jugar), present.js (presentar) y el asistente.
export const UNIT_THEME = DEFAULT_THEME;

// kit = juego de sonidos (abajo). Orden = orden en el selector.
export const THEMES = [
  { id: 'clasico',  name: 'Colores',         desc: 'Fichas de colores sobre fondo claro.', kit: 'pop' },
  { id: 'concurso', name: 'Gran show',       desc: 'Set de TV con focos y fichas doradas.', kit: 'show' },
  { id: 'cuaderno', name: 'Cuaderno',        desc: 'Hoja rayada con dibujos y resaltador.', kit: 'tiza' },
  { id: 'pizarra',  name: 'Pizarra',         desc: 'Tiza blanca sobre pizarra verde.', kit: 'tiza' },
  { id: 'espacio',  name: 'Espacio',         desc: 'Estrellas, planetas y neón.', kit: 'espacio' },
  { id: 'oceano',   name: 'Océano',          desc: 'Burbujas y luz bajo el agua.', kit: 'burbujas' },
  { id: 'cielo',    name: 'Cielo',           desc: 'Cielo abierto con fichas de nube.', kit: 'suave' },
  { id: 'corcho',   name: 'Mural',           desc: 'Notas adhesivas con chinches.', kit: 'papel' },
  { id: 'pixel',    name: 'Aventura pixel',  desc: 'Paisaje y bloques de juego retro.', kit: 'arcade' },
  { id: 'sencillo', name: 'Sencillo',        desc: 'Sin decoración. Ideal para evaluaciones.', kit: null },
];

export const themeById = id => THEMES.find(t => t.id === id) || THEMES.find(t => t.id === DEFAULT_THEME);

// Miniatura del selector: un escenario en pequeño con el fondo y cuatro fichas del tema.
export const themeThumb = id => `<span class="tema-mini escenario tematico" data-tema="${id}" aria-hidden="true">
  <span class="esc-fondo"></span><span class="tm-q"></span>
  <span class="tm-opts"><i></i><i></i><i></i><i></i></span></span>`;

// Rejilla de selección (editor y vista previa). onPick(id) al elegir.
export function themePicker(container, value, onPick) {
  container.innerHTML = `<div class="tema-grid" role="radiogroup" aria-label="Estilo visual">${THEMES.map(t => `
    <button type="button" class="tema-op" role="radio" data-id="${t.id}" aria-checked="${t.id === value}" title="${t.desc}">
      ${themeThumb(t.id)}<span class="tema-nombre">${t.name}</span></button>`).join('')}</div>`;
  container.querySelectorAll('.tema-op').forEach(b => b.onclick = () => {
    container.querySelectorAll('.tema-op').forEach(x => x.setAttribute('aria-checked', x === b));
    onPick(b.dataset.id);
  });
}

// ---------- Sonidos por tema (sintetizados con Web Audio, sin archivos) ----------
// Cada kit: tap (tocar una ficha), ok (acierto), bad (error), end (terminar), start (al empezar).
const N = { C4: 261.63, E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };
const arp = (notes, step, fn) => notes.forEach((f, i) => fn(f, i * step));

const KITS = {
  // Clásico: "pop" limpio, campanita de dos notas, "bonk" grave.
  pop: {
    tap: () => tone(vary(620), .07, { type: 'sine', vol: .12, to: 900 }),
    ok: () => { bell(N.E5, 0, .16); bell(N.A5, .09, .18, .6); },
    bad: () => { tone(vary(220), .22, { type: 'triangle', vol: .22, to: 140 }); },
    end: () => arp([N.C5, N.E5, N.G5, N.C6], .11, (f, at) => bell(f, at, .17, .7)),
    start: () => arp([N.G4, N.C5], .1, (f, at) => bell(f, at, .1, .4)),
  },
  // Concurso de TV: "ding ding" brillante, zumbador de error y fanfarria de metales.
  show: {
    tap: () => tone(vary(880), .05, { type: 'square', vol: .05 }),
    ok: () => { [0, .14].forEach(at => { bell(N.E6, at, .14, .5); bell(N.C6, at, .1, .5); }); noise(.4, { filter: 'highpass', freq: 7000, vol: .06, at: .05 }); },
    bad: () => { tone(110, .55, { type: 'sawtooth', vol: .16 }); tone(116, .55, { type: 'sawtooth', vol: .12 }); },
    end: () => {
      [[N.C4, 0], [N.E4, .14], [N.G4, .28], [N.C5, .42]].forEach(([f, at]) => { tone(f, .5, { type: 'sawtooth', vol: .07, at, a: .03 }); tone(f * 2, .5, { type: 'square', vol: .03, at, a: .03 }); });
      [N.C5, N.E5, N.G5].forEach(f => tone(f, 1.1, { type: 'sawtooth', vol: .05, at: .6, a: .05 }));
      noise(1.2, { filter: 'highpass', freq: 6000, vol: .07, a: .2, at: .6 });
    },
    start: () => { noise(.5, { freq: 500, to: 4000, q: 3, vol: .08, a: .4 }); bell(N.C6, .45, .12); },
  },
  // Pizarra: golpecito de tiza, xilófono de madera, "toc" suave.
  tiza: {
    tap: () => noise(.04, { freq: vary(3000, .1), q: 2, vol: .12 }),
    ok: () => arp([N.G5, N.C6], .08, (f, at) => tone(f, .25, { type: 'sine', vol: .2, at })),
    bad: () => { tone(180, .15, { type: 'sine', vol: .25, to: 120 }); noise(.08, { filter: 'lowpass', freq: 600, vol: .15 }); },
    end: () => arp([N.C5, N.D5, N.E5, N.G5, N.C6], .09, (f, at) => tone(f, .3, { type: 'sine', vol: .18, at })),
    start: () => noise(.25, { freq: 2500, to: 4000, q: 1.5, vol: .07 }),
  },
  // Espacio: láser que sube, error que cae, final con barrido sideral.
  espacio: {
    tap: () => tone(vary(1200), .08, { type: 'sine', vol: .08, to: 2200 }),
    ok: () => { tone(500, .25, { type: 'square', vol: .06, to: 1600 }); bell(N.E6, .18, .1, .6); bell(N.G6, .26, .08, .6); },
    bad: () => tone(500, .45, { type: 'sawtooth', vol: .08, to: 90 }),
    end: () => { noise(1.4, { freq: 200, to: 5000, q: 6, vol: .1, a: .6 }); arp([N.C5, N.G5, N.C6, N.E6], .14, (f, at) => bell(f, .5 + at, .1, 1)); },
    start: () => tone(200, .6, { type: 'sine', vol: .1, to: 900, a: .2 }),
  },
  // Océano: burbujitas, acierto que sube como burbuja, error sordo bajo el agua.
  burbujas: {
    tap: () => tone(vary(500, .15), .09, { type: 'sine', vol: .14, to: 1300 }),
    ok: () => [0, .06, .12].forEach((at, i) => tone(vary(400 + i * 250, .1), .12, { type: 'sine', vol: .14, to: 1400 + i * 300, at })),
    bad: () => { tone(160, .35, { type: 'sine', vol: .25, to: 90 }); noise(.3, { filter: 'lowpass', freq: 400, vol: .12 }); },
    end: () => { for (let i = 0; i < 9; i++) tone(vary(350 + i * 90, .1), .12, { type: 'sine', vol: .1, to: 1500 + i * 120, at: i * .07 }); bell(N.C6, .7, .14, .9); },
    start: () => [0, .1].forEach(at => tone(vary(450), .1, { type: 'sine', vol: .1, to: 1200, at })),
  },
  // Nubes: marimba suave y aireada.
  suave: {
    tap: () => tone(vary(700), .1, { type: 'sine', vol: .08 }),
    ok: () => arp([N.C5, N.E5, N.G5], .07, (f, at) => tone(f, .4, { type: 'sine', vol: .15, at })),
    bad: () => arp([N.E4, N.C4], .12, (f, at) => tone(f, .3, { type: 'sine', vol: .15, at })),
    end: () => { arp([N.C5, N.E5, N.G5, N.C6, N.E6], .1, (f, at) => tone(f, .7, { type: 'sine', vol: .13, at })); noise(1.2, { filter: 'highpass', freq: 5000, vol: .04, a: .4 }); },
    start: () => tone(N.G5, .5, { type: 'sine', vol: .08, a: .1 }),
  },
  // Corcho: papel y chinches. "Clic" de chinche, acierto con campanita, error con papel arrugado.
  papel: {
    tap: () => { noise(.03, { filter: 'highpass', freq: 2500, vol: .15 }); tone(vary(1500), .03, { type: 'triangle', vol: .05 }); },
    ok: () => { noise(.05, { filter: 'highpass', freq: 3000, vol: .12 }); bell(N.A5, .05, .15); bell(N.E6, .13, .12); },
    bad: () => { for (let i = 0; i < 5; i++) noise(.04, { freq: vary(1800, .3), q: 1, vol: .1, at: i * .045 }); tone(150, .15, { type: 'sine', vol: .15 }); },
    end: () => arp([N.C5, N.E5, N.G5, N.C6], .1, (f, at) => bell(f, at, .14, .7)),
    start: () => noise(.2, { freq: 1500, to: 3000, q: 1, vol: .06 }),
  },
  // Videojuego: chiptune de onda cuadrada.
  arcade: {
    tap: () => tone(vary(990, .01), .05, { type: 'square', vol: .05 }),
    ok: () => arp([N.C6, N.G6], .07, (f, at) => tone(f, .09, { type: 'square', vol: .07, at })),
    bad: () => arp([311, 233], .1, (f, at) => tone(f, .14, { type: 'square', vol: .08, at })),
    end: () => arp([N.C5, N.E5, N.G5, N.C6, N.G5, N.C6], .09, (f, at) => tone(f, .12, { type: 'square', vol: .07, at })),
    start: () => arp([N.G5, N.C6], .08, (f, at) => tone(f, .08, { type: 'square', vol: .05, at })),
  },
};

/** Sonido del tema: 'tap' | 'ok' | 'bad' | 'end' | 'start'. Nunca lanza error (sin audio = silencio). */
export function themeSound(id, kind) {
  const kit = KITS[themeById(id).kit];
  if (!kit) return;
  try { if (audio()) kit[kind]?.(); } catch { /* sin sonido */ }
}
