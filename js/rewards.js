// Catálogo de premios del cofre (fondos del modo juego y ropa de Cebollo), decoración del cuarto y sorteo. Lógica pura: sin DOM salvo los dibujos SVG.

export const RARITY = {
  common:    { label: 'Común',      weight: 64, dupXp: 10, color: '#3fb4f0' },
  rare:      { label: 'Rara',       weight: 27, dupXp: 20, color: '#2fd39a' },
  epic:      { label: 'Épica',      weight: 7,  dupXp: 40, color: '#a46bff' },
  legendary: { label: 'Legendaria', weight: 2,  dupXp: 80, color: '#ffc21a' },
};

// Fondos del modo juego: c1/c2 = degradado; g1-g3 = manchas de luz.
export const BACKGROUNDS = [
  { id: 'f-morado',    name: 'Morado',          rarity: 'common', free: true, c1: '#5a2cf0', c2: '#2a1585', g: ['255,120,200', '31,200,240', '255,210,63'] },
  { id: 'f-oceano',    name: 'Océano',          rarity: 'common', c1: '#1f8fe0', c2: '#0b3d8c', g: ['90,240,220', '120,170,255', '255,255,255'] },
  { id: 'f-bosque',    name: 'Bosque',          rarity: 'common', c1: '#2fa05a', c2: '#0f4a33', g: ['200,255,120', '60,220,180', '255,220,90'] },
  { id: 'f-atardecer', name: 'Atardecer',       rarity: 'rare',   c1: '#ff7a45', c2: '#8a1f5c', g: ['255,220,90', '255,120,200', '255,160,60'] },
  { id: 'f-noche',     name: 'Noche estrellada', rarity: 'rare',  c1: '#2b3a8f', c2: '#0b0f33', g: ['120,140,255', '200,120,255', '255,255,200'] },
  { id: 'f-galaxia',   name: 'Galaxia',         rarity: 'epic',   c1: '#7a1fd6', c2: '#120530', g: ['255,80,200', '40,220,255', '255,200,40'] },
  { id: 'f-prisma',    name: 'Prisma',          rarity: 'legendary', c1: '#ff3fa4', c2: '#1e0a5c', g: ['255,230,90', '90,240,255', '255,120,250'] },
  // Exclusivos de los retos (source: 'reto'): no salen del cofre, se ganan superando el reto.
  { id: 'f-lava',      name: 'Volcán',          rarity: 'epic', source: 'reto', c1: '#e8370c', c2: '#3a0a05', g: ['255,200,40', '255,90,40', '255,240,150'] },
  { id: 'f-aurora',    name: 'Aurora',          rarity: 'epic', source: 'reto', c1: '#0fa38a', c2: '#14204f', g: ['120,255,180', '160,120,255', '80,220,255'] },
];

// Ropa de Cebollo (2026-11-20, reemplaza a los cubos): cada prenda va en una ranura y se viste por capas.
// Arte en img/cebollo/ropa/<id>.webp (capa del tamaño de la figura) e icono/<id>.webp (herramientas/arte/recortar_ropa.py).
export const SLOTS = { sombrero: 'Gorras', cara: 'Gafas', torso: 'Camisetas y hoodies', piernas: 'Pantalones', pies: 'Zapatos' };
export const ROPA = [
  { id: 'gorra_roja',        name: 'Gorra roja',          slot: 'sombrero', rarity: 'common' },
  { id: 'gorro_lana',        name: 'Gorro de lana',       slot: 'sombrero', rarity: 'rare' },
  { id: 'sombrero_paja',     name: 'Sombrero de paja',    slot: 'sombrero', rarity: 'epic' },
  { id: 'gafas_redondas',    name: 'Gafas redondas',      slot: 'cara',     rarity: 'common' },
  { id: 'gafas_sol',         name: 'Gafas de sol',        slot: 'cara',     rarity: 'rare' },
  { id: 'gafas_estrella',    name: 'Gafas de estrella',   slot: 'cara',     rarity: 'legendary' },
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
export const ALIAS = { 'a-veloz': 'tenis_rayo', 'a-diamante': 'corona' };
export const urlRopa = id => `img/cebollo/ropa/${id}.webp`;
export const urlIconoRopa = id => `img/cebollo/ropa/icono/${id}.webp`;

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
// Premios que tiene (con los alias de los premios viejos ya traducidos).
export const ownedSet = rewardIds => new Set([...rewardIds.map(id => ALIAS[id] || id), ...FREE]);

// Sorteo: primero la rareza (por peso), luego un premio que aún no tenga. Si ya tiene todos los de esa rareza: repetido → XP.
export function rollReward(ownedIds, rnd = Math.random) {
  const owned = ownedSet(ownedIds);
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
export function backgroundSwatch(id) {
  const b = BACKGROUNDS.find(x => x.id === id) || BACKGROUNDS[0];
  return `<span class="bg-swatch" style="background:radial-gradient(circle at 20% 15%,rgba(${b.g[0]},.55) 0,transparent 45%),radial-gradient(circle at 85% 60%,rgba(${b.g[1]},.5) 0,transparent 45%),linear-gradient(165deg,${b.c1},${b.c2})"></span>`;
}

export const rewardPreview = (r, size = 72) => r.kind === 'ropa'
  ? `<img class="ropa-icono" src="${urlIconoRopa(r.id)}" alt="" width="${size}" height="${size}" draggable="false">` : backgroundSwatch(r.id);

// Variables CSS del fondo equipado.
export function backgroundVars(id) {
  const b = BACKGROUNDS.find(x => x.id === id) || BACKGROUNDS[0];
  return `--fondo-1:${b.c1};--fondo-2:${b.c2};--glow-1:${b.g[0]};--glow-2:${b.g[1]};--glow-3:${b.g[2]};--cielo-blend:${b === BACKGROUNDS[0] ? 'normal' : 'luminosity'}`;
}
