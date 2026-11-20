// Fondo del modo juego: cielo pixel art fijo y suelo pixel art al final de la página (arte en img/mundo/,
// generado con Nano Banana: herramientas/arte/generar_mundo.py). Los estilos están en css/modo-juego.css.
export function mundoHTML({ conSuelo = true } = {}) {
  return `<div class="mundo" aria-hidden="true"></div>${conSuelo ? '<div class="suelo" aria-hidden="true"></div>' : ''}`;
}
