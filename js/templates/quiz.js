// Plantilla Quiz. Contrato común a todas las plantillas:
//   type, label, plural, description, icon
//   empty()                         → contenido vacío
//   summary(content)                → texto corto ("3 preguntas")
//   editor(contenedor, content)     → { getContent(), validate() → string[] }
//   render(contenedor, content, estadoGuardado, { onProgreso, onTerminar }) → opcional { destroy() }
//      onProgreso(estado)  estado = { done, total, ...lo que la plantilla necesite para retomar }
//      onTerminar({ score, maxScore, answers[] })   (la plataforma añade durationSec)
import { icons } from '../ui.js';
import { questionsEditor, questionsPlayer, emptyQuestion } from './questions.js';

export default {
  type: 'quiz',
  label: 'Quiz',
  plural: 'Quizzes',
  description: 'Preguntas con 2 a 4 opciones o de verdadero/falso.',
  icon: icons.quiz,

  empty: () => ({ questions: [emptyQuestion()] }),
  summary: c => `${c.questions.length} pregunta${c.questions.length === 1 ? '' : 's'}`,

  editor(root, content) {
    const ed = questionsEditor(root, content.questions);
    return { getContent: () => ({ questions: ed.get() }), validate: ed.validate };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const total = content.questions.length;
    const st = saved || {};
    const save = () => onProgreso({ ...st, done: st.answers.length, total });
    questionsPlayer(root, content.questions, st, {
      onChange: save,
      onDone: answers => onTerminar({ score: answers.filter(a => a.correct).length, maxScore: total, answers }),
    });
    save();
  },
};
