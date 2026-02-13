import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Loader2,
  Sparkles,
  ImagePlus,
  Wand2,
  X,
  Flame,
  Wind,
  Zap,
  CloudFog
} from 'lucide-react';

const AURA_TYPES = {
  NONE: 'none',
  FIRE: 'fire',
  WIND: 'wind',
  ELECTRIC: 'electric',
  COSMIC: 'cosmic',
  EXHAUST: 'exhaust',
  CUSTOM: 'custom'
};

const AURA_COLORS = {
  [AURA_TYPES.NONE]: 'rgba(0,0,0,0)',
  [AURA_TYPES.FIRE]: '#ff5500',
  [AURA_TYPES.WIND]: '#00ffcc',
  [AURA_TYPES.ELECTRIC]: '#aa00ff',
  [AURA_TYPES.COSMIC]: '#6366f1',
  [AURA_TYPES.EXHAUST]: '#94a3b8',
  [AURA_TYPES.CUSTOM]: '#ffffff'
};

const random = (min, max) => Math.random() * (max - min) + min;
const PORTKEY_MODEL = '@vertex-global-region/gemini-3-flash-preview';
const PORTKEY_URL = 'https://api.portkey.ai/v1/chat/completions';
// for flash - use this model
// const PORTKEY_MODEL = '@vertex-global-region/gemini-3-flash-preview';
// const PORTKEY_MODEL = '@vertex-global-region/gemini-3-pro-preview';
// const PORTKEY_MODEL = '@content-rnd-gem-565e6c/gemini-2.5-flash-lite';
// const PORTKEY_MODEL = '@content-rnd-gem-565e6c/gemini-2.5-flash';

async function callLLMText(promptText) {
  const key = "7uuFM238TMkz2A0I+VvMfoZVm9l+"
  if (key && !localStorage.getItem('portkey_api_key')) localStorage.setItem('portkey_api_key', key);
  if (!key) throw new Error('No API key provided. Set it via: localStorage.setItem("portkey_api_key", "your-key")');

  const response = await fetch(PORTKEY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-portkey-api-key': key,
      'x-portkey-provider': 'openai',
    },
    body: JSON.stringify({
      model: PORTKEY_MODEL,
      max_tokens: 32384,
      temperature: 0,
      messages: [{ role: 'user', content: promptText }]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Portkey API Error:", response.status, errorBody);
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

class Particle {
  constructor(type, canvasWidth, canvasHeight, customConfig = null) {
    this.type = type;
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.customConfig = customConfig;
    this.variant = Math.random();
    this.reset(true);
  }

  reset() {
    const centerX = this.w / 2;
    const feetY = this.h * 0.58;

    if (this.type === AURA_TYPES.CUSTOM && this.customConfig) {
      const entities = this.customConfig.entities;
      if (entities && entities.length > 0) {
        const totalWeight = entities.reduce((sum, e) => sum + (e.weight || 1), 0);
        let rand = Math.random() * totalWeight;
        this.entity = entities[0];
        for (const e of entities) {
          rand -= (e.weight || 1);
          if (rand <= 0) { 
            this.entity = e; 
            break; 
          }
        }

        const sizeRange = this.entity.size || [12, 18];
        this.size = random(sizeRange[0], sizeRange[1]);

        const sp = this.entity.speed || {};
        const vxRange = sp.vx || [-1, 1];
        const vyRange = sp.vy || [-2, -0.5];
        this.vx = random(vxRange[0], vxRange[1]);
        this.vy = random(vyRange[0], vyRange[1]);

        const mov = this.entity.movement;
        if (typeof mov === 'string') {
          const downwardTypes = ['rain', 'bounce'];
          if (!downwardTypes.includes(mov) && this.vy > 0) {
            this.vy = -Math.abs(this.vy);
          }
        }

        // Fluid mode: spawn from bottom NARROW, slower decay for smooth blending
        const isFluidMode = this.customConfig.renderMode === 'fluid';
        if (isFluidMode) {
          // Start NARROW at the bottom (like real smoke from a source)
          this.x = centerX + random(-30, 30); // Much narrower spawn area
          this.y = feetY + random(30, 50); // Spawn at bottom
          this.rotation = random(-0.3, 0.3);
          this.rotSpeed = random(-0.01, 0.01); // Slower rotation for fluid
          this.life = 1;
          this.decay = random(0.004, 0.009); // Slower decay for smooth fade
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
    }

    // --- PRESET AURA TYPES ---
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
        let curX = this.x;
        let curY = this.y;
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

      case AURA_TYPES.EXHAUST:
        this.x = centerX + random(-80, 80);
        this.y = feetY + 40;
        this.vx = (this.x - centerX) * 0.05;
        this.vy = random(-2, -0.5);
        this.size = random(10, 30);
        this.rotation = random(0, Math.PI * 2);
        this.rotSpeed = random(-0.01, 0.01);
        this.hue = 220;
        this.life = 1;
        this.decay = random(0.005, 0.02);
        break;

      default:
        break;
    }
  }

  update() {
    if (this.type === AURA_TYPES.CUSTOM && this.customConfig) {
      const isFluidMode = this.customConfig.renderMode === 'fluid';
      
      this.x += this.vx;
      this.y += this.vy;
      if (this.rotSpeed) this.rotation += this.rotSpeed;
      this.movementPhase = (this.movementPhase || 0) + 0.08;

      // Fluid mode enhancements: expand size and add turbulence (REAL SMOKE PHYSICS)
      if (isFluidMode) {
        const initialSize = (this.entity?.size?.[1] || 45);
        const maxSize = initialSize * 4; // Cap at 4x initial size
        
        if (this.size < maxSize) {
          const expansionRate = 1.012 + (1 - this.life) * 0.008;
          this.size *= expansionRate;
        }
        
        // Gentle horizontal drift (widens the plume)
        const driftStrength = 0.05 + (1 - this.life) * 0.12;
        this.vx += random(-driftStrength, driftStrength);
        // Clamp horizontal velocity so it doesn't fly off screen
        this.vx = Math.max(-2, Math.min(2, this.vx));
        
        // Deceleration as smoke rises
        this.vy *= 0.994;
      }

      const movement = this.entity?.movement || 'float';
      const centerX = this.w / 2;
      const centerY = this.h * 0.58;

      if (typeof movement === 'object') {
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const m = movement;

        if (m.gravity) this.vy += clamp(m.gravity, -0.15, 0.15);

        if (m.friction) {
          const f = clamp(m.friction, 0.9, 1.0);
          this.vx *= f;
          this.vy *= f;
        }

        if (m.wave) {
          const amp = clamp(m.wave.amp || 1, 0.1, 5);
          const freq = clamp(m.wave.freq || 1, 0.1, 5);
          const waveVal = Math.sin(this.movementPhase * freq) * amp;
          if (m.wave.axis === 'y') this.y += waveVal;
          else if (m.wave.axis === 'both') { 
            this.x += waveVal; 
            this.y += Math.cos(this.movementPhase * freq) * amp * 0.5; 
          }
          else this.x += waveVal;
        }

        if (m.attract) {
          const a = clamp(m.attract, -0.01, 0.01);
          this.vx += (centerX - this.x) * a;
          this.vy += (centerY - this.y) * a;
        }

        if (m.spin) {
          const sp = clamp(m.spin, -3, 3);
          this.x += Math.cos(this.movementPhase * sp) * 1.5;
          this.y += Math.sin(this.movementPhase * sp) * 1.5;
        }

        if (m.jitter) {
          const j = clamp(m.jitter, 0, 0.5);
          this.vx += random(-j, j);
          this.vy += random(-j, j);
        }

        if (m.bounce) {
          const floor = this.h * (clamp(m.bounce.floor || 0.75, 0.5, 0.9));
          if (this.y > floor) {
            this.y = floor;
            this.vy *= -(clamp(m.bounce.elasticity || 0.6, 0.1, 0.9));
          }
        }

        if (m.scale) {
          this.size *= clamp(m.scale, 0.95, 1.05);
        }

        this.vx = clamp(this.vx, -8, 8);
        this.vy = clamp(this.vy, -8, 8);

      } else {
        switch (movement) {
          case 'float':
            this.x += Math.sin(this.movementPhase) * 0.5;
            break;
          case 'zigzag':
            this.x += Math.sin(this.movementPhase * 2.5) * 1.8;
            break;
          case 'orbit':
            this.x += Math.sin(this.movementPhase) * 2;
            this.y += Math.cos(this.movementPhase) * 0.5;
            break;
          case 'rise':
            this.vy -= 0.01;
            this.x += Math.sin(this.movementPhase * 0.8) * 0.3;
            break;
          case 'wander':
            this.vx += random(-0.1, 0.1);
            this.vy += random(-0.1, 0.1);
            break;
          case 'spiral': {
            const spiralR = (1 - this.life) * 3;
            this.x += Math.cos(this.movementPhase * 2) * spiralR;
            this.y += Math.sin(this.movementPhase * 2) * spiralR;
            break;
          }
          case 'rain':
            this.x += Math.sin(this.movementPhase * 0.5) * 1.2;
            this.vy += 0.03;
            break;
          case 'explode':
            this.vx *= 0.97;
            this.vy *= 0.97;
            break;
          case 'swarm':
            this.vx += (centerX - this.x) * 0.002;
            this.vy += (centerY - this.y) * 0.002;
            break;
          case 'bounce':
            this.vy += 0.08;
            if (this.y > this.h * 0.75) {
              this.y = this.h * 0.75;
              this.vy *= -0.6;
            }
            break;
          case 'pulse': {
            const dx = this.x - centerX;
            const dy = this.y - centerY;
            const pulseScale = Math.sin(this.movementPhase * 2) * 0.02;
            this.x += dx * pulseScale;
            this.y += dy * pulseScale;
            break;
          }
          case 'vortex': {
            const vdx = centerX - this.x;
            const vdy = centerY - this.y;
            const dist = Math.sqrt(vdx * vdx + vdy * vdy) || 1;
            this.vx += (vdy / dist) * 0.3;
            this.vy += (-vdx / dist) * 0.3;
            this.vx += vdx * 0.001;
            this.vy += vdy * 0.001;
            break;
          }
        }
      }

      this.life -= this.decay;
      if (this.life <= 0) this.reset();
      return;
    }

    // --- PRESET AURA TYPES ---
    switch (this.type) {
      case AURA_TYPES.FIRE:
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.99;
        this.size *= 0.96;
        this.life -= this.decay;
        break;

      case AURA_TYPES.WIND:
        this.y += this.vy;
        this.x = this.initialX + Math.sin(this.y * this.frequency + this.phase) * this.amplitude;
        this.life -= this.decay;
        break;

      case AURA_TYPES.ELECTRIC:
        this.life -= this.decay;
        if (Math.random() > 0.8) this.reset();
        break;

      case AURA_TYPES.COSMIC:
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        break;

      case AURA_TYPES.EXHAUST:
        this.x += this.vx;
        this.y += this.vy;
        if (this.rotSpeed) this.rotation += this.rotSpeed;
        this.size *= 1.02;
        this.vx *= 0.98;
        this.life -= this.decay;
        break;
    }

    if (this.life <= 0) {
      this.reset();
    }
  }

  _drawShapes(ctx, s) {
    for (const shape of this.entity.shapes) {
      ctx.beginPath();
      if (shape.fill) ctx.fillStyle = shape.fill;
      if (shape.stroke) {
        ctx.strokeStyle = shape.stroke;
        ctx.lineWidth = (shape.strokeWidth || shape.width || 0.02) * s;
      }

      switch (shape.type) {
        case 'circle':
          ctx.beginPath();
          ctx.arc((shape.cx || 0) * s, (shape.cy || 0) * s, (shape.r || 0.1) * s, 0, Math.PI * 2);
          if (shape.fill) ctx.fill();
          if (shape.stroke) ctx.stroke();
          break;
        case 'ellipse':
          ctx.beginPath();
          ctx.ellipse((shape.cx || 0) * s, (shape.cy || 0) * s, (shape.rx || 0.1) * s, (shape.ry || 0.1) * s, 0, 0, Math.PI * 2);
          if (shape.fill) ctx.fill();
          if (shape.stroke) ctx.stroke();
          break;
        case 'rect':
          if (shape.fill) ctx.fillRect((shape.x || 0) * s, (shape.y || 0) * s, (shape.w || 0.1) * s, (shape.h || 0.1) * s);
          if (shape.stroke) ctx.strokeRect((shape.x || 0) * s, (shape.y || 0) * s, (shape.w || 0.1) * s, (shape.h || 0.1) * s);
          break;
        case 'triangle': {
          const p = shape.points || [0, -0.3, -0.3, 0.3, 0.3, 0.3];
          ctx.beginPath();
          ctx.moveTo(p[0] * s, p[1] * s);
          ctx.lineTo(p[2] * s, p[3] * s);
          ctx.lineTo(p[4] * s, p[5] * s);
          ctx.closePath();
          if (shape.fill) ctx.fill();
          if (shape.stroke) ctx.stroke();
          break;
        }
        case 'line':
          ctx.beginPath();
          ctx.strokeStyle = shape.stroke || shape.fill || '#fff';
          ctx.lineWidth = (shape.width || 0.02) * s;
          ctx.moveTo((shape.x1 || 0) * s, (shape.y1 || 0) * s);
          ctx.lineTo((shape.x2 || 0) * s, (shape.y2 || 0) * s);
          ctx.stroke();
          break;
        case 'arc':
          ctx.beginPath();
          ctx.arc(
            (shape.cx || 0) * s, (shape.cy || 0) * s,
            (shape.r || 0.2) * s,
            shape.startAngle || 0,
            shape.endAngle || Math.PI,
            shape.counterClockwise || false
          );
          if (shape.fill) { 
            ctx.closePath(); 
            ctx.fill(); 
          }
          if (shape.stroke) {
            ctx.strokeStyle = shape.stroke;
            ctx.lineWidth = (shape.strokeWidth || shape.width || 0.02) * s;
            ctx.stroke();
          }
          break;
        case 'polygon': {
          const pts = shape.points || [];
          if (pts.length >= 4) {
            ctx.beginPath();
            ctx.moveTo(pts[0] * s, pts[1] * s);
            for (let i = 2; i < pts.length; i += 2) {
              ctx.lineTo(pts[i] * s, pts[i + 1] * s);
            }
            ctx.closePath();
            if (shape.fill) ctx.fill();
            if (shape.stroke) ctx.stroke();
          }
          break;
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();

    if (this.type === AURA_TYPES.CUSTOM && this.customConfig && this.entity?.shapes) {
      const style = this.entity.style || 'solid';
      const s = this.size;

      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation || 0);

      if (style === 'smoke') {
        const isFluidMode = this.customConfig?.renderMode === 'fluid';
        
        if (isFluidMode) {
          // REAL SMOKE: radial gradient per puff — dense core, soft transparent edge
          ctx.globalCompositeOperation = 'source-over';
          
          // Opacity curve: opaque when young, fades as it rises & expands
          const opacity = this.life * this.life * 0.35; // Quadratic fade
          
          // Get the primary color from shapes
          const baseColor = this.entity.shapes?.[0]?.fill || '#888888';
          const r = parseInt(baseColor.slice(1, 3), 16) || 128;
          const g = parseInt(baseColor.slice(3, 5), 16) || 128;
          const b = parseInt(baseColor.slice(5, 7), 16) || 128;
          
          // Draw as a radial-gradient blob (dense center → transparent edge)
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.2);
          grad.addColorStop(0, `rgba(${r},${g},${b},${opacity})`);
          grad.addColorStop(0.4, `rgba(${r},${g},${b},${opacity * 0.6})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, s * 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Original discrete smoke style (additive for energy effects)
          ctx.globalCompositeOperation = 'lighter';
          
          ctx.globalAlpha = this.life * 0.3;
          this._drawShapes(ctx, s * 2);
          
          ctx.globalAlpha = this.life * 0.45;
          this._drawShapes(ctx, s * 1.4);
          
          ctx.globalAlpha = this.life * 0.7;
          this._drawShapes(ctx, s);
        }

      } else if (style === 'glow') {
        ctx.globalCompositeOperation = 'lighter';
        
        ctx.globalAlpha = this.life * 0.15;
        this._drawShapes(ctx, s * 2);
        
        ctx.globalAlpha = this.life * 0.35;
        this._drawShapes(ctx, s * 1.3);
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = this.life * 0.9;
        this._drawShapes(ctx, s);

      } else {
        // Solid style - check if we're in fluid mode for enhanced blending
        const isFluidMode = this.customConfig?.renderMode === 'fluid';
        if (isFluidMode) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = this.life * 0.6; // More transparent for fluid blending
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = this.life;
        }
        this._drawShapes(ctx, s);
      }
    } else {
      // --- PRESET AURA TYPES ---
      switch (this.type) {
        case AURA_TYPES.FIRE: {
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = this.life * 0.8;
          const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
          gradient.addColorStop(0, 'hsla(40, 100%, 60%, 1)');
          gradient.addColorStop(0.5, `hsla(${this.hue}, 100%, 50%, 0.6)`);
          gradient.addColorStop(1, 'hsla(0, 100%, 20%, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case AURA_TYPES.WIND: {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = this.life * 0.5;
          ctx.strokeStyle = `hsla(${this.hue}, 70%, 75%, 1)`;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          const prevY = this.y + 15;
          const prevX = this.initialX + Math.sin(prevY * this.frequency + this.phase) * this.amplitude;
          ctx.quadraticCurveTo((this.x + prevX) / 2 + 10, (this.y + prevY) / 2, prevX, prevY);
          ctx.stroke();
          break;
        }

        case AURA_TYPES.ELECTRIC:
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = this.life;
          ctx.strokeStyle = `hsla(${this.hue}, 80%, 70%, 1)`;
          ctx.lineWidth = this.size;
          ctx.shadowBlur = 10;
          ctx.shadowColor = `hsla(${this.hue}, 90%, 50%, 0.8)`;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          if (this.points && this.points.length > 0) {
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (const p of this.points) {
              ctx.lineTo(p.x, p.y);
            }
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
          break;

        case AURA_TYPES.COSMIC:
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = this.life;
          if (this.isStar) {
            ctx.fillStyle = 'white';
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsla(${this.hue}, 80%, 60%, 1)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * (0.5 + Math.random() * 0.5), 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.strokeStyle = `hsla(${this.hue}, 90%, 70%, 1)`;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 5;
            ctx.shadowColor = `hsla(${this.hue}, 100%, 50%, 1)`;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
            ctx.stroke();
          }
          break;

        case AURA_TYPES.EXHAUST: {
          ctx.globalCompositeOperation = 'source-over';
          ctx.translate(this.x, this.y);
          ctx.rotate(this.rotation || 0);
          ctx.globalAlpha = this.life;
          const smokeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
          smokeGrad.addColorStop(0, `hsla(${this.hue}, 10%, 80%, 0.8)`);
          smokeGrad.addColorStop(1, `hsla(${this.hue}, 10%, 40%, 0)`);
          ctx.fillStyle = smokeGrad;
          ctx.beginPath();
          ctx.arc(0, 0, this.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    }

    ctx.restore();
  }
}


export default function AuraStudio() {
  const [activeAura, setActiveAura] = useState(AURA_TYPES.NONE);
  const [avatar, setAvatar] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [promptInput, setPromptInput] = useState("");
  const [customAuraConfig, setCustomAuraConfig] = useState(null);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const fileInputRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setAvatar(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const generateAura = async () => {
    if (!promptInput.trim()) return;
    setAiLoading(true);
    setAiMessage("The Alchemist is designing particle physics...");

    const systemPrompt = `You are a JSON-only particle configuration generator for a Canvas 2D aura engine. Output valid JSON only — no markdown, no backticks, no commentary.

=== ENGINE SPEC ===

Coordinates: center=(0,0), range -0.5 to 0.5 relative to particle size. Negative vy = UP, positive vy = DOWN.

Shapes (layered bottom-to-top in each entity):
circle: {type,cx,cy,r,fill}, ellipse: {type,cx,cy,rx,ry,fill}, rect: {type,x,y,w,h,fill}, triangle: {type,points:[x1,y1,x2,y2,x3,y3],fill}, line: {type,x1,y1,x2,y2,stroke,width}, arc: {type,cx,cy,r,startAngle,endAngle,fill?,stroke?}, polygon: {type,points:[...],fill}. All support optional stroke/strokeWidth.

Styles: "solid" (opaque, for characters/objects), "smoke" (wispy, for fire/fog/mist), "glow" (bright halo, for energy/magic/stars).

Movement presets: "float"|"zigzag"|"orbit"|"rise"|"wander"|"spiral"|"rain"|"explode"|"swarm"|"bounce"|"pulse"|"vortex"
Movement custom object: {gravity:(-0.1 to 0.1), friction:(0.9-1.0), wave:{axis,amp,freq}, attract:(-0.005 to 0.005), spin:(-2 to 2), jitter:(0-0.3), bounce:{floor,elasticity}, scale:(0.97-1.03)}

renderMode: "discrete" (solid objects/characters/sparks) or "fluid" (smoke/fog/mist — engine auto-expands particles as radial-gradient blobs).
Fluid rules: style="smoke", density 60-80, size [20,35], vy [-1.8,-0.5], one circle shape per entity.

Schema:
{"name":"string","description":"string (max 10 words)","glowColor":"#hex","density":number,"background":"clear"|"dark-fade"|"black-fade","renderMode":"discrete"|"fluid","entities":[{"weight":number,"size":[min,max],"speed":{"vx":[min,max],"vy":[min,max]},"style":"solid"|"smoke"|"glow","movement":string_or_object,"shapes":[...]}]}

=== EXAMPLES ===

User: "fire"
{"name":"Inferno","description":"Blazing flames and hot embers","glowColor":"#ff5500","density":180,"background":"dark-fade","renderMode":"discrete","entities":[{"weight":2,"size":[20,35],"speed":{"vx":[-0.5,0.5],"vy":[-3.5,-1.5]},"style":"smoke","movement":"rise","shapes":[{"type":"ellipse","cx":0,"cy":0.1,"rx":0.3,"ry":0.45,"fill":"#ff4400"},{"type":"ellipse","cx":0,"cy":-0.05,"rx":0.22,"ry":0.38,"fill":"#ff6600"},{"type":"ellipse","cx":0,"cy":-0.2,"rx":0.12,"ry":0.22,"fill":"#ffaa00"}]},{"weight":1,"size":[18,26],"speed":{"vx":[-0.8,0.8],"vy":[-2.5,-1]},"style":"smoke","movement":"float","shapes":[{"type":"circle","cx":0,"cy":0,"r":0.35,"fill":"#ff3300"},{"type":"circle","cx":0,"cy":0,"r":0.2,"fill":"#ff8800"},{"type":"circle","cx":0,"cy":0,"r":0.1,"fill":"#ffcc00"}]},{"weight":1,"size":[18,24],"speed":{"vx":[-1.5,1.5],"vy":[-2,0]},"style":"glow","movement":"wander","shapes":[{"type":"circle","cx":0,"cy":0,"r":0.25,"fill":"#ff6600"},{"type":"circle","cx":0,"cy":0,"r":0.15,"fill":"#ffaa00"},{"type":"circle","cx":0,"cy":0,"r":0.08,"fill":"#ffdd44"}]}]}

User: "super saiyan"
{"name":"Super Saiyan","description":"Golden flames and electric sparks","glowColor":"#FFD700","density":180,"background":"dark-fade","renderMode":"discrete","entities":[{"weight":2,"size":[18,25],"speed":{"vx":[-0.5,0.5],"vy":[-3,-1.5]},"style":"smoke","movement":"rise","shapes":[{"type":"ellipse","cx":0,"cy":0.1,"rx":0.3,"ry":0.45,"fill":"#FFD700"},{"type":"ellipse","cx":0,"cy":-0.1,"rx":0.2,"ry":0.35,"fill":"#FFA500"},{"type":"ellipse","cx":0,"cy":-0.2,"rx":0.1,"ry":0.2,"fill":"#FFCC00"}]},{"weight":1,"size":[18,24],"speed":{"vx":[-1,1],"vy":[-2,-0.5]},"style":"glow","movement":"float","shapes":[{"type":"circle","cx":0,"cy":0,"r":0.4,"fill":"#FFD700"},{"type":"circle","cx":0,"cy":0,"r":0.25,"fill":"#FFA500"},{"type":"circle","cx":0,"cy":0,"r":0.12,"fill":"#FFCC00"}]},{"weight":1,"size":[18,24],"speed":{"vx":[-2,2],"vy":[-2,1]},"style":"solid","movement":"zigzag","shapes":[{"type":"line","x1":-0.3,"y1":0.2,"x2":0,"y2":-0.1,"stroke":"#FFFF00","width":0.06},{"type":"line","x1":0,"y1":-0.1,"x2":0.2,"y2":0.15,"stroke":"#FFD700","width":0.06},{"type":"line","x1":0.2,"y1":0.15,"x2":0.4,"y2":-0.2,"stroke":"#FFA500","width":0.04}]}]}

User: "mystic fog"
{"name":"Mystic Smoke","description":"Rising ethereal smoke wisps","glowColor":"#9ca3af","density":70,"background":"clear","renderMode":"fluid","entities":[{"weight":1,"size":[20,35],"speed":{"vx":[-0.15,0.15],"vy":[-1.8,-0.6]},"style":"smoke","movement":{"gravity":-0.01,"wave":{"axis":"x","amp":1,"freq":0.5},"friction":0.99},"shapes":[{"type":"circle","cx":0,"cy":0,"r":0.5,"fill":"#6b7280"}]}]}

User: "floating cat faces"
{"name":"Neko Parade","description":"Cute floating cat face particles","glowColor":"#f9a8d4","density":50,"background":"clear","renderMode":"discrete","entities":[{"weight":1,"size":[26,34],"speed":{"vx":[-0.6,0.6],"vy":[-1.8,-0.4]},"style":"solid","movement":"float","shapes":[{"type":"circle","cx":0,"cy":0,"r":0.4,"fill":"#FFA07A"},{"type":"triangle","points":[-0.35,-0.25,-0.2,-0.45,-0.05,-0.25],"fill":"#FFA07A"},{"type":"triangle","points":[0.05,-0.25,0.2,-0.45,0.35,-0.25],"fill":"#FFA07A"},{"type":"circle","cx":-0.15,"cy":-0.05,"r":0.06,"fill":"#333"},{"type":"circle","cx":0.15,"cy":-0.05,"r":0.06,"fill":"#333"},{"type":"ellipse","cx":0,"cy":0.1,"rx":0.05,"ry":0.03,"fill":"#FF69B4"}]}]}

User: "pokemon aura" (generic franchise — multiple different characters)
{"name":"Pokemon Aura","descriptiimage.pngon":"Floating Pokeball and Pikachu particles","glowColor":"#EF4444","density":60,"background":"dark-fade","renderMode":"discrete","entities":[{"weight":1,"size":[26,34],"speed":{"vx":[-0.7,0.7],"vy":[-2,-0.5]},"style":"solid","movement":"float","shapes":[{"type":"circle","cx":0,"cy":0.05,"r":0.4,"fill":"#fff"},{"type":"rect","x":-0.4,"y":-0.4,"w":0.8,"h":0.43,"fill":"#EF4444"},{"type":"rect","x":-0.4,"y":-0.03,"w":0.8,"h":0.06,"fill":"#1a1a1a"},{"type":"circle","cx":0,"cy":0,"r":0.12,"fill":"#fff","stroke":"#1a1a1a","strokeWidth":0.04}]},{"weight":1,"size":[26,34],"speed":{"vx":[-0.6,0.6],"vy":[-1.8,-0.4]},"style":"solid","movement":"float","shapes":[{"type":"circle","cx":0,"cy":0.05,"r":0.38,"fill":"#FBBF24"},{"type":"circle","cx":-0.12,"cy":-0.05,"r":0.05,"fill":"#1a1a1a"},{"type":"circle","cx":0.12,"cy":-0.05,"r":0.05,"fill":"#1a1a1a"},{"type":"ellipse","cx":0,"cy":0.1,"rx":0.08,"ry":0.04,"fill":"#1a1a1a"},{"type":"circle","cx":-0.2,"cy":0.08,"r":0.08,"fill":"#EF4444"},{"type":"circle","cx":0.2,"cy":0.08,"r":0.08,"fill":"#EF4444"},{"type":"triangle","points":[-0.2,-0.35,-0.35,-0.15,-0.05,-0.25],"fill":"#FBBF24"},{"type":"triangle","points":[0.2,-0.35,0.35,-0.15,0.05,-0.25],"fill":"#FBBF24"}]}]}

=== TASK ===

Based on the spec and examples above, generate a particle configuration for:

"${promptInput}"

How to interpret the request:
- Power/energy/effect words ("super saiyan", "fire aura", "ice storm") → visual aura effect with themed particles. Use 2-3 entities with mixed styles. ALL entities must use colors that match the theme — e.g. fire = reds/oranges/yellows only, ice = blues/whites/cyans only. NEVER add white, gray, or off-theme colored smoke/glow/orbs to an effect aura.
- Request describes a specific shape or character ( "Pikachu", "stars") → generate ONLY that shape/character. One entity. Nothing else.
- Request names a group or franchise without one specific thing ("Paw Patrol", "pokemon aura", "floating animals") → generate 2-3 different characters from that group. Each entity is a different character. All style:"solid", size [24,34].
- Ambiguous → default to effect aura.

Critical rules:
1. NEVER add generic glow orbs, smoke puffs, or abstract accent particles alongside character/shape particles. If the user asks for "bomb", every particle must be a bomb. If they ask for "creeper aura", every particle must be a creeper face. No filler entities.
2. For effect auras: every entity must stay on-theme. No white smoke, no gray puffs, no colorless filler. If user says "fire", ALL entities must be warm-colored (red, orange, yellow, amber). If user says "ice", ALL entities must be cool-colored (blue, cyan, white). Every entity must visually reinforce the same theme.

Constraints:
- vy is usually negative (upward). Positive vy only for rain/bounce/falling.
- density: 50-200 discrete, 60-80 fluid.
- Use bold filled shapes. Avoid outline-only shapes.
- Minimum entity size is [18,24]. Anything smaller is unreadable.
- Every entity must have at least 3 shapes so it looks like something recognizable.
- Valid JSON with commas between all array elements.
- Shape fill colors must NEVER be white (#ffffff), gray (#888, #aaa, #ccc, etc.), or any neutral color unless the theme specifically calls for it (e.g. "snow", "ghost"). Always use saturated, theme-appropriate colors.`;

    try {
      const text = await callLLMText(systemPrompt);
      if (!text) throw new Error('No response');
      
      // Clean and fix common JSON issues
      let cleanJson = text.replace(/```json|```/g, '').trim();
      
      // Fix missing commas between array elements (common LLM mistake)
      cleanJson = cleanJson.replace(/\}\s*\n\s*\{/g, '},\n{');
      cleanJson = cleanJson.replace(/\]\s*\n\s*\[/g, '],\n[');
      
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      const config = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson);
      console.log("🎨 AI Aura Config:", JSON.stringify(config, null, 2));
      setCustomAuraConfig(config);
      setActiveAura(AURA_TYPES.CUSTOM);
      setAiMessage(`Forged: ${config.name} - ${config.description}`);
      setPromptInput("");
    } catch (e) {
      console.error("Aura generation error:", e);
      setAiMessage(`Failed: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    particlesRef.current = [];

    let count = 0;
    if (activeAura === AURA_TYPES.CUSTOM && customAuraConfig) {
      count = customAuraConfig.density || 100;
    } else {
      switch (activeAura) {
        case AURA_TYPES.FIRE: count = 200; break;
        case AURA_TYPES.WIND: count = 150; break;
        case AURA_TYPES.ELECTRIC: count = 12; break;
        case AURA_TYPES.COSMIC: count = 100; break;
        case AURA_TYPES.EXHAUST: count = 100; break;
        default: count = 0;
      }
    }

    for (let i = 0; i < count; i++) {
      particlesRef.current.push(new Particle(activeAura, canvas.width, canvas.height, customAuraConfig));
    }
  }, [activeAura, customAuraConfig]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (activeAura === AURA_TYPES.CUSTOM) {
      const bg = customAuraConfig?.background || 'clear';
      const renderMode = customAuraConfig?.renderMode || 'discrete';
      
      if (renderMode === 'fluid') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else if (bg === 'dark-fade') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(10, 10, 15, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bg === 'black-fade') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } else if ([AURA_TYPES.FIRE, AURA_TYPES.ELECTRIC].includes(activeAura)) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(10, 10, 15, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if ([AURA_TYPES.COSMIC, AURA_TYPES.EXHAUST].includes(activeAura)) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (activeAura === AURA_TYPES.NONE) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    particlesRef.current.forEach(p => {
      p.update();
      p.draw(ctx);
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [activeAura, customAuraConfig]);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = 600;
      canvasRef.current.height = 700;
    }
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [animate]);

  const glowColor = activeAura === AURA_TYPES.CUSTOM ? (customAuraConfig?.glowColor || '#a855f7') : AURA_COLORS[activeAura];
  const hasAura = activeAura !== AURA_TYPES.NONE;
  const PRESET_LABELS = { fire: 'Fire', wind: 'Wind', electric: 'Shock', cosmic: 'Cosmic', exhaust: 'Smoke' };
  const auraName = activeAura === AURA_TYPES.CUSTOM
    ? (customAuraConfig?.name || "Unknown Energy")
    : (activeAura === AURA_TYPES.NONE ? null : (PRESET_LABELS[activeAura] || activeAura));

  return (
    <div className="h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative select-none">

      {/* Ambient background glow that follows the aura color */}
      <div
        className="absolute inset-0 transition-all duration-1000 pointer-events-none"
        style={{
          background: hasAura
            ? `radial-gradient(ellipse at 50% 40%, ${glowColor}15 0%, ${glowColor}08 30%, transparent 70%)`
            : 'radial-gradient(ellipse at 50% 40%, rgba(88,28,135,0.06) 0%, transparent 70%)'
        }}
      />

      {/* Top bar */}
      <header className="relative z-30 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-sm font-semibold tracking-widest uppercase text-gray-300">
            Aura Studio
          </span>
        </div>

        {/* Upload avatar button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ImagePlus size={14} />
          {avatar ? 'Change' : 'Upload'}
        </button>
      </header>

      {/* Main stage — takes remaining space */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 pb-4 min-h-0">

        {/* Canvas + Avatar container */}
        <div className="relative w-full max-w-lg flex-1 flex items-center justify-center min-h-0">

          {/* Particle canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full z-10 pointer-events-none"
          />

          {/* Avatar */}
          <div className="relative z-20 w-72 h-72 md:w-96 md:h-96 transition-all duration-700 ease-out">
            {avatar ? (
              <img
                src={avatar}
                alt="Avatar"
                className="w-full h-full object-contain transition-all duration-700"
                style={{
                  filter: hasAura
                    ? `drop-shadow(0 0 30px ${glowColor}) drop-shadow(0 0 60px ${glowColor}80) drop-shadow(0 8px 16px rgba(0,0,0,0.6))`
                    : 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))'
                }}
              />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full rounded-3xl border border-white/[0.06] bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/30 hover:bg-purple-500/[0.03] transition-all duration-300 group"
              >
                <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4 group-hover:bg-purple-500/10 transition-colors">
                  <Camera size={32} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                </div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-gray-400 transition-colors">Drop your character here</p>
                <p className="text-xs text-gray-700 mt-1">PNG, JPG, or WebP</p>
              </div>
            )}
          </div>

          {/* Soft vignette */}
          <div className="absolute inset-0 pointer-events-none z-30 rounded-3xl" style={{background: 'radial-gradient(circle, transparent 35%, rgba(0,0,0,0.6) 100%)'}} />
        </div>

        {/* Bottom controls overlay */}
        <div className="relative z-40 w-full max-w-lg mt-2 space-y-3">

          {/* Aura name badge */}
          {auraName && (
            <div className="flex items-center justify-center gap-3">
              <div
                className="px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.2em] uppercase transition-all duration-500 flex items-center gap-2"
                style={{
                  color: glowColor,
                  background: `${glowColor}12`,
                  border: `1px solid ${glowColor}25`,
                  textShadow: `0 0 20px ${glowColor}60`
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: glowColor }} />
                {auraName}
              </div>
              <button
                onClick={() => { setActiveAura(AURA_TYPES.NONE); setCustomAuraConfig(null); setAiMessage(""); }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Preset aura buttons */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {[
              { type: AURA_TYPES.FIRE, icon: <Flame size={13} />, label: 'Fire', color: '#ff5500' },
              { type: AURA_TYPES.WIND, icon: <Wind size={13} />, label: 'Wind', color: '#00ffcc' },
              { type: AURA_TYPES.ELECTRIC, icon: <Zap size={13} />, label: 'Shock', color: '#aa00ff' },
              { type: AURA_TYPES.COSMIC, icon: <Sparkles size={13} />, label: 'Cosmic', color: '#6366f1' },
              { type: AURA_TYPES.EXHAUST, icon: <CloudFog size={13} />, label: 'Smoke', color: '#94a3b8' },
            ].map(({ type, icon, label, color }) => (
              <button
                key={type}
                onClick={() => {
                  if (activeAura === type) {
                    setActiveAura(AURA_TYPES.NONE);
                  } else {
                    setActiveAura(type);
                    setCustomAuraConfig(null);
                    setAiMessage("");
                  }
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-300 border ${
                  activeAura === type
                    ? 'scale-105'
                    : 'border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/[0.12] hover:bg-white/[0.04]'
                }`}
                style={activeAura === type ? {
                  background: `${color}18`,
                  color: color,
                  borderColor: `${color}35`,
                  boxShadow: `0 0 10px ${color}25`
                } : {}}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* AI message */}
          {aiMessage && (
            <p className="text-center text-xs text-gray-500 italic truncate px-4">
              {aiMessage}
            </p>
          )}

          {/* Generator input */}
          <div className="relative group">
            <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm"
              style={{ background: `linear-gradient(135deg, ${hasAura ? glowColor : '#a855f7'}40, transparent)` }}
            />
            <div className="relative flex items-center bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm group-focus-within:border-white/[0.15] transition-all">
              <div className="pl-4 pr-2 text-gray-600">
                <Wand2 size={16} />
              </div>
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder={aiLoading ? "Generating..." : "Describe an aura... e.g. 'super saiyan energy'"}
                disabled={aiLoading}
                className="flex-1 bg-transparent py-3.5 pr-4 text-sm text-white focus:outline-none placeholder:text-gray-600 disabled:opacity-40"
                onKeyDown={(e) => e.key === 'Enter' && generateAura()}
              />
              {aiLoading ? (
                <div className="pr-4">
                  <Loader2 size={16} className="animate-spin text-purple-400" />
                </div>
              ) : promptInput.trim() && (
                <button
                  onClick={generateAura}
                  className="mr-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.08] text-gray-300 hover:bg-white/[0.15] hover:text-white transition-all"
                >
                  Enter
                </button>
              )}
            </div>
          </div>

        </div>
      </main>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />
    </div>
  );
}
