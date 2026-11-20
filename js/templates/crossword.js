// Plantilla Crucigrama: el docente escribe respuesta + pista; el tablero se arma solo cruzando las palabras
// (se guarda en el progreso, así que recargar no lo cambia). El estudiante escribe en las casillas y comprueba al final.
import { evalMode, neutralFb, el, esc, icons, shuffle } from '../ui.js';
import { letras } from './wordsearch.js';

const MIN = 3, MAX = 15, LARGO = 15;
const valida = s => /^[\p{L}\s'-]+$/u.test(s.trim());

// ---------- Armado del tablero ----------
// Coloca las palabras en coordenadas libres (pueden ser negativas) y al final se normaliza a 0.
function intentar(words) {
  const cells = new Map(); // "r,c" → { ch, h: bool, v: bool }
  const at = (r, c) => cells.get(r + ',' + c);
  const placed = [];
  const puede = (w, r, c, dir) => {
    const [dr, dc] = dir === 'h' ? [0, 1] : [1, 0];
    if (at(r - dr, c - dc) || at(r + dr * w.length, c + dc * w.length)) return -1; // nada pegado a las puntas
    let cruces = 0;
    for (let k = 0; k < w.length; k++) {
      const rr = r + dr * k, cc = c + dc * k, x = at(rr, cc);
      if (x) {
        if (x.ch !== w[k] || x[dir]) return -1;
        cruces++;
      } else if (dir === 'h' ? (at(rr - 1, cc) || at(rr + 1, cc)) : (at(rr, cc - 1) || at(rr, cc + 1))) return -1; // sin vecinos de lado
    }
    return cruces;
  };
  const poner = (x, r, c, dir) => {
    const [dr, dc] = dir === 'h' ? [0, 1] : [1, 0];
    for (let k = 0; k < x.w.length; k++) {
      const key = (r + dr * k) + ',' + (c + dc * k);
      const cell = cells.get(key) || { ch: x.w[k] };
      cell[dir] = true; cells.set(key, cell);
    }
    placed.push({ i: x.i, r, c, dir, len: x.w.length });
  };
  const [primera, ...resto] = words;
  poner(primera, 0, 0, Math.random() < .5 ? 'h' : 'v');
  let pendientes = resto;
  for (let vuelta = 0; vuelta < 3 && pendientes.length; vuelta++) {
    const quedan = [];
    for (const x of pendientes) {
      const opciones = [];
      for (const p of placed) for (let k = 0; k < p.len; k++) {
        const r0 = p.dir === 'h' ? p.r : p.r + k, c0 = p.dir === 'h' ? p.c + k : p.c;
        const ch = at(r0, c0).ch, dir = p.dir === 'h' ? 'v' : 'h';
        for (let j = 0; j < x.w.length; j++) {
          if (x.w[j] !== ch) continue;
          const r = dir === 'v' ? r0 - j : r0, c = dir === 'h' ? c0 - j : c0;
          const cr = puede(x.w, r, c, dir);
          if (cr > 0) opciones.push({ r, c, dir, cr });
        }
      }
      if (!opciones.length) { quedan.push(x); continue; }
      const mejor = Math.max(...opciones.map(o => o.cr));
      const o = shuffle(opciones.filter(o => o.cr === mejor))[0];
      poner(x, o.r, o.c, o.dir);
    }
    pendientes = quedan;
  }
  const conectadas = placed.length;
  // Las que no cruzan con nada van sueltas debajo (una fila libre de por medio).
  for (const x of pendientes) {
    const rs = [...cells.keys()].map(k => +k.split(',')[0]), cs = [...cells.keys()].map(k => +k.split(',')[1]);
    poner(x, Math.max(...rs) + 2, Math.min(...cs), 'h');
  }
  const keys = [...cells.keys()].map(k => k.split(',').map(Number));
  const minR = Math.min(...keys.map(k => k[0])), minC = Math.min(...keys.map(k => k[1]));
  const h = Math.max(...keys.map(k => k[0])) - minR + 1, w = Math.max(...keys.map(k => k[1])) - minC + 1;
  return { conectadas, w, h, words: placed.map(p => ({ ...p, r: p.r - minR, c: p.c - minC })) };
}

export function armarCrucigrama(answers) {
  const base = answers.map((a, i) => ({ i, w: letras(a) }));
  let mejor = null;
  for (let t = 0; t < 40; t++) {
    // Palabras largas primero (con algo de azar entre las parecidas) cruzan mejor.
    const orden = shuffle(base).sort((a, b) => (b.w.length + Math.random() * 3) - (a.w.length + Math.random() * 3));
    const l = intentar(orden);
    const nota = l.conectadas * 1000 - l.w * l.h - Math.abs(l.w - l.h) * 4;
    if (!mejor || nota > mejor.nota) mejor = { ...l, nota };
  }
  delete mejor.nota;
  // Números: por casilla de inicio, de arriba abajo y de izquierda a derecha.
  const inicios = [...new Set(mejor.words.map(p => p.r * 1000 + p.c))].sort((a, b) => a - b);
  mejor.words.forEach(p => { p.n = inicios.indexOf(p.r * 1000 + p.c) + 1; });
  return mejor;
}

const celdas = p => Array.from({ length: p.len }, (_, k) => p.dir === 'h' ? [p.r, p.c + k] : [p.r + k, p.c]);

export default {
  type: 'crossword',
  label: 'Crucigrama',
  plural: 'Crucigramas',
  description: 'Escribe respuestas y pistas; el crucigrama se arma solo.',
  icon: icons.crossword,

  empty: () => ({ items: Array.from({ length: MIN }, () => ({ answer: '', clue: '' })) }),
  summary: c => `${c.items.length} palabras`,

  editor(root, content) {
    const items = structuredClone(content.items);
    const draw = () => {
      root.innerHTML = `<p class="hint" style="margin:0 0 12px">Escribe la respuesta y su pista (${MIN} a ${MAX} palabras, máximo ${LARGO} letras).
        El tablero se arma solo: usa palabras que compartan letras para que se crucen.</p>`;
      items.forEach((it, i) => {
        const box = el(`<div class="panel editor-item">
          <div class="row between"><div class="num">Palabra ${i + 1}</div>
            <button class="icon-btn" type="button" data-del aria-label="Eliminar palabra ${i + 1}" ${items.length <= MIN ? 'disabled' : ''}>×</button></div>
          <div class="cw-ed-row">
            <input data-a placeholder="Respuesta (ej. Monday)" value="${esc(it.answer)}" aria-label="Respuesta ${i + 1}" maxlength="${LARGO + 4}">
            <input data-c class="grow" placeholder="Pista: The first day of the school week." value="${esc(it.clue)}" aria-label="Pista ${i + 1}" maxlength="160">
          </div>
        </div>`);
        box.querySelector('[data-a]').oninput = e => { it.answer = e.target.value; };
        box.querySelector('[data-c]').oninput = e => { it.clue = e.target.value; };
        box.querySelector('[data-del]').onclick = () => { items.splice(i, 1); draw(); };
        root.append(box);
      });
      const add = el(`<button class="btn ghost" type="button" style="margin-top:12px" ${items.length >= MAX ? 'disabled' : ''}>${icons.plus} Agregar palabra</button>`);
      add.onclick = () => { items.push({ answer: '', clue: '' }); draw(); root.querySelectorAll('[data-a]')[items.length - 1]?.focus(); };
      root.append(add);
    };
    draw();
    return {
      getContent: () => ({ items: items.map(it => ({ answer: it.answer.trim().replace(/\s+/g, ' '), clue: it.clue.trim() })) }),
      validate() {
        const errs = [];
        if (items.length < MIN || items.length > MAX) errs.push(`Usa entre ${MIN} y ${MAX} palabras.`);
        items.forEach((it, i) => {
          const a = it.answer.trim();
          if (!a) errs.push(`Palabra ${i + 1}: escribe la respuesta.`);
          else if (!valida(a)) errs.push(`Palabra ${i + 1}: solo letras (los espacios y guiones se quitan en el tablero).`);
          else if (letras(a).length < 2) errs.push(`Palabra ${i + 1}: muy corta.`);
          else if (letras(a).length > LARGO) errs.push(`Palabra ${i + 1}: máximo ${LARGO} letras.`);
          if (!it.clue.trim()) errs.push(`Palabra ${i + 1}: escribe la pista.`);
        });
        const ks = items.map(it => letras(it.answer)).filter(Boolean);
        if (new Set(ks).size !== ks.length) errs.push('Hay respuestas repetidas.');
        return errs;
      },
    };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const its = content.items;
    const total = its.length;
    const st = saved?.layout ? saved : { layout: armarCrucigrama(its.map(x => x.answer)), letters: {}, checked: false, answers: [] };
    const L = st.layout;
    const sol = {}; // "r,c" → letra correcta
    L.words.forEach(p => celdas(p).forEach(([r, c], k) => { sol[r + ',' + c] = letras(its[p.i].answer)[k]; }));
    const llenas = () => L.words.filter(p => celdas(p).every(([r, c]) => st.letters[r + ',' + c])).length;
    const save = () => onProgreso({ ...st, done: st.checked ? total : llenas(), total });

    let dir = 'h', cur = null; // casilla y sentido activos
    const inputs = {};

    const draw = () => {
      root.innerHTML = '';
      const numeros = {};
      L.words.forEach(p => { numeros[p.r + ',' + p.c] = p.n; });
      const pistas = d => L.words.filter(p => p.dir === d).sort((a, b) => a.n - b.n)
        .map(p => `<li data-w="${L.words.indexOf(p)}"><b>${p.n}</b> ${esc(its[p.i].clue)} <span class="muted">(${p.len})</span></li>`).join('');
      const wrap = el(`<div>
        <div class="small muted" style="margin-bottom:12px">Toca una casilla y escribe · Toca otra vez para cambiar de sentido</div>
        <div class="cw-layout">
          <div class="cw-board"><div class="cw-grid" style="--w:${L.w}; --h:${L.h}"></div></div>
          <div class="cw-clues">
            ${L.words.some(p => p.dir === 'h') ? `<h3>Horizontales →</h3><ol>${pistas('h')}</ol>` : ''}
            ${L.words.some(p => p.dir === 'v') ? `<h3>Verticales ↓</h3><ol>${pistas('v')}</ol>` : ''}
          </div>
        </div>
        <div class="fb-slot" role="status" aria-live="polite"><div class="row end" style="margin-top:20px"><button class="btn" type="button" data-check>Comprobar</button></div></div>
      </div>`);
      const grid = wrap.querySelector('.cw-grid');
      for (let r = 0; r < L.h; r++) for (let c = 0; c < L.w; c++) {
        const k = r + ',' + c;
        if (!sol[k]) { grid.append(el('<span class="cw-empty"></span>')); continue; }
        const cell = el(`<label class="cw-cell">${numeros[k] ? `<span class="cw-n">${numeros[k]}</span>` : ''}
          <input autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Casilla fila ${r + 1}, columna ${c + 1}"></label>`);
        const inp = cell.querySelector('input');
        inp.value = st.letters[k] || '';
        inp.dataset.k = k;
        if (st.checked) inp.readOnly = true;
        inputs[k] = inp;
        grid.append(cell);
      }
      wrap.querySelectorAll('.cw-clues li').forEach(li => li.onclick = () => {
        const p = L.words[+li.dataset.w];
        dir = p.dir; enfocar(p.r + ',' + p.c);
      });
      wrap.querySelector('[data-check]').onclick = comprobar;
      root.append(wrap);
      if (!st.checked) {
        Object.values(inputs).forEach(conectar);
      } else marcarResultado(false);
      if (st.checked) showFeedback();
    };

    const palabraEn = (k, d) => L.words.find(p => p.dir === d && celdas(p).some(([r, c]) => r + ',' + c === k));
    const resaltar = () => {
      root.querySelectorAll('.cw-cell.on, .cw-cell.cur').forEach(x => x.classList.remove('on', 'cur'));
      root.querySelectorAll('.cw-clues li.on').forEach(x => x.classList.remove('on'));
      if (!cur) return;
      const p = palabraEn(cur, dir);
      if (p) {
        celdas(p).forEach(([r, c]) => inputs[r + ',' + c].parentElement.classList.add('on'));
        root.querySelector(`.cw-clues li[data-w="${L.words.indexOf(p)}"]`)?.classList.add('on');
      }
      inputs[cur].parentElement.classList.add('cur');
    };
    const enfocar = k => { if (inputs[k]) { cur = k; inputs[k].focus({ preventScroll: false }); inputs[k].select(); resaltar(); } };
    const vecino = (k, paso, d = dir) => {
      const [r, c] = k.split(',').map(Number);
      return d === 'h' ? r + ',' + (c + paso) : (r + paso) + ',' + c;
    };

    const conectar = inp => {
      const k = inp.dataset.k;
      inp.addEventListener('pointerdown', () => {
        // Segundo toque en la misma casilla: cambia de sentido (si hay palabra en el otro).
        if (cur === k) { const otro = dir === 'h' ? 'v' : 'h'; if (palabraEn(k, otro)) dir = otro; }
        else if (!palabraEn(k, dir)) dir = dir === 'h' ? 'v' : 'h';
        cur = k; setTimeout(resaltar);
      });
      inp.addEventListener('focus', () => { if (cur !== k) { cur = k; if (!palabraEn(k, dir)) dir = dir === 'h' ? 'v' : 'h'; } resaltar(); inp.select(); });
      // Varias letras de una vez (pegar, autocompletar del celular): se reparten en las casillas siguientes.
      inp.addEventListener('input', () => {
        const prev = st.letters[k] || '';
        let vs = letras(inp.value);
        if (vs.length === 2 && prev && vs[0] === prev) vs = vs.slice(1); // escribió detrás de la letra que ya estaba
        if (!vs) { inp.value = ''; delete st.letters[k]; save(); return; }
        let kk = k, ultima = k;
        for (const ch of vs) {
          if (!inputs[kk]) break;
          inputs[kk].value = ch; st.letters[kk] = ch; ultima = kk;
          kk = vecino(kk, 1);
        }
        save();
        enfocar(inputs[kk] ? kk : ultima);
      });
      inp.addEventListener('keydown', e => {
        const mov = { ArrowRight: ['h', 1], ArrowLeft: ['h', -1], ArrowDown: ['v', 1], ArrowUp: ['v', -1] }[e.key];
        if (mov) {
          e.preventDefault();
          if (palabraEn(k, mov[0])) dir = mov[0];
          let n = vecino(k, mov[1], mov[0]);
          if (inputs[n]) enfocar(n); else resaltar();
        } else if (e.key === 'Backspace' && !inp.value) {
          e.preventDefault();
          const p = vecino(k, -1);
          if (inputs[p]) { enfocar(p); inputs[p].value = ''; delete st.letters[p]; save(); }
        } else if (e.key === 'Enter') { e.preventDefault(); comprobar(); }
      });
    };

    const comprobar = () => {
      if (st.checked) return;
      const vacias = Object.keys(sol).filter(k => !st.letters[k]).length;
      if (vacias) {
        const slot = root.querySelector('.fb-slot');
        if (!slot.querySelector('[data-confirm]')) {
          slot.querySelector('.hint')?.remove();
          slot.prepend(el(`<p class="hint" data-confirm style="color:var(--danger);text-align:right">Faltan ${vacias} casilla${vacias === 1 ? '' : 's'}. Toca Comprobar otra vez para entregar así.</p>`));
          return;
        }
      }
      st.answers = L.words.map(p => {
        const given = celdas(p).map(([r, c]) => st.letters[r + ',' + c] || '_').join('');
        const exp = letras(its[p.i].answer);
        return { item: p.i, question: its[p.i].clue, given, expected: its[p.i].answer, correct: given === exp };
      }).sort((a, b) => a.item - b.item);
      st.checked = true; cur = null;
      save();
      Object.values(inputs).forEach(inp => { inp.readOnly = true; inp.blur(); });
      resaltar();
      marcarResultado(true);
      showFeedback();
    };

    // Casillas bien / mal (con respuestas ocultas no se marca nada). Al retomar no hace falta animar.
    const marcarResultado = () => {
      if (evalMode.hide) return;
      for (const [k, inp] of Object.entries(inputs)) {
        const ok = st.letters[k] === sol[k];
        inp.parentElement.classList.add(ok ? 'ok' : 'bad');
      }
    };

    const showFeedback = () => {
      const bien = st.answers.filter(a => a.correct).length;
      const hide = evalMode.hide;
      const fb = el(`<div class="feedback ${hide ? 'neutral' : bien === total ? 'ok' : 'bad'}">
        ${hide ? neutralFb() : `<span>${bien === total ? '¡Crucigrama perfecto!' : `${bien} de ${total} palabras correctas.`}</span>`}
        ${hide || bien === total ? '' : '<button class="btn ghost" type="button" data-sol>Ver solución</button>'}
        <button class="btn" type="button" data-fin>Ver resultado</button></div>`);
      fb.querySelector('[data-fin]').onclick = () => onTerminar({ score: bien, maxScore: total, answers: st.answers });
      fb.querySelector('[data-sol]')?.addEventListener('click', e => {
        for (const [k, inp] of Object.entries(inputs)) if (st.letters[k] !== sol[k]) { inp.value = sol[k]; inp.parentElement.classList.add('fixed'); }
        e.target.remove();
      });
      root.querySelector('.fb-slot').replaceChildren(fb);
      fb.querySelector('[data-fin]').focus({ preventScroll: true });
    };

    save(); draw();
  },
};
