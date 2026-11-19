import { icon, stripEmoji } from './icons.js';

// ============================================================================
// LUDO OVERDRIVE — Visual FX: Particles, Signature KO Finishers & Shake
// ============================================================================

export class FXManager {
  constructor(canvas, boardStageEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stage = boardStageEl;
    this.particles = [];
    this.effects = []; // Custom timed cinematic KO animations
    this.rafId = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas || !this.stage) return;
    const rect = this.stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
  }

  gridToPx(row, col) {
    const rect = this.stage.getBoundingClientRect();
    return {
      x: ((col + 0.5) / 15) * rect.width,
      y: ((row + 0.5) / 15) * rect.height,
    };
  }

  burstAtGrid(row, col, color = '#38c6e0', count = 28, speed = 4.2) {
    const { x, y } = this.gridToPx(row, col);
    this.burst(x, y, color, count, speed);
  }

  burst(x, y, color = '#38c6e0', count = 26, speed = 4) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const spd = speed * (0.45 + Math.random() * 0.9);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 2.5 + Math.random() * 4.5,
        color,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        shape: Math.random() > 0.4 ? 'circle' : 'square',
      });
    }
    this._startLoop();
  }

  ringAtGrid(row, col, color = '#ecc94b', maxRadius = 56) {
    const { x, y } = this.gridToPx(row, col);
    this.particles.push({
      type: 'ring',
      x,
      y,
      radius: 8,
      maxRadius,
      color,
      life: 1,
      decay: 0.04,
    });
    this._startLoop();
  }

  // --------------------------------------------------------------------------
  // Signature Cinematic KO Finishers!
  // --------------------------------------------------------------------------

  playKOFinisher(koType, row, col, color, bannerText) {
    const { x, y } = this.gridToPx(row, col);
    this.showKOBanner(bannerText, color, koType);
    this.shake('heavy');

    if (koType === 'meteor') {
      // Falling flaming meteor from upper-right -> crater shockwave + fire debris
      const startX = x + 160;
      const startY = Math.max(-40, y - 220);
      this.effects.push({
        kind: 'meteor',
        x, y, startX, startY,
        color,
        t: 0,
        duration: 38,
        impacted: false,
      });
    } else if (koType === 'lightning') {
      // Jagged electric thunderbolt straight from top of board to (x, y)
      const pts = [];
      const segments = 9;
      for (let i = 0; i <= segments; i++) {
        const frac = i / segments;
        const px = i === segments ? x : x + (Math.random() - 0.5) * 48 * (1 - frac * 0.5);
        const py = frac * y;
        pts.push({ x: px, y: py });
      }
      this.effects.push({
        kind: 'lightning',
        x, y, pts,
        color,
        t: 0,
        duration: 28,
      });
      this.burst(x, y, '#ffffff', 18, 6.2);
      this.burst(x, y, color, 34, 5.4);
      this.ringAtGrid(row, col, color, 78);
    } else if (koType === 'blackhole') {
      // Dark singularity sucking particles INWARD then imploding OUTWARD
      const pullers = [];
      for (let i = 0; i < 28; i++) {
        const ang = (Math.PI * 2 * i) / 28 + Math.random() * 0.3;
        const dist = 55 + Math.random() * 55;
        pullers.push({ ang, dist, size: 2.5 + Math.random() * 3 });
      }
      this.effects.push({
        kind: 'blackhole',
        x, y, pullers,
        color,
        t: 0,
        duration: 44,
        exploded: false,
      });
    } else {
      // glitch_beam: Vertical cyber laser pillar + horizontal glitch scanline slices
      this.effects.push({
        kind: 'glitch_beam',
        x, y,
        color,
        t: 0,
        duration: 30,
      });
      this.burst(x, y, color, 36, 5.6);
      this.burst(x, y, '#ffffff', 14, 4.2);
      this.ringAtGrid(row, col, color, 72);
    }

    this._startLoop();
  }

  showKOBanner(text, color, koType) {
    if (!this.stage) return;
    const icons = {
      meteor: 'flame',
      lightning: 'bolt',
      blackhole: 'portal',
      glitch_beam: 'gem',
    };
    const old = this.stage.querySelector('.ko-splash-banner');
    if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'ko-splash-banner';
    el.style.setProperty('--ko-color', color);
    el.innerHTML = `<span class="ko-splash-icon">${icon(icons[koType] || 'burst', { stroke: 2.4 })}</span><span>${stripEmoji(text)}</span>`;
    this.stage.appendChild(el);
    setTimeout(() => el.remove(), 1150);
  }

  floatingTextAtGrid(row, col, text, color = '#ffffff', big = false) {
    if (!this.stage) return;
    const el = document.createElement('div');
    el.className = `fx-float-text ${big ? 'fx-big' : ''}`;
    el.textContent = stripEmoji(text);
    el.style.left = `${((col + 0.5) / 15) * 100}%`;
    el.style.top = `${((row + 0.5) / 15) * 100}%`;
    el.style.color = color;
    el.style.textShadow = `0 0 12px ${color}, 0 2px 6px rgba(0,0,0,0.9)`;
    this.stage.appendChild(el);
    setTimeout(() => el.remove(), big ? 1350 : 950);
  }

  shake(intensity = 'normal') {
    if (!this.stage) return;
    const cls = intensity === 'heavy' ? 'shake-heavy' : 'shake-light';
    this.stage.classList.remove('shake-light', 'shake-heavy');
    void this.stage.offsetWidth;
    this.stage.classList.add(cls);
    setTimeout(() => this.stage.classList.remove(cls), 420);
  }

  _drawEffects() {
    const ctx = this.ctx;
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const ef = this.effects[i];
      ef.t += 1;
      const p = ef.t / ef.duration;
      if (p >= 1) {
        this.effects.splice(i, 1);
        continue;
      }

      ctx.save();
      if (ef.kind === 'meteor') {
        const dropFrac = Math.min(1, p / 0.42);
        if (dropFrac < 1) {
          const cx = ef.startX + (ef.x - ef.startX) * dropFrac;
          const cy = ef.startY + (ef.y - ef.startY) * dropFrac;
          // Fiery tail
          const grad = ctx.createLinearGradient(cx, cy, ef.startX, ef.startY);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.25, '#f2b544');
          grad.addColorStop(0.6, ef.color);
          grad.addColorStop(1, 'transparent');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 18;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + (ef.startX - ef.x) * 0.45, cy + (ef.startY - ef.y) * 0.45);
          ctx.stroke();

          ctx.fillStyle = '#fff5d6';
          ctx.shadowBlur = 22;
          ctx.shadowColor = ef.color;
          ctx.beginPath();
          ctx.arc(cx, cy, 13, 0, Math.PI * 2);
          ctx.fill();
        } else {
          if (!ef.impacted) {
            ef.impacted = true;
            this.burst(ef.x, ef.y, '#f2b544', 28, 6.2);
            this.burst(ef.x, ef.y, ef.color, 34, 5.2);
          }
          const blast = (p - 0.42) / 0.58;
          ctx.globalAlpha = 1 - blast;
          ctx.strokeStyle = '#f2b544';
          ctx.lineWidth = 6 * (1 - blast);
          ctx.beginPath();
          ctx.arc(ef.x, ef.y, 14 + blast * 74, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = ef.color;
          ctx.globalAlpha = (1 - blast) * 0.45;
          ctx.beginPath();
          ctx.arc(ef.x, ef.y, 26 + blast * 30, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (ef.kind === 'lightning') {
        const alpha = Math.max(0, 1 - p * 1.15);
        // Subtle flash glow
        ctx.fillStyle = `rgba(255, 240, 170, ${alpha * 0.16})`;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 26;
        ctx.shadowColor = ef.color;
        ctx.strokeStyle = ef.color;
        ctx.lineWidth = 9 * alpha + 2;
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        ef.pts.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x + (Math.random() - 0.5) * 6, pt.y);
        });
        ctx.stroke();

        // Inner white-hot core bolt
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5 * alpha + 1;
        ctx.stroke();
      } else if (ef.kind === 'blackhole') {
        if (p < 0.62) {
          const pull = p / 0.62;
          // Swirling accretion ring
          ctx.translate(ef.x, ef.y);
          ctx.rotate(pull * Math.PI * 3);
          const rad = 12 + pull * 28;
          const grd = ctx.createRadialGradient(0, 0, 4, 0, 0, rad * 1.9);
          grd.addColorStop(0, '#05020a');
          grd.addColorStop(0.55, ef.color);
          grd.addColorStop(1, 'transparent');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(0, 0, rad * 1.9, 0, Math.PI * 2);
          ctx.fill();

          // Dark core
          ctx.fillStyle = '#04010a';
          ctx.strokeStyle = '#e0aaff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, rad * 0.65, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Particles spiralling inward
          ef.pullers.forEach((pt) => {
            const d = pt.dist * (1 - pull);
            const a = pt.ang + pull * 5.2;
            ctx.fillStyle = '#e0aaff';
            ctx.beginPath();
            ctx.arc(Math.cos(a) * d, Math.sin(a) * d, pt.size, 0, Math.PI * 2);
            ctx.fill();
          });
        } else {
          if (!ef.exploded) {
            ef.exploded = true;
            this.burst(ef.x, ef.y, ef.color, 40, 6.4);
            this.burst(ef.x, ef.y, '#ffffff', 16, 4.8);
          }
          const boom = (p - 0.62) / 0.38;
          ctx.globalAlpha = 1 - boom;
          ctx.strokeStyle = '#e0aaff';
          ctx.lineWidth = 7 * (1 - boom);
          ctx.beginPath();
          ctx.arc(ef.x, ef.y, 12 + boom * 84, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (ef.kind === 'glitch_beam') {
        const alpha = 1 - p;
        ctx.globalAlpha = alpha;
        // Vertical laser beam
        const beamW = 36 * (1 - p * 0.65);
        const grd = ctx.createLinearGradient(ef.x - beamW, 0, ef.x + beamW, 0);
        grd.addColorStop(0, 'transparent');
        grd.addColorStop(0.35, ef.color);
        grd.addColorStop(0.5, '#ffffff');
        grd.addColorStop(0.65, ef.color);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.fillRect(ef.x - beamW, 0, beamW * 2, this.height);

        // Horizontal glitch scanlines at impact
        for (let s = 0; s < 6; s++) {
          const gy = ef.y + (Math.random() - 0.5) * 70;
          const gw = 40 + Math.random() * 90;
          ctx.fillStyle = s % 2 === 0 ? ef.color : '#ffffff';
          ctx.fillRect(ef.x - gw / 2 + (Math.random() - 0.5) * 26, gy, gw, 3 + Math.random() * 4);
        }
      }
      ctx.restore();
    }
  }

  _startLoop() {
    if (this.rafId) return;
    const tick = () => {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this._drawEffects();
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= p.decay;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, p.life);
        if (p.type === 'ring') {
          p.radius += (p.maxRadius - p.radius) * 0.18;
          this.ctx.strokeStyle = p.color;
          this.ctx.lineWidth = 3.5 * p.life;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          this.ctx.stroke();
        } else {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.94;
          p.vy *= 0.94;
          this.ctx.fillStyle = p.color;
          this.ctx.shadowBlur = 10;
          this.ctx.shadowColor = p.color;
          if (p.shape === 'circle') {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fill();
          } else {
            const s = p.size * p.life * 1.4;
            this.ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
          }
        }
        this.ctx.restore();
      }
      if (this.particles.length > 0 || this.effects.length > 0) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }
}
