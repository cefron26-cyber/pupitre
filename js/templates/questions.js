// Bloque reutilizable de preguntas de opción múltiple / verdadero-falso.
// Lo usan Quiz, Lectura y Audio. Pregunta: { q, options[], correct, tf? }  (tf = verdadero/falso, sin barajar)
import { el, esc, icons, shuffle, evalMode, neutralFb, confirmDialog } from '../ui.js';

const LETTERS = 'ABCD';
const TF = ['True', 'False'];

export const emptyQuestion = () => ({ q: '', options: ['', ''], correct: 0 });

export function questionsEditor(root, initial, { allowEmpty = false } = {}) {
  const qs = structuredClone(initial);
  const draw = () => {
    root.innerHTML = '';
    qs.forEach((item, qi) => {
      const box = el(`<div class="panel editor-item">
        <div class="row between"><div class="num">Pregunta ${qi + 1}${item.tf ? ' · Verdadero/Falso' : ''}</div>
          <button class="icon-btn" type="button" data-del aria-label="Eliminar pregunta ${qi + 1}" ${qs.length === 1 && !allowEmpty ? 'disabled' : ''}>×</button></div>
        <div class="field"><input data-q placeholder="${item.tf ? 'Escribe una afirmación (ej. Tom lives in London.)' : 'Escribe la pregunta'}" value="${esc(item.q)}" aria-label="Texto de la pregunta ${qi + 1}"></div>
        <div data-opts class="opts-grid ${item.tf ? 'tf' : ''}"></div>
        <button class="btn ghost sm" type="button" data-add-opt ${item.tf || item.options.length >= 4 ? 'hidden' : ''}>${icons.plus} Opción</button>
      </div>`);
      box.querySelector('[data-q]').oninput = e => { item.q = e.target.value; };
      box.querySelector('[data-del]').onclick = () => { qs.splice(qi, 1); draw(); };
      box.querySelector('[data-add-opt]').onclick = () => { item.options.push(''); draw(); };
      const opts = box.querySelector('[data-opts]');
      item.options.forEach((o, oi) => {
        const r = el(item.tf
          ? `<label class="opt-row opt-box"><input type="radio" class="ok-radio" name="c${qi}" ${item.correct === oi ? 'checked' : ''}> ${oi === 0 ? 'Verdadero (True)' : 'Falso (False)'}</label>`
          : `<div class="opt-row opt-box">
          <input type="radio" class="ok-radio" name="c${qi}" ${item.correct === oi ? 'checked' : ''} aria-label="Marcar opción ${LETTERS[oi]} como correcta" title="Marcar como correcta">
          <input class="grow" placeholder="Opción ${LETTERS[oi]}" value="${esc(o)}" aria-label="Opción ${LETTERS[oi]}">
          <button class="icon-btn opt-x" type="button" aria-label="Quitar opción ${LETTERS[oi]}" ${item.options.length <= 2 ? 'hidden' : ''}>×</button>
        </div>`);
        r.querySelector('input[type=radio]').onchange = () => { item.correct = oi; };
        if (!item.tf) {
          r.querySelector('input.grow').oninput = e => { item.options[oi] = e.target.value; };
          r.querySelector('button').onclick = () => {
            item.options.splice(oi, 1);
            if (item.correct >= item.options.length || item.correct === oi) item.correct = 0;
            else if (item.correct > oi) item.correct--;
            draw();
          };
        }
        opts.append(r);
      });
      root.append(box);
    });
    const bar = el(`<div class="row" style="margin-top:12px">
      <button class="btn ghost" type="button" data-mc>${icons.plus} Pregunta</button>
      <button class="btn ghost" type="button" data-tf>${icons.plus} Verdadero / Falso</button></div>`);
    bar.querySelector('[data-mc]').onclick = () => { qs.push(emptyQuestion()); draw(); root.querySelectorAll('[data-q]')[qs.length - 1]?.focus(); };
    bar.querySelector('[data-tf]').onclick = () => { qs.push({ q: '', options: [...TF], correct: 0, tf: true }); draw(); root.querySelectorAll('[data-q]')[qs.length - 1]?.focus(); };
    root.append(bar);
  };
  draw();
  return {
    get: () => qs.map(q => ({ q: q.q.trim(), options: q.options.map(o => o.trim()), correct: q.correct, ...(q.tf ? { tf: true } : {}) })),
    validate() {
      const errs = [];
      if (!qs.length && !allowEmpty) errs.push('Agrega al menos una pregunta.');
      qs.forEach((q, i) => {
        if (!q.q.trim()) errs.push(`Pregunta ${i + 1}: escribe el enunciado.`);
        if (q.tf) return;
        if (q.options.some(o => !o.trim())) errs.push(`Pregunta ${i + 1}: completa todas las opciones.`);
        else if (new Set(q.options.map(o => o.trim().toLowerCase())).size !== q.options.length) errs.push(`Pregunta ${i + 1}: hay opciones repetidas.`);
      });
      return errs;
    },
  };
}

// Reproductor: st = { i, answers, orders } (se crea si falta). onChange() tras cada cambio; onDone(answers) al final.
export function questionsPlayer(root, questions, st, { onChange, onDone }) {
  const total = questions.length;
  st.i ??= 0; st.answers ??= [];
  st.orders ??= questions.map(q => q.tf ? q.options.map((_, k) => k) : shuffle(q.options.map((_, k) => k)));

  // Evaluación con respuestas ocultas (estilo examen de Cambridge): un clic guarda y pasa a la siguiente,
  // se puede volver a cualquier pregunta y cambiarla, y al final se revisa y se envía con confirmación.
  const examen = evalMode.hide;
  const navHTML = () => `<nav class="q-nav" aria-label="Preguntas">${questions.map((_, k) => `<button type="button" data-k="${k}" class="${st.answers.some(a => a.q === k) ? 'hecha' : ''} ${k === st.i ? 'actual' : ''}" aria-label="Pregunta ${k + 1}${st.answers.some(a => a.q === k) ? ', respondida' : ''}" ${k === st.i ? 'aria-current="step"' : ''}>${k + 1}</button>`).join('')}</nav>`;
  const enviar = async () => {
    const faltan = total - st.answers.length;
    if (await confirmDialog(faltan ? `Te faltan ${faltan} pregunta${faltan === 1 ? '' : 's'} sin responder. ¿Enviar de todos modos? Ya no podrás cambiar tus respuestas.` : '¿Enviar tus respuestas? Ya no podrás cambiarlas.', 'Enviar')) {
      st.answers.sort((x, y) => x.q - y.q); onDone(st.answers);
    }
  };
  const revisar = () => {
    st.i = total; onChange();
    root.innerHTML = '';
    const box = el(`<div class="q-review">${navHTML()}
      <h3>Revisa antes de enviar</h3>
      <p>${st.answers.length} de ${total} respondidas. Toca un número para cambiar una respuesta.</p>
      <button class="btn" type="button" data-send>Enviar respuestas</button></div>`);
    box.querySelector('[data-send]').onclick = enviar;
    box.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { st.i = +b.dataset.k; onChange(); draw(); }; });
    root.append(box);
  };

  const draw = () => {
    if (examen && st.i >= total) return revisar();
    const q = questions[st.i];
    const ans = st.answers.find(a => a.q === st.i);
    root.innerHTML = '';
    const wrap = el(`<div>
      ${examen ? navHTML() : ''}
      <div class="small muted" style="margin-bottom:6px">Pregunta ${st.i + 1} de ${total}${q.tf ? ' · ¿Verdadero o falso?' : ''}</div>
      <p class="q-title">${esc(q.q)}</p>
      <div class="options ${q.tf ? 'tf' : ''}" role="group" aria-label="Opciones"></div>
      <div class="fb-slot" role="status" aria-live="polite"></div>
    </div>`);
    const box = wrap.querySelector('.options');
    st.orders[st.i].forEach((oi, pos) => {
      const label = q.tf ? (oi === 0 ? 'True' : 'False') : q.options[oi];
      const b = el(`<button class="option" type="button"><span class="key">${q.tf ? (oi === 0 ? 'T' : 'F') : LETTERS[pos]}</span><span>${esc(label)}</span></button>`);
      b.dataset.oi = oi;
      b.onclick = () => choose(oi);
      box.append(b);
    });
    if (examen) {
      wrap.querySelectorAll('.q-nav [data-k]').forEach(b => { b.onclick = () => { st.i = +b.dataset.k; onChange(); draw(); }; });
      wrap.append(el(`<div class="q-exam-bar"><button class="btn ghost" type="button" data-prev ${st.i === 0 ? 'disabled' : ''}>← Anterior</button>
        <button class="btn ${st.answers.length === total ? '' : 'ghost'}" type="button" data-rev>Revisar y enviar</button></div>`));
      wrap.querySelector('[data-prev]').onclick = () => { st.i--; onChange(); draw(); };
      wrap.querySelector('[data-rev]').onclick = () => { st.i = total; onChange(); draw(); };
      root.append(wrap);
      if (ans) wrap.querySelectorAll('.option').forEach(b => b.classList.toggle('picked', +b.dataset.oi === ans.givenIndex));
      return;
    }
    root.append(wrap);
    if (ans) showFeedback(ans);
  };

  const choose = oi => {
    const q = questions[st.i];
    const ans = { q: st.i, question: q.q, given: q.options[oi], givenIndex: oi, expected: q.options[q.correct], correct: oi === q.correct };
    if (examen) {
      // Guardar (o cambiar) y pasar sola a la siguiente sin responder; si no queda ninguna, a revisar.
      st.answers = st.answers.filter(a => a.q !== st.i).concat(ans);
      root.querySelectorAll('.option').forEach(b => b.classList.toggle('picked', +b.dataset.oi === oi));
      onChange();
      setTimeout(() => {
        const sig = questions.findIndex((_, k) => k > st.i && !st.answers.some(a => a.q === k));
        const otra = sig >= 0 ? sig : questions.findIndex((_, k) => !st.answers.some(a => a.q === k));
        st.i = otra >= 0 ? otra : total; onChange(); draw();
      }, 350);
      return;
    }
    if (st.answers.some(a => a.q === st.i)) return;
    st.answers.push(ans);
    onChange();
    showFeedback(ans);
  };

  const showFeedback = ans => {
    const q = questions[st.i];
    const hide = evalMode.hide;
    root.querySelectorAll('.option').forEach(b => {
      b.disabled = true;
      const oi = +b.dataset.oi;
      if (hide) { if (oi === ans.givenIndex) b.classList.add('picked'); return; }
      if (oi === q.correct) b.classList.add('correct');
      else if (oi === ans.givenIndex) b.classList.add('wrong');
    });
    const last = st.i === total - 1;
    const fb = el(`<div class="feedback ${hide ? 'neutral' : ans.correct ? 'ok' : 'bad'}">
      ${hide ? neutralFb() : `<span>${ans.correct ? '¡Correcto!' : `La respuesta era: <b>${esc(q.options[q.correct])}</b>`}</span>`}
      <button class="btn" type="button">${last ? evalMode.fin : 'Siguiente'}</button></div>`);
    fb.querySelector('button').onclick = next;
    root.querySelector('.fb-slot').replaceChildren(fb);
    fb.querySelector('button').focus({ preventScroll: true });
  };

  const next = () => {
    if (st.i < total - 1) { st.i++; onChange(); draw(); return; }
    onDone(st.answers);
  };

  // Atajos: 1-4 o A-D (T/F en verdadero/falso). Enter ya activa "Siguiente" porque queda con el foco.
  const onKey = e => {
    if (!root.isConnected || root.__qkey !== onKey) return document.removeEventListener('keydown', onKey);
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea, select')) return;
    if (st.i >= total || (!examen && st.answers.some(a => a.q === st.i))) return;
    const q = questions[st.i], k = e.key.toUpperCase();
    let pos = '1234'.indexOf(k);
    if (pos === -1 && k.length === 1) pos = q.tf ? 'TF'.indexOf(k) : LETTERS.indexOf(k);
    if (pos < 0 || pos >= st.orders[st.i].length) return;
    e.preventDefault(); choose(st.orders[st.i][pos]);
  };
  root.__qkey = onKey;
  document.addEventListener('keydown', onKey);

  draw();
}
