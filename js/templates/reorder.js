// Plantilla Reordenar oraciones: el estudiante ordena las palabras (tocar o arrastrar).
import { evalMode, neutralFb, el, esc, icons, shuffle } from '../ui.js';
import { norm } from './fill.js';

const tokens = s => s.trim().split(/\s+/).filter(Boolean);

function scramble(words) {
  const idx = words.map((_, i) => i);
  if (words.length < 2) return idx;
  for (let t = 0; t < 20; t++) {
    const s = shuffle(idx);
    if (s.map(i => words[i]).join(' ') !== words.join(' ')) return s;
  }
  return idx.reverse();
}

export default {
  type: 'reorder',
  label: 'Reordenar oraciones',
  plural: 'Reordenar oraciones',
  description: 'Escribe la oración correcta; el estudiante ordena las palabras desordenadas.',
  icon: icons.reorder,

  empty: () => ({ items: [{ sentence: '' }] }),
  summary: c => `${c.items.length} oraci${c.items.length === 1 ? 'ón' : 'ones'}`,

  editor(root, content) {
    const items = structuredClone(content.items);
    const draw = () => {
      root.innerHTML = `<p class="hint" style="margin:0 0 12px">Escribe cada oración bien ordenada. Se separa por espacios; la puntuación queda pegada a su palabra.</p>`;
      items.forEach((it, i) => {
        const box = el(`<div class="panel editor-item">
          <div class="row between"><div class="num">Oración ${i + 1}</div>
            <button class="icon-btn" type="button" data-del aria-label="Eliminar oración ${i + 1}" ${items.length === 1 ? 'disabled' : ''}>×</button></div>
          <input data-s placeholder="I have been living here for two years." value="${esc(it.sentence)}" aria-label="Oración ${i + 1}">
          <p class="hint" data-count></p>
        </div>`);
        const count = box.querySelector('[data-count]');
        const upd = () => { const n = tokens(it.sentence).length; count.textContent = n ? `${n} palabra${n === 1 ? '' : 's'}` : ''; };
        upd();
        box.querySelector('[data-s]').oninput = e => { it.sentence = e.target.value; upd(); };
        box.querySelector('[data-del]').onclick = () => { items.splice(i, 1); draw(); };
        root.append(box);
      });
      const add = el(`<button class="btn ghost" type="button" style="margin-top:12px">${icons.plus} Agregar oración</button>`);
      add.onclick = () => { items.push({ sentence: '' }); draw(); root.querySelectorAll('[data-s]')[items.length - 1]?.focus(); };
      root.append(add);
    };
    draw();
    return {
      getContent: () => ({ items: items.map(it => ({ sentence: tokens(it.sentence).join(' ') })) }),
      validate: () => items.flatMap((it, i) => {
        const n = tokens(it.sentence).length;
        if (!n) return [`Oración ${i + 1}: escríbela.`];
        if (n < 3) return [`Oración ${i + 1}: usa al menos 3 palabras.`];
        if (n > 20) return [`Oración ${i + 1}: máximo 20 palabras.`];
        return [];
      }),
    };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const total = content.items.length;
    const fresh = i => ({ placed: [], pool: scramble(tokens(content.items[i].sentence)) });
    const st = saved || { i: 0, ...fresh(0), checked: false, answers: [] };
    const save = () => onProgreso({ ...st, done: st.answers.length, total });

    let slots, pool;

    const draw = () => {
      const words = tokens(content.items[st.i].sentence);
      root.innerHTML = '';
      const wrap = el(`<div>
        <div class="small muted" style="margin-bottom:6px">Oración ${st.i + 1} de ${total} · Toca o arrastra las palabras en orden</div>
        <div class="slots" aria-label="Tu oración"></div>
        <div class="pool" aria-label="Palabras disponibles"></div>
        <div class="fb-slot" role="status" aria-live="polite"><div class="row end" style="margin-top:20px">
          <button class="btn ghost" type="button" data-reset>Reiniciar</button>
          <button class="btn" type="button" data-check>Comprobar</button></div></div>
      </div>`);
      slots = wrap.querySelector('.slots');
      pool = wrap.querySelector('.pool');
      const mk = (wi, where) => {
        const b = el(`<button class="word" type="button">${esc(words[wi])}</button>`);
        b.dataset.wi = wi;
        if (!st.checked) attachDrag(b, where);
        else b.disabled = true;
        return b;
      };
      st.placed.forEach(wi => slots.append(mk(wi, 'placed')));
      st.pool.forEach(wi => pool.append(mk(wi, 'pool')));
      wrap.querySelector('[data-reset]').onclick = () => { st.pool = [...st.placed, ...st.pool]; st.placed = []; save(); draw(); };
      wrap.querySelector('[data-check]').onclick = check;
      root.append(wrap);
      if (st.checked) showFeedback();
    };

    // Tocar: mueve entre zonas. Arrastrar (puntero/táctil): inserta en la posición soltada.
    const attachDrag = (b, where) => {
      b.draggable = false;
      b.addEventListener('dragstart', e => e.preventDefault()); // evita el arrastre nativo que cancela el puntero
      b.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault(); // sin selección de texto ni arrastre nativo
        const sx = e.clientX, sy = e.clientY;
        let ghost = null, marker = null, target = null, index = 0;
        const wi = +b.dataset.wi;

        const move = ev => {
          if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
          if (!ghost) {
            const r = b.getBoundingClientRect();
            ghost = b.cloneNode(true); ghost.classList.add('ghost');
            ghost.style.width = r.width + 'px';
            document.body.append(ghost);
            b.classList.add('dragging');
            marker = el('<i class="drop-marker"></i>');
          }
          ghost.style.left = ev.clientX - ghost.offsetWidth / 2 + 'px';
          ghost.style.top = ev.clientY - ghost.offsetHeight / 2 + 'px';
          const over = document.elementFromPoint(ev.clientX, ev.clientY);
          target = over?.closest('.slots') || over?.closest('.pool') || null;
          marker.remove();
          if (!target) return;
          const kids = [...target.querySelectorAll('.word:not(.dragging)')];
          index = kids.length;
          for (let k = 0; k < kids.length; k++) {
            const r = kids[k].getBoundingClientRect();
            const sameRow = ev.clientY >= r.top - 6 && ev.clientY <= r.bottom + 6;
            if ((sameRow && ev.clientX < r.left + r.width / 2) || ev.clientY < r.top - 6) { index = k; break; }
          }
          target.insertBefore(marker, kids[index] || null);
        };
        const up = ev => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          if (ev.type === 'pointercancel') { ghost?.remove(); marker?.remove(); b.classList.remove('dragging'); return; }
          if (!ghost) { // fue un toque
            if (where === 'pool') { st.pool.splice(st.pool.indexOf(wi), 1); st.placed.push(wi); }
            else { st.placed.splice(st.placed.indexOf(wi), 1); st.pool.push(wi); }
            save(); draw(); return;
          }
          ghost.remove(); marker.remove(); b.classList.remove('dragging');
          if (!target) return;
          const from = where === 'pool' ? st.pool : st.placed;
          from.splice(from.indexOf(wi), 1);
          const to = target.classList.contains('slots') ? st.placed : st.pool;
          to.splice(Math.min(index, to.length), 0, wi);
          save(); draw();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
      // Teclado: Enter/Espacio también mueven (el click sintético no pasa por pointerdown)
      b.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        const wi = +b.dataset.wi;
        if (where === 'pool') { st.pool.splice(st.pool.indexOf(wi), 1); st.placed.push(wi); }
        else { st.placed.splice(st.placed.indexOf(wi), 1); st.pool.push(wi); }
        save(); draw();
        root.querySelector(where === 'pool' ? '.pool .word' : '.slots .word:last-child')?.focus();
      });
    };

    const check = () => {
      const words = tokens(content.items[st.i].sentence);
      if (st.pool.length) {
        const slot = root.querySelector('.fb-slot');
        slot.querySelector('.hint')?.remove();
        slot.prepend(el(`<p class="hint" style="color:var(--danger);text-align:right">Usa todas las palabras.</p>`));
        return;
      }
      const given = st.placed.map(i => words[i]).join(' ');
      st.answers.push({ item: st.i, question: content.items[st.i].sentence, given, correct: norm(given) === norm(words.join(' ')) });
      st.checked = true; save(); draw();
    };

    const showFeedback = () => {
      const a = st.answers.find(x => x.item === st.i);
      const hide = evalMode.hide;
      if (!hide) slots.classList.add(a.correct ? 'ok' : 'bad');
      const last = st.i === total - 1;
      const fb = el(`<div class="feedback ${hide ? 'neutral' : a.correct ? 'ok' : 'bad'}">
        ${hide ? neutralFb() : `<span>${a.correct ? '¡Perfecto!' : `Correcta: <b>${esc(content.items[st.i].sentence)}</b>`}</span>`}
        <button class="btn" type="button">${last ? 'Ver resultado' : 'Siguiente'}</button></div>`);
      fb.querySelector('button').onclick = next;
      root.querySelector('.fb-slot').replaceChildren(fb);
      fb.querySelector('button').focus({ preventScroll: true });
    };

    const next = () => {
      if (st.i < total - 1) { st.i++; Object.assign(st, fresh(st.i), { checked: false }); save(); draw(); return; }
      onTerminar({ score: st.answers.filter(a => a.correct).length, maxScore: total, answers: st.answers });
    };

    save();
    draw();
  },
};
