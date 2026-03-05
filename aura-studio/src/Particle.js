import { AURA_TYPES, FEET_Y_RATIO, CENTER_Y_RATIO } from './constants';
import { random, hexToRgb } from './utils';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default class Particle {
  constructor(type, canvasWidth, canvasHeight, customConfig = null) {
    this.type = type;
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.customConfig = customConfig;
    this.variant = Math.random();
    this.reset();
  }

  reset() {
    const centerX = this.w / 2;
    const feetY = this.h * FEET_Y_RATIO;

    if (this.type === AURA_TYPES.CUSTOM && this.customConfig) {
      this._resetCustom(centerX, feetY);
      return;
    }

    this._resetPreset(centerX, feetY);
  }

  _resetCustom(centerX, feetY) {
    const entities = this.customConfig.entities;
    if (!entities?.length) return;

    const totalWeight = entities.reduce((sum, e) => sum + (e.weight || 1), 0);
    let rand = Math.random() * totalWeight;
    this.entity = entities[0];
    for (const e of entities) {
      rand -= (e.weight || 1);
      if (rand <= 0) { this.entity = e; break; }
    }

    const sizeRange = this.entity.size || [12, 18];
    this.size = random(sizeRange[0], sizeRange[1]);

    const sp = this.entity.speed || {};
    this.vx = random(...(sp.vx || [-1, 1]));
    this.vy = random(...(sp.vy || [-2, -0.5]));

    const mov = this.entity.movement;
    const movType = typeof mov === 'string' ? mov : null;
    if (movType && !['rain', 'bounce', 'gravity'].includes(movType) && this.vy > 0) {
      this.vy = -Math.abs(this.vy);
    }

    if (movType === 'rain') {
      this.x = random(0, this.w);
      this.y = random(-40, -5);
      this.vy = Math.abs(this.vy) || random(2, 5);
      this.rotation = random(-0.1, 0.1);
      this.rotSpeed = random(-0.005, 0.005);
      this.life = 1;
      this.decay = random(0.003, 0.008);
    } else if (this.customConfig.renderMode === 'fluid') {
      this.x = centerX + random(-30, 30);
      this.y = feetY + random(30, 50);
      this.rotation = random(-0.3, 0.3);
      this.rotSpeed = random(-0.01, 0.01);
      this.life = 1;
      this.decay = random(0.004, 0.009);
    } else {
      this.x = centerX + random(-110, 110);
      this.y = feetY + random(-30, 80);
      this.rotation = random(-0.15, 0.15);
      this.rotSpeed = random(-0.02, 0.02);
      this.life = 1;
      this.decay = random(0.005, 0.013);
    }

    this.movementPhase = random(0, Math.PI * 2);
  }

  _resetPreset(centerX, feetY) {
    switch (this.type) {
      case AURA_TYPES.FIRE:
        this.x = centerX + random(-60, 60);
        this.y = feetY + random(-10, 40);
        this.vx = (this.x - centerX) * 0.005 + random(-0.2, 0.2);
        this.vy = random(-3.5, -1);
        this.size = random(30, 70);
        this.life = 1;
        this.decay = random(0.008, 0.02);
        this.hue = random(0, 35);
        break;

      case AURA_TYPES.WIND:
        this.initialX = centerX;
        this.y = feetY + random(20, 100);
        this.vy = random(-3, -1.5);
        this.amplitude = random(40, 90);
        this.frequency = random(0.015, 0.03);
        this.phase = random(0, Math.PI * 2);
        this.x = this.initialX + Math.sin(this.y * this.frequency + this.phase) * this.amplitude;
        this.size = random(20, 40);
        this.life = 1;
        this.decay = 0.008;
        this.hue = random(150, 170);
        break;

      case AURA_TYPES.ELECTRIC: {
        this.x = centerX + random(-80, 80);
        this.y = feetY - random(0, 180);
        this.points = [];
        let curX = this.x, curY = this.y;
        for (let i = 0; i < 5; i++) {
          this.points.push({ x: curX, y: curY });
          curX += random(-20, 20);
          curY += random(-20, 20);
        }
        this.life = 1;
        this.decay = random(0.02, 0.08);
        this.size = random(1, 4);
        this.hue = random(250, 280);
        break;
      }

      case AURA_TYPES.COSMIC: {
        this.isStar = false;
        this.x = centerX;
        this.y = this.h * 0.5;
        const angle = random(0, Math.PI * 2);
        const speed = random(3, 8);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = random(1, 3);
        this.life = 1;
        this.decay = random(0.01, 0.03);
        this.hue = random(200, 320);
        if (this.variant > 0.8) {
          this.vx = 0;
          this.vy = 0;
          this.x = centerX + random(-150, 150);
          this.y = this.h * 0.5 + random(-150, 150);
          this.size = random(2, 5);
          this.decay = random(0.005, 0.01);
          this.isStar = true;
        }
        break;
      }

      case AURA_TYPES.SAKURA:
        this.x = centerX + random(-100, 100);
        this.y = feetY + 50;
        this.vx = random(-1, 1);
        this.vy = random(-3, -1);
        this.size = random(4, 8);
        this.rotation = random(0, 360);
        this.rotSpeed = random(-5, 5);
        this.life = 1;
        this.decay = random(0.005, 0.015);
        this.hue = random(330, 350);
        break;

      default:
        break;
    }
  }

  update() {
    if (this.type === AURA_TYPES.CUSTOM && this.customConfig) {
      this._updateCustom();
      return;
    }
    this._updatePreset();
  }

  _updateCustom() {
    const isFluidMode = this.customConfig.renderMode === 'fluid';
    const speedMult = this.speedMultiplier || 1.0;
    this.x += this.vx * speedMult;
    this.y += this.vy * speedMult;
    if (this.rotSpeed) this.rotation += this.rotSpeed;
    this.movementPhase = (this.movementPhase || 0) + 0.08;

    if (isFluidMode) {
      const maxSize = (this.entity?.size?.[1] || 45) * 4;
      if (this.size < maxSize) {
        this.size *= 1.012 + (1 - this.life) * 0.008;
      }
      const drift = 0.05 + (1 - this.life) * 0.12;
      this.vx += random(-drift, drift);
      this.vx = clamp(this.vx, -2, 2);
      this.vy *= 0.994;
    }

    const movement = this.entity?.movement || 'float';
    const centerX = this.w / 2;
    const centerY = this.h * FEET_Y_RATIO;

    if (typeof movement === 'object') {
      this._applyObjectMovement(movement, centerX, centerY);
    } else {
      this._applyPresetMovement(movement, centerX, centerY);
    }

    this.life -= this.decay;
    if (this.life <= 0) this.reset();
  }

  _applyObjectMovement(m, centerX, centerY) {
    if (m.gravity) this.vy += clamp(m.gravity, -0.15, 0.15);
    if (m.friction) { const f = clamp(m.friction, 0.9, 1.0); this.vx *= f; this.vy *= f; }
    if (m.wave) {
      const amp = clamp(m.wave.amp || 1, 0.1, 5);
      const freq = clamp(m.wave.freq || 1, 0.1, 5);
      const waveVal = Math.sin(this.movementPhase * freq) * amp;
      if (m.wave.axis === 'y') this.y += waveVal;
      else if (m.wave.axis === 'both') { this.x += waveVal; this.y += Math.cos(this.movementPhase * freq) * amp * 0.5; }
      else this.x += waveVal;
    }
    if (m.attract) { const a = clamp(m.attract, -0.01, 0.01); this.vx += (centerX - this.x) * a; this.vy += (centerY - this.y) * a; }
    if (m.spin) { const sp = clamp(m.spin, -3, 3); this.x += Math.cos(this.movementPhase * sp) * 1.5; this.y += Math.sin(this.movementPhase * sp) * 1.5; }
    if (m.jitter) { const j = clamp(m.jitter, 0, 0.5); this.vx += random(-j, j); this.vy += random(-j, j); }
    if (m.bounce) {
      const floor = this.h * clamp(m.bounce.floor || 0.75, 0.5, 0.9);
      if (this.y > floor) { this.y = floor; this.vy *= -clamp(m.bounce.elasticity || 0.6, 0.1, 0.9); }
    }
    if (m.scale) this.size *= clamp(m.scale, 0.95, 1.05);
    this.vx = clamp(this.vx, -8, 8);
    this.vy = clamp(this.vy, -8, 8);
  }

  _applyPresetMovement(movement, centerX, centerY) {
    switch (movement) {
      case 'float': this.x += Math.sin(this.movementPhase) * 0.5; break;
      case 'zigzag': this.x += Math.sin(this.movementPhase * 2.5) * 1.8; break;
      case 'orbit': this.x += Math.sin(this.movementPhase) * 2; this.y += Math.cos(this.movementPhase) * 0.5; break;
      case 'rise': this.vy -= 0.01; this.x += Math.sin(this.movementPhase * 0.8) * 0.3; break;
      case 'wander': this.vx += random(-0.1, 0.1); this.vy += random(-0.1, 0.1); break;
      case 'spiral': { const r = (1 - this.life) * 3; this.x += Math.cos(this.movementPhase * 2) * r; this.y += Math.sin(this.movementPhase * 2) * r; break; }
      case 'rain': this.x += Math.sin(this.movementPhase * 0.5) * 0.5; this.vy += 0.08; if (this.y > this.h + 20) this.reset(); break;
      case 'explode': this.vx *= 0.97; this.vy *= 0.97; break;
      case 'swarm': this.vx += (centerX - this.x) * 0.002; this.vy += (centerY - this.y) * 0.002; break;
      case 'bounce': this.vy += 0.08; if (this.y > this.h * 0.75) { this.y = this.h * 0.75; this.vy *= -0.6; } break;
      case 'pulse': { const dx = this.x - centerX; const dy = this.y - centerY; const ps = Math.sin(this.movementPhase * 2) * 0.02; this.x += dx * ps; this.y += dy * ps; break; }
      case 'vortex': { const vdx = centerX - this.x; const vdy = centerY - this.y; const d = Math.sqrt(vdx * vdx + vdy * vdy) || 1; this.vx += (vdy / d) * 0.3; this.vy += (-vdx / d) * 0.3; this.vx += vdx * 0.001; this.vy += vdy * 0.001; break; }
      case 'levitate': this.vy -= 0.015; this.x += Math.sin(this.movementPhase * 1.2) * 0.8; this.vx *= 0.95; break;
      case 'fountain': this.vy += 0.06; this.x += Math.sin(this.movementPhase * 0.5) * 0.2; if (this.y > this.h * 0.8) this.vy = random(-3, -2); break;
      case 'wave': { const wa = Math.sin(this.movementPhase * 1.5) * 2.5; this.x += wa; this.y += Math.sin(this.movementPhase * 2) * 0.3; break; }
      case 'tornado': { const tr = (this.h * 0.6 - this.y) * 0.15; this.x += Math.cos(this.movementPhase * 3) * tr * 0.2; this.vx = Math.cos(this.movementPhase * 3) * 1.5; this.vy -= 0.08; break; }
      case 'drift': this.vy -= 0.008; this.vx += random(-0.05, 0.05); this.x += Math.sin(this.movementPhase * 0.6) * 0.4; break;
      case 'flutter': this.vy -= random(0.01, 0.03); this.vx += random(-0.3, 0.3); this.x += Math.sin(this.movementPhase * 4) * random(0.5, 1.5); this.y += Math.cos(this.movementPhase * 3) * random(0.2, 0.8); this.vx *= 0.96; break;
      case 'whirlpool': { const wx = centerX - this.x; const wy = centerY - this.y; const wd = Math.sqrt(wx * wx + wy * wy) || 1; this.vx += (wy / wd) * 0.25; this.vy += (-wx / wd) * 0.25; this.vx += wx * 0.003; this.vy += wy * 0.003 + 0.02; break; }
      case 'magnetic': { const mx = centerX - this.x; const my = centerY - this.y; const mf = Math.sin(this.movementPhase) * 0.05; this.vx += mx * mf; this.vy += my * mf; this.vx *= 0.98; this.vy *= 0.98; break; }
      case 'gravity': this.vy += 0.12; this.vx *= 0.99; if (this.y > this.h * 0.9) this.reset(); break;
      case 'hover': { if (!this.spawnX) this.spawnX = this.x; if (!this.spawnY) this.spawnY = this.y; this.vx += (this.spawnX - this.x) * 0.01; this.vy += (this.spawnY - this.y) * 0.01 + Math.sin(this.movementPhase * 1.5) * 0.03; this.vx *= 0.95; this.vy *= 0.95; break; }
    }
  }

  _updatePreset() {
    const speedMult = this.speedMultiplier || 1.0;
    switch (this.type) {
      case AURA_TYPES.FIRE:
        this.x += this.vx * speedMult; this.y += this.vy * speedMult; this.vx *= 0.99; this.size *= 0.96; this.life -= this.decay; break;
      case AURA_TYPES.WIND:
        this.y += this.vy * speedMult; this.x = this.initialX + Math.sin(this.y * this.frequency + this.phase) * this.amplitude; this.life -= this.decay; break;
      case AURA_TYPES.ELECTRIC:
        this.life -= this.decay; if (Math.random() > 0.8) this.reset(); break;
      case AURA_TYPES.COSMIC:
        this.x += this.vx * speedMult; this.y += this.vy * speedMult; this.life -= this.decay; break;
      case AURA_TYPES.SAKURA:
        this.y += this.vy * speedMult; this.x += Math.sin(this.y * 0.05) * 0.5; this.rotation += this.rotSpeed; this.life -= this.decay; break;
    }
    if (this.life <= 0) this.reset();
  }

  draw(ctx) {
    ctx.save();

    // Fade particles based on distance from character center
    const cx = this.w / 2;
    const cy = this.h * CENTER_Y_RATIO;
    const dx = this.x - cx;
    const dy = this.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const fadeRadius = Math.min(this.w, this.h) * 0.28;
    const distFade = dist > fadeRadius ? clamp(1 - (dist - fadeRadius) / (fadeRadius * 0.9), 0, 1) : 1;
    ctx.globalAlpha = distFade;

    if (this.type === AURA_TYPES.CUSTOM && this.customConfig && this.entity?.shapes) {
      this._drawCustom(ctx);
    } else {
      this._drawPreset(ctx);
    }

    ctx.restore();
  }

  _drawCustom(ctx) {
    const style = this.entity.style || 'solid';
    const s = this.size * (this.sizeMultiplier || 1.0);

    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation || 0);

    if (style === 'smoke') {
      if (this.customConfig?.renderMode === 'fluid') {
        ctx.globalCompositeOperation = 'source-over';
        const opacity = this.life * this.life * 0.35;
        const { r, g, b } = hexToRgb(this.entity.shapes?.[0]?.fill || '#888888');
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.2);
        grad.addColorStop(0, `rgba(${r},${g},${b},${opacity})`);
        grad.addColorStop(0.4, `rgba(${r},${g},${b},${opacity * 0.6})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = this.life * 0.3; this._drawShapes(ctx, s * 2);
        ctx.globalAlpha = this.life * 0.45; this._drawShapes(ctx, s * 1.4);
        ctx.globalAlpha = this.life * 0.7; this._drawShapes(ctx, s);
      }
    } else if (style === 'glow') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.life * 0.15; this._drawShapes(ctx, s * 2);
      ctx.globalAlpha = this.life * 0.35; this._drawShapes(ctx, s * 1.3);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = this.life * 0.9; this._drawShapes(ctx, s);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = this.customConfig?.renderMode === 'fluid' ? this.life * 0.6 : this.life;
      this._drawShapes(ctx, s);
    }
  }

  _drawPreset(ctx) {
    const sizeMult = this.sizeMultiplier || 1.0;
    switch (this.type) {
      case AURA_TYPES.FIRE: {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = this.life * 0.8;
        const fs = this.size * sizeMult;
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, fs);
        grad.addColorStop(0, 'hsla(40, 100%, 60%, 1)');
        grad.addColorStop(0.5, `hsla(${this.hue}, 100%, 50%, 0.6)`);
        grad.addColorStop(1, 'hsla(0, 100%, 20%, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(this.x, this.y, fs, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case AURA_TYPES.WIND: {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = this.life * 0.5;
        ctx.strokeStyle = `hsla(${this.hue}, 70%, 75%, 1)`;
        ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(this.x, this.y);
        const py = this.y + 15;
        const px = this.initialX + Math.sin(py * this.frequency + this.phase) * this.amplitude;
        ctx.quadraticCurveTo((this.x + px) / 2 + 10, (this.y + py) / 2, px, py);
        ctx.stroke();
        break;
      }
      case AURA_TYPES.ELECTRIC:
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = this.life;
        ctx.strokeStyle = `hsla(${this.hue}, 80%, 70%, 1)`;
        ctx.lineWidth = this.size * sizeMult;
        ctx.shadowBlur = 10; ctx.shadowColor = `hsla(${this.hue}, 90%, 50%, 0.8)`;
        ctx.lineJoin = 'round'; ctx.beginPath();
        if (this.points?.length) { ctx.moveTo(this.points[0].x, this.points[0].y); for (const p of this.points) ctx.lineTo(p.x, p.y); }
        ctx.stroke(); ctx.shadowBlur = 0;
        break;
      case AURA_TYPES.COSMIC:
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = this.life;
        if (this.isStar) {
          ctx.fillStyle = 'white'; ctx.shadowBlur = 10; ctx.shadowColor = `hsla(${this.hue}, 80%, 60%, 1)`;
          ctx.beginPath(); ctx.arc(this.x, this.y, this.size * (0.5 + Math.random() * 0.5), 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.strokeStyle = `hsla(${this.hue}, 90%, 70%, 1)`; ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.shadowBlur = 5; ctx.shadowColor = `hsla(${this.hue}, 100%, 50%, 1)`;
          ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3); ctx.stroke();
        }
        break;
      case AURA_TYPES.SAKURA:
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = this.life * 0.9;
        ctx.fillStyle = `hsla(${this.hue}, 80%, 85%, 1)`;
        ctx.translate(this.x, this.y); ctx.rotate(this.rotation * Math.PI / 180);
        ctx.beginPath(); ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, Math.PI * 2); ctx.fill();
        break;
    }
  }

  _drawShapes(ctx, s) {
    for (const shape of this.entity.shapes) {
      if (shape.fill) ctx.fillStyle = shape.fill;
      if (shape.stroke) { ctx.strokeStyle = shape.stroke; ctx.lineWidth = (shape.strokeWidth || shape.width || 0.02) * s; }
      switch (shape.type) {
        case 'circle':
          ctx.beginPath(); ctx.arc((shape.cx || 0) * s, (shape.cy || 0) * s, (shape.r || 0.1) * s, 0, Math.PI * 2);
          if (shape.fill) ctx.fill(); if (shape.stroke) ctx.stroke(); break;
        case 'ellipse':
          ctx.beginPath(); ctx.ellipse((shape.cx || 0) * s, (shape.cy || 0) * s, (shape.rx || 0.1) * s, (shape.ry || 0.1) * s, 0, 0, Math.PI * 2);
          if (shape.fill) ctx.fill(); if (shape.stroke) ctx.stroke(); break;
        case 'rect':
          if (shape.fill) ctx.fillRect((shape.x || 0) * s, (shape.y || 0) * s, (shape.w || 0.1) * s, (shape.h || 0.1) * s);
          if (shape.stroke) ctx.strokeRect((shape.x || 0) * s, (shape.y || 0) * s, (shape.w || 0.1) * s, (shape.h || 0.1) * s); break;
        case 'triangle': {
          const p = shape.points || [0, -0.3, -0.3, 0.3, 0.3, 0.3];
          ctx.beginPath(); ctx.moveTo(p[0] * s, p[1] * s); ctx.lineTo(p[2] * s, p[3] * s); ctx.lineTo(p[4] * s, p[5] * s); ctx.closePath();
          if (shape.fill) ctx.fill(); if (shape.stroke) ctx.stroke(); break;
        }
        case 'line':
          ctx.beginPath(); ctx.strokeStyle = shape.stroke || shape.fill || '#fff'; ctx.lineWidth = (shape.width || 0.02) * s;
          ctx.moveTo((shape.x1 || 0) * s, (shape.y1 || 0) * s); ctx.lineTo((shape.x2 || 0) * s, (shape.y2 || 0) * s); ctx.stroke(); break;
        case 'arc':
          ctx.beginPath(); ctx.arc((shape.cx || 0) * s, (shape.cy || 0) * s, (shape.r || 0.2) * s, shape.startAngle || 0, shape.endAngle || Math.PI, shape.counterClockwise || false);
          if (shape.fill) { ctx.closePath(); ctx.fill(); }
          if (shape.stroke) { ctx.strokeStyle = shape.stroke; ctx.lineWidth = (shape.strokeWidth || shape.width || 0.02) * s; ctx.stroke(); } break;
        case 'polygon': {
          const pts = shape.points || [];
          if (pts.length >= 4) {
            ctx.beginPath(); ctx.moveTo(pts[0] * s, pts[1] * s);
            for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] * s, pts[i + 1] * s);
            ctx.closePath(); if (shape.fill) ctx.fill(); if (shape.stroke) ctx.stroke();
          }
          break;
        }
      }
    }
  }
}
