// ============================================================================
// LUDO OVERDRIVE — Josjis Interactive SVG Map, Live Path Preview & HUD Renderer
// ============================================================================

import {
  getTheme,
  MAIN_TRACK,
  HOME_STRETCHES,
  BASE_SLOTS,
  ALL_SAFE_INDICES,
  STAR_SAFE_INDICES,
  PORTAL_PAIR,
  TURBO_TILES,
  MAX_PROGRESS,
  DICE_TYPES,
  OVERDRIVE_COST,
} from './constants.js';
import { getPawnGridPos, getGlobalTrackIndex } from './engine.js';
import { icon, iconInner, stripEmoji } from './icons.js';
import { getMap, loadCosmetics, renderPawnSkin, pipGridHTML } from './skins.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const ID_FLAG_SVG = `<svg class="flag-svg" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="8" rx="2" fill="#f1556f"/><rect y="8" width="24" height="8" rx="2" fill="#f8fafc"/></svg>`;

const INSPECTOR_IDLE = `${icon('bulb')}<span>Arahkan kursor ke petak atau pion menyala untuk lihat info &amp; preview jalur.</span>`;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

/** An icon from icons.js placed inside the board SVG, centered on (cx, cy). */
function svgIcon(name, cx, cy, size, color, strokeWidth = 2, { fill = 'none', fillOpacity = 1 } = {}) {
  const s = size / 24;
  const g = svgEl('g', {
    transform: `translate(${cx - size / 2} ${cy - size / 2}) scale(${s})`,
    fill,
    'fill-opacity': fillOpacity,
    stroke: color,
    'stroke-width': strokeWidth,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    color,
  });
  g.innerHTML = iconInner(name);
  return g;
}

function avatarInner(hero) {
  return hero.svgAvatar.replace(/^\s*<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

export class GameRenderer {
  constructor(dom, callbacks) {
    this.dom = dom;
    this.cb = callbacks;
    this.pawnNodes = new Map();
    this.pawnLastPos = new Map();
    this.currentThemeId = null;
    this.currentMapId = null;
    this.lastState = null;
    this.cosmetics = loadCosmetics();
    this._applyBodyCosmetics();
    this._buildStaticBoardSVG('nusantara');
    this._bindBoardTileHover();
    if (this.dom.tileInspector) this.dom.tileInspector.innerHTML = INSPECTOR_IDLE;
  }

  // --------------------------------------------------------------------------
  // 0. Cosmetics (map / pawn skin / dice skin) — applied live
  // --------------------------------------------------------------------------

  setCosmetics(next) {
    this.cosmetics = { ...this.cosmetics, ...next };
    this._applyBodyCosmetics();
    if (this.currentMapId !== this.cosmetics.map) {
      this._buildStaticBoardSVG(this.currentThemeId || 'nusantara');
    }
    if (this.lastState) this.render(this.lastState);
  }

  _applyBodyCosmetics() {
    document.body.dataset.map = this.cosmetics.map;
    document.body.dataset.pawnSkin = this.cosmetics.pawn;
    document.body.dataset.diceSkin = this.cosmetics.dice;
  }

  // --------------------------------------------------------------------------
  // 1. Rich Architectural 15x15 Interactive SVG Map
  // --------------------------------------------------------------------------

  _buildStaticBoardSVG(themeId) {
    this.currentThemeId = themeId;
    this.currentMapId = this.cosmetics.map;
    const theme = getTheme(themeId);
    const map = getMap(this.cosmetics.map);
    const heroes = theme.heroes;
    const svg = this.dom.boardSvg;
    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 1500 1500');
    document.documentElement.style.setProperty('--map-ambient', map.ambient);

    const defs = svgEl('defs');
    defs.innerHTML = `
      <radialGradient id="coreGrad" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="${map.coreGlow}"/>
        <stop offset="100%" stop-color="${map.boardBg}"/>
      </radialGradient>
      <linearGradient id="tileBevel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.10)"/>
        <stop offset="35%" stop-color="rgba(255,255,255,0.01)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.28)"/>
      </linearGradient>
      <linearGradient id="cyberBorder" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${heroes[0].color}"/>
        <stop offset="33%" stop-color="${heroes[1].color}"/>
        <stop offset="66%" stop-color="${heroes[2].color}"/>
        <stop offset="100%" stop-color="${heroes[3].color}"/>
      </linearGradient>
      <filter id="neonSoft" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      ${map.pattern}
    `;
    svg.appendChild(defs);

    // Outer board frame (hero-colored gradient border)
    svg.appendChild(svgEl('rect', {
      x: 4, y: 4, width: 1492, height: 1492, rx: 36,
      fill: map.boardBg,
      stroke: 'url(#cyberBorder)',
      'stroke-width': 4,
      'stroke-opacity': 0.8,
    }));

    // Map motif overlay
    svg.appendChild(svgEl('rect', {
      x: 10, y: 10, width: 1480, height: 1480, rx: 32,
      fill: 'url(#mapPattern)',
    }));

    // Track underlay ribbons connecting the cross arms
    svg.appendChild(svgEl('rect', { x: 598, y: 8, width: 304, height: 1484, rx: 14, fill: 'rgba(0,0,0,0.34)' }));
    svg.appendChild(svgEl('rect', { x: 8, y: 598, width: 1484, height: 304, rx: 14, fill: 'rgba(0,0,0,0.34)' }));

    // 52 main track tiles
    const startMeta = {
      0: { hero: heroes[0], rot: 0 },
      13: { hero: heroes[1], rot: 90 },
      26: { hero: heroes[2], rot: 180 },
      39: { hero: heroes[3], rot: 270 },
    };
    const flowChevrons = { 4: 0, 10: 0, 17: 90, 23: 90, 30: 180, 36: 180, 43: 270, 49: 270 };

    MAIN_TRACK.forEach(([r, c], idx) => {
      const x = c * 100;
      const y = r * 100;
      const startInfo = startMeta[idx];
      const isStar = STAR_SAFE_INDICES.includes(idx);

      let fill = map.tileBg;
      let stroke = map.tileStroke;
      let tileHint = `Petak jalur #${idx + 1} — rawan KO, hati-hati!`;

      if (startInfo) {
        fill = startInfo.hero.colorDark;
        stroke = startInfo.hero.color;
        tileHint = `START ${startInfo.hero.name} — petak aman & titik keluar pion saat dapat dadu 6.`;
      } else if (isStar) {
        fill = map.starBg;
        stroke = map.starStroke;
        tileHint = 'SAFE ZONE — pion aman dari KO (kecuali saat event Blackout).';
      }

      const tileGroup = svgEl('g', {
        class: 'board-tile-group',
        'data-track-idx': idx,
        'data-hint': tileHint,
      });

      tileGroup.appendChild(svgEl('rect', {
        x: x + 5, y: y + 5, width: 90, height: 90, rx: 16,
        fill,
        stroke,
        'stroke-width': startInfo ? 3.5 : 2,
        class: 'tile-rect',
      }));
      tileGroup.appendChild(svgEl('rect', {
        x: x + 6, y: y + 6, width: 88, height: 88, rx: 15,
        fill: 'url(#tileBevel)',
        'pointer-events': 'none',
      }));

      if (startInfo) {
        tileGroup.appendChild(svgEl('circle', {
          cx: x + 50, cy: y + 50, r: 30,
          fill: 'rgba(0,0,0,0.32)',
          stroke: startInfo.hero.color,
          'stroke-width': 2,
        }));
        tileGroup.appendChild(svgEl('path', {
          d: 'M -9 -14 L 13 0 L -9 14 Z',
          fill: startInfo.hero.color,
          'stroke-linejoin': 'round',
          stroke: startInfo.hero.color,
          'stroke-width': 4,
          transform: `translate(${x + 50} ${y + 50}) rotate(${startInfo.rot})`,
        }));
      } else if (isStar) {
        tileGroup.appendChild(svgEl('circle', {
          cx: x + 50, cy: y + 50, r: 32,
          fill: 'rgba(242, 181, 68, 0.06)',
          stroke: map.starStroke,
          'stroke-width': 1.5,
          opacity: '0.6',
        }));
        const star = svgIcon('star', x + 50, y + 50, 46, map.starColor, 2.2, { fill: map.starColor, fillOpacity: 0.25 });
        star.classList.add('board-star-icon');
        tileGroup.appendChild(star);
      } else if (flowChevrons[idx] !== undefined) {
        tileGroup.appendChild(svgEl('path', {
          d: 'M -7 -12 L 7 0 L -7 12',
          fill: 'none',
          stroke: 'rgba(148, 163, 184, 0.28)',
          'stroke-width': 5,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          transform: `translate(${x + 50} ${y + 50}) rotate(${flowChevrons[idx]})`,
        }));
      }

      svg.appendChild(tileGroup);
    });

    // 4 private home stretches
    heroes.forEach((hero) => {
      const tiles = HOME_STRETCHES[hero.id].slice(0, 5);
      const laneGroup = svgEl('g', { class: 'hero-home-lane', 'data-hero-id': hero.id });

      const [r0, c0] = tiles[0];
      const [r4, c4] = tiles[4];
      laneGroup.appendChild(svgEl('line', {
        x1: c0 * 100 + 50, y1: r0 * 100 + 50,
        x2: c4 * 100 + 50, y2: r4 * 100 + 50,
        stroke: hero.color,
        'stroke-width': 6,
        'stroke-linecap': 'round',
        opacity: '0.36',
      }));

      tiles.forEach(([r, c], stepIdx) => {
        const x = c * 100;
        const y = r * 100;
        const gTile = svgEl('g', {
          class: 'board-tile-group',
          'data-hint': `JALUR FINIS ${hero.name} (${stepIdx + 1}/5) — aman total dari lawan.`,
        });
        gTile.appendChild(svgEl('rect', {
          x: x + 6, y: y + 6, width: 88, height: 88, rx: 16,
          fill: hero.colorDark,
          stroke: hero.color,
          'stroke-width': 2.8,
          opacity: '0.92',
          class: 'tile-rect',
        }));
        gTile.appendChild(svgEl('rect', {
          x: x + 7, y: y + 7, width: 86, height: 86, rx: 15,
          fill: 'url(#tileBevel)',
          'pointer-events': 'none',
        }));
        gTile.appendChild(svgEl('polygon', {
          points: `${x + 50},${y + 32} ${x + 68},${y + 50} ${x + 50},${y + 68} ${x + 32},${y + 50}`,
          fill: hero.color,
          opacity: '0.35',
        }));
        laneGroup.appendChild(gTile);
      });
      svg.appendChild(laneGroup);
    });

    // 4 corner hero yards
    const yardOrigins = [
      { hero: heroes[0], x: 0, y: 0 },
      { hero: heroes[1], x: 900, y: 0 },
      { hero: heroes[2], x: 900, y: 900 },
      { hero: heroes[3], x: 0, y: 900 },
    ];

    yardOrigins.forEach(({ hero, x, y }) => {
      const yardG = svgEl('g', {
        class: 'hero-yard-group',
        'data-hero-id': hero.id,
        'data-hint': `MARKAS ${hero.name} — Skill: ${hero.skillName} • Finisher: ${hero.koText}`,
      });

      yardG.appendChild(svgEl('rect', {
        x: x + 16, y: y + 16, width: 568, height: 568, rx: 38,
        fill: map.yardBg,
        stroke: hero.color,
        'stroke-width': 3,
        'stroke-opacity': 0.75,
        class: 'yard-frame',
      }));

      if (map.yardPattern) {
        yardG.appendChild(svgEl('rect', {
          x: x + 16, y: y + 16, width: 568, height: 568, rx: 38,
          fill: 'url(#mapPattern)',
          opacity: '0.85',
        }));
      }

      yardG.appendChild(svgEl('rect', {
        x: x + 48, y: y + 48, width: 504, height: 504, rx: 30,
        fill: hero.colorDark,
        opacity: '0.3',
        stroke: hero.color,
        'stroke-width': 2,
        class: 'yard-inner-box',
      }));

      // Faint hero avatar watermark
      const wm = svgEl('g', {
        transform: `translate(${x + 300 - 110} ${y + 300 - 110}) scale(${220 / 64})`,
        opacity: '0.1',
        'pointer-events': 'none',
      });
      wm.innerHTML = avatarInner(hero);
      yardG.appendChild(wm);

      // Corner bracket accents
      const bLen = 36;
      const bx1 = x + 32, by1 = y + 32, bx2 = x + 568, by2 = y + 568;
      [
        `M ${bx1} ${by1 + bLen} L ${bx1} ${by1} L ${bx1 + bLen} ${by1}`,
        `M ${bx2 - bLen} ${by1} L ${bx2} ${by1} L ${bx2} ${by1 + bLen}`,
        `M ${bx1} ${by2 - bLen} L ${bx1} ${by2} L ${bx1 + bLen} ${by2}`,
        `M ${bx2 - bLen} ${by2} L ${bx2} ${by2} L ${bx2} ${by2 - bLen}`,
      ].forEach((d) => {
        yardG.appendChild(svgEl('path', {
          d,
          fill: 'none',
          stroke: '#ffffff',
          'stroke-width': 4,
          'stroke-linecap': 'round',
          opacity: '0.5',
        }));
      });

      const labelY = y === 0 ? y + 86 : y + 538;
      const lbl = svgEl('text', {
        x: x + 300, y: labelY,
        'text-anchor': 'middle',
        fill: hero.color,
        'font-family': 'Orbitron, sans-serif',
        'font-size': '30',
        'font-weight': '900',
        'letter-spacing': '4',
      });
      lbl.textContent = hero.name;
      yardG.appendChild(lbl);

      // 4 docking pads
      BASE_SLOTS[hero.id].forEach(([r, c]) => {
        const cx = (c + 0.5) * 100;
        const cy = (r + 0.5) * 100;
        yardG.appendChild(svgEl('circle', {
          cx, cy, r: 60,
          fill: 'rgba(6, 9, 18, 0.85)',
          stroke: hero.color,
          'stroke-width': 3.5,
        }));
        yardG.appendChild(svgEl('circle', { cx, cy, r: 10, fill: hero.color, opacity: '0.28' }));
      });

      svg.appendChild(yardG);
    });

    // Center finish core
    const centerGroup = svgEl('g', {
      class: 'board-tile-group',
      'data-hint': 'ZONA FINIS — masukkan semua pion ke tengah dengan angka pas untuk MENANG!',
    });
    [
      { hero: heroes[0], pts: '600,600 750,750 600,900' },
      { hero: heroes[1], pts: '600,600 900,600 750,750' },
      { hero: heroes[2], pts: '900,600 900,900 750,750' },
      { hero: heroes[3], pts: '600,900 900,900 750,750' },
    ].forEach(({ hero, pts }) => {
      centerGroup.appendChild(svgEl('polygon', {
        points: pts,
        fill: hero.colorDark,
        stroke: hero.color,
        'stroke-width': 4,
      }));
    });

    centerGroup.appendChild(svgEl('circle', {
      cx: 750, cy: 750, r: 92,
      fill: 'url(#coreGrad)',
      stroke: map.ringColor,
      'stroke-width': 3.5,
      opacity: '0.92',
    }));

    const emblem = svgEl('g', {
      transform: 'translate(690 690) scale(1.2)',
      filter: 'url(#neonSoft)',
    });
    emblem.innerHTML = map.emblem;
    centerGroup.appendChild(emblem);
    svg.appendChild(centerGroup);

    // Dynamic overlays (Mystery boxes, Portals, Turbo, Slime)
    this.dynamicLayer = svgEl('g', { id: 'board-dynamic-layer' });
    svg.appendChild(this.dynamicLayer);

    // Live path preview layer (always on top of tiles)
    this.previewLayer = svgEl('g', { id: 'board-preview-layer', 'pointer-events': 'none' });
    svg.appendChild(this.previewLayer);
  }

  _bindBoardTileHover() {
    this.dom.boardSvg.addEventListener('pointerover', (e) => {
      const target = e.target.closest('[data-hint]');
      if (!target || !this.dom.tileInspector) return;
      this._setInspector('info', target.getAttribute('data-hint'));
    });
    this.dom.boardSvg.addEventListener('pointerleave', () => {
      if (!this.dom.tileInspector) return;
      this.dom.tileInspector.classList.remove('active');
      this.dom.tileInspector.innerHTML = INSPECTOR_IDLE;
    });
  }

  _setInspector(iconName, text, color = null) {
    const el = this.dom.tileInspector;
    if (!el) return;
    el.innerHTML = `${icon(iconName)}<span></span>`;
    el.querySelector('span').textContent = text;
    el.style.setProperty('--insp-color', color || 'var(--active-accent)');
    el.classList.add('active');
  }

  // --------------------------------------------------------------------------
  // 2. Live Interactive Move & Swap Path Preview!
  // --------------------------------------------------------------------------

  showPawnPreview(pawnId) {
    const state = this.lastState;
    if (!state || !this.previewLayer) return;
    this.clearMovePreview();

    const activePlayer = state.players[state.turnOrderIdx];
    if (!activePlayer) return;

    // Kitsune / Garuda Swap Glitch laser arc preview!
    if (state.phase === 'SKILL_SELECT_ENEMY' && state.skillTempOwnPawnId) {
      const ownPawn = activePlayer.pawns.find((p) => p.id === state.skillTempOwnPawnId);
      let enemyPawn = null;
      for (const pl of state.players) {
        const found = pl.pawns.find((p) => p.id === pawnId);
        if (found) { enemyPawn = found; break; }
      }
      if (ownPawn && enemyPawn) {
        const [r1, c1] = getPawnGridPos(activePlayer.id, ownPawn);
        const [r2, c2] = getPawnGridPos(enemyPawn.playerId, enemyPawn);
        const x1 = (c1 + 0.5) * 100, y1 = (r1 + 0.5) * 100;
        const x2 = (c2 + 0.5) * 100, y2 = (r2 + 0.5) * 100;
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 90;

        this.previewLayer.appendChild(svgEl('path', {
          d: `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`,
          fill: 'none',
          stroke: activePlayer.hero.color,
          'stroke-width': 9,
          'stroke-linecap': 'round',
          filter: 'url(#neonSoft)',
        }));
        this._drawPreviewReticle(x2, y2, activePlayer.hero.color, 'SWAP', 'swap');
      }
      return;
    }

    if (state.phase !== 'SELECT_PAWN') return;
    if (!state.validPawnIds.includes(pawnId)) return;

    const pawn = activePlayer.pawns.find((p) => p.id === pawnId);
    if (!pawn) return;

    const steps = state._currentMoveSteps || 0;
    const pts = [];

    if (pawn.progress === -1) {
      pts.push(getPawnGridPos(activePlayer.id, pawn));
      pts.push(MAIN_TRACK[activePlayer.hero.startIdx]);
    } else if (steps < 0) {
      const back = Math.abs(steps);
      for (let i = 0; i <= back; i++) {
        const prog = Math.max(0, pawn.progress - i);
        pts.push(getPawnGridPos(activePlayer.id, { ...pawn, progress: prog }));
      }
    } else {
      for (let i = 0; i <= steps; i++) {
        const prog = Math.min(MAX_PROGRESS, pawn.progress + i);
        pts.push(getPawnGridPos(activePlayer.id, { ...pawn, progress: prog }));
      }
    }

    if (pts.length < 2) return;

    const polyPoints = pts.map(([r, c]) => `${(c + 0.5) * 100},${(r + 0.5) * 100}`).join(' ');
    this.previewLayer.appendChild(svgEl('polyline', {
      points: polyPoints,
      fill: 'none',
      stroke: activePlayer.hero.color,
      'stroke-width': 10,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: '0.88',
      filter: 'url(#neonSoft)',
    }));

    // Step dots along path
    pts.slice(1, -1).forEach(([r, c]) => {
      this.previewLayer.appendChild(svgEl('circle', {
        cx: (c + 0.5) * 100,
        cy: (r + 0.5) * 100,
        r: 12,
        fill: '#ffffff',
        stroke: activePlayer.hero.color,
        'stroke-width': 4,
      }));
    });

    // Destination outcome marker!
    const destProg = pawn.progress === -1 ? 0 : Math.max(0, Math.min(MAX_PROGRESS, pawn.progress + steps));
    const [dr, dc] = pts[pts.length - 1];
    const dx = (dc + 0.5) * 100;
    const dy = (dr + 0.5) * 100;

    let label = 'TARGET';
    let glyph = 'target';
    let badgeColor = activePlayer.hero.color;
    if (destProg === MAX_PROGRESS) {
      label = 'FINIS!';
      glyph = 'flag';
      badgeColor = '#f2b544';
    } else if (destProg <= 50) {
      const gIdx = getGlobalTrackIndex(activePlayer.hero.startIdx, destProg);
      const isBlackout = state.activeEvent?.id === 'blackout';
      const isSafe = !isBlackout && ALL_SAFE_INDICES.includes(gIdx);

      // Check enemy presence at destination
      let hasEnemy = false;
      let hasShield = false;
      for (const pl of state.players) {
        if (pl.id === activePlayer.id) continue;
        for (const ep of pl.pawns) {
          if (ep.progress >= 0 && ep.progress <= 50 && !ep.finished) {
            if (getGlobalTrackIndex(pl.hero.startIdx, ep.progress) === gIdx) {
              hasEnemy = true;
              if (ep.shieldTurns > 0) hasShield = true;
            }
          }
        }
      }
      if (hasEnemy && !isSafe) {
        const blocked = hasShield && !state.phaseDashActive;
        label = blocked ? 'BLOCK!' : 'KO!';
        glyph = blocked ? 'shield' : 'burst';
        badgeColor = blocked ? '#38bdf8' : '#f1556f';
      } else if (state.mysteryActive.has(gIdx)) {
        label = 'LOOT!';
        glyph = 'gift';
        badgeColor = '#f2b544';
      } else if (state.activeEvent?.id === 'portal' && PORTAL_PAIR.includes(gIdx)) {
        label = 'WARP!';
        glyph = 'portal';
        badgeColor = '#2dd4bf';
      } else if (state.activeEvent?.id === 'turbo' && TURBO_TILES.includes(gIdx)) {
        label = '+2 TURBO';
        glyph = 'bolt';
        badgeColor = '#f2b544';
      } else if (isSafe) {
        label = 'AMAN';
        glyph = 'star';
        badgeColor = '#4ade80';
      }
    }

    this._drawPreviewReticle(dx, dy, badgeColor, label, glyph);
    this._setInspector(glyph, `Preview ${activePlayer.hero.name} → ${label} (${steps > 0 ? '+' + steps : steps} langkah)`, badgeColor);
  }

  _drawPreviewReticle(x, y, color, text, glyph = null) {
    this.previewLayer.appendChild(svgEl('circle', {
      cx: x, cy: y, r: 44,
      fill: 'rgba(0,0,0,0.3)',
      stroke: color,
      'stroke-width': 6,
      filter: 'url(#neonSoft)',
    }));
    const iconW = glyph ? 34 : 0;
    const pillW = Math.max(120, text.length * 17 + 36 + iconW);
    const py = y > 160 ? y - 72 : y + 72;
    this.previewLayer.appendChild(svgEl('rect', {
      x: x - pillW / 2, y: py - 24, width: pillW, height: 44, rx: 14,
      fill: '#070b16',
      stroke: color,
      'stroke-width': 3.5,
    }));
    if (glyph) {
      this.previewLayer.appendChild(svgIcon(glyph, x - pillW / 2 + 30, py - 2, 26, color, 2.4));
    }
    const txt = svgEl('text', {
      x: x + iconW / 2, y: py + 7,
      'text-anchor': 'middle',
      fill: '#ffffff',
      'font-family': 'Orbitron, sans-serif',
      'font-size': '22',
      'font-weight': '900',
    });
    txt.textContent = text;
    this.previewLayer.appendChild(txt);
  }

  clearMovePreview() {
    if (this.previewLayer) this.previewLayer.innerHTML = '';
  }

  // --------------------------------------------------------------------------
  // 3. Full State Render Entry Point
  // --------------------------------------------------------------------------

  render(state) {
    if (!state) return;
    this.lastState = state;
    const theme = getTheme(state.theme);

    document.body.dataset.theme = theme.id;
    if (this.currentThemeId !== theme.id || this.currentMapId !== this.cosmetics.map) {
      this._buildStaticBoardSVG(theme.id);
    }
    if (this.dom.brandPill) {
      this.dom.brandPill.textContent = theme.brandPill;
    }
    if (this.dom.themeBtn) {
      this.dom.themeBtn.innerHTML = theme.id === 'nusantara'
        ? `${ID_FLAG_SVG} <span>Nusantara</span>`
        : `${icon('gamepad')} <span>Neo-Arcade</span>`;
    }

    // Highlight active hero's yard & home stretch on the board!
    const activeHeroId = state.players[state.turnOrderIdx]?.id;
    this.dom.boardSvg.querySelectorAll('.hero-yard-group').forEach((g) => {
      g.classList.toggle('yard-active', Number(g.dataset.heroId) === activeHeroId);
    });
    this.dom.boardSvg.querySelectorAll('.hero-home-lane').forEach((g) => {
      g.classList.toggle('lane-active', Number(g.dataset.heroId) === activeHeroId);
    });

    this.clearMovePreview();
    this._renderDynamicBoardOverlays(state);
    this._renderPawns(state);
    this._renderPlayerCards(state, theme);
    this._renderControlDock(state);
    this._renderTopBar(state);
    this._renderVictoryModal(state);
  }

  _renderDynamicBoardOverlays(state) {
    const g = this.dynamicLayer;
    g.innerHTML = '';
    const map = getMap(this.cosmetics.map);

    // Blackout: safe-zone stars dim to red
    const isBlackout = state.activeEvent?.id === 'blackout';
    this.dom.boardSvg.querySelectorAll('.board-star-icon').forEach((el) => {
      const col = isBlackout ? '#f1556f' : map.starColor;
      el.setAttribute('stroke', col);
      el.setAttribute('fill', col);
      el.setAttribute('opacity', isBlackout ? '0.35' : '1');
    });

    const tileOverlay = (idx, hint, glyph, color, shape) => {
      const [r, c] = MAIN_TRACK[idx];
      const cx = c * 100 + 50;
      const cy = r * 100 + 50;
      const og = svgEl('g', { class: 'board-tile-group board-overlay', 'data-hint': hint });
      if (shape === 'circle') {
        og.appendChild(svgEl('circle', {
          cx, cy, r: 40,
          fill: color,
          'fill-opacity': 0.2,
          stroke: color,
          'stroke-width': 4,
        }));
      } else {
        og.appendChild(svgEl('rect', {
          x: c * 100 + 10, y: r * 100 + 10, width: 80, height: 80, rx: 16,
          fill: color,
          'fill-opacity': 0.16,
          stroke: color,
          'stroke-width': 3.5,
        }));
      }
      og.appendChild(svgIcon(glyph, cx, cy, 48, color, 2.2));
      g.appendChild(og);
    };

    if (state.activeEvent?.id === 'turbo') {
      TURBO_TILES.forEach((idx) => tileOverlay(idx, 'TURBO LANE — mendarat di sini langsung melesat +2 langkah!', 'bolt', '#f2b544', 'rect'));
    }
    if (state.activeEvent?.id === 'portal') {
      PORTAL_PAIR.forEach((idx) => tileOverlay(idx, 'PORTAL SHIFT — mendarat di wormhole ini langsung teleport ke seberang!', 'portal', '#2dd4bf', 'circle'));
    }
    state.mysteryActive.forEach((idx) => {
      tileOverlay(idx, 'MYSTERY BOX — isi acak: Dadu Spesial, Reverse Uno, EMP Shock, atau +35 Energi.', 'gift', '#f2b544', 'rect');
    });
    for (const idxStr of Object.keys(state.slimeTraps)) {
      tileOverlay(Number(idxStr), 'SLIME TRAP — lawan yang melintas lengket & berhenti di sini!', 'slime', '#4ade80', 'circle');
    }

    // Skill Targeting Board Tile Highlights (Red for Enemy targets, Hero Color for Own targets!)
    if (state.phase === 'SKILL_SELECT_OWN' || state.phase === 'SKILL_SELECT_ENEMY') {
      const activePlayer = state.players[state.turnOrderIdx];
      const isEnemyPhase = state.phase === 'SKILL_SELECT_ENEMY';

      // If in SKILL_SELECT_ENEMY, also mark the origin own pawn tile in cyan
      if (isEnemyPhase && state.skillTempOwnPawnId && activePlayer) {
        const ownPw = activePlayer.pawns.find((p) => p.id === state.skillTempOwnPawnId);
        if (ownPw) {
          const [or, oc] = getPawnGridPos(activePlayer.id, ownPw);
          g.appendChild(svgEl('rect', {
            x: oc * 100 + 6, y: or * 100 + 6, width: 88, height: 88, rx: 16,
            fill: activePlayer.hero.color,
            'fill-opacity': 0.2,
            stroke: activePlayer.hero.color,
            'stroke-width': 4,
          }));
        }
      }

      for (const pl of state.players) {
        for (const pw of pl.pawns) {
          if (!state.validPawnIds.includes(pw.id)) continue;
          const [tr, tc] = getPawnGridPos(pl.id, pw);
          const tx = tc * 100;
          const ty = tr * 100;
          const tColor = isEnemyPhase ? '#f1556f' : (activePlayer?.hero.color || '#2dd4bf');
          const tg = svgEl('g', {
            class: 'board-tile-group skill-target-tile',
            'data-hint': isEnemyPhase
              ? `TARGET LAWAN (${pl.hero.name}) — Klik pion di petak merah ini untuk tukar posisi!`
              : `TARGET SKILL (${pl.hero.name}) — Klik pionmu di petak menyala ini!`,
          });
          tg.appendChild(svgEl('rect', {
            x: tx + 4, y: ty + 4, width: 92, height: 92, rx: 16,
            fill: tColor,
            'fill-opacity': isEnemyPhase ? 0.32 : 0.24,
            stroke: tColor,
            'stroke-width': 5,
            filter: 'url(#neonSoft)',
          }));
          tg.appendChild(svgEl('circle', {
            cx: tx + 50, cy: ty + 50, r: 40,
            fill: 'none',
            stroke: '#ffffff',
            'stroke-width': 2.2,
            opacity: '0.75',
          }));
          g.appendChild(tg);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 4. Tactile 3D-Elevated Pawn Tokens with Hop Arc & Hover Path Preview
  // --------------------------------------------------------------------------

  _renderPawns(state) {
    const layer = this.dom.pawnsLayer;
    const activePlayer = state.players[state.turnOrderIdx];
    const localCanClick = !state.online.enabled || (activePlayer && activePlayer.id === state.online.mySeatIndex);
    const validSet = new Set(localCanClick ? (state.validPawnIds || []) : []);
    const activeIds = new Set();

    const cellGroups = new Map();
    for (const pl of state.players) {
      for (const pw of pl.pawns) {
        activeIds.add(pw.id);
        const [r, c] = getPawnGridPos(pl.id, pw);
        const key = `${r.toFixed(1)},${c.toFixed(1)}`;
        if (!cellGroups.has(key)) cellGroups.set(key, []);
        cellGroups.get(key).push({ pl, pw, r, c });
      }
    }

    for (const [id, node] of this.pawnNodes.entries()) {
      if (!activeIds.has(id)) {
        node.remove();
        this.pawnNodes.delete(id);
        this.pawnLastPos.delete(id);
      }
    }

    const stackOffsets = [
      [0, 0],
      [-1.05, -0.8],
      [1.05, -0.8],
      [-1.05, 0.9],
      [1.05, 0.9],
      [0, -1.2],
    ];

    for (const group of cellGroups.values()) {
      const count = group.length;
      group.forEach(({ pl, pw, r, c }, idx) => {
        let node = this.pawnNodes.get(pw.id);
        if (!node) {
          node = document.createElement('button');
          node.type = 'button';
          node.className = 'pawn-token';
          node.dataset.pawnId = pw.id;
          node.innerHTML = `
            <span class="pawn-shadow"></span>
            <span class="pawn-dome"></span>
            <span class="pawn-ring"></span>
            <span class="pawn-core"></span>
            <span class="pawn-dizzy" aria-hidden="true"><i>★</i><i>✦</i><i>★</i></span>
            <span class="pawn-badge"></span>
          `;
          node.addEventListener('click', () => {
            this.clearMovePreview();
            this.cb.onPawnClick(pw.id);
          });
          node.addEventListener('pointerenter', () => this.showPawnPreview(pw.id));
          node.addEventListener('pointerleave', () => this.clearMovePreview());
          layer.appendChild(node);
          this.pawnNodes.set(pw.id, node);
        }

        node.style.setProperty('--hero-color', pl.hero.color);
        node.style.setProperty('--hero-glow', pl.hero.glow);
        const skinKey = `${this.cosmetics.pawn}:${pl.hero.key}:${pl.hero.color}`;
        if (node.dataset.skinKey !== skinKey) {
          node.querySelector('.pawn-core').innerHTML = renderPawnSkin(this.cosmetics.pawn, pl.hero);
          node.dataset.skinKey = skinKey;
        }

        const [ox, oy] = count === 1 ? [0, 0] : stackOffsets[(idx + 1) % stackOffsets.length];
        const leftPct = ((c + 0.5) / 15) * 100 + ox;
        const topPct = ((r + 0.5) / 15) * 100 + oy;

        // Trigger juicy micro-hop arc whenever tile coordinate changes!
        const posKey = `${r},${c}`;
        const prevPos = this.pawnLastPos.get(pw.id);
        if (prevPos && prevPos !== posKey) {
          node.classList.remove('hopping');
          void node.offsetWidth;
          node.classList.add('hopping');
        }
        this.pawnLastPos.set(pw.id, posKey);

        node.style.left = `${leftPct}%`;
        node.style.top = `${topPct}%`;

        const isSelectable = validSet.has(pw.id);
        const isCurrentOwner = activePlayer?.id === pl.id;
        const isBuffed = isCurrentOwner && (state.phaseDashActive || state.sparkySplitArmed) && pw.progress >= 0 && !pw.finished;
        node.classList.toggle('selectable', isSelectable);
        node.classList.toggle('is-ace', pw.isAce);
        node.classList.toggle('is-shielded', pw.shieldTurns > 0);
        node.classList.toggle('is-dizzy', (pw.dizzyTurns || 0) > 0);
        node.classList.toggle('is-buffed', isBuffed);
        node.classList.toggle('is-finished', pw.finished);
        node.classList.toggle('is-stacked', count > 1);
        node.classList.toggle('is-enemy-target', isSelectable && state.phase === 'SKILL_SELECT_ENEMY');
        node.style.zIndex = isSelectable ? '40' : isCurrentOwner ? '25' : '15';

        const pctDone = pw.progress < 0 ? 'Di Markas' : pw.finished ? 'Finis!' : `${Math.round((pw.progress / MAX_PROGRESS) * 100)}%`;
        node.title = `${pl.hero.name} #${pw.index + 1} (${pctDone})`;

        const badge = node.querySelector('.pawn-badge');
        const badgeKind = pw.shieldTurns > 0 ? 'shield' : pw.isAce ? 'star' : '';
        if (badge.dataset.kind !== badgeKind) {
          badge.dataset.kind = badgeKind;
          badge.innerHTML = badgeKind ? icon(badgeKind, { stroke: 2.6 }) : '';
          badge.style.display = badgeKind ? 'flex' : 'none';
        }
      });
    }
  }

  // --------------------------------------------------------------------------
  // 5. Player HUD Cards
  // --------------------------------------------------------------------------

  _renderPlayerCards(state, theme) {
    const activePlayer = state.players[state.turnOrderIdx];
    const leftIds = [0, 3];
    const rightIds = [1, 2];

    const buildCard = (heroId) => {
      const pl = state.players.find((p) => p.id === heroId);
      const hero = theme.heroes[heroId];
      if (!pl) {
        return `<div class="hero-card offline" style="--hero-color:${hero.color}">
          <div class="hero-card-head">
            <div class="hero-avatar">${hero.svgAvatar}</div>
            <div class="hero-meta">
              <div class="hero-name">${hero.name}</div>
              <div class="hero-sub">${icon('off')} SLOT KOSONG</div>
            </div>
          </div>
        </div>`;
      }

      const isActive = activePlayer && activePlayer.id === pl.id;
      const isMeOnline = state.online.enabled && pl.id === state.online.mySeatIndex;
      const localCanControl = pl.type === 'human' && (!state.online.enabled || isMeOnline);
      const energyPct = Math.min(100, Math.round((pl.energy / OVERDRIVE_COST) * 100));
      const canUseSkill = isActive && localCanControl && state.phase === 'WAITING_ROLL' && pl.energy >= OVERDRIVE_COST;

      const dots = Array.from({ length: state.pawnsPerPlayer }, (_, i) => {
        const done = i < pl.finishedCount;
        return `<span class="finish-dot ${done ? 'done' : ''}"></span>`;
      }).join('');

      const diceIcons = pl.diceInventory.length > 0
        ? pl.diceInventory.map((d) => `<span class="mini-dice-pill" style="--chip-color:${DICE_TYPES[d].color}" title="Dadu ${DICE_TYPES[d].name}">${icon(DICE_TYPES[d].icon)}</span>`).join('')
        : `<span class="mini-dice-empty">Hanya dadu standar</span>`;

      const statusChip =
        isActive && state.phaseDashActive ? `<span class="buff-chip">${icon('sparkle')} +3 PHASE</span>` :
        isActive && state.sparkySplitArmed ? `<span class="buff-chip">${icon('bolt')} SPLIT</span>` : '';

      // Player name is the card title; the hero name drops to the footer
      const playerName = pl.displayName ? escapeHTML(pl.displayName) : null;
      const roleLabel = pl.type === 'ai'
        ? `${icon('bot')}AI`
        : isMeOnline
          ? `${icon('star')}KAMU`
          : playerName
            ? `${icon('globe')}ONLINE`
            : `${icon('user')}P${hero.id + 1}`;

      return `
        <div class="hero-card ${isActive ? 'active' : ''}" data-hero-id="${hero.id}" style="--hero-color:${hero.color}; --hero-glow:${hero.glow}">
          <span class="hero-spine"></span>
          <div class="emote-anchor" id="emote-anchor-${hero.id}"></div>
          <div class="hero-card-head">
            <div class="hero-avatar">${hero.svgAvatar}</div>
            <div class="hero-meta">
              <div class="hero-name-row">
                <span class="hero-name" title="${playerName ? playerName + ' · ' + hero.name : hero.name}">
                  ${isActive ? '<span class="turn-beacon" aria-label="Giliran aktif"></span>' : ''}${playerName || hero.name}
                </span>
                <span class="role-pill ${pl.type}">${roleLabel}</span>
              </div>
              <div class="hero-stats-row">
                <span class="finish-dots" title="Pion finis">${dots}</span>
                <span class="ko-stat" title="Total KO">${icon('burst')}${pl.kills}</span>
                ${statusChip}
              </div>
            </div>
          </div>

          <div class="energy-wrap">
            <div class="energy-label">
              <span>${icon('bolt')}${hero.skillName}</span>
              <span>${energyPct}%</span>
            </div>
            <div class="energy-track">
              <div class="energy-fill ${energyPct >= 100 ? 'full' : ''}" style="width:${energyPct}%"></div>
            </div>
          </div>

          <div class="hero-card-foot">
            <div class="mini-dice-row">${diceIcons}</div>
            ${canUseSkill
              ? `<button type="button" class="skill-trigger-btn" data-action="skill">${icon('bolt')}AKTIFKAN</button>`
              : `<span class="skill-hint" title="${hero.skillDesc}">${energyPct >= 100 ? 'SKILL SIAP' : playerName ? hero.name : hero.title}</span>`
            }
          </div>
        </div>
      `;
    };

    this.dom.leftCards.innerHTML = leftIds.map(buildCard).join('');
    this.dom.rightCards.innerHTML = rightIds.map(buildCard).join('');

    document.querySelectorAll('[data-action="skill"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cb.onActivateSkill();
      });
    });

    document.querySelectorAll('.hero-card[data-hero-id]').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="skill"]')) return;
        this.cb.onHeroInspect?.(Number(card.dataset.heroId), card);
      });
    });

    if (activePlayer) {
      document.documentElement.style.setProperty('--active-accent', activePlayer.hero.color);
      document.documentElement.style.setProperty('--active-glow', activePlayer.hero.glow);
    }
  }

  // --------------------------------------------------------------------------
  // 6. Tactical Dice Dock & Roll Controls
  // --------------------------------------------------------------------------

  _renderControlDock(state) {
    const player = state.players[state.turnOrderIdx];
    if (!player) return;

    const isMyTurn = player.type === 'human' && (!state.online.enabled || player.id === state.online.mySeatIndex);
    const canRoll = isMyTurn && state.phase === 'WAITING_ROLL';
    const diceDef = DICE_TYPES[state.phase === 'ROLLING' || state.phase === 'SELECT_PAWN' ? state.rolledDiceId : state.selectedDice];

    let prompt = '';
    if (state.phase === 'WAITING_ROLL') {
      if (isMyTurn) {
        const allInBase = player.pawns.every((pw) => pw.finished || pw.progress === -1);
        prompt = allInBase ? 'Cari angka 6 — ketuk dadu untuk keluar!' : 'Pilih kartu dadu, lalu ketuk dadu!';
      } else if (player.type === 'ai') {
        prompt = 'AI sedang menyusun taktik...';
      } else {
        prompt = `Menunggu ${player.displayName || player.hero.name} melempar...`;
      }
    } else if (state.phase === 'ROLLING') {
      prompt = 'Dadu bergulir...';
    } else if (state.phase === 'SELECT_PAWN') {
      prompt = isMyTurn ? 'Ketuk pion yang menyala di papan!' : `Menunggu ${player.hero.name} memilih pion...`;
    } else if (state.phase === 'SKILL_SELECT_OWN') {
      prompt = isMyTurn ? 'Pilih pionmu untuk skill (atau Batal).' : `${player.hero.name} memilih target skill...`;
    } else if (state.phase === 'SKILL_SELECT_ENEMY') {
      prompt = isMyTurn ? 'Pilih pion LAWAN untuk ditukar!' : `${player.hero.name} membidik lawan...`;
    } else if (state.phase === 'ANIMATING') {
      prompt = 'Aksi berlangsung...';
    } else if (state.phase === 'GAME_OVER') {
      prompt = `${state.winner.hero.name} JUARA!`;
    }
    this.dom.turnPrompt.textContent = prompt;

    const inSkillSelect = isMyTurn && (
      state.phase === 'SKILL_SELECT_OWN' ||
      state.phase === 'SKILL_SELECT_ENEMY' ||
      (state.phase === 'WAITING_ROLL' && (state.sparkySplitArmed || state.phaseDashActive))
    );
    this.dom.cancelSkillBtn.style.display = inSkillSelect ? 'inline-flex' : 'none';

    // Dice cube — skin-aware face inside the clickable roll pad
    const cube = this.dom.diceCube;
    cube.dataset.skin = this.cosmetics.dice;
    cube.style.setProperty('--dice-color', diceDef.color);
    cube.classList.toggle('rolling', state.phase === 'ROLLING');
    cube.classList.toggle('special', diceDef.id !== 'normal');
    const faceVal = state.rolledValue;
    cube.className = cube.className.replace(/\bface-\S+/g, '').trim();
    if (faceVal === null || faceVal === undefined) {
      cube.innerHTML = `<span class="dice-big-icon">${icon(diceDef.icon, { stroke: 1.8 })}</span>`;
    } else if (faceVal === -2) {
      cube.innerHTML = `<span class="dice-big-val skull">${icon('skull')}</span><span class="dice-sub-val">-2</span>`;
    } else if (faceVal === 0 || faceVal > 6) {
      cube.innerHTML = `<span class="dice-big-val">${faceVal}</span>`;
    } else {
      cube.classList.add(`face-${faceVal}`);
      cube.innerHTML = pipGridHTML(faceVal);
    }

    this.dom.diceInfoLabel.innerHTML = `<strong style="color:${diceDef.color}">${icon(diceDef.icon)}${diceDef.name} <em>${diceDef.short}</em></strong><span>${diceDef.desc}</span>`;

    const loadoutOwner = state.online.enabled
      ? state.players.find((p) => p.id === state.online.mySeatIndex) || player
      : player;

    const counts = {};
    loadoutOwner.diceInventory.forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });
    const loadoutKeys = ['normal', ...Object.keys(counts)];
    this.dom.diceLoadout.innerHTML = loadoutKeys.map((id) => {
      const def = DICE_TYPES[id];
      const selected = (isMyTurn ? state.selectedDice : 'normal') === id;
      const countBadge = id === 'normal' ? '∞' : `×${counts[id]}`;
      return `
        <button type="button"
          class="dice-card ${selected ? 'selected' : ''}"
          data-dice-id="${id}"
          style="--chip-color:${def.color}"
          ${!canRoll ? 'disabled' : ''}
          title="${def.desc}">
          <span class="dice-card-bar"></span>
          <span class="dice-card-qty">${countBadge}</span>
          <span class="dice-card-ico">${icon(def.icon, { stroke: 2 })}</span>
          <span class="dice-card-name">${def.name}</span>
          <span class="dice-card-tag">${def.short}</span>
        </button>
      `;
    }).join('');

    this.dom.diceLoadout.querySelectorAll('.dice-card').forEach((btn) => {
      const id = btn.dataset.diceId;
      btn.addEventListener('click', () => {
        this.cb.onDiceTip?.(id, true);
        this.cb.onSelectDice(id);
      });
      btn.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'touch') this.cb.onDiceTip?.(id, false);
      });
      btn.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'touch') this.cb.onDiceTip?.(null, false);
      });
    });

    if (this.dom.dockPanel) {
      this.dom.dockPanel.style.setProperty('--hero-color', player.hero.color);
      this.dom.dockPanel.style.setProperty('--hero-glow', player.hero.glow);
      this.dom.dockPanel.classList.toggle('is-my-turn', canRoll);
      this.dom.dockPanel.classList.toggle('is-pawn-phase', isMyTurn && !canRoll);
      this.dom.dockPanel.classList.toggle('is-opponent-turn', !isMyTurn);
    }

    if (this.dom.rollHint) {
      this.dom.rollHint.style.display = canRoll && state.turnCount <= 3 ? '' : 'none';
    }

    this.dom.rollBtn.disabled = !canRoll;
    this.dom.rollBtn.classList.toggle('ready', canRoll);
    this.dom.rollBtn.style.setProperty('--hero-color', player.hero.color);
    this.dom.rollBtn.style.setProperty('--hero-glow', player.hero.glow);

    let rollText = 'TAP DADU';
    if (!canRoll) {
      if (state.phase === 'ROLLING') {
        rollText = 'GULIR...';
      } else if (state.phase === 'SELECT_PAWN' && isMyTurn) {
        rollText = 'PILIH PION';
      } else if (player.type === 'ai') {
        rollText = 'GILIRAN AI';
      } else if (!isMyTurn && state.online.enabled) {
        rollText = 'TUNGGU';
      } else {
        rollText = 'TUNGGU';
      }
    }
    this.dom.rollBtnText.textContent = rollText;

    const canSkill = canRoll && player.energy >= OVERDRIVE_COST;
    this.dom.dockSkillBtn.style.display = canSkill ? 'flex' : 'none';
    if (canSkill) {
      this.dom.dockSkillBtn.innerHTML = `${icon('bolt', { stroke: 2.4 })}<span>OVERDRIVE: ${player.hero.skillName.toUpperCase()}</span>`;
      this.dom.dockSkillBtn.style.setProperty('--hero-color', player.hero.color);
    }
  }

  // --------------------------------------------------------------------------
  // 7. Top Bar, Emotes & Victory Modal
  // --------------------------------------------------------------------------

  _renderTopBar(state) {
    this.dom.roundBadge.innerHTML = `${icon('flag')}<span>RONDE ${state.roundNumber}</span>`;
    this.dom.dirBadge.innerHTML = state.direction === 1
      ? `${icon('rotateCw')}<span>SEARAH</span>`
      : `${icon('rotateCcw')}<span>REVERSE!</span>`;
    this.dom.dirBadge.classList.toggle('reversed', state.direction === -1);

    if (this.dom.roomBadge) {
      if (state.online.enabled) {
        this.dom.roomBadge.style.display = 'inline-flex';
        this.dom.roomBadge.innerHTML = `${icon('globe')}<span>ROOM ${state.online.roomCode}</span>`;
      } else {
        this.dom.roomBadge.style.display = 'none';
      }
    }

    if (state.activeEvent) {
      const ev = state.activeEvent;
      this.dom.eventBanner.className = 'event-banner active';
      this.dom.eventBanner.style.setProperty('--event-color', ev.color);
      this.dom.eventBanner.innerHTML = `
        <span class="ev-icon">${icon(ev.icon)}</span>
        <span class="ev-title">${ev.name}</span>
        <span class="ev-desc">${ev.desc}</span>
        <span class="ev-timer">${ev.roundsLeft} ronde</span>
      `;
    } else {
      this.dom.eventBanner.className = 'event-banner idle';
      this.dom.eventBanner.style.removeProperty('--event-color');
      this.dom.eventBanner.innerHTML = `
        <span class="ev-icon">${icon('radar')}</span>
        <span class="ev-title">BOARD NORMAL</span>
        <span class="ev-desc">Event acak aktif dalam ${state.nextEventInRounds} ronde</span>
      `;
    }
  }

  showEmote(heroId, text) {
    const anchor = document.getElementById(`emote-anchor-${heroId}`);
    if (!anchor) return;
    const clean = stripEmoji(text);
    const theme = getTheme(this.lastState?.theme);
    const match = theme.emotes.find((e) => e.label === clean);
    anchor.innerHTML = '';
    const bubble = document.createElement('div');
    bubble.className = 'emote-bubble';
    bubble.innerHTML = `${icon(match?.icon || (clean.includes('GG') ? 'trophy' : 'chat'), { stroke: 2.4 })}<span></span>`;
    bubble.querySelector('span').textContent = clean;
    anchor.appendChild(bubble);
    setTimeout(() => {
      if (bubble.parentNode === anchor) bubble.remove();
    }, 2200);
  }

  _renderVictoryModal(state) {
    if (state.phase !== 'GAME_OVER' || !state.winner) {
      this.dom.victoryModal.classList.remove('open');
      return;
    }
    const w = state.winner;
    this.dom.victoryModal.classList.add('open');
    this.dom.victoryHeroAvatar.innerHTML = w.hero.svgAvatar;
    this.dom.victoryHeroAvatar.style.setProperty('--hero-color', w.hero.color);
    this.dom.victoryModal.querySelector('.victory-card')?.style.setProperty('--hero-color', w.hero.color);
    const tag = w.displayName ? ` (${w.displayName})` : '';
    this.dom.victoryTitle.textContent = `${w.hero.name}${tag} MENANG!`;
    this.dom.victoryTitle.style.color = w.hero.color;
    this.dom.victorySubtitle.textContent = `Menyelesaikan ${state.pawnsPerPlayer} pion dalam ${state.roundNumber} ronde dengan ${w.kills} KO.`;

    const ranked = [...state.players].sort((a, b) => {
      if (b.finishedCount !== a.finishedCount) return b.finishedCount - a.finishedCount;
      return b.kills - a.kills;
    });
    this.dom.victoryStats.innerHTML = ranked.map((pl, idx) => `
      <div class="rank-row ${idx === 0 ? 'first' : ''}" style="--hero-color:${pl.hero.color}">
        <span class="rank-num">${idx === 0 ? icon('crown', { stroke: 2.2 }) : '#' + (idx + 1)}</span>
        <span class="rank-avatar">${pl.hero.svgAvatar}</span>
        <span class="rank-name">${pl.hero.name}${pl.displayName ? ' · ' + escapeHTML(pl.displayName) : ''}</span>
        <span class="rank-val">${icon('flag')}${pl.finishedCount}/${state.pawnsPerPlayer}</span>
        <span class="rank-val">${icon('burst')}${pl.kills} KO</span>
      </div>
    `).join('');
  }
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
