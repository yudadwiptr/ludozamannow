// ============================================================================
// LudoZ — Cosmetics: Arena Maps, Pawn Skins & Dice Skins
// Cosmetics are local-only (each player sees their own style, even online).
// ============================================================================

// ----------------------------------------------------------------------------
// Arena Maps — board palette, background motif & center emblem
// ----------------------------------------------------------------------------

export const MAPS = {
  kawung: {
    id: 'kawung',
    name: 'Batik Kawung',
    desc: 'Malam ungu berlapis motif kawung emas',
    boardBg: '#120d1d',
    tileBg: '#1a132b',
    tileStroke: '#382a54',
    starBg: '#231938',
    starStroke: '#c99738',
    starColor: '#ffb703',
    yardBg: '#150f24',
    coreGlow: '#3c2161',
    ringColor: '#ffb703',
    ambient: 'rgba(255, 183, 3, 0.16)',
    swatch: ['#1a132b', '#ffb703', '#c77dff'],
    pattern: `<pattern id="mapPattern" width="84" height="84" patternUnits="userSpaceOnUse">
      <circle cx="42" cy="42" r="25" fill="none" stroke="#ffb703" stroke-width="1.3" opacity="0.16"/>
      <circle cx="0" cy="0" r="25" fill="none" stroke="#ffb703" stroke-width="1.3" opacity="0.16"/>
      <circle cx="84" cy="0" r="25" fill="none" stroke="#ffb703" stroke-width="1.3" opacity="0.16"/>
      <circle cx="0" cy="84" r="25" fill="none" stroke="#ffb703" stroke-width="1.3" opacity="0.16"/>
      <circle cx="84" cy="84" r="25" fill="none" stroke="#ffb703" stroke-width="1.3" opacity="0.16"/>
      <polygon points="42,27 57,42 42,57 27,42" fill="none" stroke="#00f5d4" stroke-width="1.1" opacity="0.14"/>
    </pattern>`,
    yardPattern: true,
    // Gunungan (wayang tree-of-life silhouette)
    emblem: `<path d="M50 8 C66 26 82 44 82 64 C82 82 66 92 50 92 C34 92 18 82 18 64 C18 44 34 26 50 8Z" fill="#1a0f2b" stroke="#ffb703" stroke-width="3.5"/>
      <path d="M50 22 V84 M50 40 L36 52 M50 40 L64 52 M50 56 L32 70 M50 56 L68 70" stroke="#ffb703" stroke-width="3" stroke-linecap="round" fill="none"/>
      <circle cx="50" cy="30" r="5" fill="#ff2a5f"/>`,
  },

  grid: {
    id: 'grid',
    name: 'Cyber Grid',
    desc: 'Kisi neon biru ala arcade 80-an',
    boardBg: '#0c1122',
    tileBg: '#131b32',
    tileStroke: '#223052',
    starBg: '#18223f',
    starStroke: '#384e7d',
    starColor: '#cbd5e1',
    yardBg: '#0f162b',
    coreGlow: '#253559',
    ringColor: '#00f0ff',
    ambient: 'rgba(192, 97, 255, 0.16)',
    swatch: ['#131b32', '#00f0ff', '#ff2e63'],
    pattern: `<pattern id="mapPattern" width="75" height="75" patternUnits="userSpaceOnUse">
      <path d="M 75 0 L 0 0 0 75" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.09"/>
      <circle cx="0" cy="0" r="2.2" fill="#00f0ff" opacity="0.22"/>
    </pattern>`,
    yardPattern: false,
    // Crown core
    emblem: `<circle cx="50" cy="50" r="40" fill="#0b1328" stroke="#00f0ff" stroke-width="3.5"/>
      <path d="M26 62 L30 36 L41 48 L50 30 L59 48 L70 36 L74 62 Z" fill="none" stroke="#ffd60a" stroke-width="4" stroke-linejoin="round"/>
      <path d="M28 70 H72" stroke="#ffd60a" stroke-width="4" stroke-linecap="round"/>`,
  },

  candi: {
    id: 'candi',
    name: 'Candi Senja',
    desc: 'Batu candi terakota di bawah langit jingga',
    boardBg: '#1a0f0b',
    tileBg: '#26160f',
    tileStroke: '#4d2e1d',
    starBg: '#33200f',
    starStroke: '#f59e0b',
    starColor: '#fbbf24',
    yardBg: '#1d120c',
    coreGlow: '#7c2d12',
    ringColor: '#fb923c',
    ambient: 'rgba(251, 146, 60, 0.18)',
    swatch: ['#26160f', '#fb923c', '#fbbf24'],
    pattern: `<pattern id="mapPattern" width="90" height="60" patternUnits="userSpaceOnUse">
      <path d="M0 60 H18 V48 H30 V36 H60 V48 H72 V60 H90" fill="none" stroke="#fb923c" stroke-width="1.4" opacity="0.14"/>
      <path d="M45 36 V24 M38 24 H52 M45 24 L45 14" stroke="#fbbf24" stroke-width="1.2" opacity="0.12"/>
      <rect x="0" y="0" width="90" height="60" fill="none" stroke="#7c2d12" stroke-width="0.8" opacity="0.25"/>
    </pattern>`,
    yardPattern: true,
    // Stupa
    emblem: `<path d="M50 8 V20" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
      <path d="M42 26 H58 L56 20 H44 Z" fill="#fbbf24"/>
      <path d="M24 66 C24 44 36 28 50 28 C64 28 76 44 76 66 Z" fill="#3b1a0c" stroke="#fb923c" stroke-width="3.5"/>
      <path d="M16 66 H84 V74 H16 Z M10 74 H90 V84 H10 Z" fill="#26160f" stroke="#fb923c" stroke-width="3"/>
      <path d="M38 50 h6 v8 h-6z M56 50 h6 v8 h-6z" fill="#fbbf24" opacity="0.8"/>`,
  },

  samudra: {
    id: 'samudra',
    name: 'Samudra Abyss',
    desc: 'Palung laut dalam dengan arus bioluminesen',
    boardBg: '#03141b',
    tileBg: '#062330',
    tileStroke: '#0f4256',
    starBg: '#0a3141',
    starStroke: '#22d3ee',
    starColor: '#67e8f9',
    yardBg: '#041a23',
    coreGlow: '#0e4a5c',
    ringColor: '#22d3ee',
    ambient: 'rgba(34, 211, 238, 0.16)',
    swatch: ['#062330', '#22d3ee', '#a3e635'],
    pattern: `<pattern id="mapPattern" width="120" height="48" patternUnits="userSpaceOnUse">
      <path d="M0 24 C20 8 40 8 60 24 S100 40 120 24" fill="none" stroke="#22d3ee" stroke-width="1.4" opacity="0.14"/>
      <path d="M0 44 C20 30 40 30 60 44 S100 58 120 44" fill="none" stroke="#a3e635" stroke-width="1" opacity="0.08"/>
      <circle cx="90" cy="10" r="2" fill="#67e8f9" opacity="0.25"/>
    </pattern>`,
    yardPattern: true,
    // Trident over wave
    emblem: `<circle cx="50" cy="50" r="40" fill="#03141b" stroke="#22d3ee" stroke-width="3.5"/>
      <path d="M50 18 V76 M34 26 V40 C34 48 50 50 50 50 C50 50 66 48 66 40 V26" fill="none" stroke="#67e8f9" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M30 26 L34 18 L38 26 M46 18 L50 10 L54 18 M62 26 L66 18 L70 26" fill="#67e8f9" stroke="#67e8f9" stroke-width="2" stroke-linejoin="round"/>
      <path d="M22 72 C30 64 38 64 46 72 S62 80 78 70" fill="none" stroke="#a3e635" stroke-width="3.5" stroke-linecap="round"/>`,
  },
};

// ----------------------------------------------------------------------------
// Pawn Skins — returns inline SVG for a hero-colored pawn token
// ----------------------------------------------------------------------------

let gradSeq = 0;
const nextId = (p) => `${p}${++gradSeq}`;

function avatarInner(hero) {
  return hero.svgAvatar.replace(/^\s*<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

export const PAWN_SKINS = {
  orb: {
    id: 'orb',
    name: 'Orb Hero',
    desc: 'Bola energi berisi wajah hero',
    render: (hero, gid = nextId('orbG')) => `<svg viewBox="0 0 100 100" class="pawn-svg">
      <defs><radialGradient id="${gid}" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#26324f"/><stop offset="100%" stop-color="#05080f"/>
      </radialGradient></defs>
      <circle cx="50" cy="50" r="44" fill="url(#${gid})" stroke="${hero.color}" stroke-width="7"/>
      <circle cx="50" cy="50" r="36" fill="none" stroke="${hero.color}" stroke-width="1.5" opacity="0.45"/>
      <g transform="translate(19 19) scale(0.97)">${avatarInner(hero)}</g>
      <ellipse cx="36" cy="26" rx="14" ry="7" fill="#fff" opacity="0.14"/>
    </svg>`,
  },
  bidak: {
    id: 'bidak',
    name: 'Bidak Klasik',
    desc: 'Pion papan klasik, glossy & tebal',
    render: (hero, gid = nextId('bdG')) => `<svg viewBox="0 0 100 100" class="pawn-svg">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="22%" stop-color="${hero.color}"/>
        <stop offset="80%" stop-color="${hero.color}"/>
        <stop offset="100%" stop-color="${hero.colorDark}"/>
      </linearGradient></defs>
      <ellipse cx="50" cy="88" rx="32" ry="9" fill="${hero.colorDark}" stroke="${hero.color}" stroke-width="3"/>
      <path d="M26 86 C26 74 36 70 39 62 L43 46 H57 L61 62 C64 70 74 74 74 86 Z" fill="url(#${gid})" stroke="#0b1020" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="50" cy="46" rx="17" ry="6" fill="${hero.color}" stroke="#0b1020" stroke-width="2.2"/>
      <circle cx="50" cy="27" r="17" fill="url(#${gid})" stroke="#0b1020" stroke-width="2.2"/>
      <ellipse cx="44" cy="20" rx="6" ry="4" fill="#fff" opacity="0.55"/>
    </svg>`,
  },
  kristal: {
    id: 'kristal',
    name: 'Kristal Prisma',
    desc: 'Permata heksagonal dengan faset tajam',
    render: (hero) => `<svg viewBox="0 0 100 100" class="pawn-svg">
      <polygon points="50,5 88,28 88,72 50,95 12,72 12,28" fill="${hero.colorDark}" stroke="${hero.color}" stroke-width="4" stroke-linejoin="round"/>
      <polygon points="50,5 88,28 50,42 12,28" fill="${hero.color}" opacity="0.95"/>
      <polygon points="12,28 50,42 50,95 12,72" fill="${hero.color}" opacity="0.55"/>
      <polygon points="88,28 50,42 50,95 88,72" fill="${hero.color}" opacity="0.28"/>
      <polygon points="50,18 70,30 50,38 30,30" fill="#fff" opacity="0.4"/>
      <path d="M50 42 V95" stroke="#fff" stroke-width="1.5" opacity="0.35"/>
    </svg>`,
  },
  chip: {
    id: 'chip',
    name: 'Chip Arcade',
    desc: 'Koin token arcade dengan inisial hero',
    render: (hero) => `<svg viewBox="0 0 100 100" class="pawn-svg">
      <circle cx="50" cy="54" r="42" fill="${hero.colorDark}"/>
      <circle cx="50" cy="48" r="42" fill="${hero.color}"/>
      <circle cx="50" cy="48" r="35" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="11 11.3" opacity="0.85"/>
      <circle cx="50" cy="48" r="25" fill="#070b16" stroke="${hero.colorDark}" stroke-width="3"/>
      <text x="50" y="59" text-anchor="middle" font-family="Orbitron, sans-serif" font-weight="900" font-size="30" fill="${hero.color}">${hero.name.charAt(0)}</text>
    </svg>`,
  },
};

// ----------------------------------------------------------------------------
// Dice Skins — purely CSS driven via [data-skin] on .dice-face elements
// ----------------------------------------------------------------------------

export const DICE_SKINS = {
  neon: { id: 'neon', name: 'Neon Core', desc: 'Kubus gelap dengan pip menyala' },
  gading: { id: 'gading', name: 'Gading Klasik', desc: 'Dadu tulang putih, pip satu merah' },
  kaca: { id: 'kaca', name: 'Hologram', desc: 'Kaca bening berkilau pelangi' },
  emas: { id: 'emas', name: 'Emas 24K', desc: 'Logam emas mewah, pip hitam' },
  batik: { id: 'batik', name: 'Batik Sogan', desc: 'Kayu cokelat motif batik, pip krem' },
};

// ----------------------------------------------------------------------------
// Persistence (localStorage, wrapped for private mode / blocked storage)
// ----------------------------------------------------------------------------

const STORE_KEY = 'ludoz.cosmetics.v1';
export const DEFAULT_COSMETICS = { map: 'kawung', pawn: 'orb', dice: 'neon' };

export function loadCosmetics() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...DEFAULT_COSMETICS };
    const parsed = JSON.parse(raw);
    return {
      map: MAPS[parsed.map] ? parsed.map : DEFAULT_COSMETICS.map,
      pawn: PAWN_SKINS[parsed.pawn] ? parsed.pawn : DEFAULT_COSMETICS.pawn,
      dice: DICE_SKINS[parsed.dice] ? parsed.dice : DEFAULT_COSMETICS.dice,
    };
  } catch {
    return { ...DEFAULT_COSMETICS };
  }
}

export function saveCosmetics(c) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable — cosmetics simply won't persist */
  }
}

export function getMap(id) {
  return MAPS[id] || MAPS.kawung;
}

export function renderPawnSkin(skinId, hero) {
  return (PAWN_SKINS[skinId] || PAWN_SKINS.orb).render(hero);
}

/** 3x3 pip grid for a die value 1..6. */
export function pipGridHTML(n) {
  const layouts = {
    1: [4],
    2: [2, 6],
    3: [2, 4, 6],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const on = new Set(layouts[n] || [4]);
  let pips = '';
  for (let i = 0; i < 9; i++) pips += `<span class="pip ${on.has(i) ? 'on' : ''}"></span>`;
  return `<div class="dice-pip-grid">${pips}</div>`;
}

/** Standalone die face (lobby previews, loader); skin styling via CSS. */
export function diceFaceHTML(n, { skin = 'neon', cls = '' } = {}) {
  return `<div class="die dice-face face-${n} ${cls}" data-skin="${skin}">${pipGridHTML(n)}</div>`;
}
