import { TAU, MAX_FLAME_POINTS, LUT_SIZE, CENTER_Y_RATIO } from './constants';
import { hexToRgb, deriveGradientColors } from './utils';

export default class FlameContourRenderer {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.cx = canvasWidth / 2;
    this.cy = canvasHeight * CENTER_Y_RATIO;
    this.time = 0;
    this.config = null;

    this.sinLUT = new Float32Array(LUT_SIZE);
    this.cosLUT = new Float32Array(LUT_SIZE);
    for (let i = 0; i < LUT_SIZE; i++) {
      const a = (i / LUT_SIZE) * TAU;
      this.sinLUT[i] = Math.sin(a);
      this.cosLUT[i] = Math.cos(a);
    }

    this.flameOffsets = [];
    for (let i = 0; i < MAX_FLAME_POINTS; i++) {
      this.flameOffsets.push(Math.random() * 1000);
    }

    this.bolts = [];
    this.boltTimer = 0;
    this.streaks = [];
    this.streakTimer = 0;
    this.orbs = [];
    this.silhouetteRadii = null;
  }

  setSilhouette(radii) { this.silhouetteRadii = radii; }
  setConfig(config) {
    const natureChanged = config?.nature !== this.config?.nature;
    this.config = config;
    if (config && (this.orbs.length === 0 || natureChanged)) this._seedOrbs();
  }

  sin(deg) { return this.sinLUT[((deg % 360) + 360) % 360 | 0]; }
  cos(deg) { return this.cosLUT[((deg % 360) + 360) % 360 | 0]; }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.cx = w / 2;
    this.cy = h * CENTER_Y_RATIO;
  }

  update(dt) {
    if (!this.config) return;
    this.time += dt * (this.config.speed || 1);
    const fx = this._overlayEffect();
    if (fx === 'bolts') this._updateBolts(dt);
    else if (fx === 'streaks') this._updateStreaks(dt);
    this._updateOrbs(dt);
  }

  /** bolts only for electric/devastating, streaks for calm, nothing for the rest */
  _overlayEffect() {
    const o = this.config?.overlay;
    if (o === 'bolts' || o === 'streaks' || o === 'none') return o;
    if ((this.config?.smoothness || 0) >= 0.6) return 'streaks';
    if ((this.config?.smoothness || 0) <= 0.15) return 'bolts';
    return 'none';
  }

  // --- Point generation ---

  buildFlamePoints(scaleMul) {
    const f = this.config;
    if (!f) return [];

    const isOrganic = f.contourStyle === 'flame';
    const intensity = f.intensity || 1.0;
    const baseW = this.w * 0.183 * scaleMul;
    const topH = this.h * 0.383 * scaleMul;
    const botH = this.h * 0.16 * scaleMul;
    const modW = 0.95 + (f.thickness || 0.6) * 0.5 * intensity;
    const modTop = 0.8 + (f.height || 1.0) * 0.15 * intensity;
    const modBot = 0.9 + intensity * 0.1;
    const t = this.time;
    const jagged = f.jaggedness || 0.5;

    const points = [];
    for (let i = 0; i < MAX_FLAME_POINTS; i++) {
      const frac = i / MAX_FLAME_POINTS;
      const angle = frac * TAU;
      const degIdx = (frac * 360) | 0;
      const cosA = this.cos(degIdx);
      const sinA = this.sin(degIdx);
      const isTop = sinA < 0;
      const absSin = Math.abs(sinA);
      const dirScale = isTop ? 0.4 + absSin * 0.6 : 0.15;

      let flameMod;
      if (isOrganic) {
        const tongueA = Math.sin(angle * 6 + t * 2.2 + this.flameOffsets[0]);
        const tongueB = Math.sin(angle * 11 + t * 3.8 + this.flameOffsets[1]) * 0.4;
        const tongueC = Math.sin(angle * 3 + t * 1.3 + this.flameOffsets[2]) * 0.3;
        const tongueAmp = (0.45 + Math.max(0, tongueA + tongueB + tongueC) * 0.85) * jagged * 0.45 * dirScale;
        const n1 = Math.sin(t * 1.5 + this.flameOffsets[i] + angle * 2.5) * 0.12 * dirScale;
        const n2 = Math.sin(t * 2.8 + this.flameOffsets[i] * 1.5 + angle * 4) * 0.06 * dirScale;
        flameMod = 1.0 + tongueAmp + n1 + n2;
      } else {
        const rawSpike = i % 2 === 0
          ? jagged * (0.4 + 0.35 * Math.sin(t * 3.2 + this.flameOffsets[i]))
          : -jagged * (0.15 + 0.1 * Math.sin(t * 2.8 + this.flameOffsets[i] * 1.3));
        const spikeAmp = 1.0 + rawSpike * dirScale;
        const n1 = Math.sin(t * 2.5 + this.flameOffsets[i] + angle * 4) * 0.2 * dirScale;
        const n2 = Math.sin(t * 5.0 + this.flameOffsets[i] * 2.1 + angle * 7) * 0.12 * jagged * dirScale;
        flameMod = spikeAmp * (1 + (n1 + n2) * 0.3);
      }

      const horizTaper = isTop
        ? 1.0 - Math.pow(absSin, 1.8) * 0.45
        : 1.0 - Math.pow(sinA, 4) * 0.25;

      points.push({
        x: this.cx + cosA * baseW * modW * flameMod * horizTaper,
        y: this.cy + sinA * (isTop ? topH * modTop : botH * modBot) * flameMod,
      });
    }
    return points;
  }

  buildFlamePath(ctx, points) {
    const len = points.length;
    const s = this.config?.smoothness ?? 0.2;
    const isFlameStyle = this.config?.contourStyle === 'flame';

    ctx.beginPath();
    if (!isFlameStyle && s < 0.15) {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < len; i++) ctx.lineTo(points[i].x, points[i].y);
    } else if (isFlameStyle || s > 0.5) {
      ctx.moveTo((points[0].x + points[1].x) / 2, (points[0].y + points[1].y) / 2);
      for (let i = 1; i < len; i++) {
        const curr = points[i];
        const next = points[(i + 1) % len];
        ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
      }
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < len; i++) {
        const curr = points[i];
        if (i % 2 !== 0 && (this.flameOffsets[i % MAX_FLAME_POINTS] % 1) > (1.0 - s)) {
          const next = points[(i + 1) % len];
          ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
        } else {
          ctx.lineTo(curr.x, curr.y);
        }
      }
    }
    ctx.closePath();
  }

  // --- Aura rendering ---

  drawAuraOnly(ctx) {
    if (!this.config) return;
    const { baseColor = '#FF6600', tipColor = '#FFDD00', dualLayer, dualColor, gradientColors } = this.config;

    const outerPts = this.buildFlamePoints(1.0);
    const innerPts = this.buildFlamePoints(0.6);

    // Flatten inner contour below center to hug the character's feet
    for (let i = 0; i < innerPts.length && i < outerPts.length; i++) {
      const dy = innerPts[i].y - this.cy;
      if (dy > 0) {
        const blend = Math.min(1, dy / (this.h * 0.15)) * 0.88;
        innerPts[i].x += (outerPts[i].x - innerPts[i].x) * blend;
        innerPts[i].y += (outerPts[i].y - innerPts[i].y) * blend;
      }
    }

    this._drawFlameBand(ctx, outerPts, innerPts, baseColor, tipColor);

    const colors = gradientColors?.length >= 3
      ? gradientColors
      : deriveGradientColors(baseColor, tipColor);
    this._drawGradientSweep(ctx, outerPts, innerPts, colors);

    if (dualLayer && dualColor) {
      this._drawFlameShape(ctx, outerPts, dualColor, baseColor, 1.15, 0.35);
    }
    this._drawFlameShape(ctx, outerPts, baseColor, tipColor, 1.0, 0.8);
    this._drawInnerBorder(ctx, innerPts, baseColor, tipColor);
  }

  drawBoltsAndGlow(ctx) {
    if (!this.config) return;
    const fx = this._overlayEffect();
    if (fx === 'bolts') this._drawBolts(ctx);
    else if (fx === 'streaks') this._drawStreaks(ctx);
    this._drawOrbs(ctx);
    this._drawLowerBodyGlow(ctx);
  }

  // --- Private: animated multi-color gradient ---

  _drawGradientSweep(ctx, outerPts, innerPts, colors) {
    const count = colors.length;
    const rotation = this.time * 0.4;
    const sliceAngle = TAU / count;
    const reach = Math.max(this.w, this.h) * 0.6;

    ctx.save();
    this.buildFlamePath(ctx, outerPts);
    ctx.clip();

    for (let i = 0; i < count; i++) {
      const angle = rotation + i * sliceAngle;
      const nextAngle = angle + sliceAngle;
      const color = colors[i];
      const nextColor = colors[(i + 1) % count];

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45;

      ctx.beginPath();
      ctx.moveTo(this.cx, this.cy);
      ctx.arc(this.cx, this.cy, reach, angle, nextAngle);
      ctx.closePath();

      const midAngle = (angle + nextAngle) / 2;
      const gx = this.cx + Math.cos(midAngle) * reach * 0.7;
      const gy = this.cy + Math.sin(midAngle) * reach * 0.7;
      const grad = ctx.createRadialGradient(this.cx, this.cy, reach * 0.15, gx, gy, reach * 0.65);
      grad.addColorStop(0, color + '00');
      grad.addColorStop(0.3, color + '55');
      grad.addColorStop(0.6, nextColor + '88');
      grad.addColorStop(1, nextColor + '11');

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'destination-out';
    this.buildFlamePath(ctx, innerPts);
    ctx.globalAlpha = 0.9;
    ctx.fill();

    ctx.restore();
  }

  // --- Private: aura band / shape / border ---

  _drawFlameBand(ctx, outerPts, innerPts, baseColor, tipColor) {
    if (outerPts.length < 3) return;
    const intensity = this.config?.intensity || 1.0;

    ctx.save();
    this.buildFlamePath(ctx, outerPts);
    ctx.clip();

    const phase = this.time * 1.8;
    const bandR = Math.max(this.w, this.h) * 0.45 * intensity;
    const grad = ctx.createRadialGradient(this.cx, this.cy, bandR * 0.2, this.cx, this.cy, bandR);
    const alphaA = Math.round((0.5 + 0.45 * Math.sin(phase)) * 200).toString(16).padStart(2, '0');
    const alphaB = Math.round((0.5 + 0.45 * Math.sin(phase + 2.1)) * 180).toString(16).padStart(2, '0');

    grad.addColorStop(0, baseColor + '00');
    grad.addColorStop(0.15, baseColor + '00');
    grad.addColorStop(0.35, baseColor + alphaA);
    grad.addColorStop(0.55, tipColor + alphaB);
    grad.addColorStop(0.72, tipColor + alphaA);
    grad.addColorStop(0.88, baseColor + 'BB');
    grad.addColorStop(1, baseColor + '55');

    ctx.globalAlpha = 0.8;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.globalCompositeOperation = 'destination-out';
    this.buildFlamePath(ctx, innerPts);
    ctx.globalAlpha = 0.95;
    ctx.fill();
    ctx.restore();
  }

  _drawFlameShape(ctx, points, baseColor, tipColor, scale, baseAlpha) {
    if (points.length < 3) return;
    const intensity = this.config?.intensity || 1.0;
    const sm = this.config?.smoothness ?? 0.2;

    ctx.save();
    if (scale !== 1.0) {
      ctx.translate(this.cx, this.cy);
      ctx.scale(scale, scale);
      ctx.translate(-this.cx, -this.cy);
    }

    const flameR = Math.max(this.w, this.h) * 0.45 * intensity;
    const hollowGrad = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, flameR);
    hollowGrad.addColorStop(0, baseColor + '00');
    hollowGrad.addColorStop(0.35, baseColor + '00');
    hollowGrad.addColorStop(0.50, baseColor + '06');
    hollowGrad.addColorStop(0.60, baseColor + '18');
    hollowGrad.addColorStop(0.70, baseColor + '55');
    hollowGrad.addColorStop(0.80, baseColor + '99');
    hollowGrad.addColorStop(0.88, tipColor + 'CC');
    hollowGrad.addColorStop(0.95, tipColor + 'EE');
    hollowGrad.addColorStop(1, tipColor + 'DD');

    ctx.globalAlpha *= baseAlpha;
    this.buildFlamePath(ctx, points);
    ctx.fillStyle = hollowGrad;
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 35 * intensity;
    ctx.fill();

    // Multi-layered luminescent outer stroke
    const strokePasses = [
      { comp: 'lighter', blur: 70, color: baseColor + '33', width: 12 },
      { comp: 'lighter', blur: 40, color: tipColor + '55', width: 7 },
      { comp: 'source-over', blur: 25, color: tipColor + 'CC', width: 2.5, join: sm > 0.5 ? 'round' : 'miter' },
      { comp: 'source-over', blur: 8, color: '#FFFFFF77', width: 1 },
    ];

    for (const pass of strokePasses) {
      this.buildFlamePath(ctx, points);
      ctx.globalCompositeOperation = pass.comp;
      ctx.shadowBlur = pass.blur;
      ctx.shadowColor = pass.color.slice(0, 7);
      ctx.strokeStyle = pass.color;
      ctx.lineWidth = pass.width;
      ctx.lineJoin = pass.join || 'round';
      if (pass.join === 'miter') ctx.miterLimit = 12;
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawInnerBorder(ctx, pts, baseColor, tipColor) {
    if (pts.length < 3) return;
    const sm = this.config?.smoothness ?? 0.2;
    const pulse = 0.5 + 0.35 * Math.sin(this.time * 2.0);

    ctx.save();
    this.buildFlamePath(ctx, pts);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = tipColor + 'BB';
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 2;
    ctx.lineJoin = sm > 0.5 ? 'round' : 'miter';
    ctx.miterLimit = 10;
    ctx.stroke();

    this.buildFlamePath(ctx, pts);
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF44';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  // --- Private: bolts (aggressive auras) ---

  _spawnBolt() {
    const f = this.config;
    if (!f) return null;
    const intensity = f.intensity || 1.0;
    const angle = Math.random() * TAU;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const rFrac = 0.3 + Math.random() * 0.5;

    let startX, startY;
    if (this.silhouetteRadii) {
      const silR = this.silhouetteRadii[Math.round((angle / TAU) * 360) % 360];
      startX = this.cx + cosA * silR * rFrac;
      startY = this.cy + sinA * silR * rFrac;
    } else {
      startX = this.cx + cosA * this.w * 0.18 * (f.thickness || 0.6) * intensity * rFrac;
      startY = this.cy + sinA * this.h * 0.22 * intensity * rFrac;
    }

    const boltAngle = angle + (Math.random() - 0.5) * 1.2;
    const boltLen = (30 + Math.random() * 60) * intensity;
    const segments = 4 + Math.floor(Math.random() * 5);
    const pts = [{ x: startX, y: startY }];

    for (let i = 1; i <= segments; i++) {
      const frac = i / segments;
      const jitter = (Math.random() - 0.5) * boltLen * 0.35;
      pts.push({
        x: startX + Math.cos(boltAngle) * boltLen * frac + (-Math.sin(boltAngle)) * jitter,
        y: startY + Math.sin(boltAngle) * boltLen * frac + Math.cos(boltAngle) * jitter,
      });
    }

    let branch = null;
    if (Math.random() < 0.4 && pts.length > 2) {
      const brIdx = 1 + Math.floor(Math.random() * (pts.length - 2));
      const brAngle = boltAngle + (Math.random() - 0.5) * 1.8;
      const brLen = boltLen * (0.25 + Math.random() * 0.3);
      const brSegs = 2 + Math.floor(Math.random() * 2);
      branch = [{ x: pts[brIdx].x, y: pts[brIdx].y }];
      for (let j = 1; j <= brSegs; j++) {
        const fr = j / brSegs;
        const jit = (Math.random() - 0.5) * brLen * 0.4;
        branch.push({
          x: pts[brIdx].x + Math.cos(brAngle) * brLen * fr + (-Math.sin(brAngle)) * jit,
          y: pts[brIdx].y + Math.sin(brAngle) * brLen * fr + Math.cos(brAngle) * jit,
        });
      }
    }

    return { points: pts, branch, life: 1.0, maxLife: 0.08 + Math.random() * 0.14, width: 1.0 + Math.random() * 1.5 };
  }

  _updateBolts(dt) {
    if (!this.config) return;
    const isAggressive = this.config.nature === 'aggressive';
    this.boltTimer += dt;
    const interval = isAggressive ? 0.04 + Math.random() * 0.08 : 0.08 + Math.random() * 0.18;
    if (this.boltTimer >= interval) {
      this.boltTimer = 0;
      const count = isAggressive ? (Math.random() < 0.4 ? 3 : 2) : (Math.random() < 0.3 ? 2 : 1);
      for (let i = 0; i < count; i++) {
        const bolt = this._spawnBolt();
        if (bolt) this.bolts.push(bolt);
      }
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      this.bolts[i].life -= dt / this.bolts[i].maxLife;
      if (this.bolts[i].life <= 0) this.bolts.splice(i, 1);
    }
  }

  _tracePath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  }

  _drawBoltSegment(ctx, pts, alpha, width, color, glowColor) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'bevel';

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = width + 3;
    this._tracePath(ctx, pts);
    ctx.stroke();

    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    this._tracePath(ctx, pts);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(0.5, width * 0.4);
    ctx.globalAlpha = alpha * 0.9;
    this._tracePath(ctx, pts);
    ctx.stroke();
    ctx.restore();
  }

  _drawBolts(ctx) {
    if (!this.config || this.bolts.length === 0) return;
    const tipColor = this.config.tipColor || this.config.baseColor || '#FFFFFF';
    const glowColor = this.config.baseColor || '#FFDD00';

    for (const bolt of this.bolts) {
      const alpha = Math.pow(bolt.life, 0.5);
      this._drawBoltSegment(ctx, bolt.points, alpha, bolt.width, tipColor, glowColor);
      if (bolt.branch) {
        this._drawBoltSegment(ctx, bolt.branch, alpha * 0.7, bolt.width * 0.6, tipColor, glowColor);
      }
    }
  }

  // --- Private: streaks (calm auras) ---

  _updateStreaks(dt) {
    if (!this.config) return;
    this.streakTimer += dt;
    const interval = 0.12 + Math.random() * 0.18;
    if (this.streakTimer >= interval) {
      this.streakTimer = 0;
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.4;
      const startR = this.w * 0.04 + Math.random() * this.w * 0.06;
      this.streaks.push({
        ox: this.cx + Math.cos(angle) * startR,
        oy: this.cy + Math.sin(angle) * startR,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        len: this.w * 0.15 + Math.random() * this.w * 0.22,
        progress: 0,
        speed: 0.8 + Math.random() * 1.2,
        tailLen: 0.5 + Math.random() * 0.3,
        width: 0.5 + Math.random() * 1.0,
      });
    }
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      this.streaks[i].progress += dt * this.streaks[i].speed;
      if (this.streaks[i].progress > 1.0 + this.streaks[i].tailLen) this.streaks.splice(i, 1);
    }
  }

  _drawStreaks(ctx) {
    if (!this.config || this.streaks.length === 0) return;
    const tipColor = this.config.tipColor || this.config.baseColor || '#FFFFFF';
    const glowColor = this.config.baseColor || '#FFAACC';

    for (const s of this.streaks) {
      const headT = Math.min(s.progress, 1.0);
      const tailT = Math.max(0, s.progress - s.tailLen);
      const headX = s.ox + s.dx * s.len * headT;
      const headY = s.oy + s.dy * s.len * headT;
      const tailX = s.ox + s.dx * s.len * tailT;
      const tailY = s.oy + s.dy * s.len * tailT;

      const fadeOut = s.progress > 1.0 ? 1.0 - (s.progress - 1.0) / s.tailLen : 1.0;
      const alpha = Math.max(0, fadeOut) * 0.55;
      if (alpha <= 0) continue;

      const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
      grad.addColorStop(0, glowColor + '00');
      grad.addColorStop(0.5, glowColor + '66');
      grad.addColorStop(1, tipColor + 'FF');

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = grad;
      ctx.lineWidth = s.width + 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(0.5, s.width * 0.4);
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(headX, headY, s.width * 0.8, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- Private: floating orbs (ambient magic) ---

  _seedOrbs() {
    const ORB_COUNT = 17;
    this.orbs = [];
    for (let i = 0; i < ORB_COUNT; i++) {
      this.orbs.push(this._makeOrb(i / ORB_COUNT));
    }
  }

  _makeOrb(phaseSeed) {
    const aggressive = this.config?.nature === 'aggressive';

    const orbitRx = aggressive
      ? this.w * (0.10 + Math.random() * 0.22)
      : this.w * (0.06 + Math.random() * 0.14);
    const orbitRy = aggressive
      ? this.h * (0.08 + Math.random() * 0.18)
      : this.h * (0.05 + Math.random() * 0.12);

    return {
      phase: phaseSeed * TAU + Math.random() * 1.5,
      orbitRx, orbitRy,
      speed: aggressive ? 0.6 + Math.random() * 0.9 : 0.15 + Math.random() * 0.3,
      driftY: aggressive ? -0.3 - Math.random() * 0.5 : -0.08 - Math.random() * 0.12,
      size: aggressive ? 1.0 + Math.random() * 1.8 : 1.4 + Math.random() * 2.4,
      shimmerSpeed: aggressive ? 5.0 + Math.random() * 6.0 : 1.5 + Math.random() * 2.0,
      shimmerOffset: Math.random() * TAU,
      offsetY: (Math.random() - 0.5) * this.h * 0.3,
      life: 0.6 + Math.random() * 0.4,
      jitterAmp: aggressive ? 0.8 + Math.random() * 1.2 : 0,
    };
  }

  _updateOrbs(dt) {
    const aggressive = this.config?.nature === 'aggressive';
    const decayRate = aggressive ? 0.09 : 0.05;

    for (const orb of this.orbs) {
      orb.phase += dt * orb.speed;
      orb.offsetY += dt * orb.driftY;

      if (orb.jitterAmp > 0) {
        orb.offsetY += (Math.random() - 0.5) * orb.jitterAmp * dt * 8;
      }

      orb.life -= dt * decayRate;
      if (orb.life <= 0) {
        Object.assign(orb, this._makeOrb(Math.random()));
        orb.life = 0.8 + Math.random() * 0.2;
        orb.offsetY = this.h * 0.15 + Math.random() * this.h * 0.1;
      }
    }
  }

  _drawOrbs(ctx) {
    if (!this.config || this.orbs.length === 0) return;
    const gradColors = this.config.gradientColors;
    const fallbackColor = this.config.tipColor || this.config.baseColor || '#FFFFFF';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let idx = 0; idx < this.orbs.length; idx++) {
      const orb = this.orbs[idx];
      const orbColor = gradColors?.length >= 3
        ? gradColors[idx % gradColors.length]
        : fallbackColor;

      const x = this.cx + Math.cos(orb.phase) * orb.orbitRx;
      const y = this.cy + Math.sin(orb.phase) * orb.orbitRy + orb.offsetY;

      const shimmer = 0.22 + 0.78 * Math.pow((Math.sin(this.time * orb.shimmerSpeed + orb.shimmerOffset) + 1) * 0.5, 1.6);
      const alpha = Math.min(1, orb.life * shimmer * 1.2);
      if (alpha < 0.02) continue;

      const r = orb.size * (0.85 + shimmer * 0.5);

      ctx.globalAlpha = alpha * 0.36;
      ctx.shadowColor = orbColor;
      ctx.shadowBlur = 22;
      ctx.fillStyle = orbColor;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.8, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = alpha * 0.84;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.4, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }

  // --- Private: lower body glow ---

  _drawLowerBodyGlow(ctx) {
    if (!this.config) return;
    const { r, g, b } = hexToRgb(this.config.baseColor || '#FF6600');
    const pulse = 0.6 + 0.4 * Math.sin(this.time * 1.2);
    const glowW = this.w * 0.35;
    const glowH = this.h * 0.28;
    const glowCy = this.cy + this.h * 0.12;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18 * pulse;
    const grad = ctx.createRadialGradient(this.cx, glowCy, 0, this.cx, glowCy, Math.max(glowW, glowH));
    grad.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
    grad.addColorStop(0.3, `rgba(${r},${g},${b},0.2)`);
    grad.addColorStop(0.6, `rgba(${r},${g},${b},0.08)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(this.cx, glowCy, glowW, glowH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
