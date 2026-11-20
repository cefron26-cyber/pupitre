// Catálogo de voces de Microsoft y reparto de voces según el contexto (lógica pura, sin DOM).
// Lo usan el servidor (servidor/voz.mjs: qué voz neural y con qué tono) y el navegador (editor y juego).
//
// Guion de diálogo: cada línea "Nombre: texto" la dice ese personaje; las líneas sin nombre, la narradora.
// La voz de cada personaje se elige por su nombre o rol (Mom → mujer, Grandpa → abuelo, Tom → niño…)
// y dos personajes nunca comparten voz mientras haya voces libres de ese tipo. El docente puede cambiarla.

// id → { nombre visible, voz neural, tono, ajuste de velocidad en % (para niños: un poco más lento) }
export const VOCES = {
  nina:      { nombre: 'Niña (Ana)', voz: 'en-US-AnaNeural', tono: '+0Hz', vel: -8 },
  nina_uk:   { nombre: 'Niña británica (Maisie)', voz: 'en-GB-MaisieNeural', tono: '+0Hz', vel: -6 },
  nino:      { nombre: 'Niño', voz: 'en-US-AnaNeural', tono: '-35Hz', vel: -6 },
  nino_uk:   { nombre: 'Niño británico', voz: 'en-GB-MaisieNeural', tono: '-40Hz', vel: -4 },
  mujer:     { nombre: 'Mujer (Jenny)', voz: 'en-US-JennyNeural', tono: '+0Hz', vel: -6 },
  mujer2:    { nombre: 'Mujer 2 (Ava)', voz: 'en-US-AvaNeural', tono: '+0Hz', vel: -6 },
  mujer3:    { nombre: 'Mujer 3 (Michelle)', voz: 'en-US-MichelleNeural', tono: '+0Hz', vel: -6 },
  mujer_uk:  { nombre: 'Mujer británica (Libby)', voz: 'en-GB-LibbyNeural', tono: '+0Hz', vel: -6 },
  hombre:    { nombre: 'Hombre (Andrew)', voz: 'en-US-AndrewNeural', tono: '+0Hz', vel: -6 },
  hombre2:   { nombre: 'Hombre 2 (Guy)', voz: 'en-US-GuyNeural', tono: '+0Hz', vel: -6 },
  hombre3:   { nombre: 'Hombre 3 (Brian)', voz: 'en-US-BrianNeural', tono: '+0Hz', vel: -6 },
  hombre_uk: { nombre: 'Hombre británico (Ryan)', voz: 'en-GB-RyanNeural', tono: '+0Hz', vel: -6 },
  abuela:    { nombre: 'Abuela', voz: 'en-GB-SoniaNeural', tono: '-12Hz', vel: -18 },
  abuelo:    { nombre: 'Abuelo', voz: 'en-US-ChristopherNeural', tono: '-15Hz', vel: -18 },
  narradora: { nombre: 'Narradora (Emma)', voz: 'en-US-EmmaNeural', tono: '+0Hz', vel: -6 },
  narrador:  { nombre: 'Narrador (Eric)', voz: 'en-US-EricNeural', tono: '+0Hz', vel: -6 },
};
export const VOZ_DEFECTO = 'mujer';
// Dictado "Variada": una voz distinta en cada elemento.
export const VOCES_VARIADAS = ['mujer', 'hombre', 'nina', 'nino', 'mujer_uk', 'hombre_uk'];
export const esVoz = id => Object.hasOwn(VOCES, id);

// Familias: voces que sirven para cada tipo de personaje, en orden de preferencia.
const FAMILIAS = {
  nina: ['nina', 'nina_uk'],
  nino: ['nino', 'nino_uk'],
  mujer: ['mujer', 'mujer2', 'mujer_uk', 'mujer3'],
  hombre: ['hombre', 'hombre2', 'hombre_uk', 'hombre3'],
  abuela: ['abuela', 'mujer_uk'],
  abuelo: ['abuelo', 'hombre_uk'],
  narra: ['narradora', 'narrador'],
};

const lista = s => new Set(s.split(' '));
const ROLES = {
  abuela: lista('grandma granny grandmother nana gran granma abuela grandmom'),
  abuelo: lista('grandpa grandad granddad grandfather gramps abuelo'),
  mujer: lista('mom mum mother mommy mummy mama mrs ms miss madam ma\'am lady woman aunt auntie aunty waitress nurse queen actress hostess stewardess wife'),
  hombre: lista('dad daddy father papa mr sir man uncle waiter king actor host steward husband policeman fireman postman businessman'),
  nina: lista('girl daughter sister sis princess niece'),
  nino: lista('boy son brother bro prince nephew'),
  // Adultos sin género claro: se reparte para que se oigan distintos.
  adulto: lista('teacher doctor dentist shopkeeper assistant cashier clerk receptionist customer guide officer police driver pilot chef cook seller vendor librarian tourist passenger farmer manager boss coach announcer reporter interviewer presenter scientist vet salesperson shop'),
  // Niños sin género claro.
  nene: lista('student pupil kid child friend classmate a b c d 1 2 3 4 speaker person'),
  narra: lista('narrator narración narrador narradora'),
};
const NOMBRES_F = lista('anna ana alice amy emma emily olivia sophia sofia sofía sophie mia lily lucy kate katie sarah sara jane mary laura lisa julia jessica jenny helen rachel rose ella chloe grace hannah zoe isabella isabel ava charlotte amelia maria maría valentina valeria camila daniela gabriela paula andrea natalia mariana luciana salomé salome juliana susan nancy karen betty molly ruby tina wendy meg megan ellie holly abby emily nina elena martina antonella victoria lina luna sally polly kelly amanda linda carmen ximena manuela');
const NOMBRES_M = lista('tom tommy ben sam jack harry peter paul john james mike michael max leo nick alex daniel david chris mark luke matt matthew joe joseph bob bill billy tim timmy ryan kevin steve andrew andy george henry oliver charlie noah liam ethan lucas mateo santiago sebastián sebastian samuel juan carlos luis diego andrés andres felipe nicolás nicolas martín martin pedro jorge miguel simon adam eric fred jim ted dan jake josh tony frank kyle dylan emilio tomás tomas gabriel isaac thiago emiliano jerónimo jeronimo');

const palabras = s => String(s).toLowerCase().replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean);
function familiaDe(nombre) {
  const ps = palabras(nombre);
  for (const f of ['narra', 'abuela', 'abuelo', 'mujer', 'hombre', 'nina', 'nino']) if (ps.some(p => ROLES[f].has(p))) return f;
  if (ps.some(p => ROLES.adulto.has(p))) return 'adulto';
  if (ps.some(p => NOMBRES_F.has(p))) return 'nina';
  if (ps.some(p => NOMBRES_M.has(p))) return 'nino';
  return 'nene';
}

// "Tom: Hi!" → { quien: 'Tom', texto: 'Hi!' }. El nombre: hasta 3 palabras, empieza con letra.
const LINEA = /^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9.'’ -]{0,23}?)\s*:\s*(.*)$/;
export function lineas(guion) {
  return String(guion || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(LINEA);
    if (m && m[1].trim().split(/\s+/).length <= 3 && m[2].trim()) return { quien: m[1].trim(), texto: m[2].trim() };
    return { quien: null, texto: l };
  });
}
export const claveDe = quien => (quien ? quien.toLowerCase().replace(/\s+/g, ' ') : '_narr');

// Personajes del guion con su voz: elegidas (las que puso el docente) o la del contexto.
// → [{ clave, nombre, voz, auto }]   (clave "_narr" = líneas sin nombre)
export function repartirVoces(guion, elegidas = {}) {
  const ls = lineas(guion);
  const orden = [];
  const vistos = new Map();
  for (const l of ls) {
    const k = claveDe(l.quien);
    if (!vistos.has(k)) { vistos.set(k, l.quien); orden.push(k); }
  }
  const soloNarracion = orden.length === 1 && orden[0] === '_narr';
  const usadas = new Set(orden.map(k => elegidas[k]).filter(esVoz));
  const cuenta = { mujer: 0, hombre: 0, nina: 0, nino: 0 };
  const tomar = fam => {
    const v = FAMILIAS[fam].find(x => !usadas.has(x)) || FAMILIAS[fam][0];
    usadas.add(v);
    if (fam in cuenta) cuenta[fam]++;
    return v;
  };
  return orden.map(k => {
    const nombre = vistos.get(k);
    if (esVoz(elegidas[k])) return { clave: k, nombre, voz: elegidas[k], auto: false };
    let fam;
    if (k === '_narr') {
      // Monólogo ("Hi! My name is Tom…"): suena como quien se presenta. Si no, narradora.
      const m = soloNarracion && String(guion).match(/\b(?:my name is|my name's|i am|i'm)\s+([a-zà-ÿ]+)/i);
      const f = m ? familiaDe(m[1]) : null;
      fam = f === 'nina' || f === 'nino' ? f : 'narra';
    } else {
      fam = familiaDe(nombre);
      if (fam === 'adulto') fam = cuenta.mujer <= cuenta.hombre ? 'mujer' : 'hombre';
      if (fam === 'nene') fam = cuenta.nina <= cuenta.nino ? 'nina' : 'nino';
    }
    return { clave: k, nombre, voz: tomar(fam), auto: true };
  });
}

// Guion + mapa { clave: voz } → [{ texto, voz }] para pedir el audio.
export function segmentos(guion, mapa = {}) {
  const reparto = repartirVoces(guion, mapa);
  const voz = Object.fromEntries(reparto.map(r => [r.clave, r.voz]));
  return lineas(guion).map(l => ({ texto: l.texto, voz: voz[claveDe(l.quien)] || VOZ_DEFECTO }));
}
