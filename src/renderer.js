// ============================================================================
// LUDO OVERDRIVE — Theme-Aware SVG Board, Animated Tokens, HUD & Modals Renderer
// ============================================================================

import {
  getTheme,
  MAIN_TRACK,
  HOME_STRETCHES,
  BASE_SLOTS,
  STAR_SAFE_INDICES,
  PORTAL_PAIR,
  TURBO_TILES,
  DICE_TYPES,
  OVERDRIVE_COST,
} from './constants.js';
import { getPawnGridPos } from './engine.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

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
    this.currentThemeId = null;
    this._buildStaticBoardSVG('nusantara');
  }

  // --------------------------------------------------------------------------
  // 1. Static 15x15 Theme-Aware SVG Board (Nusantara Cyberpunk vs Neo-Arcade)
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
      <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${theme.batikPattern ? '#2d1c47' : '#1e293b'}"/>
        <stop offset="100%" stop-color="${theme.boardBg}"/>
      </radialGradient>
      <filter id="neonSoft" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="5" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <pattern id="batikKawung" width="80" height="80" patternUnits="userSpaceOnUse">
        <circle cx="40" cy="40" r="24" fill="none" stroke="#ffb703" stroke-width="1.2" opacity="0.14"/>
        <circle cx="0" cy="0" r="24" fill="none" stroke="#ffb703" stroke-width="1.2" opacity="0.14"/>
        <circle cx="80" cy="0" r="24" fill="none" stroke="#ffb703" stroke-width="1.2" opacity="0.14"/>
        <circle cx="0" cy="80" r="24" fill="none" stroke="#ffb703" stroke-width="1.2" opacity="0.14"/>
        <circle cx="80" cy="80" r="24" fill="none" stroke="#ffb703" stroke-width="1.2" opacity="0.14"/>
        <polygon points="40,26 54,40 40,54 26,40" fill="none" stroke="#00f5d4" stroke-width="1" opacity="0.12"/>
      </pattern>
    `;
    svg.appendChild(defs);

    // Base board plate
    svg.appendChild(svgEl('rect', {
      x: 0, y: 0, width: 1500, height: 1500, rx: 32,
      fill: theme.boardBg,
      stroke: theme.boardStroke,
      'stroke-width': 7,
    }));

    // Subtle Nusantara Batik Kawung pattern overlay on the board!
    if (theme.batikPattern) {
      svg.appendChild(svgEl('rect', {
        x: 6, y: 6, width: 1488, height: 1488, rx: 28,
        fill: 'url(#batikKawung)',
      }));
    }

    // 52 Main Track Tiles
    const startArrowMeta = {
      0: { hero: heroes[0], arrow: '▶' },
      13: { hero: heroes[1], arrow: '▼' },
      26: { hero: heroes[2], arrow: '◀' },
      39: { hero: heroes[3], arrow: '▲' },
    };

    MAIN_TRACK.forEach(([r, c], idx) => {
      const x = c * 100;
      const y = r * 100;
      const startInfo = startArrowMeta[idx];
      const isStar = STAR_SAFE_INDICES.includes(idx);

      let fill = theme.tileBg;
      let stroke = theme.tileStroke;
      if (startInfo) {
        fill = startInfo.hero.colorDark;
        stroke = startInfo.hero.color;
      } else if (isStar) {
        fill = theme.starBg;
        stroke = theme.starStroke;
      }

      svg.appendChild(svgEl('rect', {
        x: x + 4, y: y + 4, width: 92, height: 92, rx: 14,
        fill,
        stroke,
        'stroke-width': startInfo ? 3.5 : 2,
      }));

      if (startInfo) {
        const txt = svgEl('text', {
          x: x + 50, y: y + 63,
          'text-anchor': 'middle',
          fill: startInfo.hero.color,
          'font-size': '38',
          'font-weight': '800',
          opacity: '0.95',
        });
        txt.textContent = startInfo.arrow;
        svg.appendChild(txt);
      } else if (isStar) {
        const star = svgEl('text', {
          x: x + 50, y: y + 66,
          'text-anchor': 'middle',
          fill: theme.batikPattern ? '#ffb703' : '#94a3b8',
          'font-size': '44',
          class: 'board-star-icon',
          'data-track-idx': idx,
        });
        star.textContent = '★';
        svg.appendChild(star);
      }
    });

    // 4 Private Home Stretches
    heroes.forEach((hero) => {
      const tiles = HOME_STRETCHES[hero.id].slice(0, 5);
      tiles.forEach(([r, c]) => {
        const x = c * 100;
        const y = r * 100;
        svg.appendChild(svgEl('rect', {
          x: x + 4, y: y + 4, width: 92, height: 92, rx: 14,
          fill: hero.colorDark,
          stroke: hero.color,
          'stroke-width': 2.5,
          opacity: '0.9',
        }));
        if (theme.batikPattern) {
          // Diamond batik accent on home stretch
          svg.appendChild(svgEl('polygon', {
            points: `${x + 50},${y + 30} ${x + 70},${y + 50} ${x + 50},${y + 70} ${x + 30},${y + 50}`,
            fill: hero.color,
            opacity: '0.32',
          }));
        } else {
          svg.appendChild(svgEl('circle', {
            cx: x + 50, cy: y + 50, r: 10,
            fill: hero.color,
            opacity: '0.4',
          }));
        }
      });
    });

    // 4 Corner Hero Yards
    const yardOrigins = [
      { hero: heroes[0], x: 0, y: 0 },
      { hero: heroes[1], x: 900, y: 0 },
      { hero: heroes[2], x: 900, y: 900 },
      { hero: heroes[3], x: 0, y: 900 },
    ];

    yardOrigins.forEach(({ hero, x, y }) => {
      svg.appendChild(svgEl('rect', {
        x: x + 16, y: y + 16, width: 568, height: 568, rx: 36,
        fill: theme.yardBg,
        stroke: hero.color,
        'stroke-width': 5,
        opacity: '0.96',
      }));
      if (theme.batikPattern) {
        svg.appendChild(svgEl('rect', {
          x: x + 16, y: y + 16, width: 568, height: 568, rx: 36,
          fill: 'url(#batikKawung)',
        }));
      }
      svg.appendChild(svgEl('rect', {
        x: x + 52, y: y + 52, width: 496, height: 496, rx: 28,
        fill: hero.colorDark,
        opacity: '0.3',
        stroke: hero.color,
        'stroke-width': 2,
        'stroke-dasharray': theme.batikPattern ? '18 6 4 6' : '12 8',
      }));

      const labelY = y === 0 ? y + 84 : y + 542;
      const lbl = svgEl('text', {
        x: x + 300, y: labelY,
        'text-anchor': 'middle',
        fill: hero.color,
        'font-family': 'Orbitron, sans-serif',
        'font-size': '31',
        'font-weight': '800',
        'letter-spacing': '3',
        opacity: '0.95',
      });
      lbl.textContent = `${hero.emoji} ${hero.name}`;
      svg.appendChild(lbl);

      BASE_SLOTS[hero.id].forEach(([r, c]) => {
        const cx = (c + 0.5) * 100;
        const cy = (r + 0.5) * 100;
        svg.appendChild(svgEl('circle', {
          cx, cy, r: 58,
          fill: theme.boardBg,
          stroke: hero.color,
          'stroke-width': 3.5,
          opacity: '0.9',
        }));
        svg.appendChild(svgEl('circle', {
          cx, cy, r: 40,
          fill: 'none',
          stroke: theme.batikPattern ? '#ffb703' : hero.color,
          'stroke-width': 1.6,
          'stroke-dasharray': '6 6',
          opacity: '0.55',
        }));
      });
    });

    // Center 3x3 Finish Goal (Gunungan Cyber Core in Nusantara theme!)
    const centerGroup = svgEl('g');
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
        'stroke-width': 3.5,
      }));
    });

    if (theme.batikPattern) {
      // Cyber Gunungan diamond frame in center
      centerGroup.appendChild(svgEl('polygon', {
        points: '750,655 835,750 750,845 665,750',
        fill: 'url(#coreGrad)',
        stroke: '#ffb703',
        'stroke-width': 4,
        filter: 'url(#neonSoft)',
      }));
    } else {
      centerGroup.appendChild(svgEl('circle', {
        cx: 750, cy: 750, r: 58,
        fill: 'url(#coreGrad)',
        stroke: '#ffffff',
        'stroke-width': 3.5,
        filter: 'url(#neonSoft)',
      }));
    }

    const coreTxt = svgEl('text', {
      x: 750, y: 765,
      'text-anchor': 'middle',
      fill: '#ffb703',
      'font-size': '44',
    });
    coreTxt.textContent = theme.centerEmblem;
    centerGroup.appendChild(coreTxt);
    svg.appendChild(centerGroup);

    this.dynamicLayer = svgEl('g', { id: 'board-dynamic-layer' });
    svg.appendChild(this.dynamicLayer);
  }

  // --------------------------------------------------------------------------
  // 2. Full State Render Entry Point
  // --------------------------------------------------------------------------

  render(state) {
    if (!state) return;
    const theme = getTheme(state.theme);

    // Apply document theme class & rebuild SVG if theme switched
    document.body.dataset.theme = theme.id;
    if (this.currentThemeId !== theme.id) {
      this._buildStaticBoardSVG(theme.id);
    }
    this.dom.brandLogo.textContent = theme.brandTitle;
    this.dom.brandPill.textContent = theme.brandPill;
    if (this.dom.themeBtn) {
      this.dom.themeBtn.textContent = theme.label;
    }

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
      el.setAttribute('fill', isBlackout ? '#ff2a5f' : theme.batikPattern ? '#ffb703' : '#94a3b8');
      el.setAttribute('opacity', isBlackout ? '0.45' : '0.95');
      el.textContent = isBlackout ? '✕' : '★';
    });

    if (state.activeEvent?.id === 'turbo') {
      TURBO_TILES.forEach((idx) => {
        const [r, c] = MAIN_TRACK[idx];
        const x = c * 100;
        const y = r * 100;
        g.appendChild(svgEl('rect', {
          x: x + 6, y: y + 6, width: 88, height: 88, rx: 14,
          fill: 'rgba(255, 183, 3, 0.22)',
          stroke: '#ffb703',
          'stroke-width': 4,
        }));
        const t = svgEl('text', {
          x: x + 50, y: y + 66,
          'text-anchor': 'middle',
          fill: '#ffb703',
          'font-size': '44',
        });
        t.textContent = '⚡';
        g.appendChild(t);
      });
    }

    if (state.activeEvent?.id === 'portal') {
      PORTAL_PAIR.forEach((idx) => {
        const [r, c] = MAIN_TRACK[idx];
        const cx = c * 100 + 50;
        const cy = r * 100 + 50;
        g.appendChild(svgEl('circle', {
          cx, cy, r: 40,
          fill: 'rgba(0, 245, 212, 0.2)',
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
        g.appendChild(t);
      });
    }

    state.mysteryActive.forEach((idx) => {
      const [r, c] = MAIN_TRACK[idx];
      const cx = c * 100 + 50;
      const cy = r * 100 + 50;
      g.appendChild(svgEl('rect', {
        x: c * 100 + 16, y: r * 100 + 16, width: 68, height: 68, rx: 14,
        fill: 'rgba(255, 183, 3, 0.14)',
        stroke: '#ffb703',
        'stroke-width': 2.5,
        'stroke-dasharray': '6 4',
      }));
      const txt = svgEl('text', {
        x: cx, y: cy + 16,
        'text-anchor': 'middle',
        fontSize: '40',
        'font-size': '40',
      });
      txt.textContent = '🎁';
      g.appendChild(txt);
    });

    for (const [idxStr] of Object.entries(state.slimeTraps)) {
      const idx = Number(idxStr);
      const [r, c] = MAIN_TRACK[idx];
      const cx = c * 100 + 50;
      const cy = r * 100 + 50;
      g.appendChild(svgEl('circle', {
        cx, cy, r: 36,
        fill: 'rgba(74, 222, 128, 0.35)',
        stroke: '#4ade80',
        'stroke-width': 4,
      }));
      const txt = svgEl('text', {
        x: cx, y: cy + 14,
        'text-anchor': 'middle',
        'font-size': '36',
      });
      txt.textContent = '🟢';
      g.appendChild(txt);
    }
  }

  // --------------------------------------------------------------------------
  // 3. Animated Pawn Tokens Layer
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
            <span class="pawn-ring"></span>
            <span class="pawn-core"></span>
            <span class="pawn-badge"></span>
          `;
          node.addEventListener('click', () => this.cb.onPawnClick(pw.id));
          layer.appendChild(node);
          this.pawnNodes.set(pw.id, node);
        }

        // Update theme emoji & color dynamically
        node.style.setProperty('--hero-color', pl.hero.color);
        node.style.setProperty('--hero-glow', pl.hero.glow);
        node.querySelector('.pawn-core').textContent = pl.hero.emoji;

        const [ox, oy] = count === 1 ? [0, 0] : stackOffsets[(idx + 1) % stackOffsets.length];
        node.style.left = `${((c + 0.5) / 15) * 100 + ox}%`;
        node.style.top = `${((r + 0.5) / 15) * 100 + oy}%`;

        const isSelectable = validSet.has(pw.id);
        const isCurrentOwner = activePlayer?.id === pl.id;
        node.classList.toggle('selectable', isSelectable);
        node.classList.toggle('is-ace', pw.isAce);
        node.classList.toggle('is-shielded', pw.shieldTurns > 0);
        node.classList.toggle('is-finished', pw.finished);
        node.classList.toggle('is-stacked', count > 1);
        node.classList.toggle('is-enemy-target', isSelectable && state.phase === 'SKILL_SELECT_ENEMY');
        node.style.zIndex = isSelectable ? '40' : isCurrentOwner ? '25' : '15';

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
  // 4. Player HUD Cards
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
  // 5. Tactical Dice Dock & Roll Controls
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
      prompt = isMyTurn ? 'Klik pion yang menyala di papan!' : `Menunggu ${player.hero.name} memilih pion...`;
    } else if (state.phase === 'SKILL_SELECT_OWN') {
      prompt = isMyTurn ? 'Klik pionmu yang menyala untuk skill! (atau Batal)' : `${player.hero.name} memilih target skill...`;
    } else if (state.phase === 'SKILL_SELECT_ENEMY') {
      prompt = isMyTurn ? 'Klik pion LAWAN untuk ditukar posisinya!' : `${player.hero.name} membidik lawan...`;
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

    // Show local player's dice in Online Mode, or active player's dice in Local Mode
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
  // 6. Top Event Bar, Online Room Badge & Turn Direction
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

  // --------------------------------------------------------------------------
  // 7. Emotes & Victory Modal
  // --------------------------------------------------------------------------

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
