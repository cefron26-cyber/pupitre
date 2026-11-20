// Buscador de imágenes de internet para los editores de Emparejar y Memoria.
// Habla con nuestro servidor (/api/imagenes); si no hay servidor, el botón no aparece.
// elegirImagen(consulta) → { image: dataURL ≤ 400 px, credit } o null si se cancela.
import { el, esc, $, compressImage } from './ui.js';

// Solo se aceptan imágenes incrustadas (data:image). Evita que un texto raro se cuele en el atributo src.
export const safeSrc = s => (/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s || '') ? s : '');

let estado;
export function buscadorDisponible() {
  estado ??= fetch('/api/ia/estado', { cache: 'no-store' }).then(r => (r.ok ? r.json() : {})).then(j => !!j.imagenes).catch(() => false);
  return estado;
}

export const ICONO_BUSCAR = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';

export function elegirImagen(consulta = '') {
  return new Promise(resolve => {
    let elegido = null;
    const d = el(`<dialog class="img-dialog">
      <h2 class="ia-h">${ICONO_BUSCAR} Buscar imagen en internet</h2>
      <form class="img-buscar" novalidate>
        <input type="search" id="imgQ" maxlength="80" placeholder="Ej. apple, red car, happy dog" value="${esc(consulta)}" aria-label="Qué imagen buscas">
        <button class="btn" type="submit">Buscar</button>
      </form>
      <p class="small muted" style="margin:6px 0 12px">Busca en inglés para mejores resultados. Imágenes con licencia libre (Openverse), sin contenido para adultos.</p>
      <div class="img-res" aria-live="polite"></div>
      <div class="row end" style="margin-top:12px"><button class="btn ghost" type="button" data-cancel>Cancelar</button></div>
    </dialog>`);
    document.body.append(d);
    const res = $('.img-res', d), q = $('#imgQ', d);
    const msg = (t, err) => { res.innerHTML = `<p class="${err ? 'errors' : 'small muted'}" style="padding:0;list-style:none">${esc(t)}</p>`; };

    const buscar = async () => {
      const texto = q.value.trim();
      if (texto.length < 2) return msg('Escribe qué imagen buscas.', true);
      msg('Buscando…');
      try {
        const r = await fetch(`/api/imagenes?q=${encodeURIComponent(texto)}`);
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'No se pudo buscar.');
        if (!j.resultados.length) return msg('No encontré imágenes. Prueba con otra palabra (en inglés).');
        res.innerHTML = '';
        for (const it of j.resultados) {
          const b = el(`<button type="button" class="img-op" title="${esc(it.credito)}">
            <img src="/api/imagenes/ver/${encodeURIComponent(it.id)}" alt="${esc(it.titulo)}" loading="lazy"></button>`);
          b.querySelector('img').onerror = () => b.remove();
          b.onclick = () => tomar(it, b);
          res.append(b);
        }
      } catch (e) { msg(e.message, true); }
    };

    const tomar = async (it, b) => {
      d.querySelectorAll('.img-op').forEach(x => (x.disabled = true));
      b.classList.add('cargando');
      try {
        const r = await fetch(`/api/imagenes/ver/${encodeURIComponent(it.id)}`);
        if (!r.ok) throw new Error('No se pudo traer esa imagen. Prueba con otra.');
        elegido = { image: await compressImage(await r.blob()), credit: it.credito };
        d.close();
      } catch (e) {
        d.querySelectorAll('.img-op').forEach(x => (x.disabled = false));
        b.classList.remove('cargando');
        res.prepend(el(`<p class="errors" style="grid-column:1/-1;padding:0;list-style:none;margin:0">${esc(e.message)}</p>`));
      }
    };

    $('form', d).onsubmit = e => { e.preventDefault(); buscar(); };
    $('[data-cancel]', d).onclick = () => d.close();
    d.addEventListener('close', () => { d.remove(); resolve(elegido); }, { once: true });
    d.showModal();
    if (consulta.trim().length >= 2) buscar(); else q.focus();
  });
}
