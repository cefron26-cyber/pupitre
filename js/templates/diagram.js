// Plantilla Diagrama con etiquetas (como la de WordWall): una imagen con puntos y las etiquetas a los lados.
// Se arrastra cada etiqueta a su punto (o se toca la etiqueta y luego el punto); una línea de color las une.
// Tocar un punto con etiqueta la suelta. "Enviar respuestas" corrige todo junto: ✓ o ✗ en cada etiqueta.
// Contenido: { image, credit?, labels: [{ text, x, y }] } con x, y en % de la imagen.
import { evalMode, neutralFb, el, esc, icons, shuffle, compressImage, toast } from '../ui.js';
import { safeSrc, elegirImagen, buscadorDisponible, ICONO_BUSCAR } from '../imagenes.js';

const MIN = 2, MAX = 14;
const ICONO_IMG = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>';
const norm = s => String(s || '').trim().toLowerCase();
const r1 = v => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;

export default {
  type: 'diagram',
  label: 'Diagrama con etiquetas',
  plural: 'Diagramas',
  description: 'Arrastra cada etiqueta a su punto en la imagen.',
  icon: icons.diagram,

  empty: () => ({ image: '', labels: [] }),
  summary: c => `${c.labels.length} etiqueta${c.labels.length === 1 ? '' : 's'}`,

  editor(root, content) {
    let image = content.image || '', credit = content.credit || '';
    const labels = structuredClone(content.labels || []);
    let buscador = false;
    buscadorDisponible().then(ok => { if (ok && root.isConnected) { buscador = true; draw(); } });
    const draw = () => {
      const src = safeSrc(image);
      root.innerHTML = `<p class="hint" style="margin:0 0 12px">1) Pon una imagen. 2) Toca la imagen donde va cada etiqueta y escribe la palabra. Puedes arrastrar los puntos para moverlos. Entre ${MIN} y ${MAX} etiquetas.</p>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <label class="btn ghost sm" tabindex="0">${ICONO_IMG} ${src ? 'Cambiar imagen' : 'Subir imagen'}<input type="file" accept="image/*" hidden aria-label="Imagen del diagrama"></label>
          ${buscador ? `<button class="btn ghost sm" type="button" data-buscar>${ICONO_BUSCAR} Buscar en internet</button>` : ''}
        </div>
        ${src ? `<div class="dg-ed"><img src="${src}" alt="Imagen del diagrama" draggable="false">${labels.map((l, i) => `<button type="button" class="dg-ed-punto" data-i="${i}" style="left:${l.x}%;top:${l.y}%" aria-label="Punto ${i + 1}: ${esc(l.text || 'sin texto')}">${i + 1}</button>`).join('')}</div>
          ${credit ? `<div class="img-credito" title="${esc(credit)}">Imagen: ${esc(credit)}</div>` : ''}`
        : `<div class="dg-ed vacio">${ICONO_IMG}<span>Primero pon una imagen (sube una o búscala).</span></div>`}
        <div class="dg-ed-lista"></div>`;
      const file = root.querySelector('input[type=file]');
      file.onchange = async () => { const f = file.files[0]; if (!f) return; try { image = await compressImage(f, 900); credit = ''; draw(); } catch (err) { toast(err.message, 'err'); } };
      file.closest('label').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } };
      root.querySelector('[data-buscar]')?.addEventListener('click', async () => {
        const r = await elegirImagen(labels.map(l => l.text).filter(Boolean)[0] || '');
        if (r) { image = r.image; credit = r.credit; draw(); }
      });
      const ed = root.querySelector('.dg-ed:not(.vacio)');
      if (ed) {
        const pos = ev => { const r = ed.getBoundingClientRect(); return { x: r1(((ev.clientX - r.left) / r.width) * 100), y: r1(((ev.clientY - r.top) / r.height) * 100) }; };
        ed.addEventListener('click', ev => {
          if (ev.target.closest('.dg-ed-punto') || labels.length >= MAX) return;
          labels.push({ text: '', ...pos(ev) });
          draw();
          root.querySelectorAll('[data-txt]')[labels.length - 1]?.focus();
        });
        // Mover un punto arrastrándolo.
        ed.querySelectorAll('.dg-ed-punto').forEach(p => {
          p.addEventListener('pointerdown', e => {
            e.preventDefault();
            const l = labels[+p.dataset.i];
            p.setPointerCapture(e.pointerId);
            const move = ev => { Object.assign(l, pos(ev)); p.style.left = l.x + '%'; p.style.top = l.y + '%'; };
            const up = () => { p.removeEventListener('pointermove', move); p.removeEventListener('pointerup', up); };
            p.addEventListener('pointermove', move);
            p.addEventListener('pointerup', up);
          });
          p.addEventListener('click', () => root.querySelectorAll('[data-txt]')[+p.dataset.i]?.focus());
        });
      }
      const lista = root.querySelector('.dg-ed-lista');
      labels.forEach((l, i) => {
        const row = el(`<div class="panel editor-item"><div class="pair-row">
          <span class="dg-ed-num">${i + 1}</span>
          <input class="grow" data-txt placeholder="Ej. head" value="${esc(l.text)}" aria-label="Etiqueta ${i + 1}" maxlength="30" style="flex:1 1 160px">
          <button class="icon-btn" type="button" data-del aria-label="Eliminar etiqueta ${i + 1}">×</button></div></div>`);
        row.querySelector('[data-txt]').oninput = e => { l.text = e.target.value; const p = root.querySelector(`.dg-ed-punto[data-i="${i}"]`); if (p) p.setAttribute('aria-label', `Punto ${i + 1}: ${l.text}`); };
        row.querySelector('[data-del]').onclick = () => { labels.splice(i, 1); draw(); };
        lista.append(row);
      });
    };
    draw();
    return {
      getContent: () => ({ image, ...(image && credit ? { credit } : {}), labels: labels.map(l => ({ text: l.text.trim(), x: l.x, y: l.y })) }),
      validate() {
        const errs = [];
        if (!safeSrc(image)) errs.push('Pon una imagen.');
        if (labels.length < MIN || labels.length > MAX) errs.push(`Usa entre ${MIN} y ${MAX} etiquetas (toca la imagen para agregar puntos).`);
        labels.forEach((l, i) => { if (!l.text.trim()) errs.push(`Etiqueta ${i + 1}: escribe la palabra.`); });
        return errs;
      },
    };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const L = content.labels, n = L.length;
    const hide = () => evalMode.hide;
    // orden: etiquetas desordenadas (mitad a cada lado); en: punto → etiqueta puesta ahí.
    const st = saved || { orden: shuffle(L.map((_, k) => k)), en: Array(n).fill(null), enviado: false, answers: [] };
    const save = () => onProgreso({ ...st, done: st.enviado ? n : st.en.filter(x => x !== null).length, total: n });
    let sel = null;

    const mitad = Math.ceil(n / 2);
    const etiqueta = (k, j) => `<button type="button" class="dg-etq" data-k="${k}" style="--cc:var(--rd${j % 6})"><span>${esc(L[k].text)}</span><i class="dg-pin" aria-hidden="true"></i></button>`;
    root.innerHTML = '';
    const wrap = el(`<div class="dg">
      <div class="small muted" style="margin-bottom:10px">Arrastra cada etiqueta a su punto (o tócala y luego toca el punto).</div>
      <div class="dg-tablero">
        <div class="dg-col izq">${st.orden.slice(0, mitad).map((k, j) => etiqueta(k, j)).join('')}</div>
        <div class="dg-img"><img src="${safeSrc(content.image)}" alt="" draggable="false">
          ${L.map((l, p) => `<button type="button" class="dg-punto" data-p="${p}" style="left:${l.x}%;top:${l.y}%" aria-label="Punto ${p + 1}"></button>`).join('')}</div>
        <div class="dg-col der">${st.orden.slice(mitad).map((k, j) => etiqueta(k, j + mitad)).join('')}</div>
        <svg class="dg-lineas" aria-hidden="true"></svg>
      </div>
      <div class="fb-slot" role="status" aria-live="polite"><div class="row end"><button class="btn" type="button" data-enviar>Enviar respuestas</button></div></div>
    </div>`);
    root.append(wrap);
    const tablero = wrap.querySelector('.dg-tablero'), svg = wrap.querySelector('.dg-lineas');
    const etq = k => wrap.querySelector(`.dg-etq[data-k="${k}"]`), punto = p => wrap.querySelector(`.dg-punto[data-p="${p}"]`);

    // Líneas de cada etiqueta puesta a su punto (se recalculan si cambia el tamaño).
    const lineas = () => {
      if (!tablero.isConnected) return;
      const t = tablero.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${t.width} ${t.height}`);
      svg.innerHTML = st.en.map((k, p) => {
        if (k === null) return '';
        const a = etq(k).querySelector('.dg-pin').getBoundingClientRect(), b = punto(p).getBoundingClientRect();
        return `<line x1="${a.left + a.width / 2 - t.left}" y1="${a.top + a.height / 2 - t.top}" x2="${b.left + b.width / 2 - t.left}" y2="${b.top + b.height / 2 - t.top}" style="stroke:${getComputedStyle(etq(k)).getPropertyValue('--cc') || '#1f3a68'}"/>`;
      }).join('');
    };
    const pintar = () => {
      L.forEach((_, k) => { const e = etq(k), puesta = st.en.includes(k); e.classList.toggle('puesta', puesta); e.classList.toggle('sel', sel === k); });
      L.forEach((_, p) => { const b = punto(p), k = st.en[p]; b.classList.toggle('lleno', k !== null); if (k !== null) b.style.setProperty('--cc', getComputedStyle(etq(k)).getPropertyValue('--cc')); else b.style.removeProperty('--cc'); });
      wrap.querySelector('.dg-img').classList.toggle('eligiendo', sel !== null);
      lineas();
    };

    const poner = (k, p) => {
      if (st.enviado) return;
      const antes = st.en.indexOf(k);
      if (antes >= 0) st.en[antes] = null;
      st.en[p] = k; sel = null;
      save(); pintar();
    };
    const soltar = p => { if (st.enviado || st.en[p] === null) return; st.en[p] = null; save(); pintar(); };

    // Etiquetas: tocar = elegir; arrastrar = poner donde se suelte.
    wrap.querySelectorAll('.dg-etq').forEach(b => {
      const k = +b.dataset.k;
      b.addEventListener('dragstart', e => e.preventDefault());
      b.addEventListener('pointerdown', e => {
        if (e.button !== 0 || st.enviado) return;
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY;
        let ghost = null, dx = 0, dy = 0;
        const move = ev => {
          if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
          if (!ghost) {
            const r = b.getBoundingClientRect();
            dx = sx - r.left; dy = sy - r.top;
            ghost = b.cloneNode(true); ghost.classList.add('dg-ghost'); ghost.classList.remove('sel', 'puesta');
            ghost.style.width = r.width + 'px';
            document.body.append(ghost);
            b.classList.add('arrastrando');
          }
          ghost.style.left = ev.clientX - dx + 'px';
          ghost.style.top = ev.clientY - dy + 'px';
        };
        const up = ev => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          if (ghost) {
            ghost.remove(); b.classList.remove('arrastrando');
            // El punto más cercano al dedo (dentro de 40 px), para que sea fácil acertar.
            let mejor = null, dist = 40;
            wrap.querySelectorAll('.dg-punto').forEach(pt => {
              const r = pt.getBoundingClientRect(), d = Math.hypot(ev.clientX - (r.left + r.width / 2), ev.clientY - (r.top + r.height / 2));
              if (d < dist) { dist = d; mejor = +pt.dataset.p; }
            });
            if (mejor !== null) poner(k, mejor);
            return;
          }
          if (ev.type !== 'pointercancel') { sel = sel === k ? null : k; pintar(); }
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
      b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel = sel === k ? null : k; pintar(); } });
    });
    wrap.querySelectorAll('.dg-punto').forEach(b => b.onclick = () => {
      const p = +b.dataset.p;
      if (sel !== null) poner(sel, p); else soltar(p);
    });

    const enviar = () => {
      if (st.enviado) return;
      st.enviado = true;
      // Bien si quedó en su punto (o en uno con el mismo texto).
      st.answers = L.map((l, k) => {
        const p = st.en.indexOf(k);
        return { item: k, question: l.text, expected: l.text, given: p >= 0 ? L[p].text : '', correct: p >= 0 && norm(L[p].text) === norm(l.text) };
      });
      save(); corregir();
    };
    const corregir = () => {
      sel = null; pintar();
      wrap.querySelectorAll('.dg-etq, .dg-punto').forEach(b => { b.disabled = true; });
      if (!hide()) st.answers.forEach(a => {
        const e = etq(a.item);
        if (!st.en.includes(a.item)) e.classList.add('sin-poner');
        else e.classList.add(a.correct ? 'ok' : 'bad');
      });
      const bien = st.answers.filter(a => a.correct).length;
      const fb = el(`<div class="feedback ${hide() ? 'neutral' : bien === n ? 'ok' : 'bad'}">
        ${hide() ? neutralFb() : `<span>${bien === n ? '¡Todas en su lugar!' : `${bien} de ${n} en su lugar.`}</span>`}
        <button class="btn" type="button" data-next>${evalMode.fin}</button></div>`);
      fb.querySelector('button').onclick = () => onTerminar({ score: bien, maxScore: n, answers: st.answers });
      wrap.querySelector('.fb-slot').replaceChildren(fb);
    };
    wrap.querySelector('[data-enviar]').onclick = enviar;

    const ro = new ResizeObserver(() => lineas());
    ro.observe(tablero);
    const img = wrap.querySelector('.dg-img img');
    if (!img.complete) img.addEventListener('load', lineas, { once: true });
    save(); pintar();
    if (st.enviado) corregir();
    return { destroy: () => ro.disconnect() };
  },
};
