// Íconos ilustrados de las plantillas (SVG a mano): fichas azules con letras, tarjetas blancas y una flecha rosada
// que muestra la acción, sobre fondo celeste. Se usan en "Crear actividad" y en "Mis actividades".
const BG = '#dcefFc', T = '#3a9fe6', TD = '#1f7fcc', L = '#b4dbf7', W = '#fff', G = '#cbd8e4', P = '#f0506e', OK = '#2fbf7a', Y = '#ffc93c';
const svg = body => `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="80" height="80" rx="6" fill="${BG}"/>${body}</svg>`;
const txt = (x, y, s, size = 7, fill = W) => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="Arial,sans-serif" font-weight="700" font-size="${size}" fill="${fill}">${s}</text>`;
// Ficha con texto: letra blanca sobre colores fuertes, azul oscuro sobre la ficha clara.
const tile = (x, y, w, h, s = '', fill = T, size = 7) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="${fill}"/>${s ? txt(x + w / 2, y + h / 2 + .4, s, size, fill === L ? TD : W) : ''}`;
const card = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${W}" stroke="#bcd3e6" stroke-width=".8"/>`;
const line = (x, y, w, fill = G) => `<rect x="${x}" y="${y}" width="${w}" height="3" rx="1.5" fill="${fill}"/>`;
const slot = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="${W}" stroke="${T}" stroke-width="1.2" stroke-dasharray="2.5 2"/>`;
// Flecha curva rosada (desde, control, hasta) con punta.
const arrow = (d, tip) => `<path d="${d}" stroke="${P}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="${tip}" fill="${P}"/>`;
const check = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="5" fill="${W}"/><path d="M${cx - 2.4} ${cy}l1.7 1.8 3.2-3.6" stroke="${OK}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const speaker = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${T}"/>
  <path d="M${cx - r * .45} ${cy - r * .2}h${r * .25}l${r * .35} -${r * .3}v${r * 1}l-${r * .35} -${r * .3}h-${r * .25}z" fill="${W}"/>
  <path d="M${cx + r * .3} ${cy - r * .25}a${r * .35} ${r * .35} 0 0 1 0 ${r * .5}M${cx + r * .48} ${cy - r * .45}a${r * .6} ${r * .6} 0 0 1 0 ${r * .9}" stroke="${W}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;

export const TEMPLATE_ART = {
  quiz: svg(`${card(10, 9, 60, 22)}${line(16, 15, 34)}${line(16, 22, 24)}${txt(61, 20, '?', 13, P)}
    ${tile(10, 37, 28, 15, 'A')}${tile(42, 37, 28, 15, 'B', OK)}${tile(10, 56, 28, 15, 'C')}${tile(42, 56, 28, 15, 'D')}${check(68, 38)}`),
  matching: svg(`${tile(8, 12, 24, 13, 'cat')}${tile(8, 33, 24, 13, 'dog')}${tile(8, 54, 24, 13, 'sun')}
    ${slot(46, 12, 26, 13)}${card(46, 33, 26, 13)}${line(51, 38, 16)}${card(46, 54, 26, 13)}${line(51, 59, 12)}
    ${arrow('M32 39 C 40 37, 40 20, 45 19', 'M46.5 18.6 l-4.2 -2 l.6 4.6z')}`),
  fill: svg(`${card(8, 10, 64, 38)}${line(14, 17, 46)}${line(14, 26.5, 15)}${slot(32, 23, 18, 9)}${line(53, 26.5, 13)}${line(14, 37, 34)}
    ${tile(10, 58, 26, 13, 'goes')}${tile(44, 58, 26, 13, 'go', L)}
    ${arrow('M23 57 C 22 46, 30 40, 39 34', 'M40.5 32.8 l-4.6 .2 l2.6 3.8z')}`),
  reorder: svg(`${tile(8, 12, 16, 13, 'is')}${tile(27, 12, 24, 13, 'She')}${tile(54, 12, 18, 13, 'here')}
    ${card(6, 47, 68, 22)}${slot(10, 52, 18, 12)}${slot(31, 52, 18, 12)}${slot(52, 52, 18, 12)}
    ${arrow('M39 27 C 37 34, 26 36, 21 46', 'M20.3 48.6 l-1.9 -4.4 l4.5 .9z')}`),
  classify: svg(`${tile(12, 9, 22, 12, 'run')}${tile(46, 15, 22, 12, 'dog')}
    ${card(6, 38, 31, 34)}<rect x="6" y="38" width="31" height="9" rx="3" fill="${TD}"/>${tile(11, 52, 21, 7, '', L)}${tile(11, 62, 21, 7, '', L)}
    ${card(43, 38, 31, 34)}<rect x="43" y="38" width="31" height="9" rx="3" fill="${OK}"/>${tile(48, 52, 21, 7, '', L)}
    ${arrow('M23 22 C 24 28, 22 31, 21 36', 'M20.8 38.8 l-2.5 -4 l4.6 -.1z')}`),
  memory: svg(`${[[8, 10], [30, 10], [52, 42]].map(([x, y]) => `<rect x="${x}" y="${y}" width="20" height="27" rx="3" fill="${T}"/>${txt(x + 10, y + 13.5, '?', 11)}`).join('')}
    <rect x="52" y="10" width="20" height="27" rx="3" fill="${W}" stroke="#bcd3e6" stroke-width=".8"/><circle cx="62" cy="21" r="5.5" fill="${Y}"/>${line(56, 29, 12)}
    <rect x="8" y="42" width="20" height="27" rx="3" fill="${W}" stroke="${OK}" stroke-width="1.6"/>${txt(18, 55.5, 'sun', 6.5, TD)}
    <rect x="30" y="42" width="20" height="27" rx="3" fill="${P}"/>${txt(40, 55.5, '?', 11)}`),
  reading: svg(`${card(8, 8, 38, 64)}${line(13, 15, 28, TD)}${[23, 30, 37, 44, 51, 58].map((y, i) => line(13, y, i % 3 === 2 ? 18 : 28)).join('')}
    ${tile(52, 14, 22, 13, 'A')}${tile(52, 33, 22, 13, 'B', OK)}${tile(52, 52, 22, 13, 'C')}${check(73, 34)}`),
  listening: svg(`${speaker(26, 28, 16)}
    <path d="M48 22v12M53 17v22M58 24v8M63 19v18M68 25v6" stroke="${P}" stroke-width="2.4" stroke-linecap="round"/>
    ${tile(10, 54, 28, 16, 'A')}${tile(42, 54, 28, 16, 'B', OK)}${check(68, 55)}`),
  dictation: svg(`${speaker(22, 24, 13)}${line(42, 16, 28)}${line(42, 24, 20)}${line(42, 32, 24)}
    ${card(8, 48, 64, 22)}${tile(13, 53, 12, 12, 'c', L, 8)}${tile(27, 53, 12, 12, 'a', L, 8)}${tile(41, 53, 12, 12, 't', L, 8)}
    <rect x="56" y="53" width="2" height="12" rx="1" fill="${P}"/>`),
  wordsearch: svg(`${card(8, 8, 64, 64)}${[0, 1, 2, 3, 4].map(r => [0, 1, 2, 3, 4].map(c => txt(17 + c * 11.5, 18 + r * 11.5, 'QAPLEZRWTX'[(r * 3 + c) % 10], 6.5, TD)).join('')).join('')}
    <rect x="11" y="35" width="58" height="10" rx="5" fill="none" stroke="${P}" stroke-width="1.8"/>
    <rect x="49" y="10" width="10" height="58" rx="5" fill="none" stroke="${OK}" stroke-width="1.8"/>`),
  hangman: svg(`<path d="M12 70h30M20 70V12h28v8" stroke="${TD}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="48" cy="26" r="6" fill="none" stroke="${P}" stroke-width="2.4"/><path d="M48 32v14M48 37l-6 5M48 37l6 5" stroke="${P}" stroke-width="2.4" stroke-linecap="round"/>
    ${tile(46, 58, 9, 11, 'C', T, 7)}${tile(57, 58, 9, 11, '', L)}${tile(68, 58, 9, 11, '', L)}`),
  crossword: svg(`${[[1, 0], [1, 1], [1, 2], [1, 3], [0, 2], [2, 2], [3, 2], [3, 0], [3, 1], [3, 3], [4, 0]].map(([r, c]) =>
      `<rect x="${12 + c * 14}" y="${8 + r * 14}" width="13" height="13" rx="1.5" fill="${W}" stroke="${T}" stroke-width="1.2"/>`).join('')}
    ${txt(18.5, 28.5, 'C', 7, TD)}${txt(32.5, 28.5, 'A', 7, TD)}${txt(46.5, 28.5, 'T', 7, TD)}${txt(46.5, 14.5, 'S', 7, OK)}`),
  anagram: svg(`${tile(10, 12, 17, 17, 'T', T, 9)}${tile(31.5, 12, 17, 17, 'A', P, 9)}${tile(53, 12, 17, 17, 'C', T, 9)}
    ${tile(10, 48, 17, 17, 'C', OK, 9)}${slot(31.5, 48, 17, 17)}${slot(53, 48, 17, 17)}
    ${arrow('M40 30 C 40 36, 40 40, 40 45', 'M40 47.5 l-2.4 -4 l4.8 0z')}`),
  diagram: svg(`${card(22, 10, 36, 60)}<circle cx="40" cy="24" r="7" fill="${L}"/><rect x="31" y="34" width="18" height="24" rx="5" fill="${L}"/>
    <circle cx="40" cy="24" r="2.2" fill="${W}" stroke="${TD}" stroke-width="1.2"/><circle cx="44" cy="46" r="2.2" fill="${W}" stroke="${TD}" stroke-width="1.2"/>
    ${tile(4, 18, 15, 11, 'head', T, 5)}<path d="M19 23.5 H37.8" stroke="${P}" stroke-width="1.4"/>
    ${tile(61, 40, 15, 11, 'arm', OK, 5.5)}<path d="M61 45.5 H46" stroke="${OK}" stroke-width="1.4"/>`),
  random: svg(`${[T, P, OK, Y, TD, '#a36fe6'].map((c, k) => { const a0 = k * 60 * Math.PI / 180, a1 = (k + 1) * 60 * Math.PI / 180;
      return `<path d="M42 40L${(42 + 28 * Math.cos(a0)).toFixed(1)} ${(40 + 28 * Math.sin(a0)).toFixed(1)}A28 28 0 0 1 ${(42 + 28 * Math.cos(a1)).toFixed(1)} ${(40 + 28 * Math.sin(a1)).toFixed(1)}Z" fill="${c}"/>`; }).join('')}
    <circle cx="42" cy="40" r="6" fill="${W}"/><path d="M5 34h6v-4l7 10-7 10v-4H5z" fill="${W}" stroke="${G}" stroke-width="1.2" stroke-linejoin="round"/>`),
};
// "Todas": un montoncito de fichas de colores.
export const ALL_ART = svg(`${tile(10, 10, 27, 27, '', T)}${tile(43, 10, 27, 27, '', P)}${tile(10, 43, 27, 27, '', OK)}${tile(43, 43, 27, 27, '', Y)}
  ${txt(23.5, 23.5, 'A', 12)}${txt(56.5, 23.5, 'B', 12)}${txt(23.5, 56.5, 'C', 12)}${txt(56.5, 56.5, 'D', 12)}`);
export const templateArt = type => TEMPLATE_ART[type] || ALL_ART;
