// Pantalla de entrada (basada en contexto/referencias/login.html).
// Dos formas: usuario y contraseña, o código de clase → tocar su nombre → 3 dibujos en orden (para los más pequeños).
import { session, courses } from '../storage.js';
import { esc, PICTURES, FEATURES, brandHTML } from '../ui.js';
import { DEFAULT_PREFS } from '../rewards.js';
import { cebolloMini } from '../cebollo.js';

const EYE = `<svg class="eye-closed" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 9.5c2.6 4 6 6 9 6s6.4-2 9-6"/><path d="M6.9 13.2 5.7 16"/><path d="M12 15.5V18.6"/><path d="M17.1 13.2 18.3 16"/></svg>
  <svg class="eye-open" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M1.5 12S5.5 5.5 12 5.5 22.5 12 22.5 12 18.5 18.5 12 18.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3.2"/></svg>`;

export function renderLogin(root, school, onLogin) {
  let mode = 'pass';
  root.innerHTML = `<div class="login-wrap"><main class="card login-card">
    <header class="school">${brandHTML(school, 48)}</header>
    <div class="divider"></div>
    <h1>Bienvenido</h1>
    ${FEATURES.codeLogin ? `<div class="login-tabs" role="tablist" aria-label="Forma de entrar">
      <button type="button" role="tab" data-m="pass" aria-selected="true">Con usuario</button>
      <button type="button" role="tab" data-m="code" aria-selected="false">Con código de clase</button>
    </div>` : ''}
    <div id="pane"></div>
    <div class="demo"><b>Demo:</b> docente / 1234 &nbsp;·&nbsp; estudiante / 1234 &nbsp;·&nbsp; prueba / 1234${FEATURES.codeLogin ? '<br>Código <b>SEXTA6</b> → Estudiante Demo → 🐶 🐱 🦊' : ''}</div>
  </main></div>`;
  const pane = root.querySelector('#pane');
  const tabs = root.querySelectorAll('[data-m]');
  tabs.forEach(b => { b.onclick = () => { mode = b.dataset.m; tabs.forEach(x => x.setAttribute('aria-selected', x === b)); draw(); }; });

  const draw = () => mode === 'pass' ? drawPass() : drawCode();

  function drawPass() {
    pane.innerHTML = `<p class="sub">Ingresa con tu usuario y contraseña.</p>
    <form id="f" novalidate>
      <div class="field">
        <label for="u">Usuario</label>
        <input id="u" name="u" autocomplete="username" placeholder="Escribe tu usuario" autocapitalize="off" aria-describedby="m">
      </div>
      <div class="field">
        <label for="p">Contraseña</label>
        <div class="input-wrap">
          <input id="p" name="p" type="password" autocomplete="current-password" placeholder="Escribe tu contraseña" style="padding-right:56px" aria-describedby="m">
          <button type="button" class="toggle" id="t" aria-label="Mostrar contraseña" aria-pressed="false">${EYE}</button>
        </div>
      </div>
      <button class="btn block" type="submit">Entrar</button>
      <p class="msg" id="m" role="status"></p>
    </form>`;
    const f = pane.querySelector('#f'), m = pane.querySelector('#m');
    const p = pane.querySelector('#p'), t = pane.querySelector('#t'), u = pane.querySelector('#u');
    u.focus();
    t.onclick = () => {
      const show = p.type === 'password';
      p.type = show ? 'text' : 'password';
      t.classList.toggle('on', show);
      t.setAttribute('aria-pressed', show);
      t.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    };
    f.onsubmit = async e => {
      e.preventDefault();
      const uv = u.value.trim(), pw = p.value;
      const bad = (msg, field) => { m.className = 'msg err'; m.textContent = msg; [u, p].forEach(x => x.setAttribute('aria-invalid', x === field || !field)); (field || u).focus(); };
      if (!uv) return bad('Escribe tu usuario.', u);
      if (!pw) return bad('Escribe tu contraseña.', p);
      const user = await session.login(uv, pw);
      if (!user) return bad('Usuario o contraseña incorrectos.');
      m.className = 'msg ok'; m.textContent = 'Entrando…';
      onLogin(user);
    };
  }

  // Paso 1: código. Paso 2: ¿quién eres? Paso 3: dibujos.
  function drawCode(found = null, who = null) {
    if (!found) {
      pane.innerHTML = `<p class="sub">Escribe el código de tu curso. Te lo da tu docente.</p>
        <form id="fc" novalidate>
          <div class="field"><label for="code">Código de clase</label>
            <input id="code" class="code-input" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Ej. K7M4QA" aria-describedby="mc"></div>
          <button class="btn block" type="submit">Continuar</button>
          <p class="msg" id="mc" role="status"></p></form>`;
      const inp = pane.querySelector('#code'), m = pane.querySelector('#mc');
      inp.focus();
      inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
      pane.querySelector('#fc').onsubmit = async e => {
        e.preventDefault();
        const r = inp.value.length === 6 ? await courses.byCode(inp.value) : null;
        if (!r) { m.className = 'msg err'; m.textContent = inp.value.length === 6 ? 'Ese código no existe. Revísalo con tu docente.' : 'El código tiene 6 letras o números.'; inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
        drawCode(r);
      };
      return;
    }
    if (!who) {
      pane.innerHTML = `<p class="sub"><b>${esc(found.course.name)}</b> · ¿Quién eres? Toca tu nombre.</p>
        <div class="who-grid">${found.students.map(s => `<button type="button" class="who" data-id="${esc(s.id)}">${cebolloMini(s.ropa || DEFAULT_PREFS.ropa, 44)}<span>${esc(s.name)}</span></button>`).join('')
          || '<p class="muted">Este curso aún no tiene estudiantes.</p>'}</div>
        <button type="button" class="btn ghost block" id="back" style="margin-top:12px">← Otro código</button>`;
      pane.querySelectorAll('.who').forEach(b => { b.onclick = () => drawCode(found, found.students.find(s => s.id === b.dataset.id)); });
      pane.querySelector('#back').onclick = () => drawCode();
      pane.querySelector('.who')?.focus();
      return;
    }
    const seq = [];
    pane.innerHTML = `<p class="sub">Hola, <b>${esc(who.name.split(' ')[0])}</b>. Toca tus <b>3 dibujos</b> en orden.</p>
      <div class="pic-dots" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="pic-grid">${PICTURES.map((p, i) => `<button type="button" class="pic-btn" data-i="${i}" aria-label="${esc(p.n)}">${p.e}</button>`).join('')}</div>
      <p class="msg" id="mp" role="status"></p>
      <div class="row" style="margin-top:8px"><button type="button" class="btn ghost grow" id="back">← No soy yo</button>
        <button type="button" class="btn ghost grow" id="clear">Borrar</button></div>`;
    const dots = pane.querySelectorAll('.pic-dots i'), m = pane.querySelector('#mp');
    const show = () => dots.forEach((d, k) => d.classList.toggle('on', k < seq.length));
    pane.querySelector('#back').onclick = () => drawCode(found);
    pane.querySelector('#clear').onclick = () => { seq.length = 0; show(); };
    pane.querySelectorAll('.pic-btn').forEach(b => {
      b.onclick = async () => {
        if (seq.length >= 3) return;
        seq.push(+b.dataset.i); show();
        if (seq.length < 3) return;
        const r = await session.loginWithPictures(who.id, seq);
        if (r && r !== 'locked') { m.className = 'msg ok'; m.textContent = 'Entrando…'; return onLogin(r); }
        m.className = 'msg err';
        m.textContent = r === 'locked' ? 'Demasiados intentos. Espera 30 segundos y vuelve a probar.' : 'Esos no son tus dibujos. Intenta otra vez.';
        pane.querySelector('.pic-grid').classList.remove('nope'); void pane.offsetWidth; pane.querySelector('.pic-grid').classList.add('nope');
        seq.length = 0; setTimeout(show, 350);
      };
    });
    pane.querySelector('.pic-btn').focus();
  }

  draw();
}
