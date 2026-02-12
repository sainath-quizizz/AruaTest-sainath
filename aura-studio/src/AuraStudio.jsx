import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  /* --- COMMENTED OUT: Preset aura icons ---
  Flame,
  Droplets,
  Wind,
  Zap,
  Sparkles,
  Cpu,
  Sun,
  Flower,
  Ghost,
  Diamond,
  Bot,
  ScrollText,
  Send,
  Heart,
  CloudFog,
  Star,
  PawPrint,
  Plane,
  Smile,
  Cat,
  Box,
  --- END COMMENTED OUT --- */
  Upload,
  Camera,
  Layers,
  Loader2,
  Sparkles,
  ImagePlus,
  Wand2,
  X
} from 'lucide-react';

const AURA_TYPES = {
  NONE: 'none',
  /* --- COMMENTED OUT: Preset aura types ---
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
  MINECRAFT: 'minecraft',
  --- END COMMENTED OUT --- */
  CUSTOM: 'custom'
};

const AURA_COLORS = {
  [AURA_TYPES.NONE]: 'rgba(0,0,0,0)',
  /* --- COMMENTED OUT: Preset aura colors ---
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
  [AURA_TYPES.MINECRAFT]: '#5D8C3E',
  --- END COMMENTED OUT --- */
  [AURA_TYPES.CUSTOM]: '#ffffff'
};

const random = (min, max) => Math.random() * (max - min) + min;

// --- PORTKEY + GEMINI API HELPERS ---
const PORTKEY_URL = 'https://api.portkey.ai/v1/chat/completions';
const PORTKEY_MODEL = '@vertex-global-region/gemini-3-pro-image-preview';

async function callLLMText(promptText) {
  const key = localStorage.getItem('portkey_api_key') || window.prompt('Enter your Portkey API key:') || '';
  if (key && !localStorage.getItem('portkey_api_key')) localStorage.setItem('portkey_api_key', key);
  if (!key) throw new Error('No API key provided. Set it via: localStorage.setItem("portkey_api_key", "your-key")');

  const response = await fetch(PORTKEY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-portkey-api-key': key,
    },
    body: JSON.stringify({
      model: PORTKEY_MODEL,
      max_tokens: 4096,
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

/* --- COMMENTED OUT: Vision API helper (used by Oracle/Scribe) ---
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
--- END COMMENTED OUT --- */

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

    // --- SHAPE-BASED ENGINE FOR CUSTOM AURAS ---
    if (this.type === AURA_TYPES.CUSTOM && this.customConfig) {
        const entities = this.customConfig.entities;
        if (entities && entities.length > 0) {
            // Pick entity based on weight
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
            const vxRange = sp.vx || [-1, 1];
            const vyRange = sp.vy || [-2, -0.5];
            this.vx = random(vxRange[0], vxRange[1]);
            this.vy = random(vyRange[0], vyRange[1]);

            // Force upward drift for string presets (skip for custom movement objects)
            const mov = this.entity.movement;
            if (typeof mov === 'string') {
                const downwardTypes = ['rain', 'bounce'];
                if (!downwardTypes.includes(mov) && this.vy > 0) {
                    this.vy = -Math.abs(this.vy);
                }
            }

            this.x = centerX + random(-110, 110);
            this.y = feetY + random(-30, 80);
            this.rotation = random(-0.15, 0.15);
            this.rotSpeed = random(-0.02, 0.02);
            this.life = 1;
            this.decay = random(0.005, 0.013);
            this.movementPhase = random(0, Math.PI * 2);
        }
        return;
    }

    /* --- COMMENTED OUT: All preset aura reset logic ---

    // --- NEW VFX TYPES ---
    if ([AURA_TYPES.NATURE, AURA_TYPES.LOVE, AURA_TYPES.EXHAUST, AURA_TYPES.STARDUST, AURA_TYPES.ANIMAL, AURA_TYPES.PAPER, AURA_TYPES.MINION, AURA_TYPES.TOMANDJERRY, AURA_TYPES.MINECRAFT].includes(this.type)) {
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
        else if (this.type === AURA_TYPES.MINECRAFT) {
            const types = [0, 0, 0, 1, 1, 2, 3, 4];
            this.blockType = types[Math.floor(Math.random() * types.length)];
            this.x = centerX + random(-110, 110);
            this.y = feetY + random(-20, 80);
            this.vx = random(-0.8, 0.8);
            this.vy = random(-2.5, -0.8);
            this.size = random(10, 18);
            this.rotation = 0;
            this.rotSpeed = random(-0.02, 0.02);
            this.life = 1;
            this.decay = random(0.005, 0.012);
            this.hue = 0;
        }
        return;
    }

    // --- STANDARD PRESETS (Legacy) ---
    switch (this.type) {
      case AURA_TYPES.FIRE:
        this.x = centerX + random(-60, 60); this.y = feetY + random(-10, 40);
        this.vx = (this.x - centerX) * 0.005 + random(-0.2, 0.2); this.vy = random(-3.5, -1);
        this.size = random(30, 70); this.life = 1; this.decay = random(0.008, 0.02); this.hue = random(0, 35); break;
      case AURA_TYPES.WATER:
        this.x = centerX; this.y = feetY + random(10, 40);
        if (this.variant > 0.4) { this.isVortex = true; this.angle = random(0, Math.PI * 2); this.radius = random(40, 70); this.x = centerX + Math.cos(this.angle) * this.radius; this.vy = random(-5, -2); this.vr = 0.08; this.size = random(8, 20); this.decay = random(0.005, 0.015); this.hue = random(190, 230); }
        else { this.isVortex = false; this.x = centerX + random(-50, 50); this.vx = random(-2, 2); this.vy = random(-6, -3); this.gravity = 0.15; this.size = random(2, 6); this.decay = random(0.02, 0.04); this.hue = random(180, 200); }
        this.life = 1; break;
      case AURA_TYPES.WIND:
        this.initialX = centerX; this.y = feetY + random(20, 100); this.vy = random(-3, -1.5); this.amplitude = random(40, 90); this.frequency = random(0.015, 0.03); this.phase = random(0, Math.PI * 2);
        this.x = this.initialX + Math.sin(this.y * this.frequency + this.phase) * this.amplitude; this.size = random(20, 40); this.life = 1; this.decay = 0.008; this.hue = random(150, 170); break;
      case AURA_TYPES.ELECTRIC:
        this.x = centerX + random(-80, 80); this.y = feetY - random(0, 180); this.points = [];
        let curX = this.x; let curY = this.y;
        for(let i=0; i<5; i++) { this.points.push({x: curX, y: curY}); curX += random(-20, 20); curY += random(-20, 20); }
        this.life = 1; this.decay = random(0.02, 0.08); this.size = random(1, 4); this.hue = random(250, 280); break;
      case AURA_TYPES.COSMIC:
        this.x = centerX; this.y = this.h * 0.5;
        const cosmicAngle = random(0, Math.PI * 2); const cosmicSpeed = random(3, 8);
        this.vx = Math.cos(cosmicAngle) * cosmicSpeed; this.vy = Math.sin(cosmicAngle) * cosmicSpeed;
        this.size = random(1, 3); this.life = 1; this.decay = random(0.01, 0.03); this.hue = random(200, 320);
        if (this.variant > 0.8) { this.vx = 0; this.vy = 0; this.x = centerX + random(-150, 150); this.y = this.h * 0.5 + random(-150, 150); this.size = random(2, 5); this.decay = random(0.005, 0.01); this.isStar = true; }
        break;
      case AURA_TYPES.CYBER:
        this.x = centerX + random(-70, 70); this.x = Math.floor(this.x / 10) * 10; this.y = feetY + random(0, 60);
        this.vy = random(-3, -1); this.size = random(5, 12); this.life = 1; this.decay = random(0.01, 0.03); this.hue = random(100, 140); this.isGlitch = Math.random() > 0.9; break;
      case AURA_TYPES.RADIANT:
        this.x = centerX + random(-100, 100); this.y = feetY - 20; this.vy = random(-1.5, -0.5);
        if (this.variant > 0.7) { this.size = random(30, 70); this.life = 1; this.decay = 0.015; this.isBeam = true; }
        else { this.x = centerX + random(-150, 150); this.y = feetY + random(-120, 50); this.vx = random(-0.3, 0.3); this.vy = random(-0.8, -0.1); this.size = random(1, 3); this.life = 1; this.decay = random(0.005, 0.01); this.isBeam = false; }
        this.hue = random(40, 55); break;
      case AURA_TYPES.SAKURA:
        this.x = centerX + random(-100, 100); this.y = feetY + 50; this.vx = random(-1, 1); this.vy = random(-3, -1);
        this.size = random(4, 8); this.rotation = random(0, 360); this.rotSpeed = random(-5, 5); this.life = 1; this.decay = random(0.005, 0.015); this.hue = random(330, 350); break;
      case AURA_TYPES.SHADOW:
        this.x = centerX + random(-60, 60); this.y = feetY + random(-10, 30); this.vx = (this.x - centerX) * 0.01;
        this.vy = random(-2, -0.5); this.size = random(30, 80); this.life = 1; this.decay = random(0.01, 0.02); this.hue = random(260, 280); break;
      case AURA_TYPES.PRISM:
        this.x = centerX + random(-80, 80); this.y = feetY + random(0, 50); this.vy = random(-2, -0.5);
        this.size = random(5, 15); this.life = 1; this.decay = random(0.01, 0.02); this.rotation = random(0, Math.PI); this.rotSpeed = random(-0.05, 0.05); this.hue = random(160, 200); break;
      default: break;
    }

    --- END COMMENTED OUT --- */
  }

  update() {
    // --- SHAPE-BASED UPDATE FOR CUSTOM ---
    if (this.type === AURA_TYPES.CUSTOM && this.customConfig) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.rotSpeed) this.rotation += this.rotSpeed;
        this.movementPhase = (this.movementPhase || 0) + 0.08;

        const movement = this.entity?.movement || 'float';
        const centerX = this.w / 2;
        const centerY = this.h * 0.58;

        // Custom movement object from AI
        if (typeof movement === 'object') {
            const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
            const m = movement;

            // Gravity: vertical acceleration (negative = up)
            if (m.gravity) this.vy += clamp(m.gravity, -0.15, 0.15);

            // Friction: velocity damping
            if (m.friction) {
                const f = clamp(m.friction, 0.9, 1.0);
                this.vx *= f;
                this.vy *= f;
            }

            // Wave: sine oscillation on an axis
            if (m.wave) {
                const amp = clamp(m.wave.amp || 1, 0.1, 5);
                const freq = clamp(m.wave.freq || 1, 0.1, 5);
                const waveVal = Math.sin(this.movementPhase * freq) * amp;
                if (m.wave.axis === 'y') this.y += waveVal;
                else if (m.wave.axis === 'both') { this.x += waveVal; this.y += Math.cos(this.movementPhase * freq) * amp * 0.5; }
                else this.x += waveVal;
            }

            // Attract: pull toward center
            if (m.attract) {
                const a = clamp(m.attract, -0.01, 0.01);
                this.vx += (centerX - this.x) * a;
                this.vy += (centerY - this.y) * a;
            }

            // Spin: circular motion overlay
            if (m.spin) {
                const sp = clamp(m.spin, -3, 3);
                this.x += Math.cos(this.movementPhase * sp) * 1.5;
                this.y += Math.sin(this.movementPhase * sp) * 1.5;
            }

            // Jitter: random noise
            if (m.jitter) {
                const j = clamp(m.jitter, 0, 0.5);
                this.vx += random(-j, j);
                this.vy += random(-j, j);
            }

            // Bounce: floor collision
            if (m.bounce) {
                const floor = this.h * (clamp(m.bounce.floor || 0.75, 0.5, 0.9));
                if (this.y > floor) {
                    this.y = floor;
                    this.vy *= -(clamp(m.bounce.elasticity || 0.6, 0.1, 0.9));
                }
            }

            // Scale: particle size change over time
            if (m.scale) {
                this.size *= clamp(m.scale, 0.95, 1.05);
            }

            // Speed clamp to prevent runaways
            this.vx = clamp(this.vx, -8, 8);
            this.vy = clamp(this.vy, -8, 8);

        } else {
            // Preset movement strings
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

    /* --- COMMENTED OUT: All preset aura update logic ---

    // --- NEW VFX TYPES UPDATE ---
    if ([AURA_TYPES.NATURE, AURA_TYPES.LOVE, AURA_TYPES.EXHAUST, AURA_TYPES.STARDUST, AURA_TYPES.ANIMAL, AURA_TYPES.PAPER, AURA_TYPES.MINION, AURA_TYPES.TOMANDJERRY, AURA_TYPES.MINECRAFT].includes(this.type)) {
        this.x += this.vx; this.y += this.vy;
        if (this.rotSpeed) this.rotation += this.rotSpeed;
        if (this.type === AURA_TYPES.NATURE) { this.x += Math.sin(this.y * 0.02) * 0.5; }
        if (this.type === AURA_TYPES.EXHAUST) { this.size *= 1.02; this.vx *= 0.98; }
        if (this.type === AURA_TYPES.MINION) { this.x += Math.sin(this.y * 0.05) * 0.5; }
        if (this.type === AURA_TYPES.TOMANDJERRY) { this.chasePhase += 0.08; if (this.isTom) { this.x += Math.sin(this.chasePhase) * 1.5; } else { this.x += Math.sin(this.chasePhase * 2.5) * 2.2; this.vy *= 0.998; } }
        if (this.type === AURA_TYPES.MINECRAFT) { this.x += Math.round(Math.sin(this.y * 0.03) * 2); }
        this.life -= this.decay; if (this.life <= 0) this.reset(); return;
    }

    // --- STANDARD UPDATES (Legacy) ---
    switch (this.type) {
      case AURA_TYPES.FIRE: this.x += this.vx; this.y += this.vy; this.vx *= 0.99; this.size *= 0.96; this.life -= this.decay; break;
      case AURA_TYPES.WATER: if (this.isVortex) { this.y += this.vy; this.angle += this.vr; this.x = (this.w / 2) + Math.cos(this.angle) * this.radius; this.life -= this.decay; } else { this.x += this.vx; this.y += this.vy; this.vy += this.gravity; this.life -= this.decay; } break;
      case AURA_TYPES.WIND: this.y += this.vy; this.x = this.initialX + Math.sin(this.y * this.frequency + this.phase) * this.amplitude; this.life -= this.decay; break;
      case AURA_TYPES.ELECTRIC: this.life -= this.decay; if (Math.random() > 0.8) this.reset(); break;
      case AURA_TYPES.COSMIC: this.x += this.vx; this.y += this.vy; this.life -= this.decay; break;
      case AURA_TYPES.CYBER: this.y += this.vy; if (this.isGlitch && Math.random() > 0.8) { this.x += random(-10, 10); } this.life -= this.decay; break;
      case AURA_TYPES.RADIANT: this.y += this.vy; if (!this.isBeam) { this.x += this.vx; } this.life -= this.decay; break;
      case AURA_TYPES.SAKURA: this.y += this.vy; this.x += Math.sin(this.y * 0.05) * 0.5; this.rotation += this.rotSpeed; this.life -= this.decay; break;
      case AURA_TYPES.SHADOW: this.x += this.vx; this.y += this.vy; this.size *= 1.01; this.life -= this.decay; break;
      case AURA_TYPES.PRISM: this.y += this.vy; this.rotation += this.rotSpeed; this.life -= this.decay; break;
    }
    if (this.life <= 0) { this.reset(); }

    --- END COMMENTED OUT --- */
  }

  // Draws all shapes at a given scale factor
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
                if (shape.fill) { ctx.closePath(); ctx.fill(); }
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

    // --- SHAPE-BASED DRAW FOR CUSTOM ---
    if (this.type === AURA_TYPES.CUSTOM && this.customConfig && this.entity?.shapes) {
        const style = this.entity.style || 'solid';
        const s = this.size;

        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation || 0);

        if (style === 'smoke') {
            // Smoke: soft, additive, layered for thick wispy look
            ctx.globalCompositeOperation = 'lighter';

            // Outer haze (large, diffuse)
            ctx.globalAlpha = this.life * 0.3;
            this._drawShapes(ctx, s * 2);

            // Mid layer (medium spread)
            ctx.globalAlpha = this.life * 0.45;
            this._drawShapes(ctx, s * 1.4);

            // Inner core (dense center)
            ctx.globalAlpha = this.life * 0.7;
            this._drawShapes(ctx, s);

        } else if (style === 'glow') {
            // Glow: bright center with soft radiant edge
            ctx.globalCompositeOperation = 'lighter';

            // Outer glow halo (large, faint)
            ctx.globalAlpha = this.life * 0.15;
            this._drawShapes(ctx, s * 2);

            // Mid glow
            ctx.globalAlpha = this.life * 0.35;
            this._drawShapes(ctx, s * 1.3);

            // Bright core
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = this.life * 0.9;
            this._drawShapes(ctx, s);

        } else {
            // Solid: crisp, opaque — default for characters
            ctx.globalAlpha = this.life;
            ctx.globalCompositeOperation = 'source-over';
            this._drawShapes(ctx, s);
        }

        ctx.restore();
        return;
    }

    /* --- COMMENTED OUT: All preset aura draw logic (~600 lines of VFX + Legacy rendering) ---
    ... Nature flowers, Love hearts, Exhaust smoke, Stardust stars,
    ... Animal paws, Paper planes, Minion characters,
    ... Tom & Jerry cat/mouse faces, Minecraft blocks,
    ... Fire gradients, Water vortex, Wind trails, Electric bolts,
    ... Cosmic streaks, Cyber glitch, Radiant beams, Sakura petals,
    ... Shadow gradients, Prism diamonds
    --- END COMMENTED OUT --- */

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

  // --- AI FEATURE: THE ALCHEMIST PRO (Custom Aura) ---
  const generateAura = async () => {
    if (!promptInput.trim()) return;
    setAiLoading(true);
    setAiMessage("The Alchemist is designing particle physics...");

    const systemPrompt = `You are a particle artist for a Canvas 2D aura engine. Design floating particles that create a visual effect around a character avatar.

User Prompt: "${promptInput}"

WHAT TO GENERATE — read the user's prompt carefully:
- If they name a POWER, ENERGY, or EFFECT (e.g. "super saiyan", "fire aura", "ice storm") → design the aura effect: flames, sparks, energy wisps, ice shards, etc.
- If they name a CHARACTER or ask for characters (e.g. "floating cats", "Powerpuff Girls characters", "tiny Pikachus") → design recognizable character-shaped particles with faces and features.
- If ambiguous, default to the AURA EFFECT interpretation.

Examples:
- "super saiyan" → golden flame wisps (rise), electric sparks (zigzag), energy orbs (float). Effect particles, not Goku.
- "Powerpuff Girls characters" → Blossom (pink circle face, red bow), Bubbles (blue, pigtails), Buttercup (green, short hair). Character particles.
- "ocean" → bubbles, water droplets, foam wisps. Effect particles.
- "floating cat faces" → cat face particles with ears, eyes, nose. Character particles.

RULES:
- All coordinates are RELATIVE to particle size. Center is (0,0). Range: -0.5 to 0.5.
- "r", "rx", "ry", "w", "h" are relative (0 to 1 scale, where 1 = full particle size).
- Design 2-5 entity variants.
- Each entity has a "shapes" array of drawing primitives layered bottom-to-top.
- For effects: 3-8 shapes per entity (simple but vivid).
- For characters: 8-20 shapes per entity (detailed, recognizable features).
- Pick the best movement type per entity to match the vibe.
- IMPORTANT: Canvas Y-axis is inverted. Negative vy = UP, positive vy = DOWN. Auras should generally rise UPWARD, so vy should usually be negative (e.g. [-3, -0.5]). Only use positive vy for rain, bounce, or falling effects.

Output JSON ONLY. No markdown. No backticks. No comments. Schema:
{
  "name": "string",
  "description": "string (max 10 words)",
  "glowColor": "#hex (primary theme color for avatar glow)",
  "density": number (you can put any number you want, even multiple),
  "background": "clear" | "dark-fade" | "black-fade",
  "entities": [
    {
      "weight": number (relative spawn probability, e.g. 1),
      "size": [minSize, maxSize] (e.g. [12, 20]),
      "speed": { "vx": [min, max], "vy": [min, max] },
      "style": "solid" | "smoke" | "glow" (rendering style, see below),
      "movement": STRING_PRESET | CUSTOM_OBJECT (see below),
      "shapes": [
        { "type": "circle", "cx": 0, "cy": 0, "r": 0.5, "fill": "#hex" },
        { "type": "ellipse", "cx": 0, "cy": 0, "rx": 0.3, "ry": 0.2, "fill": "#hex" },
        { "type": "rect", "x": -0.25, "y": -0.25, "w": 0.5, "h": 0.5, "fill": "#hex" },
        { "type": "triangle", "points": [x1,y1, x2,y2, x3,y3], "fill": "#hex" },
        { "type": "line", "x1": 0, "y1": 0, "x2": 0.5, "y2": 0.5, "stroke": "#hex", "width": 0.03 },
        { "type": "arc", "cx": 0, "cy": 0, "r": 0.3, "startAngle": 0, "endAngle": 3.14, "fill": "#hex", "stroke": "#hex" },
        { "type": "polygon", "points": [x1,y1, x2,y2, x3,y3, x4,y4, ...], "fill": "#hex" }
      ]
    }
  ]
}

Arc angles are in radians (0 = right, Math.PI/2 = down, Math.PI = left, Math.PI*1.5 = up). Use arc for smiles, crescents, eyebrows, curved mouths. Use polygon for any n-sided shape (stars, pentagons, hexagons, crowns, etc).

RENDERING STYLES — each entity picks one:
- "solid": Crisp, opaque shapes. ALWAYS use for characters/objects with faces and details. Default.
- "smoke": Soft, wispy, semi-transparent with additive blending. Use for: fire, fog, mist, exhaust, clouds, steam, ghostly effects.
- "glow": Bright center with radiant halo edge. Use for: energy orbs, magic, lightning, stars, neon, plasma, holy light.

You can MIX styles across entities in the same aura! Example for "super saiyan":
- Flame wisps → "smoke" (soft rising flames)
- Energy orbs → "glow" (bright pulsing orbs)
- Electric sparks → "solid" (crisp lightning bolts)

MOVEMENT — use a string preset OR a custom object:

String presets (simple, reliable):
"float" | "zigzag" | "orbit" | "rise" | "wander" | "spiral" | "rain" | "explode" | "swarm" | "bounce" | "pulse" | "vortex"

Custom movement object (for unique patterns — combine any of these properties):
{
  "gravity": number (-0.1 to 0.1, negative=up, positive=down),
  "friction": number (0.9 to 1.0, velocity damping per frame. 0.95=fast slowdown, 0.99=gentle),
  "wave": { "axis": "x"|"y"|"both", "amp": number (0.1-4), "freq": number (0.1-4) },
  "attract": number (-0.005 to 0.005, pull toward center. negative=repel),
  "spin": number (-2 to 2, circular motion overlay speed),
  "jitter": number (0-0.3, random noise),
  "bounce": { "floor": number (0.5-0.9, screen position), "elasticity": number (0.1-0.9) },
  "scale": number (0.97-1.03, size change per frame. <1=shrink, >1=grow)
}

Example custom: a flame that rises, wobbles, and shrinks:
"movement": { "gravity": -0.03, "wave": { "axis": "x", "amp": 1.2, "freq": 1.5 }, "scale": 0.99 }

Example custom: an orb that swirls inward and slows:
"movement": { "spin": 1.5, "attract": 0.003, "friction": 0.995 }

Use presets for simple cases. Use custom objects when the theme needs unique physics that no preset covers. You can combine any properties freely.
Shapes also support optional "stroke" and "strokeWidth" on circle/ellipse/rect/triangle/arc/polygon.

EXAMPLE for "super saiyan" aura — golden flame wisp (smoke style):
{"weight":2,"size":[15,25],"speed":{"vx":[-0.5,0.5],"vy":[-3,-1.5]},"style":"smoke","movement":"rise","shapes":[
{"type":"ellipse","cx":0,"cy":0.1,"rx":0.3,"ry":0.45,"fill":"#FFD700"},
{"type":"ellipse","cx":0,"cy":-0.1,"rx":0.2,"ry":0.35,"fill":"#FFA500"},
{"type":"ellipse","cx":0,"cy":-0.2,"rx":0.1,"ry":0.2,"fill":"#FFFF80"}
]}

EXAMPLE for "super saiyan" aura — energy orb (glow style):
{"weight":1,"size":[6,12],"speed":{"vx":[-1,1],"vy":[-2,-0.5]},"style":"glow","movement":"float","shapes":[
{"type":"circle","cx":0,"cy":0,"r":0.4,"fill":"#FFD700"},
{"type":"circle","cx":0,"cy":0,"r":0.2,"fill":"#FFFFCC"}
]}

EXAMPLE for "super saiyan" aura — electric spark (solid style):
{"weight":1,"size":[8,14],"speed":{"vx":[-2,2],"vy":[-2,1]},"style":"solid","movement":"zigzag","shapes":[
{"type":"line","x1":-0.3,"y1":0.2,"x2":0,"y2":-0.1,"stroke":"#FFFF00","width":0.06},
{"type":"line","x1":0,"y1":-0.1,"x2":0.2,"y2":0.15,"stroke":"#FFFF00","width":0.06},
{"type":"line","x1":0.2,"y1":0.15,"x2":0.4,"y2":-0.2,"stroke":"#FFFFAA","width":0.04}
]}`;

    try {
      const text = await callLLMText(systemPrompt);
      if (!text) throw new Error('No response');
      const cleanJson = text.replace(/```json|```/g, '').trim();
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

  /* --- COMMENTED OUT: Oracle AI feature ---
  const askTheOracle = async () => {
    if (!avatar) { setAiMessage("The Oracle needs an avatar to gaze upon."); return; }
    setAiLoading(true);
    setAiMessage("The Oracle is consulting the spirits...");
    const oraclePrompt = `Analyze this character image...`;
    try {
      const resultText = await callClaudeVision(avatar, oraclePrompt);
      // ... parse and apply recommended aura
    } catch (e) { setAiMessage("The connection to the ethereal plane failed."); }
    finally { setAiLoading(false); }
  };
  --- END COMMENTED OUT --- */

  /* --- COMMENTED OUT: Scribe AI feature ---
  const consultScribe = async () => {
    if (!avatar) { setAiMessage("The Scribe needs a hero to write about."); return; }
    if (activeAura === AURA_TYPES.NONE) { setAiMessage("Ignite an aura first."); return; }
    setAiLoading(true);
    setAiMessage("The Scribe is penning your legend...");
    // ... calls callClaudeVision to generate RPG description
  };
  --- END COMMENTED OUT --- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    particlesRef.current = [];

    let count = 0;

    if (activeAura === AURA_TYPES.CUSTOM && customAuraConfig) {
        count = customAuraConfig.density || 100;
    }
    /* --- COMMENTED OUT: Preset particle counts ---
    else {
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
          case AURA_TYPES.MINECRAFT: count = 40; break;
          default: count = 0;
        }
    }
    --- END COMMENTED OUT --- */

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
         if (bg === 'dark-fade') {
             ctx.globalCompositeOperation = 'source-over';
             ctx.fillStyle = 'rgba(10, 10, 15, 0.2)';
             ctx.fillRect(0, 0, canvas.width, canvas.height);
         } else if (bg === 'black-fade') {
             ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
             ctx.fillRect(0, 0, canvas.width, canvas.height);
         } else {
             ctx.clearRect(0, 0, canvas.width, canvas.height);
         }
    }
    /* --- COMMENTED OUT: Preset background modes ---
    else if ([AURA_TYPES.FIRE, AURA_TYPES.ELECTRIC, AURA_TYPES.PRISM, AURA_TYPES.STARDUST].includes(activeAura)) {
         ctx.globalCompositeOperation = 'source-over';
         ctx.fillStyle = 'rgba(10, 10, 15, 0.2)';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if ([AURA_TYPES.COSMIC, AURA_TYPES.CYBER, AURA_TYPES.SHADOW, AURA_TYPES.EXHAUST].includes(activeAura)) {
         ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    --- END COMMENTED OUT --- */
    else {
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


  const glowColor = activeAura === AURA_TYPES.CUSTOM ? (customAuraConfig?.glowColor || '#a855f7') : AURA_COLORS[activeAura];
  const hasAura = activeAura !== AURA_TYPES.NONE;
  const auraName = activeAura === AURA_TYPES.CUSTOM
    ? (customAuraConfig?.name || "Unknown Energy")
    : (activeAura === AURA_TYPES.NONE ? null : activeAura);

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

/* --- COMMENTED OUT: AuraButton component (used by preset aura buttons) ---
function AuraButton({ active, onClick, icon, label, color, activeColor }) {
    return (
        <button onClick={onClick} className="flex flex-col items-center gap-1 group min-w-[60px] relative flex-shrink-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 border
                ${active ? `${color} border-white/50 text-white scale-110 -translate-y-2 shadow-lg` : 'bg-black/50 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white hover:border-gray-600'}`}>
                {icon}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${active ? (activeColor || 'text-white') : 'text-gray-600 group-hover:text-gray-400'}`}>
                {label}
            </span>
            {active && (<div className="absolute -bottom-2 w-1 h-1 rounded-full bg-white opacity-100 shadow-[0_0_5px_white]"></div>)}
        </button>
    );
}
--- END COMMENTED OUT --- */
