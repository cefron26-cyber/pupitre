// Plantilla Sopa de letras: el docente escribe las palabras; cada estudiante recibe una cuadrícula al azar
// (se guarda en el progreso, así que recargar no la cambia). Se marca arrastrando de la primera a la última
// letra, o tocando la primera y luego la última.
import { el, esc, icons, shuffle } from '../ui.js';

const MIN = 3, MAX = 15, LARGO = 12;
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// "Ice cream" → "ICECREAM" (en la cuadrícula van solo letras A-Z).
export const letras = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
const valida = s => /^[\p{L}\s'-]+$/u.test(s.trim());

// Direcciones: horizontal y vertical siempre; diagonales y al revés según lo que elija el docente.
function direcciones({ diagonal, backwards }) {
  const d = [[0, 1], [1, 0]];
  if (diagonal) d.push([1, 1], [-1, 1]);
  if (backwards) d.push(...d.map(([a, b]) => [-a, -b]));
  return d;
}

// Arma la cuadrícula: palabras largas primero, posiciones al azar; si no caben, agranda el tablero.
export function armarSopa(words, opts = {}) {
  const dirs = direcciones(opts);
  const ws = words.map((w, i) => ({ i, w: letras(w) })).sort((a, b) => b.w.length - a.w.length);
  const total = ws.reduce((s, x) => s + x.w.length, 0);
  let size = Math.max(8, ws[0]?.w.length || 0, Math.ceil(Math.sqrt(total * 2.2)));
  for (let intento = 0; intento < 60; intento++) {
    if (intento && intento % 10 === 0) size++;
    const g = Array.from({ length: size }, () => Array(size).fill(''));
    const places = [];
    const ok = ws.every(({ i, w }) => {
      const cands = [];
      for (const [dr, dc] of dirs) for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        const er = r + dr * (w.length - 1), ec = c + dc * (w.length - 1);
        if (er < 0 || er >= size || ec < 0 || ec >= size) continue;
        let cruces = 0, sirve = true;
        for (let k = 0; k < w.length && sirve; k++) {
          const x = g[r + dr * k][c + dc * k];
          if (x === w[k]) cruces++; else if (x) sirve = false;
        }
        if (sirve && cruces < w.length) cands.push({ r, c, dr, dc, cruces });
      }
      if (!cands.length) return false;
      // Algún cruce de vez en cuando hace la sopa más interesante, pero sin obligar.
      const conCruce = cands.filter(x => x.cruces);
      const pick = shuffle(conCruce.length && Math.random() < .35 ? conCruce : cands)[0];
      for (let k = 0; k < w.length; k++) g[pick.r + pick.dr * k][pick.c + pick.dc * k] = w[k];
      places[i] = { r: pick.r, c: pick.c, dr: pick.dr, dc: pick.dc, len: w.length };
      return true;
    });
    if (!ok) continue;
    for (const row of g) for (let c = 0; c < size; c++) if (!row[c]) row[c] = ABC[Math.floor(Math.random() * 26)];
    return { size, grid: g.map(r => r.join('')), places };
  }
  throw new Error('No se pudo armar la sopa de letras.');
}

const celdasDe = p => Array.from({ length: p.len }, (_, k) => [p.r + p.dr * k, p.c + p.dc * k]);

export default {
  type: 'wordsearch',
  label: 'Sopa de letras',
  plural: 'Sopas de letras',
  description: 'Escribe las palabras; se esconden en una cuadrícula y el estudiante las encuentra.',
  icon: icons.wordsearch,

  empty: () => ({ items: [{ word: '' }, { word: '' }, { word: '' }], diagonal: true, backwards: false }),
  summary: c => `${c.items.length} palabras`,

  editor(root, content) {
    let texto = content.items.map(x => x.word).filter(Boolean).join('\n');
    let diagonal = content.diagonal !== false, backwards = !!content.backwards;
    const lista = () => texto.split('\n').map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
    root.innerHTML = `<p class="hint" style="margin:0 0 12px">Escribe una palabra por línea (${MIN} a ${MAX}, máximo ${LARGO} letras).
      Los espacios y guiones no van en la cuadrícula: <i>ice cream</i> se busca como ICECREAM.</p>
      <div class="panel editor-item">
        <label for="ws-words">Palabras</label>
        <textarea id="ws-words" rows="8" placeholder="apple&#10;banana&#10;orange&#10;grapes">${esc(texto)}</textarea>
        <p class="hint" data-count></p>
        <div class="row" style="gap:20px; flex-wrap:wrap; margin-top:8px">
          <label class="ws-opt"><input type="checkbox" data-diag ${diagonal ? 'checked' : ''}> En diagonal</label>
          <label class="ws-opt"><input type="checkbox" data-back ${backwards ? 'checked' : ''}> También al revés (más difícil)</label>
        </div>
      </div>`;
    const count = root.querySelector('[data-count]');
    const upd = () => { const n = lista().length; count.textContent = n ? `${n} palabra${n === 1 ? '' : 's'}` : ''; };
    upd();
    root.querySelector('textarea').oninput = e => { texto = e.target.value; upd(); };
    root.querySelector('[data-diag]').onchange = e => { diagonal = e.target.checked; };
    root.querySelector('[data-back]').onchange = e => { backwards = e.target.checked; };
    return {
      getContent: () => ({ items: lista().map(word => ({ word })), diagonal, backwards }),
      validate() {
        const ws = lista(), errs = [];
        if (ws.length < MIN || ws.length > MAX) errs.push(`Usa entre ${MIN} y ${MAX} palabras.`);
        ws.forEach((w, i) => {
          if (!valida(w)) errs.push(`Palabra ${i + 1} (${w}): solo letras, espacios o guiones.`);
          else if (letras(w).length < 2) errs.push(`Palabra ${i + 1}: muy corta.`);
          else if (letras(w).length > LARGO) errs.push(`Palabra ${i + 1} (${w}): máximo ${LARGO} letras.`);
        });
        const ks = ws.map(letras);
        if (new Set(ks).size !== ks.length) errs.push('Hay palabras repetidas.');
        return errs;
      },
    };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const words = content.items.map(x => x.word);
    const n = words.length;
    const st = saved?.grid ? saved : { ...armarSopa(words, content), found: [], misses: 0 };
    const save = () => onProgreso({ ...st, done: st.found.length, total: n });
    const N = st.size;

    root.innerHTML = '';
    const wrap = el(`<div>
      <div class="small muted" style="margin-bottom:12px">Encontradas: <b data-stat></b> de ${n} · Arrastra sobre cada palabra</div>
      <div class="ws-layout">
        <div class="ws-board"><div class="ws-grid" style="--n:${N}" role="grid" aria-label="Sopa de letras"></div></div>
        <ul class="ws-words" aria-label="Palabras para buscar"></ul>
      </div>
      <div class="row end" style="margin-top:16px"><button class="btn ghost" type="button" data-end>Terminar</button></div>
    </div>`);
    const grid = wrap.querySelector('.ws-grid');
    const listEl = wrap.querySelector('.ws-words');
    const stat = wrap.querySelector('[data-stat]');

    const cells = [];
    st.grid.forEach((row, r) => {
      cells[r] = [];
      [...row].forEach((ch, c) => {
        const b = el(`<span class="ws-cell" role="gridcell" data-r="${r}" data-c="${c}">${ch}</span>`);
        grid.append(b); cells[r][c] = b;
      });
    });
    const items = words.map((w, i) => {
      const li = el(`<li class="ws-word">${esc(w)}</li>`);
      listEl.append(li);
      return li;
    });
    const pintarEncontrada = i => {
      const color = st.found.indexOf(i) % 6;
      celdasDe(st.places[i]).forEach(([r, c]) => { cells[r][c].classList.add('found'); cells[r][c].dataset.color = cells[r][c].dataset.color || color; });
      items[i].classList.add('done');
    };
    st.found.forEach(pintarEncontrada);
    const upd = () => { stat.textContent = st.found.length; };

    // ---------- Selección ----------
    let start = null, sel = [];
    const limpiar = () => { sel.forEach(([r, c]) => cells[r][c].classList.remove('sel')); sel = []; };
    const linea = (a, b) => {
      const dr = Math.sign(b[0] - a[0]), dc = Math.sign(b[1] - a[1]);
      const lr = Math.abs(b[0] - a[0]), lc = Math.abs(b[1] - a[1]);
      if (lr && lc && lr !== lc) return null; // solo rectas
      const len = Math.max(lr, lc) + 1;
      return Array.from({ length: len }, (_, k) => [a[0] + dr * k, a[1] + dc * k]);
    };
    const marcar = list => { limpiar(); sel = list; sel.forEach(([r, c]) => cells[r][c].classList.add('sel')); };
    const celdaEn = (x, y) => document.elementFromPoint(x, y)?.closest?.('.ws-cell');
    const pos = cell => [+cell.dataset.r, +cell.dataset.c];

    const evaluar = () => {
      if (sel.length < 2) return;
      const key = l => l.map(p => p.join(',')).join(';');
      const k1 = key(sel), k2 = key([...sel].reverse());
      const i = st.places.findIndex((p, j) => !st.found.includes(j) && [k1, k2].includes(key(celdasDe(p))));
      if (i >= 0) {
        st.found.push(i);
        limpiar(); pintarEncontrada(i);
        items[i].classList.add('correct');
        upd(); save();
        if (st.found.length === n) setTimeout(finish, 800);
      } else {
        st.misses++; save();
        const fallo = sel; limpiar();
        fallo.forEach(([r, c]) => cells[r][c].classList.add('miss'));
        setTimeout(() => fallo.forEach(([r, c]) => cells[r][c].classList.remove('miss')), 450);
      }
    };

    let arrastrando = false, movio = false;
    grid.addEventListener('pointerdown', e => {
      const cell = e.target.closest('.ws-cell');
      if (!cell || e.button > 0) return;
      e.preventDefault();
      const p = pos(cell);
      if (start && !(p[0] === start[0] && p[1] === start[1])) { // segundo toque: cierra la palabra
        const l = linea(start, p);
        start = null;
        if (l) { marcar(l); evaluar(); } else limpiar();
        return;
      }
      start = p; arrastrando = true; movio = false; marcar([p]);
    });
    const onMove = e => {
      if (!arrastrando) return;
      const cell = celdaEn(e.clientX, e.clientY);
      if (!cell) return;
      const p = pos(cell);
      if (p[0] === start[0] && p[1] === start[1]) return;
      const l = linea(start, p);
      if (l) { movio = true; marcar(l); }
    };
    const onUp = () => {
      if (!arrastrando) return;
      arrastrando = false;
      if (movio) { start = null; evaluar(); limpiar(); } // fue un arrastre
      // si no se movió, queda la primera letra marcada esperando el segundo toque
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // Puntaje: una palabra = 1 punto. Como en Memoria, se permiten n errores sin castigo; los demás restan 1.
    let terminado = false;
    const finish = () => {
      if (terminado) return; terminado = true;
      const score = Math.max(0, st.found.length - Math.max(0, st.misses - n));
      const answers = words.map((w, i) => ({ item: i, question: w, correct: st.found.includes(i) }));
      onTerminar({ score, maxScore: n, answers, extra: { misses: st.misses } });
    };
    wrap.querySelector('[data-end]').onclick = () => {
      if (st.found.length < n && !confirm(`Te faltan ${n - st.found.length} palabras. ¿Terminar de todos modos?`)) return;
      finish();
    };

    root.append(wrap);
    upd(); save();
    if (st.found.length === n) setTimeout(finish, 300);
    return {
      destroy() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      },
    };
  },
};
