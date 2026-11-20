// Plantilla Emparejar: une cada elemento de la izquierda con su pareja de la derecha (palabra ↔ significado, pregunta ↔ respuesta…).
// Pareja: { left, right, image?, credit? }. Con imagen, la izquierda muestra la imagen (y el texto, si lo hay).
import { el, esc, icons, shuffle, compressImage, toast } from '../ui.js';
import { safeSrc, elegirImagen, buscadorDisponible, ICONO_BUSCAR } from '../imagenes.js';

const MIN = 3, MAX = 10;
const ICONO_IMG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>';
// Pareja solo con imagen: en los resultados la pregunta queda vacía (el repaso y los retos, que son de texto, la saltan).

export default {
  type: 'matching',
  label: 'Emparejar',
  plural: 'Emparejar',
  description: 'Une cada palabra con su pareja: traducción, definición, antónimo, respuesta…',
  icon: icons.matching,

  empty: () => ({ pairs: Array.from({ length: MIN }, () => ({ left: '', right: '' })) }),
  summary: c => `${c.pairs.length} parejas`,

  editor(root, content) {
    const pairs = structuredClone(content.pairs);
    let buscador = false; // "Buscar imagen en internet" (servidor propio u Openverse)
    buscadorDisponible().then(ok => { if (ok && root.isConnected) { buscador = true; draw(); } });
    const draw = () => {
      root.innerHTML = `<p class="hint" style="margin:0 0 12px">Escribe cada pareja. Al estudiante se le mostrarán las dos columnas desordenadas. Entre ${MIN} y ${MAX} parejas.
        Si quieres, pon una imagen a la izquierda (imagen ↔ palabra); con imagen, el texto de la izquierda es opcional.</p>`;
      pairs.forEach((p, i) => {
        const box = el(`<div class="panel editor-item"><div class="pair-row">
          <span class="num" style="margin:0;min-width:24px">${i + 1}</span>
          <div class="match-img-ed">
            <label class="img-drop sm" title="${p.image ? 'Cambiar imagen (subir desde el equipo)' : 'Subir imagen desde el equipo'}" tabindex="0">
              ${p.image ? `<img src="${safeSrc(p.image)}" alt="Imagen de la pareja ${i + 1}">` : ICONO_IMG}
              <input type="file" accept="image/*" hidden aria-label="Imagen de la pareja ${i + 1}">
            </label>
            ${buscador ? `<button class="icon-btn" type="button" data-buscar title="Buscar imagen en internet" aria-label="Buscar imagen en internet para la pareja ${i + 1}">${ICONO_BUSCAR}</button>` : ''}
            ${p.image ? `<button class="icon-btn" type="button" data-quitar title="Quitar imagen" aria-label="Quitar imagen de la pareja ${i + 1}">×</button>` : ''}
          </div>
          <input class="grow" data-l placeholder="${p.image ? 'Texto (opcional)' : 'Ej. happy'}" value="${esc(p.left)}" aria-label="Izquierda ${i + 1}" style="flex:1 1 140px">
          <span class="muted" aria-hidden="true">↔</span>
          <input class="grow" data-r placeholder="Ej. feliz" value="${esc(p.right)}" aria-label="Derecha ${i + 1}" style="flex:1 1 140px">
          <button class="icon-btn" type="button" data-del aria-label="Eliminar pareja ${i + 1}" ${pairs.length <= MIN ? 'disabled' : ''}>×</button>
        </div>${p.credit ? `<div class="img-credito" title="${esc(p.credit)}">Imagen: ${esc(p.credit)}</div>` : ''}</div>`);
        const drop = box.querySelector('.img-drop'), file = box.querySelector('input[type=file]');
        const take = async f => {
          if (!f) return;
          try { p.image = await compressImage(f); delete p.credit; draw(); } catch (err) { toast(err.message, 'err'); }
        };
        drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } };
        file.onchange = () => take(file.files[0]);
        drop.ondragover = e => e.preventDefault();
        drop.ondrop = e => { e.preventDefault(); take(e.dataTransfer.files[0]); };
        box.querySelector('[data-buscar]')?.addEventListener('click', async () => {
          // Se busca con el texto de la pareja (izquierda o, si está vacía, derecha).
          const r = await elegirImagen((p.left || p.right).trim());
          if (r) { p.image = r.image; p.credit = r.credit; draw(); }
        });
        box.querySelector('[data-quitar]')?.addEventListener('click', () => { delete p.image; delete p.credit; draw(); });
        box.querySelector('[data-l]').oninput = e => { p.left = e.target.value; };
        box.querySelector('[data-r]').oninput = e => { p.right = e.target.value; };
        box.querySelector('[data-del]').onclick = () => { pairs.splice(i, 1); draw(); };
        root.append(box);
      });
      const add = el(`<button class="btn ghost" type="button" style="margin-top:12px" ${pairs.length >= MAX ? 'disabled' : ''}>${icons.plus} Agregar pareja</button>`);
      add.onclick = () => { pairs.push({ left: '', right: '' }); draw(); root.querySelectorAll('[data-l]')[pairs.length - 1]?.focus(); };
      root.append(add);
    };
    draw();
    return {
      getContent: () => ({ pairs: pairs.map(p => ({ left: p.left.trim(), right: p.right.trim(),
        ...(p.image ? { image: p.image } : {}), ...(p.image && p.credit ? { credit: p.credit } : {}) })) }),
      validate() {
        const errs = [];
        if (pairs.length < MIN) errs.push(`Usa al menos ${MIN} parejas.`);
        if (pairs.length > MAX) errs.push(`Usa como máximo ${MAX} parejas.`);
        pairs.forEach((p, i) => { if ((!p.left.trim() && !p.image) || !p.right.trim()) errs.push(`Pareja ${i + 1}: completa los dos lados.`); });
        const l = pairs.map(p => p.left.trim().toLowerCase()).filter(Boolean), r = pairs.map(p => p.right.trim().toLowerCase()).filter(Boolean);
        if (new Set(l).size !== l.length || new Set(r).size !== r.length) errs.push('Hay elementos repetidos en una columna.');
        return errs;
      },
    };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const n = content.pairs.length;
    const st = saved || { lefts: shuffle([...Array(n).keys()]), rights: shuffle([...Array(n).keys()]), matched: [], misses: Array(n).fill(0) };
    const save = () => onProgreso({ ...st, done: st.matched.length, total: n });
    let sel = null; // { side, idx }
    let busy = false;

    root.innerHTML = '';
    const wrap = el(`<div>
      <div class="small muted" style="margin-bottom:12px">Toca un elemento de cada columna para unirlos.</div>
      <div class="match-grid"><div class="match-col" data-side="l"></div><div class="match-col" data-side="r"></div></div>
    </div>`);
    const btns = { l: [], r: [] };
    const mk = (side, idx) => {
      const p = content.pairs[idx];
      const img = side === 'l' && safeSrc(p.image);
      const b = el(img
        ? `<button class="match-item con-img" type="button"><img src="${img}" alt="${esc(p.left || 'Imagen')}" draggable="false">${p.left ? `<span>${esc(p.left)}</span>` : ''}</button>`
        : `<button class="match-item" type="button">${esc(side === 'l' ? p.left : p.right)}</button>`);
      if (st.matched.includes(idx)) { b.classList.add('matched'); b.disabled = true; }
      b.onclick = () => tap(side, idx, b);
      btns[side][idx] = b;
      return b;
    };
    st.lefts.forEach(i => wrap.querySelector('[data-side=l]').append(mk('l', i)));
    st.rights.forEach(i => wrap.querySelector('[data-side=r]').append(mk('r', i)));
    root.append(wrap);

    const tap = (side, idx, b) => {
      if (busy || st.matched.includes(idx)) return;
      if (!sel || sel.side === side) {
        if (sel) btns[sel.side][sel.idx].classList.remove('selected');
        sel = sel && sel.side === side && sel.idx === idx ? null : { side, idx };
        if (sel) b.classList.add('selected');
        return;
      }
      const other = btns[sel.side][sel.idx];
      const leftIdx = side === 'l' ? idx : sel.idx;
      if (sel.idx === idx) {
        st.matched.push(idx);
        [b, other].forEach(x => { x.classList.remove('selected'); x.classList.add('matched'); x.disabled = true; });
        sel = null; save();
        if (st.matched.length === n) setTimeout(finish, 500);
      } else {
        st.misses[leftIdx]++;
        busy = true; save();
        [b, other].forEach(x => x.classList.add('wrong'));
        setTimeout(() => { [b, other].forEach(x => x.classList.remove('wrong', 'selected')); sel = null; busy = false; }, 700);
      }
    };

    // Puntaje: un punto por pareja unida sin errores.
    const finish = () => {
      const answers = content.pairs.map((p, i) => ({ item: i, question: p.left, expected: p.right, misses: st.misses[i], correct: st.misses[i] === 0 }));
      onTerminar({ score: answers.filter(a => a.correct).length, maxScore: n, answers });
    };
    save();
    if (st.matched.length === n) setTimeout(finish, 300);
  },
};
