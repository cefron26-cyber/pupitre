// Plantilla Audio (listening): un audio + preguntas. El audio puede ser un archivo subido
// (guardado en IndexedDB) o un guion leído con las voces de Microsoft (varias voces en los diálogos,
// elegidas según quién habla; respaldo: voz del navegador). El docente limita las reproducciones.
// audio tts: { kind: 'tts', script, rate, voces?: { clave: voz } } — voces = solo las que eligió el docente.
import { el, esc, icons, toast, ttsAvailable } from '../ui.js';
import { VOCES, repartirVoces, segmentos, lineas, claveDe } from '../voces.mjs';
import { prepararVoz, reproducirVoz, detenerVoz, vozMicrosoft } from '../voz.js';

const ICONO_PARAR = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>';
import { files } from '../storage.js';
import { questionsEditor, questionsPlayer, emptyQuestion } from './questions.js';
import { paragraphs } from './reading.js';

const MAX_MB = 8;
const RATES = [[1, 'Normal'], [0.85, 'Un poco lento'], [0.7, 'Lento']];

export default {
  type: 'listening',
  label: 'Audio',
  plural: 'Audios',
  description: 'Listening: sube un audio o escribe un guion (o un diálogo con varias voces), con preguntas.',
  icon: icons.listening,

  empty: () => ({ audio: { kind: 'tts', script: '', rate: 1 }, maxPlays: 0, showScript: true, questions: [emptyQuestion()] }),
  summary: c => `${c.audio.kind === 'file' ? 'Audio subido' : 'Guion con voz'} · ${c.questions.length} pregunta${c.questions.length === 1 ? '' : 's'}`,

  editor(root, content) {
    const data = structuredClone(content);
    data.audio.script ??= ''; data.audio.rate ??= 1; data.audio.voces = { ...(data.audio.voces || {}) };
    root.innerHTML = `
      <label>Origen del audio</label>
      <div class="seg" role="radiogroup" aria-label="Origen del audio">
        <button type="button" class="seg-btn" data-kind="tts" role="radio">Escribir guion o diálogo</button>
        <button type="button" class="seg-btn" data-kind="file" role="radio">Subir archivo de audio</button>
      </div>
      <div class="panel" data-tts>
        <div class="field"><label>Guion en inglés</label>
          <textarea data-s rows="7" placeholder="Waiter: Good evening! Are you ready to order?&#10;Mom: Yes, the chicken soup, please.&#10;Tom: Can I have a pizza?">${esc(data.audio.script)}</textarea>
          <p class="hint" style="margin:6px 0 0">Para un diálogo, empieza cada línea con quién habla y dos puntos (<b>Tom:</b> Hi!). Cada personaje suena con una voz distinta según quién es: Mom, Grandpa, Waiter, Lucy… Las líneas sin nombre las lee una narradora.</p></div>
        <div class="voz-lista" data-voces></div>
        <div class="row">
          <select data-rate style="max-width:200px" aria-label="Velocidad">${RATES.map(([v, l]) => `<option value="${v}" ${data.audio.rate == v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <button class="btn ghost" type="button" data-try>${icons.play} Escuchar</button>
        </div>
        <p class="hint" data-aviso hidden style="color:var(--danger)"></p>
      </div>
      <div class="panel" data-file>
        <label class="btn ghost" style="cursor:pointer">Elegir audio (mp3, m4a, wav · máx. ${MAX_MB} MB)
          <input type="file" accept="audio/*" hidden data-f></label>
        <div data-prev style="margin-top:12px"></div>
      </div>
      <div class="row" style="margin:16px 0">
        <div style="flex:1 1 200px"><label>Reproducciones permitidas</label>
          <select data-max>${[[0, 'Sin límite'], [1, '1 vez'], [2, '2 veces'], [3, '3 veces']].map(([v, l]) => `<option value="${v}" ${data.maxPlays == v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <label class="opt-row" style="flex:1 1 200px;margin-top:22px;font-weight:600"><input type="checkbox" data-show ${data.showScript ? 'checked' : ''} style="width:20px;height:20px"> Mostrar el texto al terminar</label>
      </div>
      <h3>Preguntas</h3>
      <div data-q></div>`;
    const $ = s => root.querySelector(s);
    const setKind = k => {
      data.audio.kind = k;
      root.querySelectorAll('.seg-btn').forEach(b => { b.classList.toggle('active', b.dataset.kind === k); b.setAttribute('aria-checked', b.dataset.kind === k); });
      $('[data-tts]').hidden = k !== 'tts';
      $('[data-file]').hidden = k !== 'file';
      $('[data-show]').closest('label').hidden = k !== 'tts';
    };
    root.querySelectorAll('.seg-btn').forEach(b => { b.onclick = () => setKind(b.dataset.kind); });
    setKind(data.audio.kind);
    // Voces: una fila por personaje (o "Narración"), con la voz del contexto o la que elija el docente.
    const OPCIONES = Object.entries(VOCES);
    const dibujarVoces = () => {
      const caja = $('[data-voces]');
      const reparto = repartirVoces(data.audio.script, data.audio.voces);
      if (!reparto.length) { caja.innerHTML = ''; return; }
      caja.innerHTML = '<label>Voces</label>' + reparto.map(r => `<div class="voz-fila">
        <span class="voz-quien">${r.nombre ? esc(r.nombre) : 'Narración'}</span>
        <select data-k="${esc(r.clave)}" aria-label="Voz de ${esc(r.nombre || 'la narración')}">
          <option value="">Automática${r.auto ? `: ${VOCES[r.voz].nombre}` : ''}</option>
          ${OPCIONES.map(([id, v]) => `<option value="${id}" ${!r.auto && r.voz === id ? 'selected' : ''}>${v.nombre}</option>`).join('')}
        </select>
        <button class="icon-btn" type="button" data-oir aria-label="Escuchar la voz de ${esc(r.nombre || 'la narración')}" title="Escuchar esta voz">${icons.play}</button>
      </div>`).join('');
      caja.querySelectorAll('.voz-fila').forEach((fila, i) => {
        const r = reparto[i];
        fila.querySelector('select').onchange = e => {
          if (e.target.value) data.audio.voces[r.clave] = e.target.value; else delete data.audio.voces[r.clave];
          dibujarVoces();
        };
        fila.querySelector('[data-oir]').onclick = () => {
          const l = lineas(data.audio.script).find(x => claveDe(x.quien) === r.clave);
          if (l) reproducirVoz([{ texto: l.texto, voz: r.voz }], { velocidad: data.audio.rate });
        };
      });
    };
    let espera;
    $('[data-s]').oninput = e => { data.audio.script = e.target.value; clearTimeout(espera); espera = setTimeout(dibujarVoces, 350); };
    $('[data-rate]').onchange = e => { data.audio.rate = +e.target.value; };
    dibujarVoces();
    vozMicrosoft().then(ok => {
      if (ok || !root.isConnected) return;
      const a = $('[data-aviso]');
      a.hidden = false;
      if (ttsAvailable()) a.style.color = 'var(--muted)';
      a.textContent = ttsAvailable() ? 'Se usan las voces de este dispositivo: cada personaje con una voz y un tono distintos. Pueden sonar un poco diferente en el celular de cada estudiante.'
        : 'Este navegador no tiene voces en inglés. Sube un archivo de audio o abre la plataforma en Chrome o Edge.';
    });
    const probar = $('[data-try]');
    let sonando = false;
    probar.onclick = async () => {
      if (sonando) { detenerVoz(); return; }
      if (!data.audio.script.trim()) return toast('Escribe primero el guion.');
      sonando = true;
      probar.innerHTML = '<span class="ia-spin" aria-hidden="true"></span> Preparando voces…';
      await reproducirVoz(segmentos(data.audio.script, data.audio.voces), {
        velocidad: data.audio.rate,
        onInicio: () => { probar.innerHTML = `${ICONO_PARAR} Detener`; },
      });
      sonando = false;
      probar.innerHTML = `${icons.play} Escuchar`;
    };
    $('[data-max]').onchange = e => { data.maxPlays = +e.target.value; };
    $('[data-show]').onchange = e => { data.showScript = e.target.checked; };

    const showPreview = async () => {
      const box = $('[data-prev]');
      if (!data.audio.fileId) { box.innerHTML = '<p class="hint" style="margin:0">Aún no has subido un audio.</p>'; return; }
      const blob = await files.get(data.audio.fileId).catch(() => null);
      box.innerHTML = blob ? `<p class="small" style="margin:0 0 6px"><b>${esc(data.audio.name || 'Audio')}</b></p><audio controls src="${URL.createObjectURL(blob)}" style="width:100%"></audio>`
        : '<p class="hint" style="color:var(--danger)">No se encontró el audio en este navegador. Vuelve a subirlo.</p>';
    };
    $('[data-f]').onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      if (!f.type.startsWith('audio/')) return toast('Ese archivo no es un audio.', 'err');
      if (f.size > MAX_MB * 1048576) return toast(`El audio pesa más de ${MAX_MB} MB.`, 'err');
      try { data.audio.fileId = await files.put(f); data.audio.name = f.name; showPreview(); }
      catch { toast('No se pudo guardar el audio en este navegador.', 'err'); }
    };
    showPreview();
    const qs = questionsEditor($('[data-q]'), content.questions);
    return {
      getContent: () => ({
        audio: data.audio.kind === 'file' ? { kind: 'file', fileId: data.audio.fileId, name: data.audio.name } : { kind: 'tts', script: data.audio.script.trim(), rate: data.audio.rate, ...(Object.keys(data.audio.voces).length ? { voces: data.audio.voces } : {}) },
        maxPlays: data.maxPlays, showScript: data.audio.kind === 'tts' && data.showScript, questions: qs.get(),
      }),
      validate: () => [
        ...(data.audio.kind === 'tts' && data.audio.script.trim().split(/\s+/).length < 3 ? ['Escribe el guion del audio.'] : []),
        ...(data.audio.kind === 'file' && !data.audio.fileId ? ['Sube el archivo de audio.'] : []),
        ...qs.validate(),
      ],
    };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const total = content.questions.length;
    const st = saved || { plays: 0 };
    st.plays ??= 0;
    const save = () => onProgreso({ ...st, done: st.answers?.length || 0, total });
    let audioEl = null, url = null, playing = false;

    root.innerHTML = '';
    const wrap = el(`<div>
      <div class="listen-box">
        <button class="listen-btn" type="button" aria-label="Escuchar el audio">${icons.play}</button>
        <div class="grow"><b>Escucha el audio</b><div class="small muted" data-plays></div>
          <div class="listen-bar"><i></i></div></div>
        ${content.audio.kind === 'tts' ? `<button class="btn ghost sm" type="button" data-slow aria-pressed="false">Más lento</button>` : ''}
      </div>
      <div data-q></div>
    </div>`);
    root.append(wrap);
    const btn = wrap.querySelector('.listen-btn');
    const playsEl = wrap.querySelector('[data-plays]');
    const bar = wrap.querySelector('.listen-bar i');
    let slow = false;
    wrap.querySelector('[data-slow]')?.addEventListener('click', e => { slow = !slow; e.currentTarget.setAttribute('aria-pressed', slow); e.currentTarget.classList.toggle('active', slow); });

    const left = () => content.maxPlays ? content.maxPlays - st.plays : Infinity;
    const upd = () => {
      playsEl.textContent = content.maxPlays ? `Te quedan ${Math.max(0, left())} de ${content.maxPlays} reproducciones` : 'Puedes escucharlo las veces que necesites';
      btn.disabled = playing || left() <= 0;
      btn.classList.toggle('playing', playing);
    };

    if (content.audio.kind === 'file') {
      files.get(content.audio.fileId).then(blob => {
        if (!blob) { playsEl.textContent = 'El audio no está disponible en este dispositivo. Avísale a tu docente.'; btn.disabled = true; return; }
        url = URL.createObjectURL(blob);
        audioEl = new Audio(url);
        audioEl.ontimeupdate = () => { bar.style.width = (audioEl.currentTime / audioEl.duration) * 100 + '%'; };
        audioEl.onended = () => { playing = false; upd(); };
      }).catch(() => { playsEl.textContent = 'No se pudo cargar el audio.'; });
    }

    // Guion: el audio se prepara apenas se abre la actividad, para que el primer toque suene enseguida.
    const segs = content.audio.kind === 'tts' ? segmentos(content.audio.script, content.audio.voces) : [];
    const vel = () => (content.audio.rate || 1) * (slow ? 0.75 : 1);
    if (segs.length) prepararVoz(segs, vel()).catch(() => {});

    btn.onclick = async () => {
      if (playing || left() <= 0) return;
      if (content.audio.kind === 'file') {
        if (!audioEl) { toast('El audio aún se está cargando. Espera un momento.'); return; }
        playing = true; upd();
        audioEl.currentTime = 0;
        // Se cuenta la reproducción solo cuando el audio arranca de verdad.
        audioEl.play().then(() => { st.plays++; save(); upd(); })
          .catch(() => { playing = false; upd(); toast('No se pudo reproducir el audio. Toca de nuevo.', 'err'); });
      } else {
        playing = true; upd();
        let contada = false;
        const r = await reproducirVoz(segs, {
          velocidad: vel(),
          // La reproducción se cuenta cuando empieza a sonar.
          onInicio: () => { contada = true; st.plays++; save(); upd(); },
          onAvance: f => { bar.style.width = f * 100 + '%'; },
        });
        if (!r.ok && !contada) toast('No se pudo reproducir el audio. Toca de nuevo.', 'err');
        bar.style.width = '0';
        playing = false; upd();
      }
    };
    upd();

    questionsPlayer(wrap.querySelector('[data-q]'), content.questions, st, {
      onChange: save,
      onDone: answers => {
        if (content.showScript && content.audio.kind === 'tts')
          wrap.querySelector('.listen-box').after(el(`<details class="passage" open><summary>Texto del audio</summary><div class="passage-body">${paragraphs(content.audio.script)}</div></details>`));
        onTerminar({ score: answers.filter(a => a.correct).length, maxScore: total, answers });
      },
    });
    save();
    return { destroy() { detenerVoz(); audioEl?.pause(); if (url) URL.revokeObjectURL(url); } };
  },
};
