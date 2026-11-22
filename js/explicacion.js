// Explicación de una unidad (opcional): el docente escribe texto sencillo y aquí se convierte en tarjetas de colores.
// Solo las unidades la tienen (unit.explicacion = { texto, video }). El estudiante la ve en su propia pantalla y,
// después, el video de YouTube solo en otra pantalla.
//
// Cómo se escribe (una cosa por línea):
//   # Título            → tarjeta nueva, cada una de otro color
//   texto normal        → párrafo (**palabra** = resaltada)
//   - punto             → lista
//   = I + play + soccer → fórmula: cada parte en su ficha de color
//   ! texto  /  Recuerda: texto  → cuadro "Recuerda"
//   ej: She plays soccer. (Ella juega fútbol.) → ejemplo con botón para escucharlo; lo de los paréntesis, traducción
//   I | play            → tabla (líneas seguidas con |; la primera es el encabezado)
//       She | plays
import { esc } from './ui.js';

export const AYUDA = [
  ['# Título', 'Empieza una tarjeta nueva (cada una sale de otro color).'],
  ['Texto normal', 'Un párrafo. **palabra** la resalta.'],
  ['- punto', 'Lista con viñetas.'],
  ['= He + plays + soccer', 'Fórmula: cada parte en una ficha de color.'],
  ['! texto', 'Cuadro "Recuerda" (también: Recuerda: texto).'],
  ['ej: She plays. (Ella juega.)', 'Ejemplo con botón para escucharlo; lo de los paréntesis es la traducción.'],
  ['I | play\nShe | plays', 'Tabla: líneas seguidas separadas con |. La primera fila es el encabezado.'],
];

export const LIMITE_TEXTO = 4000;

// Texto → bloques [{ tipo, ... }] agrupados en secciones [{ titulo, bloques }].
export function parsear(texto) {
  const secciones = [];
  let sec = null;
  const nueva = titulo => { sec = { titulo, bloques: [] }; secciones.push(sec); };
  const agregar = b => { if (!sec) nueva(''); const ult = sec.bloques.at(-1);
    // Líneas seguidas del mismo tipo se juntan (lista, tabla, párrafo).
    if (ult && ult.tipo === b.tipo && ['lista', 'tabla'].includes(b.tipo)) ult.items.push(...b.items);
    else sec.bloques.push(b);
  };
  let enBlanco = true;
  for (const crudo of String(texto || '').split(/\r?\n/)) {
    const l = crudo.trim();
    if (!l) { enBlanco = true; continue; }
    let m;
    if ((m = l.match(/^#{1,3}\s*(.+)$/))) nueva(m[1].trim());
    else if ((m = l.match(/^[-•*]\s+(.+)$/))) agregar({ tipo: 'lista', items: [m[1]] });
    else if ((m = l.match(/^=\s*(.+)$/))) agregar({ tipo: 'formula', partes: m[1].split(/\s+\+\s+/).map(x => x.trim()).filter(Boolean) });
    else if ((m = l.match(/^(?:!+|recuerda\s*:|ojo\s*:|importante\s*:)\s*(.+)$/i))) agregar({ tipo: 'recuerda', texto: m[1] });
    else if ((m = l.match(/^(?:ej|ejemplo|example|e\.g\.)\s*[:.]\s*(.+)$/i) || l.match(/^>\s*(.+)$/))) {
      const t = m[1].match(/^(.*?)\s*\(([^()]+)\)\s*$/);
      agregar({ tipo: 'ejemplo', en: (t ? t[1] : m[1]).trim(), es: t ? t[2].trim() : '' });
    } else if (l.includes('|')) {
      const celdas = l.replace(/^\||\|$/g, '').split('|').map(x => x.trim());
      if (celdas.every(c => /^:?-{2,}:?$/.test(c))) continue; // separador estilo Markdown (|---|---|)
      // Una línea en blanco antes de la fila empieza otra tabla.
      if (enBlanco) sec?.bloques.push({ tipo: '_corte' });
      agregar({ tipo: 'tabla', items: [celdas] });
    } else agregar({ tipo: 'parrafo', texto: l }); // cada línea, su propio párrafo (como la escribió el docente)
    enBlanco = false;
  }
  for (const s of secciones) s.bloques = s.bloques.filter(b => b.tipo !== '_corte');
  return secciones.filter(s => s.titulo || s.bloques.length);
}

// **resaltado** después de escapar (nunca se acepta HTML del docente ni de la IA).
const enLinea = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<mark>$1</mark>');

const COLORES = 5;
function bloqueHTML(b) {
  switch (b.tipo) {
    case 'parrafo': return `<p class="ex-p">${enLinea(b.texto)}</p>`;
    case 'lista': return `<ul class="ex-lista">${b.items.map(x => `<li>${enLinea(x)}</li>`).join('')}</ul>`;
    case 'formula': return `<div class="ex-formula">${b.partes.map((p, i) => `${i ? '<span class="ex-mas" aria-hidden="true">+</span>' : ''}<span class="ex-ficha f${i % 4}">${enLinea(p)}</span>`).join('')}</div>`;
    case 'recuerda': return `<div class="ex-recuerda"><b>Recuerda</b><span>${enLinea(b.texto)}</span></div>`;
    case 'ejemplo': return `<div class="ex-ejemplo"><button type="button" class="ex-oir" data-oir="${esc(b.en)}" aria-label="Escuchar: ${esc(b.en)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
        <span><b lang="en">${enLinea(b.en)}</b>${b.es ? `<small>${enLinea(b.es)}</small>` : ''}</span></div>`;
    case 'tabla': {
      const ancho = Math.max(...b.items.map(f => f.length));
      const fila = (f, tag) => `<tr>${Array.from({ length: ancho }, (_, i) => `<${tag}>${enLinea(f[i] || '')}</${tag}>`).join('')}</tr>`;
      const [cab, ...resto] = b.items;
      return `<div class="ex-tabla-caja"><table class="ex-tabla">${resto.length ? `<thead>${fila(cab, 'th')}</thead><tbody>${resto.map(f => fila(f, 'td')).join('')}</tbody>` : `<tbody>${fila(cab, 'td')}</tbody>`}</table></div>`;
    }
    default: return '';
  }
}

export function explicacionHTML(texto) {
  const secs = parsear(texto);
  if (!secs.length) return '';
  return `<div class="explicacion">${secs.map((s, i) => `<section class="ex-sec c${i % COLORES}">
    ${s.titulo ? `<h3 class="ex-t">${enLinea(s.titulo)}</h3>` : ''}${s.bloques.map(bloqueHTML).join('')}</section>`).join('')}</div>`;
}

// Pinta la explicación y conecta los botones para escuchar los ejemplos (voces de Microsoft con servidor;
// si no, la del navegador). → función para cortar el audio al salir.
export function montarExplicacion(contenedor, texto) {
  contenedor.innerHTML = explicacionHTML(texto);
  let voz = null;
  contenedor.addEventListener('click', async e => {
    const b = e.target.closest('[data-oir]');
    if (!b) return;
    voz ??= await import('./voz.js');
    contenedor.querySelectorAll('.ex-oir.sonando').forEach(x => x.classList.remove('sonando'));
    b.classList.add('sonando');
    await voz.reproducirVoz([{ texto: b.dataset.oir, voz: 'mujer' }], { velocidad: 0.95 });
    b.classList.remove('sonando');
  });
  return () => voz?.detenerVoz();
}

// ---------- YouTube ----------
// Link de YouTube (watch, youtu.be, shorts, embed, live, con ?t= o &start=) → { id, inicio } o null.
export function youtube(url) {
  const s = String(url || '').trim();
  if (!s) return null;
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); } catch { return null; }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v') || u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)?.[1] || null;
  }
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  const t = u.searchParams.get('t') || u.searchParams.get('start') || '';
  const m = String(t).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  const inicio = m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
  return { id, inicio };
}

// Mini reproductor 16:9. youtube-nocookie: YouTube no guarda cookies del estudiante hasta que le da Play.
// rel=0: al final solo sugiere videos del mismo canal (YouTube no deja quitar las sugerencias del todo).
export function videoHTML(url, titulo = 'Video de la unidad') {
  const v = youtube(url);
  if (!v) return '';
  const src = `https://www.youtube-nocookie.com/embed/${v.id}?rel=0&playsinline=1&modestbranding=1${v.inicio ? `&start=${v.inicio}` : ''}`;
  return `<div class="ex-video"><iframe src="${src}" title="${esc(titulo)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
    <a class="ex-video-link" href="https://www.youtube.com/watch?v=${v.id}${v.inicio ? `&t=${v.inicio}s` : ''}" target="_blank" rel="noopener">¿No se ve? Ábrelo en YouTube</a>`;
}

// Normaliza lo que se guarda en la unidad. → { texto, video } o null si no hay nada.
export function limpiarExplicacion(x) {
  const texto = String(x?.texto || '').replace(/\r\n/g, '\n').trim().slice(0, LIMITE_TEXTO);
  const video = youtube(x?.video) ? String(x.video).trim().slice(0, 300) : '';
  return texto || video ? { texto, video } : null;
}
export const tieneExplicacion = unit => !!(unit?.explicacion?.texto?.trim() || youtube(unit?.explicacion?.video));
