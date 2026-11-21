// Cebollo, la mascota: figura animada hecha de piezas (cuerpo + cabeza con caras + pose de festejo).
// Arte en img/cebollo/anim/ (herramientas/arte/animar_cebollo.py). Estilos en css/estudiante.css (.cebollo).
//
//   const c = crearCebollo(contenedor);   // queda "quieto": respira y parpadea solo
//   c.reaccion("feliz" | "sorpresa" | "festejo");   // reacción corta y vuelve a quieto
//   c.destruir();

const RUTA = new URL("../img/cebollo/anim/", import.meta.url).href;
const CARAS = ["normal", "parpadeo", "sorpresa", "risa"];
const DURACION = { feliz: 1100, sorpresa: 900, festejo: 1700 };

export function crearCebollo(contenedor, { tocable = true } = {}) {
  const raiz = document.createElement("div");
  raiz.className = "cebollo";
  raiz.dataset.estado = "quieto";
  raiz.dataset.cara = "normal";
  raiz.setAttribute("role", "img");
  raiz.setAttribute("aria-label", "Cebollo");
  const img = (archivo, clase) => `<img class="${clase}" src="${RUTA}${archivo}.webp" alt="" draggable="false">`;
  raiz.innerHTML = `
    <div class="cebollo-figura">
      ${img("cuerpo", "cebollo-cuerpo")}
      <div class="cebollo-cabeza">
        ${CARAS.map(c => img(c === "normal" ? "cabeza" : "cabeza_" + c, "cebollo-cara").replace("<img", `<img data-cara="${c}"`)).join("")}
      </div>
    </div>
    ${img("festejo", "cebollo-festejo")}`;
  contenedor.appendChild(raiz);

  let tParpadeo = 0, tReaccion = 0, vivo = true;

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
    destruir() { vivo = false; clearTimeout(tParpadeo); clearTimeout(tReaccion); raiz.remove(); },
  };
}

// ---- Emotes: Cebollo reacciona al progreso (tarjeta que "salta", estilo emote de juego) ----
// Arte en img/cebollo/emotes/ (animar_cebollo.py emotes). Estilos .emote en css/estudiante.css.
//   mostrarEmote(contenedor, "pulgar" | "triste" | "copa" | "enojado", { duracion: 2400 })   // 0 = se queda
export const EMOTES = { pulgar: "¡Bien hecho!", triste: "Ay, casi…", copa: "¡Lo lograste!", enojado: "¡Grr!" };
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
