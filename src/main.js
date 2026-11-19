// ============================================================================
// LUDO OVERDRIVE — Bootstrap, Themes, Local & Online Multiplayer Wiring
// ============================================================================

import { getTheme, getHeroesForTheme, DICE_TYPES, BOARD_EVENTS } from './constants.js';
import { sfx } from './sound.js';
import { FXManager } from './fx.js';
import { GameEngine } from './engine.js';
import { GameRenderer } from './renderer.js';
import { OnlineClient } from './online.js';

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
  // Setup Modal
  setupModal: document.getElementById('setup-modal'),
  setupModalTitle: document.getElementById('setup-modal-title'),
  closeSetupBtn: document.getElementById('close-setup-btn'),
  setupHeroesGrid: document.getElementById('setup-heroes-grid'),
  setupError: document.getElementById('setup-error'),
  startMatchBtn: document.getElementById('start-match-btn'),
  // Online Tab Elements
  tabLocal: document.getElementById('tab-local'),
  tabOnline: document.getElementById('tab-online'),
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
  // Help & Victory
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
  tab: 'local', // 'local' | 'online'
  mode: 'blitz',
  theme: 'nusantara', // Default to Nusantara Cyberpunk!
  roles: ['human', 'ai', 'ai', 'ai'],
  lanUrls: [],
};

const fx = new FXManager(dom.fxCanvas, dom.boardStage);

let renderer;
let engine;
let online;

function addBattleLog(text, color = '#cbd5e1') {
  const row = document.createElement('div');
  row.className = 'log-item';
  row.style.borderLeftColor = color;
  row.textContent = text;
  dom.battleLog.prepend(row);
  while (dom.battleLog.children.length > 26) {
    dom.battleLog.lastChild.remove();
  }
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
    dom.setupModal.classList.remove('open');
    dom.victoryModal.classList.remove('open');
    sfx.skillActivate();
    renderEmoteBar(room.theme);
    renderHelpGuide(room.theme);
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
  },
  onGameAction: (action) => {
    engine.enqueueRemoteAction(action);
  },
  onConnectionChange: (connected) => {
    if (!connected && online.isConnected) {
      dom.onlineStatusMsg.textContent = '⚠️ Koneksi terputus, mencoba menyambung ulang...';
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

// Fetch LAN URLs for easy local Wi-Fi multiplayer sharing
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

function startCharge() {
  if (!engine.state || engine.state.phase !== 'WAITING_ROLL') return;
  if (!engine.canLocalControlCurrentPlayer()) return;
  if (isCharging) return;

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
  if (dom.setupModal.classList.contains('open') || dom.helpModal.classList.contains('open')) return;
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    startCharge();
  } else if (e.code === 'Escape') {
    engine.cancelSkillSelection();
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
// Theme-Aware Emote Bar
// ----------------------------------------------------------------------------

function renderEmoteBar(themeId) {
  const emotes = getTheme(themeId).emotes;
  dom.emoteBar.innerHTML = emotes
    .map((em) => `<button type="button" class="emote-btn" data-emote="${em.label}">${em.label}</button>`)
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
// Top Bar Controls: Theme Switcher, Sound, Help, Lobby
// ----------------------------------------------------------------------------

function applyThemeChoice(themeId) {
  lobbyState.theme = themeId;
  renderEmoteBar(themeId);
  renderHelpGuide(themeId);
  if (engine.state) {
    engine.setTheme(themeId);
  }
  renderSetupModal();
  if (online.isConnected && online.isHost) {
    online.updateConfig({ theme: themeId });
  }
}

dom.themeBtn.addEventListener('click', () => {
  sfx.click();
  const next = lobbyState.theme === 'nusantara' ? 'neo' : 'nusantara';
  applyThemeChoice(next);
});

dom.soundBtn.addEventListener('click', () => {
  const muted = sfx.toggleMute();
  dom.soundBtn.textContent = muted ? '🔇' : '🔊';
  dom.soundBtn.title = muted ? 'Suara Mati' : 'Suara Aktif';
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

dom.lobbyBtn.addEventListener('click', () => {
  sfx.click();
  renderSetupModal();
  renderOnlineRoom();
  dom.setupModal.classList.add('open');
});
dom.closeSetupBtn.addEventListener('click', () => {
  sfx.click();
  dom.setupModal.classList.remove('open');
});

// ----------------------------------------------------------------------------
// Lobby Tabs, Mode, Theme & Local Roster Setup
// ----------------------------------------------------------------------------

function syncModalFooterCTA() {
  const isLocal = lobbyState.tab === 'local';
  dom.startMatchBtn.style.display = isLocal ? 'block' : 'none';
  if (!isLocal && online.isConnected && online.isHost) {
    dom.startOnlineBtn.style.display = 'block';
  } else {
    dom.startOnlineBtn.style.display = 'none';
  }
}

function switchLobbyTab(tab) {
  lobbyState.tab = tab;
  document.querySelectorAll('.lobby-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  dom.tabLocal.classList.toggle('active', tab === 'local');
  dom.tabOnline.classList.toggle('active', tab === 'online');
  syncModalFooterCTA();
}

// 2.5D Tabletop Perspective Toggle
let isTilted = false;
dom.tiltBtn?.addEventListener('click', () => {
  isTilted = !isTilted;
  sfx.click();
  dom.boardStage.classList.toggle('tilt-3d', isTilted);
  dom.tiltBtn.classList.toggle('active', isTilted);
  dom.tiltBtn.textContent = isTilted ? '📐 2D' : '🧊 2.5D';
  setTimeout(() => fx.resize(), 360);
});

document.querySelectorAll('.lobby-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    sfx.click();
    switchLobbyTab(btn.dataset.tab);
  });
});

document.querySelectorAll('.theme-card').forEach((card) => {
  card.addEventListener('click', () => {
    if (online.isConnected && !online.isHost) return;
    sfx.click();
    applyThemeChoice(card.dataset.themePick);
  });
});

document.querySelectorAll('.mode-card').forEach((card) => {
  card.addEventListener('click', () => {
    if (online.isConnected && !online.isHost) return;
    lobbyState.mode = card.dataset.mode;
    sfx.click();
    renderSetupModal();
    if (online.isConnected && online.isHost) {
      online.updateConfig({ mode: lobbyState.mode });
    }
  });
});

function renderSetupModal() {
  const theme = getTheme(lobbyState.theme);
  const heroes = theme.heroes;
  dom.setupModalTitle.textContent = `⚡ ${theme.brandTitle} — ${theme.brandPill}`;

  document.querySelectorAll('.theme-card').forEach((card) => {
    card.classList.toggle('selected', card.dataset.themePick === lobbyState.theme);
  });
  document.querySelectorAll('.mode-card').forEach((card) => {
    card.classList.toggle('selected', card.dataset.mode === lobbyState.mode);
  });

  const cycleRole = { human: 'ai', ai: 'off', off: 'human' };
  const roleLabels = {
    human: '👤 HUMAN',
    ai: '🤖 AI BOT',
    off: '⛔ OFF',
  };

  dom.setupHeroesGrid.innerHTML = heroes.map((h, idx) => {
    const role = lobbyState.roles[idx];
    return `
      <div class="setup-hero-card ${role}" data-hero-idx="${idx}" style="--hero-color:${h.color}; --hero-glow:${h.glow}">
        <div class="setup-hero-top">
          <div class="setup-avatar">${h.svgAvatar}</div>
          <div>
            <div class="setup-hero-name">${h.emoji} ${h.name}</div>
            <div class="setup-hero-skill">⚡ ${h.skillName} • 💥 ${h.koText}</div>
          </div>
        </div>
        <p class="setup-hero-desc">${h.skillDesc}</p>
        <button type="button" class="role-toggle-btn ${role}" data-hero-idx="${idx}">
          ${roleLabels[role]}
        </button>
      </div>
    `;
  }).join('');

  dom.setupHeroesGrid.querySelectorAll('.role-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.heroIdx);
      lobbyState.roles[idx] = cycleRole[lobbyState.roles[idx]];
      sfx.click();
      renderSetupModal();
    });
  });

  const activeCount = lobbyState.roles.filter((r) => r !== 'off').length;
  dom.setupError.textContent = activeCount < 2 ? 'Minimal pilih 2 pemain aktif untuk memulai!' : '';
  dom.startMatchBtn.disabled = activeCount < 2;
}

function launchLocalMatch() {
  if (online.isConnected) {
    online.disconnect();
  }
  const heroes = getHeroesForTheme(lobbyState.theme);
  const playerConfigs = heroes.map((h, idx) => ({
    heroId: h.id,
    type: lobbyState.roles[idx],
    name: null,
  }));
  dom.battleLog.innerHTML = '';
  dom.setupModal.classList.remove('open');
  dom.victoryModal.classList.remove('open');
  sfx.skillActivate();
  renderEmoteBar(lobbyState.theme);
  renderHelpGuide(lobbyState.theme);
  engine.startMatch({
    mode: lobbyState.mode,
    theme: lobbyState.theme,
    playerConfigs,
  });
  fx.resize();
}

dom.startMatchBtn.addEventListener('click', launchLocalMatch);

// ----------------------------------------------------------------------------
// Online Multiplayer Room UI
// ----------------------------------------------------------------------------

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

  const baseUrl = window.location.hostname === 'localhost' && lobbyState.lanUrls[0]
    ? lobbyState.lanUrls[0]
    : window.location.origin;
  const inviteUrl = `${baseUrl}/?room=${room.code}`;
  const hintPrefix = online.transport === 'webrtc'
    ? '🌐 Link Mabar Online (WebRTC — Bisa Beda Wi-Fi/Kota!)'
    : '🔗 Link 1 Wi-Fi / LAN';
  dom.lanUrlHint.innerHTML = `${hintPrefix}: <code>${inviteUrl}</code>`;

  dom.onlineSeatsGrid.innerHTML = room.seats.map((seat) => {
    const h = heroes[seat.seatIndex];
    const isMe = seat.seatIndex === online.seatIndex;
    const isHostSeat = seat.clientId && seat.clientId === room.hostId;

    let statusText = '';
    if (seat.clientId) {
      statusText = `${isHostSeat ? '👑 ' : '👤 '}${seat.name}${isMe ? ' (KAMU)' : ''}`;
    } else if (seat.type === 'ai') {
      statusText = '🤖 AI BOT (Kosong)';
    } else {
      statusText = '⛔ SLOT NONAKTIF';
    }

    const canToggle = online.isHost && !seat.clientId;
    return `
      <div class="setup-hero-card ${seat.type}" style="--hero-color:${h.color}; --hero-glow:${h.glow}">
        <div class="setup-hero-top">
          <div class="setup-avatar">${h.svgAvatar}</div>
          <div>
            <div class="setup-hero-name">${h.emoji} ${h.name}</div>
            <div class="setup-hero-skill">${seat.connected ? '🟢 Online' : seat.clientId ? '🟡 Menyambung...' : h.title}</div>
          </div>
        </div>
        <button type="button"
          class="role-toggle-btn ${seat.clientId ? 'human' : seat.type}"
          data-online-seat="${seat.seatIndex}"
          ${!canToggle ? 'disabled' : ''}>
          ${statusText}
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
    dom.onlineStatusMsg.textContent = 'Bagikan kode room ke temanmu, lalu klik MULAI MATCH ONLINE!';
  } else {
    dom.onlineStatusMsg.textContent = '⏳ Terhubung! Menunggu Host memulai pertandingan...';
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
    dom.onlineError.textContent = 'Masukkan 4 huruf/angka Kode Room!';
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
  const baseUrl = window.location.hostname === 'localhost' && lobbyState.lanUrls[0]
    ? lobbyState.lanUrls[0]
    : window.location.origin;
  const link = `${baseUrl}/?room=${online.roomCode}`;
  try {
    await navigator.clipboard.writeText(link);
    dom.copyLinkBtn.textContent = '✅ Link Tersalin!';
    setTimeout(() => {
      dom.copyLinkBtn.textContent = '📋 Salin Link Invite';
    }, 1800);
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
      dom.victorySubtitle.textContent = 'Menunggu Host menekan Main Lagi...';
    }
    return;
  }
  launchLocalMatch();
});

dom.backLobbyBtn.addEventListener('click', () => {
  sfx.click();
  dom.victoryModal.classList.remove('open');
  renderSetupModal();
  renderOnlineRoom();
  dom.setupModal.classList.add('open');
});

// ----------------------------------------------------------------------------
// Populate How-to-Play Guide
// ----------------------------------------------------------------------------

function renderHelpGuide(themeId) {
  const heroes = getHeroesForTheme(themeId);
  const heroRows = heroes.map(
    (h) => `<div class="guide-item" style="border-left-color:${h.color}">
      <strong style="color:${h.color}">${h.emoji} ${h.name} — ${h.skillName}</strong>
      <span>${h.skillDesc}</span>
      <span style="color:#ffb703;font-weight:700;">💥 Finisher: ${h.koText}</span>
    </div>`
  ).join('');

  const diceRows = Object.values(DICE_TYPES).map(
    (d) => `<div class="guide-item" style="border-left-color:${d.color}">
      <strong style="color:${d.color}">${d.icon} ${d.name} (${d.short})</strong>
      <span>${d.desc}</span>
    </div>`
  ).join('');

  const eventRows = BOARD_EVENTS.map(
    (e) => `<div class="guide-item" style="border-left-color:${e.color}">
      <strong style="color:${e.color}">${e.icon} ${e.name}</strong>
      <span>${e.desc}</span>
    </div>`
  ).join('');

  dom.helpBody.innerHTML = `
    <div class="guide-section">
      <h4>⚡ Aturan Ludo Zaman Now</h4>
      <ul class="guide-list">
        <li><strong>Wajib Angka 6 Keluar Markas:</strong> Semua pion mulai di markas. Lempar dadu <strong>6</strong> untuk mengeluarkan pion ke titik Start sekaligus dapat Bonus Turn!</li>
        <li><strong>Efek KO Khusus:</strong> Setiap hero punya animasi & suara KO unik (<em>Cyber Laser</em>, <em>Meteor Smash</em>, <em>Petir Kilat</em>, & <em>Black Hole</em>)!</li>
        <li><strong>Power Hold Roll:</strong> Tahan tombol <em>LEMPAR DADU</em> (atau <code>SPACE</code>) buat atur tenaga lemparan, atau klik cepat.</li>
        <li><strong>🌐 Multiplayer Online:</strong> Masuk tab <em>Multiplayer Online</em> di Lobby, buat room, lalu bagikan kode 4 huruf / link ke teman (bisa 1 Wi-Fi atau beberapa tab browser)!</li>
      </ul>
    </div>
    <div class="guide-section">
      <h4>🦸 Hero, Skill Overdrive & Efek KO</h4>
      <div class="guide-grid">${heroRows}</div>
    </div>
    <div class="guide-section">
      <h4>🎲 Tactical Dice Loadout</h4>
      <div class="guide-grid">${diceRows}</div>
    </div>
    <div class="guide-section">
      <h4>🚨 Dynamic Board Events</h4>
      <div class="guide-grid">${eventRows}</div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// Initial Boot + Auto-Detect ?room=XXXX Invite Links
// ----------------------------------------------------------------------------

renderEmoteBar(lobbyState.theme);
renderHelpGuide(lobbyState.theme);
renderSetupModal();

// Preview match behind setup modal
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

// Check URL for ?room=XXXX invite link
const urlRoom = new URLSearchParams(window.location.search).get('room');
if (urlRoom && /^[A-Za-z0-9]{4}$/.test(urlRoom.trim())) {
  switchLobbyTab('online');
  dom.joinCodeInput.value = urlRoom.trim().toUpperCase();
  dom.onlineNameInput.value = 'Teman' + Math.floor(10 + Math.random() * 89);
}

dom.setupModal.classList.add('open');
