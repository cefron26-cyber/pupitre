// Reglas compartidas de la generación con IA (lógica pura, sin DOM).
// La usan el servidor (servidor/ia.mjs) y el navegador (js/ia.js): mismo esquema y misma validación
// para cualquier proveedor y para "Importar actividad".
// Cada tipo define:
//   esquema    → lo que se le pide al modelo (JSON Schema, subconjunto que acepta Gemini)
//   pedido(p)  → instrucciones específicas del tipo
//   convertir(salida, p) → contenido de la plantilla ({ questions } / { pairs } / { items })
//   validar(contenido)   → string[] de errores (vacío = válido)

// Memoria no: lleva imágenes.
export const TIPOS_IA = ['quiz', 'matching', 'fill', 'listening', 'reorder', 'classify', 'reading', 'dictation', 'wordsearch', 'hangman', 'crossword'];
// min 1: los ejercicios del asistente de unidades son cortos (≈ 2 preguntas). El formulario del editor sigue pidiendo 3+.
export const CANTIDAD = { min: 1, max: 20 };

const txt = s => String(s ?? '').trim().replace(/\s+/g, ' ');
const clave = s => txt(s).toLowerCase();
const repetidos = arr => new Set(arr.map(clave)).size !== arr.length;
function barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------- Quiz ----------
const quiz = {
  esquema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Pregunta, o afirmación si tf = true' },
            tf: { type: 'boolean', description: 'true = verdadero/falso' },
            answer: { type: 'string', description: 'Respuesta correcta (en tf: "True" o "False")' },
            distractors: { type: 'array', items: { type: 'string' }, description: 'Opciones incorrectas (1 a 3; vacío si tf)' },
          },
          required: ['q', 'tf', 'answer', 'distractors'],
        },
      },
    },
    required: ['title', 'questions'],
  },
  pedido: p => {
    const f = { multiple: 'All questions are multiple choice with exactly 3 distractors (tf = false).',
      tf: 'All items are True/False statements (tf = true, answer "True" or "False", about half of each).',
      mixto: 'Mix: about 70% multiple choice with 3 distractors and 30% True/False statements.' }[p.formato] || 'All questions are multiple choice with exactly 3 distractors (tf = false).';
    return `Create a quiz with exactly ${p.cantidad} questions. ${f} True/False statements must be checkable without any extra text: general knowledge about the topic, or "Is this sentence correct?" style grammar statements (e.g. 'The sentence "She go to school" is correct.'); never statements about an unknown person's life. Distractors must be plausible for the level, clearly wrong, and never synonyms of the answer. Only one correct answer per question.
IMPORTANT: if the topic or the teacher notes describe how the questions should look (for example "sentences where the student chooses the correct spelling": then each "q" is a different, natural sentence with a gap ___, like "Tom is ___ in the park.", and the options are spellings of the missing word), follow that format exactly instead of asking "What is…?" questions. Every question uses a different sentence and a different target word: never use the same correct answer twice in the quiz.`;
  },
  convertir(o) {
    return {
      questions: (o.questions || []).map(x => {
        if (x.tf) {
          const v = clave(x.answer).startsWith('t') || clave(x.answer) === 'verdadero';
          return { q: txt(x.q), options: ['True', 'False'], correct: v ? 0 : 1, tf: true };
        }
        const options = barajar([txt(x.answer), ...(x.distractors || []).map(txt).filter(Boolean).slice(0, 3)]);
        return { q: txt(x.q), options, correct: options.indexOf(txt(x.answer)) };
      }),
    };
  },
  validar(c) {
    const e = [];
    if (!c.questions?.length) e.push('No hay preguntas.');
    (c.questions || []).forEach((q, i) => {
      const n = `Pregunta ${i + 1}`;
      if (!q.q) e.push(`${n}: sin enunciado.`);
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) e.push(`${n}: debe tener de 2 a 4 opciones.`);
      else if (q.options.some(o => !txt(o))) e.push(`${n}: hay opciones vacías.`);
      else if (repetidos(q.options)) e.push(`${n}: hay opciones repetidas.`);
      if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= (q.options?.length || 0)) e.push(`${n}: la respuesta correcta no es una de las opciones.`);
    });
    return e;
  },
};

// ---------- Emparejar ----------
const matching = {
  esquema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      pairs: { type: 'array', items: { type: 'object', properties: { left: { type: 'string' }, right: { type: 'string' } }, required: ['left', 'right'] } },
    },
    required: ['title', 'pairs'],
  },
  pedido: p => {
    const r = { traduccion: 'left = English word or short phrase, right = its Spanish translation.',
      definicion: 'left = English word, right = a short, simple English definition (max 8 words).',
      antonimo: 'left = English word, right = its English opposite.',
      libre: 'Choose the most useful relation for the topic (e.g. question ↔ answer, word ↔ definition).' }[p.relacion || 'traduccion'];
    return `Create exactly ${Math.min(p.cantidad, 10)} matching pairs. ${r} Every left item must match only one right item; no repeated words on either side; keep each side short.`;
  },
  convertir: o => ({ pairs: (o.pairs || []).slice(0, 10).map(x => ({ left: txt(x.left), right: txt(x.right) })) }),
  validar(c) {
    const e = [], ps = c.pairs || [];
    if (ps.length < 3 || ps.length > 10) e.push('Debe tener de 3 a 10 parejas.');
    ps.forEach((p, i) => { if ((!p.left && !p.image) || !p.right) e.push(`Pareja ${i + 1}: falta un lado.`); });
    if (repetidos(ps.map(p => p.left).filter(Boolean)) || repetidos(ps.map(p => p.right))) e.push('Hay parejas repetidas.');
    return e;
  },
};

// ---------- Completar ----------
const GAP_RE = /\{\{(.+?)\}\}/g;
const fill = {
  esquema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            sentence: { type: 'string', description: 'Frase con ___ (tres guiones bajos) en cada hueco' },
            answers: { type: 'array', items: { type: 'string' }, description: 'Una respuesta por hueco, en orden' },
            distractors: { type: 'array', items: { type: 'string' }, description: '1 o 2 palabras incorrectas para el banco' },
          },
          required: ['sentence', 'answers', 'distractors'],
        },
      },
    },
    required: ['title', 'items'],
  },
  pedido: p => `Create exactly ${p.cantidad} sentences to complete. Mark each gap with ___ (three underscores); use 1 gap per sentence (2 at most). The gap must test the target grammar or vocabulary and have one clearly correct answer (single word or short phrase). Give 1-2 distractors per sentence for a word bank.${p.banco === false
    ? ' There is NO word bank: students type the answer, so right after each gap write a clue in brackets that makes the answer clear: the base verb to conjugate, e.g. "She ___ (play) tennis.", the Spanish word, e.g. "I eat an ___ (manzana).", or the two options, e.g. "I ___ (can / can\'t) swim, I never learned." The instruction must say what to write (e.g. "Complete with the correct form of the verb.").'
    : ''}`,
  convertir(o, p) {
    return {
      items: (o.items || []).map(x => {
        const ans = (x.answers || []).map(txt).filter(Boolean);
        let k = 0;
        const text = txt(x.sentence).replace(/_{2,}/g, () => (k < ans.length ? `{{${ans[k++]}}}` : '___'));
        const bank = p.banco === false ? [] : barajar([...ans, ...(x.distractors || []).map(txt).filter(Boolean).slice(0, 2)]);
        return { text, bank };
      }),
    };
  },
  validar(c) {
    const e = [];
    if (!c.items?.length) e.push('No hay frases.');
    (c.items || []).forEach((it, i) => {
      const n = `Frase ${i + 1}`;
      const gaps = [...String(it.text || '').matchAll(GAP_RE)].map(m => m[1].split('|').map(clave));
      if (!gaps.length) e.push(`${n}: no tiene huecos.`);
      if (/_{2,}/.test(it.text || '')) e.push(`${n}: hay huecos sin respuesta.`);
      if (it.bank?.length) {
        const left = it.bank.map(clave);
        const ok = gaps.every(g => { const j = left.findIndex(b => g.includes(b)); if (j < 0) return false; left.splice(j, 1); return true; });
        if (!ok) e.push(`${n}: el banco no incluye todas las respuestas.`);
      }
    });
    return e;
  },
};

// ---------- Audio (listening): guion para las voces de Microsoft + preguntas ----------
// El guion queda "Nombre: texto" por línea (js/voces.mjs reparte las voces según el nombre).
const LIM_GUION = { lineas: 40, porLinea: 300 };
const listening = {
  esquema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            speaker: { type: 'string', description: 'Quién habla (Mom, Waiter, Tom…); vacío = narradora' },
            text: { type: 'string' },
          },
          required: ['speaker', 'text'],
        },
      },
      questions: quiz.esquema.properties.questions,
    },
    required: ['title', 'lines', 'questions'],
  },
  pedido: p => {
    // Con 1-2 preguntas (ejercicio corto de una unidad) el guion también es corto.
    const largo = p.cantidad <= 2 ? (p.grado <= 3 ? '30-50' : p.grado <= 5 ? '40-70' : p.grado <= 8 ? '60-90' : '80-120')
      : p.grado <= 3 ? '40-70' : p.grado <= 5 ? '60-100' : p.grado <= 8 ? '90-150' : '130-200';
    const guion = p.formato === 'narracion'
      ? 'Write a short monologue or narration (one person talks: e.g. a child introduces their family, someone describes their day). Use an empty speaker for every line, and start with "Hi! My name is …" when a person talks about themselves.'
      : 'Write a natural dialogue between 2 to 4 characters in a realistic situation for the topic. Each speaker name must make the voice obvious: family roles (Mom, Dad, Grandma, Grandpa), jobs (Waiter, Teacher, Doctor, Shop assistant) or common first names that are clearly a girl or a boy (Lucy, Sofia, Tom, Mateo). Never use the same name for two people. One short line with an empty speaker may set the scene at the start.';
    return `Create a listening activity. ${guion} Total length: about ${largo} words, one turn per line (1 to 3 short sentences per line; no stage directions, no sound effects, never the speaker name inside the text). Use the target language naturally several times. The story must be logical and consistent: no self-corrections, no contradictions (if someone says they can't do something, they never say later that they can).
Then write exactly ${Math.min(p.cantidad, 10)} questions that can only be answered by listening to the script (specific details: names, numbers, places, what people want or do), in the same order as the script. About 70% multiple choice with 3 plausible distractors (things also mentioned or possible in the situation) and 30% True/False statements about the script. Only one correct answer per question.`;
  },
  convertir(o, p) {
    const nombre = s => txt(s).replace(/:/g, '').split(' ').slice(0, 3).join(' ');
    const script = (o.lines || []).map(l => {
      const t = txt(l.text), q = p.formato === 'narracion' ? '' : nombre(l.speaker);
      return t ? (/^[A-Za-zÀ-ÿ]/.test(q) ? `${q}: ${t}` : t) : '';
    }).filter(Boolean).join('\n');
    return { audio: { kind: 'tts', script, rate: 1 }, maxPlays: 0, showScript: true, questions: quiz.convertir({ questions: o.questions }).questions };
  },
  validar(c) {
    const e = [];
    if (c.audio?.kind === 'tts') {
      const ls = String(c.audio.script || '').split('\n').filter(l => l.trim());
      if (txt(c.audio.script).split(' ').length < 10) e.push('El guion es demasiado corto.');
      if (ls.length > LIM_GUION.lineas) e.push(`El guion tiene más de ${LIM_GUION.lineas} líneas.`);
      if (ls.some(l => l.length > LIM_GUION.porLinea)) e.push('Hay líneas del guion demasiado largas.');
    }
    return [...e, ...quiz.validar(c)];
  },
};

// ---------- Reordenar oraciones ----------
const palabras = s => txt(s).split(' ').filter(Boolean);
const reorder = {
  esquema: {
    type: 'object',
    properties: { title: { type: 'string' }, sentences: { type: 'array', items: { type: 'string' } } },
    required: ['title', 'sentences'],
  },
  pedido: p => `Create exactly ${p.cantidad} English sentences for a "put the words in order" activity. Each sentence has 4 to 12 words (never fewer than 3 or more than 20), one clear correct word order, and uses the target grammar or vocabulary. Write each sentence complete, with capital letter and final punctuation. No two sentences alike.`,
  convertir: o => ({ items: (o.sentences || []).map(s => ({ sentence: palabras(s).join(' ') })).filter(x => x.sentence) }),
  validar(c) {
    const e = [];
    if (!c.items?.length) e.push('No hay oraciones.');
    (c.items || []).forEach((it, i) => { const n = palabras(it.sentence).length; if (n < 3 || n > 20) e.push(`Oración ${i + 1}: debe tener de 3 a 20 palabras.`); });
    if (repetidos((c.items || []).map(x => x.sentence))) e.push('Hay oraciones repetidas.');
    return e;
  },
};

// ---------- Clasificar ----------
const classify = {
  esquema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      groups: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, items: { type: 'array', items: { type: 'string' } } }, required: ['name', 'items'] } },
    },
    required: ['title', 'groups'],
  },
  pedido: p => `Create a "classify into groups" activity with 2 to 4 groups (2 or 3 is best) and about ${Math.min(p.cantidad * 2, 24)} items in total, split evenly. Group names are short English labels (e.g. "Countable", "Uncountable", "Present", "Past"). Each item is a word or short phrase that belongs clearly to only one group. No item repeated anywhere.
The groups must be objective categories anyone can check from the word itself (word class, topic category such as "Sports" vs "Musical instruments", countable vs uncountable, regular vs irregular verb, -s / -es ending…). Never groups that depend on unknown facts about people (e.g. "Things we can do" vs "Things we can't do").`,
  convertir: o => ({ groups: (o.groups || []).slice(0, 4).map(g => ({ name: txt(g.name), items: (g.items || []).map(txt).filter(Boolean) })) }),
  validar(c) {
    const e = [], gs = c.groups || [];
    if (gs.length < 2 || gs.length > 4) e.push('Debe tener de 2 a 4 grupos.');
    gs.forEach((g, i) => { if (!g.name) e.push(`Grupo ${i + 1}: sin nombre.`); if (!g.items?.length) e.push(`Grupo ${i + 1}: sin elementos.`); });
    const todos = gs.flatMap(g => g.items || []);
    if (todos.length < 4 || todos.length > 40) e.push('Debe tener de 4 a 40 elementos.');
    if (repetidos(todos)) e.push('Hay elementos repetidos.');
    return e;
  },
};

// ---------- Lectura ----------
const reading = {
  esquema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      paragraphs: { type: 'array', items: { type: 'string' } },
      questions: quiz.esquema.properties.questions,
    },
    required: ['title', 'paragraphs', 'questions'],
  },
  pedido: p => {
    const corto = p.cantidad <= 2;
    const largo = corto ? (p.grado <= 3 ? '30-50' : p.grado <= 5 ? '50-80' : p.grado <= 8 ? '70-110' : '100-150')
      : p.grado <= 3 ? '50-80' : p.grado <= 5 ? '80-130' : p.grado <= 8 ? '130-200' : '180-280';
    return `Create a reading activity: a short text of about ${largo} words in ${corto ? '1 or 2' : '2 to 4'} paragraphs (a story, a description, an email or a short article that fits the topic), using the target language naturally several times. The text must be logical and consistent, with no contradictions or odd repetitions.
Then write exactly ${Math.min(p.cantidad, 10)} comprehension questions answerable only from the text, in the same order as the text. About 70% multiple choice with 3 plausible distractors and 30% True/False statements about the text. Only one correct answer per question.`;
  },
  convertir: o => ({
    title: txt(o.title).slice(0, 80),
    text: (o.paragraphs || []).map(txt).filter(Boolean).join('\n\n'),
    questions: quiz.convertir({ questions: o.questions }).questions,
  }),
  validar(c) {
    const e = [];
    if (String(c.text || '').trim().split(/\s+/).length < 15) e.push('El texto es demasiado corto.');
    return [...e, ...quiz.validar(c)];
  },
};

// ---------- Dictado ----------
const dictation = {
  esquema: {
    type: 'object',
    properties: { title: { type: 'string' }, items: { type: 'array', items: { type: 'string' } } },
    required: ['title', 'items'],
  },
  pedido: p => `Create a dictation activity with exactly ${p.cantidad} items the student will hear and write. ${p.grado <= 5 ? 'Mostly single words from the vocabulary, plus 1-2 very short sentences.' : 'Mix key words and short sentences (max 10 words) that use the target grammar.'} Spelling must be standard (American English); avoid names, numbers written as digits and words with several accepted spellings.`,
  convertir: o => ({ items: (o.items || []).map(txt).filter(Boolean).map(text => ({ text })), rate: 0.9, voz: 'variada' }),
  validar(c) {
    const e = [];
    if (!c.items?.length) e.push('No hay elementos.');
    if ((c.items || []).some(x => !x.text)) e.push('Hay elementos vacíos.');
    if (repetidos((c.items || []).map(x => x.text))) e.push('Hay elementos repetidos.');
    return e;
  },
};

// ---------- Juegos de palabras: sopa de letras, ahorcado, crucigrama ----------
// Solo letras A-Z en el tablero ("ice cream" → ICECREAM): se cuentan así los límites de largo.
const soloLetras = s => txt(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
const palabraOk = s => /^[\p{L}\s'-]+$/u.test(txt(s));
function revisarPalabras(lista, { min, max, largo, nombre = 'Palabra' }) {
  const e = [];
  if (lista.length < min || lista.length > max) e.push(`Debe tener de ${min} a ${max} palabras.`);
  lista.forEach((w, i) => {
    if (!palabraOk(w)) e.push(`${nombre} ${i + 1}: solo letras, espacios o guiones.`);
    else if (soloLetras(w).length < 2 || soloLetras(w).length > largo) e.push(`${nombre} ${i + 1}: de 2 a ${largo} letras.`);
  });
  if (new Set(lista.map(soloLetras)).size !== lista.length) e.push('Hay palabras repetidas.');
  return e;
}
const wordsearch = {
  esquema: {
    type: 'object',
    properties: { title: { type: 'string' }, words: { type: 'array', items: { type: 'string' } } },
    required: ['title', 'words'],
  },
  pedido: p => `Create a word search with exactly ${Math.max(4, p.cantidad)} English words about the topic (from the vocabulary if given). Each word 3 to 12 letters, letters only (no numbers, no spaces unless it is a common compound like "ice cream"), standard spelling, all different, none contained inside another.`,
  convertir: (o, p = {}) => ({ items: (o.words || []).map(txt).filter(Boolean).slice(0, 15).map(word => ({ word })), diagonal: (p.grado || 6) >= 4, backwards: (p.grado || 6) >= 9 }),
  validar: c => revisarPalabras((c.items || []).map(x => x.word || ''), { min: 3, max: 15, largo: 12 }),
};
const hangman = {
  esquema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      words: { type: 'array', items: { type: 'object', properties: { word: { type: 'string' }, hint: { type: 'string', description: 'Pista corta' } }, required: ['word', 'hint'] } },
    },
    required: ['title', 'words'],
  },
  pedido: p => `Create a hangman game with exactly ${p.cantidad} English words or very short phrases (max 3 words) about the topic. Each one has a short hint that lets a student of this level guess it: ${p.grado <= 4 ? 'the Spanish translation (e.g. "perro")' : 'a simple English definition or a sentence with a blank (e.g. "I brush my ___ every morning.")'}. The hint must never contain the answer. Letters only, standard spelling, no repeated words.`,
  convertir: o => ({ items: (o.words || []).map(x => ({ word: txt(x.word), hint: txt(x.hint) })).filter(x => x.word).slice(0, 15), lives: 6 }),
  validar(c) {
    const items = c.items || [];
    const e = revisarPalabras(items.map(x => x.word || ''), { min: 1, max: 15, largo: 24 });
    items.forEach((x, i) => { if (!x.hint) e.push(`Palabra ${i + 1}: sin pista.`); });
    return e;
  },
};
const crossword = {
  esquema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      entries: { type: 'array', items: { type: 'object', properties: { answer: { type: 'string' }, clue: { type: 'string' } }, required: ['answer', 'clue'] } },
    },
    required: ['title', 'entries'],
  },
  pedido: p => `Create a crossword with exactly ${Math.max(4, p.cantidad)} entries about the topic. Each answer is ONE English word of 3 to 12 letters (letters only). Choose words that share common letters so they can cross. Each clue is short and clear for the level: ${p.grado <= 4 ? 'the Spanish translation, or a very simple English description' : 'a simple English definition or a sentence with a blank'}; never write the answer in the clue. All answers different.`,
  convertir: o => ({ items: (o.entries || []).map(x => ({ answer: txt(x.answer), clue: txt(x.clue) })).filter(x => x.answer).slice(0, 15) }),
  validar(c) {
    const items = c.items || [];
    const e = revisarPalabras(items.map(x => x.answer || ''), { min: 3, max: 15, largo: 15, nombre: 'Respuesta' });
    items.forEach((x, i) => { if (!x.clue) e.push(`Respuesta ${i + 1}: sin pista.`); });
    return e;
  },
};

// Todas las actividades piden además la instrucción para el estudiante (como en Cambridge One:
// "Complete the sentences with can or can't."). Se guarda en activity.instruction, fuera del contenido.
const conInstruccion = r => ({
  ...r,
  esquema: {
    ...r.esquema,
    properties: { instruction: { type: 'string', description: 'Instrucción corta en inglés para el estudiante' }, ...r.esquema.properties },
    required: ['instruction', ...r.esquema.required],
  },
});
export const REGLAS = Object.fromEntries(Object.entries({ quiz, matching, fill, listening, reorder, classify, reading, dictation, wordsearch, hangman, crossword })
  .map(([k, r]) => [k, conInstruccion(r)]));
export const limpiarInstruccion = s => txt(s).replace(/^instructions?:\s*/i, '').slice(0, 120);

// Pedido del docente → parámetros limpios (o lanza Error con mensaje para mostrar).
export function limpiarPedido(b = {}) {
  const tipo = String(b.tipo || '');
  if (!TIPOS_IA.includes(tipo)) throw new Error('Ese tipo de actividad todavía no se puede generar con IA.');
  const tema = txt(b.tema).slice(0, 600);
  if (tema.length < 3) throw new Error('Escribe el tema o lo que quieres practicar.');
  const cantidad = Math.max(CANTIDAD.min, Math.min(CANTIDAD.max, Math.round(Number(b.cantidad) || 8)));
  const grado = Math.max(1, Math.min(11, Math.round(Number(b.grado) || 6)));
  return {
    tipo, tema, cantidad, grado,
    formato: tipo === 'listening' ? (b.formato === 'narracion' ? 'narracion' : 'dialogo')
      : ['multiple', 'tf', 'mixto'].includes(b.formato) ? b.formato : 'multiple',
    relacion: ['traduccion', 'definicion', 'antonimo', 'libre'].includes(b.relacion) ? b.relacion : 'traduccion',
    banco: b.banco !== false,
    notas: txt(b.notas).slice(0, 400),
    // Ficha de la unidad (asistente): vocabulario y gramática que deben aparecer. Opcionales.
    vocabulario: txt(b.vocabulario).slice(0, 600),
    gramatica: txt(b.gramatica).slice(0, 400),
    // Elementos ya generados que no se deben repetir (cuando la app pide los que faltaron). Opcional.
    evitar: txt(b.evitar).slice(0, 2500),
  };
}

// Valida un contenido ya convertido (sirve también para "Importar actividad").
export const validarContenido = (tipo, c) => (REGLAS[tipo] ? REGLAS[tipo].validar(c || {}) : ['Tipo desconocido.']);
