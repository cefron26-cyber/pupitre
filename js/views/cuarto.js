// Estudiante: el cuarto de Cebollo. Se puede tocar a Cebollo y a algunos objetos, comprar decoración con monedas
// (tienda) y cambiarle la ropa (armario). Cada lugar del cuarto lleva un objeto a la vez (prefs.cuarto[lugar]).
// Monedas = XP ganado − lo gastado (storage.compras). La ropa sale del cofre y de los retos (colección).
import { xp, users, userRewards, compras, events } from '../storage.js';
import { ROPA, SLOTS, DECO, LUGARES, RARITY, urlDeco, urlIconoRopa, ownedSet, DESBLOQUEADO } from '../rewards.js';
import { crearCebollo, cebolloMini } from '../cebollo.js';
import { prefsOf } from './student.js';
import { esc, $, toast } from '../ui.js';
import { CAJAS, PISO_CEBOLLO } from '../cuarto-cajas.js';

// Caja de cada objeto en % del cuarto (sale de herramientas/arte/recortar_cuarto.py, con su sombra incluida).
// El editor de muebles puede moverla: prefs.posCuarto[id] = [x, y] (en %) reemplaza la esquina de la caja.
// Profundidad: lo que se apoya más abajo en el piso tapa a lo de atrás; la alfombra siempre queda bajo Cebollo.
const cajaDe = (id, pos) => {
  const [x, y, w, h] = CAJAS[id] || [0, 0, 0, 0];
  const p = pos?.[id];
  return p ? [p[0], p[1], w, h] : [x, y, w, h];
};
const zDe = (lugar, y, h) => lugar === 'alfombra' ? 1 : lugar === 'lampara' ? 95 : Math.round(y + h);
const limitar = (v, min, max) => Math.min(Math.max(v, min), max);
// Tablero de cada mesa, en fracciones de su caja [x0, x1, y0, y1]: una planta cuya base caiga ahí queda encima
// de la mesa (se dibuja delante de ella y viaja con ella al moverla).
const TABLERO = { mesa_madera: [0.05, 0.95, 0, 0.26], mesa_redonda: [0.03, 0.97, 0, 0.24] };
const BASE_PLANTA = 0.9;   // la base de la maceta, en fracción del alto de su caja (debajo solo hay sombra)

const FRASES = ['¡Hola, {n}!', 'Hello, {n}!', '¿Practicamos inglés hoy?', 'I love my room!', '¡Me gusta mi cuarto!',
  'Let\'s learn together!', '¡Tú puedes!', 'Good job today!', '¿Me compras una planta?', 'How are you?'];
const FRASES_ROPA = ['¡Me encanta!', 'Looking good!', '¡Qué estilo!', 'Nice!'];
const FRASES_COMPRA = ['¡Gracias!', 'Thank you!', '¡Qué bonito!', 'Wow!'];
const azar = l => l[Math.floor(Math.random() * l.length)];

// Iconos propios de la barra del cuarto (2026-11-21): dibujos SVG de colores con contorno tinta, sin texto.
const T = 'stroke="#1a0f4d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
const ico = cuerpo => `<svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">${cuerpo}</svg>`;
const ICONOS = {
  // La camiseta roja del juego (el mismo icono de la colección), no un dibujo aparte.
  armario: `<img class="cu-ico-img" src="${urlIconoRopa('camiseta_roja')}" alt="" draggable="false">`,
  // Carrito de compras: asa roja, armazón de tubo celeste, canasta de rejilla con borde rojo y ruedas moradas.
  tienda: ico(`<g transform="translate(20 20) scale(.86) translate(-20.05 -21.4)">
    <path d="M11.2 13.2h25.4l-2.1 11.2a1.4 1.4 0 0 1-1.4 1.1H14.2z" fill="#fff" ${T}/>
    <path d="M16.6 13.4l1.3 12M21.8 13.4l.6 12M27 13.4v12M32 13.4l-.9 12M12.4 19.4h23" fill="none" stroke="#1a0f4d" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M11.2 13h25.4" stroke="#1a0f4d" stroke-width="5" stroke-linecap="round"/><path d="M11.2 13h25.4" stroke="#ff5a6a" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M8.5 7.5h1.2c.8 0 1.4.5 1.6 1.3l3.6 18.4c.2.8.8 1.3 1.6 1.3H35" fill="none" stroke="#1a0f4d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8.5 7.5h1.2c.8 0 1.4.5 1.6 1.3l3.6 18.4c.2.8.8 1.3 1.6 1.3H35" fill="none" stroke="#bfe6ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3.5 7.5h5" stroke="#1a0f4d" stroke-width="5" stroke-linecap="round"/><path d="M3.5 7.5h5" stroke="#ff5a6a" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="17.5" cy="33" r="3.6" fill="#8b6cf0" ${T}/><circle cx="17.5" cy="33" r="1.3" fill="#d8f0ff"/>
    <circle cx="31" cy="33" r="3.6" fill="#8b6cf0" ${T}/><circle cx="31" cy="33" r="1.3" fill="#d8f0ff"/></g>`),
  // Cuatro flechas negras separadas, hacia arriba, derecha, abajo e izquierda (mover).
  mover: ico([0, 90, 180, 270].map(g => `<g transform="translate(20 20) scale(.9) translate(-20 -20) rotate(${g} 20 20)">
    <path d="M20 15.5V9" stroke="#1a0f4d" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M20 3.2l5.6 6.6h-11.2z" fill="#1a0f4d" stroke="#1a0f4d" stroke-width="1.6" stroke-linejoin="round"/></g>`).join('')),
  // Voltear en espejo: dos mitades con una línea punteada al medio.
  espejo: ico(`<path d="M20 5v30" stroke="#1a0f4d" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="3 4"/>
    <path d="M16 10 5 30h11z" fill="#5fc8ff" ${T}/><path d="M24 10l11 20H24z" fill="#fff" ${T}/>`),
  // Ordenar como al inicio: flecha circular.
  ordenar: ico(`<path d="M30 20a10 10 0 1 1-3-7.1" fill="none" stroke="#1a0f4d" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M28.6 6.5v8.2h-8.2z" fill="#1a0f4d" stroke="#1a0f4d" stroke-width="1.6" stroke-linejoin="round"/>`),
  // Visto bueno verde (mientras se mueven los muebles).
  listo: ico(`<circle cx="20" cy="20" r="14" fill="#3ccf7a" ${T}/><path d="m13 20.5 5 5 9.5-10" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`),
  // Cámara de fotos con lente y flash.
  foto: ico(`<g transform="translate(0 -.5)"><path d="M14.5 12.5 16.8 9h6.4l2.3 3.5H32a2.5 2.5 0 0 1 2.5 2.5v14.5A2.5 2.5 0 0 1 32 32H8a2.5 2.5 0 0 1-2.5-2.5V15A2.5 2.5 0 0 1 8 12.5z" fill="#a46bff" ${T}/>
    <circle cx="20" cy="22" r="6.4" fill="#fff" ${T}/><circle cx="20" cy="22" r="3" fill="#1f3a68"/><circle cx="18.8" cy="20.8" r="1" fill="#fff"/>
    <rect x="27.5" y="15.2" width="3.6" height="2.6" rx="1" fill="#ffd23f" stroke="#1a0f4d" stroke-width="1.6"/></g>`),
};

// Moneda dorada con brillo y estrella (contador y precios).
const MONEDA = (px = 28) => `<svg class="moneda" viewBox="0 0 40 40" width="${px}" height="${px}" aria-hidden="true">
  <circle cx="20" cy="21.5" r="16" fill="#c98a00" stroke="#1a0f4d" stroke-width="2.4"/>
  <circle cx="20" cy="19" r="16" fill="#ffd23f" stroke="#1a0f4d" stroke-width="2.4"/>
  <circle cx="20" cy="19" r="11" fill="#ffe680" stroke="#e0a800" stroke-width="2"/>
  <path d="m20 12.2 2 4.3 4.6.5-3.4 3.1 1 4.6-4.2-2.4-4.2 2.4 1-4.6-3.4-3.1 4.6-.5z" fill="#f0b400" stroke="#c98a00" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M10.5 13.5a11 11 0 0 1 6-5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".85"/></svg>`;

export async function cuarto(root, { user }) {
  let prefs = prefsOf(user);
  let ropa = { ...prefs.ropa }, puesto = { ...prefs.cuarto };
  // Editor: posición (prefs.posCuarto), espejo (prefs.espejoCuarto) y plantas sobre la mesa (prefs.sobreCuarto: planta → mesa).
  let pos = { ...(prefs.posCuarto || {}) }, espejo = { ...(prefs.espejoCuarto || {}) }, sobre = { ...(prefs.sobreCuarto || {}) };
  let editando = false, elegido = null;
  const guardar = () => users.setPrefs(user.id, { posCuarto: pos, espejoCuarto: espejo, sobreCuarto: sobre });
  const cajaMesa = () => puesto.mesa && cajaDe(puesto.mesa, pos);
  const zItem = (id, lugar) => {
    if (sobre[id] && sobre[id] === puesto.mesa) { const [, my, , mh] = cajaMesa(); return zDe('mesa', my, mh) + 1; }
    const [, y, , h] = cajaDe(id, pos);
    return zDe(lugar, y, h);
  };
  const caja = (id, lugar) => {
    const [x, y, w, h] = cajaDe(id, pos);
    return `left:${x}%;top:${y}%;width:${w}%;height:${h}%;z-index:${zItem(id, lugar)}`;
  };
  // ¿La base de la planta cae sobre el tablero de la mesa puesta? Devuelve el id de la mesa o null.
  const mesaBajo = id => {
    const m = puesto.mesa;
    if (!m || !TABLERO[m]) return null;
    const [x, y, w, h] = cajaDe(id, pos), bx = x + w / 2, by = y + h * BASE_PLANTA;
    const [mx, my, mw, mh] = cajaMesa();
    let [a, b, c, d] = TABLERO[m];
    if (espejo[m]) [a, b] = [1 - b, 1 - a];
    return bx >= mx + mw * a && bx <= mx + mw * b && by >= my + mh * c - 2 && by <= my + mh * d ? m : null;
  };
  const nombre = esc(user.name.split(' ')[0]);
  const ropaMia = ownedSet((await userRewards.list(user.id)).map(r => r.rewardId));
  const decoMia = new Set([...DECO.filter(d => d.free || DESBLOQUEADO).map(d => d.id), ...(await compras.list(user.id)).map(c => c.itemId)]);
  let monedas = (await xp.total(user.id)) - (await compras.gastado(user.id));
  let panel = null, pestana = null;

  // Sin textos de ayuda (2026-11-21): los niños entienden la escena con mirarla; los nombres quedan para lectores de pantalla.
  root.innerHTML = `<h1 class="sr-only">Cuarto de Cebollo</h1>
    <div class="cuarto" id="cuarto">
      <div class="cu-monedas" id="cu-monedas" role="status" aria-label="${monedas} monedas" title="Monedas">${MONEDA()}<b id="monedas">${monedas}</b></div>
      <img class="cu-fondo" src="img/cuarto/cuarto.webp" alt="" draggable="false">
      <div id="cu-deco"></div>
      <button type="button" class="cu-armario${espejo.armario ? ' espejo' : ''}" id="cu-armario" aria-label="Abrir el armario" data-id="armario" data-lugar="armario" style="${caja('armario', 'armario')}"><img src="img/cuarto/armario.webp" alt="" draggable="false"></button>
      <div class="cu-cebollo" id="cu-cebollo" style="z-index:${PISO_CEBOLLO}"></div>
      <p class="cu-globo" id="cu-globo" role="status" aria-live="polite"></p>
      <div class="cu-herr" id="cu-herr" hidden><button type="button" id="cu-espejo" aria-label="Voltear" title="Voltear">${ICONOS.espejo}</button></div>
      <div class="cu-luz" aria-hidden="true"></div>
      <div class="cu-barra" role="toolbar" aria-label="Acciones del cuarto">
        <button type="button" class="cu-ico" data-panel="armario" aria-label="Armario" title="Armario">${ICONOS.armario}</button>
        <button type="button" class="cu-ico" data-panel="tienda" aria-label="Tienda" title="Tienda">${ICONOS.tienda}</button>
        <button type="button" class="cu-ico" id="cu-editar" aria-pressed="false" aria-label="Mover muebles" title="Mover muebles">${ICONOS.mover}</button>
        <button type="button" class="cu-ico" id="cu-ordenar" aria-label="Ordenar como al inicio" title="Ordenar como al inicio" hidden>${ICONOS.ordenar}</button>
        <button type="button" class="cu-ico" id="cu-foto" aria-label="Tomar foto" title="Tomar foto">${ICONOS.foto}</button>
      </div>
    </div>
    <p class="sr-only" id="cu-ayuda" hidden>Con el teclado: elige un mueble con Tab, muévelo con las flechas y voltéalo con la E.</p>
    <section class="card cuarto-panel" id="cu-panel" hidden></section>`;

  const sala = $('#cuarto', root), globo = $('#cu-globo', root);
  const ceb = crearCebollo($('#cu-cebollo', root), { ropa, tocable: false });
  let tGlobo = 0;
  const decir = txt => {
    globo.textContent = txt.replace('{n}', user.name.split(' ')[0]);
    globo.classList.remove('ve'); void globo.offsetWidth; globo.classList.add('ve');
    clearTimeout(tGlobo); tGlobo = setTimeout(() => globo.classList.remove('ve'), 2600);
  };
  const tocarCebollo = () => { if (editando) return; ceb.reaccion(azar(['feliz', 'sorpresa', 'festejo'])); decir(azar(FRASES)); };
  ceb.el.classList.add('tocable'); ceb.el.tabIndex = 0; ceb.el.setAttribute('aria-label', 'Cebollo: tócalo para jugar');
  ceb.el.addEventListener('click', tocarCebollo);
  ceb.el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tocarCebollo(); } });
  setTimeout(() => decir(`¡Hola, {n}!`), 500);

  // ---------- Decoración ----------
  function pintarDeco() {
    // Si cambió o se quitó la mesa, cada planta que estaba encima sigue arriba solo si cae sobre la mesa nueva;
    // si no, vuelve a su lugar en el piso (para que no quede flotando).
    let cambio = false;
    for (const id of Object.keys(sobre)) {
      if (sobre[id] === puesto.mesa) continue;
      const m = mesaBajo(id);
      if (m) sobre[id] = m; else { delete sobre[id]; delete pos[id]; }
      cambio = true;
    }
    if (cambio) guardar();
    $('#cu-deco', root).innerHTML = Object.keys(LUGARES).filter(l => puesto[l]).map(l => {
      const d = DECO.find(x => x.id === puesto[l]);
      if (!d) return '';
      // En el editor todos se pueden agarrar (y elegir con el teclado); fuera de él solo los que reaccionan al tocarlos.
      const toca = editando || ['pecera', 'lampara', 'planta'].includes(l);
      return `<${toca ? 'button type="button"' : 'span'} class="cu-item cu-${l}${espejo[d.id] ? ' espejo' : ''}${elegido === d.id ? ' elegido' : ''}" data-lugar="${l}" data-id="${d.id}" style="${caja(d.id, l)}" ${toca ? `aria-label="${editando ? 'Mover: ' : ''}${esc(d.name)}"` : 'aria-hidden="true"'}>
        <img src="${urlDeco(d.id)}" alt="" draggable="false">${l === 'pecera' ? '<i class="cu-burbujas"><b></b><b></b><b></b></i>' : ''}</${toca ? 'button' : 'span'}>`;
    }).join('');
    sala.querySelectorAll('button.cu-item').forEach(b => b.onclick = e => {
      if (editando) { if (!e.detail) elegir(b); return; }   // Enter/espacio en el editor: elegirlo
      const l = b.dataset.lugar;
      if (l === 'lampara') { sala.classList.toggle('noche'); decir(sala.classList.contains('noche') ? '¡Qué acogedor!' : '¡Buenos días!'); }
      if (l === 'pecera') { b.classList.remove('burbujea'); void b.offsetWidth; b.classList.add('burbujea'); decir(azar(['¡Hola, pececitos!', 'Fish! 🐟', 'Blub blub'])); }
      if (l === 'planta') { b.classList.remove('mece'); void b.offsetWidth; b.classList.add('mece'); decir(azar(['¡Crece, plantita!', 'Plants are cool!'])); }
    });
  }
  pintarDeco();
  $('#cu-armario', root).onclick = e => { if (!editando) abrir('armario'); else if (!e.detail) elegir(e.currentTarget); };

  // ---------- Editor de muebles: agarrar, arrastrar y soltar ----------
  // Mano abierta mientras no sostiene nada; mano cerrada mientras sostiene un mueble. Al soltarlo se queda
  // justo donde cayó (sin gravedad: solo un pequeño rebote de "aterrizaje"). Guarda prefs.posCuarto.
  const btnEditar = $('#cu-editar', root), ayuda = $('#cu-ayuda', root), armario = $('#cu-armario', root);
  const herr = $('#cu-herr', root);
  const elDe = id => sala.querySelector(`[data-id="${id}"]`);
  function editar(si) {
    editando = si;
    sala.classList.toggle('editando', si);
    btnEditar.setAttribute('aria-pressed', String(si));
    btnEditar.innerHTML = si ? ICONOS.listo : ICONOS.mover;
    btnEditar.setAttribute('aria-label', si ? 'Listo' : 'Mover muebles'); btnEditar.title = si ? 'Listo' : 'Mover muebles';
    ayuda.hidden = !si; $('#cu-ordenar', root).hidden = !si;
    armario.setAttribute('aria-label', si ? 'Mover: Armario' : 'Abrir el armario');
    elegir(null);
    pintarDeco();
    if (si) { if (panel) abrir(panel); decir(azar(['¡A redecorar!', "Let's move things!"])); }
    else decir(azar(['¡Quedó genial!', 'I love it!']));
  }
  btnEditar.onclick = () => editar(!editando);
  $('#cu-ordenar', root).onclick = async () => {
    pos = {}; espejo = {}; sobre = {}; elegir(null); await guardar();
    armario.style.cssText = caja('armario', 'armario'); armario.classList.remove('espejo');
    pintarDeco(); decir('¡Todo en su lugar!');
  };

  // ---------- Elegir un mueble (tocarlo sin moverlo) y voltearlo en espejo ----------
  function elegir(el) {
    sala.querySelectorAll('.elegido').forEach(x => x.classList.remove('elegido'));
    elegido = el ? el.dataset.id : null;
    herr.hidden = !el;
    if (!el) return;
    el.classList.add('elegido');
    const [x, y, w, h] = cajaDe(elegido, pos);
    herr.style.left = `${limitar(x + w / 2, 8, 92)}%`;
    // La barrita va arriba del mueble; si no cabe (lámpara, ventana, estante), va debajo.
    const alto = (herr.offsetHeight + 12) / sala.clientHeight * 100, abajo = y < alto;
    herr.classList.toggle('abajo', abajo);
    herr.style.top = `${abajo ? Math.min(y + h, 100 - alto) : y}%`;
  }
  function voltear(el) {
    const id = el.dataset.id;
    if (espejo[id]) delete espejo[id]; else espejo[id] = true;
    el.classList.toggle('espejo', !!espejo[id]);
    el.classList.remove('aterriza'); void el.offsetWidth; el.classList.add('aterriza');
    guardar(); decir(azar(['¡Al revés!', 'Flip!', '¡Así se ve mejor!']));
  }
  $('#cu-espejo', root).onclick = () => { const el = elegido && elDe(elegido); if (el) { voltear(el); elegir(el); } };

  // Pone el mueble en (x, y) sin dejarlo salir del cuarto (la lámpara cuelga del techo: puede asomar un poco
  // por arriba) y devuelve la posición final.
  function colocar(el, x, y) {
    const [, , w, h] = cajaDe(el.dataset.id, pos);
    x = limitar(x, 0, 100 - w);
    y = limitar(y, el.dataset.lugar === 'lampara' ? -h * 0.2 : 0, 100 - h);
    el.style.left = `${x}%`; el.style.top = `${y}%`;
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
  }
  // Deja el mueble en (x, y). Una planta que cae sobre el tablero de la mesa queda encima de ella.
  function aterrizar(el, x, y, { rebote = true } = {}) {
    const id = el.dataset.id;
    pos = { ...pos, [id]: [x, y] };
    if (el.dataset.lugar === 'planta') {
      const m = mesaBajo(id);
      if (m && !sobre[id]) decir(azar(['¡Sobre la mesa!', 'On the table!']));
      if (m) sobre[id] = m; else delete sobre[id];
    }
    el.style.zIndex = zItem(id, el.dataset.lugar);
    if (el.dataset.lugar === 'mesa') encima(id).forEach(p => { p.style.zIndex = zItem(p.dataset.id, 'planta'); });
    if (rebote) { el.classList.remove('aterriza'); void el.offsetWidth; el.classList.add('aterriza'); }
    guardar();
  }
  const encima = mesaId => [...sala.querySelectorAll('.cu-planta')].filter(p => sobre[p.dataset.id] === mesaId);

  sala.addEventListener('pointerdown', e => {
    if (!editando || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('#cu-herr')) return;
    const el = e.target.closest('.cu-item, .cu-armario');
    if (!el) { elegir(null); return; }
    e.preventDefault();
    const r = sala.getBoundingClientRect();
    const enX = ev => (ev.clientX - r.left) / r.width * 100, enY = ev => (ev.clientY - r.top) / r.height * 100;
    const [x0, y0] = cajaDe(el.dataset.id, pos);
    const dx = enX(e) - x0, dy = enY(e) - y0;
    // Al mover una mesa se llevan las plantas que tiene encima.
    const plantas = el.dataset.lugar === 'mesa' ? encima(el.dataset.id).map(p => ({ p, xy: cajaDe(p.dataset.id, pos) })) : [];
    let fin = [x0, y0], movio = false;
    el.setPointerCapture(e.pointerId);
    const levantar = (si) => {
      [el, ...plantas.map(o => o.p)].forEach((x, i) => { x.classList.toggle('agarrado', si); if (si) { x.classList.remove('aterriza'); x.style.zIndex = 250 + i; } });
      sala.classList.toggle('arrastrando', si); document.documentElement.classList.toggle('cu-agarrando', si);
    };
    levantar(true);
    const mover = ev => {
      const px = enX(ev), py = enY(ev);
      if (!movio && Math.hypot(px - dx - x0, py - dy - y0) < 0.6) return;   // un toque sin mover = elegirlo
      if (!movio) { movio = true; elegir(null); }
      fin = colocar(el, px - dx, py - dy);
      plantas.forEach(o => { o.fin = colocar(o.p, o.xy[0] + fin[0] - x0, o.xy[1] + fin[1] - y0); });
    };
    const soltar = () => {
      el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar); el.removeEventListener('pointercancel', soltar);
      levantar(false);
      if (movio) { aterrizar(el, ...fin); plantas.forEach(o => aterrizar(o.p, ...o.fin)); }
      else { el.style.zIndex = zItem(el.dataset.id, el.dataset.lugar); plantas.forEach(o => { o.p.style.zIndex = zItem(o.p.dataset.id, 'planta'); }); elegir(el); }
    };
    el.addEventListener('pointermove', mover); el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
  });
  // Teclado: las flechas mueven el mueble elegido (1 %; con Mayús, 5 %) y la E lo voltea.
  const PASO = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  sala.addEventListener('keydown', e => {
    const el = e.target.closest?.('.cu-item, .cu-armario');
    if (!editando || !el) return;
    if (e.key === 'e' || e.key === 'E') { e.preventDefault(); voltear(el); return; }
    if (!PASO[e.key]) return;
    e.preventDefault();
    const [x, y] = cajaDe(el.dataset.id, pos), k = e.shiftKey ? 5 : 1;
    const fin = colocar(el, x + PASO[e.key][0] * k, y + PASO[e.key][1] * k);
    const plantas = el.dataset.lugar === 'mesa' ? encima(el.dataset.id) : [];
    plantas.forEach(p => { const [px, py] = cajaDe(p.dataset.id, pos); p.fin = colocar(p, px + fin[0] - x, py + fin[1] - y); });
    aterrizar(el, ...fin, { rebote: false });
    plantas.forEach(p => aterrizar(p, ...p.fin, { rebote: false }));
    if (elegido === el.dataset.id) elegir(el);
  });

  // ---------- Foto del cuarto: se dibuja en un canvas lo que se ve y se descarga como PNG ----------
  // Recorre las piezas visibles en el orden en que se pintan (z-index; Cebollo con sus capas en el orden del DOM),
  // con el espejo y la luz de noche. Sin el globo, las burbujas ni los resaltados del editor.
  async function tomarFoto() {
    const r0 = sala.getBoundingClientRect(), k = 1600 / r0.width;
    const lienzo = document.createElement('canvas');
    lienzo.width = 1600; lienzo.height = Math.round(r0.height * k);
    const g = lienzo.getContext('2d');
    g.fillStyle = '#f6efe0'; g.fillRect(0, 0, lienzo.width, lienzo.height);
    const cargada = img => img.complete && img.naturalWidth ? img : new Promise(ok => { img.onload = img.onerror = () => ok(img); });
    const pintar = async (img, espejado = false) => {
      await cargada(img);
      if (!img.naturalWidth || getComputedStyle(img).opacity === '0') return;
      const r = img.getBoundingClientRect();
      const x = (r.left - r0.left) * k, y = (r.top - r0.top) * k, w = r.width * k, h = r.height * k;
      g.save();
      if (espejado) { g.translate(x + w, y); g.scale(-1, 1); g.drawImage(img, 0, 0, w, h); } else g.drawImage(img, x, y, w, h);
      g.restore();
    };
    await pintar($('.cu-fondo', sala));
    const cebEl = $('#cu-cebollo', sala);
    const piezas = [...sala.querySelectorAll('.cu-item, .cu-armario'), cebEl]
      .map((el, i) => ({ el, i, z: +getComputedStyle(el).zIndex || 0 })).sort((a, b) => a.z - b.z || a.i - b.i);
    for (const { el } of piezas) {
      if (el === cebEl) {
        // sombra de contacto (la del ::before) y luego cuerpo, cabeza y ropa
        const r = cebEl.getBoundingClientRect();
        const cx = (r.left + r.width / 2 - r0.left) * k, cy = (r.bottom - r0.top + r.height * .01) * k;
        const rx = r.width * .35 * k, ry = r.height * .035 * k;
        g.save(); g.translate(cx, cy); g.scale(1, ry / rx);
        const sombra = g.createRadialGradient(0, 0, 0, 0, 0, rx);
        sombra.addColorStop(0, 'rgba(90,55,20,.38)'); sombra.addColorStop(1, 'rgba(90,55,20,0)');
        g.fillStyle = sombra; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore();
        for (const img of cebEl.querySelectorAll('img')) await pintar(img);
      } else await pintar($('img', el), el.classList.contains('espejo'));
    }
    if (sala.classList.contains('noche')) {
      g.save(); g.globalCompositeOperation = 'multiply';
      g.fillStyle = 'rgba(20,20,70,.5)'; g.fillRect(0, 0, lienzo.width, lienzo.height);
      const luz = g.createRadialGradient(lienzo.width / 2, lienzo.height * .18, 0, lienzo.width / 2, lienzo.height * .18, lienzo.width * .35);
      luz.addColorStop(0, 'rgba(255,226,140,.55)'); luz.addColorStop(1, 'rgba(255,226,140,0)');
      g.fillStyle = luz; g.fillRect(0, 0, lienzo.width, lienzo.height); g.restore();
    }
    const blob = await new Promise(ok => lienzo.toBlob(ok, 'image/png'));
    const a = document.createElement('a');
    const hoy = new Date(), dd = n => String(n).padStart(2, '0');
    a.href = URL.createObjectURL(blob);
    a.download = `cuarto-de-cebollo-${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-${dd(hoy.getDate())}-${dd(hoy.getHours())}${dd(hoy.getMinutes())}${dd(hoy.getSeconds())}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const btnFoto = $('#cu-foto', root);
  btnFoto.onclick = async () => {
    btnFoto.disabled = true;
    sala.classList.remove('flash'); void sala.offsetWidth; sala.classList.add('flash');
    try { await tomarFoto(); decir(azar(['¡Cheese! 📸', 'Say cheese!', '¡Qué buena foto!'])); }
    catch (e) { console.error(e); toast('No se pudo tomar la foto'); }
    finally { btnFoto.disabled = false; }
  };

  // ---------- Paneles: armario (ropa) y tienda (decoración) ----------
  const cajaPanel = $('#cu-panel', root);
  function abrir(cual) {
    if (panel === cual) { panel = null; cajaPanel.hidden = true; marcar(); return; }
    panel = cual; pestana = cual === 'armario' ? 'torso' : 'ventana';
    cajaPanel.hidden = false; pintarPanel(); marcar();
    cajaPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (cual === 'armario') { sala.classList.add('armario-abierto'); decir(azar(['¿Qué me pongo?', 'Choose my clothes!'])); }
    else sala.classList.remove('armario-abierto');
  }
  const marcar = () => root.querySelectorAll('[data-panel]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.panel === panel)));
  root.querySelectorAll('[data-panel]').forEach(b => b.onclick = () => abrir(b.dataset.panel));

  function pintarPanel() {
    const tabs = panel === 'armario' ? SLOTS : LUGARES;
    const pest = `<div class="cu-tabs" role="tablist">${Object.entries(tabs).map(([k, t]) =>
      `<button type="button" role="tab" class="cu-tab" data-tab="${k}" aria-selected="${k === pestana}">${t}</button>`).join('')}</div>`;
    let lista;
    if (panel === 'armario') {
      const mias = ROPA.filter(r => r.slot === pestana && ropaMia.has(r.id));
      const faltan = ROPA.filter(r => r.slot === pestana && !ropaMia.has(r.id)).length;
      lista = `<li><button type="button" class="cu-tile ${ropa[pestana] ? '' : 'on'}" data-quitar="${pestana}" aria-label="Nada" aria-pressed="${!ropa[pestana]}">
          <span class="cu-tile-img cu-nada" aria-hidden="true">✕</span></button></li>`
        + mias.map(r => `<li><button type="button" class="cu-tile ${ropa[pestana] === r.id ? 'on' : ''}" data-ropa="${r.id}" style="--rc:${RARITY[r.rarity].color}" aria-label="${esc(r.name)}" title="${esc(r.name)}" aria-pressed="${ropa[pestana] === r.id}">
          <img class="cu-tile-img" src="${urlIconoRopa(r.id)}" alt=""></button></li>`).join('');
      if (faltan) lista += `<li><a class="cu-falta" href="#/s/collection" aria-label="${faltan} más por ganar en el cofre" title="Cofre"><img src="img/cofre/cerrado-mini.png" alt=""><b>+${faltan}</b></a></li>`;
    } else {
      lista = DECO.filter(d => d.lugar === pestana).map(d => {
        const tiene = decoMia.has(d.id), usa = puesto[pestana] === d.id;
        const accion = tiene ? '' : `<span class="cu-precio ${monedas < d.precio ? 'falta' : ''}">${MONEDA(20)}${d.precio}</span>`;
        return `<li><button type="button" class="cu-tile ${usa ? 'on' : ''} ${!tiene && monedas < d.precio ? 'caro' : ''}" data-deco="${d.id}" aria-label="${esc(d.name)}${tiene ? '' : `, ${d.precio} monedas`}" title="${esc(d.name)}" aria-pressed="${usa}">
          <img class="cu-tile-img" src="${urlDeco(d.id)}" alt="">${accion}</button></li>`;
      }).join('');
    }
    cajaPanel.innerHTML = `<h2 class="sr-only">${panel === 'armario' ? 'Armario' : 'Tienda'}</h2>
      ${pest}<ul class="cu-grid">${lista}</ul>`;
    cajaPanel.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { pestana = b.dataset.tab; pintarPanel(); });
    cajaPanel.querySelectorAll('[data-ropa]').forEach(b => b.onclick = () => ponerRopa(pestana, b.dataset.ropa));
    cajaPanel.querySelectorAll('[data-quitar]').forEach(b => b.onclick = () => ponerRopa(pestana, null));
    cajaPanel.querySelectorAll('[data-deco]').forEach(b => b.onclick = () => tocarDeco(b.dataset.deco));
  }

  async function ponerRopa(slot, id) {
    if ((ropa[slot] || null) === id) return;
    ropa = { ...ropa, [slot]: id };
    if (!id) delete ropa[slot];
    await users.setPrefs(user.id, { ropa });
    ceb.vestir(ropa); ceb.reaccion('feliz'); decir(id ? azar(FRASES_ROPA) : '¡Así estoy cómodo!');
    pintarPanel(); refrescarEncabezado();
  }

  async function tocarDeco(id) {
    const d = DECO.find(x => x.id === id);
    if (!decoMia.has(id)) {
      if (monedas < d.precio) {
        const m = $('#cu-monedas', root); m.classList.remove('falta'); void m.offsetWidth; m.classList.add('falta');
        ceb.reaccion('sorpresa'); return;
      }
      await compras.add(user.id, id, d.precio);
      events.log(user.id, 'compra_deco', { itemId: id, precio: d.precio });
      decoMia.add(id); monedas -= d.precio; $('#monedas', root).textContent = monedas; $('#cu-monedas', root).setAttribute('aria-label', `${monedas} monedas`);
      puesto = { ...puesto, [d.lugar]: id };
      ceb.reaccion('festejo'); decir(azar(FRASES_COMPRA));
    } else {
      puesto = { ...puesto, [d.lugar]: puesto[d.lugar] === id ? null : id };
      if (puesto[d.lugar]) ceb.reaccion('feliz');
    }
    await users.setPrefs(user.id, { cuarto: puesto });
    pintarDeco(); pintarPanel();
  }

  // El busto del encabezado también se viste (sin recargar la página).
  const refrescarEncabezado = () => { const h = document.querySelector('.head-avatar'); if (h) h.innerHTML = cebolloMini(ropa, 36, { vivo: true, triste: !!h.querySelector('[data-vivo="triste"]') }); };

  return () => { clearTimeout(tGlobo); ceb.destruir(); document.documentElement.classList.remove('cu-agarrando'); };
}
