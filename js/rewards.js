// Catálogo de premios del cofre (skins del modo juego) y sorteo. Lógica pura: sin DOM salvo los dibujos SVG.

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

// Avatares: un cubo de juguete con cara; extra = adorno.
export const AVATARS = [
  { id: 'a-azul',     name: 'Cubo azul',     rarity: 'common', free: true, c: '#3fb4f0' },
  { id: 'a-naranja',  name: 'Cubo naranja',  rarity: 'common', c: '#ff8a1f' },
  { id: 'a-rosa',     name: 'Cubo rosa',     rarity: 'common', c: '#ff5fa2' },
  { id: 'a-menta',    name: 'Cubo menta',    rarity: 'common', c: '#2fd39a' },
  { id: 'a-robot',    name: 'Robot',         rarity: 'rare',   c: '#9aa7c7', extra: 'robot' },
  { id: 'a-gato',     name: 'Gato',          rarity: 'rare',   c: '#ffb23f', extra: 'cat' },
  { id: 'a-corona',   name: 'Rey dorado',    rarity: 'epic',   c: '#ffc21a', extra: 'crown' },
  { id: 'a-arcoiris', name: 'Arcoíris',      rarity: 'epic',   c: '#a46bff', extra: 'rainbow' },
  { id: 'a-dragon',   name: 'Dragón',        rarity: 'legendary', c: '#2fd39a', extra: 'dragon' },
  { id: 'a-estelar',  name: 'Cubo estelar',  rarity: 'legendary', c: '#ff4fd8', extra: 'halo' },
  { id: 'a-veloz',    name: 'Cubo veloz',    rarity: 'epic', source: 'reto', c: '#ff4d4d', extra: 'bolt' },
  { id: 'a-diamante', name: 'Cubo diamante', rarity: 'epic', source: 'reto', c: '#7de3ff', extra: 'gem' },
];

export const ALL = [...BACKGROUNDS.map(r => ({ ...r, kind: 'fondo' })), ...AVATARS.map(r => ({ ...r, kind: 'avatar' }))];
export const byId = id => ALL.find(r => r.id === id) || null;
export const FREE = ALL.filter(r => r.free).map(r => r.id);
export const DEFAULT_PREFS = { modo: 'juego', fondo: 'f-morado', avatar: 'a-azul' };

// Sorteo: primero la rareza (por peso), luego un premio que aún no tenga. Si ya tiene todos los de esa rareza: repetido → XP.
export function rollReward(ownedIds, rnd = Math.random) {
  const owned = new Set([...ownedIds, ...FREE]);
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

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), f = k < 0 ? 0 : 255, t = Math.abs(k);
  const ch = s => Math.round(((n >> s) & 255) * (1 - t) + f * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

// Avatar: cubo 3D de plástico con ojos (mismo dibujo de bloque que el portal).
export function avatarSVG(id, size = 48) {
  const a = AVATARS.find(x => x.id === id) || AVATARS[0];
  const c = a.c, top = shade(c, .38), side = shade(c, -.28), dark = '#1a0f4d';
  const face = a.extra === 'robot'
    ? `<rect x="15" y="31" width="9" height="7" rx="1.5" fill="#7df9ff" stroke="${dark}" stroke-width="2"/><rect x="30" y="31" width="9" height="7" rx="1.5" fill="#7df9ff" stroke="${dark}" stroke-width="2"/><path d="M19 47h16" stroke="${dark}" stroke-width="2.5" stroke-dasharray="3 2"/>`
    : `<ellipse cx="20" cy="35" rx="3.6" ry="4.6" fill="${dark}"/><ellipse cx="34" cy="35" rx="3.6" ry="4.6" fill="${dark}"/><circle cx="21.2" cy="33.4" r="1.3" fill="#fff"/><circle cx="35.2" cy="33.4" r="1.3" fill="#fff"/><path d="M22 44q5 4 10 0" fill="none" stroke="${dark}" stroke-width="2.6" stroke-linecap="round"/>`;
  const extra = {
    robot: `<path d="M28 13V5" stroke="${dark}" stroke-width="2.5"/><circle cx="28" cy="4.5" r="3" fill="#ff5fa2" stroke="${dark}" stroke-width="2"/>`,
    cat: `<path d="M8 18l3-12 9 8z M34 14l9-8 2 12z" fill="${c}" stroke="${dark}" stroke-width="2.5" stroke-linejoin="round"/>`,
    crown: `<path d="M12 16l3-12 7 7 6-9 6 9 7-7 3 12z" fill="#fff07a" stroke="${dark}" stroke-width="2.5" stroke-linejoin="round"/>`,
    rainbow: '',
    dragon: `<path d="M12 18 6 2l14 12z M42 14 56 2l-6 16z" fill="#fff07a" stroke="${dark}" stroke-width="2.5" stroke-linejoin="round"/><path d="M60 30l3-6M60 40l3-4" stroke="${dark}" stroke-width="2.5" stroke-linecap="round"/>`,
    halo: `<ellipse cx="28" cy="7" rx="15" ry="4.5" fill="none" stroke="#fff07a" stroke-width="3.5"/><ellipse cx="28" cy="7" rx="15" ry="4.5" fill="none" stroke="${dark}" stroke-width="1.2"/><path d="M53 26l2 5 5 .5-4 3.5 1.2 5-4.2-2.8-4.2 2.8 1.2-5-4-3.5 5-.5z" fill="#fff07a" stroke="${dark}" stroke-width="1.6" stroke-linejoin="round"/>`,
    bolt: `<path d="M30 2 20 16h8l-4 10 12-15h-8l4-9z" fill="#ffd23f" stroke="${dark}" stroke-width="2" stroke-linejoin="round"/>`,
    gem: `<path d="M18 12l5-8h10l5 8-10 9z" fill="#e8fbff" stroke="${dark}" stroke-width="2.2" stroke-linejoin="round"/><path d="M18 12h20M23 4l5 17 5-17" fill="none" stroke="${dark}" stroke-width="1.4"/>`,
  }[a.extra] || '';
  const body = a.extra === 'rainbow'
    ? `<defs><linearGradient id="rb-${size}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5fa2"/><stop offset=".35" stop-color="#ffc21a"/><stop offset=".65" stop-color="#2fd39a"/><stop offset="1" stop-color="#3fb4f0"/></linearGradient></defs>`
    : '';
  const fill = a.extra === 'rainbow' ? `url(#rb-${size})` : c;
  return `<svg class="avatar-svg" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${body}
    <path d="M4 20l12-12h44l-12 12z" fill="${top}" stroke="${dark}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M48 20l12-12v42l-12 12z" fill="${side}" stroke="${dark}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="4" y="20" width="44" height="42" rx="3" fill="${fill}" stroke="${dark}" stroke-width="2.5"/>
    <path d="M10 26h32" stroke="#fff" stroke-opacity=".45" stroke-width="4" stroke-linecap="round"/>
    ${face}${extra}</svg>`;
}

// Muestra de un fondo (para la colección y el premio).
export function backgroundSwatch(id) {
  const b = BACKGROUNDS.find(x => x.id === id) || BACKGROUNDS[0];
  return `<span class="bg-swatch" style="background:radial-gradient(circle at 20% 15%,rgba(${b.g[0]},.55) 0,transparent 45%),radial-gradient(circle at 85% 60%,rgba(${b.g[1]},.5) 0,transparent 45%),linear-gradient(165deg,${b.c1},${b.c2})"></span>`;
}

export const rewardPreview = (r, size = 72) => r.kind === 'avatar' ? avatarSVG(r.id, size) : backgroundSwatch(r.id);

// Variables CSS del fondo equipado.
export function backgroundVars(id) {
  const b = BACKGROUNDS.find(x => x.id === id) || BACKGROUNDS[0];
  return `--fondo-1:${b.c1};--fondo-2:${b.c2};--glow-1:${b.g[0]};--glow-2:${b.g[1]};--glow-3:${b.g[2]};--cielo-blend:${b === BACKGROUNDS[0] ? 'normal' : 'luminosity'}`;
}
