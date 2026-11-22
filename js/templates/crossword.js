// Plantilla Crucigrama: el docente escribe respuesta + pista; el tablero se arma solo cruzando las palabras
// (se guarda en el progreso, así que recargar no lo cambia). Cada palabra se revisa al completarla (en evaluación, al final).
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
    // Apaisado (≈1,4:1): el tablero va al lado de la pista en un escenario 16:10, así las casillas salen más grandes.
    const nota = l.conectadas * 1000 - l.w * l.h - Math.abs(l.w - l.h * 1.4) * 6;
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

  // Como WordWall (2026-11-21): pista grande al lado del tablero, números fuera de las casillas, fichas al escribir y
  // revisión por palabra al completarla (bien → queda resuelta; mal → se vacía; al segundo error se muestra la palabra).
  // En evaluación (respuestas ocultas) no se revisa nada hasta "Comprobar" al final.
  render(root, content, saved, { onProgreso, onTerminar }) {
    const its = content.items;
    const total = its.length;
    const hide = evalMode.hide;
    const porPalabra = !hide;
    const st = saved?.layout ? saved : { layout: armarCrucigrama(its.map(x => x.answer)), letters: {}, checked: false, answers: [] };
    if (!st.estado) st.estado = {};     // palabra (índice en layout.words) → 'ok' | 'revelada'
    if (!st.intentos) st.intentos = {};
    if (!Array.isArray(st.answers)) st.answers = [];
    const L = st.layout, W = L.words;
    const sol = {}; // "r,c" → letra correcta
    W.forEach(p => celdas(p).forEach(([r, c], k) => { sol[r + ',' + c] = letras(its[p.i].answer)[k]; }));
    const llenas = () => W.filter(p => celdas(p).every(([r, c]) => st.letters[r + ',' + c])).length;
    const resueltas = () => Object.keys(st.estado).length;
    const save = () => onProgreso({ ...st, done: porPalabra ? resueltas() : st.checked ? total : llenas(), total });
    const terminar = () => onTerminar({ score: st.answers.filter(a => a.correct).length, maxScore: total, answers: [...st.answers].sort((a, b) => a.item - b.item) });

    // Progreso de la versión anterior ya comprobado: se da por terminado.
    if (porPalabra && st.checked) { save(); setTimeout(terminar); return; }

    const claves = p => celdas(p).map(([r, c]) => r + ',' + c);
    const bloqueada = k => W.some((p, w) => st.estado[w] && claves(p).includes(k));
    const palabraEn = (k, d) => W.find(p => p.dir === d && claves(p).includes(k));
    const ordenadas = () => W.map((p, w) => ({ p, w })).sort((a, b) => a.p.n - b.p.n || (a.p.dir === 'h' ? -1 : 1));

    let dir = 'h', cur = null, ocupado = false; // casilla y sentido activos; ocupado = animando una revisión
    const inputs = {};
    let grid = null, pista = null;

    const draw = () => {
      root.innerHTML = '';
      // Números fuera de la casilla (a la izquierda de la horizontal, encima de la vertical); si chocan, adentro.
      const fuera = {}, dentro = {}, finDe = {};
      W.forEach((p, w) => {
        const fk = p.dir === 'h' ? `${p.r},${p.c + p.len}` : `${p.r + p.len},${p.c}`;
        if (!sol[fk]) finDe[fk] = w;
        if (p.dir === 'v' && W.some(q => q.dir === 'h' && q.r === p.r && q.c === p.c)) return; // inicio compartido: un solo número
        const nk = p.dir === 'h' ? `${p.r},${p.c - 1}` : `${p.r - 1},${p.c}`;
        if (!sol[nk] && !fuera[nk] && finDe[nk] === undefined) fuera[nk] = { n: p.n, d: p.dir }; else dentro[`${p.r},${p.c}`] = p.n;
      });
      const wrap = el(`<div class="cw ${porPalabra ? 'practica' : 'eval'}">
        <div class="small muted" style="margin-bottom:12px">Toca una casilla y escribe · Toca otra vez para cambiar de sentido</div>
        <p class="cw-pista" aria-live="polite"></p>
        <div class="cw-board"><div class="cw-grid" style="--w:${L.w + 2}; --h:${L.h + 2}"></div></div>
        <div class="fb-slot" role="status" aria-live="polite">${porPalabra ? '' : '<div class="row end" style="margin-top:14px"><button class="btn" type="button" data-check>Comprobar</button></div>'}</div>
      </div>`);
      grid = wrap.querySelector('.cw-grid');
      pista = wrap.querySelector('.cw-pista');
      let idx = 0;
      for (let r = -1; r <= L.h; r++) for (let c = -1; c <= L.w; c++) {
        const k = r + ',' + c;
        if (!sol[k]) {
          const f = fuera[k];
          grid.append(el(`<span class="cw-empty" ${finDe[k] !== undefined ? `data-fin="${finDe[k]}"` : ''}>${f ? `<b class="cw-num ${f.d}">${f.n}</b>` : ''}</span>`));
          continue;
        }
        const cell = el(`<label class="cw-cell" style="--k:${idx++}">${dentro[k] ? `<span class="cw-n">${dentro[k]}</span>` : ''}
          <input autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="next" aria-label="Casilla fila ${r + 1}, columna ${c + 1}"></label>`);
        const inp = cell.querySelector('input');
        inp.value = st.letters[k] || '';
        inp.dataset.k = k;
        inputs[k] = inp;
        grid.append(cell);
      }
      wrap.querySelector('[data-check]')?.addEventListener('click', comprobar);
      root.append(wrap);
      pintarEstado();
      if (st.checked) { Object.values(inputs).forEach(i => { i.readOnly = true; }); marcarResultado(); showFeedback(); return; }
      Object.values(inputs).forEach(conectar);
      // Se elige sola la primera palabra sin resolver (con teclado físico, además se enfoca).
      siguiente(matchMedia('(pointer:fine)').matches);
    };

    // Clases de cada casilla según las letras y las palabras resueltas o reveladas.
    const pintarEstado = () => {
      for (const [k, inp] of Object.entries(inputs)) {
        const cell = inp.parentElement;
        cell.classList.toggle('lleno', !!st.letters[k]);
        const rev = W.some((p, w) => st.estado[w] === 'revelada' && claves(p).includes(k));
        const ok = W.some((p, w) => st.estado[w] === 'ok' && claves(p).includes(k));
        cell.classList.toggle('resuelta', ok);
        cell.classList.toggle('revelada', rev && !ok);
        inp.readOnly = !!st.checked; // las resueltas no se cambian, pero se puede pasar por ellas escribiendo
      }
    };

    const resaltar = () => {
      root.querySelectorAll('.cw-cell.on, .cw-cell.cur').forEach(x => x.classList.remove('on', 'cur'));
      const p = cur && palabraEn(cur, dir);
      grid?.classList.toggle('activa', !!p && !st.checked);
      if (p) {
        claves(p).forEach(k => inputs[k].parentElement.classList.add('on'));
        const texto = its[p.i].clue;
        if (pista.textContent !== texto) { pista.textContent = texto; pista.style.animation = 'none'; void pista.offsetWidth; pista.style.animation = ''; }
      }
      if (cur && inputs[cur]) inputs[cur].parentElement.classList.add('cur');
    };
    const enfocar = (k, foco = true) => {
      if (!inputs[k]) return;
      cur = k;
      if (foco) { inputs[k].focus({ preventScroll: true }); inputs[k].select(); }
      resaltar();
    };
    const vecino = (k, paso, d = dir) => {
      const [r, c] = k.split(',').map(Number);
      return d === 'h' ? r + ',' + (c + paso) : (r + paso) + ',' + c;
    };
    // Primera casilla libre de la palabra (o la primera, si está llena).
    // Si todavía no escribió nada en ella, la primera casilla (aunque sea un cruce resuelto: escribir la palabra entera calza).
    const inicioDe = p => {
      const ks = claves(p), libres = ks.filter(k => !bloqueada(k));
      if (libres.every(k => !st.letters[k])) return ks[0];
      return libres.find(k => !st.letters[k]) || ks[0];
    };
    // Pasa a la siguiente palabra sin resolver (después de la actual), como WordWall al alejar la cámara.
    const siguiente = (foco = true, paso = 1) => {
      const lista = ordenadas().filter(x => !st.estado[x.w]);
      if (!lista.length) { cur = null; resaltar(); return; }
      const actual = cur && palabraEn(cur, dir);
      const i = actual ? lista.findIndex(x => x.p === actual) : -1;
      const { p } = lista[(i + paso + lista.length) % lista.length] || lista[0];
      dir = p.dir;
      enfocar(inicioDe(p), foco);
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
        if (ocupado) { inp.value = st.letters[k] || ''; return; }
        const prev = st.letters[k] || '';
        let vs = letras(inp.value);
        if (vs.length === 2 && prev && vs[0] === prev) vs = vs.slice(1); // escribió detrás de la letra que ya estaba
        if (!vs && bloqueada(k)) {
          // Borrar sobre una casilla resuelta: no se borra; se pasa a la anterior libre y se borra esa.
          inp.value = st.letters[k];
          let p = vecino(k, -1);
          while (inputs[p] && bloqueada(p)) p = vecino(p, -1);
          if (inputs[p]) { enfocar(p); inputs[p].value = ''; delete st.letters[p]; pintarEstado(); save(); }
          return;
        }
        if (!vs) { inp.value = ''; delete st.letters[k]; pintarEstado(); save(); return; }
        const p = palabraEn(k, dir);
        let kk = k, ultima = k;
        for (const ch of vs) {
          // Si escribe la letra del cruce ya resuelto, esa letra "pasa" por su casilla (no se corre a la siguiente).
          if (inputs[kk] && bloqueada(kk) && st.letters[kk] === ch) { kk = vecino(kk, 1); continue; }
          while (inputs[kk] && bloqueada(kk)) kk = vecino(kk, 1);
          if (!inputs[kk]) break;
          inputs[kk].value = ch; st.letters[kk] = ch; ultima = kk;
          kk = vecino(kk, 1);
        }
        if (bloqueada(k)) inp.value = st.letters[k]; // la casilla del cruce resuelto conserva su letra
        pintarEstado(); save();
        enfocar(inputs[kk] ? kk : ultima);
        if (porPalabra && p) revisar(p);
      });
      inp.addEventListener('keydown', e => {
        const mov = { ArrowRight: ['h', 1], ArrowLeft: ['h', -1], ArrowDown: ['v', 1], ArrowUp: ['v', -1] }[e.key];
        if (mov) {
          e.preventDefault();
          if (palabraEn(k, mov[0])) dir = mov[0];
          const n = vecino(k, mov[1], mov[0]);
          if (inputs[n]) enfocar(n); else resaltar();
        } else if (e.key === 'Tab' && porPalabra) {
          e.preventDefault(); siguiente(true, e.shiftKey ? -1 : 1);
        } else if (e.key === 'Backspace' && !inp.value) {
          e.preventDefault();
          let p = vecino(k, -1);
          while (inputs[p] && bloqueada(p)) p = vecino(p, -1);
          if (inputs[p]) { enfocar(p); inputs[p].value = ''; delete st.letters[p]; pintarEstado(); save(); }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (!porPalabra) comprobar(); else { const p = palabraEn(k, dir); if (p) revisar(p); }
        }
      });
    };

    // ---------- Revisión por palabra ----------
    const MARCA = { bien: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" pathLength="1"/></svg>', mal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" pathLength="1"/></svg>' };
    const aviso = (ok, texto) => {
      const fb = el(`<div class="feedback ${ok ? 'ok' : 'bad'} cw-fb">${texto}</div>`);
      root.querySelector('.fb-slot')?.replaceChildren(fb);
      setTimeout(() => fb.remove(), 1600);
    };
    const marcaFin = (w, tipo) => {
      const fin = root.querySelector(`.cw-empty[data-fin="${w}"]`);
      if (!fin) return;
      fin.querySelector('.cw-marca')?.remove();
      fin.insertAdjacentHTML('beforeend', `<span class="cw-marca ${tipo}" style="--len:${W[w].len}">${MARCA[tipo]}</span>`);
    };
    const registrar = (w, correct) => {
      const p = W[w];
      st.answers = st.answers.filter(a => a.item !== p.i).concat({
        item: p.i, question: its[p.i].clue, given: claves(p).map(k => st.letters[k] || '_').join(''),
        expected: its[p.i].answer, correct, intentos: (st.intentos[w] || 0) + (correct ? 1 : 0),
      });
    };
    const revisar = p => {
      const w = W.indexOf(p);
      if (st.estado[w] || ocupado || !claves(p).every(k => st.letters[k])) return;
      const bien = claves(p).every(k => st.letters[k] === sol[k]);
      if (bien) {
        st.estado[w] = 'ok'; registrar(w, true);
        // Otras palabras que quedaron completas y bien solo por los cruces: también resueltas.
        W.forEach((q, j) => { if (!st.estado[j] && claves(q).every(k => st.letters[k] === sol[k])) { st.estado[j] = 'ok'; registrar(j, true); marcaFin(j, 'bien'); } });
        pintarEstado(); save();
        claves(p).forEach(k => inputs[k].parentElement.classList.add('recien'));
        marcaFin(w, 'bien');
        aviso(true, '¡Correcto!');
        return despues();
      }
      st.intentos[w] = (st.intentos[w] || 0) + 1;
      ocupado = true;
      const celdasP = claves(p).filter(k => !bloqueada(k));
      celdasP.forEach(k => inputs[k].parentElement.classList.add('fallo'));
      marcaFin(w, 'mal');
      if (st.intentos[w] >= 2) {
        // Segundo error: se muestra la palabra (para que nadie se quede atascado) y cuenta como no lograda.
        aviso(false, `La respuesta era: <b>${esc(its[p.i].answer)}</b>`);
        registrar(w, false); // con lo que escribió, antes de mostrar la palabra
        setTimeout(() => {
          celdasP.forEach(k => { st.letters[k] = sol[k]; inputs[k].value = sol[k]; inputs[k].parentElement.classList.remove('fallo'); });
          st.estado[w] = 'revelada';
          ocupado = false; pintarEstado(); save(); despues();
        }, 900);
      } else {
        aviso(false, 'Inténtalo otra vez');
        save();
        setTimeout(() => {
          celdasP.forEach(k => { delete st.letters[k]; inputs[k].value = ''; inputs[k].parentElement.classList.remove('fallo'); });
          root.querySelector(`.cw-empty[data-fin="${w}"] .cw-marca`)?.remove();
          ocupado = false; pintarEstado(); save();
          dir = p.dir; enfocar(inicioDe(p));
        }, 900);
      }
    };
    // Después de resolver (o revelar) una palabra: se "aleja" y pasa a la siguiente, o termina.
    const despues = () => {
      grid.classList.remove('activa');
      if (resueltas() >= total) { cur = null; resaltar(); pista.classList.add('fin'); return setTimeout(terminar, 1100); }
      setTimeout(() => { if (root.isConnected) siguiente(document.activeElement?.closest?.('.cw-grid') != null || matchMedia('(pointer:fine)').matches); }, 900);
    };

    // ---------- Evaluación: comprobar todo al final ----------
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
      st.answers = W.map(p => {
        const given = claves(p).map(k => st.letters[k] || '_').join('');
        const exp = letras(its[p.i].answer);
        return { item: p.i, question: its[p.i].clue, given, expected: its[p.i].answer, correct: given === exp };
      }).sort((a, b) => a.item - b.item);
      st.checked = true; cur = null;
      save();
      Object.values(inputs).forEach(inp => { inp.readOnly = true; inp.blur(); });
      resaltar();
      marcarResultado();
      showFeedback();
    };
    // Casillas bien / mal (con respuestas ocultas no se marca nada).
    const marcarResultado = () => {
      if (hide) return;
      for (const [k, inp] of Object.entries(inputs)) inp.parentElement.classList.add(st.letters[k] === sol[k] ? 'resuelta' : 'fallo');
    };
    const showFeedback = () => {
      const bien = st.answers.filter(a => a.correct).length;
      const fb = el(`<div class="feedback ${hide ? 'neutral' : bien === total ? 'ok' : 'bad'}">
        ${hide ? neutralFb() : `<span>${bien === total ? '¡Crucigrama perfecto!' : `${bien} de ${total} palabras correctas.`}</span>`}
        <button class="btn" type="button" data-next data-fin>${evalMode.fin}</button></div>`);
      fb.querySelector('[data-fin]').onclick = terminar;
      root.querySelector('.fb-slot').replaceChildren(fb);
      fb.querySelector('[data-fin]').focus({ preventScroll: true });
    };

    save(); draw();
    // Al retomar con todo resuelto, se termina.
    if (porPalabra && resueltas() >= total) setTimeout(terminar);
  },
};
