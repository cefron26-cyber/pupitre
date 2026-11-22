// Plantilla Dictado: el estudiante escucha una palabra u oración (voces de Microsoft; respaldo: voz del navegador)
// y la escribe. content.voz = id de voces.mjs o 'variada' (una voz distinta en cada elemento).
import { evalMode, neutralFb, el, esc, icons, toast } from '../ui.js';
import { VOCES, VOZ_DEFECTO, VOCES_VARIADAS, esVoz } from '../voces.mjs';
import { prepararVoz, reproducirVoz, detenerVoz } from '../voz.js';

const vozDe = (voz, i) => (voz === 'variada' ? VOCES_VARIADAS[i % VOCES_VARIADAS.length] : esVoz(voz) ? voz : VOZ_DEFECTO);
const decir = (texto, voz, velocidad) => reproducirVoz([{ texto, voz }], { velocidad });

// Compara sin importar mayúsculas, espacios dobles ni la puntuación.
const clean = s => String(s).toLowerCase().replace(/[’‘`´]/g, "'").replace(/[.,!?;:"“”¡¿()]/g, '').replace(/\s+/g, ' ').trim();

export default {
  type: 'dictation',
  label: 'Dictado',
  plural: 'Dictados',
  description: 'Escucha y escribe: palabras u oraciones leídas con voces naturales (spelling).',
  icon: icons.dictation,

  empty: () => ({ items: [{ text: '' }, { text: '' }, { text: '' }], rate: 0.9 }),
  summary: c => `${c.items.length} elemento${c.items.length === 1 ? '' : 's'} para escribir`,

  editor(root, content) {
    const items = structuredClone(content.items);
    let rate = content.rate ?? 0.9;
    let voz = content.voz === 'variada' || esVoz(content.voz) ? content.voz : VOZ_DEFECTO;
    const draw = () => {
      root.innerHTML = `<p class="hint" style="margin:0 0 12px">Escribe lo que el estudiante escuchará y deberá escribir. No se tienen en cuenta mayúsculas ni puntuación.</p>
        <div class="row" style="align-items:flex-end">
          <div class="field" style="flex:1 1 220px;max-width:280px"><label>Voz</label>
            <select data-voz><option value="variada" ${voz === 'variada' ? 'selected' : ''}>Variada (una distinta en cada uno)</option>
              ${Object.entries(VOCES).map(([id, v]) => `<option value="${id}" ${voz === id ? 'selected' : ''}>${v.nombre}</option>`).join('')}</select></div>
          <div class="field" style="flex:1 1 180px;max-width:240px"><label>Velocidad de la voz</label>
            <select data-rate>${[[1, 'Normal'], [0.9, 'Un poco lento'], [0.75, 'Lento']].map(([v, l]) => `<option value="${v}" ${rate == v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        </div>`;
      root.querySelector('[data-rate]').onchange = e => { rate = +e.target.value; };
      root.querySelector('[data-voz]').onchange = e => { voz = e.target.value; };
      items.forEach((it, i) => {
        const box = el(`<div class="panel editor-item"><div class="pair-row">
          <span class="num" style="margin:0;min-width:24px">${i + 1}</span>
          <input class="grow" data-t placeholder="${['beautiful', 'Wednesday', 'She is reading a book.'][i % 3]}" value="${esc(it.text)}" aria-label="Texto ${i + 1}" style="flex:1 1 160px">
          <button class="btn ghost sm" type="button" data-try aria-label="Escuchar ${i + 1}">${icons.play}</button>
          <button class="icon-btn" type="button" data-del aria-label="Eliminar ${i + 1}" ${items.length <= 1 ? 'disabled' : ''}>×</button>
        </div></div>`);
        box.querySelector('[data-t]').oninput = e => { it.text = e.target.value; };
        box.querySelector('[data-try]').onclick = () => it.text.trim() ? decir(it.text, vozDe(voz, i), rate) : toast('Escribe primero el texto.');
        box.querySelector('[data-del]').onclick = () => { items.splice(i, 1); draw(); };
        root.append(box);
      });
      const add = el(`<button class="btn ghost" type="button" style="margin-top:12px">${icons.plus} Agregar</button>`);
      add.onclick = () => { items.push({ text: '' }); draw(); root.querySelectorAll('[data-t]')[items.length - 1]?.focus(); };
      root.append(add);
    };
    draw();
    return {
      getContent: () => ({ items: items.map(it => ({ text: it.text.trim() })), rate, voz }),
      validate: () => items.flatMap((it, i) => it.text.trim() ? [] : [`Elemento ${i + 1}: escribe el texto.`]),
    };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const total = content.items.length;
    const st = saved || { i: 0, value: '', checked: false, answers: [] };
    const save = () => onProgreso({ ...st, done: st.answers.length, total });
    const rate = content.rate ?? 0.9;
    const segDe = i => [{ texto: content.items[i].text, voz: vozDe(content.voz, i) }];
    // Se preparan el actual y el siguiente para que suenen sin espera.
    const precargar = i => [i, i + 1].filter(j => j < total).forEach(j => prepararVoz(segDe(j), rate).catch(() => {}));

    const draw = () => {
      const item = content.items[st.i];
      root.innerHTML = '';
      const wrap = el(`<div>
        <div class="small muted" style="margin-bottom:12px">${st.i + 1} de ${total} · Escucha y escribe lo que oyes</div>
        <div class="row" style="margin-bottom:16px">
          <button class="listen-btn" type="button" data-play aria-label="Escuchar">${icons.play}</button>
          <button class="btn ghost" type="button" data-slow>Escuchar lento</button>
        </div>
        <input class="dict-input" data-in autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Escribe aquí" aria-label="Lo que escuchaste">
        <div class="fb-slot" role="status" aria-live="polite"><div class="row end" style="margin-top:20px"><button class="btn" type="button" data-check>Comprobar</button></div></div>
      </div>`);
      const input = wrap.querySelector('[data-in]');
      input.value = st.value;
      input.oninput = () => { st.value = input.value; save(); };
      input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); st.checked ? next() : check(); } };
      wrap.querySelector('[data-play]').onclick = () => reproducirVoz(segDe(st.i), { velocidad: rate });
      wrap.querySelector('[data-slow]').onclick = () => reproducirVoz(segDe(st.i), { velocidad: rate * 0.7 });
      precargar(st.i);
      wrap.querySelector('[data-check]').onclick = check;
      root.append(wrap);
      if (st.checked) showFeedback();
      else input.focus({ preventScroll: true });
    };

    const check = () => {
      if (!st.value.trim()) {
        const slot = root.querySelector('.fb-slot');
        slot.querySelector('.hint')?.remove();
        slot.prepend(el('<p class="hint" style="color:var(--danger);text-align:right">Escribe lo que escuchaste.</p>'));
        return;
      }
      const item = content.items[st.i];
      st.answers.push({ item: st.i, question: item.text, given: st.value, correct: clean(st.value) === clean(item.text) });
      st.checked = true; save(); draw();
    };

    const showFeedback = () => {
      const a = st.answers.find(x => x.item === st.i);
      const input = root.querySelector('[data-in]');
      const hide = evalMode.hide;
      input.readOnly = true; if (!hide) input.classList.add(a.correct ? 'correct' : 'wrong');
      const last = st.i === total - 1;
      const fb = el(`<div class="feedback ${hide ? 'neutral' : a.correct ? 'ok' : 'bad'}">
        ${hide ? neutralFb() : `<span>${a.correct ? '¡Correcto!' : `Se escribe: <b>${esc(content.items[st.i].text)}</b>`}</span>`}
        <button class="btn" type="button" data-next>${last ? evalMode.fin : 'Siguiente'}</button></div>`);
      fb.querySelector('button').onclick = next;
      root.querySelector('.fb-slot').replaceChildren(fb);
      fb.querySelector('button').focus({ preventScroll: true });
    };

    const next = () => {
      if (st.i < total - 1) { st.i++; st.value = ''; st.checked = false; save(); draw(); setTimeout(() => reproducirVoz(segDe(st.i), { velocidad: rate }), 250); return; }
      onTerminar({ score: st.answers.filter(a => a.correct).length, maxScore: total, answers: st.answers });
    };

    save(); draw();
    return { destroy: detenerVoz };
  },
};
