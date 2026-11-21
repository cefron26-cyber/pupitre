// Tabla clasificatoria del estudiante (2026-11-21): compañeros de su curso ordenados por XP, de esta semana o de siempre.
// Solo nombre corto, avatar, rango y XP: nunca notas.
import { users, xp } from '../storage.js';
import { DEFAULT_PREFS } from '../rewards.js';
import { cebolloMini } from '../cebollo.js';
import { esc } from '../ui.js';
import { levelOf } from './student.js';
import { rangoDe, RANGOS } from '../logic.js';

// Lunes de esta semana a las 00:00 (hora local).
function lunes() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString();
}
// "Laura Gómez" → "Laura G."
const corto = n => { const p = String(n).trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };

export async function ranking(root, { user, query }) {
  const periodo = query.p === 'total' ? 'total' : 'semana';
  const vistos = new Map();
  for (const c of user.courseIds) for (const s of await users.studentsOf(c)) vistos.set(s.id, s);
  if (!vistos.has(user.id)) vistos.set(user.id, user);
  const ids = [...vistos.keys()];
  const [total, semana] = await Promise.all([xp.totals(ids), xp.totals(ids, lunes())]);
  const puntos = periodo === 'total' ? total : semana;
  const filas = ids.map(id => {
    const u = vistos.get(id), lv = levelOf(total[id]).level;
    return { id, nombre: id === user.id ? 'Tú' : corto(u.name), ropa: { ...DEFAULT_PREFS, ...(u.prefs || {}) }.ropa, xp: puntos[id], nivel: lv, rango: rangoDe(lv) };
  }).sort((a, b) => b.xp - a.xp || b.nivel - a.nivel || a.nombre.localeCompare(b.nombre));
  // Empates comparten puesto.
  filas.forEach((f, i) => { f.pos = i && f.xp === filas[i - 1].xp ? filas[i - 1].pos : i + 1; });
  const yo = filas.find(f => f.id === user.id);
  const arriba = filas.filter(f => f.xp > yo.xp).at(-1);

  const medalla = p => ['🥇', '🥈', '🥉'][p - 1] || p;
  const podio = filas.slice(0, 3);
  podio.forEach((f, i) => { f.i = i; });
  const orden = podio.length === 3 ? [podio[1], podio[0], podio[2]] : podio;
  root.innerHTML = `<div class="page-head"><div><h1>Clasificación</h1>
      <p class="muted">${filas.length} ${filas.length === 1 ? 'jugador' : 'jugadores'} en tu curso · ${periodo === 'semana' ? 'XP ganada desde el lunes' : 'XP de siempre'}</p></div>
      <div class="seg rk-seg" role="tablist" aria-label="Periodo">
        <a role="tab" href="#/s/ranking" class="seg-btn ${periodo === 'semana' ? 'active' : ''}" aria-selected="${periodo === 'semana'}">Esta semana</a>
        <a role="tab" href="#/s/ranking?p=total" class="seg-btn ${periodo === 'total' ? 'active' : ''}" aria-selected="${periodo === 'total'}">Total</a></div></div>
    <div class="rk-yo card">
      <span class="rk-yo-pos">${medalla(yo.pos)}</span>
      <div class="grow"><b>Vas en el puesto ${yo.pos} de ${filas.length}</b>
        <div class="small muted">${arriba ? `Te faltan <b>${arriba.xp - yo.xp + 1} XP</b> para pasar a ${esc(arriba.nombre)}${arriba.nombre.endsWith('.') ? '' : '.'}` : yo.xp ? '¡Vas de primero! Sigue así.' : 'Completa una misión para sumar XP.'}</div></div>
      <a class="btn sm" href="#/s/tasks">Ir a misiones</a></div>
    <ol class="rk-podio" aria-label="Primeros puestos">${orden.map(f => `<li class="rk-i${f.i} ${f.id === user.id ? 'yo' : ''}">
      <span class="rk-ava">${cebolloMini(f.ropa, 64)}</span><b>${esc(f.nombre)}</b>
      <span class="rk-xp">${f.xp} XP</span><span class="rk-base"><span>${medalla(f.pos)}</span></span></li>`).join('')}</ol>
    <ol class="rk-lista card">${filas.map(f => `<li class="${f.id === user.id ? 'yo' : ''}">
      <span class="rk-pos">${f.pos}</span><span class="rk-ava">${cebolloMini(f.ropa, 40)}</span>
      <span class="grow"><b>${esc(f.nombre)}</b><span class="small muted">Nivel ${f.nivel}</span></span>
      <span class="rango-tag" style="--rc:${f.rango.color}" title="Rango ${f.rango.name}"><span aria-hidden="true">${f.rango.icon}</span>${f.rango.name}</span>
      <b class="rk-xp">${f.xp} XP</b></li>`).join('')}</ol>
    <div class="card rk-rangos"><h2>Rangos</h2><p class="small muted" style="margin-top:-6px">Subes de rango al subir de nivel.</p>
      <ul>${RANGOS.map(r => `<li class="${yo.rango.id === r.id ? 'yo' : ''}" style="--rc:${r.color}"><span aria-hidden="true">${r.icon}</span><b>${r.name}</b><span class="small muted">Nivel ${r.desde}+</span></li>`).join('')}</ul></div>`;
}
