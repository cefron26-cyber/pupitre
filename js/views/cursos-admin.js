// Docente: gestión de cursos y estudiantes (2026-11-19).
// Crear cursos por grado y sección (Sexto A, B, C, D…), editarlos o eliminarlos; agregar estudiantes pegando
// una lista de nombres, ver y entregar sus accesos, cambiarles el nombre o la contraseña, moverlos de curso o eliminarlos.
import { courses, users, GRADE_NAMES, courseName } from '../storage.js';
import { esc, el, toast, confirmDialog } from '../ui.js';

const SECCIONES = ['A', 'B', 'C', 'D', 'E', 'F'];
// Niveles del Marco Común Europeo de Referencia (MCER): la meta de inglés del curso.
export const MCER = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1'];
const mcerSelect = (v = '') => `<select name="cefr" id="cefr"><option value="">Sin definir</option>${MCER.map(m => `<option ${m === v ? 'selected' : ''}>${m}</option>`).join('')}</select>`;
const seccionDe = c => c.section || (c.name.split(' ').length > 1 ? c.name.split(' ').pop() : '');

// Diálogo genérico: devuelve el FormData al aceptar o null al cancelar.
function dialogo(html, okText = 'Guardar', { ancho = 480, validar } = {}) {
  return new Promise(resolve => {
    const d = el(`<dialog class="adm-dialog" style="max-width:${ancho}px"><form method="dialog" novalidate>${html}
      <p class="adm-err" role="alert" hidden></p>
      <div class="row end" style="margin-top:18px"><button class="btn ghost" value="no" type="button" data-x>Cancelar</button>
      <button class="btn" value="ok" type="submit">${esc(okText)}</button></div></form></dialog>`);
    document.body.append(d);
    const f = d.querySelector('form'), err = d.querySelector('.adm-err');
    let out = null;
    d.querySelector('[data-x]').onclick = () => d.close();
    f.onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(f);
      const msg = validar?.(fd, f);
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      out = fd; d.close();
    };
    d.addEventListener('close', () => { d.remove(); resolve(out); }, { once: true });
    d.showModal();
    d.querySelector('input, select, textarea')?.focus();
  });
}

// ---------- Crear cursos: un grado y una o varias secciones de una vez ----------
export async function nuevoCurso(user, gradoPorDefecto = 6) {
  const existentes = await courses.list();
  const ya = g => existentes.filter(c => c.grade === Number(g)).map(seccionDe);
  const pintarSecciones = (f, g) => {
    const tomadas = ya(g);
    f.querySelector('.sec-grid').innerHTML = SECCIONES.map(s => `<label class="sec-op ${tomadas.includes(s) ? 'tomada' : ''}">
      <input type="checkbox" name="sec" value="${s}" ${tomadas.includes(s) ? 'disabled' : ''}><span>${s}</span>${tomadas.includes(s) ? '<small>ya existe</small>' : ''}</label>`).join('');
  };
  const html = `<h2 style="margin-top:0">Nuevos cursos</h2>
    <div class="field"><label for="ng">Grado</label>
      <select id="ng" name="grade">${GRADE_NAMES.map((n, g) => g ? `<option value="${g}" ${g === gradoPorDefecto ? 'selected' : ''}>${n} (${g}°)</option>` : '').join('')}</select></div>
    <div class="field"><label>Secciones <span class="muted">(marca todas las que quieras crear)</span></label>
      <div class="sec-grid"></div></div>
    <div class="row" style="align-items:flex-start">
      <div class="field grow"><label for="otra">Otra sección <span class="muted">(opcional)</span></label><input id="otra" name="otra" maxlength="12" placeholder="Ej. G, Bilingüe"></div>
      <div class="field" style="width:160px"><label for="cefr">Nivel MCER</label>${mcerSelect()}</div></div>`;
  // Se pinta después de abrir (el diálogo ya existe en el DOM).
  setTimeout(() => {
    const f = document.querySelector('.adm-dialog form'); if (!f) return;
    pintarSecciones(f, f.grade.value);
    f.grade.onchange = () => pintarSecciones(f, f.grade.value);
  });
  const fd = await dialogo(html, 'Crear cursos', {
    validar: fd => (fd.getAll('sec').length || String(fd.get('otra')).trim()) ? '' : 'Marca al menos una sección.',
  });
  if (!fd) return [];
  const grade = Number(fd.get('grade'));
  const secs = [...fd.getAll('sec'), ...(String(fd.get('otra')).trim() ? [String(fd.get('otra')).trim()] : [])];
  const creados = [];
  for (const s of secs) { const c = await courses.create({ grade, section: s, ownerId: user.id, cefr: fd.get('cefr') }); if (c) creados.push(c); }
  toast(creados.length ? `Creado${creados.length === 1 ? '' : 's'}: ${creados.map(c => c.name).join(', ')}` : 'Esos cursos ya existían', creados.length ? undefined : 'err');
  return creados;
}

export async function editarCurso(c) {
  const html = `<h2 style="margin-top:0">Editar curso</h2>
    <div class="row" style="align-items:flex-start">
      <div class="field grow"><label for="eg">Grado</label>
        <select id="eg" name="grade">${GRADE_NAMES.map((n, g) => g ? `<option value="${g}" ${g === c.grade ? 'selected' : ''}>${n} (${g}°)</option>` : '').join('')}</select></div>
      <div class="field" style="width:120px"><label for="es">Sección</label><input id="es" name="sec" maxlength="12" value="${esc(seccionDe(c))}"></div>
      <div class="field" style="width:140px"><label for="cefr">Nivel MCER</label>${mcerSelect(c.cefr)}</div></div>
    <p class="small muted">Si cambias el grado, las actividades asignadas de otro grado siguen visibles para el curso.</p>`;
  const fd = await dialogo(html, 'Guardar');
  if (!fd) return false;
  const r = await courses.update(c.id, { grade: fd.get('grade'), section: fd.get('sec'), cefr: fd.get('cefr') });
  if (!r) { toast(`Ya existe un curso llamado ${courseName(fd.get('grade'), fd.get('sec'))}`, 'err'); return false; }
  toast(`Ahora se llama ${r.name}`);
  return true;
}

export async function eliminarCurso(c) {
  const { students, assignments } = await courses.counts(c.id);
  const ok = await confirmDialog(`¿Eliminar ${c.name}? ${assignments ? `Se borrarán sus ${assignments} asignaciones y sus resultados. ` : ''}${students ? `Sus ${students} estudiantes no se borran: quedan sin curso hasta que los muevas.` : ''}`, 'Eliminar curso', true);
  if (!ok) return false;
  await courses.remove(c.id);
  toast(`${c.name} eliminado`);
  return true;
}

// ---------- Estudiantes ----------
export async function agregarEstudiantes(c) {
  const html = `<h2 style="margin-top:0">Agregar estudiantes a ${esc(c.name)}</h2>
    <div class="field"><label for="nombres">Nombres, uno por línea</label>
      <textarea id="nombres" name="nombres" rows="8" placeholder="Laura Gómez&#10;Andrés Pérez&#10;María Rodríguez"></textarea>
      <p class="hint">Puedes pegar la lista desde Excel. A cada uno se le crea un usuario y una contraseña de 4 cifras.</p></div>`;
  const fd = await dialogo(html, 'Agregar', { ancho: 520, validar: fd => String(fd.get('nombres')).trim() ? '' : 'Escribe al menos un nombre.' });
  if (!fd) return [];
  const nombres = String(fd.get('nombres')).split(/\n/).map(x => x.replace(/\t/g, ' ').trim()).filter(Boolean);
  const nuevos = [];
  for (const n of nombres) { const u = await users.createStudent({ name: n, courseId: c.id }); if (u) nuevos.push(u); }
  if (nuevos.length) await mostrarAccesos(`Accesos nuevos · ${c.name}`, nuevos);
  return nuevos;
}

// Tabla de usuario y contraseña para entregar a los estudiantes (se puede imprimir).
export function mostrarAccesos(titulo, lista) {
  return new Promise(resolve => {
    const d = el(`<dialog class="adm-dialog accesos" style="max-width:640px">
      <h2 style="margin-top:0">${esc(titulo)}</h2>
      <p class="small muted">Entrégale a cada estudiante su usuario y contraseña. Siempre puedes volver a verlos en la página del curso.</p>
      <div class="table-wrap"><table><thead><tr><th>Estudiante</th><th>Usuario</th><th>Contraseña</th></tr></thead>
        <tbody>${lista.map(u => `<tr><td>${esc(u.name)}</td><td><code>${esc(u.username)}</code></td><td><code>${esc(u.password)}</code></td></tr>`).join('')}</tbody></table></div>
      <div class="row end" style="margin-top:16px"><button class="btn ghost" type="button" data-p>Imprimir</button><button class="btn" type="button" data-x>Listo</button></div></dialog>`);
    document.body.append(d);
    d.querySelector('[data-x]').onclick = () => d.close();
    d.querySelector('[data-p]').onclick = () => {
      const w = window.open('', '_blank', 'width=720,height=800');
      if (!w) return toast('El navegador bloqueó la ventana de impresión.', 'err');
      w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(titulo)}</title>
        <style>body{font:15px system-ui;margin:24px} .t{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
        .c{border:1.5px dashed #999;border-radius:10px;padding:12px} b{display:block;font-size:17px;margin-bottom:6px} code{font-size:16px}</style>
        <h2>${esc(titulo)}</h2><div class="t">${lista.map(u => `<div class="c"><b>${esc(u.name)}</b>Usuario: <code>${esc(u.username)}</code><br>Contraseña: <code>${esc(u.password)}</code></div>`).join('')}</div>`);
      w.document.close(); w.focus(); w.print();
    };
    d.addEventListener('close', () => { d.remove(); resolve(); }, { once: true });
    d.showModal();
  });
}

export async function renombrarEstudiante(s) {
  const fd = await dialogo(`<h2 style="margin-top:0">Cambiar nombre</h2>
    <div class="field"><label for="rn">Nombre completo</label><input id="rn" name="n" value="${esc(s.name)}" maxlength="60"></div>
    <p class="small muted">El usuario para entrar (<code>${esc(s.username)}</code>) no cambia.</p>`, 'Guardar', { validar: fd => String(fd.get('n')).trim() ? '' : 'Escribe el nombre.' });
  if (!fd) return false;
  await users.rename(s.id, fd.get('n')); toast('Nombre actualizado'); return true;
}

export async function nuevaContrasena(s) {
  if (!(await confirmDialog(`¿Darle una contraseña nueva a ${s.name}? La anterior dejará de servir.`, 'Cambiar'))) return false;
  const password = await users.resetPassword(s.id);
  await mostrarAccesos(`Contraseña nueva de ${s.name}`, [{ ...s, password }]);
  return true;
}

export async function moverEstudiante(s, actual) {
  const lista = (await courses.list()).filter(c => c.id !== actual.id).sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
  if (!lista.length) { toast('No hay otro curso a donde moverlo. Crea uno primero.', 'err'); return false; }
  const fd = await dialogo(`<h2 style="margin-top:0">Mover a ${esc(s.name)}</h2>
    <div class="field"><label for="mc">Nuevo curso</label><select id="mc" name="c">${lista.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
    <p class="small muted">Sus resultados de ${esc(actual.name)} se conservan. Verá las tareas de su curso nuevo.</p>`, 'Mover');
  if (!fd) return false;
  await users.moveToCourse(s.id, fd.get('c'));
  toast(`${s.name} ahora está en ${lista.find(c => c.id === fd.get('c'))?.name}`); return true;
}

export async function eliminarEstudiante(s) {
  if (!(await confirmDialog(`¿Eliminar a ${s.name}? Se borran su cuenta, sus resultados, su XP y su colección. No se puede deshacer.`, 'Eliminar', true))) return false;
  await users.removeStudent(s.id); toast(`${s.name} eliminado`); return true;
}
