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

const SVG_NS = 'http://www.w3.org/2000/svg';

export const ID_FLAG_SVG = `<svg class="flag-svg" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="8" rx="2" fill="#ff2a5f"/><rect y="8" width="24" height="8" rx="2" fill="#f8fafc"/></svg>`;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

export class GameRenderer {
  constructor(dom, callbacks) {
    this.dom = dom;
    this.cb = callbacks;
    this.pawnNodes = new Map();
    this.pawnLastPos = new Map();
    this.currentThemeId = null;
    this.lastState = null;
    this._buildStaticBoardSVG('nusantara');
    this._bindBoardTileHover();
  }

  // --------------------------------------------------------------------------
  // 1. Rich Architectural 15x15 Interactive SVG Map
  // --------------------------------------------------------------------------

  _buildStaticBoardSVG(themeId) {
    this.currentThemeId = themeId;
    const theme = getTheme(themeId);
    const heroes = theme.heroes;
    const svg = this.dom.boardSvg;
    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 1500 1500');

    const defs = svgEl('defs');
    defs.innerHTML = `
      <radialGradient id="coreGrad" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="${theme.batikPattern ? '#3c2161' : '#253559'}"/>
        <stop offset="100%" stop-color="${theme.boardBg}"/>
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
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <pattern id="batikKawung" width="84" height="84" patternUnits="userSpaceOnUse">
        <circle cx="42" cy="42" r="25" fill="none" stroke="#ffb703" stroke-width="1.3" opacity="0.16"/>
        <circle cx="0" cy="0" r="25" fill="none" stroke="#ffb703" stroke-width="1.3" opacity="0.16"/>
        <circle cx="84" cy="0" r="25" fill="none" stroke="#ffb703" stroke-width="1.3" opacity="0.16"/>
        <circle cx="0" cy="84" r="25" fill="none" stroke="#ffb703" stroke-width="1.3" opacity="0.16"/>
        <circle cx="84" cy="84" r="25" fill="none" stroke="#ffb703" stroke-width="1.3" opacity="0.16"/>
        <polygon points="42,27 57,42 42,57 27,42" fill="none" stroke="#00f5d4" stroke-width="1.1" opacity="0.14"/>
      </pattern>
      <pattern id="neoGrid" width="75" height="75" patternUnits="userSpaceOnUse">
        <path d="M 75 0 L 0 0 0 75" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.09"/>
        <circle cx="0" cy="0" r="2.2" fill="#00f0ff" opacity="0.22"/>
      </pattern>
    `;
    svg.appendChild(defs);

    // Outer metallic board frame
    svg.appendChild(svgEl('rect', {
      x: 4, y: 4, width: 1492, height: 1492, rx: 36,
      fill: theme.boardBg,
      stroke: 'url(#cyberBorder)',
      'stroke-width': 6,
    }));

    // Background motif overlay (Batik Kawung vs Cyber Circuit Grid)
    svg.appendChild(svgEl('rect', {
      x: 10, y: 10, width: 1480, height: 1480, rx: 32,
      fill: theme.batikPattern ? 'url(#batikKawung)' : 'url(#neoGrid)',
    }));

    // Subtle track glowing underlay ribbon connecting the cross arms
    svg.appendChild(svgEl('rect', { x: 598, y: 8, width: 304, height: 1484, rx: 14, fill: 'rgba(0,0,0,0.34)' }));
    svg.appendChild(svgEl('rect', { x: 8, y: 598, width: 1484, height: 304, rx: 14, fill: 'rgba(0,0,0,0.34)' }));

    // 52 Main Track Tiles with 3D bevel + interactive hover metadata
    const startArrowMeta = {
      0: { hero: heroes[0], arrow: '▶', hint: `🚀 START ${heroes[0].name} — Petak aman & titik masuk pion saat dapat dadu 6!` },
      13: { hero: heroes[1], arrow: '▼', hint: `🚀 START ${heroes[1].name} — Petak aman & titik masuk pion saat dapat dadu 6!` },
      26: { hero: heroes[2], arrow: '◀', hint: `🚀 START ${heroes[2].name} — Petak aman & titik masuk pion saat dapat dadu 6!` },
      39: { hero: heroes[3], arrow: '▲', hint: `🚀 START ${heroes[3].name} — Petak aman & titik masuk pion saat dapat dadu 6!` },
    };

    const flowChevrons = {
      4: '›', 10: '›', 17: '⌄', 23: '⌄', 30: '‹', 36: '‹', 43: '⌃', 49: '⌃',
    };

    MAIN_TRACK.forEach(([r, c], idx) => {
      const x = c * 100;
      const y = r * 100;
      const startInfo = startArrowMeta[idx];
      const isStar = STAR_SAFE_INDICES.includes(idx);

      let fill = theme.tileBg;
      let stroke = theme.tileStroke;
      let tileHint = `Petak jalur #${idx + 1} — Hati-hati bisa di-KO lawan di sini!`;

      if (startInfo) {
        fill = startInfo.hero.colorDark;
        stroke = startInfo.hero.color;
        tileHint = startInfo.hint;
      } else if (isStar) {
        fill = theme.starBg;
        stroke = theme.starStroke;
        tileHint = '★ SAFE ZONE — Pion aman dari KO lawan (kecuali saat event 🌑 Blackout Mode)!';
      }

      const tileGroup = svgEl('g', {
        class: 'board-tile-group',
        'data-track-idx': idx,
        'data-hint': tileHint,
      });

      // Base tile
      tileGroup.appendChild(svgEl('rect', {
        x: x + 5, y: y + 5, width: 90, height: 90, rx: 16,
        fill,
        stroke,
        'stroke-width': startInfo ? 3.5 : 2,
        class: 'tile-rect',
      }));
      // 3D glass bevel overlay
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
        const txt = svgEl('text', {
          x: x + 50, y: y + 63,
          'text-anchor': 'middle',
          fill: startInfo.hero.color,
          'font-size': '38',
          'font-weight': '800',
        });
        txt.textContent = startInfo.arrow;
        tileGroup.appendChild(txt);
      } else if (isStar) {
        tileGroup.appendChild(svgEl('circle', {
          cx: x + 50, cy: y + 50, r: 32,
          fill: 'rgba(255, 183, 3, 0.08)',
          stroke: theme.batikPattern ? '#ffb703' : '#64748b',
          'stroke-width': 1.5,
          'stroke-dasharray': '5 4',
        }));
        const star = svgEl('text', {
          x: x + 50, y: y + 66,
          'text-anchor': 'middle',
          fill: theme.batikPattern ? '#ffb703' : '#cbd5e1',
          'font-size': '44',
          class: 'board-star-icon',
          'data-track-idx': idx,
        });
        star.textContent = '★';
        tileGroup.appendChild(star);
      } else if (flowChevrons[idx]) {
        const ch = svgEl('text', {
          x: x + 50, y: y + 62,
          'text-anchor': 'middle',
          fill: 'rgba(148, 163, 184, 0.25)',
          'font-size': '34',
          'font-weight': '700',
        });
        ch.textContent = flowChevrons[idx];
        tileGroup.appendChild(ch);
      }

      svg.appendChild(tileGroup);
    });

    // 4 Private Home Stretches (Glowing Energy Conduits)
    heroes.forEach((hero) => {
      const tiles = HOME_STRETCHES[hero.id].slice(0, 5);
      const laneGroup = svgEl('g', {
        class: 'hero-home-lane',
        'data-hero-id': hero.id,
      });

      // Glowing energy line running through the 5 home stretch tiles
      const [r0, c0] = tiles[0];
      const [r4, c4] = tiles[4];
      laneGroup.appendChild(svgEl('line', {
        x1: c0 * 100 + 50, y1: r0 * 100 + 50,
        x2: c4 * 100 + 50, y2: r4 * 100 + 50,
        stroke: hero.color,
        'stroke-width': 8,
        'stroke-dasharray': '14 10',
        opacity: '0.45',
        class: 'svg-dash-flow',
      }));

      tiles.forEach(([r, c], stepIdx) => {
        const x = c * 100;
        const y = r * 100;
        const gTile = svgEl('g', {
          class: 'board-tile-group',
          'data-hint': `🏁 JALUR FINIS ${hero.name} (${stepIdx + 1}/5) — Aman total dari semua lawan!`,
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

    // 4 Corner Hero Sanctuary Districts (Interactive Active-Turn Spotlight!)
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
        'data-hint': `${hero.emoji} MARKAS ${hero.name} — Skill: ${hero.skillName} • Finisher: ${hero.koText}`,
      });

      yardG.appendChild(svgEl('rect', {
        x: x + 16, y: y + 16, width: 568, height: 568, rx: 38,
        fill: theme.yardBg,
        stroke: hero.color,
        'stroke-width': 5,
        class: 'yard-frame',
      }));

      if (theme.batikPattern) {
        yardG.appendChild(svgEl('rect', {
          x: x + 16, y: y + 16, width: 568, height: 568, rx: 38,
          fill: 'url(#batikKawung)',
          opacity: '0.85',
        }));
      }

      // Inner glowing tech chamber
      yardG.appendChild(svgEl('rect', {
        x: x + 48, y: y + 48, width: 504, height: 504, rx: 30,
        fill: hero.colorDark,
        opacity: '0.34',
        stroke: hero.color,
        'stroke-width': 2.2,
        'stroke-dasharray': theme.batikPattern ? '20 8 4 8' : '14 8',
      }));

      // Center watermark emblem inside yard
      const wm = svgEl('text', {
        x: x + 300, y: y + 328,
        'text-anchor': 'middle',
        'font-size': '118',
        opacity: '0.13',
        'pointer-events': 'none',
      });
      wm.textContent = hero.emoji;
      yardG.appendChild(wm);

      // Corner bracket accents
      const bLen = 36;
      const bx1 = x + 32, by1 = y + 32, bx2 = x + 568, by2 = y + 568;
      const brackets = [
        `M ${bx1} ${by1 + bLen} L ${bx1} ${by1} L ${bx1 + bLen} ${by1}`,
        `M ${bx2 - bLen} ${by1} L ${bx2} ${by1} L ${bx2} ${by1 + bLen}`,
        `M ${bx1} ${by2 - bLen} L ${bx1} ${by2} L ${bx1 + bLen} ${by2}`,
        `M ${bx2 - bLen} ${by2} L ${bx2} ${by2} L ${bx2} ${by2 - bLen}`,
      ];
      brackets.forEach((d) => {
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
        'letter-spacing': '3',
      });
      lbl.textContent = `${hero.emoji} ${hero.name}`;
      yardG.appendChild(lbl);

      // 4 Futuristic Docking Pads
      BASE_SLOTS[hero.id].forEach(([r, c]) => {
        const cx = (c + 0.5) * 100;
        const cy = (r + 0.5) * 100;
        yardG.appendChild(svgEl('circle', {
          cx, cy, r: 60,
          fill: 'rgba(6, 9, 18, 0.85)',
          stroke: hero.color,
          'stroke-width': 3.5,
        }));
        yardG.appendChild(svgEl('circle', {
          cx, cy, r: 44,
          fill: 'none',
          stroke: theme.batikPattern ? '#ffb703' : hero.color,
          'stroke-width': 1.8,
          'stroke-dasharray': '7 6',
          opacity: '0.6',
        }));
        yardG.appendChild(svgEl('circle', {
          cx, cy, r: 10,
          fill: hero.color,
          opacity: '0.28',
        }));
      });

      svg.appendChild(yardG);
    });

    // Center 3x3 Animated Cyber Core (Gunungan / Crown)
    const centerGroup = svgEl('g', {
      class: 'board-tile-group',
      'data-hint': '🏆 ZONA FINIS — Masukkan semua pion ke tengah dengan angka tepat untuk MENANG!',
    });
    const triangles = [
      { hero: heroes[0], pts: '600,600 750,750 600,900' },
      { hero: heroes[1], pts: '600,600 900,600 750,750' },
      { hero: heroes[2], pts: '900,600 900,900 750,750' },
      { hero: heroes[3], pts: '600,900 900,900 750,750' },
    ];
    triangles.forEach(({ hero, pts }) => {
      centerGroup.appendChild(svgEl('polygon', {
        points: pts,
        fill: hero.colorDark,
        stroke: hero.color,
        'stroke-width': 4,
      }));
    });

    // Rotating holographic outer ring
    centerGroup.appendChild(svgEl('circle', {
      cx: 750, cy: 750, r: 88,
      fill: 'none',
      stroke: theme.batikPattern ? '#ffb703' : '#00f0ff',
      'stroke-width': 3,
      'stroke-dasharray': '16 12',
      opacity: '0.75',
      class: 'svg-spin-center',
    }));

    if (theme.batikPattern) {
      centerGroup.appendChild(svgEl('polygon', {
        points: '750,654 836,750 750,846 664,750',
        fill: 'url(#coreGrad)',
        stroke: '#ffb703',
        'stroke-width': 4.5,
        filter: 'url(#neonSoft)',
      }));
    } else {
      centerGroup.appendChild(svgEl('circle', {
        cx: 750, cy: 750, r: 62,
        fill: 'url(#coreGrad)',
        stroke: '#ffffff',
        'stroke-width': 4,
        filter: 'url(#neonSoft)',
      }));
    }

    const coreTxt = svgEl('text', {
      x: 750, y: 766,
      'text-anchor': 'middle',
      fill: '#ffb703',
      'font-size': '46',
    });
    coreTxt.textContent = theme.centerEmblem;
    centerGroup.appendChild(coreTxt);
    svg.appendChild(centerGroup);

    // Dynamic overlays (Mystery boxes, Portals, Turbo, Slime)
    this.dynamicLayer = svgEl('g', { id: 'board-dynamic-layer' });
    svg.appendChild(this.dynamicLayer);

    // Interactive Live Path Preview Layer (always on top of tiles!)
    this.previewLayer = svgEl('g', { id: 'board-preview-layer', 'pointer-events': 'none' });
    svg.appendChild(this.previewLayer);
  }

  _bindBoardTileHover() {
    this.dom.boardSvg.addEventListener('pointerover', (e) => {
      const target = e.target.closest('[data-hint]');
      if (!target || !this.dom.tileInspector) return;
      this.dom.tileInspector.textContent = target.getAttribute('data-hint');
      this.dom.tileInspector.classList.add('active');
    });
    this.dom.boardSvg.addEventListener('pointerleave', () => {
      if (!this.dom.tileInspector) return;
      this.dom.tileInspector.classList.remove('active');
      this.dom.tileInspector.textContent = '💡 Arahkan kursor ke petak peta atau pion menyala untuk preview jalur & info!';
    });
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
          'stroke-width': 10,
          'stroke-dasharray': '16 10',
          filter: 'url(#neonSoft)',
          class: 'svg-dash-flow',
        }));
        this._drawPreviewReticle(x2, y2, activePlayer.hero.color, '⇄ SWAP');
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
      'stroke-width': 11,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-dasharray': '18 12',
      opacity: '0.92',
      filter: 'url(#neonSoft)',
      class: 'svg-dash-flow',
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

    let label = '🎯 TARGET';
    let badgeColor = activePlayer.hero.color;
    if (destProg === MAX_PROGRESS) {
      label = '🏁 FINIS!';
      badgeColor = '#ffb703';
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
        label = hasShield && !state.phaseDashActive ? '🛡️ BLOCK!' : '💥 KO!';
        badgeColor = hasShield && !state.phaseDashActive ? '#38bdf8' : '#ff2a5f';
      } else if (state.mysteryActive.has(gIdx)) {
        label = '🎁 LOOT!';
        badgeColor = '#ffb703';
      } else if (state.activeEvent?.id === 'portal' && PORTAL_PAIR.includes(gIdx)) {
        label = '🌀 WARP!';
        badgeColor = '#00f5d4';
      } else if (state.activeEvent?.id === 'turbo' && TURBO_TILES.includes(gIdx)) {
        label = '⚡ +2 TURBO';
        badgeColor = '#ffb703';
      } else if (isSafe) {
        label = '★ AMAN';
        badgeColor = '#4ade80';
      }
    }

    this._drawPreviewReticle(dx, dy, badgeColor, label);
    if (this.dom.tileInspector) {
      this.dom.tileInspector.textContent = `🎯 Preview: ${activePlayer.hero.name} → ${label} (${steps > 0 ? '+' + steps : steps} langkah)`;
      this.dom.tileInspector.classList.add('active');
    }
  }

  _drawPreviewReticle(x, y, color, text) {
    this.previewLayer.appendChild(svgEl('circle', {
      cx: x, cy: y, r: 44,
      fill: 'rgba(0,0,0,0.3)',
      stroke: color,
      'stroke-width': 6,
      filter: 'url(#neonSoft)',
    }));
    const pillW = Math.max(126, text.length * 16);
    const py = y > 160 ? y - 72 : y + 72;
    this.previewLayer.appendChild(svgEl('rect', {
      x: x - pillW / 2, y: py - 24, width: pillW, height: 44, rx: 14,
      fill: '#070b16',
      stroke: color,
      'stroke-width': 3.5,
    }));
    const txt = svgEl('text', {
      x, y: py + 7,
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
    if (this.currentThemeId !== theme.id) {
      this._buildStaticBoardSVG(theme.id);
    }
    this.dom.brandLogo.textContent = theme.brandTitle;
    this.dom.brandPill.textContent = theme.brandPill;
    if (this.dom.themeBtn) {
      this.dom.themeBtn.innerHTML = theme.id === 'nusantara'
        ? `${ID_FLAG_SVG} <span>Nusantara</span>`
        : `🌃 <span>Neo-Arcade</span>`;
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
    this._renderDynamicBoardOverlays(state, theme);
    this._renderPawns(state);
    this._renderPlayerCards(state, theme);
    this._renderControlDock(state);
    this._renderTopBar(state);
    this._renderVictoryModal(state);
  }

  _renderDynamicBoardOverlays(state, theme) {
    const g = this.dynamicLayer;
    g.innerHTML = '';

    const isBlackout = state.activeEvent?.id === 'blackout';
    this.dom.boardSvg.querySelectorAll('.board-star-icon').forEach((el) => {
      el.setAttribute('fill', isBlackout ? '#ff2a5f' : theme.batikPattern ? '#ffb703' : '#cbd5e1');
      el.setAttribute('opacity', isBlackout ? '0.45' : '0.95');
      el.textContent = isBlackout ? '✕' : '★';
    });

    if (state.activeEvent?.id === 'turbo') {
      TURBO_TILES.forEach((idx) => {
        const [r, c] = MAIN_TRACK[idx];
        const x = c * 100;
        const y = r * 100;
        const tg = svgEl('g', {
          class: 'board-tile-group',
          'data-hint': '⚡ TURBO LANE — Mendarat di petak emas ini langsung melesat +2 langkah ekstra!',
        });
        tg.appendChild(svgEl('rect', {
          x: x + 6, y: y + 6, width: 88, height: 88, rx: 16,
          fill: 'rgba(255, 183, 3, 0.24)',
          stroke: '#ffb703',
          'stroke-width': 4.5,
        }));
        const t = svgEl('text', {
          x: x + 50, y: y + 66,
          'text-anchor': 'middle',
          fill: '#ffb703',
          'font-size': '44',
        });
        t.textContent = '⚡';
        tg.appendChild(t);
        g.appendChild(tg);
      });
    }

    if (state.activeEvent?.id === 'portal') {
      PORTAL_PAIR.forEach((idx) => {
        const [r, c] = MAIN_TRACK[idx];
        const cx = c * 100 + 50;
        const cy = r * 100 + 50;
        const pg = svgEl('g', {
          class: 'board-tile-group',
          'data-hint': '🌀 PORTAL SHIFT — Mendarat di wormhole ini langsung teleport ke portal seberang papan!',
        });
        pg.appendChild(svgEl('circle', {
          cx, cy, r: 42,
          fill: 'rgba(0, 245, 212, 0.24)',
          stroke: '#00f5d4',
          'stroke-width': 5,
          'stroke-dasharray': '14 8',
        }));
        const t = svgEl('text', {
          x: cx, y: cy + 16,
          'text-anchor': 'middle',
          fill: '#00f5d4',
          'font-size': '44',
        });
        t.textContent = '🌀';
        pg.appendChild(t);
        g.appendChild(pg);
      });
    }

    state.mysteryActive.forEach((idx) => {
      const [r, c] = MAIN_TRACK[idx];
      const cx = c * 100 + 50;
      const cy = r * 100 + 50;
      const mg = svgEl('g', {
        class: 'board-tile-group',
        'data-hint': '🎁 MYSTERY BOX — Berisi Dadu Spesial, 🔄 Reverse Uno, ⚡ EMP Shock, atau +35 Energi!',
      });
      mg.appendChild(svgEl('rect', {
        x: c * 100 + 14, y: r * 100 + 14, width: 72, height: 72, rx: 16,
        fill: 'rgba(255, 183, 3, 0.16)',
        stroke: '#ffb703',
        'stroke-width': 3,
        'stroke-dasharray': '7 4',
      }));
      const txt = svgEl('text', {
        x: cx, y: cy + 16,
        'text-anchor': 'middle',
        'font-size': '42',
      });
      txt.textContent = '🎁';
      mg.appendChild(txt);
      g.appendChild(mg);
    });

    for (const [idxStr] of Object.entries(state.slimeTraps)) {
      const idx = Number(idxStr);
      const [r, c] = MAIN_TRACK[idx];
      const cx = c * 100 + 50;
      const cy = r * 100 + 50;
      const sg = svgEl('g', {
        class: 'board-tile-group',
        'data-hint': '🟢 SLIME TRAP — Lawan yang melintas langsung lengket & berhenti di petak ini!',
      });
      sg.appendChild(svgEl('circle', {
        cx, cy, r: 38,
        fill: 'rgba(74, 222, 128, 0.36)',
        stroke: '#4ade80',
        'stroke-width': 4,
      }));
      const txt = svgEl('text', {
        x: cx, y: cy + 14,
        'text-anchor': 'middle',
        'font-size': '36',
      });
      txt.textContent = '🟢';
      sg.appendChild(txt);
      g.appendChild(sg);
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
            <span class="pawn-ring"></span>
            <span class="pawn-core"></span>
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
        node.querySelector('.pawn-core').textContent = pl.hero.emoji;

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
        node.classList.toggle('selectable', isSelectable);
        node.classList.toggle('is-ace', pw.isAce);
        node.classList.toggle('is-shielded', pw.shieldTurns > 0);
        node.classList.toggle('is-finished', pw.finished);
        node.classList.toggle('is-stacked', count > 1);
        node.classList.toggle('is-enemy-target', isSelectable && state.phase === 'SKILL_SELECT_ENEMY');
        node.style.zIndex = isSelectable ? '40' : isCurrentOwner ? '25' : '15';

        const pctDone = pw.progress < 0 ? 'Di Markas' : pw.finished ? 'Finis!' : `${Math.round((pw.progress / MAX_PROGRESS) * 100)}%`;
        node.title = `${pl.hero.name} #${pw.index + 1} (${pctDone})`;

        const badge = node.querySelector('.pawn-badge');
        if (pw.shieldTurns > 0) {
          badge.textContent = '🛡️';
          badge.style.display = 'flex';
        } else if (pw.isAce) {
          badge.textContent = '⭐';
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
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
              <div class="hero-sub">OFFLINE</div>
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
        ? pl.diceInventory.map((d) => `<span class="mini-dice-pill" title="${DICE_TYPES[d].name}">${DICE_TYPES[d].icon}</span>`).join('')
        : `<span class="mini-dice-empty">Standar</span>`;

      const statusChip =
        isActive && state.phaseDashActive ? `<span class="buff-chip">${hero.emoji} +3 PHASE</span>` :
        isActive && state.sparkySplitArmed ? `<span class="buff-chip">⚡ SPLIT READY</span>` : '';

      const roleLabel = pl.type === 'ai'
        ? '🤖 AI'
        : isMeOnline
          ? `⭐ ${pl.displayName || 'KAMU'}`
          : `👤 ${pl.displayName || 'P' + (hero.id + 1)}`;

      return `
        <div class="hero-card ${isActive ? 'active' : ''}" data-hero-id="${hero.id}" style="--hero-color:${hero.color}; --hero-glow:${hero.glow}">
          <div class="emote-anchor" id="emote-anchor-${hero.id}"></div>
          <div class="hero-card-head">
            <div class="hero-avatar">${hero.svgAvatar}</div>
            <div class="hero-meta">
              <div class="hero-name-row">
                <span class="hero-name">${hero.name}</span>
                <span class="role-pill ${pl.type}">${roleLabel}</span>
              </div>
              <div class="hero-stats-row">
                <span class="finish-dots" title="Pion Finis">${dots}</span>
                <span class="ko-stat" title="Total KO">💥 ${pl.kills}</span>
                ${statusChip}
              </div>
            </div>
          </div>

          <div class="energy-wrap">
            <div class="energy-label">
              <span>⚡ ${hero.skillName}</span>
              <span>${energyPct}%</span>
            </div>
            <div class="energy-track">
              <div class="energy-fill ${energyPct >= 100 ? 'full' : ''}" style="width:${energyPct}%"></div>
            </div>
          </div>

          <div class="hero-card-foot">
            <div class="mini-dice-row">${diceIcons}</div>
            ${canUseSkill
              ? `<button class="skill-trigger-btn" data-action="skill">⚡ AKTIFKAN</button>`
              : `<span class="skill-hint" title="${hero.skillDesc}">${energyPct >= 100 ? 'READY!' : hero.title}</span>`
            }
          </div>
        </div>
      `;
    };

    this.dom.leftCards.innerHTML = leftIds.map(buildCard).join('');
    this.dom.rightCards.innerHTML = rightIds.map(buildCard).join('');

    document.querySelectorAll('[data-action="skill"]').forEach((btn) => {
      btn.addEventListener('click', () => this.cb.onActivateSkill());
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

    const ownerTag = player.displayName ? ` (${player.displayName})` : '';
    this.dom.turnHeroName.textContent = `${player.hero.emoji} ${player.hero.name}${ownerTag}`;
    this.dom.turnHeroName.style.color = player.hero.color;

    let prompt = '';
    if (state.phase === 'WAITING_ROLL') {
      if (isMyTurn) {
        const allInBase = player.pawns.every((pw) => pw.finished || pw.progress === -1);
        prompt = allInBase ? 'Cari angka 6 untuk keluar dari markas!' : 'Pilih dadu lalu tahan/klik LEMPAR!';
      } else if (player.type === 'ai') {
        prompt = 'AI sedang menyusun taktik...';
      } else {
        prompt = `Menunggu ${player.displayName || player.hero.name} melempar dadu...`;
      }
    } else if (state.phase === 'ROLLING') {
      prompt = 'Melempar dadu...';
    } else if (state.phase === 'SELECT_PAWN') {
      prompt = isMyTurn ? 'Arahkan ke pion menyala untuk preview jalur, lalu klik!' : `Menunggu ${player.hero.name} memilih pion...`;
    } else if (state.phase === 'SKILL_SELECT_OWN') {
      prompt = isMyTurn ? 'Klik pionmu yang menyala untuk skill! (atau Batal)' : `${player.hero.name} memilih target skill...`;
    } else if (state.phase === 'SKILL_SELECT_ENEMY') {
      prompt = isMyTurn ? 'Hover pion LAWAN untuk lihat jalur tukar, lalu klik!' : `${player.hero.name} membidik lawan...`;
    } else if (state.phase === 'ANIMATING') {
      prompt = 'Aksi berlangsung...';
    } else if (state.phase === 'GAME_OVER') {
      prompt = `🏆 ${state.winner.hero.name} JUARA!`;
    }
    this.dom.turnPrompt.textContent = prompt;

    const inSkillSelect = isMyTurn && (state.phase === 'SKILL_SELECT_OWN' || state.phase === 'SKILL_SELECT_ENEMY');
    this.dom.cancelSkillBtn.style.display = inSkillSelect ? 'inline-flex' : 'none';

    const cube = this.dom.diceCube;
    cube.style.setProperty('--dice-color', diceDef.color);
    cube.classList.toggle('rolling', state.phase === 'ROLLING');
    const faceVal = state.rolledValue;
    if (faceVal === null || faceVal === undefined) {
      cube.innerHTML = `<span class="dice-big-icon">${diceDef.icon}</span>`;
    } else if (faceVal === -2) {
      cube.innerHTML = `<span class="dice-big-val skull">💀</span><span class="dice-sub-val">-2</span>`;
    } else if (faceVal === 0 || faceVal > 6) {
      cube.innerHTML = `<span class="dice-big-val">${faceVal}</span>`;
    } else {
      cube.innerHTML = this._renderDicePips(faceVal);
    }

    this.dom.diceInfoLabel.innerHTML = `<strong style="color:${diceDef.color}">${diceDef.icon} ${diceDef.name}</strong> — ${diceDef.desc}`;

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
          class="dice-chip ${selected ? 'selected' : ''}"
          data-dice-id="${id}"
          style="--chip-color:${def.color}"
          ${!canRoll ? 'disabled' : ''}
          title="${def.desc}">
          <span class="chip-icon">${def.icon}</span>
          <span class="chip-name">${def.name}</span>
          <span class="chip-qty">${countBadge}</span>
        </button>
      `;
    }).join('');

    this.dom.diceLoadout.querySelectorAll('.dice-chip').forEach((btn) => {
      btn.addEventListener('click', () => this.cb.onSelectDice(btn.dataset.diceId));
    });

    this.dom.rollBtn.disabled = !canRoll;
    this.dom.rollBtn.style.setProperty('--hero-color', player.hero.color);
    this.dom.rollBtnText.textContent = canRoll
      ? '🎲 LEMPAR DADU'
      : state.phase === 'SELECT_PAWN' && isMyTurn
        ? '👆 PILIH PION'
        : player.type === 'ai'
          ? '🤖 GILIRAN AI'
          : !isMyTurn && state.online.enabled
            ? `⏳ GILIRAN ${player.displayName || player.hero.name}`
            : '⏳ TUNGGU...';

    const canSkill = canRoll && player.energy >= OVERDRIVE_COST;
    this.dom.dockSkillBtn.style.display = canSkill ? 'flex' : 'none';
    if (canSkill) {
      this.dom.dockSkillBtn.innerHTML = `⚡ OVERDRIVE: ${player.hero.skillName.toUpperCase()}`;
      this.dom.dockSkillBtn.style.setProperty('--hero-color', player.hero.color);
    }
  }

  _renderDicePips(n) {
    const layouts = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };
    const active = new Set(layouts[n] || [4]);
    let html = '<div class="dice-pip-grid">';
    for (let i = 0; i < 9; i++) {
      html += `<span class="pip ${active.has(i) ? 'on' : ''}"></span>`;
    }
    html += '</div>';
    return html;
  }

  // --------------------------------------------------------------------------
  // 7. Top Bar, Emotes & Victory Modal
  // --------------------------------------------------------------------------

  _renderTopBar(state) {
    this.dom.roundBadge.textContent = `RONDE ${state.roundNumber}`;
    this.dom.dirBadge.textContent = state.direction === 1 ? '↻ SEARAH' : '↺ REVERSE UNO!';
    this.dom.dirBadge.classList.toggle('reversed', state.direction === -1);

    if (this.dom.roomBadge) {
      if (state.online.enabled) {
        this.dom.roomBadge.style.display = 'inline-flex';
        this.dom.roomBadge.textContent = `🌐 ROOM ${state.online.roomCode}`;
      } else {
        this.dom.roomBadge.style.display = 'none';
      }
    }

    if (state.activeEvent) {
      const ev = state.activeEvent;
      this.dom.eventBanner.className = 'event-banner active';
      this.dom.eventBanner.style.setProperty('--event-color', ev.color);
      this.dom.eventBanner.innerHTML = `
        <span class="ev-icon">${ev.icon}</span>
        <span class="ev-title">${ev.name}</span>
        <span class="ev-desc">${ev.desc}</span>
        <span class="ev-timer">${ev.roundsLeft} ronde</span>
      `;
    } else {
      this.dom.eventBanner.className = 'event-banner idle';
      this.dom.eventBanner.style.removeProperty('--event-color');
      this.dom.eventBanner.innerHTML = `
        <span class="ev-icon">🛰️</span>
        <span class="ev-title">BOARD NORMAL</span>
        <span class="ev-desc">Wajib dadu 6 keluar markas • Event acak dalam ${state.nextEventInRounds} ronde</span>
      `;
    }
  }

  showEmote(heroId, text) {
    const anchor = document.getElementById(`emote-anchor-${heroId}`);
    if (!anchor) return;
    anchor.innerHTML = '';
    const bubble = document.createElement('div');
    bubble.className = 'emote-bubble';
    bubble.textContent = text;
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
    const tag = w.displayName ? ` (${w.displayName})` : '';
    this.dom.victoryTitle.textContent = `${w.hero.emoji} ${w.hero.name}${tag} MENANG!`;
    this.dom.victoryTitle.style.color = w.hero.color;
    this.dom.victorySubtitle.textContent = `Menyelesaikan ${state.pawnsPerPlayer} pion dalam ${state.roundNumber} ronde dengan ${w.kills} KO!`;

    const ranked = [...state.players].sort((a, b) => {
      if (b.finishedCount !== a.finishedCount) return b.finishedCount - a.finishedCount;
      return b.kills - a.kills;
    });
    this.dom.victoryStats.innerHTML = ranked.map((pl, idx) => `
      <div class="rank-row" style="--hero-color:${pl.hero.color}">
        <span class="rank-num">#${idx + 1}</span>
        <span class="rank-name">${pl.hero.emoji} ${pl.hero.name}${pl.displayName ? ' · ' + pl.displayName : ''}</span>
        <span class="rank-val">🏁 ${pl.finishedCount}/${state.pawnsPerPlayer}</span>
        <span class="rank-val">💥 ${pl.kills} KO</span>
      </div>
    `).join('');
  }
}
