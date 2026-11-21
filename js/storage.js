// Capa de datos aislada. Hoy: localStorage. Mañana: Supabase con la misma API (todo es async).
// Ninguna vista debe tocar localStorage directamente.
import { demoPack } from './demo.js';

const DB_KEY = 'plat.db.v1';
const SESSION_KEY = 'plat.session.v1';
// La sesión vive en sessionStorage: una por pestaña (docente en una, estudiante en otra) y se cierra al cerrar la pestaña.
const sess = window.sessionStorage;
// Código de clase: 6 caracteres sin los que se confunden (0/O, 1/I/L).
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
// Contraseña de dibujos: 3 de 9 dibujos (índices de PICTURES en ui.js), en orden.
export const PICTURE_COUNT = 9;
const newPictures = () => Array.from({ length: 3 }, () => Math.floor(Math.random() * PICTURE_COUNT));
export const SCHOOL_ID = 'sch-1';
const CURSO_PRUEBAS = { id: 'crs-prueba', schoolId: SCHOOL_ID, name: 'Pruebas', grade: 6, code: 'PRUEBA' };

const COLLECTIONS = ['schools', 'users', 'courses', 'activities', 'units', 'assignments', 'attempts', 'xpLedger', 'events', 'chests', 'userRewards', 'compras'];

let cache = null;

function uid(prefix) {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
const now = () => new Date().toISOString();
const daysAgo = (d, h = 0) => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString();

function seed() {
  const db = Object.fromEntries(COLLECTIONS.map(c => [c, []]));
  db.schools.push({ id: SCHOOL_ID, name: 'Nombre del colegio' });
  db.courses.push({ id: 'crs-6a', schoolId: SCHOOL_ID, name: 'Sexto A', grade: 6, code: 'SEXTA6' });
  db.courses.push({ id: 'crs-5a', schoolId: SCHOOL_ID, name: 'Quinto A', grade: 5, code: 'QUINT5' });
  db.courses.push({ ...CURSO_PRUEBAS });
  const u = (id, role, name, username, courseIds, lastSeenAt = null) =>
    db.users.push({ id, schoolId: SCHOOL_ID, role, name, username, password: '1234', courseIds, lastSeenAt });
  u('usr-doc', 'teacher', 'Docente', 'docente', ['crs-6a', 'crs-5a', 'crs-prueba']);
  u('usr-est', 'student', 'Estudiante Demo', 'estudiante', ['crs-6a']);
  u('usr-prueba', 'student', 'Estudiante Prueba', 'prueba', ['crs-prueba']);
  u('usr-lau', 'student', 'Laura Gómez', 'laura', ['crs-6a'], daysAgo(1, 3));
  u('usr-and', 'student', 'Andrés Pérez', 'andres', ['crs-6a'], daysAgo(4, 1));
  const pics = { 'usr-est': [0, 1, 2], 'usr-lau': [3, 4, 5], 'usr-and': [6, 7, 8] };
  for (const x of db.users) if (pics[x.id]) x.pictures = pics[x.id];
  // Una actividad de cada tipo + unidad de prueba, asignadas a Sexto A (js/demo.js).
  const demo = demoPack({ schoolId: SCHOOL_ID, ownerId: 'usr-doc', courseId: 'crs-6a', daysAgo });
  db.activities.push(...demo.activities);
  db.units.push(...demo.units);
  db.assignments.push(...demo.assignments);
  return db;
}

function load() {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(DB_KEY)); } catch { cache = null; }
  if (!cache || !cache.users) { cache = seed(); persist(); }
  for (const c of COLLECTIONS) cache[c] ||= [];
  // Datos de antes del grado: deducirlo del nombre del curso ("Quinto A" → 5).
  const NUM = { cuarto: 4, quinto: 5, sexto: 6, septimo: 7, 'séptimo': 7, octavo: 8, noveno: 9 };
  for (const c of cache.courses) if (!c.grade) c.grade = NUM[c.name.split(' ')[0].toLowerCase()] || null;
  // Datos de antes del código de clase y de los dibujos: crearlos.
  let fixed = false;
  for (const c of cache.courses) if (!c.code) { c.code = newCode(); fixed = true; }
  // Estudiante para pruebas del docente (2026-11-21): prueba/1234, solo en el curso "Pruebas" (vacío: las actividades de
  // la demo siguen solo en Sexto A). El docente le asigna ahí lo que quiera probar. Se agrega también a datos viejos,
  // una sola vez (marca pruebaV2): si el docente lo borra o borra el curso, no vuelven a aparecer.
  if (!cache.pruebaV2) {
    if (!cache.courses.some(c => c.id === CURSO_PRUEBAS.id)) cache.courses.push({ ...CURSO_PRUEBAS });
    let est = cache.users.find(x => x.id === 'usr-prueba' || x.username === 'prueba');
    if (!est) cache.users.push(est = { id: 'usr-prueba', schoolId: SCHOOL_ID, role: 'student', name: 'Estudiante Prueba', username: 'prueba', password: '1234', courseIds: [], lastSeenAt: null });
    if (est.role === 'student') {
      est.courseIds = [CURSO_PRUEBAS.id];
      // En blanco: sin intentos, XP, cofres ni premios de cuando estaba en Sexto A.
      for (const c of ['attempts', 'xpLedger', 'chests', 'userRewards', 'compras']) cache[c] = cache[c].filter(r => r.userId !== est.id);
    }
    const doc = cache.users.find(x => x.id === 'usr-doc');
    if (doc && !doc.courseIds.includes(CURSO_PRUEBAS.id)) doc.courseIds.push(CURSO_PRUEBAS.id);
    cache.pruebaV2 = true; fixed = true;
  }
  for (const x of cache.users) if (x.role === 'student' && !x.pictures) { x.pictures = newPictures(); fixed = true; }
  if (fixed) persist();
  return cache;
}

// Guardado agrupado: varias escrituras seguidas (p. ej. una por tecla) se guardan juntas a los 250 ms.
let pending = null;
function persist() { if (!pending) pending = setTimeout(flush, 250); }
export function flush() {
  clearTimeout(pending); pending = null;
  if (!cache) return true;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache));
    return true;
  } catch (e) {
    // Sin espacio u otro error: no sacar al usuario; avisar y seguir en memoria.
    console.warn('No se pudo guardar en el navegador', e);
    window.dispatchEvent(new CustomEvent('storage-error', { detail: e }));
    return false;
  }
}
// Al cerrar u ocultar la pestaña se guarda enseguida.
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
// Otra pestaña cambió los datos o la sesión: recargar desde el navegador para no pisar sus cambios.
// Lo que importa para repintar: todo menos el registro de eventos y la "última conexión". Si solo cambió eso,
// no se repinta: cada pestaña registra "abrió sección" al pintar, y con dos pestañas abiertas se repintaban una a la
// otra sin parar (la página volvía arriba y el cuarto salía del modo de mover muebles). Arreglado 2026-11-21.
const firma = db => JSON.stringify(db, (k, v) => k === 'events' || k === 'lastSeenAt' ? undefined : v);
addEventListener('storage', e => {
  if (e.key === DB_KEY) {
    const antes = cache ? firma(cache) : null;
    clearTimeout(pending); pending = null; cache = null;
    if (antes === null || firma(load()) !== antes) dispatchEvent(new CustomEvent('plat-external', { detail: 'db' }));
  }
  if (e.key === SESSION_KEY) dispatchEvent(new CustomEvent('plat-external', { detail: 'session' }));
});

// ---------- Genéricos ----------
const all = col => load()[col];
const get = (col, id) => all(col).find(r => r.id === id) || null;
function insert(col, rec) {
  const r = { id: uid(col.slice(0, 3)), ...rec };
  all(col).push(r); persist(); return structuredClone(r);
}
function update(col, id, patch) {
  const r = get(col, id); if (!r) return null;
  Object.assign(r, patch); persist(); return structuredClone(r);
}
function remove(col, pred) {
  const db = load(); db[col] = db[col].filter(r => !pred(r)); persist();
}
const clone = x => structuredClone(x);

// ---------- Sesión ----------
export const session = {
  async get() {
    try { const s = JSON.parse(sess.getItem(SESSION_KEY)); return s && get('users', s.userId) ? s : null; }
    catch { return null; }
  },
  async login(username, password) {
    const user = all('users').find(u => u.username === username.trim().toLowerCase());
    if (!user || user.password !== password) return null;
    return start(user);
  },
  // Entrada con código de clase: el estudiante toca su nombre y luego sus 3 dibujos en orden.
  // Tras 5 errores seguidos, espera 30 s (evita probar combinaciones al azar).
  async loginWithPictures(userId, seq) {
    const user = get('users', userId);
    if (!user || user.role !== 'student') return null;
    const f = fails.get(userId) || { n: 0, until: 0 };
    if (Date.now() < f.until) return 'locked';
    if (!user.pictures || user.pictures.join() !== seq.join()) {
      f.n++; if (f.n >= 5) { f.n = 0; f.until = Date.now() + 30_000; }
      fails.set(userId, f);
      return f.until > Date.now() ? 'locked' : null;
    }
    fails.delete(userId);
    return start(user, 'pictures');
  },
  async logout() {
    const s = await session.get();
    if (s) await events.log(s.userId, 'leave');
    sess.removeItem(SESSION_KEY);
  },
};
const fails = new Map();
async function start(user, how = 'password') {
  sess.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, at: now() }));
  await users.touch(user.id);
  await events.log(user.id, 'login', { how });
  return publicUser(user);
}

const publicUser = u => { const { password, ...rest } = u; return clone(rest); };

// ---------- Dominio ----------
export const schools = {
  async current() { return clone(get('schools', SCHOOL_ID)); },
};

export const users = {
  async get(id) { const u = get('users', id); return u ? publicUser(u) : null; },
  async studentsOf(courseId) {
    return all('users').filter(u => u.role === 'student' && u.courseIds.includes(courseId)).map(publicUser);
  },
  async touch(id) { update('users', id, { lastSeenAt: now() }); },
  // Contraseña de dibujos (la ve el docente en "Mis cursos y accesos").
  async picturesOf(courseId) { return clone(all('users').filter(u => u.role === 'student' && u.courseIds.includes(courseId)).map(u => ({ id: u.id, name: u.name, username: u.username, pictures: u.pictures || [] }))); },
  async newPictures(id) { const u = get('users', id); if (u && u.role === 'student') update('users', id, { pictures: newPictures() }); },
  // Preferencias del estudiante: modo ('juego'|'serio'), fondo y avatar equipados.
  async setPrefs(id, patch) { const u = get('users', id); if (u) update('users', id, { prefs: { ...(u.prefs || {}), ...patch } }); },

  // ---------- Gestión de estudiantes (2026-11-19) ----------
  // Usuario a partir del nombre ("Laura Gómez" → "laura.gomez"), único en el colegio. Contraseña: 4 cifras.
  async createStudent({ name, courseId }) {
    const limpio = String(name || '').trim().replace(/\s+/g, ' ');
    if (!limpio) return null;
    const base = limpio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim().split(' ');
    let user = (base.length > 1 ? `${base[0]}.${base[base.length - 1]}` : base[0]) || 'estudiante', n = 1;
    const tomado = u => all('users').some(x => x.username === u);
    const raiz = user;
    while (tomado(user)) user = `${raiz}${++n}`;
    const password = String(1000 + Math.floor(Math.random() * 9000));
    const u = insert('users', { schoolId: SCHOOL_ID, role: 'student', name: limpio, username: user, password, courseIds: courseId ? [courseId] : [], lastSeenAt: null, pictures: newPictures() });
    return { ...publicUser(u), password };
  },
  // El docente ve y entrega las contraseñas de sus estudiantes (prototipo: se guardan tal cual).
  async credentialsOf(courseId) {
    return clone(all('users').filter(u => u.role === 'student' && u.courseIds.includes(courseId)).map(u => ({ id: u.id, name: u.name, username: u.username, password: u.password }))
      .sort((a, b) => a.name.localeCompare(b.name)));
  },
  // Estudiantes que quedaron sin curso (por ejemplo, al eliminar su curso).
  async withoutCourse() { return all('users').filter(u => u.role === 'student' && u.schoolId === SCHOOL_ID && !u.courseIds.length).map(publicUser); },
  async rename(id, name) { const n = String(name || '').trim(); if (n) update('users', id, { name: n }); },
  async resetPassword(id) {
    const u = get('users', id); if (!u || u.role !== 'student') return null;
    const password = String(1000 + Math.floor(Math.random() * 9000));
    update('users', id, { password }); return password;
  },
  // Un estudiante está en un curso a la vez: moverlo reemplaza su curso (sus intentos se conservan).
  async moveToCourse(id, courseId) { const u = get('users', id); if (u && u.role === 'student') update('users', id, { courseIds: [courseId] }); },
  async removeStudent(id) {
    const u = get('users', id); if (!u || u.role !== 'student') return;
    remove('attempts', t => t.userId === id);
    for (const c of ['xpLedger', 'chests', 'userRewards', 'compras', 'events']) remove(c, r => r.userId === id);
    remove('users', x => x.id === id);
  },
  // Demo (2026-11-19): el estudiante borra su propio avance para volver a hacer las actividades.
  // Quita intentos, XP, cofres, colección, compras y eventos; la ropa y el cuarto vuelven a los de inicio. Conserva cuenta y curso.
  async resetProgress(id) {
    const u = get('users', id); if (!u || u.role !== 'student') return;
    remove('attempts', t => t.userId === id);
    for (const c of ['xpLedger', 'chests', 'userRewards', 'compras', 'events']) remove(c, r => r.userId === id);
    // La ropa y la decoración se ganan: vuelven a las de inicio (sin prefs.ropa/cuarto se usan las por defecto).
    const { ropa, cuarto, posCuarto, espejoCuarto, sobreCuarto, avatar, ...prefs } = u.prefs || {};
    update('users', id, { prefs });
    flush();
  },
};

export const courses = {
  async list() { return clone(all('courses').filter(c => c.schoolId === SCHOOL_ID)); },
  async get(id) { return clone(get('courses', id)); },
  // Para la entrada con código: el curso y sus estudiantes (solo nombre y avatar).
  async byCode(code) {
    const c = all('courses').find(x => x.code === String(code || '').trim().toUpperCase());
    if (!c) return null;
    const st = all('users').filter(u => u.role === 'student' && u.courseIds.includes(c.id))
      .map(u => ({ id: u.id, name: u.name, ropa: u.prefs?.ropa || null })).sort((a, b) => a.name.localeCompare(b.name));
    return { course: { id: c.id, name: c.name }, students: st };
  },
  async newCode(id) { let code; do code = newCode(); while (all('courses').some(c => c.code === code)); return update('courses', id, { code }); },
  // Grados que existen en el colegio (de sus cursos), ordenados.
  async gradesOf(courseIds) { return [...new Set(all('courses').filter(c => courseIds.includes(c.id)).map(c => c.grade).filter(Boolean))]; },
  async grades() { return [...new Set(all('courses').filter(c => c.schoolId === SCHOOL_ID).map(c => c.grade).filter(Boolean))].sort((a, b) => a - b); },

  // ---------- Gestión de cursos (2026-11-19) ----------
  // Curso = grado + sección ("Sexto" + "A"). El nombre se arma solo; el docente que lo crea queda a cargo.
  async create({ grade, section, ownerId, cefr = '' }) {
    const name = courseName(grade, section);
    if (all('courses').some(c => c.schoolId === SCHOOL_ID && c.name.toLowerCase() === name.toLowerCase())) return null;
    let code; do code = newCode(); while (all('courses').some(c => c.code === code));
    const c = insert('courses', { schoolId: SCHOOL_ID, name, grade: Number(grade), section: String(section || '').trim().toUpperCase(), code, cefr: cefr || '' });
    const t = ownerId && get('users', ownerId);
    if (t && !t.courseIds.includes(c.id)) update('users', t.id, { courseIds: [...t.courseIds, c.id] });
    return c;
  },
  async update(id, { grade, section, cefr }) {
    const name = courseName(grade, section);
    if (all('courses').some(c => c.id !== id && c.schoolId === SCHOOL_ID && c.name.toLowerCase() === name.toLowerCase())) return null;
    return update('courses', id, { name, grade: Number(grade), section: String(section || '').trim().toUpperCase(), ...(cefr !== undefined ? { cefr: cefr || '' } : {}) });
  },
  // Eliminar un curso borra sus asignaciones y resultados. Los estudiantes quedan sin curso (no se borran).
  async remove(id) {
    const asg = all('assignments').filter(a => a.courseId === id).map(a => a.id);
    remove('attempts', t => asg.includes(t.assignmentId));
    remove('assignments', a => a.courseId === id);
    for (const u of all('users')) if (u.courseIds.includes(id)) u.courseIds = u.courseIds.filter(x => x !== id);
    remove('courses', c => c.id === id);
  },
  async counts(id) {
    return { students: all('users').filter(u => u.role === 'student' && u.courseIds.includes(id)).length, assignments: all('assignments').filter(a => a.courseId === id).length };
  },
};

// Nombre del grado en palabras (como se dice en el colegio): 6 → "Sexto".
export const GRADE_NAMES = ['', 'Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto', 'Sexto', 'Séptimo', 'Octavo', 'Noveno', 'Décimo', 'Undécimo'];
export const courseName = (grade, section) => `${GRADE_NAMES[Number(grade)] || `Grado ${grade}`}${section ? ' ' + String(section).trim().toUpperCase() : ''}`;

export const activities = {
  async list(ownerId) {
    return clone(all('activities').filter(a => a.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async get(id) { const a = get('activities', id); return a ? clone(a) : null; },
  async save(act) {
    if (act.id && get('activities', act.id)) return update('activities', act.id, { title: act.title, content: act.content, grade: act.grade || null, theme: act.theme || null, instruction: act.instruction || '' });
    return insert('activities', { schoolId: SCHOOL_ID, createdAt: now(), ...act });
  },
  async setGrade(id, grade) { return update('activities', id, { grade: grade || null }); },
  // Estilo visual (js/temas.js). Solo cambia el aspecto: no reinicia a quien la tenga a medias.
  async setTheme(id, theme) { return update('activities', id, { theme: theme || null }); },
  // Reto del docente: la actividad se abre como reto desde ese nivel (null = no es reto).
  async setChallenge(id, level) { return update('activities', id, { challengeLevel: level || null }); },
  // Retos del docente para los grados del estudiante.
  async challenges(grades) { return clone(all('activities').filter(a => a.challengeLevel && grades.includes(a.grade)).sort((a, b) => a.challengeLevel - b.challengeLevel)); },
  // Copia para hacer variantes (otro grado, otra versión). Queda sin asignar.
  async duplicate(id) {
    const a = get('activities', id); if (!a) return null;
    return insert('activities', { schoolId: a.schoolId, ownerId: a.ownerId, type: a.type, grade: a.grade || null, theme: a.theme || null, instruction: a.instruction || '',
      title: (a.title + ' (copia)').slice(0, 80), content: structuredClone(a.content), createdAt: now() });
  },
  // Unidades que la incluyen y ya están asignadas (para advertir antes de borrar o editar).
  async assignedUnitsWith(id) {
    return all('units').filter(u => u.activityIds.includes(id) && all('assignments').some(a => a.unitId === u.id)).map(u => clone(u));
  },
  async remove(id) {
    const act = get('activities', id);
    const asg = all('assignments').filter(a => a.activityId === id).map(a => a.id);
    remove('attempts', t => asg.includes(t.assignmentId));
    remove('assignments', a => a.activityId === id);
    remove('activities', a => a.id === id);
    // Sacarla de las unidades donde estaba
    for (const u of all('units')) if (u.activityIds.includes(id)) u.activityIds = u.activityIds.filter(x => x !== id);
    persist();
    // Audio subido (si lo tenía)
    const fileId = act?.content?.audio?.fileId;
    if (fileId) files.remove(fileId).catch(() => {});
  },
};

// Unidad: actividades de distintos tipos, en orden, que se asignan juntas.
export const units = {
  async list(ownerId) {
    return clone(all('units').filter(u => u.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async get(id) { const u = get('units', id); return u ? clone(u) : null; },
  async save(unit) {
    // fases: sección de cada actividad (Vocabulario, Gramática…), opcional.
    const fases = Object.fromEntries(Object.entries(unit.fases || {}).filter(([id]) => unit.activityIds.includes(id)));
    const data = { title: unit.title, description: unit.description || '', grade: unit.grade || null, activityIds: [...unit.activityIds], fases, cefr: unit.cefr || '' };
    if (unit.id && get('units', unit.id)) return update('units', unit.id, data);
    return insert('units', { schoolId: SCHOOL_ID, ownerId: unit.ownerId, createdAt: now(), ...data });
  },
  async setGrade(id, grade) { return update('units', id, { grade: grade || null }); },
  async addActivity(unitId, activityId) {
    const u = get('units', unitId);
    if (u && !u.activityIds.includes(activityId)) update('units', unitId, { activityIds: [...u.activityIds, activityId] });
  },
  async remove(id) {
    const asg = all('assignments').filter(a => a.unitId === id).map(a => a.id);
    remove('attempts', t => asg.includes(t.assignmentId));
    remove('assignments', a => a.unitId === id);
    remove('units', u => u.id === id);
  },
};

export const assignments = {
  // Se asigna una actividad (activityId) o una unidad (unitId).
  async create({ activityId = null, unitId = null, courseId, dueAt, forceSerious = false, timer = null, ownerId = null, maxTries = null, showAnswers = true }) {
    // Regla: solo se asigna a un curso lo que es de su grado.
    const item = activityId ? get('activities', activityId) : get('units', unitId);
    const course = get('courses', courseId);
    if (!item || !course || !item.grade || item.grade !== course.grade) throw new Error('Solo puedes asignar actividades del mismo grado del curso.');
    return insert('assignments', { schoolId: SCHOOL_ID, ownerId: ownerId || item.ownerId, activityId, unitId, courseId, dueAt: dueAt || null, forceSerious: !!forceSerious, timer,
      maxTries: unitId ? null : (maxTries || null), showAnswers: showAnswers !== false, createdAt: now() });
  },
  async listForUnit(unitId) { return clone(all('assignments').filter(a => a.unitId === unitId)); },
  async get(id) { return clone(get('assignments', id)); },
  async listForActivity(activityId) { return clone(all('assignments').filter(a => a.activityId === activityId)); },
  // Asignaciones de un docente (las antiguas sin ownerId son de quien creó la actividad o unidad).
  async listAll(ownerId) {
    const owner = a => a.ownerId || (a.unitId ? get('units', a.unitId) : get('activities', a.activityId))?.ownerId;
    return clone(all('assignments').filter(a => a.schoolId === SCHOOL_ID && (!ownerId || owner(a) === ownerId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async listForCourses(courseIds) {
    return clone(all('assignments').filter(a => courseIds.includes(a.courseId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async remove(id) {
    remove('attempts', t => t.assignmentId === id);
    remove('assignments', a => a.id === id);
  },
};

// Cada intento es de UNA actividad. En una asignación de unidad hay intentos de varias actividades.
// Intentos antiguos (sin activityId) pertenecen a la actividad de su asignación.
const actOf = t => t.activityId || get('assignments', t.assignmentId)?.activityId;

export const attempts = {
  // Último intento del usuario (en curso o terminado) para esa actividad de la asignación
  async current(assignmentId, userId, activityId) {
    const list = all('attempts').filter(t => t.assignmentId === assignmentId && t.userId === userId && (!activityId || actOf(t) === activityId));
    return list.length ? clone(list[list.length - 1]) : null;
  },
  async listFor(assignmentId, userId, activityId) {
    return clone(all('attempts').filter(t => t.assignmentId === assignmentId && (!userId || t.userId === userId)
      && (!activityId || actOf(t) === activityId)).map(t => ({ ...t, activityId: actOf(t) })));
  },
  async get(id) { const t = get('attempts', id); return t ? clone({ ...t, activityId: actOf(t) }) : null; },
  // contentVersion: huella del contenido al empezar; si el docente lo edita después, el avance viejo no se reutiliza.
  async start(assignmentId, userId, activityId, contentVersion = null, extra = {}) {
    return insert('attempts', { assignmentId, activityId, userId, state: 'inprogress', progress: null, score: 0, maxScore: 0,
      durationSec: 0, answers: [], startedAt: now(), finishedAt: null, contentVersion, ...extra });
  },
  // Todos los intentos terminados de un estudiante (para el repaso de preguntas falladas).
  // (Sin las evaluaciones en las que el docente ocultó las respuestas: el repaso las revelaría.)
  async doneByUser(userId) { return clone(all('attempts').filter(t => t.userId === userId && t.state === 'done' && get('assignments', t.assignmentId)?.showAnswers !== false).sort((a, b) => (a.finishedAt || '').localeCompare(b.finishedAt || ''))); },
  // Días (AAAA-MM-DD, hora local) en que terminó al menos una actividad, repaso o reto: para la racha diaria.
  async activeDays(userId) {
    return [...new Set(all('attempts').filter(t => t.userId === userId && t.state === 'done' && t.finishedAt).map(t => dayOf(new Date(t.finishedAt))))].sort();
  },
  // Datos del reloj: deadlineAt (cuenta regresiva con hora fija) y hiddenCount (veces que salió de la pestaña).
  async setMeta(id, { deadlineAt, hiddenCount, progress } = {}) {
    const patch = {};
    if (deadlineAt !== undefined) patch.deadlineAt = deadlineAt;
    if (hiddenCount !== undefined) patch.hiddenCount = hiddenCount;
    if (progress !== undefined) patch.progress = progress;
    return update('attempts', id, patch);
  },
  // Segundos de la cuenta regresiva que puso el docente (se guardan para que recargar no reinicie el reloj).
  async saveClock(id, clockSec) { return update('attempts', id, { clockSec }); },
  async saveProgress(id, progress, durationSec) {
    return update('attempts', id, { progress, durationSec });
  },
  async finish(id, { score, maxScore, durationSec, answers }) {
    // El avance intermedio ya no hace falta: quedan las respuestas (ahorra espacio).
    return update('attempts', id, { state: 'done', score, maxScore, durationSec, answers, progress: null, finishedAt: now() });
  },
};

export const xp = {
  async total(userId) { return all('xpLedger').filter(x => x.userId === userId).reduce((s, x) => s + x.amount, 0); },
  async add(userId, amount, source) { return insert('xpLedger', { userId, amount, source, at: now() }); },
  // Tabla clasificatoria: XP de cada estudiante (todo o desde una fecha ISO).
  async totals(userIds, since = null) {
    const m = Object.fromEntries(userIds.map(id => [id, 0]));
    for (const x of all('xpLedger')) if (x.userId in m && (!since || x.at >= since)) m[x.userId] += x.amount;
    return m;
  },
};

// Fecha local AAAA-MM-DD (el cofre es diario según el reloj del estudiante).
const dayOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => dayOf(new Date());

// Cofre diario: se gana al terminar una actividad ese día y se abre una vez.
export const chests = {
  async earnedToday(userId) {
    const d = today();
    return all('attempts').some(t => t.userId === userId && t.state === 'done' && t.finishedAt && dayOf(new Date(t.finishedAt)) === d);
  },
  async openedToday(userId) { const d = today(); return clone(all('chests').find(c => c.userId === userId && c.date === d) || null); },
  async open(userId, { rewardId, duplicate, xp: bonus = 0 }) {
    return insert('chests', { userId, date: today(), openedAt: now(), rewardId, duplicate, xp: bonus, trigger: 'activity' });
  },
};

// Colección: premios que el estudiante ya tiene.
export const userRewards = {
  async list(userId) { return clone(all('userRewards').filter(r => r.userId === userId)); },
  async add(userId, rewardId) { return insert('userRewards', { userId, rewardId, at: now() }); },
};

// Cuarto de Cebollo: decoración comprada con monedas. Monedas = XP ganado (1 a 1) − lo gastado; el nivel no baja.
export const compras = {
  async list(userId) { return clone(all('compras').filter(r => r.userId === userId)); },
  async gastado(userId) { return all('compras').filter(r => r.userId === userId).reduce((s, r) => s + r.precio, 0); },
  async add(userId, itemId, precio) { return insert('compras', { userId, itemId, precio, at: now() }); },
};

export const events = {
  async log(userId, type, data = {}) {
    const db = load();
    db.events.push({ id: uid('evt'), userId, type, data, at: now() });
    if (db.events.length > 2000) db.events.splice(0, db.events.length - 2000);
    persist();
  },
};

// ---------- Archivos pesados (audios) en IndexedDB: localStorage no alcanza ----------
const IDB_NAME = 'plat.files.v1';
function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbDo(mode, fn) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', mode);
    const req = fn(tx.objectStore('files'));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}
export const files = {
  async put(blob) { const id = uid('fil'); await idbDo('readwrite', s => s.put(blob, id)); return id; },
  async get(id) { return id ? idbDo('readonly', s => s.get(id)) : null; },
  async remove(id) { if (id) await idbDo('readwrite', s => s.delete(id)); },
};

export async function resetDemo() {
  clearTimeout(pending); pending = null;
  localStorage.removeItem(DB_KEY);
  sess.removeItem(SESSION_KEY);
  cache = null;
  try { await idbDo('readwrite', s => s.clear()); } catch {}
  load(); flush();
}
