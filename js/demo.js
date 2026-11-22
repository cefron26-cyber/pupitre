// Paquete de demostración (2026-11-19): una actividad corta de cada tipo + una unidad de prueba, todo de 6°
// (tema: rutina diaria). Lo usa seed() en storage.js; solo aparece con datos nuevos o tras "Reiniciar demo".
// La unidad (5 actividades) y las otras 7 actividades quedan asignadas a Sexto A para que el estudiante las pruebe.

// Memoria necesita imágenes: se dibuja un emoji en un canvas (PNG, que safeSrc acepta).
function emojiPng(emoji, bg) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 160, 160);
    g.font = '104px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji, 80, 88);
    return c.toDataURL('image/png');
  } catch { return ''; }
}

// Diagrama con etiquetas: una cara sencilla dibujada en un canvas (JPEG, que safeSrc acepta).
function caraPng() {
  try {
    const c = document.createElement('canvas'); c.width = 640; c.height = 480;
    const g = c.getContext('2d');
    g.fillStyle = '#e8f1fb'; g.fillRect(0, 0, 640, 480);
    g.lineWidth = 5; g.strokeStyle = '#16213d';
    const elipse = (x, y, rx, ry, fill) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); g.stroke(); };
    elipse(198, 250, 30, 44, '#f4c39d'); elipse(442, 250, 30, 44, '#f4c39d');          // orejas
    elipse(320, 250, 128, 160, '#f7d0ae');                                               // cara
    g.beginPath(); g.ellipse(320, 140, 140, 86, 0, Math.PI, Math.PI * 2); g.lineTo(460, 170); g.quadraticCurveTo(320, 120, 180, 170); g.closePath();
    g.fillStyle = '#6b3f22'; g.fill(); g.stroke();                                        // pelo
    elipse(272, 236, 20, 24, '#fff'); elipse(368, 236, 20, 24, '#fff');                  // ojos
    g.fillStyle = '#16213d'; [272, 368].forEach(x => { g.beginPath(); g.arc(x, 240, 9, 0, Math.PI * 2); g.fill(); });
    g.beginPath(); g.moveTo(320, 262); g.quadraticCurveTo(300, 300, 322, 306); g.stroke(); // nariz
    g.beginPath(); g.moveTo(276, 340); g.quadraticCurveTo(320, 378, 364, 340); g.stroke(); // boca
    return c.toDataURL('image/jpeg', 0.85);
  } catch { return ''; }
}

const tf = (q, verdadero) => ({ q, options: ['True', 'False'], correct: verdadero ? 0 : 1, tf: true });

export function demoPack({ schoolId, ownerId, courseId, daysAgo }) {
  const A = [];
  const act = (id, type, title, theme, instruction, content, horas) =>
    A.push({ id, schoolId, ownerId, type, grade: 6, title, theme, instruction, content, createdAt: daysAgo(0, horas) });

  act('act-demo-quiz', 'quiz', 'Demo · Quiz: present simple', 'concurso', 'Choose the correct answer.', { questions: [
    { q: 'She ___ to school every day.', options: ['go', 'goes', 'going', 'gone'], correct: 1 },
    { q: 'They ___ football on Sundays.', options: ['plays', 'play', 'playing', 'is play'], correct: 1 },
    { q: '___ he like pizza?', options: ['Do', 'Is', 'Does', 'Are'], correct: 2 },
    tf('"I gets up at seven." is correct.', false),
  ] }, 12);

  act('act-demo-matching', 'matching', 'Demo · Emparejar: daily routine', 'cielo', 'Match each English phrase with its meaning.', { pairs: [
    { left: 'get up', right: 'levantarse' },
    { left: 'have breakfast', right: 'desayunar' },
    { left: 'brush my teeth', right: 'cepillarme los dientes' },
    { left: 'go to bed', right: 'irse a dormir' },
  ] }, 11);

  act('act-demo-fill', 'fill', 'Demo · Completar: my morning', 'cuaderno', 'Complete the sentences with the words in the box.', { items: [
    { text: 'I {{wake}} up at 6:30.', bank: ['wake', 'wakes'] },
    { text: 'My brother {{takes}} a shower after me.', bank: ['takes', 'take'] },
    { text: 'We {{walk}} to school together.', bank: ['walk', 'walks'] },
  ] }, 10);

  act('act-demo-reorder', 'reorder', 'Demo · Reordenar oraciones', 'corcho', 'Put the words in the correct order.', { items: [
    { sentence: 'I have lunch at twelve o\'clock.' },
    { sentence: 'She never watches TV in the morning.' },
    { sentence: 'Do you do your homework after school?' },
  ] }, 9);

  act('act-demo-classify', 'classify', 'Demo · Clasificar: morning or night', 'pizarra', 'Put each activity in the correct group.', { groups: [
    { name: 'Morning', items: ['wake up', 'have breakfast', 'go to school'] },
    { name: 'Night', items: ['have dinner', 'put on pyjamas', 'go to bed'] },
  ] }, 8);

  const fondos = ['#fff4dc', '#e6f4ea', '#eaf0fa', '#fdecea'];
  act('act-demo-memory', 'memory', 'Demo · Memoria: things at home', 'oceano', 'Find each picture with its word.', { pairs: [
    ['⏰', 'alarm clock'], ['🪥', 'toothbrush'], ['🛏️', 'bed'], ['🍳', 'breakfast'],
  ].map(([e, word], i) => ({ word, image: emojiPng(e, fondos[i]) })) }, 7);

  act('act-demo-reading', 'reading', 'Demo · Lectura: Sam\'s day', 'cuaderno', 'Read the text and answer the questions.', {
    title: 'Sam\'s day',
    text: 'Sam is eleven years old. He gets up at half past six every day. He has eggs and juice for breakfast.\n\nHe goes to school by bus. After school, he plays basketball with his friends. In the evening, he does his homework and goes to bed at nine o\'clock.',
    questions: [
      { q: 'What time does Sam get up?', options: ['At six o\'clock', 'At half past six', 'At seven o\'clock', 'At nine o\'clock'], correct: 1 },
      { q: 'How does Sam go to school?', options: ['On foot', 'By car', 'By bike', 'By bus'], correct: 3 },
      tf('Sam plays football after school.', false),
    ],
  }, 6);

  act('act-demo-listening', 'listening', 'Demo · Audio: a busy morning', 'cielo', 'Listen to the conversation and answer the questions.', {
    audio: { kind: 'tts', script: 'Mom: Lucy, wake up! It\'s seven o\'clock.\nLucy: Oh no! I\'m late for school.\nMom: Your breakfast is on the table. Do you want milk or juice?\nLucy: Juice, please. Where is my backpack?\nMom: It\'s next to the door.', rate: 1 },
    maxPlays: 0, showScript: true,
    questions: [
      { q: 'What time is it?', options: ['Six o\'clock', 'Seven o\'clock', 'Eight o\'clock'], correct: 1 },
      { q: 'What does Lucy want to drink?', options: ['Milk', 'Water', 'Juice'], correct: 2 },
      tf('Lucy\'s backpack is next to the door.', true),
    ],
  }, 5);

  act('act-demo-dictation', 'dictation', 'Demo · Dictado: routine words', 'pizarra', 'Listen and write what you hear.', {
    items: [{ text: 'breakfast' }, { text: 'homework' }, { text: 'I go to bed early.' }], rate: 0.9, voz: 'variada',
  }, 4);

  act('act-demo-wordsearch', 'wordsearch', 'Demo · Sopa de letras: days', 'espacio', 'Find the days of the week.', {
    items: [{ word: 'Monday' }, { word: 'Tuesday' }, { word: 'Friday' }, { word: 'Sunday' }], diagonal: true, backwards: false,
  }, 3);

  act('act-demo-hangman', 'hangman', 'Demo · Ahorcado: school things', 'pixel', 'Guess the word letter by letter.', {
    items: [
      { word: 'backpack', hint: 'You carry your books in it.' },
      { word: 'pencil', hint: 'You write and draw with it.' },
      { word: 'teacher', hint: 'This person helps you learn at school.' },
    ], lives: 6,
  }, 2);

  act('act-demo-crossword', 'crossword', 'Demo · Crucigrama: meals', 'clasico', 'Read the clues and complete the crossword.', { items: [
    { answer: 'breakfast', clue: 'The first meal of the day.' },
    { answer: 'lunch', clue: 'The meal in the middle of the day.' },
    { answer: 'dinner', clue: 'The meal in the evening.' },
    { answer: 'snack', clue: 'A small amount of food between meals.' },
  ] }, 1);

  act('act-demo-anagram', 'anagram', 'Demo · Anagrama: daily routine', 'clasico', 'Put the letters in order.', { items: [
    { word: 'breakfast', hint: 'You eat it in the morning.' },
    { word: 'shower', hint: 'You wash your body here.' },
    { word: 'homework', hint: 'Tasks from school you do at home.' },
  ] }, 1);
  // El diagrama aún no se publica: su demo solo con el servidor local (ver SOLO_LOCAL en templates/index.js).
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) act('act-demo-diagram', 'diagram', 'Demo · Diagrama: my face', 'clasico', 'Drag the labels to the picture.', { image: caraPng(), labels: [
    { text: 'hair', x: 50, y: 16 }, { text: 'eye', x: 57.5, y: 49 }, { text: 'ear', x: 31, y: 52 },
    { text: 'nose', x: 50, y: 61 }, { text: 'mouth', x: 50, y: 74 },
  ] }, 1);
  act('act-demo-random', 'random', 'Demo · Al azar: talk about your day', 'clasico', 'Spin the wheel and answer.', { look: 'wheel', items: [
    { text: 'What time do you get up?' }, { text: 'What do you eat for breakfast?' }, { text: 'How do you go to school?' },
    { text: 'What do you do after school?' }, { text: 'When do you do your homework?' }, { text: 'What time do you go to bed?' },
  ] }, 1);

  // Unidad de prueba: 5 actividades, en el orden de la unidad (vocabulario → gramática → lectura/escucha → evaluación).
  const enUnidad = ['act-demo-matching', 'act-demo-fill', 'act-demo-reading', 'act-demo-listening', 'act-demo-quiz'];
  const unit = {
    id: 'unit-demo', schoolId, ownerId, grade: 6, cefr: '', createdAt: daysAgo(0, 13),
    title: 'Unidad de prueba · My daily routine',
    description: 'Present simple y vocabulario de la rutina diaria. Unidad corta para probar la plataforma.',
    activityIds: enUnidad,
    fases: { 'act-demo-matching': 'Vocabulario', 'act-demo-fill': 'Gramática', 'act-demo-reading': 'Lectura y escucha', 'act-demo-listening': 'Lectura y escucha', 'act-demo-quiz': 'Evaluación' },
  };

  const asg = (id, extra) => ({ id, schoolId, ownerId, activityId: null, unitId: null, courseId, dueAt: null, forceSerious: false, timer: null,
    maxTries: null, showAnswers: true, createdAt: daysAgo(0, 1), ...extra });
  const assignments = [asg('asg-demo-unit', { unitId: 'unit-demo', dueAt: daysAgo(-7) })];
  A.filter(a => !enUnidad.includes(a.id)).forEach((a, i) => assignments.push(asg('asg-demo-' + i, { activityId: a.id })));

  return { activities: A, units: [unit], assignments };
}
