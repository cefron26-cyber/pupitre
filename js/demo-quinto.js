// Salón de pruebas de Quinto (2026-11-22): curso "Quinto Pruebas" con la estudiante Daniela (daniela/1234, Cebollo
// bloqueado: lo desbloquea jugando). Contenido del libro Here We Go Now! 5:
//   - Unidad de la Unit 7 "Many Food Choices" con las reglas del asistente (10 ejercicios, 20 preguntas, estilo básico).
//   - Una actividad suelta de cada tipo (8-10 puntos), de las Units 6 "A Matter of Respect" y 7, con estilos variados.
// Nada de traducción directa en lo que va con imagen o definición: imagen ↔ palabra en inglés, palabra ↔ definición en inglés.
// Lo agrega load() en storage.js una sola vez (marca quintoPruebasV1; quintoPruebasV2 cambia la unidad vieja por esta).

export const CURSO_QUINTO = { id: 'crs-5prueba', name: 'Quinto Pruebas', grade: 5, section: 'PRUEBAS', code: 'QPRUE5' };
export const DANIELA = { id: 'usr-daniela', name: 'Daniela', username: 'daniela', password: '1234' };

// Emoji dibujado en un canvas (PNG, que safeSrc acepta).
function emojiPng(emoji, bg, size = 160) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, size, size);
    g.font = `${Math.round(size * 0.65)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji, size / 2, size * 0.55);
    return c.toDataURL('image/png');
  } catch { return ''; }
}

// Diagrama: estante de supermercado con 8 alimentos (4 por repisa). Devuelve la imagen y el centro de cada uno en %.
const ESTANTE = [['🥚', 'eggs'], ['🧀', 'cheese'], ['🍞', 'bread'], ['🍚', 'rice'], ['🍉', 'watermelon'], ['🐟', 'fish'], ['🍌', 'bananas'], ['🥕', 'carrots']];
function estantePng() {
  const W = 800, H = 560, xs = [14, 38, 62, 86], ys = [30, 74];
  const labels = ESTANTE.map(([, text], i) => ({ text, x: xs[i % 4], y: ys[Math.floor(i / 4)] }));
  try {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#f3ead8'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c98b4f'; g.fillRect(0, 0, 26, H); g.fillRect(W - 26, 0, 26, H);           // laterales del mueble
    for (const y of ys) { g.fillStyle = '#a8693a'; g.fillRect(26, H * y / 100 + 62, W - 52, 18); } // repisas
    g.font = '104px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    ESTANTE.forEach(([e], i) => g.fillText(e, W * labels[i].x / 100, H * labels[i].y / 100));
    return { image: c.toDataURL('image/jpeg', 0.88), labels };
  } catch { return { image: '', labels }; }
}

const mc = (q, options, correct) => ({ q, options, correct });
const tf = (q, verdadero) => ({ q, options: ['True', 'False'], correct: verdadero ? 0 : 1, tf: true });

export function quintoPack({ schoolId, ownerId, courseId, daysAgo }) {
  const A = [];
  let orden = 40;
  const act = (id, type, title, theme, instruction, content) =>
    A.push({ id, schoolId, ownerId, type, grade: 5, title, theme, instruction, content, createdAt: daysAgo(0, orden--) });

  // ================= Unidad: Unit 7 · Many Food Choices =================
  // Reglas del asistente de unidades (estilo Cambridge One): 10 ejercicios cortos, 20 preguntas (2 por ejercicio), mezcla
  // recomendada (Ordenar, ABCD, Completar escribiendo, Audio, Lectura) sin dos iguales seguidos, Completar sin banco con
  // pista entre paréntesis, Lectura y Audio con textos cortos, V/F alternados y la opción correcta repartida en A/B/C/D.
  // Todo con el estilo de la unidad (UNIT_THEME). Sin fases: se deducen del tipo, como en el asistente.
  const U = 'clasico';
  const fondos = ['#fff4dc', '#e6f4ea', '#eaf0fa', '#fdecea', '#f3e8fd', '#e8f7f7', '#fff0e0', '#eef2e2', '#fbe9f1'];

  act('act-q5-u7b-01', 'reorder', 'U7 · Ordenar: at the store', U, 'Put the words in the correct order.', { items: [
    { sentence: 'How much is a bottle of water?' },
    { sentence: 'I need a carton of milk, please.' },
  ] });

  act('act-q5-u7b-02', 'quiz', 'U7 · How many or how much?', U, 'Choose the correct answer.', { questions: [
    mc('___ eggs do you need?', ['How much', 'How many', 'How far', 'How old'], 1),
    mc('Can I have a ___ of pizza, please?', ['glass', 'pinch', 'slice', 'can'], 2),
  ] });

  act('act-q5-u7b-03', 'fill', 'U7 · Completar: in the kitchen', U, 'Write the missing word. Use the clue in parentheses.', { items: [
    { text: 'How {{much}} (much / many) sugar did you use?', bank: [] },
    { text: 'Mom bought a {{bag}} (bag / glass) of flour.', bank: [] },
  ] });

  act('act-q5-u7b-04', 'listening', 'U7 · Audio: lunch time', U, 'Listen to the conversation and answer the questions.', {
    audio: { kind: 'tts', rate: 1, script: [
      'Waiter: Hi! What would you like?',
      'Tom: A slice of pizza and a glass of orange juice, please.',
      'Waiter: Here you are. That\'s three dollars and twenty-five cents.',
    ].join('\n') },
    maxPlays: 0, showScript: false,
    questions: [
      mc('What does Tom want to drink?', ['A can of soda', 'A bottle of water', 'A cup of tea', 'A glass of orange juice'], 3),
      tf('Tom\'s lunch costs $3.25.', true),
    ],
  });

  act('act-q5-u7b-05', 'reading', 'U7 · Lectura: Grandma\'s pancakes', U, 'Read the text and answer the questions.', {
    title: 'Grandma\'s Pancakes',
    text: 'On Sundays, Lily makes pancakes with her grandma. They use two cups of flour, two eggs, a cup of milk, and a spoonful of sugar. Lily adds a pinch of salt, too.\n\n'
      + 'They eat the pancakes with honey and a few strawberries.',
    questions: [
      mc('How many eggs do they use?', ['Two', 'One', 'Four', 'Six'], 0),
      tf('They eat the pancakes with chocolate.', false),
    ],
  });

  act('act-q5-u7b-06', 'quiz', 'U7 · Some, many, a few', U, 'Choose the correct answer.', { questions: [
    mc('There is ___ milk in the fridge.', ['some', 'many', 'a few', 'an'], 0),
    mc('How much ___ the apples?', ['is', 'are', 'do', 'does'], 1),
  ] });

  act('act-q5-u7b-07', 'reorder', 'U7 · Ordenar: healthy food', U, 'Put the words in the correct order.', { items: [
    { sentence: 'We need a few tomatoes for the salad.' },
    { sentence: 'She drinks a lot of water every day.' },
  ] });

  act('act-q5-u7b-08', 'reading', 'U7 · Lectura: Ben\'s shopping', U, 'Read the text and answer the questions.', {
    title: 'Ben\'s Shopping',
    text: 'Ben is at the supermarket with fifteen dollars. He buys a box of cereal ($4), a carton of milk ($2), and a bag of apples ($3).\n\n'
      + 'Then, he buys a jar of honey for his mom ($5). He has one dollar left, so he buys a small bottle of water.',
    questions: [
      mc('How much is the jar of honey?', ['$2', '$4', '$5', '$3'], 2),
      tf('Ben has two dollars left after he buys the honey.', false),
    ],
  });

  act('act-q5-u7b-09', 'fill', 'U7 · Completar: my order', U, 'Write the missing word. Use the clue in parentheses.', { items: [
    { text: 'I\'d like a {{glass}} (glass / slice) of juice, please.', bank: [] },
    { text: 'There are only a {{few}} (few / much) cookies in the box.', bank: [] },
  ] });

  act('act-q5-u7b-10', 'listening', 'U7 · Audio: at the fruit stand', U, 'Listen to the conversation and answer the questions.', {
    audio: { kind: 'tts', rate: 1, script: [
      'Shopkeeper: Good afternoon! Can I help you?',
      'Emma: Yes, please. How much are the bananas?',
      'Shopkeeper: They\'re fifty cents each.',
      'Emma: I\'ll take six bananas and a can of soup, please.',
    ].join('\n') },
    maxPlays: 0, showScript: false,
    questions: [
      mc('How many bananas does Emma buy?', ['Two', 'Four', 'Five', 'Six'], 3),
      tf('Emma buys a can of soup.', true),
    ],
  });

  const enUnidad = Array.from({ length: 10 }, (_, i) => `act-q5-u7b-${String(i + 1).padStart(2, '0')}`);
  const unit = {
    id: 'unit-q5-u7', schoolId, ownerId, grade: 5, cefr: '', createdAt: daysAgo(0, 45),
    title: 'Unit 7 · Many Food Choices',
    description: 'How much / how many, some / a few / a lot of · Vocabulario: containers (glass, bottle, carton, bag, slice), food, prices',
    activityIds: enUnidad, fases: {},
  };

  // ================= Actividades sueltas: una de cada tipo (Units 6 y 7), estilos variados =================
  act('act-q5-quiz', 'quiz', 'U6 · Quiz: past continuous', 'concurso', 'Choose the correct answer.', { questions: [
    mc('At 8 o\'clock yesterday, I ___ my homework.', ['was doing', 'were doing', 'am doing'], 0),
    mc('Leo and Nina ___ laughing at Andy.', ['was', 'are', 'were'], 2),
    mc('"___ was crying in class?" "Andy was."', ['What', 'Who', 'Where'], 1),
    mc('Peter ___ talking. He was paying attention.', ['wasn\'t', 'weren\'t', 'isn\'t'], 0),
    mc('___ saw who broke the eraser. It\'s a mystery!', ['Everybody', 'Somebody', 'Nobody'], 2),
    mc('___ in the class read the message. All the students saw it!', ['Everybody', 'Nobody', 'Somebody'], 0),
    mc('___ put rotten tomatoes in my bag, but I don\'t know who.', ['Nobody', 'Somebody', 'Everybody'], 1),
    mc('What ___ you doing at 10 AM?', ['was', 'did', 'were'], 2),
    mc('"Were the students listening?" "Yes, they ___."', ['were', 'was', 'did'], 0),
    tf('"She were walking to school." is correct.', false),
  ] });

  act('act-q5-matching', 'matching', 'U6 · Emparejar: words and meanings', 'oceano', 'Match each word with its definition.', { pairs: [
    { left: 'bully', right: 'a person who hurts or scares others again and again' },
    { left: 'gossip', right: 'talk about other people\'s private lives' },
    { left: 'comfort', right: 'make a sad person feel better' },
    { left: 'stand up for', right: 'defend somebody who has a problem' },
    { left: 'turn a blind eye', right: 'ignore something you know is wrong' },
    { left: 'call names', right: 'use insulting words to make a person feel bad' },
    { left: 'exclude', right: 'not let somebody be part of a group' },
    { left: 'include', right: 'invite somebody to be part of a group' },
    { left: 'grown-up', right: 'an adult' },
    { left: 'rumor', right: 'a story people tell that may not be true' },
  ] });

  act('act-q5-fill', 'fill', 'U6 · Completar: what was happening?', 'cuaderno', 'Write the missing word. Use the clue in parentheses.', { items: [
    { text: 'At 7:00 PM, Lucy {{was}} (was / were) watching TV.', bank: [] },
    { text: 'Leo and Nina {{were}} (was / were) drawing cartoons.', bank: [] },
    { text: 'Peter was {{hiding}} (hide) behind the lockers.', bank: [] },
    { text: 'The students {{weren\'t|were not}} (wasn\'t / weren\'t) doing their homework.', bank: [] },
    { text: 'Andy was {{crying}} (cry) in the classroom.', bank: [] },
    { text: 'I {{wasn\'t|was not}} (wasn\'t / weren\'t) talking in class.', bank: [] },
    { text: 'While we were {{walking}} (walk) home, it started to rain.', bank: [] },
    { text: '{{Nobody}} (nobody / everybody) saw the thief. The room was empty.', bank: [] },
    { text: '{{Everybody}} (somebody / everybody) was laughing. All the students thought it was funny.', bank: [] },
    { text: '{{Somebody}} (somebody / nobody) broke my eraser, but I don\'t know who.', bank: [] },
  ] });

  act('act-q5-reorder', 'reorder', 'U6 · Reordenar: a matter of respect', 'corcho', 'Put the words in the correct order.', { items: [
    { sentence: 'Somebody was writing on the board.' },
    { sentence: 'Nobody was helping the new student.' },
    { sentence: 'What were you doing at nine o\'clock?' },
    { sentence: 'They were not telling the truth.' },
    { sentence: 'Everybody was looking at Rosa Parks.' },
    { sentence: 'Was she trying to go to school?' },
    { sentence: 'Peter was paying attention in class.' },
    { sentence: 'We should tell a grown-up about bullying.' },
  ] });

  act('act-q5-classify', 'classify', 'U6 · Clasificar: types of bullying', 'pizarra', 'Put each action in the correct type of bullying.', { groups: [
    { name: 'Physical', items: ['hitting', 'kicking', 'pinching'] },
    { name: 'Verbal', items: ['insulting', 'calling names', 'making hurtful remarks'] },
    { name: 'Social', items: ['spreading rumors', 'telling lies about somebody'] },
    { name: 'Cyberbullying', items: ['sending mean messages', 'posting hurtful comments online'] },
  ] });

  act('act-q5-memory', 'memory', 'U7 · Memoria: food around the world', 'oceano', 'Find each picture with its word.', { pairs: [
    ['🍕', 'pizza'], ['🍔', 'hamburger'], ['🥐', 'croissant'], ['🍟', 'french fries'],
    ['🥥', 'coconut'], ['🧀', 'cheese'], ['🍓', 'strawberries'], ['🧅', 'onion'],
  ].map(([e, word], i) => ({ word, image: emojiPng(e, fondos[i]) })) });

  act('act-q5-reading', 'reading', 'U6 · Lectura: a new student', 'espacio', 'Read the story and answer the questions.', {
    title: 'A New Student',
    text: 'Last Monday, a new student arrived at our school. Her name was Mia, and she was from Brazil. She spoke English with a different accent.\n\n'
      + 'At recess, Mia was sitting alone. Some kids were laughing at her accent and calling her names. Everybody was watching, but nobody was doing anything.\n\n'
      + 'Then, my friend Tom stood up for her. He said, "Stop it! That\'s mean." I invited Mia to sit with us, and we talked about our favorite movies. After recess, we told our teacher about the situation.\n\n'
      + 'Now Mia is our friend. She is teaching us some words in Portuguese!',
    questions: [
      mc('Where was Mia from?', ['Portugal', 'Brazil', 'Mexico'], 1),
      mc('Why were some kids laughing at Mia?', ['Because of her accent', 'Because of her clothes', 'Because of her hair'], 0),
      mc('What was Mia doing at recess?', ['She was playing soccer.', 'She was eating with friends.', 'She was sitting alone.'], 2),
      mc('Who stood up for Mia?', ['The teacher', 'Tom', 'Mia\'s brother'], 1),
      mc('What did they talk about with Mia?', ['Their favorite movies', 'Their homework', 'Their favorite food'], 0),
      tf('At first, everybody was helping Mia.', false),
      tf('The children told a grown-up about the situation.', true),
      tf('Mia is teaching her friends some words in Spanish.', false),
    ],
  });

  act('act-q5-listening', 'listening', 'U6 · Audio: let\'s help Andy', 'cielo', 'Listen to the conversation and answer the questions.', {
    audio: { kind: 'tts', rate: 1, script: [
      'Lucy: Peter, I\'m worried about Andy. This morning, he was crying.',
      'Peter: Really? What happened?',
      'Lucy: Somebody drew cartoons of him, and everybody saw them.',
      'Peter: That\'s terrible! Who was drawing the cartoons?',
      'Lucy: I think Leo and Nina were doing it. Yesterday at recess, they were laughing at him.',
      'Peter: Were they calling him names?',
      'Lucy: Yes, they were. And nobody was helping him.',
      'Peter: We must do something. Let\'s tell Mrs. Smith after lunch.',
      'Lucy: Good idea. And let\'s invite Andy to sit with us today.',
    ].join('\n') },
    maxPlays: 0, showScript: false,
    questions: [
      mc('Why is Lucy worried about Andy?', ['He was sick.', 'He was crying.', 'He lost his bag.'], 1),
      mc('What did somebody draw?', ['Cartoons of Andy', 'A map of the school', 'A picture of Mrs. Smith'], 0),
      mc('Who does Lucy think was drawing the cartoons?', ['Peter and Andy', 'Mrs. Smith', 'Leo and Nina'], 2),
      mc('When were Leo and Nina laughing at Andy?', ['This morning in class', 'Yesterday at recess', 'After lunch today'], 1),
      mc('Who are Lucy and Peter going to tell?', ['Mrs. Smith', 'Andy\'s mom', 'Leo and Nina'], 0),
      tf('Leo and Nina were calling Andy names.', true),
      tf('Many students were helping Andy.', false),
      tf('Lucy wants to invite Andy to sit with them.', true),
    ],
  });

  act('act-q5-dictation', 'dictation', 'U7 · Dictado: at the store', 'pizarra', 'Listen and write what you hear.', {
    items: [
      { text: 'a carton of milk' }, { text: 'a slice of pizza' }, { text: 'a bowl of soup' }, { text: 'a pinch of salt' },
      { text: 'How much is it?' }, { text: 'How many eggs do you need?' }, { text: 'I would like some water, please.' }, { text: 'Here is your change.' },
    ], rate: 0.9, voz: 'variada',
  });

  act('act-q5-wordsearch', 'wordsearch', 'U7 · Sopa de letras: ingredients', 'espacio', 'Find the ingredients in the puzzle.', {
    items: ['pizza', 'cheese', 'sugar', 'flour', 'butter', 'onion', 'coconut', 'sausage', 'spinach', 'pasta'].map(word => ({ word })),
    diagonal: true, backwards: false,
  });

  act('act-q5-hangman', 'hangman', 'U7 · Ahorcado: shopping words', 'pixel', 'Read the clue and guess the word.', { lives: 6, items: [
    { word: 'bottle', hint: 'Water often comes in this. You can open and close it.' },
    { word: 'slice', hint: 'A thin piece of pizza, bread, or cake.' },
    { word: 'carton', hint: 'Milk or juice can come in this paper box.' },
    { word: 'spoonful', hint: 'The amount of sugar you can put on a spoon.' },
    { word: 'pinch', hint: 'A very small amount of salt that you take with two fingers.' },
    { word: 'change', hint: 'The money you get back when you pay with a big bill.' },
    { word: 'price', hint: 'How much something costs.' },
    { word: 'recipe', hint: 'Instructions to cook a dish.' },
  ] });

  act('act-q5-crossword', 'crossword', 'U6 · Crucigrama: a matter of respect', 'clasico', 'Read the clues and complete the crossword.', { items: [
    { answer: 'bully', clue: 'A person who hurts or scares others again and again.' },
    { answer: 'gossip', clue: 'To talk about other people\'s private lives.' },
    { answer: 'rumor', clue: 'A story people tell that may not be true.' },
    { answer: 'nobody', clue: 'No person.' },
    { answer: 'everybody', clue: 'All the people in a group.' },
    { answer: 'comfort', clue: 'To make a sad person feel better.' },
    { answer: 'include', clue: 'To invite somebody to be part of your group.' },
    { answer: 'exclude', clue: 'To leave somebody out of a group.' },
    { answer: 'respect', clue: 'To treat other people well, even when they are different.' },
    { answer: 'insult', clue: 'To say rude words to make somebody feel bad.' },
  ] });

  act('act-q5-anagram', 'anagram', 'U7 · Anagrama: food and money', 'oceano', 'Put the letters in order to make the word.', { items: [
    { word: 'spoonful', hint: 'The amount you can put on a spoon.' },
    { word: 'bottle', hint: 'Water and soda come in this.' },
    { word: 'bowl', hint: 'You eat soup or cereal from it.' },
    { word: 'slice', hint: 'A thin piece of pizza or cake.' },
    { word: 'carton', hint: 'A paper box for milk or juice.' },
    { word: 'pound', hint: 'A unit of weight: about 454 grams.' },
    { word: 'average', hint: 'Add all the numbers and divide by how many there are.' },
    { word: 'coconut', hint: 'A big brown fruit. It is white inside and has juice.' },
    { word: 'sausage', hint: 'Long meat food. You can put it in a hot dog.' },
    { word: 'recipe', hint: 'Instructions to cook a dish.' },
  ] });

  // El diagrama aún no se publica (SOLO_LOCAL en templates/index.js): solo con el servidor local.
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    const est = estantePng();
    act('act-q5-diagram', 'diagram', 'U7 · Diagrama: at the supermarket', 'clasico', 'Drag each word to the correct food on the shelf.', { image: est.image, labels: est.labels });
  }

  act('act-q5-random', 'random', 'U6 y U7 · Al azar: let\'s talk', 'pixel', 'Take a card and answer the question.', { look: 'cards', items: [
    { text: 'What were you doing yesterday at 7 PM?' },
    { text: 'What was your family doing last Sunday morning?' },
    { text: 'How can you stand up for a classmate?' },
    { text: 'What should you do if you see bullying?' },
    { text: 'Who is a grown-up you can talk to at school?' },
    { text: 'How many glasses of water do you drink every day?' },
    { text: 'How much is a slice of pizza in your city?' },
    { text: 'What do you usually eat in a bowl?' },
    { text: 'What is your favorite food from another country?' },
    { text: 'What do you need to make a sandwich?' },
  ] });

  const asg = (id, extra) => ({ id, schoolId, ownerId, activityId: null, unitId: null, courseId, dueAt: null, forceSerious: false, timer: null,
    maxTries: null, showAnswers: true, createdAt: daysAgo(0, 1), ...extra });
  const assignments = [asg('asg-q5-unit', { unitId: unit.id, dueAt: daysAgo(-7) })];
  A.filter(a => !enUnidad.includes(a.id)).forEach(a => assignments.push(asg('asg-q5-' + a.id.slice(7), { activityId: a.id })));

  return { activities: A, units: [unit], assignments };
}
