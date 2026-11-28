// Demo GNext 1 (2026-11-27, pedido del docente): la cuenta "estudiante" (Estudiante Demo) pasa a Sexto A y deja de ver lo
// de Quinto (no se borra: sigue en Quinto A y Quinto Pruebas). Contenido del libro GNext 1 (6 unidades) repartido en los
// cuatro periodos: P1 = U1 y U2, P2 = U3, P3 = U4 y U5, P4 = U6.
// Cada unidad = la actividad larga (reglas del asistente: 10 ejercicios, 20 preguntas, estilo básico, con explicación)
// + 3 actividades sueltas de esa unidad (8-10 puntos, estilos variados). Preguntas escritas a mano (sin IA).
// Lo agrega load() en storage.js una sola vez (marca gnextV1).

export const CURSO_GNEXT = 'crs-6a';
const PERIODO_DE = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 4 };

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
const FONDOS = ['#fff4dc', '#e6f4ea', '#eaf0fa', '#fdecea', '#f3e8fd', '#e8f7f7', '#fff0e0', '#eef2e2'];

const mc = (q, options, correct) => ({ q, options, correct });
const tf = (q, verdadero) => ({ q, options: ['True', 'False'], correct: verdadero ? 0 : 1, tf: true });

// Ejercicios de la unidad, en forma corta:
//   ['reorder', título, [frase, frase]]            ['quiz', título, [mc, mc]]
//   ['fill', título, [texto, texto]]               ['listening', título, guion, [pregunta, pregunta]]
//   ['reading', título, { title, text }, [pregunta, pregunta]]
const INSTR = {
  reorder: 'Put the words in the correct order.',
  quiz: 'Choose the correct answer.',
  fill: 'Write the missing word. Use the clue in parentheses.',
  listening: 'Listen to the conversation and answer the questions.',
  reading: 'Read the text and answer the questions.',
};
function ejercicio([type, , a, b]) {
  if (type === 'reorder') return { items: a.map(sentence => ({ sentence })) };
  if (type === 'quiz') return { questions: a };
  if (type === 'fill') return { items: a.map(text => ({ text, bank: [] })) };
  if (type === 'listening') return { audio: { kind: 'tts', rate: 1, script: a.join('\n') }, maxPlays: 0, showScript: false, questions: b };
  if (type === 'reading') return { title: a.title, text: a.text, questions: b };
}

// ======================================================================================================================
const UNIDADES = [
  // ---------------------------------------------------------------- Unit 1
  { n: 1, title: 'Unit 1 · Back to School!',
    description: 'Verb to be, this / that, a / an, possessive adjectives · Vocabulario: countries, nationalities, jobs, family',
    explicacion: [
      '# The verb to be',
      'We use **am**, **is** and **are** to talk about people and things.',
      'Subject | Affirmative | Negative',
      'I | I\'m a student. | I\'m not a pilot.',
      'He / She / It | She\'s a teacher. | He isn\'t here.',
      'You / We / They | They\'re twelve. | We aren\'t singers.',
      'ej: Are you from Colombia? Yes, I am. (¿Eres de Colombia? Sí.)',
      '! En la pregunta el verbo va primero: **Is she** your cousin?',
      '',
      '# A or an?',
      'Use **a** before a consonant sound and **an** before a vowel sound.',
      '- **a** map, **a** car, **a** teacher',
      '- **an** umbrella, **an** e-mail, **an** engineer',
      'ej: My mom is a doctor, and my dad is an artist. (Mi mamá es doctora y mi papá es artista.)',
      '! Con las profesiones siempre usamos **a** o **an**.',
      '',
      '# Possessive adjectives',
      'Subject | Possessive',
      'I | my',
      'you | your',
      'he / she / it | his / her / its',
      'we / they | our / their',
      'ej: Her name is Sofía. (Su nombre es Sofía.)',
      '! **his** = de él, **her** = de ella.',
    ],
    ej: [
      ['reorder', 'Ordenar: nice to meet you', ['My name is Lucas and I am twelve.', 'Where are you from?']],
      ['quiz', 'Am, is or are?', [
        mc('My parents ___ from Mexico.', ['is', 'am', 'are', 'be'], 2),
        mc('___ your sister a doctor?', ['Is', 'Are', 'Am', 'Do'], 0)]],
      ['fill', 'Completar: a or an?', [
        'My uncle is {{an}} (a / an) engineer.',
        'I have {{a}} (a / an) new map of the world.']],
      ['listening', 'Audio: the new student', [
        'Teacher: Good morning! What\'s your name?',
        'Ana: Hi! My name\'s Ana. I\'m from Peru.',
        'Teacher: Welcome, Ana! How old are you?',
        'Ana: I\'m twelve. My brother is in this school, too.'], [
        mc('Where is Ana from?', ['Brazil', 'Peru', 'Chile', 'Spain'], 1),
        tf('Ana is thirteen years old.', false)]],
      ['reading', 'Lectura: my family', { title: 'Meet My Family',
        text: 'Hi! I\'m Tomás. This is my family. My mom is a nurse and my dad is a chef. They are very friendly.\n\n'
          + 'My sister is ten. Her name is Valeria and her favorite singer is Shakira. Our dog is Max. Its eyes are brown.' }, [
        mc('What is Tomás\'s dad\'s job?', ['A nurse', 'A pilot', 'A teacher', 'A chef'], 3),
        tf('Valeria\'s favorite singer is Shakira.', true)]],
      ['quiz', 'Possessive adjectives', [
        mc('This is Carlos. ___ jacket is red.', ['Her', 'His', 'Its', 'Their'], 1),
        mc('We love ___ school. It\'s big and modern.', ['their', 'my', 'our', 'your'], 2)]],
      ['reorder', 'Ordenar: this and that', ['This is my new watch.', 'That is our English teacher.']],
      ['reading', 'Lectura: a famous star', { title: 'A Star Like No Other',
        text: 'James Rodríguez is a soccer player. He is from Cúcuta, Colombia. He isn\'t a singer, but he loves music.\n\n'
          + 'His fans are from many countries: Spain, Germany, Brazil, and Mexico. They say, "James, you rock!"' }, [
        mc('Where is James Rodríguez from?', ['Colombia', 'Spain', 'Brazil', 'Mexico'], 0),
        tf('James is a famous singer.', false)]],
      ['fill', 'Completar: questions', [
        'Where {{are}} (is / are) your grandparents from?',
        '{{Is}} (Is / Are) Mr. Díaz your math teacher?']],
      ['listening', 'Audio: see you later', [
        'Leo: Hey, Mia! How\'s it going?',
        'Mia: Great, thanks! Is that your cousin?',
        'Leo: Yes, he is. His name is Daniel. He\'s from Canada.',
        'Mia: Cool! Nice to meet you, Daniel. See you later, guys!'], [
        tf('Daniel is Leo\'s cousin.', true),
        mc('Where is Daniel from?', ['Chile', 'England', 'The USA', 'Canada'], 3)]],
    ],
    sueltas: [
      ['matching', 'Emparejar: countries and nationalities', 'oceano', 'Match each country with its nationality.', { pairs: [
        ['Colombia', 'Colombian'], ['Brazil', 'Brazilian'], ['Mexico', 'Mexican'], ['Spain', 'Spanish'], ['France', 'French'],
        ['Japan', 'Japanese'], ['Canada', 'Canadian'], ['England', 'English'], ['Italy', 'Italian'], ['China', 'Chinese'],
      ].map(([left, right]) => ({ left, right })) }],
      ['crossword', 'Crucigrama: jobs', 'cuaderno', 'Read the clues and complete the crossword.', { items: [
        { answer: 'teacher', clue: 'This person works at a school and helps students learn.' },
        { answer: 'doctor', clue: 'This person helps sick people in a hospital.' },
        { answer: 'chef', clue: 'This person cooks food in a restaurant.' },
        { answer: 'pilot', clue: 'This person flies a plane.' },
        { answer: 'singer', clue: 'This person sings songs at concerts.' },
        { answer: 'nurse', clue: 'This person takes care of patients with a doctor.' },
        { answer: 'engineer', clue: 'This person designs bridges, machines, or buildings.' },
        { answer: 'firefighter', clue: 'This person puts out fires.' },
      ] }],
      ['quiz', 'Quiz: all about me', 'concurso', 'Choose the correct answer.', { questions: [
        mc('I ___ thirteen years old.', ['is', 'am', 'are'], 1),
        mc('They ___ from Argentina. They\'re from Chile.', ['isn\'t', 'aren\'t', 'not'], 1),
        mc('"___ is your birthday?" "In May."', ['Who', 'What', 'When'], 2),
        mc('"___ old is your brother?" "He\'s fifteen."', ['How', 'What', 'Where'], 0),
        mc('Look at ___ bird over there, on the tree!', ['this', 'that', 'these'], 1),
        mc('She is ___ artist from Bogotá.', ['an', 'a', 'the'], 0),
        mc('Sara and Pablo are my friends. ___ house is near the park.', ['Our', 'His', 'Their'], 2),
        mc('"Is he your uncle?" "No, he ___."', ['isn\'t', 'aren\'t', 'not'], 0),
        tf('"My sister are a nurse." is correct.', false),
        tf('"Where are you from?" is correct.', true),
      ] }],
    ] },

  // ---------------------------------------------------------------- Unit 2
  { n: 2, title: 'Unit 2 · Places and Possessions',
    description: 'There is / there are, how many + plurals, have / has, prepositions of place · Vocabulario: rooms, clothes, school places',
    explicacion: [
      '# There is and there are',
      'We use **there is** with one thing and **there are** with two or more.',
      'Affirmative | Negative | Question',
      'There\'s a park. | There isn\'t a zoo. | Is there a library?',
      'There are two museums. | There aren\'t any cinemas. | Are there any shops?',
      'ej: There are three bedrooms in my house. (Hay tres habitaciones en mi casa.)',
      '! **There is / there are** = hay.',
      '',
      '# How many?',
      'We use **how many** + a plural noun to ask about numbers.',
      '- book → books, bus → buses, watch → watches',
      '- child → children, person → people, foot → feet',
      'ej: How many students are there in your class? (¿Cuántos estudiantes hay en tu clase?)',
      '',
      '# Have and has',
      'I / you / we / they **have** · he / she / it **has**',
      'ej: My school has a big gym. (Mi colegio tiene un gimnasio grande.)',
      'ej: Do you have a smartphone? No, I don\'t. (¿Tienes celular? No.)',
      '! En preguntas y negativas con he / she se usa **does / doesn\'t** + **have**: She doesn\'t have a laptop.',
      '',
      '# Where is it?',
      '- **in** the box · **on** the table · **under** the bed',
      '- **next to** the door · **behind** the sofa · **in front of** the TV',
    ],
    ej: [
      ['reorder', 'Ordenar: my house', ['There is a big sofa in the living room.', 'Are there any posters in your bedroom?']],
      ['quiz', 'There is or there are?', [
        mc('___ two bathrooms in my house.', ['There is', 'There isn\'t', 'Is there', 'There are'], 3),
        mc('___ a library at your school?', ['Is there', 'Are there', 'There is', 'There are'], 0)]],
      ['fill', 'Completar: plurals', [
        'There are three {{boxes}} (box) under my bed.',
        'How many {{children}} (child) are there in the park?']],
      ['listening', 'Audio: my favorite outfit', [
        'Interviewer: What\'s your favorite outfit, Emma?',
        'Emma: My blue jeans, a white T-shirt, and my green hoodie.',
        'Interviewer: Nice! Do you have sneakers, too?',
        'Emma: Yes, I do. I have black sneakers. They\'re pretty awesome!'], [
        mc('What color is Emma\'s hoodie?', ['Blue', 'Green', 'White', 'Black'], 1),
        tf('Emma doesn\'t have sneakers.', false)]],
      ['reading', 'Lectura: our school', { title: 'Welcome to Green Hills School',
        text: 'Green Hills School is in the north of the city. There are twenty classrooms and a big library with tons of books.\n\n'
          + 'There isn\'t a swimming pool, but there is a soccer field behind the school. The cafeteria is next to the gym.' }, [
        mc('Where is the soccer field?', ['In front of the school', 'Next to the gym', 'Behind the school', 'In the library'], 2),
        tf('There is a swimming pool at the school.', false)]],
      ['quiz', 'Have or has?', [
        mc('My brother ___ a new bicycle.', ['have', 'having', 'is', 'has'], 3),
        mc('___ you have a laptop?', ['Does', 'Do', 'Are', 'Is'], 1)]],
      ['reorder', 'Ordenar: where is it?', ['My backpack is under the desk.', 'The cat is behind the sofa.']],
      ['reading', 'Lectura: Kevin\'s bedroom', { title: 'Kevin\'s Bedroom',
        text: 'Kevin\'s bedroom is small but cool. There is a bed next to the window and a desk in front of the bed.\n\n'
          + 'His soccer ball is under the bed, and his headphones are on the desk. There are two posters on the wall.' }, [
        mc('Where are Kevin\'s headphones?', ['On the desk', 'Under the bed', 'On the wall', 'In the closet'], 0),
        tf('There are two posters on the wall.', true)]],
      ['fill', 'Completar: have and has', [
        'Sofía {{has}} (have / has) a red skirt.',
        'We {{don\'t|do not}} (doesn\'t / don\'t) have a garden.']],
      ['listening', 'Audio: a new city', [
        'Paula: Is there a museum in your town, Sam?',
        'Sam: Yes, there is. And there are two parks.',
        'Paula: Are there any cinemas?',
        'Sam: No, there aren\'t. That\'s no good! But there\'s a big mall.'], [
        tf('There are two parks in Sam\'s town.', true),
        mc('What is there in Sam\'s town?', ['A zoo', 'Two cinemas', 'A beach', 'A big mall'], 3)]],
    ],
    sueltas: [
      ['classify', 'Clasificar: rooms of the house', 'corcho', 'Put each object in the correct room.', { groups: [
        { name: 'Kitchen', items: ['fridge', 'stove'] },
        { name: 'Bedroom', items: ['bed', 'pillow', 'closet'] },
        { name: 'Bathroom', items: ['shower', 'toilet', 'towel'] },
        { name: 'Living room', items: ['sofa', 'armchair'] },
      ] }],
      ['wordsearch', 'Sopa de letras: clothes', 'espacio', 'Find the clothes in the puzzle.', {
        items: ['jeans', 'hoodie', 'jacket', 'sneakers', 'skirt', 'dress', 'shorts', 'blouse', 'cap', 'socks'].map(word => ({ word })),
        diagonal: true, backwards: false }],
      ['hangman', 'Ahorcado: places at school', 'pixel', 'Read the clue and guess the word.', { lives: 6, items: [
        { word: 'library', hint: 'You can read and borrow books here.' },
        { word: 'cafeteria', hint: 'Students eat lunch here.' },
        { word: 'classroom', hint: 'You have your lessons here with your teacher.' },
        { word: 'gym', hint: 'You do sports and exercise here.' },
        { word: 'playground', hint: 'Children play outside here at recess.' },
        { word: 'laboratory', hint: 'You do science experiments here.' },
        { word: 'office', hint: 'The principal works here.' },
        { word: 'restroom', hint: 'You wash your hands here.' },
      ] }],
    ] },

  // ---------------------------------------------------------------- Unit 3
  { n: 3, title: 'Unit 3 · Bliss on a Dish!',
    description: 'Countable / uncountable, some / any, how much / how many, this / these / that / those, whose, possessive pronouns · Vocabulario: food, containers, stores',
    explicacion: [
      '# Countable and uncountable',
      'We can count **apples**, **eggs** and **sandwiches**. We can\'t count **milk**, **rice** or **cheese**.',
      'Countable | Uncountable',
      'an apple, two apples | some milk',
      'a sandwich, three sandwiches | some rice',
      '! Lo que no se cuenta no lleva **a / an** ni plural: "some bread", no "a bread".',
      '',
      '# Some and any',
      '- **some** in affirmative sentences: There are some bananas.',
      '- **any** in negatives and questions: We don\'t have any onions. Do you have any fruit?',
      'ej: Is there any juice in the fridge? (¿Hay jugo en la nevera?)',
      '',
      '# How much or how many?',
      '= How many + countable noun: How many eggs are there?',
      '= How much + uncountable noun: How much sugar is there?',
      '! **How many** = cuántos. **How much** = cuánto (y también para precios: How much is it?).',
      '',
      '# Whose is it?',
      'Possessive adjective | Possessive pronoun',
      'It\'s my bag. | It\'s mine.',
      'It\'s your cap. | It\'s yours.',
      'It\'s his / her phone. | It\'s his / hers.',
      'They\'re our / their books. | They\'re ours / theirs.',
      'ej: Whose sweater is this? It\'s Bob\'s. (¿De quién es este suéter? Es de Bob.)',
    ],
    ej: [
      ['reorder', 'Ordenar: at the restaurant', ['I would like a cheese sandwich, please.', 'How much is a glass of juice?']],
      ['quiz', 'Some or any?', [
        mc('There are ___ apples in the basket.', ['any', 'some', 'an', 'much'], 1),
        mc('We don\'t have ___ milk. Let\'s go to the store.', ['some', 'a', 'many', 'any'], 3)]],
      ['fill', 'Completar: how much or how many?', [
        'How {{many}} (much / many) tomatoes do we need?',
        'How {{much}} (much / many) water do you drink every day?']],
      ['listening', 'Audio: ordering lunch', [
        'Waiter: Hello! Are you ready to order?',
        'Lucía: Yes. I\'d like a chicken salad and a bottle of water, please.',
        'Waiter: Anything for dessert?',
        'Lucía: Yes, some ice cream. I have a sweet tooth!'], [
        mc('What does Lucía want to drink?', ['Orange juice', 'Soda', 'A bottle of water', 'Milk'], 2),
        tf('Lucía doesn\'t want dessert.', false)]],
      ['reading', 'Lectura: veggie burgers', { title: 'Burgers Without Meat',
        text: 'Many people want to cut back on meat. Now there are burgers made of beans, mushrooms, and rice. They are healthy and mouth-watering!\n\n'
          + 'At Nico\'s Café, there aren\'t any beef burgers. The fave is the black bean burger with some cheese and tomato.' }, [
        mc('What is the favorite burger at Nico\'s Café?', ['The black bean burger', 'The beef burger', 'The chicken burger', 'The fish burger'], 0),
        tf('There are beef burgers at Nico\'s Café.', false)]],
      ['quiz', 'This, that, these or those?', [
        mc('___ cookies here are delicious!', ['That', 'This', 'These', 'Those'], 2),
        mc('Look at ___ mountains over there.', ['those', 'this', 'these', 'that'], 0)]],
      ['reorder', 'Ordenar: whose is it?', ['Whose backpack is this?', 'The red cap is mine.']],
      ['reading', 'Lectura: lost and found', { title: 'The Lost and Found Box',
        text: 'There are many things in the lost and found box. The green water bottle is Pedro\'s. The pink lunch box is Ana\'s.\n\n'
          + 'The two blue jackets are the twins\'. They are theirs. The black umbrella is the teacher\'s.' }, [
        mc('Whose is the pink lunch box?', ['Pedro\'s', 'The teacher\'s', 'The twins\'', 'Ana\'s'], 3),
        tf('The blue jackets belong to the twins.', true)]],
      ['fill', 'Completar: possessive pronouns', [
        'This is Laura\'s phone. It\'s {{hers}} (her / hers).',
        'These are our tickets. They\'re {{ours}} (our / ours).']],
      ['listening', 'Audio: at the grocery store', [
        'Clerk: Good morning! Can I help you?',
        'Mateo: Yes, please. How much are the eggs?',
        'Clerk: They\'re three dollars a dozen.',
        'Mateo: OK, a dozen eggs and a bag of rice, please.'], [
        tf('A dozen eggs costs three dollars.', true),
        mc('What else does Mateo buy?', ['A bottle of oil', 'A box of cereal', 'A carton of milk', 'A bag of rice'], 3)]],
    ],
    sueltas: [
      ['memory', 'Memoria: food', 'oceano', 'Find each picture with its word.', { pairs: [
        ['🍎', 'apple'], ['🥚', 'egg'], ['🧀', 'cheese'], ['🍞', 'bread'], ['🥛', 'milk'], ['🍚', 'rice'], ['🐟', 'fish'], ['🍯', 'honey'],
      ].map(([e, word], i) => ({ word, image: emojiPng(e, FONDOS[i]) })) }],
      ['classify', 'Clasificar: count it or not?', 'pizarra', 'Put each word in the correct group.', { groups: [
        { name: 'Countable', items: ['apple', 'sandwich', 'banana', 'cookie', 'egg'] },
        { name: 'Uncountable', items: ['milk', 'rice', 'cheese', 'water', 'flour'] },
      ] }],
      ['anagram', 'Anagrama: food containers', 'cielo', 'Put the letters in order to make the word.', { items: [
        { word: 'bottle', hint: 'Water and soda come in this.' },
        { word: 'carton', hint: 'A paper box for milk or juice.' },
        { word: 'jar', hint: 'A glass container for honey or jam.' },
        { word: 'can', hint: 'A metal container for soda or tuna.' },
        { word: 'bag', hint: 'Rice or bread can come in this.' },
        { word: 'box', hint: 'Cereal comes in this.' },
        { word: 'bowl', hint: 'You eat soup or cereal from it.' },
        { word: 'glass', hint: 'You drink juice from it.' },
      ] }],
    ] },

  // ---------------------------------------------------------------- Unit 4
  { n: 4, title: 'Unit 4 · Enjoy Life!',
    description: 'Love / like / don\'t like / hate (+ -ing), object pronouns, questions with like · Vocabulario: school subjects, days of the week, pets',
    explicacion: [
      '# Likes and dislikes',
      'love → like → don\'t like → hate',
      '- I **love** cats. She **likes** turtles.',
      '- After these verbs, we can use **verb + -ing**: We **hate washing** the dishes.',
      'ej: He likes playing video games on Fridays. (A él le gusta jugar videojuegos los viernes.)',
      '! Con he / she / it el verbo lleva **-s**: she like**s**, he doesn\'t like.',
      '',
      '# Spelling: -ing',
      'Rule | Example',
      'Most verbs: add -ing | read → reading',
      'Verb ends in -e: take off the e | dance → dancing',
      'Vowel + consonant: double it | run → running, swim → swimming',
      '',
      '# Object pronouns',
      'Subject | Object',
      'I / you | me / you',
      'he / she / it | him / her / it',
      'we / they | us / them',
      'ej: I love my grandma. I visit her every Sunday. (Amo a mi abuela. La visito cada domingo.)',
      '! El pronombre de objeto va después del verbo: I like **them**.',
    ],
    ej: [
      ['reorder', 'Ordenar: my favorite things', ['I love watching movies on Saturdays.', 'Do you like playing chess?']],
      ['quiz', 'Like or likes?', [
        mc('My sister ___ science. It\'s her favorite subject.', ['like', 'liking', 'likes', 'to likes'], 2),
        mc('We don\'t ___ doing homework on Sundays.', ['like', 'likes', 'liking', 'are like'], 0)]],
      ['fill', 'Completar: -ing', [
        'Tom hates {{getting}} (get) up early.',
        'They love {{dancing}} (dance) at parties.']],
      ['listening', 'Audio: a new pet', [
        'Nora: I have a new pet! It\'s a hamster.',
        'Ben: Cool! Is it friendly?',
        'Nora: Yes, it\'s very playful. It loves running in its wheel.',
        'Ben: I don\'t like hamsters, but I\'m crazy about rabbits.'], [
        mc('What is Nora\'s new pet?', ['A rabbit', 'A turtle', 'A cat', 'A hamster'], 3),
        tf('Ben is crazy about hamsters.', false)]],
      ['reading', 'Lectura: weekdays and moods', { title: 'Mondays and Fridays',
        text: 'Many students don\'t like Mondays. They feel tired and a little grumpy. Paula is different: she loves Mondays because she has art class.\n\n'
          + 'On Fridays, everybody is happy. Paula and her friends go to the park after school. They love it!' }, [
        mc('Why does Paula love Mondays?', ['She has art class.', 'She goes to the park.', 'She sleeps late.', 'She has no homework.'], 0),
        tf('Paula and her friends go to the park on Fridays.', true)]],
      ['quiz', 'Object pronouns', [
        mc('Where is my phone? I can\'t find ___.', ['him', 'it', 'them', 'us'], 1),
        mc('Our teacher is great. She helps ___ a lot.', ['we', 'our', 'ours', 'us'], 3)]],
      ['reorder', 'Ordenar: questions', ['What kind of music do you like?', 'Does he like math?']],
      ['reading', 'Lectura: a class survey', { title: 'Our Class Survey',
        text: 'We asked 20 students about school subjects. Twelve students love P.E., and five like music best. Only three students like math the most.\n\n'
          + 'Most students don\'t like history. Don\'t get me wrong: the teacher is cool, but the tests are hard!' }, [
        mc('How many students love P.E.?', ['Five', 'Three', 'Twelve', 'Twenty'], 2),
        tf('Most students love history.', false)]],
      ['fill', 'Completar: do or does?', [
        '{{Does}} (Do / Does) your brother like spiders?',
        'I {{don\'t|do not}} (don\'t / doesn\'t) like scary movies.']],
      ['listening', 'Audio: weekend plans', [
        'Max: Let\'s watch a movie on Saturday. Do you like comedies?',
        'Eva: Yes, I love them! I\'m in!',
        'Max: Great. Do you want to invite Julia?',
        'Eva: Sure! She loves popcorn. I can call her tonight.'], [
        tf('Eva loves comedies.', true),
        mc('Who can call Julia?', ['Max', 'Julia\'s mom', 'Eva', 'Nobody'], 2)]],
    ],
    sueltas: [
      ['matching', 'Emparejar: school subjects', 'corcho', 'Match each subject with what you do in it.', { pairs: [
        ['math', 'add, subtract, and solve problems'], ['science', 'do experiments and study nature'],
        ['history', 'learn about the past'], ['geography', 'study countries, maps, and rivers'],
        ['art', 'paint and draw pictures'], ['music', 'sing and play instruments'],
        ['P.E.', 'run, jump, and play sports'], ['English', 'speak and read in another language'],
      ].map(([left, right]) => ({ left, right })) }],
      ['dictation', 'Dictado: likes and dislikes', 'pizarra', 'Listen and write what you hear.', {
        items: [
          { text: 'I love my cat.' }, { text: 'She likes swimming.' }, { text: 'We hate washing the dishes.' },
          { text: 'Do you like science?' }, { text: 'He doesn\'t like Mondays.' }, { text: 'They love going out on weekends.' },
          { text: 'My favorite day is Friday.' }, { text: 'I\'m crazy about music.' },
        ], rate: 0.9, voz: 'variada' }],
      ['random', 'Al azar: let\'s talk about you', 'pixel', 'Take a card and answer the question.', { look: 'cards', items: [
        { text: 'What is your favorite school subject? Why?' },
        { text: 'What do you love doing on weekends?' },
        { text: 'What chore do you hate doing?' },
        { text: 'Do you have a pet? What is it like?' },
        { text: 'What is your favorite day of the week?' },
        { text: 'What kind of movies do you like?' },
        { text: 'What food don\'t you like?' },
        { text: 'Who is your best friend? What do you like doing with him or her?' },
      ] }],
    ] },

  // ---------------------------------------------------------------- Unit 5
  { n: 5, title: 'Unit 5 · It\'s Time to Have Fun!',
    description: 'Simple present (routines), in / on / at, adverbs and expressions of frequency, suggestions · Vocabulario: the time, routines, chores, sports',
    explicacion: [
      '# Routines',
      'We use the **simple present** for things we usually do.',
      'I / you / we / they | he / she / it',
      'I get up at seven. | Paul gets up at seven.',
      'They don\'t play soccer. | She doesn\'t play soccer.',
      'Do you have breakfast? | Does he take a shower?',
      '! Con he / she / it: **-s** (plays), **-es** (watches, goes) o **-ies** (studies).',
      '',
      '# In, on, at',
      '- **at** + times: at seven o\'clock, at noon, at night',
      '- **on** + days and dates: on Monday, on July 14, on the weekend',
      '- **in** + months, years, parts of the day: in May, in 2026, in the morning',
      'ej: I do my homework in the afternoon. (Hago mi tarea por la tarde.)',
      '',
      '# How often?',
      'never (0 %) → sometimes → usually → always (100 %)',
      '- The adverb goes **before** the verb: He usually makes his bed.',
      '- With **be**, it goes **after**: She is always on time.',
      '- Expressions: **once**, **twice**, **three times** a day / a week / a month.',
      'ej: I go to karate class twice a week. (Voy a karate dos veces por semana.)',
      '! **never** ya es negativo: "They never eat meat", no "They don\'t never".',
    ],
    ej: [
      ['reorder', 'Ordenar: my morning', ['I usually get up at six thirty.', 'She takes a shower in the morning.']],
      ['quiz', 'In, on or at?', [
        mc('My birthday is ___ June.', ['on', 'at', 'in', 'every'], 2),
        mc('We have English class ___ Tuesday.', ['on', 'in', 'at', 'for'], 0)]],
      ['fill', 'Completar: he / she', [
        'My dad {{watches}} (watch) the news every night.',
        'Lucía {{studies}} (study) English on Saturdays.']],
      ['listening', 'Audio: my weekend', [
        'Sam: What do you do on weekends, Clara?',
        'Clara: On Saturdays, I always tidy up my room. Then I play volleyball.',
        'Sam: And on Sundays?',
        'Clara: I sometimes eat out with my family. We love pizza!'], [
        mc('What does Clara play on Saturdays?', ['Soccer', 'Tennis', 'Basketball', 'Volleyball'], 3),
        tf('Clara always eats out on Sundays.', false)]],
      ['reading', 'Lectura: Lucía\'s week', { title: 'Lucía\'s Weekly Schedule',
        text: 'Lucía is very busy. She goes to school from Monday to Friday. She has swimming lessons twice a week, on Tuesdays and Thursdays.\n\n'
          + 'On Wednesdays, she helps her mom with the chores. She never watches TV on school days, but she reads before bed.' }, [
        mc('How often does Lucía have swimming lessons?', ['Once a week', 'Twice a week', 'Every day', 'Three times a week'], 1),
        tf('Lucía watches TV every school day.', false)]],
      ['quiz', 'Adverbs of frequency', [
        mc('He is ___ late. He arrives on time every day.', ['always', 'usually', 'sometimes', 'never'], 3),
        mc('Which sentence is correct?', ['I go always to bed at ten.', 'Always I go to bed at ten.', 'I always go to bed at ten.', 'I go to bed always at ten.'], 2)]],
      ['reorder', 'Ordenar: suggestions', ['Why don\'t we go to the park?', 'How about playing basketball?']],
      ['reading', 'Lectura: chores at home', { title: 'Who Does the Chores?',
        text: 'In Diego\'s house, everybody helps. His mom cooks dinner, and his dad washes the dishes. Diego takes out the trash every day.\n\n'
          + 'His little sister feeds the cat. On Sundays, they all clean the house together. Then they eat out.' }, [
        mc('What does Diego do every day?', ['He takes out the trash.', 'He cooks dinner.', 'He feeds the cat.', 'He washes the dishes.'], 0),
        tf('The family cleans the house on Sundays.', true)]],
      ['fill', 'Completar: questions', [
        'What time {{does}} (do / does) your class start?',
        'How {{often}} (often / many) do you play video games?']],
      ['listening', 'Audio: what time is it?', [
        'Marco: Excuse me, what time is it?',
        'Woman: It\'s a quarter past four.',
        'Marco: Oh, no! My soccer practice is at four thirty.',
        'Woman: Don\'t worry. The field is next to the park. You can walk there.'], [
        tf('It is four fifteen.', true),
        mc('What time is Marco\'s soccer practice?', ['At four o\'clock', 'At five o\'clock', 'At a quarter to four', 'At four thirty'], 3)]],
    ],
    sueltas: [
      ['reorder', 'Reordenar: how often?', 'corcho', 'Put the words in the correct order.', { items: [
        { sentence: 'I always brush my teeth after lunch.' },
        { sentence: 'She never drinks coffee.' },
        { sentence: 'We usually walk to school.' },
        { sentence: 'He is sometimes tired on Mondays.' },
        { sentence: 'They play tennis twice a week.' },
        { sentence: 'How often do you clean your room?' },
        { sentence: 'My dad cooks dinner every night.' },
        { sentence: 'Do you get up early on Sundays?' },
      ] }],
      ['hangman', 'Ahorcado: chores', 'cuaderno', 'Read the clue and guess the word.', { lives: 6, items: [
        { word: 'dishes', hint: 'You wash these after you eat.' },
        { word: 'trash', hint: 'You take this out of the house in a bag.' },
        { word: 'laundry', hint: 'Dirty clothes that you need to wash.' },
        { word: 'bed', hint: 'You make it in the morning after you get up.' },
        { word: 'floor', hint: 'You sweep or mop it.' },
        { word: 'plants', hint: 'You water them so they can grow.' },
        { word: 'table', hint: 'You set it before dinner and clear it after.' },
        { word: 'vacuum', hint: 'A machine that cleans the carpet.' },
      ] }],
      ['quiz', 'Quiz: daily life', 'espacio', 'Choose the correct answer.', { questions: [
        mc('My brother ___ to school by bus.', ['go', 'goes', 'going'], 1),
        mc('We have lunch ___ noon.', ['at', 'in', 'on'], 0),
        mc('I go to the dentist ___ a year. In March and in September.', ['once', 'twice', 'three times'], 1),
        mc('"___ does the movie start?" "At eight."', ['How often', 'Where', 'What time'], 2),
        mc('She ___ like getting up early.', ['don\'t', 'doesn\'t', 'isn\'t'], 1),
        mc('They play video games ___ the weekend.', ['on', 'in', 'at'], 0),
        mc('"Let\'s go to the movies!" "___"', ['Good idea!', 'At eight.', 'Yes, I do.'], 0),
        mc('It\'s 7:45. It\'s a quarter ___ eight.', ['past', 'to', 'at'], 1),
        tf('"He never doesn\'t eat breakfast." is correct.', false),
        tf('"I usually do my homework in the afternoon." is correct.', true),
      ] }],
    ] },

  // ---------------------------------------------------------------- Unit 6
  { n: 6, title: 'Unit 6 · Birds of a Feather',
    description: 'Present progressive (now and plans), can / can\'t, good / bad at, describing people · Vocabulario: instruments, music, appearance',
    explicacion: [
      '# What are you doing now?',
      'We use the **present progressive** for actions happening right now: **be + verb-ing**.',
      'Affirmative | Negative | Question',
      'I\'m eating a sandwich. | I\'m not sleeping. | Am I singing well?',
      'She\'s reading. | He isn\'t playing. | Is he dancing?',
      'They\'re having fun. | We aren\'t studying. | Are they listening?',
      'ej: Look! The band is playing my favorite song. (¡Mira! La banda está tocando mi canción favorita.)',
      '! También sirve para planes con fecha: I\'m visiting my grandma on Saturday.',
      '',
      '# Can and can\'t',
      '- I **can** swim. He **can\'t** sing.',
      '- **Can** you play the guitar? Yes, I can. / No, I can\'t.',
      '! Después de **can** el verbo va sin -s ni -ing: She can dance.',
      '',
      '# Good at and bad at',
      'ej: Messi is good at soccer. (Messi es bueno para el fútbol.)',
      'ej: I\'m bad at drawing. (Soy malo para dibujar.)',
      '! Después de **at**: sustantivo o verbo con **-ing**.',
      '',
      '# Describing people',
      '- He is **tall** / **short** and **thin** / **strong**.',
      '- She has **long**, **straight**, **black** hair: length → type → color.',
      '- He has **big blue** eyes.',
    ],
    ej: [
      ['reorder', 'Ordenar: right now', ['My brother is playing the drums.', 'Are you listening to music?']],
      ['quiz', 'Present progressive', [
        mc('Shh! The baby ___.', ['sleeps', 'is sleeping', 'are sleeping', 'sleeping'], 1),
        mc('___ they watching a concert?', ['Is', 'Do', 'Are', 'Does'], 2)]],
      ['fill', 'Completar: -ing', [
        'Look! Ana is {{running}} (run) in the park.',
        'We are {{having}} (have) a great time.']],
      ['listening', 'Audio: on the phone', [
        'Jake: Hi, Lina! What are you doing?',
        'Lina: I\'m practicing the piano. I have a concert on Friday.',
        'Jake: Lucky you! I\'m doing my math homework. Ugh!',
        "Lina: Oh, I'm bad at math, too. Good luck!"], [
        mc('What is Lina doing?', ['Doing homework', 'Watching TV', 'Playing the guitar', 'Practicing the piano'], 3),
        tf('Jake is doing his math homework.', true)]],
      ['reading', 'Lectura: a great athlete', { title: 'A Paralympic Star',
        text: 'Moisés Fuentes is a Colombian swimmer. He can\'t walk, but he can swim very fast. He is really good at the breaststroke.\n\n'
          + 'He has short black hair and brown eyes. Right now, he is training for a new competition. He is out of this world!' }, [
        mc('What is Moisés good at?', ['Running', 'The breaststroke', 'Cycling', 'Playing music'], 1),
        tf('Moisés has long blond hair.', false)]],
      ['quiz', 'Can or can\'t?', [
        mc('Penguins are birds, but they ___ fly.', ['can', 'are', 'can\'t', 'don\'t can'], 2),
        mc('"Can your sister play the violin?" "Yes, she ___."', ['can', 'does', 'is', 'plays'], 0)]],
      ['reorder', 'Ordenar: good at', ['She is good at playing the guitar.', 'I am bad at singing.']],
      ['reading', 'Lectura: my favorite band', { title: 'The Sunny Days',
        text: 'My favorite band is The Sunny Days. There are four members. Mia is the singer. She has long, curly, red hair.\n\n'
          + 'Leo plays the drums, and the twins play the guitar and the keyboard. This month, they are touring South America!' }, [
        mc('Who plays the drums?', ['Mia', 'The twins', 'Leo', 'Nobody'], 2),
        tf('The band is touring South America this month.', true)]],
      ['fill', 'Completar: plans', [
        'I {{am}} (am / is) visiting my cousins on Sunday.',
        '{{Are}} (Is / Are) you going out next Friday night?']],
      ['listening', 'Audio: who is she?', [
        'Tim: Who is that girl next to the window?',
        'Rosa: That\'s Camila. She\'s my new neighbor.',
        'Tim: The tall girl with short brown hair?',
        'Rosa: Yes! She can play the saxophone. She\'s showing off her new one today.'], [
        mc('What does Camila look like?', ['Short with long hair', 'Tall with long black hair', 'Short with curly hair', 'Tall with short brown hair'], 3),
        tf('Camila can play the saxophone.', true)]],
    ],
    sueltas: [
      ['crossword', 'Crucigrama: musical instruments', 'clasico', 'Read the clues and complete the crossword.', { items: [
        { answer: 'guitar', clue: 'It has six strings. Rock and pop bands play it.' },
        { answer: 'drums', clue: 'You hit them with two sticks.' },
        { answer: 'piano', clue: 'It has black and white keys.' },
        { answer: 'violin', clue: 'A small string instrument. You play it with a bow.' },
        { answer: 'flute', clue: 'A long, thin instrument. You blow into it.' },
        { answer: 'trumpet', clue: 'A loud metal instrument with three buttons.' },
        { answer: 'saxophone', clue: 'A metal instrument used a lot in jazz.' },
        { answer: 'keyboard', clue: 'An electric piano.' },
      ] }],
      ['fill', 'Completar: what are they doing?', 'oceano', 'Write the missing word. Use the clue in parentheses.', { items: [
        { text: 'Mom {{is}} (is / are) cooking dinner.', bank: [] },
        { text: 'The kids are {{swimming}} (swim) in the pool.', bank: [] },
        { text: 'I\'m {{writing}} (write) an e-mail.', bank: [] },
        { text: 'My friends {{aren\'t|are not}} (isn\'t / aren\'t) playing soccer today.', bank: [] },
        { text: 'Grandpa is {{reading}} (read) the newspaper.', bank: [] },
        { text: 'We\'re {{dancing}} (dance) to my favorite song.', bank: [] },
        { text: '{{Is}} (Is / Are) your brother sleeping?', bank: [] },
        { text: 'The dog is {{sitting}} (sit) under the table.', bank: [] },
      ] }],
      ['listening', 'Audio: the talent show', 'concurso', 'Listen to the conversation and answer the questions.', {
        audio: { kind: 'tts', rate: 1, script: [
          'Host: Welcome to the school talent show! Who is first tonight?',
          'Kim: Me! I\'m Kim, and I can play the violin.',
          'Host: Great! Who is that boy with the curly black hair?',
          'Kim: That\'s my friend Andrés. He\'s good at dancing. He\'s dancing after me.',
          'Host: And the tall girl with glasses?',
          'Kim: That\'s Sara. She can\'t sing, but she\'s really good at magic tricks!',
          'Host: Birds of a feather! OK, Kim, are you ready?',
          'Kim: Yes, I am. Let\'s go!',
        ].join('\n') },
        maxPlays: 0, showScript: false,
        questions: [
          mc('What can Kim play?', ['The piano', 'The violin', 'The drums'], 1),
          mc('What does Andrés look like?', ['He has curly black hair.', 'He is tall with glasses.', 'He has long blond hair.'], 0),
          mc('What is Andrés good at?', ['Singing', 'Magic tricks', 'Dancing'], 2),
          mc('Who wears glasses?', ['Sara', 'Kim', 'Andrés'], 0),
          tf('Sara can sing very well.', false),
          tf('Andrés is dancing after Kim.', true),
          tf('Kim is first in the talent show.', true),
          tf('The show is in the morning.', false),
        ] }],
    ] },
];

export function gnextPack({ schoolId, ownerId, courseId, daysAgo }) {
  const activities = [], units = [], assignments = [];
  let orden = 200;
  const act = (id, type, title, theme, instruction, content, periodo) =>
    activities.push({ id, schoolId, ownerId, type, grade: 6, title, theme, instruction, content, periodo, createdAt: daysAgo(0, orden--) });
  const asg = (id, periodo, extra) => ({ id, schoolId, ownerId, activityId: null, unitId: null, courseId, dueAt: null, forceSerious: false,
    timer: null, maxTries: null, showAnswers: true, createdAt: daysAgo(0, 1), ...extra });

  for (const u of UNIDADES) {
    const periodo = PERIODO_DE[u.n];
    const ids = u.ej.map((e, i) => {
      const id = `act-gn-u${u.n}-${String(i + 1).padStart(2, '0')}`;
      act(id, e[0], `U${u.n} · ${e[1]}`, 'clasico', INSTR[e[0]], ejercicio(e), periodo);
      return id;
    });
    const unitId = `unit-gn-u${u.n}`;
    units.push({ id: unitId, schoolId, ownerId, grade: 6, cefr: 'A1', periodo, createdAt: daysAgo(0, 300 - u.n),
      title: u.title, description: u.description, activityIds: ids, fases: {},
      explicacion: { video: '', texto: u.explicacion.join('\n') } });
    assignments.push(asg(`asg-${unitId.slice(5)}`, periodo, { unitId, dueAt: u.n === 6 ? daysAgo(-7) : null }));
    u.sueltas.forEach(([type, title, theme, instruction, content], i) => {
      const id = `act-gn-u${u.n}-${'abc'[i]}`;
      act(id, type, `U${u.n} · ${title}`, theme, instruction, content, periodo);
      assignments.push(asg(`asg-gn-${id.slice(7)}`, periodo, { activityId: id }));
    });
  }
  return { activities, units, assignments };
}
