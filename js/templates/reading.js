// Plantilla Lectura: un texto + preguntas de comprensión (opción múltiple o verdadero/falso).
import { el, esc, icons } from '../ui.js';
import { questionsEditor, questionsPlayer, emptyQuestion } from './questions.js';

// Párrafos separados por línea en blanco.
export const paragraphs = text => text.split(/\n\s*\n/).map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');

export default {
  type: 'reading',
  label: 'Lectura',
  plural: 'Lecturas',
  description: 'Un texto para leer con preguntas de comprensión (opción múltiple o verdadero/falso).',
  icon: icons.reading,

  empty: () => ({ title: '', text: '', questions: [emptyQuestion()] }),
  summary: c => `${c.text.trim().split(/\s+/).filter(Boolean).length} palabras · ${c.questions.length} pregunta${c.questions.length === 1 ? '' : 's'}`,

  editor(root, content) {
    const data = { title: content.title || '', text: content.text };
    root.innerHTML = `
      <div class="field"><label>Título del texto <span class="muted">(opcional)</span></label>
        <input data-t placeholder="Ej. A day at the zoo" value="${esc(data.title)}"></div>
      <div class="field"><label>Texto</label>
        <textarea data-x rows="9" placeholder="Pega o escribe aquí la lectura. Deja una línea en blanco entre párrafos.">${esc(data.text)}</textarea>
        <p class="hint" data-count></p></div>
      <h3 style="margin-top:8px">Preguntas</h3>
      <div data-q></div>`;
    const count = root.querySelector('[data-count]');
    const upd = () => { const n = data.text.trim().split(/\s+/).filter(Boolean).length; count.textContent = n ? `${n} palabras` : ''; };
    upd();
    root.querySelector('[data-t]').oninput = e => { data.title = e.target.value; };
    root.querySelector('[data-x]').oninput = e => { data.text = e.target.value; upd(); };
    const qs = questionsEditor(root.querySelector('[data-q]'), content.questions);
    return {
      getContent: () => ({ title: data.title.trim(), text: data.text.trim(), questions: qs.get() }),
      validate: () => [...(data.text.trim().split(/\s+/).length < 15 ? ['Escribe un texto de al menos 15 palabras.'] : []), ...qs.validate()],
    };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const total = content.questions.length;
    const st = saved || {};
    const save = () => onProgreso({ ...st, done: st.answers.length, total });
    root.innerHTML = '';
    const wrap = el(`<div class="reading-2col">
      <details class="passage" open>
        <summary>${icons.reading}<span>${esc(content.title || 'Lee el texto')}</span><span class="small muted passage-toggle"></span></summary>
        <div class="passage-body">${paragraphs(content.text)}</div>
      </details>
      <div data-q></div>
    </div>`);
    root.append(wrap);
    questionsPlayer(wrap.querySelector('[data-q]'), content.questions, st, {
      onChange: save,
      onDone: answers => onTerminar({ score: answers.filter(a => a.correct).length, maxScore: total, answers }),
    });
    save();
  },
};
