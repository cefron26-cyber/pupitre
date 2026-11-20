// Cliente de la generación con IA. Habla solo con nuestro servidor (/api/...), nunca con Gemini directamente:
// la clave no sale del servidor. Si no hay servidor con IA (p. ej. página estática), estadoIA() devuelve activa:false
// y la interfaz oculta el botón "Generar con IA".
import { TIPOS_IA, validarContenido } from './ia-reglas.mjs';

export { TIPOS_IA, validarContenido };

let cache;
export async function estadoIA() {
  if (!cache) {
    cache = fetch('/api/ia/estado', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { activa: false }))
      .catch(() => ({ activa: false }));
  }
  return cache;
}

export const puedeGenerar = async tipo => TIPOS_IA.includes(tipo) && (await estadoIA()).activa;

// pedido = { tipo, tema, grado, cantidad, formato?, relacion?, banco?, notas? }
// → { titulo, contenido, modelo }. Lanza Error con un mensaje en español listo para mostrar.
export async function generar(pedido, { signal } = {}) {
  let r;
  try {
    r = await fetch('/api/generar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido), signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error('No hay conexión con el servidor de la plataforma.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 429) throw new Error('Se agotó la cuota de la IA por ahora. Intenta en un minuto.');
    throw new Error(j.error || 'No se pudo generar. Intenta de nuevo.');
  }
  // Segunda revisión en el navegador (misma regla que el servidor).
  const errores = validarContenido(pedido.tipo, j.contenido);
  if (errores.length) throw new Error(`El contenido generado tiene problemas: ${errores[0]}`);
  return j;
}
