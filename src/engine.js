// ============================================================================
// LUDO OVERDRIVE — Core Game State Machine, Strict-6 Exit, Themes, KO FX & Online Sync
// ============================================================================

import {
  getTheme,
  getHeroesForTheme,
  MAIN_TRACK,
  HOME_STRETCHES,
  BASE_SLOTS,
  ALL_SAFE_INDICES,
  MYSTERY_TILES,
  PORTAL_PAIR,
  TURBO_TILES,
  MAX_PROGRESS,
  OVERDRIVE_COST,
  INITIAL_ENERGY,
  SWAP_MAX_RANGE,
  DICE_TYPES,
  SPECIAL_DICE_POOL,
  BOARD_EVENTS,
} from './constants.js';
import { stripEmoji } from './icons.js';
import { sfx } from './sound.js';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Deterministic PRNG (Mulberry32) so Online Multiplayer stays 100% in sync!
function createPRNG(seed) {
  let a = (seed >>> 0) || 123456789;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getGlobalTrackIndex(playerStartIdx, progress) {
  if (progress < 0 || progress > 50) return null;
  return (playerStartIdx + progress) % 52;
}

export function getPawnGridPos(playerId, pawn) {
  if (pawn.progress < 0) {
    return BASE_SLOTS[playerId][pawn.index];
  }
  if (pawn.progress <= 50) {
    const gIdx = getGlobalTrackIndex(playerId * 13, pawn.progress);
    return MAIN_TRACK[gIdx];
  }
  const homeIdx = Math.min(5, pawn.progress - 51);
  return HOME_STRETCHES[playerId][homeIdx];
}

export const ONLINE_TURN_SEC = 20;

export class GameEngine {
  constructor({ onRender, onLog, onEmote, fx, onDispatchOnlineAction, onTimerTick, onNotice, onRollJackpot, onKOContext }) {
    this.onRender = onRender;
    this.onLog = onLog;
    this.onEmote = onEmote;
    this.fx = fx;
    this.onDispatchOnlineAction = onDispatchOnlineAction;
    this.onTimerTick = onTimerTick;
    this.onNotice = onNotice;
    this.onRollJackpot = onRollJackpot;
    this.onKOContext = onKOContext;
    this.state = null;
    this._aiTimer = null;
    this._autoMoveTimer = null;
    this._turnInterval = null;
    this._turnTimerKey = null;
    this._turnRemaining = null;
    this._rand = Math.random;
    this._actionQueue = Promise.resolve();
  }

  startMatch({
    mode = 'blitz',
    theme = 'nusantara',
    playerConfigs = null,
    seed = null,
    online = null, // null | { enabled: true, isHost, mySeatIndex, roomCode }
  }) {
    clearTimeout(this._aiTimer);
    clearTimeout(this._autoMoveTimer);
    this._stopTurnTimer();
    this._actionQueue = Promise.resolve();

    const matchSeed = seed ?? Math.floor(Math.random() * 2_000_000_000) + 1;
    this._rand = createPRNG(matchSeed);

    const heroes = getHeroesForTheme(theme);
    const pawnsPerPlayer = mode === 'blitz' ? 2 : 4;
    const configs = playerConfigs || [
      { heroId: 0, type: 'human', name: null },
      { heroId: 1, type: 'ai', name: null },
      { heroId: 2, type: 'ai', name: null },
      { heroId: 3, type: 'ai', name: null },
    ];

    const activePlayers = configs
      .filter((c) => c.type !== 'off')
      .map((c) => {
        const hero = heroes[c.heroId];
        const pawns = [];
        for (let i = 0; i < pawnsPerPlayer; i++) {
          pawns.push({
            id: `p${hero.id}_${i}`,
            playerId: hero.id,
            index: i,
            // STRICT CLASSIC RULE: All pawns start in Home Base! Need a 6 to exit!
            progress: -1,
            isAce: false,
            shieldTurns: 0,
            dizzyTurns: 0,
            finished: false,
          });
        }
        return {
          id: hero.id,
          hero,
          displayName: c.name || null,
          type: c.type, // 'human' | 'ai'
          pawns,
          energy: INITIAL_ENERGY,
          diceInventory: [this._randomSpecialDice(), this._randomSpecialDice()],
          kills: 0,
          finishedCount: 0,
        };
      });

    this.state = {
      mode,
      theme,
      matchSeed,
      online: online || { enabled: false, isHost: true, mySeatIndex: null, roomCode: null },
      pawnsPerPlayer,
      players: activePlayers,
      turnOrderIdx: 0,
      direction: 1,
      turnCount: 1,
      roundNumber: 1,
      phase: 'WAITING_ROLL',
      selectedDice: 'normal',
      rolledValue: null,
      rolledDiceId: 'normal',
      powerCharge: 0.5,
      validPawnIds: [],
      consecutiveBonusRolls: 0,
      pendingFollowUp: null,
      sparkySplitArmed: false,
      phaseDashActive: false,
      skillTempOwnPawnId: null,
      activeEvent: null,
      nextEventInRounds: 3,
      slimeTraps: {},
      mysteryActive: new Set(MYSTERY_TILES),
      winner: null,
    };

    const modeTxt = mode === 'blitz' ? 'BLITZ 2 Pion' : 'CLASSIC 4 Pion';
    const roomTxt = this.state.online.enabled ? ` [ROOM ${this.state.online.roomCode}]` : '';
    this._log(`⚡ Match dimulai (${modeTxt})${roomTxt}! Wajib angka 6 untuk keluar dari markas!`, heroes[0].color);
    this._render();
    this._scheduleAIIfNeeded();
  }

  setTheme(themeId) {
    if (!this.state) return;
    this.state.theme = themeId;
    const heroes = getHeroesForTheme(themeId);
    for (const pl of this.state.players) {
      pl.hero = heroes[pl.id];
    }
    this._render();
  }

  _randomSpecialDice() {
    return SPECIAL_DICE_POOL[Math.floor(this._rand() * SPECIAL_DICE_POOL.length)];
  }

  get currentPlayer() {
    if (!this.state) return null;
    return this.state.players[this.state.turnOrderIdx];
  }

  getPlayerById(id) {
    return this.state?.players.find((p) => p.id === id) || null;
  }

  canLocalControlCurrentPlayer() {
    const p = this.currentPlayer;
    if (!p || p.type !== 'human') return false;
    if (!this.state.online.enabled) return true;
    return p.id === this.state.online.mySeatIndex;
  }

  _isSafeTile(trackIdx) {
    if (this.state.activeEvent && this.state.activeEvent.id === 'blackout') {
      return false;
    }
    return ALL_SAFE_INDICES.includes(trackIdx);
  }

  _addEnergy(player, amount) {
    const mult = this.state.activeEvent?.id === 'surge' ? 2 : 1;
    player.energy = Math.min(OVERDRIVE_COST, player.energy + amount * mult);
  }

  _log(text, color = '#cbd5e1') {
    if (this.onLog) this.onLog(stripEmoji(text), color);
  }

  _render() {
    this._syncTurnTimer();
    if (this.onRender) this.onRender(this.state);
  }

  // --------------------------------------------------------------------------
  // Online Anti-AFK Turn Timer (20s per human decision; Host auto-resolves)
  // --------------------------------------------------------------------------

  _stopTurnTimer() {
    clearInterval(this._turnInterval);
    this._turnInterval = null;
    this._turnTimerKey = null;
    this._turnRemaining = null;
    this.onTimerTick?.(null, false);
  }

  _syncTurnTimer() {
    if (!this.state || !this.state.online.enabled) {
      if (this._turnInterval) this._stopTurnTimer();
      return;
    }
    const p = this.currentPlayer;
    const waitingPhases = ['WAITING_ROLL', 'SELECT_PAWN', 'SKILL_SELECT_OWN', 'SKILL_SELECT_ENEMY'];
    if (!p || p.type !== 'human' || !waitingPhases.includes(this.state.phase)) {
      if (this._turnInterval || this._turnRemaining !== null) this._stopTurnTimer();
      return;
    }

    const key = `${this.state.turnCount}:${this.state.consecutiveBonusRolls}:${p.id}:${this.state.phase}`;
    if (this._turnTimerKey === key) return;

    clearInterval(this._turnInterval);
    this._turnTimerKey = key;
    this._turnRemaining = ONLINE_TURN_SEC;
    const isMyTurn = p.id === this.state.online.mySeatIndex;
    this.onTimerTick?.(this._turnRemaining, isMyTurn);

    this._turnInterval = setInterval(() => {
      if (!this.state || this._turnTimerKey !== key) {
        this._stopTurnTimer();
        return;
      }
      this._turnRemaining = Math.max(0, this._turnRemaining - 1);
      const mine = this.currentPlayer?.id === this.state.online.mySeatIndex;
      this.onTimerTick?.(this._turnRemaining, mine);
      if (mine && this._turnRemaining > 0 && this._turnRemaining <= 5) {
        sfx.timerTick(this._turnRemaining <= 3);
      }
      if (this._turnRemaining <= 0) {
        this._stopTurnTimer();
        this._handleOnlineAFKTimeout();
      }
    }, 1000);
  }

  _handleOnlineAFKTimeout() {
    if (!this.state || !this.state.online.enabled) return;
    const p = this.currentPlayer;
    if (!p || p.type !== 'human') return;
    this.onNotice?.(`Waktu giliran ${p.displayName || p.hero.name} habis — langkah otomatis!`, 'hourglass');
    if (!this.state.online.isHost) return;

    if (this.state.phase === 'SKILL_SELECT_OWN' || this.state.phase === 'SKILL_SELECT_ENEMY') {
      this.onDispatchOnlineAction?.('cancel_skill', {});
      setTimeout(() => {
        if (this.state?.phase === 'WAITING_ROLL') {
          this.onDispatchOnlineAction?.('roll_dice', { power: 0.5 });
        }
      }, 150);
    } else if (this.state.phase === 'WAITING_ROLL') {
      this.onDispatchOnlineAction?.('roll_dice', { power: 0.5 });
    } else if (this.state.phase === 'SELECT_PAWN' && this.state.validPawnIds.length > 0) {
      const best = this._aiChooseBestPawn(p, this.state.validPawnIds, this.state._currentMoveSteps, this.state.rolledDiceId);
      this.onDispatchOnlineAction?.('select_pawn', { pawnId: best });
    }
  }

  // --------------------------------------------------------------------------
  // Online Action Queue (Ensures every client executes actions sequentially)
  // --------------------------------------------------------------------------

  enqueueRemoteAction(action) {
    this._actionQueue = this._actionQueue
      .then(() => this._applyRemoteAction(action))
      .catch(() => {});
  }

  async _applyRemoteAction(action) {
    if (!this.state) return;
    const { type, payload = {}, senderSeat } = action;
    if (type === 'player_to_bot') {
      const target = this.getPlayerById(payload.seatIndex);
      if (target && target.type !== 'ai') {
        const who = payload.name || target.displayName || target.hero.name;
        target.type = 'ai';
        target.displayName = null;
        this.onNotice?.(`${who} terputus — AI Bot mengambil alih ${target.hero.name}!`, 'bot');
        this._render();
        // If it's currently their turn, Host immediately lets AI take over!
        if (this.currentPlayer?.id === target.id && this.state.online.isHost) {
          if (this.state.phase === 'WAITING_ROLL') {
            this._scheduleAIIfNeeded();
          } else if (this.state.phase === 'SKILL_SELECT_OWN' || this.state.phase === 'SKILL_SELECT_ENEMY') {
            this.onDispatchOnlineAction?.('cancel_skill', {});
            setTimeout(() => this._scheduleAIIfNeeded(), 200);
          } else if (this.state.phase === 'SELECT_PAWN' && this.state.validPawnIds.length > 0) {
            const best = this._aiChooseBestPawn(target, this.state.validPawnIds, this.state._currentMoveSteps, this.state.rolledDiceId);
            this.onDispatchOnlineAction?.('select_pawn', { pawnId: best });
          }
        }
      }
      return;
    }
    if (type === 'emote') {
      if (this.onEmote) this.onEmote(payload.heroId ?? senderSeat, payload.text);
      return;
    }
    if (type === 'select_dice') {
      this._doSelectDice(payload.diceId);
      return;
    }
    if (type === 'activate_skill') {
      this._doActivateOverdriveSkill();
      return;
    }
    if (type === 'cancel_skill') {
      this._doCancelSkillSelection();
      return;
    }
    if (type === 'roll_dice') {
      await this._doRollDice(payload.power ?? 0.5);
      return;
    }
    if (type === 'select_pawn') {
      await this._doSelectPawn(payload.pawnId);
      return;
    }
  }

  // --------------------------------------------------------------------------
  // Public Local UI Input Handlers (Route through server when Online!)
  // --------------------------------------------------------------------------

  selectDice(diceId) {
    if (!this.state || this.state.phase !== 'WAITING_ROLL') return;
    if (!this.canLocalControlCurrentPlayer()) return;
    if (this.state.online.enabled) {
      this.onDispatchOnlineAction?.('select_dice', { diceId });
      return;
    }
    this._doSelectDice(diceId);
  }

  cancelSkillSelection() {
    if (!this.state) return;
    if (!this.canLocalControlCurrentPlayer()) return;
    if (this.state.online.enabled) {
      this.onDispatchOnlineAction?.('cancel_skill', {});
      return;
    }
    this._doCancelSkillSelection();
  }

  activateOverdriveSkill() {
    if (!this.state || this.state.phase !== 'WAITING_ROLL') return;
    if (!this.canLocalControlCurrentPlayer()) return;
    if (this.state.online.enabled) {
      this.onDispatchOnlineAction?.('activate_skill', {});
      return;
    }
    this._doActivateOverdriveSkill();
  }

  async rollDice(powerLevel = 0.5) {
    if (!this.state || this.state.phase !== 'WAITING_ROLL') return;
    if (!this.canLocalControlCurrentPlayer()) return;
    if (this.state.online.enabled) {
      this.onDispatchOnlineAction?.('roll_dice', { power: powerLevel });
      return;
    }
    await this._doRollDice(powerLevel);
  }

  async selectPawn(pawnId) {
    if (!this.state) return;
    if (!this.canLocalControlCurrentPlayer()) return;
    if (!this.state.validPawnIds.includes(pawnId)) return;
    if (this.state.online.enabled) {
      this.onDispatchOnlineAction?.('select_pawn', { pawnId });
      return;
    }
    await this._doSelectPawn(pawnId);
  }

  // --------------------------------------------------------------------------
  // Internal State Transitions
  // --------------------------------------------------------------------------

  _doSelectDice(diceId) {
    if (!this.state || this.state.phase !== 'WAITING_ROLL') return;
    const p = this.currentPlayer;
    if (diceId !== 'normal' && !p.diceInventory.includes(diceId)) return;
    sfx.click();
    this.state.selectedDice = diceId;
    this._render();
  }

  _doCancelSkillSelection() {
    if (!this.state) return;
    const p = this.currentPlayer;
    if (this.state.phase === 'SKILL_SELECT_OWN' || this.state.phase === 'SKILL_SELECT_ENEMY') {
      this.state.phase = 'WAITING_ROLL';
      this.state.skillTempOwnPawnId = null;
      this.state.validPawnIds = [];
      sfx.click();
      this._render();
      return;
    }
    // Also allow canceling armed Sparky Split / Phantom Phase Dash before rolling!
    if (this.state.phase === 'WAITING_ROLL' && p && (this.state.sparkySplitArmed || this.state.phaseDashActive)) {
      this.state.sparkySplitArmed = false;
      this.state.phaseDashActive = false;
      p.energy = OVERDRIVE_COST;
      sfx.click();
      this.onNotice?.(`Skill ${p.hero.skillName} dibatalkan — energi kembali 100%!`, 'info');
      this._render();
    }
  }

  _getSwapEnemiesForOwnPawn(myPlayer, ownPawn) {
    if (!ownPawn || ownPawn.progress < 0 || ownPawn.progress > 50) return [];
    const ownGlobal = getGlobalTrackIndex(myPlayer.hero.startIdx, ownPawn.progress);
    const list = [];
    for (const pl of this.state.players) {
      if (pl.id === myPlayer.id) continue;
      for (const pw of pl.pawns) {
        if (pw.progress < 0 || pw.progress > 50 || pw.finished) continue;
        if (pw.shieldTurns > 0) continue; // Cannot swap shielded pawns!
        const eGlobal = getGlobalTrackIndex(pl.hero.startIdx, pw.progress);
        if (this._isSafeTile(eGlobal)) continue; // Cannot swap pawns on Safe Zones!
        const dist = Math.min((ownGlobal - eGlobal + 52) % 52, (eGlobal - ownGlobal + 52) % 52);
        if (dist > 0 && dist <= SWAP_MAX_RANGE) {
          list.push(pw);
        }
      }
    }
    return list;
  }

  _getValidOwnSwapPawns(myPlayer) {
    return myPlayer.pawns.filter(
      (pw) => pw.progress >= 0 && pw.progress <= 50 && !pw.finished && this._getSwapEnemiesForOwnPawn(myPlayer, pw).length > 0
    );
  }

  _doActivateOverdriveSkill() {
    if (!this.state || this.state.phase !== 'WAITING_ROLL') return;
    const p = this.currentPlayer;
    if (p.energy < OVERDRIVE_COST) return;

    const key = p.hero.key;
    if (key === 'kitsune') {
      const validOwn = this._getValidOwnSwapPawns(p);
      if (validOwn.length === 0) {
        const msg = `${p.hero.skillName} butuh lawan dalam jarak maks. ${SWAP_MAX_RANGE} petak (di luar Safe Zone/Perisai)!`;
        this._log(msg, '#fb7185');
        this.onNotice?.(msg, 'alert');
        sfx.click();
        return;
      }
      sfx.skillActivate();
      if (validOwn.length === 1) {
        this.state.skillTempOwnPawnId = validOwn[0].id;
        const enemies = this._getSwapEnemiesForOwnPawn(p, validOwn[0]);
        this.state.phase = 'SKILL_SELECT_ENEMY';
        this.state.validPawnIds = enemies.map((pw) => pw.id);
        this._log(`${p.hero.emoji} Pilih pion LAWAN (petak merah) untuk ${p.hero.skillName}!`, p.hero.color);
      } else {
        this.state.phase = 'SKILL_SELECT_OWN';
        this.state.validPawnIds = validOwn.map((pw) => pw.id);
        this._log(`${p.hero.emoji} Pilih pion ${p.hero.name} untuk ${p.hero.skillName}!`, p.hero.color);
      }
      this._render();
      return;
    }

    if (key === 'titan') {
      const ownTrackPawns = p.pawns.filter((pw) => pw.progress >= 0 && pw.progress <= 50);
      if (ownTrackPawns.length === 0) {
        const msg = `${p.hero.skillName} butuh minimal 1 pion di jalur utama!`;
        this._log(msg, '#fb7185');
        this.onNotice?.(msg, 'alert');
        sfx.click();
        return;
      }
      sfx.skillActivate();
      // Always enter SKILL_SELECT_OWN so player sees target highlight & can cancel misclicks!
      this.state.phase = 'SKILL_SELECT_OWN';
      this.state.validPawnIds = ownTrackPawns.map((pw) => pw.id);
      this._log(`${p.hero.emoji} Ketuk pion ${p.hero.name} untuk pasang ${p.hero.skillName} (atau Batal)!`, p.hero.color);
      this._render();
      return;
    }

    if (key === 'sparky') {
      if (this.state.sparkySplitArmed) return;
      p.energy = 0;
      this.state.sparkySplitArmed = true;
      sfx.skillActivate();
      this._log(`${p.hero.emoji} ${p.hero.name} mengaktifkan ${p.hero.skillName.toUpperCase()}!`, p.hero.color);
      this.fx?.shake('light');
      this._render();
      return;
    }

    if (key === 'phantom') {
      if (this.state.phaseDashActive) return;
      p.energy = 0;
      this.state.phaseDashActive = true;
      sfx.skillActivate();
      this._log(`${p.hero.emoji} ${p.hero.name} mengaktifkan ${p.hero.skillName.toUpperCase()}! (+3 langkah & tembus perisai/slime!)`, p.hero.color);
      this.fx?.shake('light');
      this._render();
      return;
    }
  }

  _applyTitanShield(player, pawn) {
    player.energy = 0;
    pawn.shieldTurns = 2;
    this.state.phase = 'WAITING_ROLL';
    this.state.validPawnIds = [];
    const [r, c] = getPawnGridPos(player.id, pawn);
    this.fx?.ringAtGrid(r, c, player.hero.color);
    this.fx?.floatingTextAtGrid(r, c, `🛡️ ${player.hero.skillName.toUpperCase()}!`, player.hero.color, true);
    this._log(`${player.hero.emoji} ${player.hero.name} memasang ${player.hero.skillName} (2 ronde)!`, player.hero.color);
    this._render();
  }

  async _executeKitsuneSwap(player, ownPawn, enemyPawn) {
    player.energy = 0;
    this.state.phase = 'ANIMATING';
    this.state.validPawnIds = [];
    this.state.skillTempOwnPawnId = null;

    const enemyPlayer = this.getPlayerById(enemyPawn.playerId);
    const ownGlobal = getGlobalTrackIndex(player.hero.startIdx, ownPawn.progress);
    const enemyGlobal = getGlobalTrackIndex(enemyPlayer.hero.startIdx, enemyPawn.progress);

    const [r1, c1] = MAIN_TRACK[ownGlobal];
    const [r2, c2] = MAIN_TRACK[enemyGlobal];

    sfx.glitch();
    this.fx?.burstAtGrid(r1, c1, player.hero.color, 26, 4.5);
    this.fx?.burstAtGrid(r2, c2, enemyPlayer.hero.color, 26, 4.5);
    this.fx?.floatingTextAtGrid(r1, c1, `${player.hero.emoji} SWAP!`, player.hero.color, true);
    this.fx?.floatingTextAtGrid(r2, c2, `${player.hero.emoji} SWAPPED!`, player.hero.color, true);
    this.fx?.shake('heavy');

    const newOwnProgress = (enemyGlobal - player.hero.startIdx + 52) % 52;
    const newEnemyProgress = (ownGlobal - enemyPlayer.hero.startIdx + 52) % 52;
    ownPawn.progress = Math.min(50, newOwnProgress);
    enemyPawn.progress = Math.min(50, newEnemyProgress);

    this._log(`${player.hero.emoji} ${player.hero.name} menukar posisi pion dengan ${enemyPlayer.hero.name}!`, player.hero.color);
    this._render();
    await sleep(420);
    this.state.phase = 'WAITING_ROLL';
    this._render();
  }

  _getAllEnemyTrackPawns(myPlayerId) {
    const list = [];
    for (const pl of this.state.players) {
      if (pl.id === myPlayerId) continue;
      for (const pw of pl.pawns) {
        if (pw.progress >= 0 && pw.progress <= 50 && !pw.finished) {
          list.push(pw);
        }
      }
    }
    return list;
  }

  // --------------------------------------------------------------------------
  // Rolling Dice
  // --------------------------------------------------------------------------

  async _doRollDice(powerLevel = 0.5) {
    if (!this.state || this.state.phase !== 'WAITING_ROLL') return;
    const player = this.currentPlayer;
    const diceId = this.state.selectedDice;
    const diceDef = DICE_TYPES[diceId];

    if (diceId !== 'normal') {
      const idx = player.diceInventory.indexOf(diceId);
      if (idx !== -1) player.diceInventory.splice(idx, 1);
    }

    this.state.phase = 'ROLLING';
    this.state.rolledDiceId = diceId;
    this.state.powerCharge = powerLevel;
    this._render();

    if (powerLevel > 0.72) {
      this.fx?.shake('light');
    }

    for (let i = 0; i < 6; i++) {
      const previewFace = diceDef.faces[Math.floor(this._rand() * diceDef.faces.length)];
      this.state.rolledValue = previewFace;
      sfx.diceTick(0.85 + i * 0.08);
      this._render();
      await sleep(72);
    }

    const finalFace = this._pickDiceFace(diceDef.faces, powerLevel);
    this.state.rolledValue = finalFace;
    sfx.diceLand(finalFace >= 6);
    if (finalFace >= 6) {
      this.fx?.shake('light');
      this.onRollJackpot?.(finalFace, player.hero.color);
      if (typeof navigator !== 'undefined') navigator.vibrate?.(22);
    }

    let effectiveSteps = finalFace;
    if (this.state.phaseDashActive && finalFace >= 0) {
      effectiveSteps = finalFace + 3;
      this._log(`${player.hero.emoji} ${player.hero.skillName} aktif! Dadu ${finalFace} + 3 = ${effectiveSteps} langkah!`, player.hero.color);
    }

    const faceLabel = finalFace === -2 ? '💀 (-2)' : `${finalFace}`;
    this._log(`${player.hero.emoji} ${player.hero.name} melempar Dadu ${diceDef.name} → ${faceLabel}`, player.hero.color);

    // Sparky / Macan-V Split Step
    if (this.state.sparkySplitArmed && effectiveSteps >= 2) {
      const activePawns = player.pawns.filter((pw) => !pw.finished && pw.progress >= 0);
      const basePawns = player.pawns.filter((pw) => !pw.finished && pw.progress === -1);
      if (activePawns.length >= 2 || (activePawns.length >= 1 && basePawns.length >= 1 && finalFace === 6)) {
        const part1 = Math.ceil(effectiveSteps / 2);
        const part2 = Math.floor(effectiveSteps / 2);
        this.state.sparkySplitArmed = false;
        this.state.pendingFollowUp = { type: 'split', steps: part2, rawFace: finalFace };
        this._log(`${player.hero.emoji} ${player.hero.skillName} memecah ${effectiveSteps} jadi [${part1}] + [${part2}]!`, player.hero.color);
        await this._enterPawnSelection(player, part1, diceId, finalFace);
        return;
      } else {
        this.state.sparkySplitArmed = false;
        effectiveSteps += 3;
        this._log(`${player.hero.emoji} ${player.hero.skillName} → +3 TURBO (${effectiveSteps} langkah)!`, player.hero.color);
      }
    } else if (this.state.sparkySplitArmed) {
      this.state.sparkySplitArmed = false;
    }

    if (diceId === 'mirror' && effectiveSteps > 0) {
      this.state.pendingFollowUp = { type: 'mirror', steps: effectiveSteps, rawFace: finalFace };
    }

    await this._enterPawnSelection(player, effectiveSteps, diceId, finalFace);
  }

  _pickDiceFace(faces, power) {
    const r = this._rand();
    if (power < 0.28 && r < 0.35) {
      return faces[Math.floor(this._rand() * Math.ceil(faces.length / 2))];
    }
    if (power > 0.72 && r < 0.35) {
      const half = Math.floor(faces.length / 2);
      return faces[half + Math.floor(this._rand() * (faces.length - half))];
    }
    return faces[Math.floor(this._rand() * faces.length)];
  }

  // STRICT RULE: Only rolling 6 allows a pawn to exit Home Base!
  _getValidPawnsForSteps(player, steps, rawFace, excludePawnId = null) {
    const canDeploy = rawFace === 6;
    const valid = [];
    for (const pw of player.pawns) {
      if (pw.finished) continue;
      if (excludePawnId && pw.id === excludePawnId) continue;

      if (pw.progress === -1) {
        if (canDeploy) valid.push(pw.id);
      } else if (steps < 0) {
        if (pw.progress >= 1 && pw.progress <= 50) valid.push(pw.id);
      } else if (steps > 0) {
        if (pw.progress + steps <= MAX_PROGRESS) valid.push(pw.id);
      }
    }
    return valid;
  }

  async _enterPawnSelection(player, steps, diceId, rawFace, excludePawnId = null) {
    this.state._currentMoveSteps = steps;
    const valid = this._getValidPawnsForSteps(player, steps, rawFace, excludePawnId);

    if (valid.length === 0) {
      this.state.pendingFollowUp = null;
      this.state.validPawnIds = [];
      this._render();
      const allInBase = player.pawns.every((pw) => pw.finished || pw.progress === -1);
      if (steps === 0) {
        this._log(`🔥 Dadu Chaos dapat 0 (ZONK)! Giliran berpindah.`, '#fb7185');
      } else if (allInBase) {
        this._log(`🔒 Butuh dadu 6 untuk keluar dari markas!`, '#94a3b8');
      } else {
        this._log(`⏭️ Tidak ada pion valid untuk angka ${steps}.`, '#94a3b8');
      }
      await sleep(620);
      this._endTurn(false);
      return;
    }

    this.state.phase = 'SELECT_PAWN';
    this.state.validPawnIds = valid;
    this._render();

    clearTimeout(this._autoMoveTimer);

    // In Online Mode: ONLY the active controller (or Host for AI) triggers auto-select via server!
    if (this.state.online.enabled) {
      if (player.type === 'ai' && this.state.online.isHost) {
        this._autoMoveTimer = setTimeout(() => {
          if (!this.state || this.state.phase !== 'SELECT_PAWN') return;
          const chosenId = this._aiChooseBestPawn(player, valid, steps, diceId);
          this.onDispatchOnlineAction?.('select_pawn', { pawnId: chosenId });
        }, 420);
      } else if (player.type === 'human' && player.id === this.state.online.mySeatIndex && valid.length === 1) {
        this._autoMoveTimer = setTimeout(() => {
          if (!this.state || this.state.phase !== 'SELECT_PAWN') return;
          this.onDispatchOnlineAction?.('select_pawn', { pawnId: valid[0] });
        }, 300);
      }
      return;
    }

    // Local Mode auto-select for AI or single valid move
    if (player.type === 'ai') {
      this._autoMoveTimer = setTimeout(() => {
        if (!this.state || this.state.phase !== 'SELECT_PAWN') return;
        const chosenId = this._aiChooseBestPawn(player, valid, steps, diceId);
        this._doSelectPawn(chosenId);
      }, 420);
    } else if (valid.length === 1) {
      this._autoMoveTimer = setTimeout(() => {
        if (!this.state || this.state.phase !== 'SELECT_PAWN') return;
        this._doSelectPawn(valid[0]);
      }, 300);
    }
  }

  async _doSelectPawn(pawnId) {
    if (!this.state) return;
    clearTimeout(this._autoMoveTimer);
    const player = this.currentPlayer;

    if (this.state.phase === 'SKILL_SELECT_OWN') {
      if (!this.state.validPawnIds.includes(pawnId)) return;
      const ownPawn = player.pawns.find((pw) => pw.id === pawnId);
      if (!ownPawn) return;

      if (player.hero.key === 'titan') {
        this._applyTitanShield(player, ownPawn);
        return;
      }
      if (player.hero.key === 'kitsune') {
        this.state.skillTempOwnPawnId = ownPawn.id;
        const enemies = this._getSwapEnemiesForOwnPawn(player, ownPawn);
        this.state.phase = 'SKILL_SELECT_ENEMY';
        this.state.validPawnIds = enemies.map((pw) => pw.id);
        sfx.click();
        this._log(`${player.hero.emoji} Sekarang pilih pion LAWAN (petak merah) untuk ditukar!`, player.hero.color);
        this._render();
        return;
      }
    }

    if (this.state.phase === 'SKILL_SELECT_ENEMY') {
      if (!this.state.validPawnIds.includes(pawnId)) return;
      const ownPawn = player.pawns.find((pw) => pw.id === this.state.skillTempOwnPawnId);
      const enemyPawn = this._findPawnGlobal(pawnId);
      if (ownPawn && enemyPawn) {
        await this._executeKitsuneSwap(player, ownPawn, enemyPawn);
      }
      return;
    }

    if (this.state.phase !== 'SELECT_PAWN') return;
    if (!this.state.validPawnIds.includes(pawnId)) return;

    const pawn = player.pawns.find((pw) => pw.id === pawnId);
    if (!pawn) return;

    await this._executeMove(player, pawn, this.state._currentMoveSteps, this.state.rolledDiceId);
  }

  _findPawnGlobal(pawnId) {
    for (const pl of this.state.players) {
      const found = pl.pawns.find((pw) => pw.id === pawnId);
      if (found) return found;
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // Animated Pawn Movement & Landing Effects
  // --------------------------------------------------------------------------

  async _executeMove(player, pawn, steps, diceId) {
    this.state.phase = 'ANIMATING';
    this.state.validPawnIds = [];
    let gotBonusTurn = this.state.rolledValue === 6 || this.state.rolledValue === 8;
    const departureTrackIdx = getGlobalTrackIndex(player.hero.startIdx, pawn.progress);

    // 1. Deploy from Base (strictly on 6)
    if (pawn.progress === -1) {
      pawn.progress = 0;
      sfx.deploy();
      const [r, c] = getPawnGridPos(player.id, pawn);
      this.fx?.ringAtGrid(r, c, player.hero.color);
      this.fx?.floatingTextAtGrid(r, c, 'DEPLOY!', player.hero.color);
      this._addEnergy(player, 15);
      this._render();
      await sleep(260);
    } else if (steps < 0) {
      const backSteps = Math.abs(steps);
      for (let s = 0; s < backSteps; s++) {
        if (pawn.progress <= 0) break;
        pawn.progress -= 1;
        sfx.hop(backSteps - s);
        this._render();
        await sleep(155);
      }
      const [r, c] = getPawnGridPos(player.id, pawn);
      this.fx?.floatingTextAtGrid(r, c, '💀 MUNDUR!', '#fb7185');
      await sleep(180);
    } else {
      if (diceId === 'slime' && departureTrackIdx !== null) {
        this.state.slimeTraps[departureTrackIdx] = player.id;
        const [sr, sc] = MAIN_TRACK[departureTrackIdx];
        this.fx?.burstAtGrid(sr, sc, '#4ade80', 14, 2.5);
        this.fx?.floatingTextAtGrid(sr, sc, '💣 SLIME!', '#4ade80');
        sfx.slime();
      }

      let slimed = false;
      for (let s = 0; s < steps; s++) {
        pawn.progress += 1;
        sfx.hop(s);
        this._render();
        await sleep(128);

        if (pawn.progress <= 50) {
          const gIdx = getGlobalTrackIndex(player.hero.startIdx, pawn.progress);
          const trapOwner = this.state.slimeTraps[gIdx];
          if (trapOwner !== undefined && trapOwner !== player.id) {
            if (this.state.phaseDashActive) {
              delete this.state.slimeTraps[gIdx];
              const [tr, tc] = MAIN_TRACK[gIdx];
              this.fx?.floatingTextAtGrid(tr, tc, `${player.hero.emoji} TEMBUS!`, player.hero.color);
            } else {
              delete this.state.slimeTraps[gIdx];
              pawn.dizzyTurns = 1;
              const [tr, tc] = MAIN_TRACK[gIdx];
              sfx.slime();
              this.fx?.burstAtGrid(tr, tc, '#4ade80', 22, 3.2);
              this.fx?.floatingTextAtGrid(tr, tc, '🟢 SLIMED!', '#4ade80', true);
              this._log(`🟢 ${player.hero.name} menginjak Slime Trap dan terhenti!`, '#4ade80');
              slimed = true;
              break;
            }
          }
        }
      }

      this._addEnergy(player, 10);
      if (slimed) await sleep(240);
    }

    // 2. Portal Shift Event
    if (pawn.progress >= 0 && pawn.progress <= 50 && this.state.activeEvent?.id === 'portal') {
      const gIdx = getGlobalTrackIndex(player.hero.startIdx, pawn.progress);
      if (gIdx === PORTAL_PAIR[0] || gIdx === PORTAL_PAIR[1]) {
        const destGlobal = gIdx === PORTAL_PAIR[0] ? PORTAL_PAIR[1] : PORTAL_PAIR[0];
        const [r1, c1] = MAIN_TRACK[gIdx];
        const [r2, c2] = MAIN_TRACK[destGlobal];
        sfx.portal();
        this.fx?.burstAtGrid(r1, c1, '#00f5d4', 22, 4);
        this.fx?.floatingTextAtGrid(r1, c1, '🌀 WARP!', '#00f5d4', true);
        await sleep(220);
        const newRel = (destGlobal - player.hero.startIdx + 52) % 52;
        pawn.progress = Math.min(50, newRel);
        this.fx?.burstAtGrid(r2, c2, '#00f5d4', 26, 4.5);
        this.fx?.ringAtGrid(r2, c2, '#00f5d4');
        this._log(`🌀 ${player.hero.name} masuk PORTAL SHIFT dan teleport ke seberang!`, '#00f5d4');
        this._render();
        await sleep(240);
      }
    }

    // 3. Turbo Lane Event
    if (pawn.progress >= 0 && pawn.progress <= 50 && this.state.activeEvent?.id === 'turbo') {
      const gIdx = getGlobalTrackIndex(player.hero.startIdx, pawn.progress);
      if (TURBO_TILES.includes(gIdx) && pawn.progress + 2 <= MAX_PROGRESS) {
        const [r, c] = MAIN_TRACK[gIdx];
        this.fx?.floatingTextAtGrid(r, c, '⚡ TURBO +2!', '#ffb703', true);
        sfx.powerup();
        for (let b = 0; b < 2; b++) {
          pawn.progress += 1;
          sfx.hop(b + 4);
          this._render();
          await sleep(118);
        }
        this._log(`⚡ ${player.hero.name} melesat +2 langkah dari TURBO LANE!`, '#ffb703');
      }
    }

    // 4. Mystery Box / Loot Tile
    if (pawn.progress >= 0 && pawn.progress <= 50) {
      const gIdx = getGlobalTrackIndex(player.hero.startIdx, pawn.progress);
      if (this.state.mysteryActive.has(gIdx)) {
        this.state.mysteryActive.delete(gIdx);
        await this._triggerMysteryBox(player, gIdx);
      }
    }

    // 5. Combat & Signature KO Finisher!
    if (pawn.progress >= 0 && pawn.progress <= 50) {
      const koHappened = await this._resolveCombatAtLanding(player, pawn, diceId);
      if (koHappened) gotBonusTurn = true;
    }

    // 6. Finish Goal
    if (pawn.progress === MAX_PROGRESS && !pawn.finished) {
      pawn.finished = true;
      player.finishedCount += 1;
      sfx.finishPawn();
      const [r, c] = getPawnGridPos(player.id, pawn);
      this.fx?.burstAtGrid(r, c, player.hero.color, 40, 5.5);
      this.fx?.floatingTextAtGrid(r, c, pawn.isAce ? '⭐ ACE FINISH!' : '🏁 FINISH!', '#ffb703', true);
      this.fx?.shake('light');
      gotBonusTurn = true;
      if (pawn.isAce) {
        this._addEnergy(player, 50);
        this._log(`⭐ PION ACE ${player.hero.name} FINIS! Bonus +50 Energi & Extra Turn!`, '#ffb703');
      } else {
        this._addEnergy(player, 30);
        this._log(`🏁 Pion ${player.hero.name} FINIS (${player.finishedCount}/${this.state.pawnsPerPlayer})!`, player.hero.color);
      }

      if (player.finishedCount >= this.state.pawnsPerPlayer) {
        this._declareVictory(player);
        return;
      }
    }

    this._render();
    await sleep(170);

    // 7. Follow-Up Move (Mirror Dice or Split Step)
    if (this.state.pendingFollowUp) {
      const fu = this.state.pendingFollowUp;
      this.state.pendingFollowUp = null;
      const excludeId = pawn.id;
      const valid = this._getValidPawnsForSteps(player, fu.steps, fu.rawFace, excludeId);
      if (valid.length > 0) {
        const label = fu.type === 'mirror' ? 'DADU GENAP' : `${player.hero.emoji} ${player.hero.skillName.toUpperCase()}`;
        this._log(`${label}: Pilih pion kedua untuk maju ${fu.steps} langkah!`, player.hero.color);
        await this._enterPawnSelection(player, fu.steps, 'normal', fu.rawFace, excludeId);
        return;
      }
    }

    this._endTurn(gotBonusTurn);
  }

  async _triggerMysteryBox(player, trackIdx) {
    const [r, c] = MAIN_TRACK[trackIdx];
    sfx.powerup();
    this.fx?.burstAtGrid(r, c, '#ffb703', 24, 3.8);

    const roll = this._rand();
    if (roll < 0.45) {
      const newDice = this._randomSpecialDice();
      if (player.diceInventory.length < 4) {
        player.diceInventory.push(newDice);
      } else {
        player.diceInventory[0] = newDice;
      }
      const dDef = DICE_TYPES[newDice];
      this.fx?.floatingTextAtGrid(r, c, `+ DADU ${dDef.name.toUpperCase()}!`, dDef.color, true);
      this._log(`🎁 Mystery Box: ${player.hero.name} dapat Dadu ${dDef.name}!`, dDef.color);
    } else if (roll < 0.68) {
      this.state.direction *= -1;
      sfx.reverse();
      this.fx?.floatingTextAtGrid(r, c, '🔄 REVERSE UNO!', '#ff2a5f', true);
      this.fx?.shake('light');
      const dirText = this.state.direction === 1 ? 'Searah Jarum Jam ↻' : 'Berlawanan Arah ↺';
      this._log(`🔄 SABOTASE REVERSE UNO! Urutan giliran berbalik jadi ${dirText}!`, '#ff2a5f');
    } else if (roll < 0.85) {
      const enemies = this.state.players.filter((pl) => pl.id !== player.id);
      enemies.sort((a, b) => b.energy - a.energy);
      const target = enemies[0];
      if (target) {
        target.energy = Math.max(0, target.energy - 35);
        this.fx?.floatingTextAtGrid(r, c, `⚡ EMP -35!`, '#38bdf8', true);
        this._log(`⚡ EMP SHOCK! ${player.hero.name} menguras 35 energi ${target.hero.name}!`, '#38bdf8');
      }
    } else {
      this._addEnergy(player, 35);
      this.fx?.floatingTextAtGrid(r, c, '💎 +35 ENERGI!', '#4ade80', true);
      this._log(`💎 ENERGY ORB! ${player.hero.name} dapat +35 Overdrive Energy!`, '#4ade80');
    }
    this._render();
    await sleep(300);
  }

  async _resolveCombatAtLanding(player, pawn, diceId) {
    let gIdx = getGlobalTrackIndex(player.hero.startIdx, pawn.progress);
    if (gIdx === null) return false;

    const findEnemiesAt = (idx) => {
      const list = [];
      for (const pl of this.state.players) {
        if (pl.id === player.id) continue;
        for (const pw of pl.pawns) {
          if (pw.progress >= 0 && pw.progress <= 50 && !pw.finished) {
            if (getGlobalTrackIndex(pl.hero.startIdx, pw.progress) === idx) {
              list.push({ owner: pl, pawn: pw });
            }
          }
        }
      }
      return list;
    };

    let targets = this._isSafeTile(gIdx) ? [] : findEnemiesAt(gIdx);

    if (targets.length === 0 && diceId === 'magnet') {
      for (const offset of [1, -1]) {
        const adjIdx = (gIdx + offset + 52) % 52;
        if (this._isSafeTile(adjIdx)) continue;
        const adjTargets = findEnemiesAt(adjIdx).filter((t) => t.pawn.shieldTurns === 0 || this.state.phaseDashActive);
        if (adjTargets.length > 0) {
          const nextProg = pawn.progress + offset;
          if (nextProg >= 0 && nextProg <= 50) {
            pawn.progress = nextProg;
            gIdx = adjIdx;
            targets = adjTargets;
            const [mr, mc] = MAIN_TRACK[gIdx];
            this.fx?.floatingTextAtGrid(mr, mc, '🧲 MAGNET PULL!', '#f472b6', true);
            this._log(`🧲 DADU MAGNET menyedot ${player.hero.name} ke posisi lawan!`, '#f472b6');
            this._render();
            await sleep(220);
            break;
          }
        }
      }
    }

    if (targets.length === 0) return false;

    // Titan-X / Barong-X Shield Bounce
    const shielded = targets.find((t) => t.pawn.shieldTurns > 0);
    if (shielded && !this.state.phaseDashActive) {
      sfx.shieldBounce();
      const [sr, sc] = MAIN_TRACK[gIdx];
      this.fx?.ringAtGrid(sr, sc, shielded.owner.hero.color);
      this.fx?.floatingTextAtGrid(sr, sc, '🛡️ BLOCKED! -3', shielded.owner.hero.color, true);
      this.fx?.shake('heavy');
      this._log(`🛡️ ${shielded.owner.hero.skillName.toUpperCase()} memantulkan ${player.hero.name} mundur 3 langkah!`, shielded.owner.hero.color);
      pawn.progress = Math.max(0, pawn.progress - 3);
      pawn.dizzyTurns = 1;
      this._render();
      await sleep(340);
      return false;
    }

    // SIGNATURE CINEMATIC KO FINISHER!
    const [kr, kc] = MAIN_TRACK[gIdx];
    sfx.koFinisher(player.hero.koType);
    this.fx?.playKOFinisher(player.hero.koType, kr, kc, player.hero.color, player.hero.koText);
    if (typeof navigator !== 'undefined') navigator.vibrate?.([35, 30, 55]);

    // Pause briefly for meteor/blackhole impact climax before sending enemy home!
    await sleep(300);

    const themeEmotes = getTheme(this.state.theme).emotes;
    const koWinEmote = themeEmotes.find((e) => e.kind === 'ko_win') || themeEmotes[0];
    const koSadEmote = themeEmotes.find((e) => e.kind === 'ko_sad') || themeEmotes[1];

    for (const t of targets) {
      const wasNearFinish = t.pawn.progress >= 38;
      t.pawn.progress = -1;
      t.pawn.shieldTurns = 0;
      t.pawn.dizzyTurns = 0;
      t.pawn.isAce = false;
      this._addEnergy(t.owner, 25);
      player.kills += 1;
      this._log(`💥 ${player.hero.koText} — ${player.hero.name} memulangkan ${t.owner.hero.name} & naik jadi ⭐ ACE!`, player.hero.color);

      this.onKOContext?.({
        attackerId: player.id,
        victimId: t.owner.id,
        nearFinish: wasNearFinish,
      });

      if (t.owner.type === 'ai' && wasNearFinish && this.onEmote) {
        setTimeout(() => this.onEmote?.(t.owner.id, koSadEmote.label), 320);
      }
    }

    pawn.isAce = true;
    this._addEnergy(player, 40);

    if (player.type === 'ai' && this._rand() < 0.8 && this.onEmote) {
      this.onEmote(player.id, koWinEmote.label);
    }

    this._render();
    await sleep(360);
    return true;
  }

  // --------------------------------------------------------------------------
  // End Turn, Round Progression & Board Events
  // --------------------------------------------------------------------------

  _endTurn(gotBonusTurn) {
    if (!this.state || this.state.phase === 'GAME_OVER') return;
    const player = this.currentPlayer;

    this.state.phaseDashActive = false;
    this.state.sparkySplitArmed = false;
    this.state.pendingFollowUp = null;
    this.state.selectedDice = 'normal';

    if (gotBonusTurn && this.state.consecutiveBonusRolls < 2) {
      this.state.consecutiveBonusRolls += 1;
      this.state.phase = 'WAITING_ROLL';
      this._log(`🔥 BONUS TURN untuk ${player.hero.name}!`, player.hero.color);
      this._render();
      this._scheduleAIIfNeeded();
      return;
    }

    this.state.consecutiveBonusRolls = 0;
    this.state.turnCount += 1;

    const total = this.state.players.length;
    this.state.turnOrderIdx = (this.state.turnOrderIdx + this.state.direction + total) % total;

    if (this.state.turnCount % total === 1) {
      this._onNewRound();
    }

    const nextPlayer = this.currentPlayer;
    for (const pw of nextPlayer.pawns) {
      if (pw.shieldTurns > 0) pw.shieldTurns -= 1;
      if (pw.dizzyTurns > 0) pw.dizzyTurns -= 1;
    }

    this.state.phase = 'WAITING_ROLL';
    this._render();
    this._scheduleAIIfNeeded();
  }

  _onNewRound() {
    this.state.roundNumber += 1;

    if (this.state.mysteryActive.size <= 1) {
      MYSTERY_TILES.forEach((t) => this.state.mysteryActive.add(t));
    }

    if (this.state.roundNumber % 3 === 0) {
      for (const pl of this.state.players) {
        if (pl.diceInventory.length < 4) {
          pl.diceInventory.push(this._randomSpecialDice());
        }
      }
      this._log(`📦 SUPPLY DROP Ronde ${this.state.roundNumber}! Semua pemain dapat +1 Dadu Spesial!`, '#38bdf8');
    }

    if (this.state.activeEvent) {
      this.state.activeEvent.roundsLeft -= 1;
      if (this.state.activeEvent.roundsLeft <= 0) {
        this._log(`⏹️ Board Event ${this.state.activeEvent.name} berakhir.`, '#94a3b8');
        this.state.activeEvent = null;
        this.state.nextEventInRounds = 3;
      }
    } else {
      this.state.nextEventInRounds -= 1;
      if (this.state.nextEventInRounds <= 0) {
        const ev = BOARD_EVENTS[Math.floor(this._rand() * BOARD_EVENTS.length)];
        this.state.activeEvent = { ...ev, roundsLeft: 2 };
        sfx.skillActivate();
        this.fx?.shake('light');
        this._log(`BOARD EVENT: ${ev.name} — ${ev.desc}`, ev.color);
      }
    }
  }

  _declareVictory(winner) {
    this.state.phase = 'GAME_OVER';
    this.state.winner = winner;
    sfx.victory();
    this.fx?.burstAtGrid(7, 7, winner.hero.color, 65, 6.5);
    this.fx?.burstAtGrid(7, 7, '#ffb703', 45, 5.0);
    this._log(`🏆 ${winner.hero.name} MEMENANGKAN PERTANDINGAN!`, '#ffb703');
    if (this.onEmote) {
      this.onEmote(winner.id, '🏆 GG EZ!');
    }
    this._render();
  }

  // --------------------------------------------------------------------------
  // Smart Tactical AI Bot (Host-authoritative in Online Mode)
  // --------------------------------------------------------------------------

  _scheduleAIIfNeeded() {
    clearTimeout(this._aiTimer);
    if (!this.state || this.state.phase !== 'WAITING_ROLL') return;
    const p = this.currentPlayer;
    if (p.type !== 'ai') return;
    if (this.state.online.enabled && !this.state.online.isHost) return;

    this._aiTimer = setTimeout(() => this._runAITurn(), 580);
  }

  async _runAITurn() {
    if (!this.state || this.state.phase !== 'WAITING_ROLL') return;
    const p = this.currentPlayer;
    if (p.type !== 'ai') return;

    const sendOrRun = async (type, payload, localFn) => {
      if (this.state.online.enabled) {
        this.onDispatchOnlineAction?.(type, payload);
      } else {
        await localFn();
      }
    };

    // 1. Consider triggering Overdrive Skill
    if (p.energy >= OVERDRIVE_COST) {
      const skillPlan = this._aiPlanOverdrive(p);
      if (skillPlan) {
        await sendOrRun('activate_skill', {}, () => this._doActivateOverdriveSkill());
        if (skillPlan.ownPawnId) {
          await sleep(220);
          await sendOrRun('select_pawn', { pawnId: skillPlan.ownPawnId }, () => this._doSelectPawn(skillPlan.ownPawnId));
        }
        if (skillPlan.enemyPawnId) {
          await sleep(220);
          await sendOrRun('select_pawn', { pawnId: skillPlan.enemyPawnId }, () => this._doSelectPawn(skillPlan.enemyPawnId));
        }
        await sleep(340);
      }
    }

    if (!this.state || this.state.phase !== 'WAITING_ROLL') return;

    // 2. Choose Dice
    const chosenDice = this._aiChooseDice(p);
    if (chosenDice !== 'normal') {
      await sendOrRun('select_dice', { diceId: chosenDice }, () => this._doSelectDice(chosenDice));
      await sleep(200);
    }

    if (!this.state || this.state.phase !== 'WAITING_ROLL') return;

    // 3. Roll Dice (stronger power when trying to roll a 6 from base!)
    const allInBase = p.pawns.every((pw) => pw.finished || pw.progress === -1);
    const aiPower = allInBase ? 0.85 : 0.25 + this._rand() * 0.6;
    await sendOrRun('roll_dice', { power: aiPower }, () => this._doRollDice(aiPower));
  }

  _aiPlanOverdrive(p) {
    const key = p.hero.key;
    if (key === 'kitsune') {
      const validOwn = this._getValidOwnSwapPawns(p);
      if (validOwn.length > 0) {
        validOwn.sort((a, b) => a.progress - b.progress);
        const myLag = validOwn[0];
        const enemies = this._getSwapEnemiesForOwnPawn(p, myLag);
        let bestEnemy = null;
        let bestGain = 1;
        for (const ep of enemies) {
          const epOwner = this.getPlayerById(ep.playerId);
          const eGlobal = getGlobalTrackIndex(epOwner.hero.startIdx, ep.progress);
          const newProg = Math.min(50, (eGlobal - p.hero.startIdx + 52) % 52);
          const gain = newProg - myLag.progress;
          if (gain > bestGain) {
            bestGain = gain;
            bestEnemy = ep;
          }
        }
        if (bestEnemy) {
          return {
            ownPawnId: validOwn.length > 1 ? myLag.id : null,
            enemyPawnId: bestEnemy.id,
          };
        }
      }
    } else if (key === 'titan') {
      const ownTrack = p.pawns.filter((pw) => pw.progress >= 6 && pw.progress <= 50 && pw.shieldTurns === 0);
      if (ownTrack.length > 0) {
        ownTrack.sort((a, b) => b.progress - a.progress);
        return { ownPawnId: ownTrack[0].id };
      }
    } else if (key === 'sparky') {
      const hasOut = p.pawns.some((pw) => !pw.finished && pw.progress >= 0);
      if (hasOut) return {};
    } else if (key === 'phantom') {
      const hasOut = p.pawns.some((pw) => !pw.finished && pw.progress >= 0 && pw.progress <= 52);
      if (hasOut) return {};
    }
    return null;
  }

  _aiChooseDice(p) {
    if (p.diceInventory.length === 0) return 'normal';
    const allInBase = p.pawns.every((pw) => pw.finished || pw.progress === -1);
    if (allInBase) {
      // Never waste the odd die (1/3/5) when needing a 6! Chaos/Normal/Magnet have 6!
      return 'normal';
    }
    // Odd die (id 'sniper'): use it when a pawn needs exactly 1, 3 or 5 to finish
    if (p.diceInventory.includes('sniper') && p.pawns.some((pw) => !pw.finished && pw.progress >= 51 && (56 - pw.progress) % 2 === 1)) {
      return 'sniper';
    }
    const activeCount = p.pawns.filter((pw) => !pw.finished && pw.progress >= 0 && pw.progress <= 50).length;
    if (p.diceInventory.includes('mirror') && activeCount >= 2 && this._rand() < 0.7) {
      return 'mirror';
    }
    if (activeCount >= 1 && this._rand() < 0.55) {
      return p.diceInventory[0];
    }
    return 'normal';
  }

  _aiChooseBestPawn(player, validIds, steps, diceId) {
    let bestId = validIds[0];
    let bestScore = -999;

    for (const id of validIds) {
      const pw = player.pawns.find((x) => x.id === id);
      let score = 0;

      if (pw.progress === -1) {
        score += 65; // Prioritize deploying on 6!
      } else {
        const nextProg = pw.progress + steps;
        if (nextProg === MAX_PROGRESS) {
          score += pw.isAce ? 180 : 140;
        } else if (nextProg > 50) {
          score += 75 + nextProg;
        } else if (nextProg >= 0) {
          const destGlobal = getGlobalTrackIndex(player.hero.startIdx, nextProg);
          let willKO = false;
          if (!this._isSafeTile(destGlobal)) {
            for (const pl of this.state.players) {
              if (pl.id === player.id) continue;
              for (const ep of pl.pawns) {
                if (ep.progress >= 0 && ep.progress <= 50 && !ep.finished) {
                  const eg = getGlobalTrackIndex(pl.hero.startIdx, ep.progress);
                  if (eg === destGlobal || (diceId === 'magnet' && Math.abs(eg - destGlobal) === 1)) {
                    score += ep.shieldTurns > 0 ? -60 : 120;
                    willKO = true;
                  }
                }
              }
            }
          }
          if (this._isSafeTile(destGlobal)) score += 35;
          if (this.state.mysteryActive.has(destGlobal)) score += 38;
          if (this.state.activeEvent?.id === 'turbo' && TURBO_TILES.includes(destGlobal)) score += 32;
          if (this.state.slimeTraps[destGlobal] !== undefined && this.state.slimeTraps[destGlobal] !== player.id) {
            score -= 25;
          }
          if (!willKO) score += nextProg * 0.7;
        }
      }

      score += this._rand() * 4;
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }
    return bestId;
  }
}
