// ============================================================================
// LudoZ — Bootstrap, Lobby, Cosmetics, Loading Screen & Online Wiring
// ============================================================================

import { getTheme, getHeroesForTheme, DICE_TYPES, BOARD_EVENTS } from './constants.js';
import { sfx } from './sound.js';
import { FXManager } from './fx.js';
import { GameEngine } from './engine.js';
import { GameRenderer } from './renderer.js';
import { OnlineClient } from './online.js';
import { icon } from './icons.js';
import { runLoader } from './loader.js';
import { logoWordmark } from './logo.js';
import {
  MAPS,
  PAWN_SKINS,
  DICE_SKINS,
  saveCosmetics,
  renderPawnSkin,
  diceFaceHTML,
} from './skins.js';

// ----------------------------------------------------------------------------
// Static icon hydration: any element with data-icon="name" gets an SVG prefix
// ----------------------------------------------------------------------------

function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((node) => {
    if (node.querySelector(':scope > svg.ico')) return;
    node.insertAdjacentHTML('afterbegin', icon(node.dataset.icon));
  });
}
hydrateIcons();
document.getElementById('brand-logo').innerHTML = logoWordmark({ gradient: true });
document.getElementById('ld-brand').innerHTML = logoWordmark({ gradient: true });

function setIconLabel(node, iconName, label) {
  node.innerHTML = label ? `${icon(iconName)}<span>${label}</span>` : icon(iconName);
}

const escapeHTML = (str) =>
  String(str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const dom = {
  brandLogo: document.getElementById('brand-logo'),
  brandPill: document.getElementById('brand-pill'),
  boardStage: document.getElementById('board-stage'),
  boardSvg: document.getElementById('board-svg'),
  pawnsLayer: document.getElementById('pawns-layer'),
  fxCanvas: document.getElementById('fx-canvas'),
  tileInspector: document.getElementById('tile-inspector'),
  tiltBtn: document.getElementById('tilt-btn'),
  leftCards: document.getElementById('left-cards'),
  rightCards: document.getElementById('right-cards'),
  roomBadge: document.getElementById('room-badge'),
  roundBadge: document.getElementById('round-badge'),
  dirBadge: document.getElementById('dir-badge'),
  eventBanner: document.getElementById('event-banner'),
  turnHeroName: document.getElementById('turn-hero-name'),
  turnPrompt: document.getElementById('turn-prompt'),
  cancelSkillBtn: document.getElementById('cancel-skill-btn'),
  diceCube: document.getElementById('dice-cube'),
  diceInfoLabel: document.getElementById('dice-info-label'),
  diceLoadout: document.getElementById('dice-loadout'),
  rollBtn: document.getElementById('roll-btn'),
  rollBtnText: document.getElementById('roll-btn-text'),
  powerFill: document.getElementById('power-fill'),
  dockSkillBtn: document.getElementById('dock-skill-btn'),
  emoteBar: document.getElementById('emote-bar'),
  battleLog: document.getElementById('battle-log'),
  themeBtn: document.getElementById('theme-btn'),
  soundBtn: document.getElementById('sound-btn'),
  helpBtn: document.getElementById('help-btn'),
  lobbyBtn: document.getElementById('lobby-btn'),
  // Setup modal
  setupModal: document.getElementById('setup-modal'),
  setupModalTitle: document.getElementById('setup-modal-title'),
  closeSetupBtn: document.getElementById('close-setup-btn'),
  themeModeCombo: document.getElementById('theme-mode-combo'),
  themePicker: document.getElementById('theme-picker'),
  lobbyStepper: document.getElementById('lobby-stepper'),
  lobbyBackBtn: document.getElementById('lobby-back-btn'),
  setupHeroesGrid: document.getElementById('setup-heroes-grid'),
  setupError: document.getElementById('setup-error'),
  startMatchBtn: document.getElementById('start-match-btn'),
  // Tabs
  tabLocal: document.getElementById('tab-local'),
  tabOnline: document.getElementById('tab-online'),
  tabStyle: document.getElementById('tab-style'),
  // Online
  onlineEntry: document.getElementById('online-entry'),
  onlineRoomView: document.getElementById('online-room-view'),
  onlineNameInput: document.getElementById('online-name-input'),
  createRoomBtn: document.getElementById('create-room-btn'),
  joinCodeInput: document.getElementById('join-code-input'),
  joinRoomBtn: document.getElementById('join-room-btn'),
  onlineError: document.getElementById('online-error'),
  roomCodeDisplay: document.getElementById('room-code-display'),
  copyLinkBtn: document.getElementById('copy-link-btn'),
  leaveRoomBtn: document.getElementById('leave-room-btn'),
  lanUrlHint: document.getElementById('lan-url-hint'),
  onlineSeatsGrid: document.getElementById('online-seats-grid'),
  onlineStatusMsg: document.getElementById('online-status-msg'),
  startOnlineBtn: document.getElementById('start-online-btn'),
  // Cosmetics
  mapPicker: document.getElementById('map-picker'),
  pawnPicker: document.getElementById('pawn-picker'),
  dicePicker: document.getElementById('dice-picker'),
  // Help & victory
  helpModal: document.getElementById('help-modal'),
  closeHelpBtn: document.getElementById('close-help-btn'),
  helpBody: document.getElementById('help-body'),
  victoryModal: document.getElementById('victory-modal'),
  victoryHeroAvatar: document.getElementById('victory-hero-avatar'),
  victoryTitle: document.getElementById('victory-title'),
  victorySubtitle: document.getElementById('victory-subtitle'),
  victoryStats: document.getElementById('victory-stats'),
  rematchBtn: document.getElementById('rematch-btn'),
  backLobbyBtn: document.getElementById('back-lobby-btn'),
};

const lobbyState = {
  tab: 'local', // 'local' | 'online' | 'style'
  playTab: 'local', // last play tab (decides the footer CTA while on the style tab)
  localStep: 1, // local flow: 1 = pick game (roster + mode), 2 = pick players
  mode: 'blitz',
  theme: 'nusantara',
  roles: ['human', 'ai', 'ai', 'ai'],
  lanUrls: [],
};

const fx = new FXManager(dom.fxCanvas, dom.boardStage);

let renderer;
let engine;
let online;
let isLaunching = false;

function addBattleLog(text, color = '#cbd5e1') {
  const row = document.createElement('div');
  row.className = 'log-item';
  row.style.setProperty('--log-color', color);
  row.textContent = text;
  dom.battleLog.prepend(row);
  while (dom.battleLog.children.length > 30) {
    dom.battleLog.lastChild.remove();
  }
}

function closeAllModals() {
  dom.setupModal.classList.remove('open');
  dom.victoryModal.classList.remove('open');
  dom.helpModal.classList.remove('open');
}

function lineupFromConfigs(themeId, playerConfigs) {
  const heroes = getHeroesForTheme(themeId);
  return playerConfigs
    .filter((c) => c.type !== 'off')
    .map((c) => ({ hero: heroes[c.heroId], type: c.type, displayName: c.name }));
}

online = new OnlineClient({
  onRoomUpdate: (room) => {
    lobbyState.mode = room.mode;
    lobbyState.theme = room.theme;
    renderSetupModal();
    renderOnlineRoom();
  },
  onMatchStart: ({ room, matchSeed }) => {
    lobbyState.mode = room.mode;
    lobbyState.theme = room.theme;
    const playerConfigs = room.seats.map((s) => ({
      heroId: s.seatIndex,
      type: s.type,
      name: s.name || null,
    }));
    dom.battleLog.innerHTML = '';
    closeAllModals();
    renderEmoteBar(room.theme);
    renderHelpGuide(room.theme);
    // Online: start the engine immediately so every client stays in lock-step;
    // the loading overlay simply plays on top of the freshly dealt board.
    engine.startMatch({
      mode: room.mode,
      theme: room.theme,
      playerConfigs,
      seed: matchSeed,
      online: {
        enabled: true,
        isHost: online.isHost,
        mySeatIndex: online.seatIndex,
        roomCode: room.code,
      },
    });
    fx.resize();
    runLoader({
      kind: 'match',
      lineup: lineupFromConfigs(room.theme, playerConfigs),
      heroes: getHeroesForTheme(room.theme),
      cosmetics: renderer.cosmetics,
      modeLabel: `ROOM ${room.code} · ${room.mode === 'blitz' ? 'BLITZ' : 'CLASSIC'}`,
      duration: 1700,
    }).then(() => sfx.skillActivate());
  },
  onGameAction: (action) => {
    engine.enqueueRemoteAction(action);
  },
  onConnectionChange: (connected) => {
    if (!connected && online.isConnected) {
      dom.onlineStatusMsg.textContent = 'Koneksi terputus, mencoba menyambung ulang...';
    }
  },
});

renderer = new GameRenderer(dom, {
  onPawnClick: (pawnId) => engine.selectPawn(pawnId),
  onSelectDice: (diceId) => engine.selectDice(diceId),
  onActivateSkill: () => engine.activateOverdriveSkill(),
});

engine = new GameEngine({
  fx,
  onRender: (state) => renderer.render(state),
  onLog: addBattleLog,
  onEmote: (heroId, text) => {
    sfx.emote();
    renderer.showEmote(heroId, text);
  },
  onDispatchOnlineAction: (type, payload) => {
    online.sendAction(type, payload);
  },
});

// LAN URLs for easy same-Wi-Fi multiplayer sharing
online.getServerInfo().then((info) => {
  lobbyState.lanUrls = info.lanUrls || [];
  renderOnlineRoom();
});

// ----------------------------------------------------------------------------
// Power-Hold Roll Button (Pointer + Spacebar)
// ----------------------------------------------------------------------------

let isCharging = false;
let chargeStart = 0;
let chargeValue = 0.5;
let chargeRaf = null;

function anyOverlayOpen() {
  return (
    dom.setupModal.classList.contains('open') ||
    dom.helpModal.classList.contains('open') ||
    !document.getElementById('loading-screen').hidden
  );
}

function startCharge() {
  if (!engine.state || engine.state.phase !== 'WAITING_ROLL') return;
  if (!engine.canLocalControlCurrentPlayer()) return;
  if (isCharging || anyOverlayOpen()) return;

  isCharging = true;
  chargeStart = performance.now();
  dom.rollBtn.classList.add('charging');

  const loop = (now) => {
    if (!isCharging) return;
    const elapsed = (now - chargeStart) / 1000;
    const cycle = (elapsed * 1.45) % 2;
    chargeValue = cycle <= 1 ? cycle : 2 - cycle;
    dom.powerFill.style.width = `${Math.round(chargeValue * 100)}%`;
    chargeRaf = requestAnimationFrame(loop);
  };
  chargeRaf = requestAnimationFrame(loop);
}

function releaseCharge() {
  if (!isCharging) return;
  isCharging = false;
  cancelAnimationFrame(chargeRaf);
  dom.rollBtn.classList.remove('charging');
  const heldMs = performance.now() - chargeStart;
  const finalPower = heldMs < 130 ? 0.5 : chargeValue;
  setTimeout(() => {
    dom.powerFill.style.width = '0%';
  }, 280);
  engine.rollDice(finalPower);
}

dom.rollBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  startCharge();
});
window.addEventListener('pointerup', () => {
  if (isCharging) releaseCharge();
});
window.addEventListener('pointercancel', () => {
  if (isCharging) releaseCharge();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (dom.helpModal.classList.contains('open')) {
      dom.helpModal.classList.remove('open');
      return;
    }
    engine.cancelSkillSelection();
    return;
  }
  if (anyOverlayOpen()) return;
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    startCharge();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && isCharging) {
    e.preventDefault();
    releaseCharge();
  }
});

dom.dockSkillBtn.addEventListener('click', () => engine.activateOverdriveSkill());
dom.cancelSkillBtn.addEventListener('click', () => engine.cancelSkillSelection());

// ----------------------------------------------------------------------------
// Emote Bar
// ----------------------------------------------------------------------------

function renderEmoteBar(themeId) {
  const emotes = getTheme(themeId).emotes;
  dom.emoteBar.innerHTML = emotes
    .map((em) => `<button type="button" class="emote-btn" data-emote="${em.label}">${icon(em.icon)}<span>${em.label}</span></button>`)
    .join('');

  dom.emoteBar.querySelectorAll('.emote-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!engine.state) return;
      if (engine.state.online.enabled) {
        online.sendAction('emote', {
          heroId: engine.state.online.mySeatIndex,
          text: btn.dataset.emote,
        });
        return;
      }
      const active = engine.currentPlayer;
      const target = active?.type === 'human'
        ? active
        : engine.state.players.find((p) => p.type === 'human') || active;
      if (!target) return;
      sfx.emote();
      renderer.showEmote(target.id, btn.dataset.emote);
    });
  });
}

// ----------------------------------------------------------------------------
// Top Bar Controls
// ----------------------------------------------------------------------------

function applyThemeChoice(themeId) {
  lobbyState.theme = themeId;
  renderEmoteBar(themeId);
  renderHelpGuide(themeId);
  if (engine.state) {
    engine.setTheme(themeId);
  }
  renderSetupModal();
  renderStylePickers();
  if (online.isConnected && online.isHost) {
    online.updateConfig({ theme: themeId });
  }
}

dom.themeBtn.addEventListener('click', () => {
  if (online.isConnected && !online.isHost) return;
  sfx.click();
  applyThemeChoice(lobbyState.theme === 'nusantara' ? 'neo' : 'nusantara');
});

dom.soundBtn.addEventListener('click', () => {
  const muted = sfx.toggleMute();
  setIconLabel(dom.soundBtn, muted ? 'volumeOff' : 'volume');
  dom.soundBtn.title = muted ? 'Suara mati' : 'Suara aktif';
  dom.soundBtn.classList.toggle('muted', muted);
  if (!muted) sfx.click();
});

dom.helpBtn.addEventListener('click', () => {
  sfx.click();
  dom.helpModal.classList.add('open');
});
dom.closeHelpBtn.addEventListener('click', () => {
  sfx.click();
  dom.helpModal.classList.remove('open');
});
dom.helpModal.addEventListener('click', (e) => {
  if (e.target === dom.helpModal) dom.helpModal.classList.remove('open');
});

function openLobby(tab = null) {
  lobbyState.localStep = 1;
  renderSetupModal();
  renderOnlineRoom();
  renderStylePickers();
  if (tab) switchLobbyTab(tab);
  dom.setupModal.classList.add('open');
}

dom.lobbyBtn.addEventListener('click', () => {
  sfx.click();
  openLobby();
});
dom.closeSetupBtn.addEventListener('click', () => {
  sfx.click();
  dom.setupModal.classList.remove('open');
});

// 2.5D tabletop perspective toggle
let isTilted = false;
dom.tiltBtn.addEventListener('click', () => {
  isTilted = !isTilted;
  sfx.click();
  dom.boardStage.classList.toggle('tilt-3d', isTilted);
  dom.tiltBtn.classList.toggle('active', isTilted);
  setIconLabel(dom.tiltBtn, isTilted ? 'square' : 'cube', isTilted ? '2D' : '2.5D');
  setTimeout(() => fx.resize(), 360);
});

// ----------------------------------------------------------------------------
// Lobby: Tabs, Roster Theme, Mode & Local Seats
// ----------------------------------------------------------------------------

const ID_FLAG = `<svg class="flag-svg" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="8" rx="2" fill="#ff2a5f"/><rect y="8" width="24" height="8" rx="2" fill="#f8fafc"/></svg>`;

const ROSTERS = [
  { id: 'nusantara', title: 'NUSANTARA CYBERPUNK', badge: () => ID_FLAG, tag: 'Legenda Nusantara versi neon' },
  { id: 'neo', title: 'NEO-ARCADE', badge: () => icon('gamepad'), tag: 'Maskot arcade jalanan kota' },
];

function isGuestOnline() {
  return online.isConnected && !online.isHost;
}

/** Single source of truth for which lobby section & footer buttons are visible. */
function syncLobbyView() {
  const { tab } = lobbyState;
  const playTab = tab === 'style' ? lobbyState.playTab : tab;
  const localStep = lobbyState.localStep;

  dom.lobbyStepper.style.display = tab === 'local' ? '' : 'none';
  dom.lobbyStepper.querySelectorAll('.step-pill').forEach((pill) => {
    const n = Number(pill.dataset.step);
    pill.classList.toggle('active', n === localStep);
    pill.classList.toggle('done', n < localStep);
  });

  const showSetup = (tab === 'local' && localStep === 1) || (tab === 'online' && !isGuestOnline());
  dom.themeModeCombo.style.display = showSetup ? '' : 'none';
  dom.tabLocal.classList.toggle('active', tab === 'local' && localStep === 2);
  dom.tabOnline.classList.toggle('active', tab === 'online');
  dom.tabStyle.classList.toggle('active', tab === 'style');

  const isLocal = playTab === 'local';
  const onStep2 = isLocal && tab === 'local' && localStep === 2;
  dom.lobbyBackBtn.style.display = onStep2 ? 'flex' : 'none';
  dom.startMatchBtn.style.display = isLocal ? 'flex' : 'none';
  dom.startOnlineBtn.style.display = !isLocal && online.isConnected && online.isHost ? 'flex' : 'none';

  const goesToStep2 = isLocal && !(tab === 'local' && localStep === 2);
  dom.startMatchBtn.innerHTML = goesToStep2
    ? `<span>LANJUT: PILIH PEMAIN</span>${icon('arrowRight')}`
    : `${icon('play')}<span>MULAI MAIN</span>`;
  const activeCount = lobbyState.roles.filter((r) => r !== 'off').length;
  dom.startMatchBtn.disabled = !goesToStep2 && activeCount < 2;
}

// Kept for older call sites
const syncModalFooterCTA = syncLobbyView;

function setLocalStep(step) {
  lobbyState.localStep = step;
  syncLobbyView();
  dom.setupModal.querySelector('.modal-scroll-body').scrollTop = 0;
}

function switchLobbyTab(tab) {
  lobbyState.tab = tab;
  if (tab !== 'style') lobbyState.playTab = tab;
  document.querySelectorAll('.lobby-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  syncLobbyView();
}

document.querySelectorAll('.lobby-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    sfx.click();
    switchLobbyTab(btn.dataset.tab);
  });
});

dom.lobbyStepper.addEventListener('click', (e) => {
  const pill = e.target.closest('.step-pill');
  if (!pill) return;
  sfx.click();
  setLocalStep(Number(pill.dataset.step));
});

dom.lobbyBackBtn.addEventListener('click', () => {
  sfx.click();
  setLocalStep(1);
});

dom.themePicker.addEventListener('click', (e) => {
  const card = e.target.closest('.theme-card');
  if (!card || isGuestOnline()) return;
  sfx.click();
  applyThemeChoice(card.dataset.themePick);
});

document.querySelectorAll('.mode-card').forEach((card) => {
  card.addEventListener('click', () => {
    if (isGuestOnline()) return;
    lobbyState.mode = card.dataset.mode;
    sfx.click();
    renderSetupModal();
    if (online.isConnected && online.isHost) {
      online.updateConfig({ mode: lobbyState.mode });
    }
  });
});

const ROLE_META = {
  human: { icon: 'user', label: 'Human' },
  ai: { icon: 'bot', label: 'AI' },
  off: { icon: 'off', label: 'Off' },
};

function renderSetupModal() {
  const theme = getTheme(lobbyState.theme);
  const heroes = theme.heroes;
  dom.setupModalTitle.textContent = `${theme.brandTitle} — ${theme.brandPill}`;

  // Step 1: roster cards with hero line-up
  dom.themePicker.innerHTML = ROSTERS.map((r) => {
    const rHeroes = getHeroesForTheme(r.id);
    return `<button type="button" class="theme-card ${r.id === lobbyState.theme ? 'selected' : ''}" data-theme-pick="${r.id}">
      <span class="theme-card-head"><strong>${r.badge()}<span>${r.title}</span></strong><span class="skin-check">${icon('check', { stroke: 3 })}</span></span>
      <span class="theme-avatars">${rHeroes.map((h) => `<span class="theme-avatar" style="--hero-color:${h.color}" title="${h.name}">${h.svgAvatar}</span>`).join('')}</span>
      <span class="theme-tag">${r.tag}</span>
    </button>`;
  }).join('');

  document.querySelectorAll('.mode-card').forEach((card) => {
    card.classList.toggle('selected', card.dataset.mode === lobbyState.mode);
  });

  // Step 2: one clean row per hero with a Human / AI / Off segmented switch
  dom.setupHeroesGrid.innerHTML = heroes.map((h, idx) => {
    const role = lobbyState.roles[idx];
    const seg = Object.entries(ROLE_META).map(([key, meta]) => `
      <button type="button" class="seg-btn ${key} ${role === key ? 'on' : ''}" data-hero-idx="${idx}" data-role="${key}" aria-pressed="${role === key}">
        ${icon(meta.icon)}<span>${meta.label}</span>
      </button>`).join('');
    return `
      <div class="player-row ${role}" style="--hero-color:${h.color}; --hero-glow:${h.glow}">
        <div class="setup-avatar">${h.svgAvatar}</div>
        <div class="player-info">
          <div class="setup-hero-name">${h.name} <small>${h.title}</small></div>
          <div class="player-skill" title="${h.skillDesc}">${icon('bolt')}<span>${h.skillName}</span></div>
        </div>
        <div class="role-seg" role="group" aria-label="Peran ${h.name}">${seg}</div>
      </div>
    `;
  }).join('');

  const activeCount = lobbyState.roles.filter((r) => r !== 'off').length;
  dom.setupError.textContent = activeCount < 2 ? 'Minimal 2 pemain aktif untuk memulai.' : '';
  syncLobbyView();
}

dom.setupHeroesGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  const idx = Number(btn.dataset.heroIdx);
  if (lobbyState.roles[idx] === btn.dataset.role) return;
  lobbyState.roles[idx] = btn.dataset.role;
  sfx.click();
  renderSetupModal();
});

async function launchLocalMatch() {
  if (isLaunching) return;
  isLaunching = true;
  try {
    if (online.isConnected) {
      online.disconnect();
    }
    const heroes = getHeroesForTheme(lobbyState.theme);
    const playerConfigs = heroes.map((h, idx) => ({
      heroId: h.id,
      type: lobbyState.roles[idx],
      name: null,
    }));
    closeAllModals();
    sfx.click();

    await runLoader({
      kind: 'match',
      lineup: lineupFromConfigs(lobbyState.theme, playerConfigs),
      heroes,
      cosmetics: renderer.cosmetics,
      modeLabel: lobbyState.mode === 'blitz' ? 'BLITZ · 2 PION' : 'CLASSIC · 4 PION',
    });

    dom.battleLog.innerHTML = '';
    renderEmoteBar(lobbyState.theme);
    renderHelpGuide(lobbyState.theme);
    engine.startMatch({
      mode: lobbyState.mode,
      theme: lobbyState.theme,
      playerConfigs,
    });
    fx.resize();
    sfx.skillActivate();
  } finally {
    isLaunching = false;
  }
}

dom.startMatchBtn.addEventListener('click', () => {
  if (lobbyState.tab !== 'local' || lobbyState.localStep === 1) {
    sfx.click();
    if (lobbyState.tab !== 'local') switchLobbyTab('local');
    setLocalStep(2);
    return;
  }
  launchLocalMatch();
});

// ----------------------------------------------------------------------------
// Arena & Skin pickers (local-only cosmetics, live preview)
// ----------------------------------------------------------------------------

function mapPreviewSVG(m) {
  // Tiny 5x5 stylised board: yards in corners, cross track, core
  const heroes = getHeroesForTheme(lobbyState.theme);
  const cells = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const isCross = r === 2 || c === 2;
      if (!isCross) continue;
      if (r === 2 && c === 2) continue;
      cells.push(`<rect x="${c * 20 + 2}" y="${r * 20 + 2}" width="16" height="16" rx="4" fill="${m.tileBg}" stroke="${m.tileStroke}" stroke-width="1.5"/>`);
    }
  }
  const yards = [[0, 0], [60, 0], [60, 60], [0, 60]]
    .map(([x, y], i) => `<rect x="${x + 2}" y="${y + 2}" width="36" height="36" rx="8" fill="${m.yardBg}" stroke="${heroes[i].color}" stroke-width="2"/>`)
    .join('');
  return `<svg viewBox="0 0 100 100" class="map-preview">
    <defs>${m.pattern.replace('id="mapPattern"', `id="mp-${m.id}"`)}</defs>
    <rect width="100" height="100" rx="12" fill="${m.boardBg}"/>
    <rect width="100" height="100" rx="12" fill="url(#mp-${m.id})"/>
    ${yards}${cells}
    <g transform="translate(40 40) scale(0.2)">${m.emblem}</g>
  </svg>`;
}

function skinCard({ group, id, name, desc, preview, selected }) {
  return `<button type="button" class="skin-card ${selected ? 'selected' : ''}" data-group="${group}" data-id="${id}" aria-pressed="${selected}">
    <div class="skin-preview">${preview}</div>
    <div class="skin-text">
      <strong>${name}</strong>
      <span>${desc}</span>
    </div>
    <span class="skin-check">${icon('check', { stroke: 3 })}</span>
  </button>`;
}

function renderStylePickers() {
  const c = renderer.cosmetics;
  const heroes = getHeroesForTheme(lobbyState.theme);

  dom.mapPicker.innerHTML = Object.values(MAPS).map((m) => skinCard({
    group: 'map', id: m.id, name: m.name, desc: m.desc, preview: mapPreviewSVG(m), selected: c.map === m.id,
  })).join('');

  dom.pawnPicker.innerHTML = Object.values(PAWN_SKINS).map((s) => skinCard({
    group: 'pawn', id: s.id, name: s.name, desc: s.desc,
    preview: `<div class="pawn-preview-row">${heroes.map((h) => `<span class="pawn-preview" style="--hero-glow:${h.glow}">${renderPawnSkin(s.id, h)}</span>`).join('')}</div>`,
    selected: c.pawn === s.id,
  })).join('');

  dom.dicePicker.innerHTML = Object.values(DICE_SKINS).map((s) => skinCard({
    group: 'dice', id: s.id, name: s.name, desc: s.desc,
    preview: `<div class="dice-preview-row">${diceFaceHTML(1, { skin: s.id })}${diceFaceHTML(5, { skin: s.id })}</div>`,
    selected: c.dice === s.id,
  })).join('');
}

document.getElementById('tab-style').addEventListener('click', (e) => {
  const card = e.target.closest('.skin-card');
  if (!card) return;
  sfx.click();
  renderer.setCosmetics({ [card.dataset.group]: card.dataset.id });
  saveCosmetics(renderer.cosmetics);
  renderStylePickers();
});

// ----------------------------------------------------------------------------
// Online Multiplayer Room UI
// ----------------------------------------------------------------------------

function inviteBaseUrl() {
  return window.location.hostname === 'localhost' && lobbyState.lanUrls[0]
    ? lobbyState.lanUrls[0]
    : window.location.origin;
}

function renderOnlineRoom() {
  if (!online.isConnected || !online.room) {
    dom.onlineEntry.style.display = 'flex';
    dom.onlineRoomView.style.display = 'none';
    syncModalFooterCTA();
    return;
  }

  dom.onlineEntry.style.display = 'none';
  dom.onlineRoomView.style.display = 'flex';

  const room = online.room;
  const heroes = getHeroesForTheme(room.theme);
  dom.roomCodeDisplay.textContent = room.code;

  const inviteUrl = `${inviteBaseUrl()}/?room=${room.code}`;
  const hintPrefix = online.transport === 'webrtc'
    ? 'Link mabar online (WebRTC — bisa beda Wi-Fi/kota)'
    : 'Link 1 Wi-Fi / LAN';
  dom.lanUrlHint.innerHTML = `${icon('link')}<span>${hintPrefix}: <code>${escapeHTML(inviteUrl)}</code></span>`;

  dom.onlineSeatsGrid.innerHTML = room.seats.map((seat) => {
    const h = heroes[seat.seatIndex];
    const isMe = seat.seatIndex === online.seatIndex;
    const isHostSeat = seat.clientId && seat.clientId === room.hostId;

    let statusHTML = '';
    if (seat.clientId) {
      statusHTML = `${icon(isHostSeat ? 'crown' : 'user')}<span>${escapeHTML(seat.name)}${isMe ? ' (KAMU)' : ''}</span>`;
    } else if (seat.type === 'ai') {
      statusHTML = `${icon('bot')}<span>AI BOT (kosong)</span>`;
    } else {
      statusHTML = `${icon('off')}<span>SLOT NONAKTIF</span>`;
    }

    const connText = seat.connected
      ? `<span class="conn-dot on"></span>Online`
      : seat.clientId
        ? `<span class="conn-dot wait"></span>Menyambung...`
        : h.title;

    const canToggle = online.isHost && !seat.clientId;
    return `
      <div class="setup-hero-card ${seat.type}" style="--hero-color:${h.color}; --hero-glow:${h.glow}">
        <div class="setup-hero-top">
          <div class="setup-avatar">${h.svgAvatar}</div>
          <div class="setup-hero-meta">
            <div class="setup-hero-name">${h.name}</div>
            <div class="setup-hero-skill">${connText}</div>
          </div>
        </div>
        <button type="button"
          class="role-toggle-btn ${seat.clientId ? 'human' : seat.type}"
          data-online-seat="${seat.seatIndex}"
          ${!canToggle ? 'disabled' : ''}>
          ${statusHTML}
        </button>
      </div>
    `;
  }).join('');

  dom.onlineSeatsGrid.querySelectorAll('[data-online-seat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!online.isHost) return;
      sfx.click();
      online.updateConfig({ toggleSeat: Number(btn.dataset.onlineSeat) });
    });
  });

  if (online.isHost) {
    const activeCount = room.seats.filter((s) => s.type !== 'off').length;
    dom.startOnlineBtn.disabled = activeCount < 2;
    dom.onlineStatusMsg.textContent = 'Bagikan kode room ke temanmu, lalu klik MULAI MATCH ONLINE.';
  } else {
    dom.onlineStatusMsg.textContent = 'Terhubung! Menunggu host memulai pertandingan...';
  }
  syncModalFooterCTA();
}

dom.createRoomBtn.addEventListener('click', async () => {
  dom.onlineError.textContent = '';
  sfx.click();
  try {
    const name = dom.onlineNameInput.value.trim() || 'Host';
    await online.createRoom({
      name,
      mode: lobbyState.mode,
      theme: lobbyState.theme,
    });
    renderOnlineRoom();
  } catch (err) {
    dom.onlineError.textContent = err.message;
  }
});

dom.joinRoomBtn.addEventListener('click', async () => {
  dom.onlineError.textContent = '';
  sfx.click();
  const code = dom.joinCodeInput.value.trim().toUpperCase();
  if (code.length !== 4) {
    dom.onlineError.textContent = 'Masukkan 4 huruf/angka kode room.';
    return;
  }
  try {
    const name = dom.onlineNameInput.value.trim() || 'Pemain';
    await online.joinRoom({ code, name });
    renderOnlineRoom();
  } catch (err) {
    dom.onlineError.textContent = err.message;
  }
});

dom.copyLinkBtn.addEventListener('click', async () => {
  if (!online.roomCode) return;
  const link = `${inviteBaseUrl()}/?room=${online.roomCode}`;
  try {
    await navigator.clipboard.writeText(link);
    setIconLabel(dom.copyLinkBtn, 'check', 'Tersalin!');
    setTimeout(() => setIconLabel(dom.copyLinkBtn, 'copy', 'Salin Link'), 1800);
  } catch {
    dom.onlineStatusMsg.textContent = `Salin manual: ${link}`;
  }
});

dom.leaveRoomBtn.addEventListener('click', async () => {
  sfx.click();
  await online.disconnect(true);
  renderOnlineRoom();
});

dom.startOnlineBtn.addEventListener('click', async () => {
  try {
    await online.startMatch();
  } catch (err) {
    dom.onlineStatusMsg.textContent = err.message;
  }
});

dom.rematchBtn.addEventListener('click', async () => {
  if (engine.state?.online.enabled) {
    if (online.isHost) {
      await online.startMatch();
    } else {
      dom.victorySubtitle.textContent = 'Menunggu host menekan Main Lagi...';
    }
    return;
  }
  launchLocalMatch();
});

dom.backLobbyBtn.addEventListener('click', () => {
  sfx.click();
  dom.victoryModal.classList.remove('open');
  openLobby();
});

// ----------------------------------------------------------------------------
// How-to-Play Guide
// ----------------------------------------------------------------------------

function renderHelpGuide(themeId) {
  const heroes = getHeroesForTheme(themeId);
  const heroRows = heroes.map(
    (h) => `<div class="guide-item" style="--item-color:${h.color}">
      <div class="guide-item-head"><span class="guide-avatar">${h.svgAvatar}</span><strong>${h.name} — ${h.skillName}</strong></div>
      <span>${h.skillDesc}</span>
      <span class="guide-ko">${icon('burst')}Finisher: ${h.koText}</span>
    </div>`
  ).join('');

  const diceRows = Object.values(DICE_TYPES).map(
    (d) => `<div class="guide-item" style="--item-color:${d.color}">
      <div class="guide-item-head"><span class="guide-glyph">${icon(d.icon)}</span><strong>${d.name} <em>${d.short}</em></strong></div>
      <span>${d.desc}</span>
    </div>`
  ).join('');

  const eventRows = BOARD_EVENTS.map(
    (e) => `<div class="guide-item" style="--item-color:${e.color}">
      <div class="guide-item-head"><span class="guide-glyph">${icon(e.icon)}</span><strong>${e.name}</strong></div>
      <span>${e.desc}</span>
    </div>`
  ).join('');

  dom.helpBody.innerHTML = `
    <div class="guide-section">
      <h4>${icon('book')}Aturan Dasar</h4>
      <ul class="guide-list">
        <li><strong>Wajib angka 6 keluar markas.</strong> Semua pion mulai di markas; lempar <strong>6</strong> untuk keluar ke petak Start sekaligus dapat bonus giliran.</li>
        <li><strong>KO lawan.</strong> Mendarat di petak lawan (bukan safe zone) memulangkan pionnya — tiap hero punya animasi KO sendiri.</li>
        <li><strong>Power hold.</strong> Tahan tombol <em>LEMPAR DADU</em> atau <kbd>SPACE</kbd> untuk atur tenaga, atau klik cepat.</li>
        <li><strong>Skill Overdrive.</strong> Isi energi sampai 100% lalu aktifkan sebelum melempar.</li>
        <li><strong>Multiplayer.</strong> Tab <em>Online</em> di Lobby: buat room, bagikan kode 4 huruf atau link.</li>
        <li><strong>Gaya sendiri.</strong> Tab <em>Arena &amp; Skin</em>: ganti peta, skin pion, dan skin dadu kapan saja.</li>
      </ul>
    </div>
    <div class="guide-section">
      <h4>${icon('bolt')}Hero, Skill &amp; Finisher</h4>
      <div class="guide-grid">${heroRows}</div>
    </div>
    <div class="guide-section">
      <h4>${icon('dice')}Tactical Dice</h4>
      <div class="guide-grid">${diceRows}</div>
    </div>
    <div class="guide-section">
      <h4>${icon('alert')}Board Events</h4>
      <div class="guide-grid">${eventRows}</div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// Boot: preview board behind the lobby, boot splash, then open the lobby
// ----------------------------------------------------------------------------

setIconLabel(dom.themeBtn, 'gamepad', 'Nusantara');
renderEmoteBar(lobbyState.theme);
renderHelpGuide(lobbyState.theme);
renderSetupModal();
renderStylePickers();

engine.startMatch({
  mode: 'blitz',
  theme: lobbyState.theme,
  playerConfigs: [
    { heroId: 0, type: 'human' },
    { heroId: 1, type: 'ai' },
    { heroId: 2, type: 'ai' },
    { heroId: 3, type: 'ai' },
  ],
});

const urlRoom = new URLSearchParams(window.location.search).get('room');
if (urlRoom && /^[A-Za-z0-9]{4}$/.test(urlRoom.trim())) {
  switchLobbyTab('online');
  dom.joinCodeInput.value = urlRoom.trim().toUpperCase();
  dom.onlineNameInput.value = 'Teman' + Math.floor(10 + Math.random() * 89);
}

runLoader({
  kind: 'boot',
  heroes: getHeroesForTheme(lobbyState.theme),
  cosmetics: renderer.cosmetics,
  waitFor: document.fonts?.ready,
}).then(() => {
  fx.resize();
  dom.setupModal.classList.add('open');
});
