// Catálogo de premios del cofre (fondos del modo juego y ropa de Cebollo), decoración del cuarto y sorteo. Lógica pura: sin DOM salvo los dibujos SVG.

export const RARITY = {
  common:    { label: 'Común',      weight: 64, dupXp: 10, color: '#3fb4f0' },
  rare:      { label: 'Rara',       weight: 27, dupXp: 20, color: '#2fd39a' },
  epic:      { label: 'Épica',      weight: 7,  dupXp: 40, color: '#a46bff' },
  legendary: { label: 'Legendaria', weight: 2,  dupXp: 80, color: '#ffc21a' },
};

// Fondos del modo juego: c1/c2 = degradado; g1-g3 = manchas de luz.
// 2026-11-21: cada fondo es una escena pixel art propia (img/fondos/<id>.webp, herramientas/arte/generar_fondos.py +
// recortar_fondos.py), ya no un recolor del cielo. "Morado" usa img/mundo/cielo.webp. Galaxia se quitó (quedan 8).
export const BACKGROUNDS = [
  { id: 'f-morado',    name: 'Morado',          rarity: 'common', free: true, c1: '#5a2cf0', c2: '#2a1585', g: ['255,120,200', '31,200,240', '255,210,63'] , t: { card: '#fff7dc', inn: '#ffeaa8', sh: '#d6a531', ink: '#2a1585', muted: '#6b4fa8', titulo: '#ffd23f', tsh: '#e8590c', sobre: '#fff3c4', ssh: '#2a1585' } },
  { id: 'f-oceano',    name: 'Océano',          rarity: 'common', c1: '#1f8fe0', c2: '#0b3d8c', g: ['90,240,220', '120,170,255', '255,255,255'] , t: { card: '#fff0e6', inn: '#ffd9c4', sh: '#e3875f', ink: '#0b3d5c', muted: '#8a4a35', titulo: '#ffc29a', tsh: '#b33a12', sobre: '#fff1e6', ssh: '#0b3d5c' } },
  { id: 'f-bosque',    name: 'Bosque',          rarity: 'common', c1: '#2fa05a', c2: '#0f4a33', g: ['200,255,120', '60,220,180', '255,220,90'] , t: { card: '#ffeaf4', inn: '#ffd0e6', sh: '#d9669b', ink: '#1f4d2b', muted: '#7a3a5a', titulo: '#fff6dc', tsh: '#1f5a2a', sobre: '#fff6dc', ssh: '#1f4d2b' } },
  { id: 'f-atardecer', name: 'Atardecer',       rarity: 'rare',   c1: '#ff7a45', c2: '#8a1f5c', g: ['255,220,90', '255,120,200', '255,160,60'] , t: { card: '#e8f4ff', inn: '#cfe5ff', sh: '#5f97d6', ink: '#4a1838', muted: '#3c5c8a', titulo: '#ffffff', tsh: '#7a1f4a', sobre: '#ffffff', ssh: '#5a1838' } },
  { id: 'f-noche',     name: 'Noche estrellada', rarity: 'rare',  c1: '#2b3a8f', c2: '#0b0f33', g: ['120,140,255', '200,120,255', '255,255,200'] , t: { card: '#fff5d6', inn: '#ffe7a0', sh: '#d6a531', ink: '#1b2a5c', muted: '#6b5a2a', titulo: '#ffd23f', tsh: '#b8560c', sobre: '#fff3c4', ssh: '#0b0f33' } },
  { id: 'f-prisma',    name: 'Prisma',          rarity: 'legendary', c1: '#ff3fa4', c2: '#1e0a5c', g: ['255,230,90', '90,240,255', '255,120,250'] , t: { card: '#f4ffdf', inn: '#e0f7b5', sh: '#94c74a', ink: '#3b1466', muted: '#4f6b23', titulo: '#c6ff6b', tsh: '#3b1466', sobre: '#efffd0', ssh: '#1e0a5c' } },
  // Exclusivos de los retos (source: 'reto'): no salen del cofre, se ganan superando el reto.
  { id: 'f-lava',      name: 'Volcán',          rarity: 'epic', source: 'reto', c1: '#e8370c', c2: '#3a0a05', g: ['255,200,40', '255,90,40', '255,240,150'] , t: { card: '#e2fbff', inn: '#c3f1f8', sh: '#3fb3c7', ink: '#5a1408', muted: '#2f6b75', titulo: '#7ff3ff', tsh: '#0b4f5c', sobre: '#e0fbff', ssh: '#3a0a05' } },
  { id: 'f-aurora',    name: 'Aurora',          rarity: 'epic', source: 'reto', c1: '#0fa38a', c2: '#14204f', g: ['120,255,180', '160,120,255', '80,220,255'] , t: { card: '#fff2e0', inn: '#ffdfb8', sh: '#e09650', ink: '#102a4a', muted: '#7a5530', titulo: '#ffb35c', tsh: '#7a3a08', sobre: '#fff0dc', ssh: '#102a4a' } },
];

// Ropa de Cebollo (2026-11-20, reemplaza a los cubos): cada prenda va en una ranura y se viste por capas.
// Arte en img/cebollo/ropa/<id>.webp (capa del tamaño de la figura) e icono/<id>.webp (herramientas/arte/recortar_ropa.py).
export const SLOTS = { sombrero: 'Gorras', cara: 'Gafas', rostro: 'Accesorios', torso: 'Camisetas y hoodies', piernas: 'Pantalones', pies: 'Zapatos' };
export const ROPA = [
  { id: 'gorra_roja',        name: 'Gorra roja',          slot: 'sombrero', rarity: 'common' },
  { id: 'gorro_lana',        name: 'Gorro de lana',       slot: 'sombrero', rarity: 'rare' },
  { id: 'sombrero_paja',     name: 'Sombrero de paja',    slot: 'sombrero', rarity: 'epic' },
  { id: 'gafas_redondas',    name: 'Gafas redondas',      slot: 'cara',     rarity: 'common' },
  { id: 'gafas_sol',         name: 'Gafas de sol',        slot: 'cara',     rarity: 'rare' },
  { id: 'gafas_estrella',    name: 'Gafas de estrella',   slot: 'cara',     rarity: 'legendary' },
  { id: 'parche',            name: 'Parche pirata',       slot: 'cara',     rarity: 'epic' },
  // Accesorios (2026-11-21): dibujos del docente sobre la cara; van debajo de las gafas. Se pueden llevar varios a
  // la vez mientras no se tapen entre sí (ver VARIOS y TAPAN).
  { id: 'bigote',            name: 'Bigote',              slot: 'rostro',   rarity: 'common' },
  { id: 'cicatrices',        name: 'Cicatrices',          slot: 'rostro',   rarity: 'rare' },
  { id: 'camiseta_roja',     name: 'Camiseta roja',       slot: 'torso',    rarity: 'common', free: true },
  { id: 'camiseta_rayas',    name: 'Camiseta de rayas',   slot: 'torso',    rarity: 'common' },
  { id: 'camiseta_estrella', name: 'Camiseta estrella',   slot: 'torso',    rarity: 'rare' },
  { id: 'camiseta_futbol',   name: 'Camiseta de fútbol',  slot: 'torso',    rarity: 'rare' },
  { id: 'hoodie_naranja',    name: 'Hoodie naranja',      slot: 'torso',    rarity: 'common' },
  { id: 'hoodie_azul',       name: 'Hoodie azul',         slot: 'torso',    rarity: 'epic' },
  { id: 'hoodie_gris',       name: 'Hoodie del rayo',     slot: 'torso',    rarity: 'legendary' },
  { id: 'jeans',             name: 'Jeans',               slot: 'piernas',  rarity: 'common' },
  { id: 'short_rojo',        name: 'Short rojo',          slot: 'piernas',  rarity: 'common' },
  { id: 'pantalon_cargo',    name: 'Pantalón cargo',      slot: 'piernas',  rarity: 'rare' },
  { id: 'tenis_rojos',       name: 'Tenis rojos',         slot: 'pies',     rarity: 'common' },
  { id: 'botas_amarillas',   name: 'Botas de lluvia',     slot: 'pies',     rarity: 'rare' },
  // Exclusivos de los retos (source: 'reto'): no salen del cofre, se ganan superando el reto.
  { id: 'tenis_rayo',        name: 'Tenis veloces',       slot: 'pies',     rarity: 'epic', source: 'reto' },
  { id: 'corona',            name: 'Corona dorada',       slot: 'sombrero', rarity: 'epic', source: 'reto' },
];
// Premios viejos (cubos) → prenda que los reemplaza, para quien ya los había ganado.
export const ALIAS = { 'a-veloz': 'tenis_rayo', 'a-diamante': 'corona', 'f-galaxia': 'f-noche' };
// Gorros, gafas y accesorios: PNG con fondo transparente (herramientas/arte/recortar_accesorios.py); las gafas traen
// vidrio semitransparente para que se vean los ojos debajo.
const ROPA_PNG = new Set(ROPA.filter(p => ['sombrero', 'cara', 'rostro'].includes(p.slot)).map(p => p.id));
// Dibujadas en SVG (vectoriales): el parche pirata.
const ROPA_SVG = new Set(['parche']);
export const archivoRopa = id => `${id}.${ROPA_SVG.has(id) ? 'svg' : ROPA_PNG.has(id) ? 'png' : 'webp'}`;
export const urlRopa = id => `img/cebollo/ropa/${archivoRopa(id)}`;
export const urlIconoRopa = id => `img/cebollo/ropa/icono/${archivoRopa(id)}`;

// Ranuras donde se puede llevar más de una prenda: guardan una lista de ids (las demás, un id). Solo los accesorios.
export const VARIOS = new Set(['rostro']);
// Accesorios que se tapan entre sí y no pueden ir juntos (pares de ids). Se mide el dibujo de uno encima del otro en
// las capas de 560x920: bigote y cicatrices casi no se tocan (24 px de borde), así que pueden ir juntos.
const TAPAN = [];
export const seTapan = (a, b) => TAPAN.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const orden = id => ROPA.findIndex(r => r.id === id);
// Lo que lleva puesto en una ranura, siempre como lista (vale con un id suelto o con la lista).
export const puestas = (ropa, slot) => [...new Set([ropa?.[slot]].flat().filter(Boolean))].sort((a, b) => orden(a) - orden(b));
export const llevaPuesta = (ropa, slot, id) => puestas(ropa, slot).includes(id);
// Ponerse una prenda (id = null deja la ranura vacía). En VARIOS se suma a lo que lleva y quita lo que la tape.
export function ponerPrenda(ropa = {}, slot, id) {
  const r = { ...ropa };
  const l = !id ? [] : VARIOS.has(slot) ? [...puestas(ropa, slot).filter(x => x !== id && !seTapan(x, id)), id] : [id];
  if (!l.length) delete r[slot];
  else r[slot] = VARIOS.has(slot) ? l.sort((a, b) => orden(a) - orden(b)) : id;
  return r;
}
// Quitarse una sola prenda de la ranura.
export function quitarPrenda(ropa = {}, slot, id) {
  const r = { ...ropa }, l = puestas(ropa, slot).filter(x => x !== id);
  if (!l.length) delete r[slot]; else r[slot] = VARIOS.has(slot) ? l : l[0];
  return r;
}

// Decoración del cuarto de Cebollo: se compra con monedas (1 moneda por cada XP ganado) y va en un lugar fijo.
export const LUGARES = { ventana: 'Ventanas', cuadro: 'Cuadros', estante: 'Estantes', planta: 'Plantas', mesa: 'Mesas',
  silla: 'Sillas', pecera: 'Peceras', alfombra: 'Alfombras', lampara: 'Lámparas' };
export const DECO = [
  { id: 'ventana_clasica',   name: 'Ventana de madera',  lugar: 'ventana',  precio: 0, free: true },
  { id: 'ventana_redonda',   name: 'Ventana redonda',    lugar: 'ventana',  precio: 60 },
  { id: 'ventana_noche',     name: 'Ventana de noche',   lugar: 'ventana',  precio: 120 },
  { id: 'cuadro_paisaje',    name: 'Cuadro de paisaje',  lugar: 'cuadro',   precio: 40 },
  { id: 'cuadro_cohete',     name: 'Cuadro del cohete',  lugar: 'cuadro',   precio: 70 },
  { id: 'estante',           name: 'Estante de libros',  lugar: 'estante',  precio: 80 },
  { id: 'planta_monstera',   name: 'Monstera',           lugar: 'planta',   precio: 50 },
  { id: 'cactus',            name: 'Cactus',             lugar: 'planta',   precio: 40 },
  { id: 'planta_flores',     name: 'Planta con flores',  lugar: 'planta',   precio: 60 },
  { id: 'mesa_madera',       name: 'Mesa de madera',     lugar: 'mesa',     precio: 80 },
  { id: 'mesa_redonda',      name: 'Mesa redonda',       lugar: 'mesa',     precio: 90 },
  { id: 'silla_madera',      name: 'Silla de madera',    lugar: 'silla',    precio: 60 },
  { id: 'puff',              name: 'Puff',               lugar: 'silla',    precio: 90 },
  { id: 'pecera_redonda',    name: 'Pecera redonda',     lugar: 'pecera',   precio: 150 },
  { id: 'pecera_grande',     name: 'Acuario',            lugar: 'pecera',   precio: 250 },
  { id: 'alfombra_redonda',  name: 'Alfombra menta',     lugar: 'alfombra', precio: 0, free: true },
  { id: 'alfombra_arcoiris', name: 'Alfombra arcoíris',  lugar: 'alfombra', precio: 100 },
  { id: 'lampara',           name: 'Lámpara de techo',     lugar: 'lampara',  precio: 70 },
];
export const urlDeco = id => `img/cuarto/${id}.webp`;

export const ALL = [...BACKGROUNDS.map(r => ({ ...r, kind: 'fondo' })), ...ROPA.map(r => ({ ...r, kind: 'ropa' }))];
export const byId = id => ALL.find(r => r.id === (ALIAS[id] || id)) || null;
export const FREE = ALL.filter(r => r.free).map(r => r.id);
export const DEFAULT_PREFS = { modo: 'juego', fondo: 'f-morado', ropa: { torso: 'camiseta_roja' },
  cuarto: { ventana: 'ventana_clasica', alfombra: 'alfombra_redonda' } };
// Demo: todo abierto (toda la ropa, los fondos, la decoración del cuarto y los retos). Poner en false para volver
// a ganarlo: ropa y fondos del cofre y los retos, decoración con monedas, retos por nivel.
// Por estudiante (2026-11-22): user.cebolloBloqueado = true lo deja bloqueado aunque la demo esté abierta (lo pone app.js
// al entrar con fijarDesbloqueo). Las vistas importan DESBLOQUEADO: como es `let`, ven el valor actual.
export let DESBLOQUEADO = true;
export const fijarDesbloqueo = user => { DESBLOQUEADO = !user?.cebolloBloqueado; };

// Premios que de verdad ganó (con los alias de los premios viejos ya traducidos). El sorteo del cofre usa esta.
const ganados = rewardIds => new Set([...rewardIds.map(id => ALIAS[id] || id), ...FREE]);
// Premios que puede usar: los ganados, o todos en la demo.
export const ownedSet = rewardIds => DESBLOQUEADO ? new Set(ALL.map(r => r.id)) : ganados(rewardIds);

// Sorteo: primero la rareza (por peso), luego un premio que aún no tenga. Si ya tiene todos los de esa rareza: repetido → XP.
export function rollReward(ownedIds, rnd = Math.random) {
  const owned = ganados(ownedIds);
  const total = Object.values(RARITY).reduce((s, r) => s + r.weight, 0);
  let x = rnd() * total, rarity = 'common';
  for (const [k, r] of Object.entries(RARITY)) { if ((x -= r.weight) < 0) { rarity = k; break; } }
  const pool = ALL.filter(r => r.rarity === rarity && !r.free && !r.source);
  const fresh = pool.filter(r => !owned.has(r.id));
  const pick = (fresh.length ? fresh : pool)[Math.floor(rnd() * (fresh.length || pool.length))];
  const duplicate = !fresh.length;
  return { reward: pick, duplicate, xp: duplicate ? RARITY[rarity].dupXp : 0 };
}

// Probabilidad de cada rareza en texto (para "qué puede salir").
export const odds = () => Object.values(RARITY).map(r => `${r.label} ${r.weight} %`).join(' · ');

// Muestra de un fondo (para la colección y el premio).
const fondoDe = id => BACKGROUNDS.find(x => x.id === (ALIAS[id] || id)) || BACKGROUNDS[0];
const urlFondo = (b, mini = false) => b === BACKGROUNDS[0] ? 'img/mundo/cielo.webp' : `img/fondos/${b.id}${mini ? '-mini' : ''}.webp`;
const urlSuelo = b => b === BACKGROUNDS[0] ? 'img/mundo/suelo.webp' : `img/fondos/${b.id}-suelo.webp`;
const abs = u => new URL(u, document.baseURI).href;
export function backgroundSwatch(id) {
  const b = fondoDe(id);
  return `<span class="bg-swatch" style="background:url(${urlFondo(b, true)}) center/cover,linear-gradient(165deg,${b.c1},${b.c2})"></span>`;
}

export const rewardPreview = (r, size = 72) => r.kind === 'ropa'
  ? `<img class="ropa-icono" src="${urlIconoRopa(r.id)}" alt="" width="${size}" height="${size}" draggable="false">` : backgroundSwatch(r.id);

// Variables CSS del fondo equipado.
export function backgroundVars(id) {
  const b = fondoDe(id);
  return `--fondo-1:${b.c1};--fondo-2:${b.c2};--glow-1:${b.g[0]};--glow-2:${b.g[1]};--glow-3:${b.g[2]};--cielo-img:url(${abs(urlFondo(b))});--suelo-img:url(${abs(urlSuelo(b))});` + Object.entries(b.t).map(([k, v]) => `--t-${k}:${v}`).join(';');
}
