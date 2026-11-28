// Plantilla Reordenar oraciones: la oración aparece desordenada en una línea y el estudiante arrastra las palabras;
// se reacomodan en vivo. Como en WordWall (2026-11-22, pedido del docente): se resuelve EN ORDEN desde el principio; una
// palabra se pone verde con ✓ y queda fija (ya no se mueve) cuando ella y todas las anteriores están en su lugar. Las de
// más atrás no se marcan aunque estén bien mientras falte alguna antes. La oración termina cuando todas están en orden. Tocar dos palabras las cambia.
// En evaluación (respuestas ocultas) no se fija nada: se ordena y se comprueba al final.
import { evalMode, neutralFb, el, esc, icons, shuffle } from '../ui.js';
import { norm } from './fill.js';

const tokens = s => s.trim().split(/\s+/).filter(Boolean);
// Como WordWall, el signo final (. ! ?) queda fijo al final y no se arrastra con la última palabra.
const partir = s => {
  const w = tokens(s), m = w.at(-1)?.match(/^(.+?)([.!?]+)$/u);
  if (m) w[w.length - 1] = m[1];
  return { w, punto: m ? m[2] : '' };
};

// Desordena procurando que ninguna palabra arranque ya en su lugar (quedaría fija desde el inicio).
function scramble(words) {
  const idx = words.map((_, i) => i);
  if (words.length < 2) return idx;
  const enSuLugar = s => s.filter((wi, k) => norm(words[wi]) === norm(words[k])).length;
  // El orden exactamente al revés también se evita (se adivina de un vistazo).
  const reverso = s => s.every((wi, k) => wi === idx.length - 1 - k);
  let mejor = null, m = Infinity;
  for (let t = 0; t < 80 && m > 0; t++) {
    const s = shuffle(idx);
    const n = enSuLugar(s) + (reverso(s) && words.length > 3 ? 0.5 : 0);
    if (n < m) { mejor = s; m = n; }
  }
  return mejor;
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
    let alFinal = !!content.alFinal;
    const draw = () => {
      root.innerHTML = `<p class="hint" style="margin:0 0 12px">Escribe cada oración bien ordenada. Se separa por espacios; la puntuación queda pegada a su palabra.</p>
        <label class="opt-row" style="margin:0 0 14px;font-weight:600"><input type="checkbox" data-alfinal ${alFinal ? 'checked' : ''} style="width:20px;height:20px">
          Comprobar al final: no se marca nada mientras ordena; ve si acertó al presionar «Comprobar»</label>`;
      root.querySelector('[data-alfinal]').onchange = e => { alFinal = e.target.checked; };
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
      getContent: () => ({ items: items.map(it => ({ sentence: tokens(it.sentence).join(' ') })), ...(alFinal ? { alFinal: true } : {}) }),
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
    const hide = evalMode.hide; // en evaluación no se marca nada y tampoco se dice al final si estuvo bien
    // Comprobar al final (opción del docente, o evaluación): sin marcas mientras ordena; se revisa con «Comprobar».
    const alFinal = hide || !!content.alFinal;
    const fresh = i => ({ order: scramble(partir(content.items[i].sentence).w), fijas: [], checked: false });
    // Progreso de la versión anterior (palabras en dos zonas): se empieza la oración de nuevo.
    const st = saved?.order ? saved : { i: saved?.i || 0, answers: saved?.answers || [], ...fresh(saved?.i || 0) };
    if (!Array.isArray(st.fijas)) st.fijas = [];
    const words = () => partir(content.items[st.i].sentence).w;
    const punto = () => partir(content.items[st.i].sentence).punto;
    const save = () => onProgreso({ ...st, done: st.answers.length, total });

    // En su lugar: se compara el texto (dos "the" valen igual). Fija: solo los lugares que el estudiante acertó a mano.
    const enLugar = k => norm(words()[st.order[k]]) === norm(words()[k]);
    // Fija = parte del comienzo ya resuelto (st.fijas guarda esas posiciones). No se mueve ni la corren las demás.
    const fija = k => !alFinal && st.fijas.includes(k);
    // Comienzo resuelto: desde la primera palabra, mientras cada una esté en su lugar (posiciones 0..n-1).
    const resueltas = () => { let n = 0; while (n < st.order.length && enLugar(n)) n++; return n; };
    // Las que entran al comienzo resuelto se traban en el acto (no se pueden mover) y se pintan en cola: de una en una
    // (verde + ✓ + sonido de correcto); la siguiente sale cuando el ✓ de la anterior ya desapareció. Al retomar (sin
    // animar) se pintan todas de una vez.
    const marcarPares = animar => {
      const n = resueltas();
      for (let k = 0; k < n; k++) {
        const b = nodo(st.order[k]); if (!b || b.classList.contains('trabada')) continue;
        if (!st.fijas.includes(k)) st.fijas.push(k);
        b.classList.add('trabada'); b.setAttribute('aria-disabled', 'true'); b.classList.remove('sel');
        if (sel === st.order[k]) sel = null;
        if (animar) encolar(b); else b.classList.add('ok', 'par');
      }
    };
    // Cola de chulitos: uno a la vez, PASO ms cada uno (aparece, suena, se va).
    const PASO = 1000;
    let cola = [], corriendo = false, alVaciar = null, colaT = null;
    const encolar = b => { if (!cola.includes(b)) cola.push(b); if (!corriendo) siguiente(); };
    const siguiente = () => {
      const b = cola.shift();
      if (!b) { corriendo = false; const f = alVaciar; alVaciar = null; f?.(); return; }
      corriendo = true;
      if (!b.isConnected) return siguiente();
      b.classList.add('ok', 'par'); chulito(b);
      colaT = setTimeout(siguiente, PASO);
    };
    let cerrando = false;
    let linea, sel = null;
    const nodo = wi => linea.querySelector(`[data-wi="${wi}"]`);
    const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = () => {
      const w = words();
      sel = null;
      clearTimeout(colaT); cola = []; corriendo = false; alVaciar = null; cerrando = false;
      root.innerHTML = '';
      const wrap = el(`<div class="reorder">
        <div class="small muted" style="margin-bottom:6px"><span>Oración ${st.i + 1} de ${total}</span><span class="rd-inst"><span> · </span><span>${alFinal ? 'Ordena las palabras y comprueba' : 'Arrastra las palabras hasta ordenar la oración'}</span></span></div>
        <div class="slots linea" aria-label="Oración desordenada"></div>
        <p class="rd-pista">${alFinal ? 'Ordena las palabras y comprueba' : 'Arrastra la palabra al lugar correcto'}</p>
        <div class="fb-slot" role="status" aria-live="polite">${alFinal && !st.checked ? `<div class="row end" style="margin-top:20px">
          <button class="btn" type="button" data-check>Comprobar</button></div>` : ''}</div>
      </div>`);
      linea = wrap.querySelector('.linea');
      st.order.forEach((wi, k) => {
        const b = el(`<button class="word" type="button">${esc(w[wi])}</button>`);
        b.dataset.wi = wi;
        // Al revisar, todas las que quedaron en su lugar se ven verdes (también las que nunca se movieron).
        if (fija(k) || (st.checked && !hide && enLugar(k))) marcar(b, false);
        else if (st.checked && !hide) b.classList.add('fuera');
        if (st.checked) b.disabled = true; else attach(b);
        linea.append(b);
      });
      if (punto()) linea.append(el(`<span class="rd-punto" aria-hidden="true">${esc(punto())}</span>`));
      if (!alFinal && !st.checked) marcarPares(false);
      wrap.querySelector('[data-check]')?.addEventListener('click', comprobar);
      root.append(wrap);
      if (st.checked) showFeedback();
    };

    // ✓ blanco que salta y desaparece (una sola vez: la clase se quita al terminar, así reacomodar no lo repite).
    const chulito = b => {
      b.classList.remove('recien'); void b.offsetWidth; b.classList.add('recien');
      clearTimeout(b._chulito); b._chulito = setTimeout(() => b.classList.remove('recien'), PASO - 50);
    };
    const marcar = b => {
      b.classList.add('ok', 'fija');
      b.setAttribute('aria-disabled', 'true');
      b.setAttribute('aria-label', `${b.textContent}, en su lugar`);
      b.classList.remove('sel');
    };

    // Reacomoda los botones según st.order con animación (FLIP): nada se redibuja.
    const acomodar = () => {
      const antes = new Map([...linea.children].map(b => [b, b.getBoundingClientRect()]));
      st.order.forEach(wi => linea.append(nodo(wi)));
      const p = linea.querySelector('.rd-punto'); if (p) linea.append(p);
      if (sinMovimiento()) return;
      for (const [b, r] of antes) {
        const n = b.getBoundingClientRect(), dx = r.left - n.left, dy = r.top - n.top;
        if (dx || dy) b.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { id: 'acomodo', duration: 180, easing: 'cubic-bezier(.2,.8,.3,1)' });
      }
    };

    // Mueve la palabra wi al lugar de otra, solo entre las que no están fijas (las fijas no se corren).
    const mover = (wi, destinoWi) => {
      const libres = st.order.map((_, k) => k).filter(k => !fija(k));
      const seq = libres.map(k => st.order[k]);
      const a = seq.indexOf(wi), b = seq.indexOf(destinoWi);
      if (a < 0 || b < 0 || a === b) return false;
      seq.splice(a, 1); seq.splice(b, 0, wi);
      libres.forEach((k, j) => { st.order[k] = seq[j]; });
      acomodar();
      return true;
    };
    const intercambiar = (x, y) => {
      const a = st.order.indexOf(x), b = st.order.indexOf(y);
      [st.order[a], st.order[b]] = [y, x];
      acomodar();
    };

    // Al soltar: se marcan los pares buenos; si toda la oración está en orden, queda lista.
    const asentar = () => {
      save();
      if (alFinal) return;
      marcarPares(true);
      if (st.order.every((_, k) => enLugar(k))) {
        // Oración completa: ya no se mueve nada; los ✓ que falten salen en fila y, al terminar, se cierra la oración.
        cerrando = true;
        st.order.forEach((_, k) => { if (!st.fijas.includes(k)) st.fijas.push(k); });
        linea.querySelectorAll('.word').forEach(b => { b.disabled = true; if (!b.classList.contains('par')) encolar(b); });
        const cerrar = () => { linea.querySelectorAll('.word').forEach(b => marcar(b)); terminarOracion(true); };
        if (corriendo) alVaciar = cerrar; else cerrar();
      }
    };

    const attach = b => {
      const wi = +b.dataset.wi;
      b.draggable = false;
      b.addEventListener('dragstart', e => e.preventDefault());
      b.addEventListener('pointerdown', e => {
        if (e.button !== 0 || b.classList.contains('trabada') || st.checked) return;
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY;
        let ghost = null, dx = 0, dy = 0;
        const move = ev => {
          if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
          if (!ghost) {
            const r = b.getBoundingClientRect();
            dx = sx - r.left; dy = sy - r.top;
            ghost = b.cloneNode(true); ghost.classList.add('ghost'); ghost.classList.remove('sel');
            ghost.style.width = r.width + 'px';
            document.body.append(ghost);
            b.classList.add('dragging');
            if (sel !== null) nodo(sel)?.classList.remove('sel');
            sel = null;
          }
          ghost.style.left = ev.clientX - dx + 'px';
          ghost.style.top = ev.clientY - dy + 'px';
          // La palabra libre que está bajo el dedo cede su lugar en el acto.
          const t = [...linea.querySelectorAll('.word:not(.trabada):not(.dragging)')].find(x => {
            const r = x.getBoundingClientRect();
            return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top - 4 && ev.clientY <= r.bottom + 4;
          });
          // (mientras una palabra todavía se desliza no se vuelve a mover: evita que tiemble)
          if (t && !t.getAnimations().some(a => a.id === 'acomodo')) mover(wi, +t.dataset.wi);
        };
        const up = ev => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          if (ghost) {
            const r = b.getBoundingClientRect(), g = ghost.getBoundingClientRect();
            ghost.remove(); b.classList.remove('dragging');
            if (!sinMovimiento()) b.animate([{ transform: `translate(${g.left - r.left}px,${g.top - r.top}px)` }, { transform: 'none' }], { duration: 160, easing: 'ease-out' });
            asentar();
            return;
          }
          if (ev.type !== 'pointercancel') tocar(wi);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
      // Teclado: Enter/Espacio elige y cambia; las flechas corren la palabra un lugar.
      b.addEventListener('keydown', e => {
        if (b.classList.contains('trabada') || st.checked) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tocar(wi); return; }
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const libres = [...linea.querySelectorAll('.word:not(.trabada)')];
        const vecino = libres[libres.indexOf(b) + (e.key === 'ArrowLeft' ? -1 : 1)];
        if (vecino && mover(wi, +vecino.dataset.wi)) { asentar(); b.focus(); }
      });
    };

    // Tocar una palabra la elige; tocar otra las cambia de lugar.
    const tocar = wi => {
      const b = nodo(wi);
      if (sel === null) { sel = wi; b.classList.add('sel'); return; }
      const otro = sel; sel = null;
      nodo(otro)?.classList.remove('sel');
      if (otro === wi) return;
      intercambiar(otro, wi);
      asentar();
    };

    const comprobar = () => {
      const w = words();
      terminarOracion(norm(st.order.map(i => w[i]).join(' ')) === norm(w.join(' ')));
    };

    const terminarOracion = correct => {
      if (st.checked) return;
      const w = words();
      st.answers.push({ item: st.i, question: content.items[st.i].sentence, given: st.order.map(i => w[i]).join(' ') + punto(), correct });
      st.checked = true; save(); draw();
    };

    const showFeedback = () => {
      const a = st.answers.find(x => x.item === st.i);
      if (!hide) linea.classList.add(a.correct ? 'ok' : 'bad');
      const last = st.i === total - 1;
      const fb = el(`<div class="feedback ${hide ? 'neutral' : a.correct ? 'ok' : 'bad'}">
        ${hide ? neutralFb() : `<span>${a.correct ? '¡Perfecto!' : `Correcta: <b>${esc(content.items[st.i].sentence)}</b>`}</span>`}
        <button class="btn" type="button" data-next>${last ? evalMode.fin : 'Siguiente'}</button></div>`);
      fb.querySelector('button').onclick = next;
      root.querySelector('.fb-slot').replaceChildren(fb);
      fb.querySelector('button').focus({ preventScroll: true });
    };

    const next = () => {
      if (st.i < total - 1) { st.i++; Object.assign(st, fresh(st.i)); save(); draw(); return; }
      onTerminar({ score: st.answers.filter(a => a.correct).length, maxScore: total, answers: st.answers });
    };

    save();
    draw();
  },
};
