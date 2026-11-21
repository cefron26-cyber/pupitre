// Estudiante: el cuarto de Cebollo. Se puede tocar a Cebollo y a algunos objetos, comprar decoración con monedas
// (tienda) y cambiarle la ropa (armario). Cada lugar del cuarto lleva un objeto a la vez (prefs.cuarto[lugar]).
// Monedas = XP ganado − lo gastado (storage.compras). La ropa sale del cofre y de los retos (colección).
import { xp, users, userRewards, compras, events } from '../storage.js';
import { ROPA, SLOTS, DECO, LUGARES, RARITY, urlDeco, urlIconoRopa, ownedSet } from '../rewards.js';
import { crearCebollo, cebolloMini } from '../cebollo.js';
import { prefsOf } from './student.js';
import { esc, $, toast } from '../ui.js';

const FRASES = ['¡Hola, {n}!', 'Hello, {n}!', '¿Practicamos inglés hoy?', 'I love my room!', '¡Me gusta mi cuarto!',
  'Let\'s learn together!', '¡Tú puedes!', 'Good job today!', '¿Me compras una planta?', 'How are you?'];
const FRASES_ROPA = ['¡Me encanta!', 'Looking good!', '¡Qué estilo!', 'Nice!'];
const FRASES_COMPRA = ['¡Gracias!', 'Thank you!', '¡Qué bonito!', 'Wow!'];
const azar = l => l[Math.floor(Math.random() * l.length)];

export async function cuarto(root, { user }) {
  let prefs = prefsOf(user);
  let ropa = { ...prefs.ropa }, puesto = { ...prefs.cuarto };
  const nombre = esc(user.name.split(' ')[0]);
  const ropaMia = ownedSet((await userRewards.list(user.id)).map(r => r.rewardId));
  const decoMia = new Set([...DECO.filter(d => d.free).map(d => d.id), ...(await compras.list(user.id)).map(c => c.itemId)]);
  let monedas = (await xp.total(user.id)) - (await compras.gastado(user.id));
  let panel = null, pestana = null;

  root.innerHTML = `<div class="page-head"><div><h1>Cuarto de Cebollo</h1>
      <p class="muted">Tócalo para jugar. Decora su cuarto y cámbiale la ropa.</p></div>
      <span class="monedas" title="Ganas 1 moneda por cada XP"><span aria-hidden="true">🪙</span> <b id="monedas">${monedas}</b> monedas</span></div>
    <div class="cuarto" id="cuarto">
      <img class="cu-fondo" src="img/cuarto/cuarto.webp" alt="" draggable="false">
      <div id="cu-deco"></div>
      <button type="button" class="cu-armario" id="cu-armario" aria-label="Abrir el armario"><img src="img/cuarto/armario.webp" alt="" draggable="false"></button>
      <div class="cu-cebollo" id="cu-cebollo"><p class="cu-globo" id="cu-globo" role="status" aria-live="polite"></p></div>
      <div class="cu-luz" aria-hidden="true"></div>
    </div>
    <div class="cuarto-acciones">
      <button type="button" class="btn" data-panel="armario"><span aria-hidden="true">👕</span> Armario</button>
      <button type="button" class="btn" data-panel="tienda"><span aria-hidden="true">🛒</span> Tienda</button>
    </div>
    <section class="card cuarto-panel" id="cu-panel" hidden></section>`;

  const sala = $('#cuarto', root), globo = $('#cu-globo', root);
  const ceb = crearCebollo($('#cu-cebollo', root), { ropa, tocable: false });
  let tGlobo = 0;
  const decir = txt => {
    globo.textContent = txt.replace('{n}', user.name.split(' ')[0]);
    globo.classList.remove('ve'); void globo.offsetWidth; globo.classList.add('ve');
    clearTimeout(tGlobo); tGlobo = setTimeout(() => globo.classList.remove('ve'), 2600);
  };
  const tocarCebollo = () => { ceb.reaccion(azar(['feliz', 'sorpresa', 'festejo'])); decir(azar(FRASES)); };
  ceb.el.classList.add('tocable'); ceb.el.tabIndex = 0; ceb.el.setAttribute('aria-label', 'Cebollo: tócalo para jugar');
  ceb.el.addEventListener('click', tocarCebollo);
  ceb.el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tocarCebollo(); } });
  setTimeout(() => decir(`¡Hola, {n}!`), 500);

  // ---------- Decoración ----------
  function pintarDeco() {
    $('#cu-deco', root).innerHTML = Object.keys(LUGARES).filter(l => puesto[l]).map(l => {
      const d = DECO.find(x => x.id === puesto[l]);
      if (!d) return '';
      const toca = ['pecera', 'lampara', 'planta'].includes(l);
      return `<${toca ? 'button type="button"' : 'span'} class="cu-item cu-${l}" data-lugar="${l}" data-id="${d.id}" ${toca ? `aria-label="${esc(d.name)}"` : 'aria-hidden="true"'}>
        <img src="${urlDeco(d.id)}" alt="" draggable="false">${l === 'pecera' ? '<i class="cu-burbujas"><b></b><b></b><b></b></i>' : ''}</${toca ? 'button' : 'span'}>`;
    }).join('');
    sala.dataset.mesa = puesto.mesa ? 'si' : 'no';
    sala.querySelectorAll('button.cu-item').forEach(b => b.onclick = () => {
      const l = b.dataset.lugar;
      if (l === 'lampara') { sala.classList.toggle('noche'); decir(sala.classList.contains('noche') ? '¡Qué acogedor!' : '¡Buenos días!'); }
      if (l === 'pecera') { b.classList.remove('burbujea'); void b.offsetWidth; b.classList.add('burbujea'); decir(azar(['¡Hola, pececitos!', 'Fish! 🐟', 'Blub blub'])); }
      if (l === 'planta') { b.classList.remove('mece'); void b.offsetWidth; b.classList.add('mece'); decir(azar(['¡Crece, plantita!', 'Plants are cool!'])); }
    });
  }
  pintarDeco();
  $('#cu-armario', root).onclick = () => abrir('armario');

  // ---------- Paneles: armario (ropa) y tienda (decoración) ----------
  const caja = $('#cu-panel', root);
  function abrir(cual) {
    if (panel === cual) { panel = null; caja.hidden = true; marcar(); return; }
    panel = cual; pestana = cual === 'armario' ? 'torso' : 'ventana';
    caja.hidden = false; pintarPanel(); marcar();
    caja.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
      lista = `<li><button type="button" class="cu-tile ${ropa[pestana] ? '' : 'on'}" data-quitar="${pestana}">
          <span class="cu-tile-img cu-nada" aria-hidden="true">✕</span><b>Nada</b></button></li>`
        + mias.map(r => `<li><button type="button" class="cu-tile ${ropa[pestana] === r.id ? 'on' : ''}" data-ropa="${r.id}" style="--rc:${RARITY[r.rarity].color}">
          <img class="cu-tile-img" src="${urlIconoRopa(r.id)}" alt=""><b>${esc(r.name)}</b>${ropa[pestana] === r.id ? '<span class="small">Puesta</span>' : ''}</button></li>`).join('');
      if (faltan) lista += `<li class="cu-falta"><span aria-hidden="true">🎁</span><span class="small">${faltan} más por ganar en el <a href="#/s/collection">cofre</a> y los <a href="#/s/retos">retos</a></span></li>`;
    } else {
      lista = DECO.filter(d => d.lugar === pestana).map(d => {
        const tiene = decoMia.has(d.id), usa = puesto[pestana] === d.id;
        const accion = usa ? '<span class="small">Puesto · tocar para quitar</span>'
          : tiene ? '<span class="small">Tocar para poner</span>'
          : `<span class="cu-precio ${monedas < d.precio ? 'falta' : ''}">🪙 ${d.precio}</span>`;
        return `<li><button type="button" class="cu-tile ${usa ? 'on' : ''} ${!tiene && monedas < d.precio ? 'caro' : ''}" data-deco="${d.id}">
          <img class="cu-tile-img" src="${urlDeco(d.id)}" alt=""><b>${esc(d.name)}</b>${accion}</button></li>`;
      }).join('');
    }
    caja.innerHTML = `<h2 class="cu-titulo">${panel === 'armario' ? 'Armario' : 'Tienda'}${panel === 'tienda' ? ` <span class="small muted">Tienes 🪙 ${monedas}</span>` : ''}</h2>
      ${pest}<ul class="cu-grid">${lista}</ul>`;
    caja.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { pestana = b.dataset.tab; pintarPanel(); });
    caja.querySelectorAll('[data-ropa]').forEach(b => b.onclick = () => ponerRopa(pestana, b.dataset.ropa));
    caja.querySelectorAll('[data-quitar]').forEach(b => b.onclick = () => ponerRopa(pestana, null));
    caja.querySelectorAll('[data-deco]').forEach(b => b.onclick = () => tocarDeco(b.dataset.deco));
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
      if (monedas < d.precio) { toast(`Te faltan ${d.precio - monedas} monedas. ¡Gana XP practicando!`); return; }
      await compras.add(user.id, id, d.precio);
      events.log(user.id, 'compra_deco', { itemId: id, precio: d.precio });
      decoMia.add(id); monedas -= d.precio; $('#monedas', root).textContent = monedas;
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
  const refrescarEncabezado = () => { const h = document.querySelector('.head-avatar'); if (h) h.innerHTML = cebolloMini(ropa, 36); };

  return () => { clearTimeout(tGlobo); ceb.destruir(); };
}
