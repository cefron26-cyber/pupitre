// Plantilla Al azar (Rueda aleatoria, Abrecajas y Cartas al azar de WordWall): saca un elemento al azar para la clase.
// Tres formas de jugarla con el mismo contenido:
//   wheel  → rueda de colores con flecha a la izquierda; al parar se acerca al sector y ofrece Reanudar o Eliminar.
//   boxes  → cajas numeradas; al tocar una se abre en grande y luego queda abierta en su lugar.
//   cards  → mazo a la izquierda y la carta repartida a la derecha; Mezclar, Deshacer y Repartir.
// No hay respuestas correctas: al salir todos los elementos aparece "Terminar" (cuenta como actividad completa).
// Contenido: { look, items: [{ text, image?, credit? }] }
import { el, esc, icons, shuffle, compressImage, toast } from '../ui.js';
import { safeSrc, elegirImagen, buscadorDisponible, ICONO_BUSCAR } from '../imagenes.js';

const MIN = 2, MAX = 24;
const LOOKS = [
  { id: 'wheel', name: 'Rueda', desc: 'Gira y mira qué sale.' },
  { id: 'boxes', name: 'Cajas', desc: 'Toca una caja para abrirla.' },
  { id: 'cards', name: 'Cartas', desc: 'Reparte cartas de un mazo.' },
];
const ICONO_IMG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>';
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Contenido de una caja o carta: imagen y/o texto.
const cara = it => {
  const img = safeSrc(it.image);
  return `${img ? `<img src="${img}" alt="${esc(it.text || '')}" draggable="false">` : ''}${it.text ? `<b>${esc(it.text)}</b>` : ''}`;
};

// Rueda en SVG (viewBox -100..100). Cada sector lleva su texto en el radio, de la orilla hacia el centro.
function ruedaSVG(lista) {
  const n = lista.length, s = 360 / n, R = 96;
  const pt = (a, r) => [r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180)];
  const tam = Math.max(7, Math.min(15, 150 / n + 4));
  const sectores = lista.map((it, k) => {
    const a0 = k * s, a1 = (k + 1) * s, [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
    const d = n === 1 ? `M${-R} 0a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0` : `M0 0L${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${s > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
    const c = a0 + s / 2, [tx, ty] = pt(c, R - 10);
    const t0 = String(it.text || ''), txt = t0.length > 34 ? t0.slice(0, 33) + '…' : t0;
    // La letra se achica para que el texto quepa entre la orilla y el eje.
    const fs = Math.max(4.5, Math.min(tam, 62 / (Math.max(txt.length, 1) * 0.6))).toFixed(1);
    return `<g class="rd-sector" data-k="${k}"><path d="${d}" style="--cc:var(--rd${k % 6})"/>
      <text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" transform="rotate(${c + 180} ${tx.toFixed(2)} ${ty.toFixed(2)})" font-size="${fs}" dominant-baseline="central">${esc(txt)}</text></g>`;
  }).join('');
  return `<svg class="rd-svg" viewBox="-100 -100 200 200" aria-hidden="true">
    <circle r="99" class="rd-borde"/><g class="rd-gira">${sectores}</g><circle r="17" class="rd-eje"/></svg>`;
}

export default {
  type: 'random',
  label: 'Al azar',
  plural: 'Al azar',
  description: 'Rueda, cajas o cartas: saca un elemento al azar para la clase.',
  icon: icons.random,

  empty: () => ({ look: 'wheel', items: Array.from({ length: 4 }, () => ({ text: '' })) }),
  summary: c => `${LOOKS.find(l => l.id === c.look)?.name || 'Rueda'} · ${c.items.length} elementos`,

  editor(root, content) {
    const items = structuredClone(content.items);
    let look = content.look || 'wheel';
    let buscador = false;
    buscadorDisponible().then(ok => { if (ok && root.isConnected) { buscador = true; draw(); } });
    const draw = () => {
      root.innerHTML = `<p class="hint" style="margin:0 0 12px">Elige cómo se juega y escribe los elementos (palabras, preguntas o retos). Entre ${MIN} y ${MAX}.
        En Cajas y Cartas puedes poner imagen; la Rueda muestra solo el texto.</p>
        <div class="rd-looks" role="radiogroup" aria-label="Forma de jugar">${LOOKS.map(l => `<button type="button" class="rd-look" role="radio" aria-checked="${l.id === look}" data-l="${l.id}">
          <span class="rd-look-art" data-l="${l.id}" aria-hidden="true"></span><b>${l.name}</b><span>${l.desc}</span></button>`).join('')}</div>`;
      root.querySelectorAll('.rd-look').forEach(b => b.onclick = () => { look = b.dataset.l; draw(); });
      items.forEach((it, i) => {
        const box = el(`<div class="panel editor-item"><div class="pair-row">
          <span class="num" style="margin:0;min-width:24px">${i + 1}</span>
          ${look !== 'wheel' ? `<div class="match-img-ed">
            <label class="img-drop sm" title="${it.image ? 'Cambiar imagen' : 'Subir imagen desde el equipo'}" tabindex="0">
              ${it.image ? `<img src="${safeSrc(it.image)}" alt="Imagen ${i + 1}">` : ICONO_IMG}
              <input type="file" accept="image/*" hidden aria-label="Imagen del elemento ${i + 1}">
            </label>
            ${buscador ? `<button class="icon-btn" type="button" data-buscar title="Buscar imagen en internet" aria-label="Buscar imagen para el elemento ${i + 1}">${ICONO_BUSCAR}</button>` : ''}
            ${it.image ? `<button class="icon-btn" type="button" data-quitar title="Quitar imagen" aria-label="Quitar imagen del elemento ${i + 1}">×</button>` : ''}
          </div>` : ''}
          <input class="grow" data-t placeholder="${i % 2 ? 'What did you do yesterday?' : 'tiger'}" value="${esc(it.text || '')}" aria-label="Elemento ${i + 1}" maxlength="120" style="flex:1 1 180px">
          <button class="icon-btn" type="button" data-del aria-label="Eliminar elemento ${i + 1}" ${items.length <= MIN ? 'disabled' : ''}>×</button>
        </div>${it.credit && look !== 'wheel' ? `<div class="img-credito" title="${esc(it.credit)}">Imagen: ${esc(it.credit)}</div>` : ''}</div>`);
        const drop = box.querySelector('.img-drop'), file = box.querySelector('input[type=file]');
        if (drop) {
          const take = async f => { if (!f) return; try { it.image = await compressImage(f); delete it.credit; draw(); } catch (err) { toast(err.message, 'err'); } };
          drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } };
          file.onchange = () => take(file.files[0]);
          drop.ondragover = e => e.preventDefault();
          drop.ondrop = e => { e.preventDefault(); take(e.dataTransfer.files[0]); };
        }
        box.querySelector('[data-buscar]')?.addEventListener('click', async () => {
          const r = await elegirImagen((it.text || '').trim());
          if (r) { it.image = r.image; it.credit = r.credit; draw(); }
        });
        box.querySelector('[data-quitar]')?.addEventListener('click', () => { delete it.image; delete it.credit; draw(); });
        box.querySelector('[data-t]').oninput = e => { it.text = e.target.value; };
        box.querySelector('[data-del]').onclick = () => { items.splice(i, 1); draw(); };
        root.append(box);
      });
      const add = el(`<button class="btn ghost" type="button" style="margin-top:12px" ${items.length >= MAX ? 'disabled' : ''}>${icons.plus} Agregar elemento</button>`);
      add.onclick = () => { items.push({ text: '' }); draw(); root.querySelectorAll('[data-t]')[items.length - 1]?.focus(); };
      root.append(add);
    };
    draw();
    return {
      getContent: () => ({ look, items: items.map(it => ({ text: (it.text || '').trim(),
        ...(it.image && look !== 'wheel' ? { image: it.image } : {}), ...(it.image && it.credit && look !== 'wheel' ? { credit: it.credit } : {}) })) }),
      validate() {
        const errs = [];
        if (items.length < MIN || items.length > MAX) errs.push(`Usa entre ${MIN} y ${MAX} elementos.`);
        items.forEach((it, i) => {
          if (look === 'wheel' && !(it.text || '').trim()) errs.push(`Elemento ${i + 1}: escribe el texto (la rueda solo muestra texto).`);
          else if (!(it.text || '').trim() && !it.image) errs.push(`Elemento ${i + 1}: escribe un texto o pon una imagen.`);
        });
        return errs;
      },
    };
  },

  render(root, content, saved, { onProgreso, onTerminar }) {
    const items = content.items, total = items.length, look = content.look || 'wheel';
    // vistos: los que ya salieron; fuera: eliminados de la rueda; abiertas: cajas; mazo/mesa: cartas.
    const st = saved || { vistos: [], fuera: [], abiertas: [], mazo: shuffle(items.map((_, k) => k)), mesa: [], rot: 0 };
    const save = () => onProgreso({ ...st, done: st.vistos.length, total });
    const ver = k => { if (!st.vistos.includes(k)) st.vistos.push(k); save(); };
    const todos = () => st.vistos.length >= total;
    const terminar = () => onTerminar({ score: total, maxScore: total,
      answers: items.map((it, k) => ({ item: k, question: it.text || '', correct: true })) });
    const btnFin = () => (todos() ? '<button class="btn" type="button" data-fin>Terminar</button>' : '');

    const wrap = el(`<div class="rd" data-look="${look}"></div>`);
    root.innerHTML = '';
    root.append(wrap);
    const enlazar = () => wrap.querySelector('[data-fin]')?.addEventListener('click', terminar);

    // ---------- Rueda ----------
    const rueda = () => {
      const lista = items.map((it, k) => ({ ...it, k })).filter(x => !st.fuera.includes(x.k));
      let girando = false, ganador = null;
      wrap.innerHTML = `<div class="rd-escena">
          <div class="rd-flecha" aria-hidden="true"></div>
          <div class="rd-rueda">${ruedaSVG(lista)}</div>
        </div>
        <p class="rd-salio" role="status" aria-live="polite"></p>
        <div class="rd-botones"><button class="btn" type="button" data-girar ${lista.length ? '' : 'disabled'}>Girar</button>${btnFin()}</div>`;
      const gira = wrap.querySelector('.rd-gira'), escena = wrap.querySelector('.rd-escena'), salio = wrap.querySelector('.rd-salio');
      gira.style.transform = `rotate(${st.rot}deg)`;
      enlazar();
      const girar = () => {
        if (girando || !lista.length) return;
        girando = true;
        const s = 360 / lista.length, w = Math.floor(Math.random() * lista.length);
        // El centro del sector ganador queda en 180° (la flecha está a la izquierda).
        const centro = (w + 0.5) * s + (Math.random() - 0.5) * s * 0.6;
        const falta = (((180 - centro - st.rot) % 360) + 360) % 360;
        st.rot += 360 * (reducido() ? 1 : 5) + falta;
        gira.style.transition = reducido() ? 'none' : 'transform 4.2s cubic-bezier(.12,.8,.18,1)';
        gira.style.transform = `rotate(${st.rot}deg)`;
        wrap.querySelector('[data-girar]').disabled = true;
        setTimeout(() => {
          girando = false; ganador = lista[w];
          st.rot %= 360; gira.style.transition = 'none'; gira.style.transform = `rotate(${st.rot}deg)`;
          ver(ganador.k);
          escena.classList.add('zoom');
          wrap.querySelector(`.rd-sector[data-k="${w}"]`)?.classList.add('gana');
          salio.textContent = `Salió: ${ganador.text}`;
          wrap.querySelector('.rd-botones').innerHTML = `<button class="btn ghost" type="button" data-seguir>Reanudar</button>
            <button class="btn" type="button" data-quitar>Eliminar</button>`;
          wrap.querySelector('[data-seguir]').onclick = () => rueda();
          wrap.querySelector('[data-quitar]').onclick = () => { st.fuera.push(ganador.k); save(); rueda(); };
        }, reducido() ? 300 : 4300);
      };
      wrap.querySelector('[data-girar]').onclick = girar;
      wrap.querySelector('.rd-rueda').onclick = girar;
      if (!lista.length) salio.textContent = 'Ya salieron todos.';
    };

    // ---------- Cajas ----------
    const cajas = () => {
      wrap.innerHTML = `<p class="rd-ayuda">${todos() ? 'Ya abriste todas las cajas.' : 'Toca una para abrirla.'}</p>
        <div class="rd-cajas" style="--cols:${Math.min(6, Math.ceil(Math.sqrt(total * 1.6)))}">${items.map((it, k) => {
          const abierta = st.abiertas.includes(k);
          return `<button type="button" class="rd-caja ${abierta ? 'abierta' : ''}" data-k="${k}" style="--cc:var(--rd${k % 6})" aria-label="${abierta ? esc(it.text || 'Imagen') : `Caja ${k + 1}`}">
            <span class="rd-caja-cara">${abierta ? cara(it) : `<b class="rd-num">${k + 1}</b>`}</span></button>`;
        }).join('')}</div>
        <div class="rd-botones">${btnFin()}</div>`;
      enlazar();
      wrap.querySelectorAll('.rd-caja').forEach(b => b.onclick = () => abrir(+b.dataset.k, b));
    };
    // La caja se abre en grande sobre el tablero; un toque la cierra y queda abierta en su lugar.
    const abrir = (k, b) => {
      if (wrap.querySelector('.rd-grande')) return;
      const nueva = !st.abiertas.includes(k);
      if (nueva) st.abiertas.push(k);
      ver(k);
      const g = el(`<div class="rd-grande" role="dialog" aria-label="Caja ${k + 1}"><div class="rd-caja abierta grande" style="--cc:var(--rd${k % 6})"><span class="rd-caja-cara">${cara(items[k])}</span></div></div>`);
      const r = b.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      g.style.setProperty('--ox', `${r.left + r.width / 2 - w.left}px`);
      g.style.setProperty('--oy', `${r.top + r.height / 2 - w.top}px`);
      wrap.append(g);
      const cerrar = () => { g.classList.add('sale'); setTimeout(cajas, reducido() ? 0 : 220); };
      g.onclick = cerrar;
      setTimeout(() => g.focus?.(), 0);
    };

    // ---------- Cartas ----------
    const cartas = () => {
      const arriba = st.mesa[st.mesa.length - 1];
      wrap.innerHTML = `<div class="rd-mesa">
          <button type="button" class="rd-mazo" ${st.mazo.length ? '' : 'disabled'} aria-label="Repartir carta (quedan ${st.mazo.length})">
            ${Array.from({ length: Math.min(5, st.mazo.length) }, (_, j) => `<span class="rd-dorso" style="--j:${j}"></span>`).join('') || '<span class="rd-vacio">Sin cartas</span>'}
            ${st.mazo.length ? `<em class="rd-quedan">${st.mazo.length}</em>` : ''}
          </button>
          <div class="rd-sitio">${arriba !== undefined ? `<div class="rd-carta" style="--cc:var(--rd${arriba % 6})">${cara(items[arriba])}</div>` : ''}</div>
        </div>
        <div class="rd-botones">
          <button class="btn ghost" type="button" data-mezclar>Mezclar</button>
          <button class="btn ghost" type="button" data-deshacer ${st.mesa.length ? '' : 'disabled'}>Deshacer</button>
          <button class="btn" type="button" data-repartir ${st.mazo.length ? '' : 'disabled'}>Repartir</button>${btnFin()}
        </div>`;
      enlazar();
      const repartir = () => { if (!st.mazo.length) return; const k = st.mazo.shift(); st.mesa.push(k); ver(k); cartas(); };
      wrap.querySelector('.rd-mazo').onclick = repartir;
      wrap.querySelector('[data-repartir]').onclick = repartir;
      wrap.querySelector('[data-deshacer]').onclick = () => { if (st.mesa.length) { st.mazo.unshift(st.mesa.pop()); save(); cartas(); wrap.querySelector('.rd-carta')?.classList.add('quieta'); } };
      wrap.querySelector('[data-mezclar]').onclick = () => { st.mazo = shuffle(items.map((_, k) => k)); st.mesa = []; save(); cartas(); };
    };

    ({ wheel: rueda, boxes: cajas, cards: cartas }[look] || rueda)();
    save();
  },
};
