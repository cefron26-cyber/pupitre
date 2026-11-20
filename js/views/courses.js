// Docente: Mis cursos y accesos. Código de clase de cada curso y contraseña de dibujos de cada estudiante
// (para entrar sin escribir usuario: código → nombre → 3 dibujos en orden).
import { courses, users } from '../storage.js';
import { esc, $, toast, confirmDialog, PICTURES } from '../ui.js';
import { gradeLabel } from '../logic.js';

const pics = seq => (seq || []).map(i => `<span class="pic" title="${esc(PICTURES[i]?.n || '')}" role="img" aria-label="${esc(PICTURES[i]?.n || '')}">${PICTURES[i]?.e || '?'}</span>`).join('');

export async function coursesView(root, { user }) {
  const list = (await courses.list()).filter(c => user.courseIds.includes(c.id));
  root.innerHTML = `<div class="page-head"><div><h1>Mis cursos y accesos</h1>
      <p class="muted">Los estudiantes pueden entrar con usuario y contraseña, o con el <b>código de su curso</b> y sus <b>3 dibujos</b> en orden
      (en la pantalla de entrada, "Con código de clase"). Ideal para los más pequeños.</p></div>
      <button class="btn ghost no-print" type="button" id="print">Imprimir tarjetas</button></div>
    <div id="list"></div>`;
  const box = $('#list', root);
  if (!list.length) { box.innerHTML = '<div class="card empty">No tienes cursos.</div>'; return; }
  for (const c of list) {
    const st = (await users.picturesOf(c.id)).sort((a, b) => a.name.localeCompare(b.name));
    const card = document.createElement('div');
    card.className = 'card course-card';
    card.innerHTML = `<div class="row between"><h2 style="margin:0">${esc(c.name)} <span class="muted small">· ${gradeLabel(c.grade)}</span></h2>
        <div class="row"><span class="small muted">Código de clase</span><span class="class-code">${esc(c.code || '—')}</span>
        <button class="btn ghost sm no-print" type="button" data-code>Cambiar código</button></div></div>
      ${st.length ? `<div class="table-wrap" style="margin-top:12px"><table>
        <thead><tr><th>Estudiante</th><th>Usuario</th><th>Dibujos (en orden)</th><th class="no-print"></th></tr></thead>
        <tbody>${st.map(s => `<tr><td class="name">${esc(s.name)}</td><td>${esc(s.username)}</td><td class="pics">${pics(s.pictures)}</td>
          <td class="no-print"><button class="btn ghost sm" type="button" data-pics="${esc(s.id)}">Cambiar dibujos</button></td></tr>`).join('')}</tbody></table></div>`
        : '<p class="muted">Este curso aún no tiene estudiantes.</p>'}`;
    card.querySelector('[data-code]').onclick = async () => {
      if (!(await confirmDialog(`¿Cambiar el código de ${c.name}? El código anterior dejará de servir.`, 'Cambiar'))) return;
      await courses.newCode(c.id); toast('Código nuevo creado'); coursesView(root, { user });
    };
    card.querySelectorAll('[data-pics]').forEach(b => {
      b.onclick = async () => {
        await users.newPictures(b.dataset.pics); toast('Dibujos nuevos: compártelos con el estudiante'); coursesView(root, { user });
      };
    });
    box.append(card);
  }
  $('#print', root).onclick = () => print();
}
