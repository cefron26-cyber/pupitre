// Plantilla Ahorcado: adivinar la palabra letra por letra (teclado en pantalla o físico) con una pista.
// Cada palabra adivinada vale 1 punto; se pierde al completar el dibujo (vidas = errores permitidos).
import { evalMode, neutralFb, el, esc, icons } from '../ui.js';
import { letras } from './wordsearch.js';

const MIN = 1, MAX = 15, LARGO = 24;
const FILAS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const valida = s => /^[\p{L}\s'-]+$/u.test(s.trim());
const base = ch => letras(ch); // "é" → "E"; espacio/guion → ""

// Dibujo en partes: se muestran tantas como errores, repartidas según las vidas.
const PARTES = [
  '<path d="M14 112h66" class="hm-base"/>', '<path d="M30 112V10" class="hm-base"/>', '<path d="M30 10h52" class="hm-base"/>',
  '<path d="M82 10v14" class="hm-base"/>', '<circle cx="82" cy="34" r="10"/>', '<path d="M82 44v30"/>',
  '<path d="M82 52l-14 12"/>', '<path d="M82 52l14 12"/>', '<path d="M82 74l-12 18"/>', '<path d="M82 74l12 18"/>',
];
function dibujo(errores, vidas) {
  // Con menos de 10 vidas, el andamio arranca dibujado y cada error suma una parte de la figura.
  const visibles = Math.max(0, PARTES.length - vidas) + errores;
  return `<svg viewBox="0 0 110 120" class="hm-svg" aria-hidden="true">${PARTES.map((p, k) => k < visibles ? p : '').join('')}</svg>`;
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

    const palabraHTML = (revelar = false) => [...item().word].map(ch => {
      const b = base(ch);
      if (!b) return ch === ' ' ? '<span class="hm-gap"></span>' : `<span class="hm-sym">${esc(ch)}</span>`;
      const visto = st.guessed.includes(b);
      return `<span class="hm-slot ${visto ? 'shown' : revelar ? 'reveal' : ''}">${visto || revelar ? esc(ch.toUpperCase()) : ''}</span>`;
    }).join('');

    const draw = () => {
      root.innerHTML = '';
      const hint = (item().hint || '').trim();
      const wrap = el(`<div class="hm">
        <div class="small muted" style="margin-bottom:12px">Palabra ${st.i + 1} de ${total} · Toca las letras o usa el teclado</div>
        ${hint ? `<p class="q-title hm-hint">${esc(hint)}</p>` : ''}
        <div class="hm-play">
          <div class="hm-fig">${dibujo(errores(), vidas)}<div class="hm-lives" data-lives></div></div>
          <div class="hm-word" data-word aria-live="polite"></div>
        </div>
        <div class="hm-keys" aria-label="Teclado">${FILAS.map(f => `<div class="hm-row">${[...f].map(l => `<button class="hm-key" type="button" data-l="${l}" aria-label="Letra ${l}">${l}</button>`).join('')}</div>`).join('')}</div>
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
      ui.fig.querySelector('svg').outerHTML = dibujo(errores(), vidas);
      const quedan = vidas - errores();
      ui.lives.textContent = `${'♥'.repeat(Math.max(0, quedan))}${'♡'.repeat(Math.min(vidas, errores()))}`;
      ui.lives.setAttribute('aria-label', `Te quedan ${quedan} intentos`);
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
        <button class="btn" type="button">${last ? 'Ver resultado' : 'Siguiente'}</button></div>`);
      fb.querySelector('button').onclick = next;
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
