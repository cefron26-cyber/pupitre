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
  'Ordena la oración': 'Order the sentence', 'Elige la respuesta correcta': 'Choose the right answer', 'Lee el texto y responde': 'Read and answer',
  'Escucha y responde': 'Listen and answer', 'Completa la oración': 'Complete the sentence', 'Arrastra la palabra al lugar correcto': 'Drag the word to the right place',
  'Misiones': 'Missions', 'Retos': 'Challenges', 'Juegos': 'Games', 'Clasificación': 'Ranking', 'Modo juego': 'Game mode',
  'Modo serio': 'Classic mode', 'Reiniciar': 'Reset', 'Cuarto': 'Room', 'Salir': 'Log out', 'Estudiante': 'Student',
  'Saltar al contenido': 'Skip to content', '← Misiones': '← Missions', 'Vuelve a verla cuando quieras': 'Come back to it anytime', 'en curso': 'in progress', 'Ocultar': 'Hide', 'Mostrar': 'Show', 'Ver texto': 'Show text', '¡Perfecto!': 'Perfect!', 'Aciertos': 'Correct', 'día de racha': 'day streak', 'días de racha': 'day streak', 'Tiempo': 'Time', 'Ver la unidad': 'See the unit', 'Tienes el máximo en esta actividad.': 'You have the top score in this activity.', 'Repetir': 'Try again', 'Escucha el audio': 'Listen to the audio', 'Puedes escucharlo las veces que necesites': 'You can listen as many times as you need', 'Lento': 'Slow', 'Idioma': 'Language', 'Reiniciar mi avance': 'Reset my progress',
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
  'Mi colección': 'My collection', 'Colección': 'Collection', 'Ropa de Cebollo': 'Cebollo’s clothes', 'Fondos': 'Backgrounds', 'Usar': 'Use', 'En uso': 'In use',
  'Sale del cofre': 'From the chest', 'Común': 'Common', 'Rara': 'Rare', 'Épica': 'Epic', 'Legendaria': 'Legendary',
  'Los fondos se ven en el modo juego.': 'Backgrounds show in game mode.', 'Gorras': 'Caps', 'Gafas': 'Glasses', 'Accesorios': 'Accessories',
  // Unidad, explicación y actividades
  'Unidad': 'Unit', 'Explicación': 'Lesson', 'Empieza por aquí': 'Start here', 'Empezar: ver la explicación': 'Start: see the lesson',
  'Recuerda': 'Remember', 'Gramática': 'Grammar', 'Vocabulario': 'Vocabulary', 'Comprobar': 'Check', 'Siguiente': 'Next',
  '¡Correcto!': 'Correct!', '¡Empezar!': 'Start!', '¡Excelente!': 'Excellent!', '¡Muy bien!': 'Great job!',
  '¡Casi lo logras!': 'Almost there!', '¡Sigue practicando!': 'Keep practicing!', 'Escucha el audio': 'Listen to the audio',
  'Más lento': 'Slower', 'Toca el cofre para abrirlo': 'Tap the chest to open it', '¡Toca el cofre!': 'Tap the chest!',
  '¡Pulsa para abrir!': 'Tap to open!',
  // Juegos (catálogo de views/juegos.js)
  'Verbos: presente, pasado y participio': 'Verbs: present, past and past participle',
  'Corta la fruta con el verbo correcto antes de que caiga. Evita las podridas y las bombas.': 'Slice the fruit with the right verb before it falls. Avoid the rotten ones and the bombs.',
  'Verbos en presente y pasado': 'Present and past verbs',
  'Sube por las plataformas eligiendo el verbo correcto y escapa de la marea.': 'Climb the platforms by picking the right verb and escape the tide.',
  'Comida: contables e incontables, envases, a / an / any': 'Food: countable and uncountable, containers, a / an / any',
  'Escucha el pedido del cliente, recorre los pasillos y llena la canasta.': 'Listen to the customer’s order, walk the aisles and fill the basket.',
  'Describir personas: cara, pelo, ojos': 'Describing people: face, hair, eyes',
  'Lee o escucha la descripción y arma la cara, o adivina quién es entre tres.': 'Read or listen to the description and build the face, or guess who it is out of three.',
  'Describir personas en presente': 'Describing people in the present',
  'Habla con los testigos, anota los rasgos del ladrón, arma su retrato y encuéntralo en la rueda.': 'Talk to the witnesses, note the thief’s features, build a sketch and find them in the lineup.',
  // Premios: fondos, ropa y decoración (rewards.js)
  'Morado': 'Purple', 'Océano': 'Ocean', 'Bosque': 'Forest', 'Atardecer': 'Sunset', 'Noche estrellada': 'Starry night', 'Prisma': 'Prism',
  'Aurora': 'Aurora', 'Gorra roja': 'Red cap', 'Gorro de lana': 'Wool hat', 'Sombrero de paja': 'Straw hat', 'Bandana roja': 'Red bandana',
  'Sombrero de vaca': 'Cow hat', 'Gafas redondas': 'Round glasses', 'Gafas de sol': 'Sunglasses', 'Gafas de estrella': 'Star glasses',
  'Parche pirata': 'Pirate patch', 'Bigote': 'Mustache', 'Cicatrices': 'Scars', 'Camiseta roja': 'Red T-shirt', 'Camiseta de rayas': 'Striped T-shirt',
  'Camiseta estrella': 'Star T-shirt', 'Camiseta de fútbol': 'Soccer jersey', 'Hoodie naranja': 'Orange hoodie', 'Hoodie azul': 'Blue hoodie',
  'Hoodie del rayo': 'Lightning hoodie', 'Jeans': 'Jeans', 'Short rojo': 'Red shorts', 'Pantalón cargo': 'Cargo pants', 'Tenis rojos': 'Red sneakers',
  'Botas de lluvia': 'Rain boots', 'Camisetas y hoodies': 'T-shirts and hoodies', 'Pantalones': 'Pants', 'Zapatos': 'Shoes',
  'Vístelo en el armario de': 'Dress him up in the closet in', 'su cuarto': 'his room',
  'Supera el reto': 'Beat the challenge', 'Nuevos en': 'New ones in', 'Evaluación': 'Test',
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
  [/^La respuesta era: (.+)$/, 'The answer was: $1'], [/^(\d+) juegos de inglés$/, '$1 English games'], [/^Jugar →$/, 'Play →'],
  [/^(\d)° y (\d)°$/, 'Grades $1 & $2'], [/^(\d)°$/, 'Grade $1'],
  [/^Continuar: (.+)$/, 'Continue: $1'], [/^Intento (\d+) de (\d+)$/, 'Try $1 of $2'], [/^(\d+) de (\d+)$/, '$1 of $2'],
  [/^Nuevos en (.+)$/, 'New ones in $1'], [/^Supera el reto (.+)$/, (m, r) => `Beat the ${EXACT[r] || r} challenge`], [/^(.+), actividad (\d+) de (\d+)$/, '$1, activity $2 of $3'], [/^Revisar respuestas$/, 'Check answers'], [/^(\d+) de (\d+) bien$/, '$1 of $2 right'],
  [/^(?:Frase|Oración) (\d+) de (\d+)$/, 'Sentence $1 of $2'], [/^Escribe la palabra que falta$/, 'Write the missing word'],
  [/^Arrastra las palabras hasta ordenar la oración$/, 'Drag the words into the right order'],
  [/^Vence en (\d+) días$/, 'Due in $1 days'],
  [/^Vence el (\d+) de (\w+)\.?$/, (m, d, mes) => `Due ${MESES[mes.slice(0, 3).toLowerCase()] || mes} ${d}`],
  [/^Vence el (.+)$/, 'Due $1'], [/^Vence mañana, (.+)$/, 'Due tomorrow, $1'], [/^Vence hoy, (.+)$/, 'Due today, $1'],
  [/^Venció (.+)$/, 'Was due $1'],
  [/^(\d+) días seguidos$/, '$1 days in a row'], [/^(\d+) seguidas$/, '$1 in a row'],
  [/^(\d+) h$/, '$1 h'],
];

function frase(s) {
  if (EXACT[s] !== undefined) return EXACT[s];
  for (const [re, rep] of PATTERNS) if (re.test(s)) return s.replace(re, rep);
  return undefined;
}
function traducir(t) {
  const s = t.trim();
  if (!s || !/[a-záéíóúñ¡¿°]/i.test(s)) return null;
  let out = frase(s);
  // Textos armados con " · " (p. ej. "Reordenar oraciones · en curso" o "Unidad · "): se traduce cada parte.
  if (out === undefined && s.includes('·')) {
    const partes = s.split(/(\s*·\s*)/);
    let cambio = false;
    const tr = partes.map(p => { const q = p.trim(); if (!q || q === '·') return p; const r = frase(q); if (r === undefined) return p; cambio = true; return p.replace(q, r); });
    if (cambio) out = tr.join('');
  }
  return out === undefined ? null : t.replace(s, out);
}

// Zonas que no se tocan: el contenido de las actividades y el texto de las explicaciones.
const SALTAR = '.ex-body, .ex-ficha, textarea, input, script, style, [data-no-i18n]';
function recorrer(root) {
  if (!document.documentElement.dataset.modo) return; // solo con la vista del estudiante (app.js pone data-modo)
  if (!root || root.nodeType === 3) { if (root) cambiar(root); return; }
  if (root.nodeType !== 1 || root.closest?.(SALTAR)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement?.closest(SALTAR) ? 2 : 1 });
  const nodos = []; while (w.nextNode()) nodos.push(w.currentNode);
  nodos.forEach(cambiar);
}
function cambiar(n) { if (!document.documentElement.dataset.modo) return; const t = traducir(n.nodeValue); if (t !== null && t !== n.nodeValue) n.nodeValue = t; }

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
