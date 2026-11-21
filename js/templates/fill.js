// Plantilla Completar texto: huecos {{resp}} o {{resp1|resp2}}, banco de palabras opcional.
import { evalMode, neutralFb, el, esc, icons, shuffle } from '../ui.js';

const GAP_RE = /\{\{(.+?)\}\}/g;
export const norm = s => String(s).trim().toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ');

// "She {{goes|does go}} home" → [{t:'She '}, {gap:['goes','does go']}, {t:' home'}]
export function parse(text) {
  const parts = []; let last = 0;
  for (const m of text.matchAll(GAP_RE)) {
    if (m.index > last) parts.push({ t: text.slice(last, m.index) });
    parts.push({ gap: m[1].split('|').map(s => s.trim()).filter(Boolean) });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t: text.slice(last) });
  return parts;
}
const gapsOf = text => parse(text).filter(p => p.gap);

export default {
  type: 'fill',
  label: 'Completar texto',
  plural: 'Completar texto',
  description: 'Frases con huecos para practicar gramática. Banco de palabras opcional.',
  icon: icons.fill,

  empty: () => ({ items: [{ text: '', bank: [] }] }),
  summary: c => {
    const g = c.items.reduce((s, it) => s + gapsOf(it.text).length, 0);
    return `${c.items.length} frase${c.items.length === 1 ? '' : 's'} · ${g} hueco${g === 1 ? '' : 's'}`;
  },

  editor(root, content) {
    const items = structuredClone(content.items).map(it => ({ text: it.text, bank: (it.bank || []).join(', ') }));
    const draw = () => {
      root.innerHTML = `<p class="hint" style="margin:0 0 12px">Escribe la frase, selecciona la palabra que falta y toca <b>Hacer hueco</b>.</p>`;
      items.forEach((it, i) => {
        const box = el(`<div class="panel editor-item">
          <div class="row between"><div class="num">Frase ${i + 1}</div>
            <button class="icon-btn" type="button" data-del aria-label="Eliminar frase ${i + 1}" ${items.length === 1 ? 'disabled' : ''}>×</button></div>
          <div class="field"><textarea data-text rows="2" placeholder="She goes to school every day." aria-label="Frase ${i + 1}">${esc(it.text)}</textarea>
            <div class="fill-tools"><button class="btn ghost sm" type="button" data-gap>Hacer hueco</button><p class="fill-prev" data-count aria-live="polite"></p></div>
            <p class="hint">Varias respuestas válidas: <code>{{goes|does go}}</code></p></div>
          <label>Banco de palabras <span class="muted">(opcional, separadas por coma)</span></label>
          <div class="row"><input class="grow" data-bank placeholder="goes, go, going" value="${esc(it.bank)}" aria-label="Banco de palabras de la frase ${i + 1}">
            <button class="btn ghost sm" type="button" data-auto>Usar respuestas</button></div>
        </div>`);
        const count = box.querySelector('[data-count]');
        // Vista de la frase con los huecos resaltados (lo que verá el estudiante, con la respuesta).
        const upd = () => {
          const ps = parse(it.text);
          count.innerHTML = ps.some(p => p.gap) ? ps.map(p => p.gap ? `<mark>${esc(p.gap.join(' / '))}</mark>` : esc(p.t)).join('') : '<span class="muted">Aún no hay huecos.</span>';
        };
        upd();
        const ta = box.querySelector('[data-text]');
        ta.oninput = e => { it.text = e.target.value; upd(); };
        // Convierte lo seleccionado en {{hueco}} (sin escribir llaves). Se evita perder la selección al tocar el botón.
        const gb = box.querySelector('[data-gap]');
        gb.onmousedown = e => e.preventDefault();
        gb.onclick = () => {
          let a = ta.selectionStart, b = ta.selectionEnd;
          if (a === b) {
            // Sin selección: la palabra donde está el cursor.
            while (a > 0 && /[\w'’-]/.test(ta.value[a - 1])) a--;
            while (b < ta.value.length && /[\w'’-]/.test(ta.value[b])) b++;
          }
          const sel = ta.value.slice(a, b).trim();
          if (!sel || /[{}]/.test(sel)) { ta.focus(); return; }
          ta.value = ta.value.slice(0, a) + `{{${sel}}}` + ta.value.slice(b);
          it.text = ta.value; upd(); ta.focus();
        };
        box.querySelector('[data-bank]').oninput = e => { it.bank = e.target.value; };
        box.querySelector('[data-auto]').onclick = () => {
          const answers = gapsOf(it.text).map(g => g.gap[0]);
          const extra = it.bank.split(',').map(s => s.trim()).filter(s => s && !answers.includes(s));
          it.bank = [...answers, ...extra].join(', ');
          box.querySelector('[data-bank]').value = it.bank;
        };
        box.querySelector('[data-del]').onclick = () => { items.splice(i, 1); draw(); };
        root.append(box);
      });
      const add = el(`<button class="btn ghost" type="button" style="margin-top:12px">${icons.plus} Agregar frase</button>`);
      add.onclick = () => { items.push({ text: '', bank: '' }); draw(); root.querySelectorAll('[data-text]')[items.length - 1]?.focus(); };
      root.append(add);
    };
    draw();
    return {
      getContent: () => ({ items: items.map(it => ({ text: it.text.trim(), bank: it.bank.split(',').map(s => s.trim()).filter(Boolean) })) }),
      validate() {
        const errs = [];
        items.forEach((it, i) => {
          const gaps = gapsOf(it.text);
          if (!it.text.trim()) errs.push(`Frase ${i + 1}: escribe la frase.`);
          else if (!gaps.length) errs.push(`Frase ${i + 1}: marca al menos un hueco con {{ }}.`);
          const bank = it.bank.split(',').map(s => norm(s)).filter(Boolean);
          // Cada ficha se usa una vez: el banco debe tener una ficha por hueco (si "am" va dos veces, el banco lo lleva dos veces).
          if (bank.length) {
            const left = [...bank];
            const ok = gaps.every(g => { const k = left.findIndex(b => g.gap.some(a => norm(a) === b)); if (k === -1) return false; left.splice(k, 1); return true; });
            if (!ok) errs.push(`Frase ${i + 1}: el banco no alcanza para todos los huecos (si una palabra va dos veces, escríbela dos veces en el banco).`);
          }
        });
        return errs;
      },
    };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const total = content.items.length;
    const st = saved || { i: 0, values: [], checked: false, answers: [], banks: content.items.map(it => shuffle(it.bank || [])) };
    const save = () => onProgreso({ ...st, done: st.answers.length ? new Set(st.answers.map(a => a.item)).size : 0, total });

    const draw = () => {
      const item = content.items[st.i];
      const parts = parse(item.text);
      const gaps = parts.filter(p => p.gap);
      const bank = st.banks[st.i] || [];
      const useBank = bank.length > 0;
      if (st.values.length !== gaps.length) st.values = gaps.map(() => '');

      root.innerHTML = '';
      const wrap = el(`<div>
        <div class="small muted" style="margin-bottom:6px">Frase ${st.i + 1} de ${total} · ${useBank ? 'Toca las palabras para completar' : 'Escribe la palabra que falta'}</div>
        <p class="fill-text"></p>
        <div class="bank" ${useBank ? '' : 'hidden'}></div>
        <div class="fb-slot" role="status" aria-live="polite"></div>
      </div>`);
      const p = wrap.querySelector('.fill-text');
      let g = 0;
      const inputs = [];
      for (const part of parts) {
        if (!part.gap) { p.append(document.createTextNode(part.t)); continue; }
        const k = g++;
        const inp = el(`<input class="gap" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Hueco ${k + 1}">`);
        inp.value = st.values[k];
        inp.size = Math.max(6, Math.max(...part.gap.map(a => a.length)) + 2);
        if (useBank) { inp.readOnly = true; inp.title = 'Toca para vaciar'; inp.onclick = () => { if (!st.checked && st.values[k]) { st.values[k] = ''; save(); draw(); } }; }
        else inp.oninput = () => { st.values[k] = inp.value; save(); };
        inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); (inputs[k + 1] || checkBtn).focus(); } };
        inputs.push(inp);
        p.append(inp);
      }
      // Banco: cada ficha se usa una vez (se cuentan repetidas).
      const bankBox = wrap.querySelector('.bank');
      const used = [...st.values];
      bank.forEach(w => {
        const ui = used.indexOf(w);
        const isUsed = ui !== -1; if (isUsed) used[ui] = null;
        const c = el(`<button class="chip ${isUsed ? 'used' : ''}" type="button" ${isUsed || st.checked ? 'disabled' : ''}>${esc(w)}</button>`);
        c.onclick = () => { const k = st.values.findIndex(v => !v); if (k !== -1) { st.values[k] = w; save(); draw(); } };
        bankBox.append(c);
      });
      const fb = wrap.querySelector('.fb-slot');
      const checkBtn = el(`<div class="row end" style="margin-top:20px"><button class="btn" type="button">Comprobar</button></div>`);
      checkBtn.querySelector('button').onclick = check;
      fb.append(checkBtn);
      root.append(wrap);

      if (st.checked) showFeedback(gaps, inputs);
      else if (!useBank) inputs.find(i => !i.value)?.focus({ preventScroll: true });
    };

    const check = () => {
      const gaps = gapsOf(content.items[st.i].text);
      if (st.values.some(v => !v.trim())) {
        const ok = root.querySelector('.fb-slot');
        ok.querySelector('.hint')?.remove();
        ok.prepend(el(`<p class="hint" style="color:var(--danger);text-align:right">Completa todos los huecos.</p>`));
        return;
      }
      gaps.forEach((g, k) => st.answers.push({
        item: st.i, gap: k, question: content.items[st.i].text, given: st.values[k],
        expected: g.gap[0], correct: g.gap.some(a => norm(a) === norm(st.values[k])),
      }));
      st.checked = true; save(); draw();
    };

    const showFeedback = (gaps, inputs) => {
      const res = st.answers.filter(a => a.item === st.i);
      const hide = evalMode.hide;
      inputs.forEach((inp, k) => { inp.readOnly = true; if (!hide) inp.classList.add(res[k]?.correct ? 'correct' : 'wrong'); });
      const allOk = res.every(a => a.correct);
      const fixes = res.filter(a => !a.correct).map(a => `<b>${esc(a.expected)}</b>`).join(', ');
      const last = st.i === total - 1;
      const fb = el(`<div class="feedback ${hide ? 'neutral' : allOk ? 'ok' : 'bad'}">
        ${hide ? neutralFb() : `<span>${allOk ? '¡Muy bien!' : `Respuesta${res.filter(a => !a.correct).length > 1 ? 's' : ''} correcta${res.filter(a => !a.correct).length > 1 ? 's' : ''}: ${fixes}`}</span>`}
        <button class="btn" type="button">${last ? evalMode.fin : 'Siguiente'}</button></div>`);
      fb.querySelector('button').onclick = next;
      root.querySelector('.fb-slot').replaceChildren(fb);
      fb.querySelector('button').focus({ preventScroll: true });
    };

    const next = () => {
      if (st.i < total - 1) { st.i++; st.values = []; st.checked = false; save(); draw(); return; }
      onTerminar({ score: st.answers.filter(a => a.correct).length, maxScore: st.answers.length, answers: st.answers });
    };

    save();
    draw();
  },
};
