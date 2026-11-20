// Sección Juegos (2026-11-19): juegos de inglés hechos aparte (carpeta Juegos/) que ya están listos, dentro de la plataforma.
// Cada juego es un HTML que funciona solo (sin internet), copiado en juegos/<id>/. Aquí solo va el envoltorio con la marca:
// la lista de tarjetas y la pantalla de juego (a pantalla completa para el estudiante; con "Pantalla completa" para el docente).
// Para agregar uno: copiar sus archivos a juegos/<id>/, su portada a img/juegos/<id>.webp y sumarlo a JUEGOS.
import { esc, el, $, toast } from '../ui.js';
import { events } from '../storage.js';

export const JUEGOS = [
  { id: 'verb-cutter', titulo: 'Verb Cutter', grados: '5° y 6°', tema: 'Verbos: presente, pasado y participio',
    desc: 'Corta la fruta con el verbo correcto antes de que caiga. Evita las podridas y las bombas.', vertical: false },
  { id: 'verb-climber', titulo: 'Verb Climber', grados: '6°', tema: 'Verbos en presente y pasado',
    desc: 'Sube por las plataformas eligiendo el verbo correcto y escapa de la marea.', vertical: true },
  { id: 'corner-shop', titulo: 'Corner Shop', grados: '5°', tema: 'Comida: contables e incontables, envases, a / an / any',
    desc: 'Escucha el pedido del cliente, recorre los pasillos y llena la canasta.', vertical: false },
];

export async function juegosList(root, { user }) {
  const docente = user.role === 'teacher';
  const base = docente ? '#/t/juego/' : '#/s/juego/';
  root.innerHTML = `<div class="page-head"><div><h1>Juegos</h1><p class="muted">${JUEGOS.length} juegos de inglés${docente ? ' para jugar en clase o dejar de práctica' : ''}</p></div></div>
    <div class="juego-grid">${JUEGOS.map(j => `<a class="juego-card" href="${base}${j.id}">
      <span class="juego-cover ${j.vertical ? 'vertical' : ''}"><img src="img/juegos/${j.id}.webp" alt="" loading="lazy"></span>
      <span class="juego-body"><b>${esc(j.titulo)}</b><span class="juego-tema">${esc(j.tema)}</span><span class="juego-desc">${esc(j.desc)}</span>
        <span class="juego-meta"><span class="badge">${esc(j.grados)}</span><span class="juego-go">${docente ? 'Abrir' : 'Jugar'} →</span></span></span></a>`).join('')}</div>`;
}

export async function juegoPlay(root, { user, params }) {
  const j = JUEGOS.find(x => x.id === params.id);
  const docente = user.role === 'teacher';
  const volver = docente ? '#/t/juegos' : '#/s/juegos';
  if (!j) { location.hash = volver; return; }
  events.log(user.id, 'open_game', { game: j.id });
  root.innerHTML = `<div class="juego-shell ${docente ? 'docente' : ''}">
    <div class="juego-bar">
      <a class="juego-x" href="${volver}" aria-label="Salir del juego">×</a>
      <b>${esc(j.titulo)}</b><span class="juego-bar-tema">${esc(j.tema)}</span>
      <button class="btn ghost sm" type="button" id="full">Pantalla completa</button>
    </div>
    <iframe class="juego-frame" src="juegos/${j.id}/index.html" title="${esc(j.titulo)}" allow="autoplay; fullscreen; vibrate" allowfullscreen></iframe></div>`;
  const shell = $('.juego-shell', root), frame = $('.juego-frame', root);
  $('#full', root).onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else (frame.requestFullscreen?.() || Promise.reject()).catch(() => toast('El navegador no permitió la pantalla completa.', 'err'));
  };
  frame.addEventListener('load', () => frame.focus());
  return () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); shell.remove(); };
}
