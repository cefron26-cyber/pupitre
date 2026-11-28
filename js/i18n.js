// Idioma de la interfaz del estudiante (2026-11-27, pedido del docente): botón ES | EN en el encabezado.
// Solo traduce la interfaz (pestañas, botones, títulos, avisos). El contenido de las actividades ya está en inglés y no se
// toca; las explicaciones conservan sus "Recuerda" en español. Funciona sobre el texto ya pintado: con EN activo, un
// observador traduce cada texto que aparece (frases exactas y algunos patrones con números). Al volver a ES se recarga.
// La preferencia se guarda en este navegador (localStorage), como el modo de cada pestaña.

const KEY = 'plat.lang';
export const getLang = () => { try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'es'; } catch { return 'es'; } };
const setLang = l => { try { localStorage.setItem(KEY, l); } catch {} };

// Frases exactas (sin espacios de los lados).
const EXACT = {
  // Encabezado y pestañas
  'Misiones': 'Missions', 'Retos': 'Challenges', 'Juegos': 'Games', 'Clasificación': 'Ranking', 'Modo juego': 'Game mode',
  'Modo serio': 'Classic mode', 'Reiniciar': 'Reset', 'Cuarto': 'Room', 'Salir': 'Log out', 'Estudiante': 'Student',
  'Saltar al contenido': 'Skip to content', 'Idioma': 'Language', 'Reiniciar mi avance': 'Reset my progress',
  // Portada y cofre
  'Hay uno listo': 'One is ready', 'Haz una actividad y gana uno': 'Do an activity to win one',
  'Haz otra actividad y gana el siguiente': 'Do another activity to win the next one', 'Mañana hay más': 'More tomorrow',
  'Abrir': 'Open', 'Ganaste un cofre': 'You won a chest', 'Ropa por racha': 'Streak outfits', 'Listo': 'Done',
  'Ya tienes toda la de este periodo': 'You have all of this term’s outfits', 'día': 'day', 'días': 'days',
  'Sigue con': 'Up next', 'Continuar': 'Continue', 'Empezar': 'Start', 'Esta semana': 'This week', 'Después': 'Later',
  'Atrasadas': 'Overdue', 'Empezada': 'Started', 'Terminada': 'Done', 'Atrasada': 'Late', 'Ver resultado': 'See result',
  'Ver unidad': 'See unit', 'Repasa lo que fallaste': 'Review your mistakes', 'No cuenta para la nota': 'Not graded',
  'Sin fecha límite': 'No due date', 'Hiciste todo': 'All done', 'Vence hoy': 'Due today',
  // Retos
  'Contrarreloj': 'Beat the clock', 'Sin errores': 'No mistakes', 'Mezcla': 'Mix', 'Maratón': 'Marathon', 'Jugar': 'Play',
  'Gánale al reloj con 60 % o más.': 'Beat the clock with 60% or more.', '8 seguidas sin fallar. Un error y se acaba.': '8 in a row. One mistake and it’s over.',
  '10 preguntas revueltas. Saca 80 % o más.': '10 mixed questions. Get 80% or more.', 'Una unidad entera de corrido. Saca 80 % o más.': 'A whole unit in one go. Get 80% or more.',
  'Primero termina una actividad.': 'Finish an activity first.', 'Primero termina una unidad.': 'Finish a unit first.',
  'Hoy ya ganaste sus puntos': 'You already got its points today', 'Próximos': 'Coming up', 'Retos de tu docente': 'Your teacher’s challenges',
  'Tenis veloces': 'Speed sneakers', 'Volcán': 'Volcano', 'Corona dorada': 'Gold crown',
  // Clasificación
  'Puntos de esta semana': 'Points this week', 'Puntos de siempre': 'All-time points', 'Semana': 'Week', 'Siempre': 'All time',
  'Sigue así': 'Keep it up', 'Haz una actividad y arranca de primero': 'Do an activity and take the lead', 'Practicar': 'Practice',
  'Tú': 'You', 'Rangos': 'Ranks', 'Subes de rango al subir de nivel.': 'You rank up as you level up.',
  'Bronce': 'Bronze', 'Plata': 'Silver', 'Oro': 'Gold', 'Platino': 'Platinum', 'Diamante': 'Diamond', 'Leyenda': 'Legend',
  // Colección y cuarto
  'Mi colección': 'My collection', 'Ropa de Cebollo': 'Cebollo’s clothes', 'Fondos': 'Backgrounds', 'Usar': 'Use', 'En uso': 'In use',
  'Sale del cofre': 'From the chest', 'Común': 'Common', 'Rara': 'Rare', 'Épica': 'Epic', 'Legendaria': 'Legendary',
  'Los fondos se ven en el modo juego.': 'Backgrounds show in game mode.', 'Gorras': 'Caps', 'Gafas': 'Glasses', 'Accesorios': 'Accessories',
  // Unidad, explicación y actividades
  'Unidad': 'Unit', 'Explicación': 'Lesson', 'Empieza por aquí': 'Start here', 'Empezar: ver la explicación': 'Start: see the lesson',
  'Recuerda': 'Remember', 'Gramática': 'Grammar', 'Vocabulario': 'Vocabulary', 'Comprobar': 'Check', 'Siguiente': 'Next',
  '¡Correcto!': 'Correct!', '¡Empezar!': 'Start!', '¡Excelente!': 'Excellent!', '¡Muy bien!': 'Great job!',
  '¡Casi lo logras!': 'Almost there!', '¡Sigue practicando!': 'Keep practicing!', 'Escucha el audio': 'Listen to the audio',
  'Más lento': 'Slower', 'Toca el cofre para abrirlo': 'Tap the chest to open it', '¡Toca el cofre!': 'Tap the chest!',
  '¡Pulsa para abrir!': 'Tap to open!',
  // Tipos de actividad
  'Quiz': 'Quiz', 'Emparejar': 'Matching', 'Completar texto': 'Fill in', 'Reordenar oraciones': 'Word order', 'Clasificar': 'Sort',
  'Memoria': 'Memory', 'Lectura': 'Reading', 'Audio': 'Listening', 'Dictado': 'Dictation', 'Sopa de letras': 'Word search',
  'Ahorcado': 'Hangman', 'Crucigrama': 'Crossword', 'Anagrama': 'Anagram', 'Al azar': 'Random', 'Diagrama con etiquetas': 'Labeled diagram',
};

const MESES = { ene: 'Jan', feb: 'Feb', mar: 'Mar', abr: 'Apr', may: 'May', jun: 'Jun', jul: 'Jul', ago: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dic: 'Dec' };
// Patrones con números o nombres.
const PATTERNS = [
  [/^Hola, (.+)$/, 'Hi, $1'],
  [/^Periodo (\d+)$/, 'Term $1'],
  [/^Periodo (\d+) · (\d+) misi(?:ón|ones)$/, (m, a, b) => `Term ${a} · ${b} ${b === '1' ? 'mission' : 'missions'}`],
  [/^Periodo (\d+) · Hiciste todo$/, 'Term $1 · All done'],
  [/^Actividad (\d+) de (\d+)( ·)?$/, 'Activity $1 of $2$3'],
  [/^Unidad · (\d+) actividades/, 'Unit · $1 activities'],
  [/^Nivel (\d+)$/, 'Level $1'], [/^Nivel (\d+)\+$/, 'Level $1+'],
  [/^Vas en el nivel (\d+)$/, 'You’re at level $1'],
  [/^Se abre en el nivel (\d+)$/, 'Opens at level $1'],
  [/^Hechas · (\d+)$/, 'Done · $1'],
  [/^Faltan (\d+) días? para la próxima$/, (m, n) => `${n} ${n === '1' ? 'day' : 'days'} to the next one`],
  [/^Vas de (\d+)\.° de (\d+)$/, 'You’re #$1 of $2'],
  [/^Empatado en el puesto (\d+)$/, 'Tied for #$1'],
  [/^(\d+) puntos más y pasas a (.+)$/, '$1 more points to pass $2'],
  [/^Pregunta (\d+) de (\d+)$/, 'Question $1 of $2'],
  [/^Vence en (\d+) días$/, 'Due in $1 days'],
  [/^Vence el (\d+) de (\w+)\.?$/, (m, d, mes) => `Due ${MESES[mes.slice(0, 3).toLowerCase()] || mes} ${d}`],
  [/^Vence el (.+)$/, 'Due $1'], [/^Vence mañana, (.+)$/, 'Due tomorrow, $1'], [/^Vence hoy, (.+)$/, 'Due today, $1'],
  [/^Venció (.+)$/, 'Was due $1'],
  [/^(\d+) días seguidos$/, '$1 days in a row'],
  [/^(\d+) h$/, '$1 h'],
];

function traducir(t) {
  const s = t.trim();
  if (!s || !/[a-záéíóúñ¡¿]/i.test(s)) return null;
  let out = EXACT[s];
  if (out === undefined) for (const [re, rep] of PATTERNS) if (re.test(s)) { out = s.replace(re, rep); break; }
  return out === undefined ? null : t.replace(s, out);
}

// Zonas que no se tocan: el contenido de las actividades y el texto de las explicaciones.
const SALTAR = '.escenario .tpl-body, .ex-body, .ex-ficha, textarea, input, script, style, [data-no-i18n]';
function recorrer(root) {
  if (!document.querySelector('.lang-toggle')) return; // solo con la vista del estudiante
  if (!root || root.nodeType === 3) { if (root) cambiar(root); return; }
  if (root.nodeType !== 1 || root.closest?.(SALTAR)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement?.closest(SALTAR) ? 2 : 1 });
  const nodos = []; while (w.nextNode()) nodos.push(w.currentNode);
  nodos.forEach(cambiar);
}
function cambiar(n) { if (!document.querySelector('.lang-toggle')) return; const t = traducir(n.nodeValue); if (t !== null && t !== n.nodeValue) n.nodeValue = t; }

let obs = null;
export function initLang() {
  document.documentElement.lang = getLang();
  if (getLang() !== 'en') return;
  recorrer(document.body);
  obs = new MutationObserver(ms => { for (const m of ms) {
    if (m.type === 'characterData') cambiar(m.target);
    else m.addedNodes.forEach(recorrer);
  } });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
}

// Botón ES | EN (lo pinta headerHTML para el estudiante).
export const langToggleHTML = () => `<span class="lang-toggle" role="group" aria-label="Idioma / Language">${['es', 'en'].map(l =>
  `<button type="button" data-lang="${l}" aria-pressed="${getLang() === l}">${l.toUpperCase()}</button>`).join('')}</span>`;
document.addEventListener('click', e => {
  const b = e.target.closest?.('.lang-toggle [data-lang]');
  if (!b || b.dataset.lang === getLang()) return;
  setLang(b.dataset.lang); location.reload();
});
