// Reglas de negocio compartidas (sin interfaz).

export const STATUS = {
  todo: { label: 'Pendiente', cls: 'todo' },
  doing: { label: 'En curso', cls: 'doing' },
  done: { label: 'Terminada', cls: 'done' },
  late: { label: 'Atrasada', cls: 'late' },
};
// Terminada después de la fecha límite: se acepta, pero queda marcada.
export const LATE_DONE = { label: 'Entregada tarde', cls: 'late' };
export const statusLabel = p => p.status === 'done' && p.lateDone ? LATE_DONE : STATUS[p.status];

// Grado: cada curso tiene uno; actividades y unidades también. Solo se asigna lo del mismo grado.
export const gradeLabel = g => g ? `${g}°` : 'Sin grado';
export const sameGrade = (item, course) => !!item?.grade && item.grade === course?.grade;

// Unidades: cada mini actividad vale de 0 a 100, con 2 intentos; cuenta el mejor.
export const UNIT_MAX_TRIES = 2;
export const points = (score, max) => max ? Math.round((score / max) * 100) : 0;

// list = intentos de UN estudiante en UNA actividad de una asignación
export function statusOf(assignment, list) {
  if (list.some(t => t.state === 'done')) return 'done';
  if (list.some(t => t.state === 'inprogress' && t.progress)) return 'doing';
  if (assignment.dueAt && new Date(assignment.dueAt) < new Date()) return 'late';
  return 'todo';
}

// La nota que cuenta es el mejor intento terminado.
export function bestAttempt(list) {
  const r = t => t.maxScore ? t.score / t.maxScore : 0;
  return list.filter(t => t.state === 'done')
    .sort((a, b) => r(b) - r(a) || (a.durationSec || 0) - (b.durationSec || 0))[0] || null;
}

// Estrellas de una actividad (0-100): 1★ desde 60, 2★ desde 80, 3★ con 100. Solo motivación; la nota no cambia.
export const starsOf = p => p === null || p === undefined ? 0 : p >= 100 ? 3 : p >= 80 ? 2 : p >= 60 ? 1 : 0;

// Huella corta del contenido (para saber si el docente lo editó después de que el estudiante empezó).
export function contentHash(content) {
  const s = JSON.stringify(content ?? null);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36) + ':' + s.length;
}

// Actividades que incluye una asignación (una sola, o las de la unidad en orden).
export const activityIdsOf = (assignment, unit) => assignment.unitId ? (unit?.activityIds || []) : [assignment.activityId];

// Progreso de UN estudiante en UNA asignación (actividad suelta o unidad).
// list = todos sus intentos en esa asignación (con activityId).
// Nota de la unidad = promedio de los porcentajes del mejor intento de cada actividad (todas pesan igual).
export function progressOf(assignment, ids, list) {
  const items = ids.map(id => {
    const mine = list.filter(t => t.activityId === id);
    const done = mine.filter(t => t.state === 'done');
    const best = bestAttempt(mine);
    return { id, status: statusOf(assignment, mine), best, tries: done.length, points: best ? points(best.score, best.maxScore) : null,
      firstDoneAt: done.map(t => t.finishedAt).filter(Boolean).sort()[0] || null,
      time: mine.reduce((s, t) => s + (t.durationSec || 0), 0) };
  });
  const done = items.filter(i => i.best).length;
  const total = items.length;
  let status;
  if (total && done === total) status = 'done';
  else if (items.some(i => i.status === 'doing' || i.status === 'done')) status = 'doing';
  else if (assignment.dueAt && new Date(assignment.dueAt) < new Date()) status = 'late';
  else status = 'todo';
  const ratio = done === total && total ? items.reduce((s, i) => s + i.best.score / i.best.maxScore, 0) / total : null;
  // Se entregó cuando quedó terminada la última actividad; si fue después de la fecha límite, es tarde.
  const doneAt = status === 'done' ? items.map(i => i.firstDoneAt).filter(Boolean).sort().pop() || null : null;
  const lateDone = !!(doneAt && assignment.dueAt && new Date(doneAt) > new Date(assignment.dueAt));
  const unitPoints = ratio === null ? null : Math.round(items.reduce((s, i) => s + i.points, 0) / total);
  return { items, done, total, status, ratio, unitPoints, lateDone, doneAt, time: items.reduce((s, i) => s + i.time, 0) };
}

// XP: no cuenta como nota. Primer intento: 10 + hasta 20 según aciertos. Repetir: 5 solo si mejora el mejor puntaje
// (así no se sube de nivel repitiendo al azar). Completar unidad: +20.
export function xpFor(result, isFirst, prevBestRatio = 0) {
  const ratio = result.maxScore ? result.score / result.maxScore : 0;
  if (!isFirst) return ratio > prevBestRatio ? 5 : 0;
  return 10 + Math.round(ratio * 20);
}
export const REVIEW_XP = 2; // por cada pregunta del repaso que acierta

// Retos: se desbloquean por nivel. Sin nota; dan XP (una vez al día cada reto) y un premio exclusivo la primera vez que se superan.
// Además, el docente puede marcar cualquier actividad como reto (activity.challengeLevel = nivel desde el que se abre).
export const RETOS = [
  { id: 'reloj', name: 'Contrarreloj', level: 2, reward: 'tenis_rayo', icon: 'timer',
    desc: 'Gánale al reloj con 60 % o más.', goal: 'Termínala antes de que se acabe el tiempo, con 60 % o más.' },
  { id: 'perfecto', name: 'Sin errores', level: 4, reward: 'f-lava', icon: 'target',
    desc: '8 seguidas sin fallar. Un error y se acaba.', goal: 'Logra 8 aciertos seguidos.' },
  { id: 'mezcla', name: 'Mezcla', level: 6, reward: 'corona', icon: 'shuffle',
    desc: '10 preguntas revueltas. Saca 80 % o más.', goal: 'Acierta el 80 % o más.' },
  { id: 'maraton', name: 'Maratón', level: 8, reward: 'f-aurora', icon: 'route',
    desc: 'Una unidad entera de corrido. Saca 80 % o más.', goal: 'Acierta el 80 % o más.' },
];
export const RETO_XP = 2; // por acierto
// ¿Superó el reto? (para el premio exclusivo)
export function retoPassed(id, res) {
  const r = res.maxScore ? res.score / res.maxScore : 0;
  if (id === 'reloj') return !res.timeUp && r >= 0.6;
  if (id === 'perfecto') return res.score >= Math.min(8, res.maxScore);
  return r >= 0.8;
}
// Cuántos elementos tiene una actividad (para calcular el tiempo del contrarreloj).
export const itemCount = c => c?.questions?.length || c?.items?.length || c?.pairs?.length || (c?.groups || []).reduce((s, g) => s + g.items.length, 0) || 1;

// Banco de preguntas ya respondidas (pregunta + respuesta correcta) → preguntas de opción múltiple para un Quiz.
export function quizFromAnswers(attemptList, { max = 10, rnd = Math.random } = {}) {
  const txt = v => Array.isArray(v) ? String(v[0] ?? '') : v === undefined || v === null ? '' : String(v);
  const map = new Map();
  for (const t of attemptList) for (const a of t.answers || []) {
    const q = txt(a?.question).trim(), exp = txt(a?.expected).trim();
    if (q && exp) map.set(q + '\u0000' + exp, { q, exp, given: txt(a.given).trim() });
  }
  const mix = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const all = [...map.values()];
  const pool = [...new Set(all.map(x => x.exp))];
  const low = s => s.toLowerCase();
  return mix(all).slice(0, max).map(x => {
    const opts = [x.exp];
    if (x.given && low(x.given) !== low(x.exp)) opts.push(x.given);
    for (const o of mix(pool)) { if (opts.length >= 3) break; if (!opts.some(y => low(y) === low(o))) opts.push(o); }
    if (opts.length < 2) return null;
    const options = mix(opts);
    return { q: x.q, options, correct: options.indexOf(x.exp) };
  }).filter(Boolean);
}

// Repaso de preguntas falladas: las que falló y no ha vuelto a acertar (la más reciente manda).
// Devuelve preguntas de opción múltiple listas para el Quiz: { q, options, correct }.
export function reviewQuestions(doneAttempts, max = 8, rnd = Math.random) {
  const txt = v => Array.isArray(v) ? String(v[0] ?? '') : v === undefined || v === null ? '' : String(v);
  const last = new Map();
  for (const t of doneAttempts) for (const a of t.answers || []) {
    const q = txt(a?.question).trim(), exp = txt(a?.expected).trim();
    if (!q || !exp) continue;
    last.set(q + '\u0000' + exp, { q, exp, given: txt(a.given).trim(), correct: !!a.correct });
  }
  const wrong = [...last.values()].filter(x => !x.correct).reverse().slice(0, max);
  const pool = [...new Set([...last.values()].map(x => x.exp))];
  const mix = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return wrong.map(x => {
    const low = s => s.toLowerCase();
    const opts = [x.exp];
    if (x.given && low(x.given) !== low(x.exp)) opts.push(x.given);
    for (const o of mix(pool)) { if (opts.length >= 3) break; if (!opts.some(y => low(y) === low(o))) opts.push(o); }
    if (opts.length < 2) return null;
    const options = mix(opts);
    return { q: x.q, options, correct: options.indexOf(x.exp) };
  }).filter(Boolean);
}
export const UNIT_BONUS_XP = 20;

// Secciones de la unidad (como las lecciones de EVOLVE / Cambridge One). Si el docente no elige, se deduce del tipo.
export const FASES = ['Vocabulario', 'Gramática', 'Lectura y escucha', 'Repaso', 'Evaluación'];
const FASE_TIPO = { matching: 'Vocabulario', memory: 'Vocabulario', wordsearch: 'Vocabulario', crossword: 'Vocabulario', hangman: 'Vocabulario', classify: 'Vocabulario', anagram: 'Vocabulario', diagram: 'Vocabulario', random: 'Repaso',
  quiz: 'Gramática', fill: 'Gramática', reorder: 'Gramática', reading: 'Lectura y escucha', listening: 'Lectura y escucha', dictation: 'Lectura y escucha' };
export const faseDe = (unit, act) => unit?.fases?.[act.id] || FASE_TIPO[act.type] || 'Gramática';


// Rangos (2026-11-21): agrupan los niveles en escalones con nombre, como las ligas de un juego. Solo motivación.
export const RANGOS = [
  { id: 'bronce', name: 'Bronce', desde: 1, icon: 'medal', color: '#c9803f' },
  { id: 'plata', name: 'Plata', desde: 3, icon: 'medal', color: '#8f9bb3' },
  { id: 'oro', name: 'Oro', desde: 5, icon: 'medal', color: '#e5a800' },
  { id: 'platino', name: 'Platino', desde: 7, icon: 'medal', color: '#2bb3a8' },
  { id: 'diamante', name: 'Diamante', desde: 10, icon: 'medal', color: '#3b82f6' },
  { id: 'leyenda', name: 'Leyenda', desde: 14, icon: 'medal', color: '#a855f7' },
];
export const rangoDe = nivel => [...RANGOS].reverse().find(r => nivel >= r.desde);
export const siguienteRango = nivel => RANGOS.find(r => r.desde > nivel) || null;
