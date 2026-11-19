// ============================================================================
// LudoZ — Loading Screen (boot splash + pre-match "arena loading" sequence)
// ============================================================================

import { icon } from './icons.js';
import { renderPawnSkin, diceFaceHTML, getMap, PAWN_SKINS, DICE_SKINS } from './skins.js';

const TIPS = [
  'Tahan tombol LEMPAR (atau SPACE) untuk atur tenaga lemparan.',
  'Pion di petak bintang aman dari KO — kecuali saat event Blackout.',
  'Pion yang berhasil KO lawan naik jadi ACE: finis bonus +50 energi.',
  'Dadu Ganjil (1, 3, 5) paling pas buat masuk finis dengan angka tepat.',
  'Dadu Genap (2, 4, 6) menggerakkan 2 pion sekaligus — bisa keluar markas dengan 6!',
  'Dadu Magnet menyedot lawan dalam jarak ±1 petak — langsung KO!',
  'Energi penuh = skill Overdrive. Pakai sebelum melempar dadu.',
  'Mystery Box bisa berisi Reverse Uno yang membalik urutan giliran.',
  'Hover pion menyala untuk lihat preview jalur & hasil langkahmu.',
];

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(id) {
  return document.getElementById(id);
}

function buildCube(skin) {
  const faces = [1, 6, 3, 4, 2, 5]
    .map((n, i) => diceFaceHTML(n, { skin, cls: `cube-face cf-${i}` }))
    .join('');
  return `<div class="ld-cube3d">${faces}</div>`;
}

function buildOrbit(heroes, pawnSkin) {
  return heroes
    .slice(0, 4)
    .map((h, i) => `<div class="ld-orbit-pawn" style="--i:${i}; --hero-glow:${h.glow}">${renderPawnSkin(pawnSkin, h)}</div>`)
    .join('');
}

function buildLineup(lineup) {
  return lineup
    .map((p, i) => {
      const roleIcon = p.type === 'ai' ? 'bot' : 'user';
      const roleText = p.type === 'ai' ? 'AI' : (p.displayName || `P${p.hero.id + 1}`);
      const sep = i > 0 ? '<span class="ld-vs">VS</span>' : '';
      return `${sep}<div class="ld-fighter" style="--hero-color:${p.hero.color}; --hero-glow:${p.hero.glow}; --d:${i * 120}ms">
        <div class="ld-fighter-avatar">${p.hero.svgAvatar}</div>
        <div class="ld-fighter-name">${p.hero.name}</div>
        <div class="ld-fighter-role">${icon(roleIcon)}<span>${String(roleText).replace(/[<>&"]/g, '')}</span></div>
      </div>`;
    })
    .join('');
}

/**
 * Show the loading overlay and resolve once the sequence completes.
 * @param {object} o
 * @param {'boot'|'match'} o.kind
 * @param {Array<{hero,type,displayName}>} [o.lineup]
 * @param {Array} o.heroes  theme heroes (for orbiting pawns)
 * @param {{map,pawn,dice}} o.cosmetics
 * @param {string} [o.modeLabel]
 * @param {Promise} [o.waitFor] extra promise to await (e.g. fonts)
 * @param {number} [o.duration]
 */
export async function runLoader(o) {
  const root = el('loading-screen');
  if (!root) return;
  const reduced = prefersReducedMotion();
  const duration = reduced ? 600 : (o.duration ?? (o.kind === 'boot' ? 1100 : 2300));
  const map = getMap(o.cosmetics.map);

  root.dataset.kind = o.kind;
  root.style.setProperty('--ld-accent', map.ringColor);
  el('ld-stage').innerHTML = `${buildCube(o.cosmetics.dice)}<div class="ld-orbit">${buildOrbit(o.heroes, o.cosmetics.pawn)}</div>`;
  el('ld-sub').textContent = o.kind === 'boot' ? 'LUDO ZAMAN NOW' : (o.modeLabel || 'MEMASUKI ARENA');
  el('ld-lineup').innerHTML = o.kind === 'match' && o.lineup ? buildLineup(o.lineup) : '';
  el('ld-tip').innerHTML = o.kind === 'match'
    ? `${icon('bulb')}<span>${TIPS[Math.floor(Math.random() * TIPS.length)]}</span>`
    : '';

  const steps = o.kind === 'boot'
    ? ['Memuat aset arena', 'Menyalakan neon', 'Siap!']
    : [
        `Menyusun papan ${map.name}`,
        'Memanggil para hero',
        `Memoles pion ${PAWN_SKINS[o.cosmetics.pawn]?.name || ''}`.trim(),
        `Mengocok dadu ${DICE_SKINS[o.cosmetics.dice]?.name || ''}`.trim(),
        'Siap tempur!',
      ];

  const bar = el('ld-bar');
  const stepEl = el('ld-step');
  const pctEl = el('ld-pct');
  bar.style.width = '0%';
  stepEl.textContent = steps[0];
  pctEl.textContent = '0%';

  root.hidden = false;
  root.classList.remove('leaving');
  // force reflow so the entrance animation replays every time
  void root.offsetWidth;
  root.classList.add('show');

  const waitExtra = Promise.resolve(o.waitFor).catch(() => {});
  const start = performance.now();

  await new Promise((resolveRaw) => {
    let settled = false;
    const resolve = () => {
      if (settled) return;
      settled = true;
      resolveRaw();
    };
    let extraDone = false;
    waitExtra.then(() => { extraDone = true; });
    // rAF pauses in background tabs — never let the match get stuck behind the overlay
    waitExtra.then(() => setTimeout(resolve, duration + 900));
    const tick = (now) => {
      if (settled) return;
      const t = Math.min(1, (now - start) / duration);
      // ease-out with a tiny hold before 100% until extra work is done
      let p = 1 - Math.pow(1 - t, 2.2);
      if (!extraDone) p = Math.min(p, 0.92);
      const pct = Math.round(p * 100);
      bar.style.width = `${pct}%`;
      pctEl.textContent = `${pct}%`;
      const idx = Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999));
      if (stepEl.textContent !== steps[idx]) stepEl.textContent = steps[idx];
      if (t >= 1 && extraDone) {
        bar.style.width = '100%';
        pctEl.textContent = '100%';
        stepEl.textContent = steps[steps.length - 1];
        setTimeout(resolve, reduced ? 0 : 220);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  root.classList.add('leaving');
  await new Promise((r) => setTimeout(r, reduced ? 0 : 380));
  root.classList.remove('show', 'leaving');
  root.hidden = true;
}
