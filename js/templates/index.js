// Registro de plantillas. Para añadir un tipo: crear su módulo con el mismo contrato y listarlo aquí.
import quiz from './quiz.js';
import matching from './matching.js';
import fill from './fill.js';
import reorder from './reorder.js';
import classify from './classify.js';
import memory from './memory.js';
import reading from './reading.js';
import listening from './listening.js';
import dictation from './dictation.js';
import wordsearch from './wordsearch.js';
import hangman from './hangman.js';
import crossword from './crossword.js';
import anagram from './anagram.js';
import diagram from './diagram.js';
import random from './random.js';

// Diagrama con etiquetas: sin publicar todavía (2026-11-22). Solo aparece con el servidor local, no en GitHub Pages.
export const SOLO_LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

export const templateList = [quiz, matching, fill, reorder, classify, memory, reading, listening, dictation, wordsearch, hangman, crossword, anagram,
  ...(SOLO_LOCAL ? [diagram] : []), random];
export const templates = Object.fromEntries(templateList.map(t => [t.type, t]));
