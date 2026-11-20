// Efectos de sonido del cofre, sintetizados con Web Audio (sin archivos: funcionan igual en el portable y sin red).
// Cuatro sonidos, iguales para todas las rarezas: caer, cambio de rareza, coro legendario y abrir.
// Varían un poco de tono cada vez para que no aburran. Se crean al primer uso (tras un toque del usuario).
let ctx = null, out = null, verb = null;

export function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    out = ctx.createGain();
    out.gain.value = .6;
    out.connect(comp).connect(ctx.destination);
    // Reverberación de iglesia (para el coro): ruido que se apaga en 3,5 s.
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 3.5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = .5;
    verb.connect(wet).connect(out);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const vary = (f, k = .03) => f * (1 + (Math.random() * 2 - 1) * k);
let noiseBuf = null;
function noiseBuffer() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// Envolvente: sube en `a` segundos hasta `vol` y cae hasta casi cero al final de `dur`.
function env(g, t, a, dur, vol) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

export function tone(freq, dur, { type = 'sine', vol = .3, a = .005, to = null, at = 0 } = {}) {
  const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(g, t, a, dur, vol);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + dur + .05);
}

export function noise(dur, { filter = 'bandpass', freq = 1000, to = null, q = 1, vol = .3, a = .005, at = 0 } = {}) {
  const t = ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuffer();
  f.type = filter; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(g, t, a, dur, vol);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random()); s.stop(t + dur + .05);
}

// Campanita brillante (dos parciales).
export const bell = (f, at, vol = .18, dur = .5) => {
  tone(f, dur, { type: 'triangle', vol, at });
  tone(f * 2.01, dur * .6, { type: 'sine', vol: vol * .4, at });
};

// Una voz del coro cantando "Ahhh": dos sierras desafinadas con vibrato, pasadas por los formantes de la "a"
// (≈ 800, 1150 y 2900 Hz). Entra suave, se sostiene y se apaga en la reverberación.
function voice(freq, at, dur, vol) {
  const t = ctx.currentTime + at, mix = ctx.createGain(), g = ctx.createGain();
  const vib = ctx.createOscillator(), vibAmt = ctx.createGain();
  vib.frequency.value = 5 + Math.random(); vibAmt.gain.value = freq * .012;
  vib.connect(vibAmt);
  for (const det of [-7, 6]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det + Math.random() * 4;
    vibAmt.connect(o.frequency);
    o.connect(mix); o.start(t); o.stop(t + dur + .1);
  }
  vib.start(t); vib.stop(t + dur + .1);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + .5);
  g.gain.setValueAtTime(vol, t + dur - 1);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const [f, q, v] of [[800, 6, 1], [1150, 7, .6], [2900, 9, .25]]) {
    const bp = ctx.createBiquadFilter(), fg = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; fg.gain.value = v;
    mix.connect(bp).connect(fg).connect(g);
  }
  g.connect(out); g.connect(verb);
}

// Chirrido de puerta vieja (bisagra oxidada). Se genera muestra a muestra como "roce que se pega y se suelta":
// granitos de ruido muy cortos cuyo ritmo sigue una curva — empieza con crujidos sueltos (tac... tac..tac), pasa a
// un chirrido agudo que sube y baja (iiiiiiíííiii) y termina otra vez en crujidos lentos. Las resonancias son
// agudas (1,2 / 2,4 / 3,8 kHz) y se corta todo lo grave para que no suene a croar.
function creakBuffer(dur) {
  const sr = ctx.sampleRate, n = Math.floor(dur * sr), buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
  const pts = [[0, 18], [.1, 45], [.2, 110], [.3, 380], [.42, 720], [.52, 540], [.64, 900], [.74, 660], [.82, 820], [.9, 140], [1, 25]]
    .map(([x, f]) => [x, f * (1 + (Math.random() * 2 - 1) * .12)]);
  const at = x => { let k = 1; while (k < pts.length - 1 && pts[k][0] < x) k++; const [x0, f0] = pts[k - 1], [x1, f1] = pts[k]; return f0 + (f1 - f0) * Math.min(1, (x - x0) / (x1 - x0)); };
  let phase = 0, jit = 0, jitT = 0;
  for (let i = 0; i < n; i++) {
    if (i >= jitT) { jit += (Math.random() * 2 - 1) * .08; jit *= .9; jitT = i + 180; }
    const x = i / n;
    phase += at(x) * (1 + jit) / sr;
    if (phase >= 1) {
      phase -= 1;
      const amp = .55 + Math.random() * .45, len = 24 + Math.floor(Math.random() * 20);
      for (let k = 0; k < len && i + k < n; k++) d[i + k] += amp * Math.exp(-k / 7) * (Math.random() * 2 - 1);
    }
  }
  // Envolvente: entra rápido, más fuerte en el chirrido, se apaga al final.
  for (let i = 0; i < n; i++) { const x = i / n; d[i] *= Math.min(1, x / .03) * Math.min(1, (1 - x) / .08) * (.7 + .5 * Math.sin(Math.PI * Math.min(1, x * 1.1))); }
  return buf;
}

function creak(at, dur) {
  const t = ctx.currentTime + at, s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = creakBuffer(dur);
  hp.type = 'highpass'; hp.frequency.value = 500; hp.Q.value = .7;
  g.gain.value = .9;
  s.connect(hp);
  const dry = ctx.createGain(); dry.gain.value = .25; hp.connect(dry).connect(g);
  for (const [f, q, v] of [[vary(1200, .08), 5, 1], [vary(2400, .08), 7, .75], [vary(3800, .08), 9, .45]]) {
    const bp = ctx.createBiquadFilter(), fg = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; fg.gain.value = v;
    hp.connect(bp).connect(fg).connect(g);
  }
  g.connect(out);
  const room = ctx.createGain(); room.gain.value = .25; g.connect(room).connect(verb);
  s.start(t);
}

const SOUNDS = {
  // Caer: silbido mientras baja y golpe sordo al tocar el suelo (a los ~450 ms).
  drop() {
    noise(.42, { freq: 400, to: 1800, q: 2, vol: .12, a: .2 });
    tone(vary(140), .3, { to: 45, vol: .8, at: .44 });
    noise(.2, { filter: 'lowpass', freq: 500, vol: .45, at: .44 });
    tone(vary(1800), .12, { type: 'triangle', vol: .06, at: .46 });
  },
  // Cambio de rareza: zumbido que sube mientras el cofre se pone blanco y se achica; al volver, "pop" y arpegio.
  // Cada rareza suena un poco más aguda y con una nota más: rara (3 notas), épica (+4 semitonos, 4), legendaria (+7, 5).
  levelUp(level = 'rare') {
    const { st, n } = { rare: { st: 0, n: 3 }, epic: { st: 4, n: 4 }, legendary: { st: 7, n: 5 } }[level] || { st: 0, n: 3 };
    const k = Math.pow(2, st / 12);
    noise(.3, { freq: 300 * k, to: 4000 * k, q: 4, vol: .18, a: .25 });
    tone(220 * k, .3, { type: 'sawtooth', to: 880 * k, vol: .05, a: .25 });
    tone(vary(300 * k), .18, { to: 1100 * k, vol: .4, at: .3 });
    [587.33, 739.99, 880, 1174.66, 1479.98].slice(0, n).forEach((f, i) => bell(vary(f * k, .01), .32 + i * .07, .2));
    noise(.5, { filter: 'highpass', freq: 6000, vol: .08 + st * .006, at: .32 });
  },
  // Legendaria: coro de iglesia "Ahhhh" en acorde mayor, con campanitas celestiales encima.
  choir() {
    const at = .3, dur = 3.6;
    [130.81, 261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) => voice(f, at + i * .03, dur, i === 0 ? .1 : .14));
    [1046.5, 1318.51, 1567.98, 2093].forEach((f, i) => bell(f, at + .4 + i * .18, .07, 1.4));
    noise(2.5, { filter: 'highpass', freq: 8000, vol: .05, a: 1, at });
  },
  // Abrir, como un cofre viejo: clac-clac del cerrojo, la tapa que chirría como puerta vieja (~1,6 s) y, al
  // terminar de abrirse, un brillo mágico que sube (glissando de campanitas) con las notas del premio.
  open() {
    for (const at of [0, .07]) {
      noise(.035, { filter: 'highpass', freq: 3500, vol: .35, at });
      tone(vary(2600, .05), .05, { type: 'triangle', vol: .12, at });
      tone(vary(900, .05), .04, { type: 'square', vol: .05, at });
    }
    creak(.1, 1.6);
    noise(.12, { filter: 'lowpass', freq: 700, vol: .25, at: 1.62 });
    noise(1.2, { filter: 'highpass', freq: 5000, vol: .1, a: .3, at: 1.2 });
    for (let i = 0; i < 10; i++) bell(vary(1046.5 * Math.pow(2, i / 6), .01), 1.4 + i * .035, .07, .5);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, 1.7 + i * .09, .18, .8));
  },
};

/** Reproduce un efecto ('drop' | 'levelUp' | 'choir' | 'open'). Nunca lanza error (sin audio = silencio). */
export function sfx(name, ...args) {
  try { if (audio()) SOUNDS[name]?.(...args); } catch { /* sin sonido */ }
}
