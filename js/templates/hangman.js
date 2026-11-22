// Plantilla Ahorcado: adivinar la palabra letra por letra (teclado en pantalla o físico) con una pista.
// Cada palabra adivinada vale 1 punto; se pierde al completar el dibujo (vidas = errores permitidos).
import { evalMode, neutralFb, el, esc, icons } from '../ui.js';
import { letras } from './wordsearch.js';

const MIN = 1, MAX = 15, LARGO = 24;
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // en rejilla A–Z, como WordWall
const MARCA = '<svg class="hm-marca" viewBox="0 0 100 100" aria-hidden="true"><path d="M18 52 L42 76 L84 22" pathLength="1"/></svg>';
const valida = s => /^[\p{L}\s'-]+$/u.test(s.trim());
const base = ch => letras(ch); // "é" → "E"; espacio/guion → ""

// Dibujo en 10 partes (escena con pasto, horca de madera y un personaje con cara). Se arma una sola vez;
// cada error enciende la parte siguiente (solo esa se anima) y la cara cambia según lo cerca que está de perder.
const MADERA = 'fill="#c58b4f" stroke="#6b4423" stroke-width="3" stroke-linejoin="round"';
const PIEL = '#ffd3ad', TINTA = '#3a2a20', CAMISA = 'var(--hm-camisa, #4f7cff)', PANTALON = '#34405a';
const PARTES = [
  `<ellipse cx="100" cy="190" rx="94" ry="13" fill="#86cf63"/><path d="M18 186q5-9 9 0M58 189q4-7 8 0M156 185q5-9 9 0M176 189q3-6 6 0" stroke="#4e9a35" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  `<rect x="20" y="176" width="46" height="13" rx="4" ${MADERA}/><rect x="36" y="22" width="14" height="158" rx="3" ${MADERA}/><path d="M43 40v120" stroke="#a36f3c" stroke-width="2" stroke-dasharray="10 14"/>`,
  `<rect x="30" y="16" width="118" height="14" rx="3" ${MADERA}/><circle cx="43" cy="23" r="2.5" fill="#6b4423"/>`,
  `<path d="M50 64L84 30" stroke="#6b4423" stroke-width="12" stroke-linecap="round"/><path d="M50 64L84 30" stroke="#c58b4f" stroke-width="6" stroke-linecap="round"/><path d="M132 30v22" stroke="#b08850" stroke-width="4" stroke-linecap="round"/><path d="M132 30v22" stroke="#e2c48e" stroke-width="2" stroke-dasharray="3 3"/>`,
  `<circle cx="132" cy="70" r="17" fill="${PIEL}" stroke="${TINTA}" stroke-width="3"/><path d="M116 66q4-16 16-17 13 0 17 15-8-7-17-6-9 0-16 8z" fill="#5a3a22"/><circle cx="125.5" cy="71" r="2.4" fill="${TINTA}"/><circle cx="138.5" cy="71" r="2.4" fill="${TINTA}"/><circle cx="121" cy="77" r="3" fill="#ff9d9d" opacity=".7"/><circle cx="143" cy="77" r="3" fill="#ff9d9d" opacity=".7"/><path data-boca d="M126 78q6 5 12 0" stroke="${TINTA}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  `<rect x="119" y="88" width="26" height="40" rx="10" fill="${CAMISA}" stroke="${TINTA}" stroke-width="3"/><path d="M127 89l5 7 5-7" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>`,
  `<path d="M121 96l-16 20" stroke="${TINTA}" stroke-width="10" stroke-linecap="round"/><path d="M121 96l-16 20" stroke="${CAMISA}" stroke-width="5" stroke-linecap="round"/><circle cx="104" cy="118" r="4.5" fill="${PIEL}" stroke="${TINTA}" stroke-width="2.5"/>`,
  `<path d="M143 96l16 20" stroke="${TINTA}" stroke-width="10" stroke-linecap="round"/><path d="M143 96l16 20" stroke="${CAMISA}" stroke-width="5" stroke-linecap="round"/><circle cx="160" cy="118" r="4.5" fill="${PIEL}" stroke="${TINTA}" stroke-width="2.5"/>`,
  `<path d="M126 126l-6 30" stroke="${TINTA}" stroke-width="11" stroke-linecap="round"/><path d="M126 126l-6 30" stroke="${PANTALON}" stroke-width="6" stroke-linecap="round"/><ellipse cx="116" cy="159" rx="8" ry="4.5" fill="${TINTA}"/>`,
  `<path d="M138 126l6 30" stroke="${TINTA}" stroke-width="11" stroke-linecap="round"/><path d="M138 126l6 30" stroke="${PANTALON}" stroke-width="6" stroke-linecap="round"/><ellipse cx="148" cy="159" rx="8" ry="4.5" fill="${TINTA}"/>`,
];
// Orden de pintado: el cuerpo va detrás de la cabeza y de los brazos.
const CAPAS = [0, 1, 2, 3, 5, 8, 9, 6, 7, 4];
const BOCAS = { feliz: 'M126 78q6 5 12 0', serio: 'M126 79.5h12', preocupado: 'M126 81q6-5 12 0', triste: 'M125 83q7-8 14 0' };
const visiblesDe = (errores, vidas) => Math.max(0, PARTES.length - vidas) + errores; // con menos de 10 vidas el andamio ya está
function dibujo(errores, vidas) {
  const vis = visiblesDe(errores, vidas);
  return `<svg viewBox="0 0 200 205" class="hm-svg" aria-hidden="true">${CAPAS.map(k => `<g class="hm-p ${k < vis ? 'on' : ''}" data-p="${k}">${PARTES[k]}</g>`).join('')}</svg>`;
}

export default {
  type: 'hangman',
  label: 'Ahorcado',
  plural: 'Ahorcados',
  description: 'Adivina la palabra letra por letra con una pista.',
  icon: icons.hangman,

  empty: () => ({ items: [{ word: '', hint: '' }], lives: 6 }),
  summary: c => `${c.items.length} palabra${c.items.length === 1 ? '' : 's'} · ${c.lives ?? 6} vidas`,

  editor(root, content) {
    const items = structuredClone(content.items);
    let lives = content.lives ?? 6;
    const draw = () => {
      root.innerHTML = `<p class="hint" style="margin:0 0 12px">Escribe cada palabra (o frase corta) y una pista: una definición sencilla, la traducción o una oración con hueco.</p>
        <div class="field" style="max-width:260px"><label for="hm-lives">Errores permitidos</label>
          <select id="hm-lives">${[4, 5, 6, 7, 8].map(v => `<option value="${v}" ${v === lives ? 'selected' : ''}>${v}${v === 6 ? ' (normal)' : v < 6 ? ' (difícil)' : ' (fácil)'}</option>`).join('')}</select></div>`;
      root.querySelector('#hm-lives').onchange = e => { lives = +e.target.value; };
      items.forEach((it, i) => {
        const box = el(`<div class="panel editor-item">
          <div class="row between"><div class="num">Palabra ${i + 1}</div>
            <button class="icon-btn" type="button" data-del aria-label="Eliminar palabra ${i + 1}" ${items.length === 1 ? 'disabled' : ''}>×</button></div>
          <input data-w placeholder="elephant" value="${esc(it.word)}" aria-label="Palabra ${i + 1}" maxlength="${LARGO}">
          <input data-h placeholder="Pista: A very big grey animal with a trunk." value="${esc(it.hint || '')}" aria-label="Pista de la palabra ${i + 1}" maxlength="140" style="margin-top:8px">
        </div>`);
        box.querySelector('[data-w]').oninput = e => { it.word = e.target.value; };
        box.querySelector('[data-h]').oninput = e => { it.hint = e.target.value; };
        box.querySelector('[data-del]').onclick = () => { items.splice(i, 1); draw(); };
        root.append(box);
      });
      const add = el(`<button class="btn ghost" type="button" style="margin-top:12px" ${items.length >= MAX ? 'disabled' : ''}>${icons.plus} Agregar palabra</button>`);
      add.onclick = () => { items.push({ word: '', hint: '' }); draw(); root.querySelectorAll('[data-w]')[items.length - 1]?.focus(); };
      root.append(add);
    };
    draw();
    return {
      getContent: () => ({ items: items.map(it => ({ word: it.word.trim().replace(/\s+/g, ' '), hint: (it.hint || '').trim() })), lives }),
      validate() {
        const errs = [];
        if (items.length < MIN || items.length > MAX) errs.push(`Usa entre ${MIN} y ${MAX} palabras.`);
        items.forEach((it, i) => {
          const w = it.word.trim();
          if (!w) errs.push(`Palabra ${i + 1}: escríbela.`);
          else if (!valida(w)) errs.push(`Palabra ${i + 1}: solo letras, espacios, guiones o apóstrofo.`);
          else if (letras(w).length < 2) errs.push(`Palabra ${i + 1}: muy corta.`);
        });
        const ks = items.map(it => letras(it.word)).filter(Boolean);
        if (new Set(ks).size !== ks.length) errs.push('Hay palabras repetidas.');
        return errs;
      },
    };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const total = content.items.length;
    const vidas = content.lives ?? 6;
    const st = saved || { i: 0, guessed: [], over: false, answers: [] };
    const save = () => onProgreso({ ...st, done: st.answers.length, total });
    const hide = () => evalMode.hide;

    let ui = null;
    const item = () => content.items[st.i];
    const objetivo = () => new Set([...letras(item().word)]);
    const errores = () => st.guessed.filter(l => !objetivo().has(l)).length;
    const gano = () => [...objetivo()].every(l => st.guessed.includes(l));

    // Cada palabra va en un bloque que no se parte: una frase solo baja de línea entre palabras.
    const palabraHTML = (revelar = false) => item().word.split(' ').map(pal => `<span class="hm-palabra">${[...pal].map(ch => {
      const b = base(ch);
      if (!b) return `<span class="hm-sym">${esc(ch)}</span>`;
      const visto = st.guessed.includes(b);
      return `<span class="hm-slot ${visto ? 'shown' : revelar ? 'reveal' : ''}">${visto || revelar ? esc(ch.toUpperCase()) : ''}</span>`;
    }).join('')}</span>`).join('');

    const draw = () => {
      root.innerHTML = '';
      const hint = (item().hint || '').trim();
      const wrap = el(`<div class="hm">
        <div class="small muted" style="margin-bottom:12px">Palabra ${st.i + 1} de ${total} · Toca las letras o usa el teclado</div>
        <div class="hm-play">
          <div class="hm-fig">${dibujo(errores(), vidas)}</div>
          <div class="hm-side">
            <p class="hm-hint">${hint ? esc(hint) : '&nbsp;'}</p>
            <div class="hm-word" data-word aria-live="polite"></div>
            <div class="hm-lives" data-lives></div>
          </div>
          <div class="hm-keys" aria-label="Teclado">${[...ABC].map(l => `<button class="hm-key" type="button" data-l="${l}" aria-label="Letra ${l}">${l}</button>`).join('')}</div>
        </div>
        <div class="fb-slot" role="status" aria-live="polite"></div>
      </div>`);
      ui = { wrap, word: wrap.querySelector('[data-word]'), fig: wrap.querySelector('.hm-fig'), lives: wrap.querySelector('[data-lives]') };
      wrap.querySelectorAll('.hm-key').forEach(k => {
        const l = k.dataset.l;
        if (st.guessed.includes(l)) { k.disabled = true; k.classList.add(objetivo().has(l) ? 'k-ok' : 'k-bad'); }
        if (st.over) k.disabled = true;
        k.onclick = () => adivinar(l);
      });
      root.append(wrap);
      pintar();
      if (st.over) showFeedback();
    };

    const pintar = () => {
      ui.word.innerHTML = palabraHTML(st.over && !hide());
      // Solo se enciende lo nuevo: lo ya dibujado no vuelve a animarse.
      const err = errores(), vis = visiblesDe(err, vidas), quedan = Math.max(0, vidas - err);
      ui.fig.querySelectorAll('.hm-p').forEach(g => g.classList.toggle('on', +g.dataset.p < vis));
      const cara = st.over && !gano() ? 'triste' : st.over ? 'feliz' : quedan <= 1 ? 'preocupado' : quedan <= vidas / 2 ? 'serio' : 'feliz';
      ui.fig.querySelector('[data-boca]')?.setAttribute('d', BOCAS[cara]);
      ui.lives.innerHTML = Array.from({ length: vidas }, (_, k) => `<i class="${k < quedan ? 'on' : ''}"></i>`).join('');
      ui.lives.setAttribute('aria-label', `Te quedan ${quedan} intentos`);
      ui.lives.setAttribute('role', 'img');
    };

    const adivinar = l => {
      if (st.over || st.guessed.includes(l)) return;
      st.guessed.push(l);
      const key = ui.wrap.querySelector(`[data-l="${l}"]`);
      const bien = objetivo().has(l);
      if (key) { key.disabled = true; key.classList.add(bien ? 'ok' : 'bad'); }
      if (gano() || errores() >= vidas) cerrar();
      save(); pintar();
      if (st.over) showFeedback();
    };

    const cerrar = () => {
      st.over = true;
      const w = item().word;
      st.answers.push({
        item: st.i, question: (item().hint || '').trim(), expected: w,
        given: [...w].map(ch => (!base(ch) || st.guessed.includes(base(ch)) ? ch : '_')).join(''),
        correct: gano(), errors: errores(),
      });
      ui.wrap.querySelectorAll('.hm-key').forEach(k => { k.disabled = true; });
    };

    const showFeedback = () => {
      const a = st.answers.find(x => x.item === st.i);
      const last = st.i === total - 1;
      const fb = el(`<div class="feedback ${hide() ? 'neutral' : a.correct ? 'ok' : 'bad'}">
        ${hide() ? neutralFb() : `<span>${a.correct ? '¡Adivinaste!' : `La palabra era: <b>${esc(item().word)}</b>`}</span>`}
        <button class="btn" type="button">${last ? evalMode.fin : 'Siguiente'}</button></div>`);
      fb.querySelector('button').onclick = next;
      // Momento propio al terminar la palabra: palomita grande que entra (ganó) o acercamiento al dibujo (perdió).
      if (!hide()) {
        ui.wrap.classList.add(a.correct ? 'gano' : 'perdio');
        if (a.correct && !ui.wrap.querySelector('.hm-marca')) ui.wrap.querySelector('.hm-play').insertAdjacentHTML('beforeend', MARCA);
      }
      ui.wrap.querySelector('.fb-slot').replaceChildren(fb);
      fb.querySelector('button').focus({ preventScroll: true });
    };

    const next = () => {
      if (st.i < total - 1) { st.i++; st.guessed = []; st.over = false; save(); draw(); return; }
      onTerminar({ score: st.answers.filter(a => a.correct).length, maxScore: total, answers: st.answers });
    };

    // Teclado físico (solo mientras la actividad está en pantalla).
    const onKey = e => {
      if (!root.isConnected || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      const l = base(e.key.length === 1 ? e.key : '');
      if (l.length === 1 && !st.over) { e.preventDefault(); adivinar(l); }
    };
    document.addEventListener('keydown', onKey);

    save(); draw();
    return { destroy: () => document.removeEventListener('keydown', onKey) };
  },
};
