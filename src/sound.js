// ============================================================================
// LUDO OVERDRIVE — Procedural Web Audio API Sound Engine (with KO Finishers)
// ============================================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  _ensure() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => { });
    }
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  _tone(freq, dur, type = 'sine', gainVal = 0.14, slideTo = null, delay = 0) {
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  _noise(dur, gainVal = 0.14, delay = 0) {
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  click() {
    this._tone(680, 0.05, 'triangle', 0.1, 440);
  }

  diceTick(pitch = 1) {
    this._tone(280 * pitch + Math.random() * 140, 0.045, 'square', 0.06, 160);
  }

  diceLand(isHigh = false) {
    this._tone(isHigh ? 520 : 320, 0.11, 'triangle', 0.14, isHigh ? 880 : 210);
    if (isHigh) {
      this._tone(780, 0.14, 'sine', 0.11, 1040, 0.06);
    }
  }

  hop(stepIndex = 0) {
    const base = 360 + (stepIndex % 6) * 45;
    this._tone(base, 0.075, 'sine', 0.11, base * 1.35);
  }

  deploy() {
    this._tone(330, 0.1, 'triangle', 0.12, 440, 0);
    this._tone(440, 0.14, 'triangle', 0.14, 660, 0.07);
  }

  // ---- Signature KO Finisher Sound Effects ----

  koFinisher(koType) {
    if (koType === 'meteor') return this.koMeteor();
    if (koType === 'lightning') return this.koLightning();
    if (koType === 'blackhole') return this.koBlackhole();
    return this.koGlitchBeam();
  }

  koMeteor() {
    // Whistling falling meteor + heavy seismic boom
    this._tone(720, 0.24, 'sine', 0.11, 120, 0);
    this._noise(0.38, 0.22, 0.16);
    this._tone(135, 0.42, 'sawtooth', 0.22, 28, 0.16);
    this._tone(70, 0.45, 'triangle', 0.24, 24, 0.18);
  }

  koLightning() {
    // Sharp electric zap + crackling thunderbolt
    this._noise(0.22, 0.2, 0);
    this._tone(1600, 0.09, 'sawtooth', 0.14, 340, 0);
    this._tone(1250, 0.11, 'square', 0.13, 220, 0.06);
    this._tone(190, 0.36, 'sawtooth', 0.18, 45, 0.1);
  }

  koBlackhole() {
    // Gravity pull inward + violent sub-bass implosion
    this._tone(90, 0.28, 'sine', 0.16, 460, 0);
    this._tone(380, 0.26, 'triangle', 0.12, 60, 0.12);
    this._noise(0.26, 0.16, 0.24);
    this._tone(120, 0.36, 'sawtooth', 0.2, 25, 0.24);
  }

  koGlitchBeam() {
    // Cyber laser beam + digital shatter
    this._tone(1300, 0.2, 'sawtooth', 0.15, 220, 0);
    for (let i = 0; i < 6; i++) {
      this._tone(260 + Math.random() * 1100, 0.055, 'square', 0.09, 140, 0.08 + i * 0.035);
    }
    this._tone(150, 0.25, 'triangle', 0.18, 40, 0.12);
  }

  ko() {
    this.koMeteor();
  }

  shieldBounce() {
    this._tone(420, 0.12, 'square', 0.13, 980, 0);
    this._tone(880, 0.16, 'triangle', 0.14, 300, 0.08);
  }

  glitch() {
    for (let i = 0; i < 5; i++) {
      this._tone(240 + Math.random() * 900, 0.055, 'sawtooth', 0.08, 120 + Math.random() * 700, i * 0.04);
    }
  }

  portal() {
    this._tone(220, 0.32, 'sine', 0.15, 1120, 0);
    this._tone(880, 0.25, 'triangle', 0.1, 320, 0.12);
  }

  slime() {
    this._tone(260, 0.16, 'sine', 0.15, 95, 0);
    this._tone(190, 0.14, 'triangle', 0.12, 120, 0.06);
  }

  powerup() {
    this._tone(440, 0.1, 'triangle', 0.12, 554, 0);
    this._tone(554, 0.1, 'triangle', 0.12, 659, 0.08);
    this._tone(659, 0.2, 'sine', 0.15, 880, 0.16);
  }

  skillActivate() {
    this._tone(300, 0.15, 'sawtooth', 0.12, 720, 0);
    this._tone(600, 0.22, 'triangle', 0.14, 1200, 0.08);
  }

  reverse() {
    this._tone(740, 0.1, 'square', 0.1, 420, 0);
    this._tone(420, 0.14, 'square', 0.1, 840, 0.09);
  }

  finishPawn() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => this._tone(n, 0.18, 'triangle', 0.14, null, idx * 0.075));
  }

  victory() {
    const notes = [523.25, 659.25, 783.99, 659.25, 1046.5, 1318.5];
    notes.forEach((n, idx) => this._tone(n, 0.24, 'triangle', 0.16, null, idx * 0.1));
  }

  emote() {
    this._tone(540, 0.07, 'sine', 0.1, 760, 0);
    this._tone(760, 0.08, 'sine', 0.1, 640, 0.06);
  }
}

export const sfx = new SoundEngine();
