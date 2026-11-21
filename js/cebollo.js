// Cebollo, la mascota: figura animada hecha de piezas (cuerpo + cabeza con caras + pose de festejo).
// Arte en img/cebollo/anim/ (herramientas/arte/animar_cebollo.py). Estilos en css/estudiante.css (.cebollo).
//
//   const c = crearCebollo(contenedor, { ropa: { torso: "hoodie_azul", ... } });   // respira y parpadea solo
//   c.reaccion("feliz" | "sorpresa" | "festejo");   // reacción corta y vuelve a quieto
//   c.vestir(ropa);   c.destruir();
//   cebolloMini(ropa, 36)   // HTML del busto quieto y vestido (encabezado, login, tarjetas)
//
// Ropa: capas en img/cebollo/ropa/ (herramientas/arte/recortar_ropa.py) sobre el mismo lienzo que el cuerpo, con
// margen (MARGEN) para que quepan gorras y sombreros. Las del cuerpo respiran con él; las de la cabeza cabecean con ella.

import { archivoRopa } from "./rewards.js";

const RUTA = new URL("../img/cebollo/anim/", import.meta.url).href;
const RUTA_ROPA = new URL("../img/cebollo/ropa/", import.meta.url).href;
// Orden de las capas: piernas, pies y torso sobre el cuerpo; gafas y sombrero sobre la cabeza.
const CAPAS_TRONCO = ["piernas", "pies", "torso"], CAPAS_CABEZA = ["cara", "sombrero"];
const capas = (ropa = {}, ranuras) => ranuras.filter(r => ropa[r])
  .map(r => `<img class="cebollo-ropa" data-ranura="${r}" src="${RUTA_ROPA}${archivoRopa(ropa[r])}" alt="" draggable="false">`).join("");
const vestido = ropa => Object.values(ropa || {}).some(Boolean);
const CARAS = ["normal", "parpadeo", "sorpresa", "risa"];
const DURACION = { feliz: 1100, sorpresa: 900, festejo: 1700 };

export function crearCebollo(contenedor, { tocable = true, ropa = {} } = {}) {
  const raiz = document.createElement("div");
  raiz.className = "cebollo";
  raiz.dataset.estado = "quieto";
  raiz.dataset.cara = "normal";
  raiz.setAttribute("role", "img");
  raiz.setAttribute("aria-label", "Cebollo");
  const img = (archivo, clase) => `<img class="${clase}" src="${RUTA}${archivo}.webp" alt="" draggable="false">`;
  raiz.innerHTML = `
    <div class="cebollo-figura">
      <div class="cebollo-tronco">${img("cuerpo", "cebollo-cuerpo")}<span class="cebollo-capas"></span></div>
      <div class="cebollo-cabeza">
        ${CARAS.map(c => img(c === "normal" ? "cabeza" : "cabeza_" + c, "cebollo-cara").replace("<img", `<img data-cara="${c}"`)).join("")}
        <span class="cebollo-capas"></span>
      </div>
    </div>
    ${img("festejo", "cebollo-festejo")}`;
  contenedor.appendChild(raiz);

  let tParpadeo = 0, tReaccion = 0, vivo = true, puesta = {};
  function vestir(r = {}) {
    puesta = { ...r };
    const [tronco, cabeza] = raiz.querySelectorAll(".cebollo-capas");
    tronco.innerHTML = capas(puesta, CAPAS_TRONCO);
    cabeza.innerHTML = capas(puesta, CAPAS_CABEZA);
  }
  vestir(ropa);

  function parpadear() {
    if (!vivo) return;
    tParpadeo = setTimeout(() => {
      if (raiz.dataset.cara === "normal") {
        raiz.dataset.cara = "parpadeo";
        setTimeout(() => { if (raiz.dataset.cara === "parpadeo") raiz.dataset.cara = "normal"; }, 150);
      }
      parpadear();
    }, 2200 + Math.random() * 3000);
  }

  function reaccion(nombre) {
    if (!DURACION[nombre]) return;
    if (nombre === "festejo" && vestido(puesta)) nombre = "feliz";   // la pose de festejo no tiene ropa
    clearTimeout(tReaccion);
    raiz.dataset.estado = "quieto";
    void raiz.offsetWidth;            // reinicia la animación si se repite la misma reacción
    raiz.dataset.estado = nombre;
    raiz.dataset.cara = nombre === "sorpresa" ? "sorpresa" : "risa";
    tReaccion = setTimeout(() => { raiz.dataset.estado = "quieto"; raiz.dataset.cara = "normal"; }, DURACION[nombre]);
  }

  if (tocable) {
    raiz.classList.add("tocable");
    raiz.tabIndex = 0;
    const alTocar = () => reaccion(["feliz", "sorpresa", "festejo"][Math.floor(Math.random() * 3)]);
    raiz.addEventListener("click", alTocar);
    raiz.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); alTocar(); } });
  }

  parpadear();
  return {
    el: raiz,
    reaccion,
    vestir,
    destruir() { vivo = false; clearTimeout(tParpadeo); clearTimeout(tReaccion); raiz.remove(); },
  };
}

// Busto quieto y vestido, para lugares chicos (encabezado, login, tarjetas). size = lado del cuadro en px.
export function cebolloMini(ropa = {}, size = 48) {
  const img = (archivo, clase = "") => `<img class="${clase}" src="${RUTA}${archivo}.webp" alt="" draggable="false">`;
  return `<span class="ceb-mini" style="--s:${size}px" aria-hidden="true"><span class="ceb-mini-fig">
    ${img("cuerpo")}${capas(ropa, CAPAS_TRONCO)}${img("cabeza")}${capas(ropa, CAPAS_CABEZA)}</span></span>`;
}

// ---- Emotes: Cebollo reacciona al progreso (tarjeta que "salta", estilo emote de juego) ----
// Arte en img/cebollo/emotes/ (animar_cebollo.py emotes). Estilos .emote en css/estudiante.css.
//   mostrarEmote(contenedor, "pulgar" | "sonrisa" | "ok" | "brazos" | "triste" | "copa" | "enojado", { duracion: 2400 })   // 0 = se queda
export const EMOTES = { pulgar: "¡Bien hecho!", sonrisa: "¡Muy bien!", ok: "¡Perfecto!", brazos: "¡Así se hace!",
  triste: "Ay, casi…", copa: "¡Lo lograste!", enojado: "¡Grr!" };
// Reacciones de acierto: se turnan al azar para que Cebollo no repita siempre el mismo gesto.
const ACIERTO = ["pulgar", "sonrisa", "ok", "brazos"];
let ultimoAcierto = "";
export function emoteAcierto() {
  const opciones = ACIERTO.filter(n => n !== ultimoAcierto);
  return (ultimoAcierto = opciones[Math.floor(Math.random() * opciones.length)]);
}
const RUTA_EMOTES = new URL("../img/cebollo/emotes/", import.meta.url).href;
export const urlEmote = nombre => `${RUTA_EMOTES}${nombre}.webp`;

export function mostrarEmote(contenedor, nombre, { duracion = 2400 } = {}) {
  if (!EMOTES[nombre]) return null;
  const el = document.createElement("div");
  el.className = "emote";
  el.dataset.emote = nombre;
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", `Cebollo: ${EMOTES[nombre]}`);
  el.innerHTML = `<span class="emote-marco"></span><img src="${urlEmote(nombre)}" alt="" draggable="false">`;
  contenedor.appendChild(el);
  if (duracion > 0) {
    setTimeout(() => {
      el.classList.add("sale");
      el.addEventListener("animationend", () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 600);   // por si no hay animación (movimiento reducido)
    }, duracion);
  }
  return el;
}
