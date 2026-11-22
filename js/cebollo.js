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

import { archivoRopa, puestas } from "./rewards.js";

const RUTA = new URL("../img/cebollo/anim/", import.meta.url).href;
const RUTA_ROPA = new URL("../img/cebollo/ropa/", import.meta.url).href;
// Orden de las capas: piernas, pies y torso sobre el cuerpo; accesorios (bigote, cicatrices; pueden ser varios),
// gafas (y parche) y sombrero sobre la cabeza.
const CAPAS_TRONCO = ["piernas", "pies", "torso"], CAPAS_CABEZA = ["rostro", "cara", "sombrero"];
const capas = (ropa = {}, ranuras) => ranuras.flatMap(r => puestas(ropa, r)
  .map(id => `<img class="cebollo-ropa" data-ranura="${r}" src="${RUTA_ROPA}${archivoRopa(id)}" alt="" draggable="false">`)).join("");
const vestido = ropa => Object.values(ropa || {}).flat().some(Boolean);
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

// Busto vestido, para lugares chicos (encabezado, login, tarjetas). size = lado del cuadro en px.
// { vivo: true } (portada y encabezado del estudiante): parpadea y va cambiando de cara solo (animarMinis).
// { triste: true }: el estudiante aún no ha jugado hoy → cara triste fija; al terminar una actividad vuelve a animarse.
export function cebolloMini(ropa = {}, size = 48, { vivo = false, triste = false } = {}) {
  const inicial = triste ? "triste" : "normal";
  const img = (archivo, clase = "") => `<img class="${clase}" src="${RUTA}${archivo}.webp" alt="" draggable="false">`;
  const cabeza = vivo ? CARAS_MINI.map(c => img(c === "normal" ? "cabeza" : "cabeza_" + c, "ceb-cara" + (c === inicial ? " on" : ""))
    .replace("<img", `<img data-cara="${c}"`)).join("") : img("cabeza");
  if (vivo) animarMinis();
  const fig = `<span class="ceb-mini-fig">${img("cuerpo")}${capas(ropa, CAPAS_TRONCO)}${cabeza}${capas(ropa, CAPAS_CABEZA)}</span>`;
  // Vivo: la figura va en su propia caja recortada, para que el signo de pregunta (confundido) pueda salir por fuera.
  return vivo
    ? `<span class="ceb-mini vivo" style="--s:${size}px" aria-hidden="true" data-vivo="${triste ? "triste" : "si"}" data-cara="${inicial}"><span class="ceb-mini-caja">${fig}</span>${DUDA}</span>`
    : `<span class="ceb-mini" style="--s:${size}px" aria-hidden="true">${fig}</span>`;
}

// Caras del busto vivo (2026-11-21; serio, sonrisa, sonrisa_ojos y confundido salen del lote 14 de generar_cebollo.py).
// El peso es cuántas veces sale cada una: casi siempre contento, a veces serio, confundido o sorprendido.
const PESOS = { normal: 3, sonrisa: 3, sonrisa_ojos: 2, risa: 1, serio: 1, confundido: 1, sorpresa: 1 };
// triste / triste_parpadeo: cara_triste.py (mientras el estudiante no ha jugado hoy).
const CARAS_MINI = [...Object.keys(PESOS), "parpadeo", "triste", "triste_parpadeo", "triste_serio"];
const BOLSA = Object.entries(PESOS).flatMap(([c, n]) => Array(n).fill(c));
const SONRISAS = new Set(["normal", "sonrisa", "sonrisa_ojos", "risa"]);
// Signo de pregunta grande y blanco con contorno tinta que sale por fuera de la cabeza cuando está confundido.
const DUDA = `<svg class="ceb-duda" viewBox="0 0 40 60" aria-hidden="true">
  <path d="M10 17a10 10 0 1 1 14.5 9c-3 1.6-4.5 3.6-4.5 7.5v3" fill="none" stroke="#1a0f4d" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="20" cy="49" r="7" fill="#1a0f4d"/>
  <path d="M10 17a10 10 0 1 1 14.5 9c-3 1.6-4.5 3.6-4.5 7.5v3" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="20" cy="49" r="3.6" fill="#fff"/></svg>`;

// Cambio suave: la cara nueva aparece encima de la anterior (que se queda visible debajo hasta que termina).
// rapido = parpadeo (casi instantáneo).
function ponerCara(m, c, rapido = false) {
  const antes = m.querySelector(".ceb-cara.on"), nueva = m.querySelector(`.ceb-cara[data-cara="${c}"]`);
  if (!nueva || nueva === antes) return;
  m.classList.toggle("rapido", rapido);
  m.querySelectorAll(".ceb-cara.sale").forEach(i => i.classList.remove("sale"));
  if (antes) { antes.classList.remove("on"); antes.classList.add("sale"); setTimeout(() => antes.classList.remove("sale"), rapido ? 80 : 450); }
  nueva.classList.add("on");
  m.dataset.cara = c;
}
let tMinis = 0;
function animarMinis() {
  if (tMinis) return;
  tMinis = setInterval(() => {
    // Triste: casi siempre triste, parpadea (con ojos tristes) y a ratos se pone serio (sin perder las cejas ni la
    // lágrima: triste_serio); siempre vuelve a triste.
    document.querySelectorAll('.ceb-mini[data-vivo="triste"]').forEach(m => {
      const r = Math.random();
      if (r < 0.5) { ponerCara(m, "triste_parpadeo", true); setTimeout(() => ponerCara(m, "triste", true), 170); }
      else if (r < 0.7) { ponerCara(m, "triste_serio"); setTimeout(() => ponerCara(m, "triste"), 1300); }
    });
    document.querySelectorAll('.ceb-mini[data-vivo="si"]').forEach(m => {
      const antes = m.querySelector(".ceb-cara.on")?.dataset.cara || "normal";
      // Ya pasó el tiempo de la cara actual: cambia a otra (casi siempre).
      if (Date.now() >= (+m.dataset.hasta || 0) && Math.random() < 0.85) {
        const otras = BOLSA.filter(x => x !== antes);   // siempre una cara distinta a la que tiene
        const c = otras[Math.floor(Math.random() * otras.length)];
        ponerCara(m, c);
        // Las sonrisas se quedan un pelín más (5-6,5 s; mientras tanto solo parpadea). Las demás (serio, confundido,
        // sorpresa) son un gesto corto: a los ~2,5 s vuelve sola a una sonrisa.
        if (SONRISAS.has(c)) m.dataset.hasta = Date.now() + 5000 + Math.random() * 1500;
        else {
          m.dataset.hasta = Date.now() + 1e6;
          setTimeout(() => {
            const s = [...SONRISAS][Math.floor(Math.random() * SONRISAS.size)];
            ponerCara(m, s); m.dataset.hasta = Date.now() + 5000 + Math.random() * 1500;
          }, 2500);
        }
      } else if (Math.random() < 0.45) {   // parpadeo corto y vuelve a la cara que tenía
        ponerCara(m, "parpadeo", true);
        // Vuelve a la cara de antes solo si nada la cambió durante el parpadeo.
        setTimeout(() => { if (m.querySelector(".ceb-cara.on")?.dataset.cara === "parpadeo") ponerCara(m, antes, true); }, 170);
      }
    });
  }, 2200);
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
  // El marco no aparece vacío mientras llega la imagen.
  const img = el.querySelector("img");
  if (!img.complete && img.decode) { el.style.visibility = "hidden"; img.decode().then(() => { el.style.visibility = ""; }, () => el.remove()); }
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
