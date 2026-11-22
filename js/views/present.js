// Docente: presentar en clase (como Wordwall). La actividad o la unidad se proyecta en grande, pregunta por pregunta,
// con flechas para ir y volver. No se guarda nada. El reloj (cronómetro o cuenta regresiva) lo activa el docente aquí.
import { activities, units } from '../storage.js';
import { esc, el, $, icons, fmtDuration } from '../ui.js';
import { templates } from '../templates/index.js';
import { mountPlayer } from '../player.js';
import { gradeLabel } from '../logic.js';
import { mundoHTML } from '../mundo.js';
import { THEMES, themeById, DEFAULT_THEME } from '../temas.js';

// Preferencias del docente en este navegador (solo comodidad).
const pref = (k, d) => { try { return localStorage.getItem('plat.present.' + k) ?? d; } catch { return d; } };
const setPref = (k, v) => { try { localStorage.setItem('plat.present.' + k, v); } catch {} };

// Parte una actividad en diapositivas de una pregunta. Emparejar, Memoria, Sopa de letras y Crucigrama son un tablero: una sola diapositiva.
export function slicesOf(act) {
  const c = act.content;
  const one = (key, list) => list.map(x => ({ ...c, [key]: [x] }));
  switch (act.type) {
    case 'quiz': case 'reading': case 'listening': return c.questions?.length ? one('questions', c.questions) : [c];
    case 'fill': case 'reorder': case 'dictation': case 'hangman': case 'anagram': return c.items?.length ? one('items', c.items) : [c];
    case 'classify': {
      const flat = c.groups.flatMap((g, gi) => g.items.map(item => ({ gi, item })));
      return flat.length ? flat.map(({ gi, item }) => ({ ...c, groups: c.groups.map((g, k) => ({ ...g, items: k === gi ? [item] : [] })) })) : [c];
    }
    default: return [c];
  }
}

// Respuesta de la diapositiva (para "Mostrar respuesta" en clase). Tableros completos: sin respuesta corta.
function respuestaDe(act, c) {
  switch (act.type) {
    case 'quiz': case 'reading': case 'listening': { const q = c.questions?.[0]; return q ? q.options[q.correct] : ''; }
    case 'fill': return (c.items?.[0]?.text.match(/\{\{(.+?)\}\}/g) || []).map(m => m.slice(2, -2).split('|')[0]).join(' · ');
    case 'reorder': return c.items?.[0]?.sentence || '';
    case 'dictation': return c.items?.[0]?.text || '';
    case 'hangman': case 'anagram': return c.items?.[0]?.word || '';
    case 'classify': { const g = c.groups.find(x => x.items.length); return g ? `${g.items[0]} → ${g.name}` : ''; }
    default: return '';
  }
}

// params.id = actividad; con query.unit = id de unidad (params.id = posición de la actividad, desde 1).
export async function present(root, { params, query }) {
  let list, unit = null;
  if (query.unit) {
    unit = await units.get(query.unit);
    list = unit ? (await Promise.all(unit.activityIds.map(id => activities.get(id)))).filter(Boolean) : [];
  } else {
    const a = await activities.get(params.id);
    list = a ? [a] : [];
  }
  if (!list.length) { root.innerHTML = '<div class="card empty">No hay nada para presentar. <a href="#/t/activities">Volver</a></div>'; return; }
  const back = unit ? '#/t/units' : '#/t/activities';

  // Todas las diapositivas seguidas (en una unidad, las de cada actividad una tras otra).
  const slides = list.flatMap((act, ai) => { const s = slicesOf(act); return s.map((content, qi) => ({ act, ai, qi, of: s.length, content })); });
  let idx = unit ? Math.max(0, slides.findIndex(s => s.ai === Math.min(list.length, Math.max(1, Number(params.id) || 1)) - 1)) : 0;

  const html = document.documentElement;
  document.body.classList.add('presenting');
  // Estilo visual en clase: 'auto' = el de cada actividad; o uno fijo para toda la presentación.
  let tema = THEMES.some(t => t.id === pref('tema', 'auto')) ? pref('tema', 'auto') : 'auto';
  let clockMode = pref('clock', 'none');          // 'none' | 'up' | 'down'
  let clockSecs = Number(pref('secs', '30')) || 30; // cuenta regresiva por pregunta
  // "Sencillo" se presenta con el estilo institucional; los demás, sobre el fondo del portal de juegos.
  const applyStyle = act => {
    const style = themeById(tema === 'auto' ? act.theme || DEFAULT_THEME : tema).id === 'sencillo' ? 'serio' : 'juego';
    if (html.dataset.modo === style && (style === 'serio' || document.querySelector('.mundo'))) return;
    html.dataset.modo = style;
    document.querySelectorAll('.mundo, .suelo').forEach(x => x.remove());
    if (style === 'juego') document.getElementById('app').insertAdjacentHTML('beforeend', mundoHTML({ conSuelo: false }));
  };

  let player = null, clockTimer = null;
  // Marcador por equipos (opcional, como un tablero de puntos de la clase). Vive solo durante la presentación.
  let marcador = null;
  const stopClock = () => { clearInterval(clockTimer); clockTimer = null; };

  // Reloj grande de la clase (independiente de la actividad): cronómetro o cuenta regresiva por pregunta.
  const startClock = () => {
    stopClock();
    const box = $('#bigclock', root);
    if (!box) return;
    if (clockMode === 'none') { box.hidden = true; return; }
    box.hidden = false;
    let t = 0, paused = false;
    const show = () => {
      const left = clockSecs - t;
      box.querySelector('b').textContent = fmtDuration(clockMode === 'down' ? Math.max(0, left) : t);
      box.classList.toggle('warn', clockMode === 'down' && left <= 5 && left > 0);
      box.classList.toggle('over', clockMode === 'down' && left <= 0);
    };
    show();
    box.querySelector('[data-c="pause"]').onclick = e => { paused = !paused; e.currentTarget.textContent = paused ? 'Seguir' : 'Pausa'; };
    box.querySelector('[data-c="reset"]').onclick = () => { t = 0; show(); };
    clockTimer = setInterval(() => {
      if (paused) return;
      if (clockMode === 'down' && t >= clockSecs) return;
      t++; show();
    }, 1000);
  };

  const draw = () => {
    player?.stop();
    const sl = slides[idx], act = sl.act, tpl = templates[act.type];
    root.innerHTML = `<div class="present-bar">
        <a class="btn ghost sm" href="${back}">← Salir</a>
        <div class="present-title"><b>${esc(act.title)}</b>
          <span class="small">${unit ? `${esc(unit.title)} · Actividad ${sl.ai + 1} de ${list.length} · ` : ''}${tpl.label} · ${gradeLabel(act.grade)}</span></div>
        <div class="row" style="gap:8px">
          ${respuestaDe(act, sl.content) ? '<button class="btn ghost sm" id="ans">Mostrar respuesta</button>' : ''}
          <button class="btn ghost sm" id="pts" aria-pressed="${!!marcador}">Puntos</button>
          <details class="more present-set"><summary class="btn ghost sm">Ajustes</summary>
            <div class="more-menu present-panel">
              <label>Reloj de la clase
                <select id="pclock">
                  <option value="none" ${clockMode === 'none' ? 'selected' : ''}>Apagado</option>
                  <option value="up" ${clockMode === 'up' ? 'selected' : ''}>Cronómetro</option>
                  <option value="down" ${clockMode === 'down' ? 'selected' : ''}>Cuenta regresiva</option></select></label>
              <label ${clockMode === 'down' ? '' : 'hidden'} id="psecsWrap">Segundos por pregunta
                <input id="psecs" type="number" min="5" max="600" step="5" value="${clockSecs}"></label>
              <label>Estilo visual
                <select id="ptema">
                  <option value="auto" ${tema === 'auto' ? 'selected' : ''}>El de la actividad</option>
                  ${THEMES.map(t => `<option value="${t.id}" ${tema === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></label>
              <button class="btn ghost sm" type="button" id="restart">Reiniciar esta pregunta</button>
            </div></details>
          <button class="btn sm" id="full">Pantalla completa</button>
        </div>
      </div>
      <div class="present-wrap">
        <button class="present-arrow prev" id="prev" aria-label="Pregunta anterior" ${idx === 0 ? 'disabled' : ''}>‹</button>
        <div class="present-stage" id="pstage"></div>
        <button class="present-arrow next" id="next" aria-label="Pregunta siguiente" ${idx === slides.length - 1 ? 'disabled' : ''}>›</button>
      </div>
      ${marcador ? `<div class="scoreboard" aria-label="Puntos por equipo">${marcador.map((e, k) => `<div class="team" style="--tc:${['#4b2fd6', '#ff7a3d', '#0f9d8a', '#d6336c'][k]}">
        <b>${esc(e.n)}</b><span class="team-p">${e.p}</span><span><button class="icon-btn" data-t="${k}" data-d="-1" aria-label="Quitar un punto a ${esc(e.n)}">−</button><button class="icon-btn" data-t="${k}" data-d="1" aria-label="Sumar un punto a ${esc(e.n)}">+</button></span></div>`).join('')}
        <button class="icon-btn" id="addTeam" aria-label="Agregar equipo" ${marcador.length >= 4 ? 'hidden' : ''}>+ equipo</button></div>` : ''}
      <div class="present-foot"><span class="present-count">${idx + 1} / ${slides.length}</span>
        <div class="bigclock" id="bigclock" hidden role="timer" aria-live="off"><b>0:00</b>
          <button class="btn ghost sm" data-c="pause">Pausa</button><button class="btn ghost sm" data-c="reset">Reiniciar reloj</button></div></div>`;
    applyStyle(act);
    player = mountPlayer($('#pstage', root), {
      activity: { ...act, content: sl.content },
      theme: tema === 'auto' ? null : tema,
      ceremonia: false, colores: true, // en clase se va pregunta por pregunta: sin portada ni cierre en cada una
      clock: { mode: 'none' }, // en clase manda el reloj grande del docente
      onFinish: () => {
        stopClock();
        const last = idx === slides.length - 1;
        const box = el(`<div class="present-next">${last
          ? '<b>¡Terminamos!</b><button class="btn ghost" data-a="first">Volver al inicio</button>'
          : '<span>Respondida.</span><button class="btn" data-a="next">Siguiente →</button>'}</div>`);
        box.addEventListener('click', e => {
          const a = e.target.closest('button')?.dataset.a;
          if (a === 'next') go(idx + 1);
          if (a === 'first') go(0);
        });
        $('#pstage', root).append(box);
      },
    });
    $('#prev', root).onclick = () => go(idx - 1);
    $('#next', root).onclick = () => go(idx + 1);
    $('#restart', root).onclick = draw;
    $('#ans', root)?.addEventListener('click', e => {
      const b = e.currentTarget, r = respuestaDe(act, sl.content);
      const box = $('#pstage', root).querySelector('.present-ans');
      if (box) { box.remove(); b.textContent = 'Mostrar respuesta'; return; }
      $('#pstage', root).append(el(`<div class="present-ans" role="status">Respuesta: <b>${esc(r)}</b></div>`));
      b.textContent = 'Ocultar respuesta';
    });
    $('#pts', root).onclick = () => { marcador = marcador ? null : [{ n: 'Equipo A', p: 0 }, { n: 'Equipo B', p: 0 }]; draw(); };
    root.querySelectorAll('.team [data-t]').forEach(b => b.onclick = () => { const t = marcador[+b.dataset.t]; t.p = Math.max(0, t.p + Number(b.dataset.d)); b.closest('.team').querySelector('.team-p').textContent = t.p; });
    $('#addTeam', root)?.addEventListener('click', () => { marcador.push({ n: `Equipo ${'ABCD'[marcador.length]}`, p: 0 }); draw(); });
    $('#ptema', root).onchange = e => { tema = e.target.value; setPref('tema', tema); draw(); };
    $('#pclock', root).onchange = e => { clockMode = e.target.value; setPref('clock', clockMode); $('#psecsWrap', root).hidden = clockMode !== 'down'; startClock(); };
    $('#psecs', root).onchange = e => { clockSecs = Math.min(600, Math.max(5, Math.round(Number(e.target.value)) || 30)); e.target.value = clockSecs; setPref('secs', clockSecs); startClock(); };
    const full = $('#full', root);
    const label = () => { full.textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa'; document.body.classList.toggle('present-full', !!document.fullscreenElement); };
    full.onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => {});
    label();
    document.onfullscreenchange = label;
    startClock(); // el reloj vuelve a empezar en cada pregunta
  };
  const go = i => {
    idx = Math.min(slides.length - 1, Math.max(0, i));
    if (unit) history.replaceState(null, '', `#/t/present/${slides[idx].ai + 1}?unit=${unit.id}`);
    draw();
  };
  // Flechas del teclado (o del control del proyector) para ir y volver, salvo mientras se escribe.
  const onKey = e => {
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(idx + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(idx - 1); }
  };
  addEventListener('keydown', onKey);
  draw();

  return () => {
    player?.stop(); stopClock();
    removeEventListener('keydown', onKey);
    document.body.classList.remove('presenting');
    document.querySelector('.mundo')?.remove();
    document.onfullscreenchange = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
}
