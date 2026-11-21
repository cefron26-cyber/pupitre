// Cofre diario animado. Modo juego: llega, espera 3 toques (cada uno gasta un "?" y puede subir la rareza
// mostrada; el fondo cambia de color con ella y el teléfono vibra), estalla y muestra la carta del premio.
// Modo serio (o "reducir movimiento" del sistema): un toque, la tapa se abre y el premio aparece con un fundido.
import { el, esc } from './ui.js';
import { RARITY, rewardPreview } from './rewards.js';
import { sfx } from './sfx.js';

// Arte de Nano Banana 2.1 recortado (herramientas/arte). Si falta, se usa el cofre dibujado con CSS.
const ART = { closed: 'img/cofre/cerrado.png', body: 'img/cofre/cuerpo.png', lid: 'img/cofre/tapa.png' };

let artOk = null;
function checkArt() {
  if (artOk !== null) return Promise.resolve(artOk);
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(true); i.onerror = () => r(false); i.src = src; });
  return Promise.all(Object.values(ART).map(load)).then(v => (artOk = v.every(Boolean)));
}
checkArt();

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, ms));
const buzz = p => { try { navigator.vibrate?.(p); } catch { /* sin vibración */ } };
const LEVELS = ['common', 'rare', 'epic', 'legendary'];
const TOP = r => r === 'epic' || r === 'legendary'; // se revelan en el último toque, tras un suspenso

// En qué toques (1-3) sube la rareza mostrada hasta llegar a la real. Épica y legendaria se revelan en el último
// (la legendaria sube en los tres toques: rara, épica y, tras el suspenso, legendaria).
function upgradeTaps(rarity) {
  const n = LEVELS.indexOf(rarity);
  const taps = [1, 2, 3].sort(() => Math.random() - .5).slice(0, n).sort();
  if (TOP(rarity) && !taps.includes(3)) taps[taps.length - 1] = 3;
  return taps;
}

function chestHTML(art) {
  // .ch-bob = vaivén en reposo; .chest = se pone blanco y se achica al subir de rareza; .ch-shine = brillo
  // que barre la silueta del cofre (máscara con la misma imagen).
  if (art) return `<div class="ch-bob"><div class="chest art" style="--mask:url('${new URL(ART.closed, document.baseURI).href}')">
      <img class="ch-closed" src="${ART.closed}" alt="" draggable="false">
      <img class="ch-body" src="${ART.body}" alt="" draggable="false">
      <img class="ch-lid" src="${ART.lid}" alt="" draggable="false">
      <i class="ch-shine"></i>
    </div></div>`;
  return `<div class="ch-bob"><div class="chest css"><div class="ch-lid"></div><div class="ch-body"><i></i></div><div class="ch-lock"></div></div></div>`;
}

/**
 * Abre el cofre. `result` = { reward, duplicate, xp } ya sorteado y guardado.
 * Devuelve una promesa que se resuelve con 'equip' o 'close'.
 */
export async function openChest({ modo, result }) {
  const serious = modo === 'serio' || reduced();
  const art = await checkArt();
  const { reward, duplicate, xp } = result;
  const R = RARITY[reward.rarity];
  const start = serious ? reward.rarity : 'common';
  const d = el(`<dialog class="chest-dialog ${serious ? 'serio' : 'juego'} r-${reward.rarity}" aria-label="Cofre del día" data-cur="${start}" style="--rc:${RARITY[start].color}">
    <div class="chest-stage">
      ${serious ? '' : `<div class="ch-top" aria-live="polite">
        <b class="ch-rlabel">${RARITY.common.label}</b>
        <div class="ch-qs" aria-hidden="true"><i>?</i><i>?</i><i>?</i></div>
      </div>`}
      <div class="ch-rays" aria-hidden="true"></div>
      <div class="ch-beam" aria-hidden="true"></div>
      <div class="ch-glow" aria-hidden="true"></div>
      <div class="ch-shadow" aria-hidden="true"></div>
      ${serious ? '' : `<div class="ch-sparks" aria-hidden="true">${'<i></i>'.repeat(7)}</div>
      <div class="ch-ring" aria-hidden="true"></div>`}
      <button class="ch-tap" aria-label="Abrir el cofre">${chestHTML(art)}</button>
      <div class="ch-card" role="group" aria-label="Premio">
        <div class="ch-card-in">
          <span class="ch-rarity">${R.label}</span>
          <div class="ch-prev">${rewardPreview(reward, 88)}</div>
          <b class="ch-name">${esc(reward.name)}</b>
          <span class="ch-kind">${reward.kind === 'ropa' ? 'Ropa para Cebollo' : 'Fondo'}</span>
          ${duplicate ? `<span class="ch-dup">Ya lo tenías: +${xp} XP</span>` : ''}
        </div>
      </div>
      <div class="ch-flash" aria-hidden="true"></div>
      <p class="ch-hint" aria-live="polite"></p>
      <div class="ch-actions">
        ${duplicate ? '' : '<button class="btn ch-equip" value="equip">Usar ahora</button>'}
        <button class="btn ${duplicate ? '' : 'ghost'} ch-ok" value="close">${serious ? 'Cerrar' : '¡Genial!'}</button>
      </div>
    </div></dialog>`);
  document.body.append(d);
  const $ = s => d.querySelector(s);
  const hint = $('.ch-hint'), tap = $('.ch-tap'), stage = $('.chest-stage');
  const label = $('.ch-rlabel'), qs = [...d.querySelectorAll('.ch-qs i')];
  const setPhase = p => { stage.dataset.phase = p; };
  // Reinicia una animación de clase (sacudón de pantalla, subida de rareza...).
  const retrigger = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };
  const ups = serious ? [] : upgradeTaps(reward.rarity);
  let cur = 0;
  const quake = n => { stage.classList.remove('quake1', 'quake2', 'quake3', 'rc-up'); void stage.offsetWidth; stage.classList.add('quake' + n); };
  const chestEl = $('.chest'), ring = $('.ch-ring');
  // Destellos que salen del cofre (subida de rareza y estallido).
  const sparkle = (n, dist) => {
    const cols = ['#fff', '#fff', 'var(--rc)', '#ffd23f'];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * .4, r = dist * (.7 + Math.random() * .5);
      const s = el(`<i class="ch-star" style="--c:${cols[i % cols.length]};--x:${Math.cos(a) * r}px;--y:${Math.sin(a) * r}px;--s:${10 + Math.random() * 10}px"></i>`);
      stage.append(s);
      s.addEventListener('animationend', () => s.remove(), { once: true });
    }
  };
  // Subida de rareza: el cofre se pone blanco, se achica y vuelve de golpe con el color nuevo. La rareza,
  // el fondo y la etiqueta cambian justo cuando el cofre está blanco y pequeño (a los ~300 ms).
  const levelUp = () => {
    const k = LEVELS[++cur];
    retrigger(chestEl, 'morph');
    sfx('levelUp', k);
    if (k === 'legendary') sfx('choir');
    setTimeout(() => {
      d.dataset.cur = k;
      d.style.setProperty('--rc', RARITY[k].color);
      label.textContent = RARITY[k].label;
      retrigger(label, 'up');
      retrigger(stage, 'rc-up');
      retrigger(ring, 'go');
      sparkle(12, 150);
    }, 300);
  };

  return new Promise(resolve => {
    let step = 0, busy = false, choice = 'close';
    // Cerrar con botón o con Escape (solo en la fase del premio): siempre se quita el diálogo y se resuelve.
    const finish = v => { choice = v; d.close(); };
    d.addEventListener('close', () => { d.remove(); resolve(choice); }, { once: true });
    d.addEventListener('cancel', e => { if (stage.dataset.phase !== 'reward') e.preventDefault(); });
    $('.ch-actions').addEventListener('click', e => { const v = e.target.closest('button')?.value; if (v) finish(v); });

    async function burst() {
      setPhase('burst');
      if (!serious) {
        sfx('open');
        quake(3);
        retrigger(ring, 'go');
        sparkle(reward.rarity === 'legendary' ? 30 : 18, reward.rarity === 'legendary' ? 280 : 230);
        buzz(reward.rarity === 'legendary' ? [200, 60, 200, 60, 400] : reward.rarity === 'epic' ? [150, 60, 260] : reward.rarity === 'rare' ? [120, 50, 120] : 120);
        // Confeti de cubos de colores, como los del portal.
        const cols = ['#7c4dff', '#ffd23f', '#2fd39a', '#ff5fa2', '#3fb4f0', '#ff8a1f'];
        const n = reward.rarity === 'legendary' ? 50 : reward.rarity === 'epic' ? 34 : reward.rarity === 'rare' ? 24 : 16;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, r = 140 + Math.random() * 180;
          const c = el(`<i class="ch-cube" style="--c:${cols[i % cols.length]};--x:${Math.cos(a) * r}px;--y:${Math.sin(a) * r - 80}px;--s:${8 + Math.random() * 12}px;--rt:${Math.random() * 720 - 360}deg"></i>`);
          stage.append(c);
        }
        await wait(380);
      } else await wait(320);
      setPhase('reward');
      hint.textContent = '';
      await wait(serious ? 300 : 700);
      ($('.ch-equip') || $('.ch-ok')).focus();
    }

    tap.addEventListener('click', async () => {
      if (busy) return;
      const ph = stage.dataset.phase;
      if (serious) { if (ph === 'wait') { busy = true; await burst(); } return; }
      // Legendaria: tras revelarla, un toque más ("¡Pulsa para abrir!") la hace estallar.
      if (ph === 'ready') { busy = true; await burst(); return; }
      if (ph !== 'wait' && ph !== 'shake') return;
      step++;
      qs[step - 1]?.classList.add('used');
      const up = ups.includes(step);
      if (step < 3) {
        setPhase('shake'); stage.dataset.step = step;
        retrigger(tap, 'hit');
        quake(step);
        hint.textContent = step === 1 ? '¡Otra vez!' : '¡Una vez más!';
        if (up) { levelUp(); buzz([40, 60, 140]); } else buzz(step === 1 ? 35 : 60);
        return;
      }
      busy = true;
      if (up && TOP(reward.rarity)) {
        // Suspenso: tiembla todo antes de revelar la épica (más largo y más fuerte si es legendaria).
        const legend = reward.rarity === 'legendary';
        setPhase('epic'); hint.textContent = legend ? '¡¿LEGENDARIO?!' : '¡¿Épico?!';
        buzz(legend ? [90, 40, 90, 40, 90, 40, 90, 40, 120, 40, 300] : [90, 50, 90, 50, 90, 50, 200]);
        await wait(legend ? 1600 : 1100);
      } else {
        setPhase('charge'); hint.textContent = '';
        buzz(80);
        await wait(up ? 260 : 420);
      }
      if (up) { hint.textContent = ''; setPhase('shake'); levelUp(); buzz([60, 40, 160]); await wait(820); }
      if (reward.rarity === 'legendary') {
        setPhase('ready'); hint.textContent = '¡Pulsa para abrir!';
        busy = false; tap.focus();
        return;
      }
      await burst();
    });

    d.showModal();
    if (serious) { setPhase('wait'); hint.textContent = 'Toca el cofre para abrirlo'; tap.focus(); return; }
    setPhase('drop');
    sfx('drop');
    buzz([0, 520, 40]); // golpe al aterrizar
    setTimeout(() => { if (stage.dataset.phase === 'drop') { setPhase('wait'); hint.textContent = '¡Toca el cofre!'; tap.focus(); } }, 800);
  });
}
