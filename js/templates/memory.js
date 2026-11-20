// Plantilla Memoria: voltear cartas imagen ↔ palabra (3 a 8 pares).
import { el, esc, icons, shuffle, compressImage, toast } from '../ui.js';
import { safeSrc, elegirImagen, buscadorDisponible, ICONO_BUSCAR } from '../imagenes.js';

const MIN = 3, MAX = 8;

export default {
  type: 'memory',
  label: 'Memoria',
  plural: 'Memorias',
  description: 'Cartas para voltear: cada imagen con su palabra (3 a 8 pares).',
  icon: icons.memory,

  empty: () => ({ pairs: Array.from({ length: MIN }, () => ({ word: '', image: '' })) }),
  summary: c => `${c.pairs.length} pares`,

  editor(root, content) {
    const pairs = structuredClone(content.pairs);
    let buscador = false; // botón "Buscar imagen en internet" (solo si el servidor lo ofrece)
    buscadorDisponible().then(ok => { if (ok && root.isConnected) { buscador = true; draw(); } });
    const draw = () => {
      root.innerHTML = `<p class="hint" style="margin:0 0 12px">Adjunta una imagen y escribe su palabra. Entre ${MIN} y ${MAX} pares. Las imágenes se reducen a 400 px.</p>`;
      pairs.forEach((p, i) => {
        const box = el(`<div class="panel editor-item">
          <div class="pair-row">
            <label class="img-drop" title="Elegir imagen" tabindex="0">
              ${p.image ? `<img src="${safeSrc(p.image)}" alt="Imagen del par ${i + 1}">` : 'Toca para<br>adjuntar imagen'}
              <input type="file" accept="image/*" hidden aria-label="Imagen del par ${i + 1}">
            </label>
            <div class="grow">
              <div class="num">Par ${i + 1}</div>
              <input data-w placeholder="Palabra (ej. apple)" value="${esc(p.word)}" aria-label="Palabra del par ${i + 1}" maxlength="24">
              ${buscador ? `<button class="btn ghost sm img-buscar-btn" type="button" data-buscar>${ICONO_BUSCAR} Buscar imagen en internet</button>` : ''}
              ${p.credit ? `<div class="img-credito" title="${esc(p.credit)}">Imagen: ${esc(p.credit)}</div>` : ''}
            </div>
            <button class="icon-btn" type="button" data-del aria-label="Eliminar par ${i + 1}" ${pairs.length <= MIN ? 'disabled' : ''}>×</button>
          </div></div>`);
        const drop = box.querySelector('.img-drop');
        const file = box.querySelector('input[type=file]');
        drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } };
        const take = async f => {
          if (!f) return;
          try { p.image = await compressImage(f); delete p.credit; draw(); }
          catch (err) { toast(err.message, 'err'); }
        };
        file.onchange = () => take(file.files[0]);
        drop.ondragover = e => { e.preventDefault(); };
        drop.ondrop = e => { e.preventDefault(); take(e.dataTransfer.files[0]); };
        box.querySelector('[data-w]').oninput = e => { p.word = e.target.value; };
        box.querySelector('[data-buscar]')?.addEventListener('click', async () => {
          const r = await elegirImagen(p.word.trim());
          if (r) { p.image = r.image; p.credit = r.credit; draw(); }
        });
        box.querySelector('[data-del]').onclick = () => { pairs.splice(i, 1); draw(); };
        root.append(box);
      });
      const add = el(`<button class="btn ghost" type="button" style="margin-top:12px" ${pairs.length >= MAX ? 'disabled' : ''}>${icons.plus} Agregar par</button>`);
      add.onclick = () => { pairs.push({ word: '', image: '' }); draw(); };
      root.append(add);
    };
    draw();
    return {
      getContent: () => ({ pairs: pairs.map(p => ({ word: p.word.trim(), image: p.image, ...(p.credit ? { credit: p.credit } : {}) })) }),
      validate() {
        const errs = [];
        if (pairs.length < MIN || pairs.length > MAX) errs.push(`Usa entre ${MIN} y ${MAX} pares.`);
        pairs.forEach((p, i) => {
          if (!p.image) errs.push(`Par ${i + 1}: adjunta una imagen.`);
          if (!p.word.trim()) errs.push(`Par ${i + 1}: escribe la palabra.`);
        });
        const words = pairs.map(p => p.word.trim().toLowerCase()).filter(Boolean);
        if (new Set(words).size !== words.length) errs.push('Hay palabras repetidas.');
        return errs;
      },
    };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const n = content.pairs.length;
    const st = saved || {
      deck: shuffle(content.pairs.flatMap((_, p) => [{ p, k: 'img' }, { p, k: 'word' }])),
      matched: [], misses: 0, missesByPair: Array(n).fill(0),
    };
    const save = () => onProgreso({ ...st, done: st.matched.length, total: n });
    let open = []; let busy = false;

    root.innerHTML = '';
    const wrap = el(`<div>
      <div class="row between small muted" style="margin-bottom:12px"><span>Encuentra cada imagen con su palabra</span><span data-stat></span></div>
      <div class="mem-grid"></div>
    </div>`);
    const grid = wrap.querySelector('.mem-grid');
    const stat = wrap.querySelector('[data-stat]');
    const upd = () => { stat.textContent = `Pares: ${st.matched.length}/${n} · Errores: ${st.misses}`; };

    const cards = st.deck.map((c, idx) => {
      const pair = content.pairs[c.p];
      const front = c.k === 'img' ? `<img src="${safeSrc(pair.image)}" alt="${esc(pair.word)}" draggable="false">` : `<span>${esc(pair.word)}</span>`;
      const b = el(`<button class="mem-card" type="button" aria-label="Carta ${idx + 1}">
        <span class="inner"><span class="face back">?</span><span class="face front">${front}</span></span></button>`);
      if (st.matched.includes(c.p)) { b.classList.add('matched'); b.disabled = true; b.setAttribute('aria-label', `${pair.word} (encontrada)`); }
      b.onclick = () => flip(idx);
      grid.append(b);
      return b;
    });

    const flip = idx => {
      if (busy || open.includes(idx) || st.matched.includes(st.deck[idx].p)) return;
      cards[idx].classList.add('up');
      open.push(idx);
      if (open.length < 2) return;
      const [a, b] = open.map(i => st.deck[i]);
      if (a.p === b.p && a.k !== b.k) {
        st.matched.push(a.p);
        open.forEach(i => { cards[i].classList.remove('up'); cards[i].classList.add('matched'); cards[i].disabled = true; });
        open = []; upd(); save();
        if (st.matched.length === n) setTimeout(finish, 700);
      } else {
        st.misses++;
        st.missesByPair[a.p]++; if (b.p !== a.p) st.missesByPair[b.p]++;
        busy = true; upd(); save();
        open.forEach(i => cards[i].classList.add('miss'));
        setTimeout(() => {
          open.forEach(i => cards[i].classList.remove('up', 'miss'));
          open = []; busy = false;
        }, 950);
      }
    };

    // Puntaje: n pares. Se permiten n errores "gratis" (es normal explorar); cada error extra resta 1 punto.
    const finish = () => {
      const score = Math.max(0, n - Math.max(0, st.misses - n));
      const answers = content.pairs.map((p, i) => ({ item: i, question: p.word, misses: st.missesByPair[i], correct: st.missesByPair[i] === 0 }));
      onTerminar({ score, maxScore: n, answers, extra: { misses: st.misses } });
    };

    root.append(wrap);
    upd(); save();
    if (st.matched.length === n) setTimeout(finish, 300);
  },
};
