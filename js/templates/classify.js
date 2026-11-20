// Plantilla Clasificar: cada elemento va a su grupo (ej. sustantivos / verbos, countable / uncountable).
import { el, esc, icons, shuffle, evalMode } from '../ui.js';

// Uno por línea; la coma solo separa si no hay saltos de línea (así "Hello, Tom" puede ser un elemento).
const lines = s => String(s).split(/\n/.test(String(s)) ? /\n/ : /,/).map(x => x.trim()).filter(Boolean);

export default {
  type: 'classify',
  label: 'Clasificar',
  plural: 'Clasificar',
  description: 'Ordena cada palabra en su grupo: verbos/sustantivos, pasado/presente, countable/uncountable…',
  icon: icons.classify,

  empty: () => ({ groups: [{ name: '', items: [] }, { name: '', items: [] }] }),
  summary: c => `${c.groups.length} grupos · ${c.groups.reduce((s, g) => s + g.items.length, 0)} elementos`,

  editor(root, content) {
    // Cada grupo: nombre y sus elementos como fichas (Enter o coma agrega; × quita). Pegar una lista también sirve.
    const groups = structuredClone(content.groups).map(g => ({ name: g.name, items: [...g.items] }));
    const draw = () => {
      root.innerHTML = '';
      const grid = el('<div class="group-editor"></div>');
      groups.forEach((g, i) => {
        const box = el(`<div class="panel editor-item" style="margin:0">
          <div class="row between"><div class="num">Grupo ${i + 1}</div>
            <button class="icon-btn" type="button" data-del aria-label="Eliminar grupo ${i + 1}" ${groups.length <= 2 ? 'hidden' : ''}>×</button></div>
          <div class="field"><input data-n placeholder="${['Ej. Verbs', 'Ej. Nouns', 'Ej. Adjectives', 'Ej. Adverbs'][i]}" value="${esc(g.name)}" aria-label="Nombre del grupo ${i + 1}"></div>
          <div class="chip-input"><span data-chips></span><input data-i placeholder="${['run, play, eat', 'house, dog', 'big, happy', 'quickly'][i]}" aria-label="Agregar elementos al grupo ${i + 1} (Enter o coma)"></div>
        </div>`);
        const chips = box.querySelector('[data-chips]'), inp = box.querySelector('[data-i]');
        const pintar = () => {
          chips.innerHTML = g.items.map((x, k) => `<span class="chip-ed">${esc(x)}<button type="button" data-k="${k}" aria-label="Quitar ${esc(x)}">×</button></span>`).join('');
          chips.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { g.items.splice(+b.dataset.k, 1); pintar(); inp.focus(); }; });
        };
        const agregar = () => { const nuevos = lines(inp.value.replace(/\n/g, ',')); if (nuevos.length) { g.items.push(...nuevos); inp.value = ''; pintar(); } };
        inp.onkeydown = e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); agregar(); }
          else if (e.key === 'Backspace' && !inp.value && g.items.length) { g.items.pop(); pintar(); }
        };
        inp.onblur = agregar;
        inp.onpaste = () => setTimeout(agregar, 0);
        pintar();
        box.querySelector('[data-n]').oninput = e => { g.name = e.target.value; };
        box.querySelector('[data-del]').onclick = () => { groups.splice(i, 1); draw(); };
        grid.append(box);
      });
      root.append(grid);
      const add = el(`<button class="btn ghost" type="button" style="margin-top:12px" ${groups.length >= 4 ? 'disabled' : ''}>${icons.plus} Agregar grupo</button>`);
      add.onclick = () => { groups.push({ name: '', items: [] }); draw(); };
      root.append(add);
    };
    draw();
    // Lo que quedó escrito sin Enter también cuenta.
    const pend = () => root.querySelectorAll('[data-i]').forEach((inp, i) => { const n = lines(inp.value.replace(/\n/g, ',')); if (n.length && groups[i]) { groups[i].items.push(...n); inp.value = ''; } });
    return {
      getContent: () => { pend(); return { groups: groups.map(g => ({ name: g.name.trim(), items: g.items.map(x => x.trim()).filter(Boolean) })) }; },
      validate() {
        pend();
        const errs = [];
        groups.forEach((g, i) => {
          if (!g.name.trim()) errs.push(`Grupo ${i + 1}: escribe el nombre.`);
          if (!g.items.length) errs.push(`Grupo ${i + 1}: agrega al menos un elemento.`);
        });
        const all = groups.flatMap(g => g.items.map(x => x.toLowerCase()));
        if (all.length < 4) errs.push('Agrega al menos 4 elementos en total.');
        if (all.length > 40) errs.push('Máximo 40 elementos.');
        if (new Set(all).size !== all.length) errs.push('Hay elementos repetidos.');
        return errs;
      },
    };
  },

  // Juego: todas las fichas a la vista; se arrastran (o se toca la ficha y luego el grupo) y los grupos se van llenando.
  render(root, content, saved, { onProgreso, onTerminar }) {
    const deck = content.groups.flatMap((g, gi) => g.items.map((_, ii) => [gi, ii]));
    const total = deck.length;
    const st = saved || { order: shuffle(deck), pos: 0, answers: [] };
    // Intentos viejos (una ficha por vez) no guardaban la clave: se deduce del orden.
    st.answers.forEach((a, k) => { a.key ??= (st.order[k] || []).join(':'); });
    const save = () => { st.pos = st.answers.length; onProgreso({ ...st, done: st.answers.length, total }); };
    let elegido = null;

    const draw = () => {
      const hide = evalMode.hide;
      const usadas = new Set(st.answers.map(a => a.key));
      const quedan = st.order.filter(([g, i]) => !usadas.has(`${g}:${i}`));
      root.innerHTML = '';
      const wrap = el(`<div>
        <div class="small muted" style="margin-bottom:6px">${st.answers.length} de ${total} · Arrastra cada palabra a su grupo</div>
        <div class="pool-chips" role="group" aria-label="Palabras por clasificar">${quedan.map(([g, i]) => `<button type="button" class="chip classify-chip ${elegido === `${g}:${i}` ? 'sel' : ''}" draggable="true" data-key="${g}:${i}" aria-pressed="${elegido === `${g}:${i}`}">${esc(content.groups[g].items[i])}</button>`).join('')}</div>
        <div class="bins" style="--cols:${content.groups.length}"></div>
        <div class="fb-slot" role="status" aria-live="polite"></div>
      </div>`);
      const bins = wrap.querySelector('.bins');
      content.groups.forEach((g, gi) => {
        const placed = st.answers.filter(a => (hide ? a.givenGroup ?? a.group : a.group) === gi);
        const bin = el(`<div class="bin drop" data-g="${gi}">
          <button class="btn bin-btn" type="button">${esc(g.name)}</button>
          <div class="bin-items">${placed.map(a => hide ? `<span class="bin-chip">${esc(a.question)}</span>` : `<span class="bin-chip ${a.correct ? 'ok' : 'bad'}" title="${a.correct ? '' : `Lo pusiste en ${esc(a.given)}`}">${esc(a.question)}${a.correct ? '' : ' ✗'}</span>`).join('')}</div>
        </div>`);
        bin.querySelector('button').onclick = () => { if (elegido) colocar(elegido, gi); };
        bin.onclick = e => { if (elegido && !e.target.closest('button')) colocar(elegido, gi); };
        bin.addEventListener('dragover', e => { e.preventDefault(); bin.classList.add('sobre'); });
        bin.addEventListener('dragleave', () => bin.classList.remove('sobre'));
        bin.addEventListener('drop', e => { e.preventDefault(); bin.classList.remove('sobre'); const k = e.dataTransfer.getData('text/plain'); if (k) colocar(k, gi); });
        bins.append(bin);
      });
      wrap.querySelectorAll('.classify-chip').forEach(c => {
        c.onclick = () => { elegido = elegido === c.dataset.key ? null : c.dataset.key; draw(); };
        c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', c.dataset.key); });
      });
      root.append(wrap);
    };

    const colocar = (key, gi) => {
      if (st.answers.some(a => a.key === key)) return;
      const [cg, ci] = key.split(':').map(Number);
      const word = content.groups[cg].items[ci];
      st.answers.push({ key, item: st.answers.length, question: word, given: content.groups[gi].name, expected: content.groups[cg].name, group: cg, givenGroup: gi, correct: gi === cg });
      elegido = null;
      save(); draw();
      if (st.answers.length >= total) setTimeout(finish, 700);
    };

    const finish = () => onTerminar({ score: st.answers.filter(a => a.correct).length, maxScore: total, answers: st.answers });

    save();
    if (st.answers.length >= total) finish(); else draw();
  },
};
