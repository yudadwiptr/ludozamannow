// ============================================================================
// LUDO OVERDRIVE — Constants, Board Geometry, Themes, Heroes, Dice & Events
// ============================================================================

export const GRID_SIZE = 15;

// 52-tile clockwise outer track coordinates [row, col] (0-indexed in 15x15 grid)
export const MAIN_TRACK = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0],
];

// Private 5-tile home stretches (progress 51..55) + center goal slot (progress 56)
export const HOME_STRETCHES = {
  0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

// Yard slots for each hero's 4 pawns inside their 6x6 corner base
export const BASE_SLOTS = {
  0: [[1.6, 1.6], [1.6, 3.4], [3.4, 1.6], [3.4, 3.4]],
  1: [[1.6, 10.6], [1.6, 12.4], [3.4, 10.6], [3.4, 12.4]],
  2: [[10.6, 10.6], [10.6, 12.4], [12.4, 10.6], [12.4, 12.4]],
  3: [[10.6, 1.6], [10.6, 3.4], [12.4, 1.6], [12.4, 3.4]],
};

export const START_INDICES = [0, 13, 26, 39];
export const STAR_SAFE_INDICES = [8, 21, 34, 47];
export const ALL_SAFE_INDICES = [...START_INDICES, ...STAR_SAFE_INDICES];
export const MYSTERY_TILES = [4, 17, 30, 43];
export const PORTAL_PAIR = [10, 36];
export const TURBO_TILES = [2, 3, 15, 16, 28, 29, 41, 42];

export const MAX_PROGRESS = 56;
export const OVERDRIVE_COST = 100;

// ============================================================================
// Theme Definitions: 🇮🇩 NUSANTARA CYBERPUNK vs 🌃 NEO-ARCADE
// ============================================================================

export const THEMES = {
  nusantara: {
    id: 'nusantara',
    label: 'Nusantara Cyber',
    brandTitle: 'LUDOZ',
    brandPill: 'LUDO ZAMAN NOW',
    boardBg: '#120d1d',
    boardStroke: '#523a28',
    tileBg: '#1a132b',
    tileStroke: '#382a54',
    starBg: '#231938',
    starStroke: '#c99738',
    yardBg: '#150f24',
    batikPattern: true,
    emotes: [
      { id: 'ez', icon: 'laugh', label: 'AUTO PULANG!' },
      { id: 'ampun', icon: 'pray', label: 'AMPUN SUHU' },
      { id: 'sakti', icon: 'bolt', label: 'SAKTI BOSS!' },
      { id: 'mental', icon: 'skull', label: 'KENA MENTAL' },
      { id: 'gas', icon: 'flame', label: 'GASKEUN!' },
    ],
    heroes: [
      {
        id: 0,
        key: 'kitsune',
        name: 'GARUDA-01',
        title: 'Cyber Rajawali',
        emoji: '🦅',
        color: '#2dd4bf',
        colorDark: '#123f3b',
        glow: 'rgba(45, 212, 191, 0.3)',
        startIdx: 0,
        skillName: 'Tukar Bayangan',
        skillDesc: 'Tukar posisi 1 pionmu dengan pion lawan di jalur utama!',
        koType: 'glitch_beam',
        koText: 'GARUDA LASER KO!',
        svgAvatar: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 22 L24 14 L32 8 L40 14 L56 22 L46 34 L32 54 L18 34 Z" fill="#092629" stroke="#2dd4bf" stroke-width="2.5"/>
          <path d="M14 24 L28 28 L20 34 Z" fill="#2dd4bf"/>
          <path d="M50 24 L36 28 L44 34 Z" fill="#2dd4bf"/>
          <polygon points="32,26 26,38 32,46 38,38" fill="#f2b544" stroke="#2dd4bf" stroke-width="1.5"/>
          <path d="M22 14 L32 20 L42 14" stroke="#f2b544" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`,
      },
      {
        id: 1,
        key: 'titan',
        name: 'BARONG-X',
        title: 'Mecha Penjaga',
        emoji: '👹',
        color: '#f1556f',
        colorDark: '#55202d',
        glow: 'rgba(241, 85, 111, 0.3)',
        startIdx: 13,
        skillName: 'Perisai Barong',
        skillDesc: 'Pasang perisai 2 ronde pada pion: lawan yang menabrak terpental mundur 3 langkah!',
        koType: 'meteor',
        koText: 'METEOR BARONG KO!',
        svgAvatar: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 20 L20 10 L32 14 L44 10 L52 20 L50 48 L32 56 L14 48 Z" fill="#2c0b16" stroke="#f1556f" stroke-width="2.5"/>
          <circle cx="23" cy="29" r="5" fill="#f2b544"/>
          <circle cx="41" cy="29" r="5" fill="#f2b544"/>
          <circle cx="23" cy="29" r="2" fill="#1a050d"/>
          <circle cx="41" cy="29" r="2" fill="#1a050d"/>
          <path d="M20 42 L26 38 L32 43 L38 38 L44 42" stroke="#ff7a9c" stroke-width="3" stroke-linecap="round"/>
          <path d="M18 46 L22 52 M46 46 L42 52" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`,
      },
      {
        id: 2,
        key: 'sparky',
        name: 'MACAN-V',
        title: 'Kilat Siliwangi',
        emoji: '🐯',
        color: '#f2b544',
        colorDark: '#57431a',
        glow: 'rgba(242, 181, 68, 0.3)',
        startIdx: 26,
        skillName: 'Lompatan Kilat',
        skillDesc: 'Pecah hasil dadu ke 2 pion sekaligus (atau +3 Turbo jika cuma 1 pion aktif)!',
        koType: 'lightning',
        koText: 'PETIR KILAT KO!',
        svgAvatar: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="14,12 24,20 14,28" fill="#f2b544"/>
          <polygon points="50,12 40,20 50,28" fill="#f2b544"/>
          <rect x="14" y="18" width="36" height="34" rx="14" fill="#2a1d04" stroke="#f2b544" stroke-width="2.5"/>
          <path d="M26 20 L32 27 L38 20" stroke="#f2b544" stroke-width="2.5"/>
          <polygon points="21,31 29,33 23,37" fill="#fff3b0"/>
          <polygon points="43,31 35,33 41,37" fill="#fff3b0"/>
          <path d="M26 43 L32 47 L38 43" stroke="#f2b544" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="15" y1="35" x2="21" y2="35" stroke="#f2b544" stroke-width="2"/>
          <line x1="43" y1="35" x2="49" y2="35" stroke="#f2b544" stroke-width="2"/>
        </svg>`,
      },
      {
        id: 3,
        key: 'phantom',
        name: 'NAGA-99',
        title: 'Naga Neon Gaib',
        emoji: '🐉',
        color: '#b08cf0',
        colorDark: '#3d2a5e',
        glow: 'rgba(176, 140, 240, 0.3)',
        startIdx: 39,
        skillName: 'Langkah Gaib',
        skillDesc: 'Dapat +3 langkah ekstra & tembus perisai maupun slime lawan di giliran ini!',
        koType: 'blackhole',
        koText: 'BLACK HOLE NAGA KO!',
        svgAvatar: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 16 L22 24 L32 10 L42 24 L52 16 L46 46 L32 56 L18 46 Z" fill="#1e0b30" stroke="#b08cf0" stroke-width="2.5"/>
          <path d="M20 32 L28 36 L22 39 Z" fill="#2dd4bf"/>
          <path d="M44 32 L36 36 L42 39 Z" fill="#2dd4bf"/>
          <path d="M25 46 Q32 51 39 46" stroke="#e0aaff" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="32" cy="24" r="3" fill="#f2b544"/>
        </svg>`,
      },
    ],
  },

  neo: {
    id: 'neo',
    label: 'Neo-Arcade',
    brandTitle: 'LUDOZ',
    brandPill: 'LUDO ZAMAN NOW',
    boardBg: '#0c1122',
    boardStroke: '#243456',
    tileBg: '#131b32',
    tileStroke: '#223052',
    starBg: '#18223f',
    starStroke: '#384e7d',
    yardBg: '#0f162b',
    batikPattern: false,
    emotes: [
      { id: 'ez', icon: 'laugh', label: 'EZ!' },
      { id: 'ampun', icon: 'pray', label: 'AMPUN' },
      { id: 'mental', icon: 'skull', label: 'KENA MENTAL' },
      { id: 'awas', icon: 'eye', label: 'AWAS YA!' },
      { id: 'gaskeun', icon: 'flame', label: 'GASKEUN!' },
    ],
    heroes: [
      {
        id: 0,
        key: 'kitsune',
        name: 'KITSUNE',
        title: 'Cyber Glitcher',
        emoji: '🦊',
        color: '#38c6e0',
        colorDark: '#164857',
        glow: 'rgba(56, 198, 224, 0.3)',
        startIdx: 0,
        skillName: 'Swap Glitch',
        skillDesc: 'Tukar posisi 1 pionmu dengan pion lawan di jalur utama!',
        koType: 'glitch_beam',
        koText: 'CYBER GLITCH KO!',
        svgAvatar: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="10,10 24,26 12,34" fill="#38c6e0" opacity="0.9"/>
          <polygon points="54,10 40,26 52,34" fill="#38c6e0" opacity="0.9"/>
          <polygon points="14,22 50,22 44,48 32,56 20,48" fill="#0b1f2e" stroke="#38c6e0" stroke-width="2.5"/>
          <polygon points="20,33 28,36 22,39" fill="#38c6e0"/>
          <polygon points="44,33 36,36 42,39" fill="#38c6e0"/>
          <path d="M27 45 L32 49 L37 45" stroke="#a5e4ee" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="16" y1="28" x2="48" y2="28" stroke="#38c6e0" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7"/>
        </svg>`,
      },
      {
        id: 1,
        key: 'titan',
        name: 'TITAN-X',
        title: 'Lava Brawler',
        emoji: '🦍',
        color: '#ef5b7a',
        colorDark: '#56222f',
        glow: 'rgba(239, 91, 122, 0.3)',
        startIdx: 13,
        skillName: 'Iron Shield',
        skillDesc: 'Pasang perisai 2 ronde pada pion: lawan yang menabrak terpental mundur 3 langkah!',
        koType: 'meteor',
        koText: 'METEOR SMASH KO!',
        svgAvatar: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="14" width="40" height="38" rx="10" fill="#290b16" stroke="#ef5b7a" stroke-width="2.5"/>
          <path d="M18 26 L46 26 L42 36 L22 36 Z" fill="#ef5b7a"/>
          <rect x="24" y="29" width="6" height="4" rx="1" fill="#fff"/>
          <rect x="34" y="29" width="6" height="4" rx="1" fill="#fff"/>
          <path d="M22 44 H42" stroke="#ff7a9c" stroke-width="3" stroke-linecap="round"/>
          <path d="M14 20 L8 28 L14 34" stroke="#ef5b7a" stroke-width="2.5"/>
          <path d="M50 20 L56 28 L50 34" stroke="#ef5b7a" stroke-width="2.5"/>
        </svg>`,
      },
      {
        id: 2,
        key: 'sparky',
        name: 'SPARKY',
        title: 'Turbo Courier',
        emoji: '⚡',
        color: '#ecc94b',
        colorDark: '#584a1c',
        glow: 'rgba(236, 201, 75, 0.3)',
        startIdx: 26,
        skillName: 'Split Step',
        skillDesc: 'Pecah hasil dadu ke 2 pion sekaligus (atau +3 Turbo jika cuma 1 pion aktif)!',
        koType: 'lightning',
        koText: 'THUNDERBOLT KO!',
        svgAvatar: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="34" r="20" fill="#261e04" stroke="#ecc94b" stroke-width="2.5"/>
          <polygon points="34,6 22,28 32,28 28,44 44,22 34,22" fill="#ecc94b"/>
          <circle cx="24" cy="37" r="3" fill="#fff7cc"/>
          <circle cx="40" cy="37" r="3" fill="#fff7cc"/>
          <path d="M25 46 Q32 51 39 46" stroke="#ecc94b" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`,
      },
      {
        id: 3,
        key: 'phantom',
        name: 'PHANTOM',
        title: 'Neon Wraith',
        emoji: '👻',
        color: '#b48af0',
        colorDark: '#402c62',
        glow: 'rgba(180, 138, 240, 0.3)',
        startIdx: 39,
        skillName: 'Phase Dash',
        skillDesc: 'Dapat +3 langkah ekstra & tembus perisai maupun slime lawan di giliran ini!',
        koType: 'blackhole',
        koText: 'BLACK HOLE KO!',
        svgAvatar: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 32 C16 16 48 16 48 32 V52 L41 46 L35 52 L29 46 L23 52 L16 46 Z" fill="#1d0b2e" stroke="#b48af0" stroke-width="2.5"/>
          <ellipse cx="25" cy="31" rx="4" ry="5" fill="#e0aaff"/>
          <ellipse cx="39" cy="31" rx="4" ry="5" fill="#e0aaff"/>
          <circle cx="26" cy="31" r="1.5" fill="#1d0b2e"/>
          <circle cx="40" cy="31" r="1.5" fill="#1d0b2e"/>
        </svg>`,
      },
    ],
  },
};

export function getTheme(themeId = 'nusantara') {
  return THEMES[themeId] || THEMES.nusantara;
}

export function getHeroesForTheme(themeId = 'nusantara') {
  return getTheme(themeId).heroes;
}

export const HEROES = THEMES.nusantara.heroes;
export const EMOTES = THEMES.nusantara.emotes;

export const DICE_TYPES = {
  normal: {
    id: 'normal',
    name: 'Standar',
    icon: 'dice',
    short: '1-6',
    color: '#e2e8f0',
    faces: [1, 2, 3, 4, 5, 6],
    desc: 'Dadu klasik 1–6. Wajib dapat 6 untuk keluar dari markas!',
  },
  sniper: {
    id: 'sniper',
    name: 'Ganjil',
    icon: 'odd',
    short: '1-3-5',
    color: '#38bdf8',
    faces: [1, 3, 5, 1, 3, 5],
    desc: 'Cuma keluar angka ganjil (1, 3, 5) — pas buat incar KO atau masuk finis dengan tepat!',
  },
  chaos: {
    id: 'chaos',
    name: 'Chaos',
    icon: 'flame',
    short: '0-8 / -2',
    color: '#fb7185',
    faces: [0, 2, 4, 6, 8, -2],
    desc: 'High risk! Bisa keluar di angka 6, melesat 8 langkah, atau sial mundur 2.',
  },
  magnet: {
    id: 'magnet',
    name: 'Magnet',
    icon: 'magnet',
    short: '±1 KO',
    color: '#f472b6',
    faces: [1, 2, 3, 4, 5, 6],
    desc: 'Mendarat ±1 petak dari lawan otomatis menyedot & KO lawan!',
  },
  mirror: {
    id: 'mirror',
    name: 'Genap',
    icon: 'even',
    short: '2-4-6 · 2 Pion',
    color: '#a78bfa',
    faces: [2, 4, 6, 2, 4, 6],
    desc: 'Cuma keluar angka genap (2, 4, 6) & menggerakkan 2 pion sekaligus dengan angka yang sama!',
  },
  slime: {
    id: 'slime',
    name: 'Slime Trap',
    icon: 'slime',
    short: 'Jebakan',
    color: '#4ade80',
    faces: [1, 2, 3, 4, 5, 6],
    desc: 'Meninggalkan lendir lengket yang menghentikan lawan berikutnya!',
  },
};

export const SPECIAL_DICE_POOL = ['sniper', 'chaos', 'magnet', 'mirror', 'slime'];

export const BOARD_EVENTS = [
  {
    id: 'portal',
    name: 'PORTAL SHIFT',
    icon: 'portal',
    color: '#2dd4bf',
    desc: 'Dua wormhole aktif di papan! Mendarat di portal langsung teleport ke seberang.',
  },
  {
    id: 'turbo',
    name: 'TURBO LANE',
    icon: 'bolt',
    color: '#f2b544',
    desc: 'Petak emas menyala! Mendarat di Turbo Tile dapat +2 langkah instan.',
  },
  {
    id: 'blackout',
    name: 'BLACKOUT MODE',
    icon: 'moon',
    color: '#f1556f',
    desc: 'Semua Safe Zone NONAKTIF sementara! Tidak ada tempat aman!',
  },
  {
    id: 'surge',
    name: 'ENERGY SURGE',
    icon: 'gem',
    color: '#4ade80',
    desc: 'Energi Overdrive dari setiap langkah & Mystery Box berlipat ganda!',
  },
];
