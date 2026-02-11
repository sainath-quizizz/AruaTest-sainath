import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Flame,
  Droplets,
  Wind,
  Zap,
  Sparkles,
  Upload,
  Camera,
  Layers,
  Cpu,
  Sun,
  Flower,
  Ghost,
  Diamond,
  Bot,
  ScrollText,
  Loader2,
  Wand2,
  Send,
  Heart,
  CloudFog,
  Star,
  PawPrint,
  Plane,
  Smile,
  Cat
} from 'lucide-react';

/**
 * AURA ENGINE 6.3 - THE MINION UPDATE
 * * NEW TYPE: Minion (Little Helpers).
 * * RENDERER: Added character geometry with goggles and overalls.
 */

const AURA_TYPES = {
  NONE: 'none',
  FIRE: 'fire',
  WATER: 'water',
  WIND: 'wind',
  ELECTRIC: 'electric',
  COSMIC: 'cosmic',
  CYBER: 'cyber',
  RADIANT: 'radiant',
  SAKURA: 'sakura',
  SHADOW: 'shadow',
  PRISM: 'prism',
  NATURE: 'nature',
  LOVE: 'love',
  EXHAUST: 'exhaust',
  STARDUST: 'stardust',
  ANIMAL: 'animal',
  PAPER: 'paper',
  MINION: 'minion',
  TOMANDJERRY: 'tomandjerry',
  CUSTOM: 'custom'
};

const AURA_COLORS = {
  [AURA_TYPES.NONE]: 'rgba(0,0,0,0)',
  [AURA_TYPES.FIRE]: '#ff5500',
  [AURA_TYPES.WATER]: '#0088ff',
  [AURA_TYPES.WIND]: '#00ffcc',
  [AURA_TYPES.ELECTRIC]: '#aa00ff',
  [AURA_TYPES.COSMIC]: '#ffffff',
  [AURA_TYPES.CYBER]: '#00ff00',
  [AURA_TYPES.RADIANT]: '#ffd700',
  [AURA_TYPES.SAKURA]: '#ffb7d5',
  [AURA_TYPES.SHADOW]: '#4b0082',
  [AURA_TYPES.PRISM]: '#00ffff',
  [AURA_TYPES.NATURE]: '#4ade80',
  [AURA_TYPES.LOVE]: '#ef4444',
  [AURA_TYPES.EXHAUST]: '#94a3b8',
  [AURA_TYPES.STARDUST]: '#fcd34d',
  [AURA_TYPES.ANIMAL]: '#fb923c',
  [AURA_TYPES.PAPER]: '#f8fafc',
  [AURA_TYPES.MINION]: '#FCE029',
  [AURA_TYPES.TOMANDJERRY]: '#5B8BD4',
  [AURA_TYPES.CUSTOM]: '#ffffff'
};

const random = (min, max) => Math.random() * (max - min) + min;

// --- CLAUDE API HELPERS ---
const CLAUDE_KEY = localStorage.getItem('claude_api_key') || '';
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

async function callClaudeText(prompt) {
  const key = localStorage.getItem('claude_api_key') || prompt('Enter your Anthropic API key:') || '';
  if (key && !localStorage.getItem('claude_api_key')) localStorage.setItem('claude_api_key', key);
  if (!key) return null;

  try {
    const response = await fetch(CLAUDE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) throw new Error('Claude API Error');
    const data = await response.json();
    return data.content?.[0]?.text || "";
  } catch (error) {
    console.error("Claude Error:", error);
    return null;
  }
}

async function callClaudeVision(imageBase64, promptText) {
  const key = localStorage.getItem('claude_api_key') || '';
  if (!key) return null;

  try {
    const cleanBase64 = imageBase64.split(',')[1];
    const response = await fetch(CLAUDE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: cleanBase64 } }
          ]
        }]
      })
    });
    if (!response.ok) throw new Error('Claude API Error');
    const data = await response.json();
    return data.content?.[0]?.text || "";
  } catch (error) {
    console.error("Claude Error:", error);
    return null;
  }
}

// --- PARTICLE CLASS ---
class Particle {
  constructor(type, canvasWidth, canvasHeight, customConfig = null) {
    this.type = type;
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.customConfig = customConfig;
    this.variant = Math.random();
    this.reset(true);
  }

  reset(initial = false) {
    const centerX = this.w / 2;
    const feetY = this.h * 0.58;

    // --- GENERIC ENGINE FOR CUSTOM AURAS ---
    if (this.type === AURA_TYPES.CUSTOM && this.customConfig) {
        const { hue, movement, speed } = this.customConfig;
        const s = speed || 5;
        this.hue = hue || 0;
        this.life = 1;
        this.decay = random(0.01, 0.03);
        this.size = random(5, 15);
        this.x = centerX + random(-50, 50);
        this.y = feetY + random(-50, 50);
        this.vx = random(-1, 1);
        this.vy = random(-1, 1);
        if(movement === 'rise') this.vy = random(-s, -s/3);
        return;
    }

    // --- NEW VFX TYPES ---
    if ([AURA_TYPES.NATURE, AURA_TYPES.LOVE, AURA_TYPES.EXHAUST, AURA_TYPES.STARDUST, AURA_TYPES.ANIMAL, AURA_TYPES.PAPER, AURA_TYPES.MINION, AURA_TYPES.TOMANDJERRY].includes(this.type)) {
        this.life = 1;
        this.decay = random(0.005, 0.02);

        if (this.type === AURA_TYPES.NATURE) {
            this.x = centerX + random(-100, 100);
            this.y = feetY - random(0, 150);
            this.vx = random(-1, 1);
            this.vy = random(0.5, 2);
            this.size = random(6, 12);
            this.rotation = random(0, Math.PI * 2);
            this.rotSpeed = random(-0.05, 0.05);
            this.hue = Math.random() > 0.5 ? random(320, 350) : random(90, 120);
        }
        else if (this.type === AURA_TYPES.LOVE) {
            this.x = centerX + random(-60, 60);
            this.y = feetY + random(-50, 50);
            this.vx = random(-0.5, 0.5);
            this.vy = random(-3, -1);
            this.size = random(8, 18);
            this.rotation = 0;
            this.rotSpeed = random(-0.02, 0.02);
            this.hue = random(340, 360);
        }
        else if (this.type === AURA_TYPES.EXHAUST) {
            this.x = centerX + random(-80, 80);
            this.y = feetY + 40;
            this.vx = (this.x - centerX) * 0.05;
            this.vy = random(-2, -0.5);
            this.size = random(10, 30);
            this.rotation = random(0, Math.PI * 2);
            this.rotSpeed = random(-0.01, 0.01);
            this.hue = 220;
        }
        else if (this.type === AURA_TYPES.STARDUST) {
            this.x = centerX + random(-120, 120);
            this.y = feetY + random(-150, 50);
            this.vx = random(-0.2, 0.2);
            this.vy = random(-0.5, 0.5);
            this.size = random(4, 10);
            this.rotation = random(0, Math.PI * 2);
            this.rotSpeed = random(-0.1, 0.1);
            this.hue = random(40, 60);
        }
        else if (this.type === AURA_TYPES.ANIMAL) {
            this.x = centerX + random(-100, 100);
            this.y = feetY + random(-50, 100);
            this.vx = 0;
            this.vy = random(-1.5, -0.5);
            this.size = random(10, 15);
            this.rotation = random(-0.5, 0.5);
            this.hue = random(20, 40);
        }
        else if (this.type === AURA_TYPES.PAPER) {
            this.x = random(0, this.w);
            this.y = this.h + random(20, 100);

            const targetX = this.w/2 + random(-200, 200);
            const angle = Math.atan2(-this.h, targetX - this.x);
            const speed = random(3, 7);

            const noisyAngle = angle + random(-0.2, 0.2);

            this.vx = Math.cos(noisyAngle) * speed;
            this.vy = Math.sin(noisyAngle) * speed;

            this.size = random(15, 30);
            this.rotation = noisyAngle + Math.PI / 2;
            this.hue = 210;
            this.life = 1;
            this.decay = random(0.005, 0.01);
        }
        else if (this.type === AURA_TYPES.MINION) {
            this.x = centerX + random(-120, 120);
            this.y = feetY + random(0, 100);
            this.vx = random(-0.5, 0.5);
            this.vy = random(-2, -0.5);
            this.size = random(10, 18);
            this.rotation = random(-0.1, 0.1);
            this.rotSpeed = random(-0.02, 0.02);
            this.hue = 0;
            this.life = 1;
            this.decay = random(0.005, 0.01);
        }
        else if (this.type === AURA_TYPES.TOMANDJERRY) {
            this.isTom = this.variant > 0.4;
            this.chasePhase = random(0, Math.PI * 2);
            if (this.isTom) {
                this.x = centerX + random(-100, 100);
                this.y = feetY + random(-50, 80);
                this.vx = random(-1.2, 1.2);
                this.vy = random(-1.8, -0.5);
                this.size = random(14, 22);
                this.hue = random(210, 230);
            } else {
                this.x = centerX + random(-80, 80);
                this.y = feetY + random(-30, 60);
                this.vx = random(-2, 2);
                this.vy = random(-2.5, -1);
                this.size = random(8, 13);
                this.hue = random(25, 40);
            }
            this.rotation = random(-0.2, 0.2);
            this.rotSpeed = random(-0.03, 0.03);
            this.life = 1;
            this.decay = random(0.005, 0.012);
        }
        return;
    }

    // --- STANDARD PRESETS (Legacy) ---
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

      case AURA_TYPES.WATER:
        this.x = centerX;
        this.y = feetY + random(10, 40);
        if (this.variant > 0.4) {
             this.isVortex = true;
             this.angle = random(0, Math.PI * 2);
             this.radius = random(40, 70);
             this.x = centerX + Math.cos(this.angle) * this.radius;
             this.vy = random(-5, -2);
             this.vr = 0.08;
             this.size = random(8, 20);
             this.decay = random(0.005, 0.015);
             this.hue = random(190, 230);
        } else {
             this.isVortex = false;
             this.x = centerX + random(-50, 50);
             this.vx = random(-2, 2);
             this.vy = random(-6, -3);
             this.gravity = 0.15;
             this.size = random(2, 6);
             this.decay = random(0.02, 0.04);
             this.hue = random(180, 200);
        }
        this.life = 1;
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

      case AURA_TYPES.ELECTRIC:
        this.x = centerX + random(-80, 80);
        this.y = feetY - random(0, 180);
        this.points = [];
        let curX = this.x;
        let curY = this.y;
        for(let i=0; i<5; i++) {
          this.points.push({x: curX, y: curY});
          curX += random(-20, 20);
          curY += random(-20, 20);
        }
        this.life = 1;
        this.decay = random(0.02, 0.08);
        this.size = random(1, 4);
        this.hue = random(250, 280);
        break;

      case AURA_TYPES.COSMIC:
        this.x = centerX;
        this.y = this.h * 0.5;
        const cosmicAngle = random(0, Math.PI * 2);
        const cosmicSpeed = random(3, 8);
        this.vx = Math.cos(cosmicAngle) * cosmicSpeed;
        this.vy = Math.sin(cosmicAngle) * cosmicSpeed;
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

      case AURA_TYPES.CYBER:
        this.x = centerX + random(-70, 70);
        this.x = Math.floor(this.x / 10) * 10;
        this.y = feetY + random(0, 60);
        this.vy = random(-3, -1);
        this.size = random(5, 12);
        this.life = 1;
        this.decay = random(0.01, 0.03);
        this.hue = random(100, 140);
        this.isGlitch = Math.random() > 0.9;
        break;

      case AURA_TYPES.RADIANT:
        this.x = centerX + random(-100, 100);
        this.y = feetY - 20;
        this.vy = random(-1.5, -0.5);
        if (this.variant > 0.7) {
            this.size = random(30, 70);
            this.life = 1;
            this.decay = 0.015;
            this.isBeam = true;
        } else {
            this.x = centerX + random(-150, 150);
            this.y = feetY + random(-120, 50);
            this.vx = random(-0.3, 0.3);
            this.vy = random(-0.8, -0.1);
            this.size = random(1, 3);
            this.life = 1;
            this.decay = random(0.005, 0.01);
            this.isBeam = false;
        }
        this.hue = random(40, 55);
        break;

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

      case AURA_TYPES.SHADOW:
        this.x = centerX + random(-60, 60);
        this.y = feetY + random(-10, 30);
        this.vx = (this.x - centerX) * 0.01;
        this.vy = random(-2, -0.5);
        this.size = random(30, 80);
        this.life = 1;
        this.decay = random(0.01, 0.02);
        this.hue = random(260, 280);
        break;

      case AURA_TYPES.PRISM:
        this.x = centerX + random(-80, 80);
        this.y = feetY + random(0, 50);
        this.vy = random(-2, -0.5);
        this.size = random(5, 15);
        this.life = 1;
        this.decay = random(0.01, 0.02);
        this.rotation = random(0, Math.PI);
        this.rotSpeed = random(-0.05, 0.05);
        this.hue = random(160, 200);
        break;

      default:
        break;
    }
  }

  update() {
    // --- GENERIC UPDATE FOR CUSTOM ---
    if (this.type === AURA_TYPES.CUSTOM && this.customConfig) {
        if (this.rotSpeed) this.rotation += this.rotSpeed;
        if (this.customConfig.movement === 'spiral') {
            this.y += this.vy;
            this.angle += this.vr || 0.1;
            this.x = (this.w / 2) + Math.cos(this.angle) * this.radius;
        } else {
            this.x += this.vx;
            this.y += this.vy;
        }
        this.life -= this.decay;
        if (this.life <= 0) this.reset();
        return;
    }

    // --- NEW VFX TYPES UPDATE ---
    if ([AURA_TYPES.NATURE, AURA_TYPES.LOVE, AURA_TYPES.EXHAUST, AURA_TYPES.STARDUST, AURA_TYPES.ANIMAL, AURA_TYPES.PAPER, AURA_TYPES.MINION, AURA_TYPES.TOMANDJERRY].includes(this.type)) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.rotSpeed) this.rotation += this.rotSpeed;

        if (this.type === AURA_TYPES.NATURE) {
            this.x += Math.sin(this.y * 0.02) * 0.5;
        }
        if (this.type === AURA_TYPES.EXHAUST) {
            this.size *= 1.02;
            this.vx *= 0.98;
        }
        if (this.type === AURA_TYPES.MINION) {
            this.x += Math.sin(this.y * 0.05) * 0.5;
        }
        if (this.type === AURA_TYPES.TOMANDJERRY) {
            this.chasePhase += 0.08;
            if (this.isTom) {
                this.x += Math.sin(this.chasePhase) * 1.5;
            } else {
                this.x += Math.sin(this.chasePhase * 2.5) * 2.2;
                this.vy *= 0.998;
            }
        }

        this.life -= this.decay;
        if (this.life <= 0) this.reset();
        return;
    }

    // --- STANDARD UPDATES (Legacy) ---
    switch (this.type) {
      case AURA_TYPES.FIRE:
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.99;
        this.size *= 0.96;
        this.life -= this.decay;
        break;

      case AURA_TYPES.WATER:
        if (this.isVortex) {
            this.y += this.vy;
            this.angle += this.vr;
            this.x = (this.w / 2) + Math.cos(this.angle) * this.radius;
            this.life -= this.decay;
        } else {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += this.gravity;
            this.life -= this.decay;
        }
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

      case AURA_TYPES.CYBER:
        this.y += this.vy;
        if (this.isGlitch && Math.random() > 0.8) {
            this.x += random(-10, 10);
        }
        this.life -= this.decay;
        break;

      case AURA_TYPES.RADIANT:
        this.y += this.vy;
        if (!this.isBeam) {
             this.x += this.vx;
        }
        this.life -= this.decay;
        break;

      case AURA_TYPES.SAKURA:
        this.y += this.vy;
        this.x += Math.sin(this.y * 0.05) * 0.5;
        this.rotation += this.rotSpeed;
        this.life -= this.decay;
        break;

      case AURA_TYPES.SHADOW:
        this.x += this.vx;
        this.y += this.vy;
        this.size *= 1.01;
        this.life -= this.decay;
        break;

      case AURA_TYPES.PRISM:
        this.y += this.vy;
        this.rotation += this.rotSpeed;
        this.life -= this.decay;
        break;
    }

    if (this.life <= 0) {
      this.reset();
    }
  }

  draw(ctx) {
    ctx.save();

    // --- GENERIC DRAW FOR CUSTOM ---
    if (this.type === AURA_TYPES.CUSTOM && this.customConfig) {
        const { visuals } = this.customConfig;
        const hue = this.hue;
        ctx.globalCompositeOperation = visuals?.blendMode || 'screen';
        ctx.globalAlpha = this.life;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        return;
    }

    // --- NEW VFX TYPES DRAWING ENGINE ---
    if ([AURA_TYPES.NATURE, AURA_TYPES.LOVE, AURA_TYPES.EXHAUST, AURA_TYPES.STARDUST, AURA_TYPES.ANIMAL, AURA_TYPES.PAPER, AURA_TYPES.MINION, AURA_TYPES.TOMANDJERRY].includes(this.type)) {

        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation || 0);
        ctx.globalAlpha = this.life;

        switch (this.type) {
            case AURA_TYPES.NATURE:
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = `hsla(${this.hue}, 80%, 70%, 1)`;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    ctx.rotate((Math.PI * 2) / 5);
                    ctx.moveTo(0, 0);
                    ctx.bezierCurveTo(-this.size/2, this.size/2, this.size/2, this.size/2, 0, 0);
                }
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(0, 0, this.size/4, 0, Math.PI*2);
                ctx.fill();
                break;

            case AURA_TYPES.LOVE: {
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = `hsla(${this.hue}, 90%, 60%, 1)`;
                ctx.shadowColor = `hsla(${this.hue}, 100%, 50%, 0.8)`;
                ctx.shadowBlur = 10;

                const s = this.size;
                ctx.beginPath();
                ctx.moveTo(0, -s/4);
                ctx.bezierCurveTo(s/2, -s, s, -s/3, 0, s);
                ctx.bezierCurveTo(-s, -s/3, -s/2, -s, 0, -s/4);
                ctx.fill();
                break;
            }

            case AURA_TYPES.EXHAUST: {
                ctx.globalCompositeOperation = 'source-over';
                const smokeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
                smokeGrad.addColorStop(0, `hsla(${this.hue}, 10%, 80%, 0.8)`);
                smokeGrad.addColorStop(1, `hsla(${this.hue}, 10%, 40%, 0)`);
                ctx.fillStyle = smokeGrad;

                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case AURA_TYPES.STARDUST: {
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = `hsla(${this.hue}, 100%, 80%, 1)`;
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 15;

                ctx.beginPath();
                const outer = this.size;
                const inner = this.size / 2.5;
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(Math.cos((18 + i * 72) * 0.01745) * outer, -Math.sin((18 + i * 72) * 0.01745) * outer);
                    ctx.lineTo(Math.cos((54 + i * 72) * 0.01745) * inner, -Math.sin((54 + i * 72) * 0.01745) * inner);
                }
                ctx.closePath();
                ctx.fill();
                break;
            }

            case AURA_TYPES.ANIMAL:
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = `hsla(${this.hue}, 80%, 60%, 1)`;

                ctx.beginPath();
                ctx.ellipse(0, this.size * 0.2, this.size * 0.5, this.size * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();

                for (let i = -1; i <= 1; i++) {
                    ctx.beginPath();
                    const toeX = i * (this.size * 0.45);
                    const toeY = -this.size * 0.4;
                    const archOffset = Math.abs(i) * 2;
                    ctx.ellipse(toeX, toeY + archOffset, this.size * 0.18, this.size * 0.22, i * 0.2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;

            case AURA_TYPES.PAPER:
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = '#f1f5f9';

                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.lineTo(this.size * 0.6, this.size);
                ctx.lineTo(0, this.size * 0.8);
                ctx.lineTo(-this.size * 0.6, this.size);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.lineTo(0, this.size * 0.8);
                ctx.lineTo(this.size * 0.15, this.size);
                ctx.lineTo(0, this.size);
                ctx.fill();
                break;

            case AURA_TYPES.MINION:
                ctx.globalCompositeOperation = 'source-over';

                // Body (Yellow Capsule)
                ctx.fillStyle = '#FCE029';
                ctx.beginPath();
                ctx.arc(0, -this.size * 0.4, this.size * 0.6, Math.PI, 0);
                ctx.arc(0, this.size * 0.4, this.size * 0.6, 0, Math.PI);
                ctx.rect(-this.size * 0.6, -this.size * 0.4, this.size * 1.2, this.size * 0.8);
                ctx.fill();

                // Overalls (Blue Bottom)
                ctx.fillStyle = '#42639F';
                ctx.beginPath();
                ctx.arc(0, this.size * 0.4, this.size * 0.6, 0, Math.PI);
                ctx.lineTo(-this.size * 0.6, 0);
                ctx.lineTo(this.size * 0.6, 0);
                ctx.fill();
                ctx.fillRect(-this.size * 0.35, -this.size * 0.2, this.size * 0.7, this.size * 0.4);

                // Goggles (Grey Band)
                ctx.fillStyle = '#555';
                ctx.fillRect(-this.size * 0.6, -this.size * 0.5, this.size * 1.2, this.size * 0.2);

                // Eye (White + Pupil)
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(0, -this.size * 0.4, this.size * 0.25, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#999';
                ctx.lineWidth = this.size * 0.05;
                ctx.stroke();

                // Pupil
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(0, -this.size * 0.4, this.size * 0.08, 0, Math.PI * 2);
                ctx.fill();
                break;

            case AURA_TYPES.TOMANDJERRY:
                ctx.globalCompositeOperation = 'source-over';

                if (this.isTom) {
                    // --- TOM (Blue-Grey Cat) ---
                    const s = this.size;

                    // Head
                    ctx.fillStyle = '#7B8FAD';
                    ctx.beginPath();
                    ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Ears (triangles)
                    ctx.beginPath();
                    ctx.moveTo(-s * 0.4, -s * 0.3);
                    ctx.lineTo(-s * 0.15, -s * 0.7);
                    ctx.lineTo(s * 0.05, -s * 0.3);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(s * 0.4, -s * 0.3);
                    ctx.lineTo(s * 0.15, -s * 0.7);
                    ctx.lineTo(-s * 0.05, -s * 0.3);
                    ctx.fill();

                    // Inner ears (pink)
                    ctx.fillStyle = '#D4A0A0';
                    ctx.beginPath();
                    ctx.moveTo(-s * 0.32, -s * 0.32);
                    ctx.lineTo(-s * 0.15, -s * 0.58);
                    ctx.lineTo(0, -s * 0.32);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(s * 0.32, -s * 0.32);
                    ctx.lineTo(s * 0.15, -s * 0.58);
                    ctx.lineTo(0, -s * 0.32);
                    ctx.fill();

                    // White muzzle
                    ctx.fillStyle = '#D4D8E0';
                    ctx.beginPath();
                    ctx.ellipse(0, s * 0.15, s * 0.3, s * 0.22, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Eyes
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.ellipse(-s * 0.18, -s * 0.08, s * 0.12, s * 0.14, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(s * 0.18, -s * 0.08, s * 0.12, s * 0.14, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Pupils
                    ctx.fillStyle = '#222';
                    ctx.beginPath();
                    ctx.arc(-s * 0.15, -s * 0.06, s * 0.06, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(s * 0.15, -s * 0.06, s * 0.06, 0, Math.PI * 2);
                    ctx.fill();

                    // Nose
                    ctx.fillStyle = '#E87B8A';
                    ctx.beginPath();
                    ctx.arc(0, s * 0.08, s * 0.06, 0, Math.PI * 2);
                    ctx.fill();

                    // Whiskers
                    ctx.strokeStyle = '#555';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(-s * 0.15, s * 0.12); ctx.lineTo(-s * 0.6, s * 0.0);
                    ctx.moveTo(-s * 0.15, s * 0.15); ctx.lineTo(-s * 0.6, s * 0.2);
                    ctx.moveTo(s * 0.15, s * 0.12); ctx.lineTo(s * 0.6, s * 0.0);
                    ctx.moveTo(s * 0.15, s * 0.15); ctx.lineTo(s * 0.6, s * 0.2);
                    ctx.stroke();
                } else {
                    // --- JERRY (Brown Mouse) ---
                    const m = this.size;

                    // Head
                    ctx.fillStyle = '#C8874B';
                    ctx.beginPath();
                    ctx.arc(0, 0, m * 0.45, 0, Math.PI * 2);
                    ctx.fill();

                    // Ears (round)
                    ctx.fillStyle = '#C8874B';
                    ctx.beginPath();
                    ctx.arc(-m * 0.35, -m * 0.35, m * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(m * 0.35, -m * 0.35, m * 0.25, 0, Math.PI * 2);
                    ctx.fill();

                    // Inner ears (pink)
                    ctx.fillStyle = '#F0B0A0';
                    ctx.beginPath();
                    ctx.arc(-m * 0.35, -m * 0.35, m * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(m * 0.35, -m * 0.35, m * 0.15, 0, Math.PI * 2);
                    ctx.fill();

                    // Face/muzzle
                    ctx.fillStyle = '#E8C89A';
                    ctx.beginPath();
                    ctx.ellipse(0, m * 0.1, m * 0.25, m * 0.2, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Eyes
                    ctx.fillStyle = '#222';
                    ctx.beginPath();
                    ctx.arc(-m * 0.15, -m * 0.05, m * 0.06, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(m * 0.15, -m * 0.05, m * 0.06, 0, Math.PI * 2);
                    ctx.fill();

                    // Eye shine
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(-m * 0.13, -m * 0.07, m * 0.02, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(m * 0.13, -m * 0.07, m * 0.02, 0, Math.PI * 2);
                    ctx.fill();

                    // Nose
                    ctx.fillStyle = '#E05070';
                    ctx.beginPath();
                    ctx.arc(0, m * 0.08, m * 0.05, 0, Math.PI * 2);
                    ctx.fill();

                    // Whiskers
                    ctx.strokeStyle = '#888';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(-m * 0.12, m * 0.12); ctx.lineTo(-m * 0.5, m * 0.0);
                    ctx.moveTo(-m * 0.12, m * 0.14); ctx.lineTo(-m * 0.5, m * 0.18);
                    ctx.moveTo(m * 0.12, m * 0.12); ctx.lineTo(m * 0.5, m * 0.0);
                    ctx.moveTo(m * 0.12, m * 0.14); ctx.lineTo(m * 0.5, m * 0.18);
                    ctx.stroke();
                }
                break;
        }

        ctx.restore();
        return;
    }

    // --- STANDARD DRAW (Legacy) ---
    switch (this.type) {
      case AURA_TYPES.FIRE: {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = this.life * 0.8;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        gradient.addColorStop(0, `hsla(40, 100%, 60%, 1)`);
        gradient.addColorStop(0.5, `hsla(${this.hue}, 100%, 50%, 0.6)`);
        gradient.addColorStop(1, `hsla(0, 100%, 20%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case AURA_TYPES.WATER:
        ctx.globalCompositeOperation = 'screen';
        if (this.isVortex) {
             ctx.globalAlpha = this.life * 0.5;
             ctx.fillStyle = `hsla(${this.hue}, 90%, 60%, 1)`;
             ctx.beginPath();
             ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
             ctx.fill();
             ctx.globalAlpha = this.life * 0.2;
             ctx.fillRect(this.x - this.size/2, this.y, this.size, 40);
             ctx.globalAlpha = this.life * 0.8;
             ctx.fillStyle = 'white';
             ctx.beginPath();
             ctx.arc(this.x - this.size*0.3, this.y - this.size*0.3, this.size*0.3, 0, Math.PI*2);
             ctx.fill();
        } else {
             ctx.globalAlpha = this.life * 0.7;
             ctx.fillStyle = '#e0f7fa';
             ctx.shadowBlur = 5;
             ctx.shadowColor = 'white';
             ctx.beginPath();
             ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
             ctx.fill();
        }
        break;

      case AURA_TYPES.WIND:
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = this.life * 0.5;
        ctx.strokeStyle = `hsla(${this.hue}, 70%, 75%, 1)`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        {
          const prevY = this.y + 15;
          const prevX = this.initialX + Math.sin(prevY * this.frequency + this.phase) * this.amplitude;
          ctx.quadraticCurveTo((this.x + prevX)/2 + 10, (this.y + prevY)/2, prevX, prevY);
        }
        ctx.stroke();
        break;

      case AURA_TYPES.ELECTRIC:
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = this.life;
        ctx.strokeStyle = `hsla(${this.hue}, 80%, 70%, 1)`;
        ctx.lineWidth = this.size;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${this.hue}, 90%, 50%, 0.8)`;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if(this.points && this.points.length > 0) {
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for(let p of this.points) {
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
            ctx.fillStyle = `white`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsla(${this.hue}, 80%, 60%, 1)`;
            ctx.beginPath();
            const s = this.size * (0.5 + Math.random()*0.5);
            ctx.arc(this.x, this.y, s, 0, Math.PI*2);
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

      case AURA_TYPES.CYBER:
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = this.life;
        if (this.isGlitch) {
             ctx.fillStyle = 'white';
             ctx.shadowColor = 'red';
             ctx.shadowBlur = 5;
        } else {
             ctx.fillStyle = `hsla(${this.hue}, 100%, 50%, 1)`;
             ctx.shadowColor = `hsla(${this.hue}, 100%, 50%, 0.5)`;
             ctx.shadowBlur = 0;
        }
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 0.2;
        ctx.fillRect(this.x, this.y + this.size, this.size, this.size * 4);
        break;

      case AURA_TYPES.RADIANT:
        ctx.globalCompositeOperation = 'screen';
        if (this.isBeam) {
            ctx.globalAlpha = this.life * 0.3;
            const grad = ctx.createLinearGradient(0, this.y + 100, 0, this.y - 200);
            grad.addColorStop(0, `hsla(${this.hue}, 100%, 80%, 0)`);
            grad.addColorStop(0.5, `hsla(${this.hue}, 100%, 60%, 1)`);
            grad.addColorStop(1, `hsla(${this.hue}, 100%, 80%, 0)`);
            ctx.fillStyle = grad;
            ctx.fillRect(this.x - this.size/2, this.y - 200, this.size, 300);
        } else {
            ctx.globalAlpha = this.life;
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsla(${this.hue}, 100%, 50%, 1)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
            ctx.fill();
        }
        break;

      case AURA_TYPES.SAKURA:
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = this.life * 0.9;
        ctx.fillStyle = `hsla(${this.hue}, 80%, 85%, 1)`;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size/2, 0, 0, Math.PI*2);
        ctx.fill();
        break;

      case AURA_TYPES.SHADOW: {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = this.life * 0.7;
        const shadowGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        shadowGrad.addColorStop(0, `hsla(${this.hue}, 100%, 10%, 1)`);
        shadowGrad.addColorStop(1, `hsla(${this.hue}, 100%, 5%, 0)`);
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case AURA_TYPES.PRISM:
        ctx.globalCompositeOperation = 'color-dodge';
        ctx.globalAlpha = this.life;
        ctx.fillStyle = `hsla(${this.hue}, 80%, 70%, 0.8)`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'white';
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size/1.5, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size/1.5, 0);
        ctx.fill();
        break;
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
  const [showInput, setShowInput] = useState(false);

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

  // --- AI FEATURE: THE ALCHEMIST PRO (Custom Aura) ---
  const generateAura = async () => {
    if (!promptInput.trim()) return;
    setAiLoading(true);
    setAiMessage("The Alchemist is designing particle physics...");

    const systemPrompt = `You are a Visual Effects Director for a high-end graphics engine.
Translate the user's "vibe" into a precise particle system configuration.
User Prompt: "${promptInput}"

Output JSON ONLY. No markdown. No backticks. Schema:
{
  "name": "string",
  "description": "string (Max 10 words)",
  "colors": [hue1, hue2],
  "physics": {
    "flow": "up" | "down" | "out" | "spiral" | "orbit" | "float" | "converge" | "pulse" | "wander",
    "speed": number (2-10),
    "turbulence": number (0-1),
    "gravity": number (-1 to 1),
    "initialVelocity": number (5-10)
  },
  "visuals": {
    "shape": "circle" | "rect" | "star" | "petal" | "bolt" | "pixel" | "soft" | "triangle" | "diamond" | "line",
    "blendMode": "screen" | "lighter" | "source-over" | "color-dodge",
    "glow": boolean,
    "size": number (5-40)
  },
  "emitter": {
    "origin": "center" | "ring" | "feet" | "screen",
    "width": number (50-150),
    "height": number (50-150)
  },
  "density": number (50-200)
}`;

    try {
      const text = await callClaudeText(systemPrompt);
      if (!text) throw new Error('No response');
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      const config = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson);
      setCustomAuraConfig(config);
      setActiveAura(AURA_TYPES.CUSTOM);
      setAiMessage(`Forged: ${config.name} - ${config.description}`);
      setShowInput(false);
    } catch (e) {
      console.error(e);
      setAiMessage("The alchemy failed. The prompt may be too abstract.");
    } finally {
      setAiLoading(false);
    }
  };

  // --- AI FEATURE: THE ORACLE ---
  const askTheOracle = async () => {
    if (!avatar) {
      setAiMessage("The Oracle needs an avatar to gaze upon.");
      return;
    }
    setAiLoading(true);
    setAiMessage("The Oracle is consulting the spirits...");

    const oraclePrompt = `Analyze this character image. Based on their color palette, clothing, and overall vibe,
which ONE of these elemental auras would suit them best?

Options: ${Object.values(AURA_TYPES).filter(t => t !== 'none' && t !== 'custom').join(', ')}.

Return ONLY a JSON object: { "recommendedAura": "exact_aura_name_from_options", "reason": "A 10-word mystical explanation" }`;

    try {
      const resultText = await callClaudeVision(avatar, oraclePrompt);
      if (!resultText) throw new Error('No response');
      const cleanJson = resultText.replace(/```json|```/g, '').trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson);

      if (result.recommendedAura && Object.values(AURA_TYPES).includes(result.recommendedAura)) {
        setActiveAura(result.recommendedAura);
        setAiMessage(`The Oracle has spoken: ${result.reason}`);
      } else {
        setAiMessage("The Oracle's vision was clouded. Try again.");
      }
    } catch (e) {
      console.error(e);
      setAiMessage("The connection to the ethereal plane failed.");
    } finally {
      setAiLoading(false);
    }
  };

  // --- AI FEATURE: THE SCRIBE ---
  const consultScribe = async () => {
    if (!avatar) {
      setAiMessage("The Scribe needs a hero to write about.");
      return;
    }
    if (activeAura === AURA_TYPES.NONE) {
      setAiMessage("Ignite an aura first.");
      return;
    }

    setAiLoading(true);
    setAiMessage("The Scribe is penning your legend...");

    const scribePrompt = `Write a single, epic, RPG-style sentence describing this character.
They are wielding the power of ${activeAura === AURA_TYPES.CUSTOM ? customAuraConfig?.name : activeAura}.
Mention their appearance and how the aura manifests.
Keep it under 20 words.`;

    try {
      const text = await callClaudeVision(avatar, scribePrompt);
      if (text) setAiMessage(`"${text.trim()}"`);
      else setAiMessage("The Scribe's ink has run dry.");
    } catch (e) {
      setAiMessage("The Scribe's ink has run dry.");
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
        switch(activeAura) {
          case AURA_TYPES.FIRE: count = 200; break;
          case AURA_TYPES.WATER: count = 350; break;
          case AURA_TYPES.WIND: count = 150; break;
          case AURA_TYPES.ELECTRIC: count = 12; break;
          case AURA_TYPES.COSMIC: count = 100; break;
          case AURA_TYPES.CYBER: count = 150; break;
          case AURA_TYPES.RADIANT: count = 100; break;
          case AURA_TYPES.SAKURA: count = 150; break;
          case AURA_TYPES.SHADOW: count = 200; break;
          case AURA_TYPES.PRISM: count = 80; break;
          case AURA_TYPES.NATURE: count = 80; break;
          case AURA_TYPES.LOVE: count = 60; break;
          case AURA_TYPES.EXHAUST: count = 100; break;
          case AURA_TYPES.STARDUST: count = 150; break;
          case AURA_TYPES.ANIMAL: count = 20; break;
          case AURA_TYPES.PAPER: count = 25; break;
          case AURA_TYPES.MINION: count = 30; break;
          case AURA_TYPES.TOMANDJERRY: count = 35; break;
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
         ctx.globalCompositeOperation = 'source-over';
         ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    else if ([AURA_TYPES.FIRE, AURA_TYPES.ELECTRIC, AURA_TYPES.PRISM, AURA_TYPES.STARDUST].includes(activeAura)) {
         ctx.globalCompositeOperation = 'source-over';
         ctx.fillStyle = 'rgba(10, 10, 15, 0.2)';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if ([AURA_TYPES.COSMIC, AURA_TYPES.CYBER, AURA_TYPES.SHADOW, AURA_TYPES.EXHAUST].includes(activeAura)) {
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
  }, [activeAura]);

  useEffect(() => {
    if (canvasRef.current) {
        canvasRef.current.width = 600;
        canvasRef.current.height = 700;
    }
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [animate]);


  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-purple-500 overflow-hidden flex flex-col items-center relative">

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black z-0 pointer-events-none"></div>

      {/* Header */}
      <header className="z-10 w-full max-w-4xl p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <Layers className="text-purple-500" />
            <h1 className="text-2xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                AURA<span className="text-white font-light">STUDIO</span>
            </h1>
        </div>
      </header>

      {/* Main Stage */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl relative z-10 p-4">

        {/* The Card/Stage */}
        <div className="relative w-full max-w-xl aspect-[4/5] flex items-center justify-center rounded-3xl border border-gray-800 bg-gray-900/30 backdrop-blur-sm shadow-2xl overflow-hidden group">

            {/* The Aura Canvas (Background) */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full z-10 pointer-events-none"
            />

            {/* The Avatar (Big & Centered) */}
            <div className="relative z-20 w-80 h-80 md:w-[420px] md:h-[420px] transition-all duration-500 ease-out">
                {avatar ? (
                    <img
                        src={avatar}
                        alt="User Avatar"
                        className="w-full h-full object-contain"
                        style={{
                            filter: `drop-shadow(0 0 20px ${activeAura === AURA_TYPES.CUSTOM ? `hsla(${customAuraConfig?.colors?.[0] || 0}, 100%, 50%, 0.8)` : AURA_COLORS[activeAura]}) drop-shadow(0 10px 10px rgba(0,0,0,0.5))`
                        }}
                    />
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-full border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-purple-500 hover:text-purple-400 transition-all hover:bg-gray-800/50"
                    >
                        <Camera size={48} className="mb-4 opacity-50" />
                        <p className="font-medium">Upload Avatar</p>
                    </div>
                )}
            </div>

            {/* Vignette Overlay */}
            <div className="absolute inset-0 pointer-events-none z-30" style={{background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 100%)'}}></div>
        </div>

        {/* Aura Name Indicator & AI Message */}
        <div className="mt-8 text-center h-20 px-4">

            {showInput ? (
                <div className="flex gap-2 max-w-md mx-auto">
                    <input
                        type="text"
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        placeholder="E.g. 'Cyberpunk Rain' or 'NFL Vibe'..."
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                        onKeyDown={(e) => e.key === 'Enter' && generateAura()}
                    />
                    <button
                        onClick={generateAura}
                        disabled={aiLoading || !promptInput}
                        className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {aiLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            ) : (
                <h2 className={`text-2xl font-black tracking-[0.3em] uppercase transition-colors duration-500 mb-2`}
                    style={{
                      color: activeAura === AURA_TYPES.NONE ? '#374151' : (AURA_COLORS[activeAura] || '#fff'),
                      textShadow: activeAura !== AURA_TYPES.NONE ? `0 0 10px ${AURA_COLORS[activeAura] || '#fff'}` : 'none'
                    }}
                >
                    {activeAura === AURA_TYPES.CUSTOM
                        ? (customAuraConfig?.name || "Unknown Energy")
                        : (activeAura === AURA_TYPES.NONE ? 'Select Aura' : activeAura)}
                </h2>
            )}

            {aiMessage && !showInput && (
                <p className="text-sm text-gray-400 italic max-w-lg mx-auto">
                   {aiMessage}
                </p>
            )}
        </div>

      </main>

      {/* Control Dock */}
      <div className="z-40 w-full pb-8 px-4 overflow-hidden">
        <div className="flex items-center gap-3 md:gap-6 bg-gray-900/90 backdrop-blur-xl p-4 rounded-2xl border border-gray-800 shadow-2xl overflow-x-auto mx-auto max-w-screen-xl">

            {/* Upload Button */}
            <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-1 group min-w-[60px] flex-shrink-0"
            >
                <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-gray-700 group-hover:text-white transition-all border border-gray-700">
                    <Upload size={20} />
                </div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider group-hover:text-gray-300">New</span>
            </button>

             <div className="w-px h-10 bg-gray-800 mx-2 flex-shrink-0"></div>

             {/* AI Tools Section */}
            <div className="flex gap-4 flex-shrink-0">
                <button
                    onClick={askTheOracle}
                    disabled={aiLoading}
                    className="flex flex-col items-center gap-1 group min-w-[60px]"
                >
                    <div className="w-12 h-12 rounded-xl bg-purple-900/30 border border-purple-500/50 flex items-center justify-center text-purple-300 group-hover:bg-purple-900/60 group-hover:text-white transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                        {aiLoading ? <Loader2 size={20} className="animate-spin" /> : <Bot size={20} />}
                    </div>
                    <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider group-hover:text-purple-200">Oracle</span>
                </button>

                <button
                    onClick={() => {
                        setShowInput(!showInput);
                        setAiMessage("");
                    }}
                    className="flex flex-col items-center gap-1 group min-w-[60px]"
                >
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${showInput ? 'bg-pink-900/50 border-pink-500 text-white' : 'bg-pink-900/30 border-pink-500/50 text-pink-300 hover:bg-pink-900/60 hover:text-white'} shadow-[0_0_10px_rgba(236,72,153,0.2)]`}>
                        <Wand2 size={20} />
                    </div>
                    <span className="text-[10px] font-semibold text-pink-400 uppercase tracking-wider group-hover:text-pink-200">Create</span>
                </button>

                <button
                    onClick={consultScribe}
                    disabled={aiLoading}
                    className="flex flex-col items-center gap-1 group min-w-[60px]"
                >
                    <div className="w-12 h-12 rounded-xl bg-amber-900/30 border border-amber-500/50 flex items-center justify-center text-amber-300 group-hover:bg-amber-900/60 group-hover:text-white transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                        {aiLoading ? <Loader2 size={20} className="animate-spin" /> : <ScrollText size={20} />}
                    </div>
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider group-hover:text-amber-200">Scribe</span>
                </button>
            </div>

            <div className="w-px h-10 bg-gray-800 mx-2 flex-shrink-0"></div>

            <AuraButton
                active={activeAura === AURA_TYPES.NONE}
                onClick={() => setActiveAura(AURA_TYPES.NONE)}
                icon={<Layers size={20} />}
                label="Off"
                color="bg-gray-800"
            />

            <div className="w-px h-10 bg-gray-800 mx-2 flex-shrink-0"></div>

            {/* Aura Buttons */}
            <AuraButton active={activeAura === AURA_TYPES.FIRE} onClick={() => setActiveAura(AURA_TYPES.FIRE)} icon={<Flame size={20} />} label="Fire" color="bg-orange-600/90" activeColor="text-orange-400" />
            <AuraButton active={activeAura === AURA_TYPES.WATER} onClick={() => setActiveAura(AURA_TYPES.WATER)} icon={<Droplets size={20} />} label="Water" color="bg-blue-600/90" activeColor="text-blue-400" />
            <AuraButton active={activeAura === AURA_TYPES.WIND} onClick={() => setActiveAura(AURA_TYPES.WIND)} icon={<Wind size={20} />} label="Wind" color="bg-teal-600/90" activeColor="text-teal-400" />
            <AuraButton active={activeAura === AURA_TYPES.ELECTRIC} onClick={() => setActiveAura(AURA_TYPES.ELECTRIC)} icon={<Zap size={20} />} label="Shock" color="bg-purple-600/90" activeColor="text-purple-400" />
            <AuraButton active={activeAura === AURA_TYPES.COSMIC} onClick={() => setActiveAura(AURA_TYPES.COSMIC)} icon={<Sparkles size={20} />} label="Cosmic" color="bg-indigo-600/90" activeColor="text-indigo-400" />
            <AuraButton active={activeAura === AURA_TYPES.CYBER} onClick={() => setActiveAura(AURA_TYPES.CYBER)} icon={<Cpu size={20} />} label="Cyber" color="bg-green-900" activeColor="text-green-400" />
            <AuraButton active={activeAura === AURA_TYPES.RADIANT} onClick={() => setActiveAura(AURA_TYPES.RADIANT)} icon={<Sun size={20} />} label="Radiant" color="bg-yellow-700" activeColor="text-yellow-300" />
            <AuraButton active={activeAura === AURA_TYPES.NATURE} onClick={() => setActiveAura(AURA_TYPES.NATURE)} icon={<Flower size={20} />} label="Nature" color="bg-green-600" activeColor="text-green-300" />
            <AuraButton active={activeAura === AURA_TYPES.LOVE} onClick={() => setActiveAura(AURA_TYPES.LOVE)} icon={<Heart size={20} />} label="Love" color="bg-red-600" activeColor="text-red-300" />
            <AuraButton active={activeAura === AURA_TYPES.EXHAUST} onClick={() => setActiveAura(AURA_TYPES.EXHAUST)} icon={<CloudFog size={20} />} label="Smoke" color="bg-slate-600" activeColor="text-slate-300" />
            <AuraButton active={activeAura === AURA_TYPES.STARDUST} onClick={() => setActiveAura(AURA_TYPES.STARDUST)} icon={<Star size={20} />} label="Stars" color="bg-yellow-600" activeColor="text-yellow-200" />
            <AuraButton active={activeAura === AURA_TYPES.ANIMAL} onClick={() => setActiveAura(AURA_TYPES.ANIMAL)} icon={<PawPrint size={20} />} label="Paws" color="bg-orange-600" activeColor="text-orange-200" />
            <AuraButton active={activeAura === AURA_TYPES.PAPER} onClick={() => setActiveAura(AURA_TYPES.PAPER)} icon={<Send size={20} />} label="Paper" color="bg-slate-600" activeColor="text-slate-200" />
            <AuraButton active={activeAura === AURA_TYPES.MINION} onClick={() => setActiveAura(AURA_TYPES.MINION)} icon={<Smile size={20} />} label="Minion" color="bg-yellow-500" activeColor="text-yellow-100" />
            <AuraButton active={activeAura === AURA_TYPES.TOMANDJERRY} onClick={() => setActiveAura(AURA_TYPES.TOMANDJERRY)} icon={<Cat size={20} />} label="T&J" color="bg-blue-500" activeColor="text-blue-200" />
        </div>
      </div>

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

function AuraButton({ active, onClick, icon, label, color, activeColor }) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center gap-1 group min-w-[60px] relative flex-shrink-0"
        >
            <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 border
                ${active
                    ? `${color} border-white/50 text-white scale-110 -translate-y-2 shadow-lg`
                    : 'bg-black/50 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white hover:border-gray-600'
                }
            `}>
                {icon}
            </div>
            <span className={`
                text-[10px] font-bold uppercase tracking-wider transition-colors
                ${active ? (activeColor || 'text-white') : 'text-gray-600 group-hover:text-gray-400'}
            `}>
                {label}
            </span>
            {active && (
                <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-white opacity-100 shadow-[0_0_5px_white]"></div>
            )}
        </button>
    );
}
