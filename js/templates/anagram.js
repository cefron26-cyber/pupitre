// Plantilla Anagrama (como la de WordWall): las letras de la palabra salen desordenadas arriba y abajo hay una casilla
// por letra. Se toca una letra (o se arrastra a una casilla) y va a la siguiente casilla libre: si es la que toca queda
// puesta en verde; si no, la casilla marca ✗ y la letra vuelve. En una evaluación (respuestas ocultas) no se corrige
// letra por letra: se llenan las casillas (tocar una casilla devuelve su letra) y se califica al completar la palabra.
// Ítem: { word, hint?, image?, credit? }. Una palabra cuenta como bien si se armó sin errores.
import { evalMode, neutralFb, el, esc, icons, shuffle, compressImage, toast } from '../ui.js';
import { safeSrc, elegirImagen, buscadorDisponible, ICONO_BUSCAR } from '../imagenes.js';
import { letras } from './wordsearch.js';

const MIN = 1, MAX = 20, LARGO = 16;
const valida = s => /^[\p{L}\s'-]+$/u.test(s.trim());
const base = ch => letras(ch); // "é" → "E"; espacio/guion/apóstrofo → ""
const ICONO_IMG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>';

// Letras desordenadas: nunca en el orden correcto (si se puede).
function desordenar(chars) {
  const idx = chars.map((_, k) => k);
  const palabra = chars.map(base).join('');
  if (new Set(chars.map(base)).size < 2) return idx;
  for (let t = 0; t < 30; t++) {
    const o = shuffle([...idx]);
    if (o.map(k => base(chars[k])).join('') !== palabra) return o;
  }
  return idx.reverse();
}

export default {
  type: 'anagram',
  label: 'Anagrama',
  plural: 'Anagramas',
  description: 'Ordena las letras para armar la palabra.',
  icon: icons.anagram,

  empty: () => ({ items: [{ word: '', hint: '' }] }),
  summary: c => `${c.items.length} palabra${c.items.length === 1 ? '' : 's'}`,

  editor(root, content) {
    const items = structuredClone(content.items);
    let buscador = false;
    buscadorDisponible().then(ok => { if (ok && root.isConnected) { buscador = true; draw(); } });
    const draw = () => {
      root.innerHTML = `<p class="hint" style="margin:0 0 12px">Escribe cada palabra (máx. ${LARGO} letras). La pista y la imagen son opcionales: ayudan a saber qué palabra hay que armar.</p>`;
      items.forEach((it, i) => {
        const box = el(`<div class="panel editor-item">
          <div class="row between"><div class="num">Palabra ${i + 1}</div>
            <button class="icon-btn" type="button" data-del aria-label="Eliminar palabra ${i + 1}" ${items.length === 1 ? 'disabled' : ''}>×</button></div>
          <div class="pair-row">
            <div class="match-img-ed">
              <label class="img-drop sm" title="${it.image ? 'Cambiar imagen' : 'Subir imagen desde el equipo'}" tabindex="0">
                ${it.image ? `<img src="${safeSrc(it.image)}" alt="Imagen de la palabra ${i + 1}">` : ICONO_IMG}
                <input type="file" accept="image/*" hidden aria-label="Imagen de la palabra ${i + 1}">
              </label>
              ${buscador ? `<button class="icon-btn" type="button" data-buscar title="Buscar imagen en internet" aria-label="Buscar imagen para la palabra ${i + 1}">${ICONO_BUSCAR}</button>` : ''}
              ${it.image ? `<button class="icon-btn" type="button" data-quitar title="Quitar imagen" aria-label="Quitar imagen de la palabra ${i + 1}">×</button>` : ''}
            </div>
            <input data-w placeholder="lion" value="${esc(it.word)}" aria-label="Palabra ${i + 1}" maxlength="${LARGO + 4}" style="flex:1 1 140px">
          </div>
          <input data-h placeholder="Pista (opcional): The king of the jungle." value="${esc(it.hint || '')}" aria-label="Pista de la palabra ${i + 1}" maxlength="140" style="margin-top:8px">
          ${it.credit ? `<div class="img-credito" title="${esc(it.credit)}">Imagen: ${esc(it.credit)}</div>` : ''}
        </div>`);
        const drop = box.querySelector('.img-drop'), file = box.querySelector('input[type=file]');
        const take = async f => { if (!f) return; try { it.image = await compressImage(f); delete it.credit; draw(); } catch (err) { toast(err.message, 'err'); } };
        drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } };
        file.onchange = () => take(file.files[0]);
        drop.ondragover = e => e.preventDefault();
        drop.ondrop = e => { e.preventDefault(); take(e.dataTransfer.files[0]); };
        box.querySelector('[data-buscar]')?.addEventListener('click', async () => {
          const r = await elegirImagen(it.word.trim());
          if (r) { it.image = r.image; it.credit = r.credit; draw(); }
        });
        box.querySelector('[data-quitar]')?.addEventListener('click', () => { delete it.image; delete it.credit; draw(); });
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
      getContent: () => ({ items: items.map(it => ({ word: it.word.trim().replace(/\s+/g, ' '), hint: (it.hint || '').trim(),
        ...(it.image ? { image: it.image } : {}), ...(it.image && it.credit ? { credit: it.credit } : {}) })) }),
      validate() {
        const errs = [];
        if (items.length < MIN || items.length > MAX) errs.push(`Usa entre ${MIN} y ${MAX} palabras.`);
        items.forEach((it, i) => {
          const w = it.word.trim();
          if (!w) errs.push(`Palabra ${i + 1}: escríbela.`);
          else if (!valida(w)) errs.push(`Palabra ${i + 1}: solo letras, espacios, guiones o apóstrofo.`);
          else if (letras(w).length < 2) errs.push(`Palabra ${i + 1}: muy corta.`);
          else if (letras(w).length > LARGO) errs.push(`Palabra ${i + 1}: máximo ${LARGO} letras.`);
        });
        return errs;
      },
    };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const total = content.items.length;
    const hide = () => evalMode.hide;
    const item = () => content.items[st.i];
    const chars = () => [...item().word];
    // Casillas: posiciones de la palabra que son letras (los espacios y símbolos quedan fijos).
    const casillas = () => chars().map((ch, k) => (base(ch) ? k : -1)).filter(k => k >= 0);
    const fresh = () => { const cs = casillas(); return { orden: desordenar(cs.map(k => chars()[k])), puestas: cs.map(() => null), errores: 0, over: false }; };
    const st = saved || { i: 0, answers: [] };
    if (!st.orden) Object.assign(st, fresh());
    const save = () => onProgreso({ ...st, done: st.answers.length, total });

    let ui = null, ocupado = false;
    const letra = t => chars()[casillas()[t]];       // ficha t = letra t de la palabra (sin espacios)
    const usada = t => st.puestas.includes(t);
    const encaja = (t, s) => base(letra(t)) === base(chars()[casillas()[s]]);

    const draw = () => {
      root.innerHTML = '';
      const it = item(), img = safeSrc(it.image), hint = (it.hint || '').trim();
      const cs = casillas();
      // Casillas agrupadas por palabra (una frase solo baja de línea entre palabras).
      let s = 0;
      const filas = it.word.split(' ').map(pal => `<span class="an-palabra">${[...pal].map(ch => (base(ch)
        ? `<span class="an-casilla" data-s="${s++}"></span>`
        : `<span class="an-sym">${esc(ch)}</span>`)).join('')}</span>`).join('');
      const wrap = el(`<div class="an" style="--n:${cs.length}">
        <div class="small muted" style="margin-bottom:12px">Palabra ${st.i + 1} de ${total}</div>
        ${img || hint ? `<div class="an-pista">${img ? `<img src="${img}" alt="" draggable="false">` : ''}${hint ? `<p>${esc(hint)}</p>` : ''}</div>` : ''}
        <div class="an-fichas" aria-label="Letras desordenadas">${st.orden.map((t, k) => `<span class="an-hueco"><button type="button" class="an-ficha" data-t="${t}" style="--k:${k}" aria-label="Letra ${esc(letra(t).toUpperCase())}">${esc(letra(t))}</button></span>`).join('')}</div>
        <div class="an-casillas" aria-live="polite">${filas}</div>
        <div class="fb-slot" role="status" aria-live="polite"></div>
      </div>`);
      ui = { wrap, fichas: wrap.querySelector('.an-fichas'), casillas: [...wrap.querySelectorAll('.an-casilla')] };
      wrap.querySelectorAll('.an-ficha').forEach(b => attach(b));
      ui.casillas.forEach((c, k) => { c.onclick = () => devolver(k); });
      root.append(wrap);
      // Letras ya puestas (al retomar).
      st.puestas.forEach((t, k) => { if (t !== null) colocar(t, k, false); });
      if (st.over) { marcarFinal(); showFeedback(); }
    };

    const ficha = t => ui.wrap.querySelector(`.an-ficha[data-t="${t}"]`);
    // Mueve la ficha a la casilla (con un deslizamiento desde donde estaba).
    const colocar = (t, k, animar = true) => {
      const b = ficha(t), c = ui.casillas[k];
      const desde = b.getBoundingClientRect();
      c.append(b);
      b.classList.add('puesta');
      c.classList.add('llena');
      if (!hide()) b.classList.add('ok');
      if (animar && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const a = b.getBoundingClientRect();
        b.animate([{ transform: `translate(${desde.left - a.left}px,${desde.top - a.top}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1.1)' });
      }
    };

    // Intenta poner la ficha t en la casilla s (o en la siguiente libre).
    const poner = (t, s = null) => {
      if (st.over || ocupado || usada(t)) return;
      const libre = st.puestas.indexOf(null);
      if (libre < 0) return;
      const k = s !== null && st.puestas[s] === null ? s : libre;
      if (!hide() && !encaja(t, k)) {
        // Como WordWall: la casilla marca ✗ y la letra se queda en su lugar.
        st.errores++; save();
        const c = ui.casillas[k];
        ocupado = true;
        c.classList.remove('bad'); void c.offsetWidth; c.classList.add('bad');
        ficha(t)?.classList.add('tiembla');
        setTimeout(() => { c.classList.remove('bad'); ficha(t)?.classList.remove('tiembla'); ocupado = false; }, 650);
        return;
      }
      st.puestas[k] = t;
      colocar(t, k);
      if (st.puestas.every(x => x !== null)) cerrar();
      save();
    };

    // En evaluación: tocar una casilla llena devuelve su letra.
    const devolver = k => {
      if (!hide() || st.over) return;
      const t = st.puestas[k];
      if (t === null) return;
      st.puestas[k] = null;
      const b = ficha(t), hueco = ui.fichas.children[st.orden.indexOf(t)];
      b.classList.remove('puesta');
      ui.casillas[k].classList.remove('llena');
      hueco.append(b);
      save();
    };

    const cerrar = () => {
      st.over = true;
      const w = item().word;
      let k = 0;
      const given = [...w].map(ch => (base(ch) ? letra(st.puestas[k++]) : ch)).join('');
      const correct = hide() ? st.puestas.every((t, s) => encaja(t, s)) : st.errores === 0;
      st.answers.push({ item: st.i, question: (item().hint || '').trim() || st.orden.map(letra).join(' '), expected: w, given, correct, errors: st.errores });
      ui.wrap.querySelectorAll('.an-ficha').forEach(b => { b.disabled = true; });
      setTimeout(() => { if (ui.wrap.isConnected) { marcarFinal(); showFeedback(); } }, hide() ? 0 : 350);
    };
    // Al completar: las fichas se juntan en la palabra (como WordWall).
    const marcarFinal = () => {
      ui.wrap.classList.add('armada');
      if (hide()) return;
      const a = st.answers.find(x => x.item === st.i);
      ui.wrap.querySelector('.an-casillas').classList.add(a.correct ? 'gano' : 'con-errores');
    };

    const showFeedback = () => {
      const a = st.answers.find(x => x.item === st.i);
      if (!a || ui.wrap.querySelector('.feedback')) return;
      const last = st.i === total - 1;
      const fb = el(`<div class="feedback ${hide() ? 'neutral' : a.correct ? 'ok' : 'bad'}">
        ${hide() ? neutralFb() : `<span>${a.correct ? '¡Muy bien!' : `Lo armaste con ${a.errors} error${a.errors === 1 ? '' : 'es'}.`}</span>`}
        <button class="btn" type="button" data-next>${last ? evalMode.fin : 'Siguiente'}</button></div>`);
      fb.querySelector('button').onclick = next;
      ui.wrap.querySelector('.fb-slot').replaceChildren(fb);
      fb.querySelector('button').focus({ preventScroll: true });
    };

    const next = () => {
      if (st.i < total - 1) { st.i++; Object.assign(st, fresh()); save(); draw(); return; }
      onTerminar({ score: st.answers.filter(a => a.correct).length, maxScore: total, answers: st.answers });
    };

    // Tocar = siguiente casilla libre; arrastrar = la casilla donde se suelta.
    const attach = b => {
      const t = +b.dataset.t;
      b.addEventListener('dragstart', e => e.preventDefault());
      b.addEventListener('pointerdown', e => {
        if (e.button !== 0 || st.over || usada(t)) return;
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY;
        let ghost = null, dx = 0, dy = 0;
        const move = ev => {
          if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
          if (!ghost) {
            const r = b.getBoundingClientRect();
            dx = sx - r.left; dy = sy - r.top;
            ghost = b.cloneNode(true); ghost.classList.add('an-ghost');
            ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
            document.body.append(ghost);
            b.classList.add('arrastrando');
          }
          ghost.style.left = ev.clientX - dx + 'px';
          ghost.style.top = ev.clientY - dy + 'px';
        };
        const up = ev => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          if (ghost) {
            ghost.remove(); b.classList.remove('arrastrando');
            const sobre = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.an-casilla');
            if (sobre && ui.wrap.contains(sobre)) poner(t, +sobre.dataset.s);
            return;
          }
          if (ev.type !== 'pointercancel') poner(t);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
      b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poner(t); } });
    };

    // Teclado físico: una letra pone la primera ficha libre con esa letra; Retroceso devuelve la última (en evaluación).
    const onKey = e => {
      if (!root.isConnected || !ui || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      if (st.over) return;
      if (e.key === 'Backspace' && hide()) {
        const k = st.puestas.map((t, s) => (t === null ? -1 : s)).filter(s => s >= 0).pop();
        if (k !== undefined) { e.preventDefault(); devolver(k); }
        return;
      }
      const l = base(e.key.length === 1 ? e.key : '');
      if (l.length !== 1) return;
      const libres = st.orden.filter(t => !usada(t) && base(letra(t)) === l);
      if (!libres.length) return;
      e.preventDefault();
      const sig = st.puestas.indexOf(null);
      poner(libres.find(t => encaja(t, sig)) ?? libres[0]);
    };
    document.addEventListener('keydown', onKey);

    save(); draw();
    return { destroy: () => document.removeEventListener('keydown', onKey) };
  },
};
