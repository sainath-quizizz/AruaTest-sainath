import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Loader2, Sparkles, ImagePlus, Wand2, X, Flame, Wind, Zap, Flower2, Sliders, Download } from 'lucide-react';

import { AURA_TYPES, AURA_COLORS, PRESET_LABELS, OUTER_SHAPE_PRESETS, SHAPE_PRESETS, PARTICLE_COUNTS, CANVAS_WIDTH, CANVAS_HEIGHT, AVATAR_SIZE, CENTER_Y_RATIO } from './constants';
import { extractSilhouette, lightenHex } from './utils';
import FlameContourRenderer from './FlameContourRenderer';
import Particle from './Particle';
import { callLLM, parseLLMJson, buildSystemPrompt, PROMPT_LAYER_GLOW, PROMPT_LAYER_PARTICLE, PROMPT_LAYER_OUTERSHAPE } from './llm';

export default function AuraStudio() {
  const [activeAura, setActiveAura] = useState(AURA_TYPES.NONE);
  const [avatar, setAvatar] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [customAuraConfig, setCustomAuraConfig] = useState(null);
  const [showDevPanel, setShowDevPanel] = useState(true);
  const [promptGlow, setPromptGlow] = useState(PROMPT_LAYER_GLOW);
  const [promptParticle, setPromptParticle] = useState(PROMPT_LAYER_PARTICLE);
  const [promptOuterShape, setPromptOuterShape] = useState(PROMPT_LAYER_OUTERSHAPE);
  const [activePromptTab, setActivePromptTab] = useState('glow');
  const [selectedPhysics, setSelectedPhysics] = useState([]);
  const [showPhysicsPanel, setShowPhysicsPanel] = useState(true);
  const [originalAuraConfig, setOriginalAuraConfig] = useState(null);
  const [originalAuraType, setOriginalAuraType] = useState(null);
  const [densityMultiplier, setDensityMultiplier] = useState(1.0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [sizeMultiplier, setSizeMultiplier] = useState(1.0);
  const [activeShapePreset, setActiveShapePreset] = useState(null);

  const canvasRef = useRef(null);
  const outerCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const outerShapeRef = useRef(null);
  const overlayShapeRef = useRef(null);
  const fileInputRef = useRef(null);
  const silhouetteRef = useRef(null);
  const lastFrameTimeRef = useRef(performance.now());

  const resetAuraState = () => {
    setCustomAuraConfig(null);
    setAiMessage('');
    setSelectedPhysics([]);
    setOriginalAuraConfig(null);
    setOriginalAuraType(null);
    setActiveShapePreset(null);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target.result;
      setAvatar(src);
      const radii = await extractSilhouette(src, CANVAS_WIDTH, CANVAS_HEIGHT, CENTER_Y_RATIO);
      silhouetteRef.current = radii;
      if (outerShapeRef.current) outerShapeRef.current.setSilhouette(radii);
      if (overlayShapeRef.current) overlayShapeRef.current.setSilhouette(radii);
    };
    reader.readAsDataURL(file);
  };

  const generateAura = async () => {
    if (!promptInput.trim()) return;
    setAiLoading(true);
    setAiMessage('The Alchemist is designing particle physics...');

    try {
      const text = await callLLM(buildSystemPrompt(promptGlow, promptParticle, promptOuterShape, promptInput));
      if (!text) throw new Error('No response');
      const config = parseLLMJson(text);
      setCustomAuraConfig(config);
      setActiveAura(AURA_TYPES.CUSTOM);
      setAiMessage(`Forged: ${config.name} - ${config.description}`);
      setPromptInput('');
      setSelectedPhysics([]);
      setOriginalAuraConfig(null);
      setOriginalAuraType(null);
      setActiveShapePreset(null);
    } catch (e) {
      console.error('Aura generation error:', e);
      setAiMessage(`Failed: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const togglePhysics = (physics) => {
    setSelectedPhysics(prev => {
      const next = prev.includes(physics) ? prev.filter(p => p !== physics) : [...prev, physics];
      if (next.length > 0) setTimeout(() => applyPhysicsWithSelection(next), 0);
      return next;
    });
  };

  const applyPhysicsWithSelection = (physicsSelection) => {
    if (physicsSelection.length === 0) return;

    if (customAuraConfig && activeAura === AURA_TYPES.CUSTOM) {
      if (!originalAuraConfig) setOriginalAuraConfig(JSON.parse(JSON.stringify(customAuraConfig)));
      setCustomAuraConfig({
        ...customAuraConfig,
        entities: customAuraConfig.entities.map((entity, idx) => {
          const assigned = physicsSelection.length === 1 ? physicsSelection[0] : physicsSelection[idx % physicsSelection.length];
          const isDown = ['rain', 'gravity'].includes(assigned);
          const sp = entity.speed || {};
          return { ...entity, movement: assigned, speed: isDown ? { ...sp, vy: [Math.abs((sp.vy || [-2, -0.5])[0]), Math.abs((sp.vy || [-2, -0.5])[1])] } : sp };
        }),
      });
      setAiMessage(`Applied physics: ${physicsSelection.join(', ')}`);
    } else if (activeAura !== AURA_TYPES.NONE && activeAura !== AURA_TYPES.CUSTOM) {
      if (!originalAuraType) setOriginalAuraType(activeAura);
      const color = AURA_COLORS[activeAura];
      const label = PRESET_LABELS[activeAura] || activeAura;
      setCustomAuraConfig({
        name: `${label} + Physics`,
        description: `${label} with ${physicsSelection.join(', ')} motion`,
        glowColor: color || '#a855f7',
        density: 100,
        background: 'clear',
        renderMode: 'discrete',
        entities: physicsSelection.map(physics => ({
          shapes: [{ type: 'circle', cx: 0, cy: 0, r: 0.35, fill: color }],
          size: [18, 26],
          speed: { vx: [-1, 1], vy: ['rain', 'gravity'].includes(physics) ? [2, 5] : [-2, -0.5] },
          style: 'glow',
          movement: physics,
        })),
      });
      setActiveAura(AURA_TYPES.CUSTOM);
      setAiMessage(`Applied ${physicsSelection.join(', ')} to ${label}`);
    }
  };

  // Restore original aura when all physics are deselected
  useEffect(() => {
    if (selectedPhysics.length > 0 || (!originalAuraType && !originalAuraConfig)) return;
    if (originalAuraType) {
      setActiveAura(originalAuraType);
      setCustomAuraConfig(null);
      setAiMessage('Restored original preset aura');
      setOriginalAuraType(null);
    } else if (originalAuraConfig) {
      setCustomAuraConfig(originalAuraConfig);
      setActiveAura(AURA_TYPES.CUSTOM);
      setAiMessage('Restored original aura');
      setOriginalAuraConfig(null);
    }
  }, [selectedPhysics, originalAuraType, originalAuraConfig]);

  // Rebuild particles and flame renderers when config changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let count = activeAura === AURA_TYPES.CUSTOM && customAuraConfig
      ? Math.round((customAuraConfig.density || 100) * 0.7)
      : (PARTICLE_COUNTS[activeAura] || 0);
    count = Math.round(count * densityMultiplier);

    // Scale particle speed by nature: aggressive = faster, calm = slower
    const natureSpeedScale = customAuraConfig?.nature === 'aggressive' ? 1.3
      : customAuraConfig?.nature === 'calm' ? 0.7 : 1.0;

    particlesRef.current = [];
    for (let i = 0; i < count; i++) {
      const p = new Particle(activeAura, canvas.width, canvas.height, customAuraConfig);
      p.speedMultiplier = speedMultiplier * natureSpeedScale;
      p.sizeMultiplier = sizeMultiplier;
      particlesRef.current.push(p);
    }

    const shapeConfig = resolveShapeConfig(activeAura, customAuraConfig, activeShapePreset);
    for (const ref of [outerShapeRef, overlayShapeRef]) {
      const c = ref === outerShapeRef ? outerCanvasRef.current : overlayCanvasRef.current;
      if (!c) continue;
      if (!ref.current) ref.current = new FlameContourRenderer(c.width, c.height);
      ref.current.resize(c.width, c.height);
      ref.current.setConfig(shapeConfig);
      if (silhouetteRef.current) ref.current.setSilhouette(silhouetteRef.current);
    }
  }, [activeAura, customAuraConfig, densityMultiplier, speedMultiplier, sizeMultiplier, activeShapePreset]);

  const animate = useCallback(() => {
    const now = performance.now();
    const dt = (now - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    clearParticleCanvas(ctx, canvas, activeAura, customAuraConfig);

    particlesRef.current.forEach(p => { p.update(); p.draw(ctx); });

    const outerCanvas = outerCanvasRef.current;
    if (outerCanvas && outerShapeRef.current) {
      const outerCtx = outerCanvas.getContext('2d');
      outerCtx.clearRect(0, 0, outerCanvas.width, outerCanvas.height);
      outerShapeRef.current.update(dt);
      outerShapeRef.current.drawAuraOnly(outerCtx);
    }

    const overlayCanvas = overlayCanvasRef.current;
    if (overlayCanvas && outerShapeRef.current?.config) {
      // Lazy-init: overlay canvas only exists in DOM after avatar upload
      if (!overlayShapeRef.current) {
        overlayShapeRef.current = new FlameContourRenderer(overlayCanvas.width, overlayCanvas.height);
        overlayShapeRef.current.resize(overlayCanvas.width, overlayCanvas.height);
        if (silhouetteRef.current) overlayShapeRef.current.setSilhouette(silhouetteRef.current);
      }
      const overlayCtx = overlayCanvas.getContext('2d');
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      overlayShapeRef.current.setConfig(outerShapeRef.current.config);
      overlayShapeRef.current.update(dt);
      overlayShapeRef.current.drawBoltsAndGlow(overlayCtx);
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [activeAura, customAuraConfig]);

  useEffect(() => {
    for (const ref of [canvasRef, outerCanvasRef, overlayCanvasRef]) {
      if (ref.current) { ref.current.width = CANVAS_WIDTH; ref.current.height = CANVAS_HEIGHT; }
    }
    lastFrameTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [animate]);

  const handleDownloadPNG = useCallback(() => {
    if (!avatar) return;
    const offscreen = document.createElement('canvas');
    offscreen.width = CANVAS_WIDTH;
    offscreen.height = CANVAS_HEIGHT;
    const ctx = offscreen.getContext('2d');

    if (outerCanvasRef.current) ctx.drawImage(outerCanvasRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (canvasRef.current) ctx.drawImage(canvasRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ax = (CANVAS_WIDTH - AVATAR_SIZE) / 2;
      const ay = (CANVAS_HEIGHT - AVATAR_SIZE) / 2;
      ctx.drawImage(img, ax, ay, AVATAR_SIZE, AVATAR_SIZE);
      if (overlayCanvasRef.current) {
        const ow = CANVAS_WIDTH * 1.5, oh = CANVAS_HEIGHT * 1.5;
        ctx.drawImage(overlayCanvasRef.current, (CANVAS_WIDTH - ow) / 2, (CANVAS_HEIGHT - oh) / 2, ow, oh);
      }
      const link = document.createElement('a');
      link.download = `aura-character-${Date.now()}.png`;
      link.href = offscreen.toDataURL('image/png');
      link.click();
    };
    img.src = avatar;
  }, [avatar]);

  const glowColor = activeAura === AURA_TYPES.CUSTOM ? (customAuraConfig?.glowColor || '#a855f7') : AURA_COLORS[activeAura];
  const hasAura = activeAura !== AURA_TYPES.NONE;
  const auraName = activeAura === AURA_TYPES.CUSTOM
    ? (customAuraConfig?.name || 'Unknown Energy')
    : (hasAura ? (PRESET_LABELS[activeAura] || activeAura) : null);

  return (
    <div className="h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative select-none">
      <div className="absolute inset-0 transition-all duration-1000 pointer-events-none" style={{
        background: hasAura
          ? `radial-gradient(ellipse at 50% 40%, ${glowColor}15 0%, ${glowColor}08 30%, transparent 70%)`
          : 'radial-gradient(ellipse at 50% 40%, rgba(88,28,135,0.06) 0%, transparent 70%)'
      }} />

      <header className="relative z-30 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-sm font-semibold tracking-widest uppercase text-gray-300">Aura Studio</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPhysicsPanel(v => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${showPhysicsPanel ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' : 'text-gray-600 border-gray-700 hover:text-gray-400 hover:bg-white/[0.06] hover:border-purple-500/20'}`}>
            <span className="text-[10px]">⚡</span> Physics
            {selectedPhysics.length > 0 && <span className="px-1 py-0.5 rounded-full bg-purple-500/30 text-[9px] min-w-[16px] text-center">{selectedPhysics.length}</span>}
          </button>
          <button onClick={() => setShowDevPanel(v => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showDevPanel ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-600 hover:text-gray-400 hover:bg-white/[0.06]'}`}>
            <span className="font-mono text-[10px]">{'{}'}</span> Dev
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all">
            <ImagePlus size={14} /> {avatar ? 'Change' : 'Upload'}
          </button>
          {avatar && hasAura && (
            <button onClick={handleDownloadPNG} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-green-400 hover:text-white hover:bg-green-500/15 border border-green-500/20 hover:border-green-500/40 transition-all">
              <Download size={14} /> Download PNG
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex relative z-10 min-h-0 overflow-hidden">
        {/* Left: Physics panel */}
        <div className={`flex-shrink-0 border-r border-white/[0.06] bg-[#09090c] flex flex-col transition-all duration-300 ${showPhysicsPanel ? 'w-72' : 'w-0 overflow-hidden border-r-0'}`}>
          {showPhysicsPanel && (
            <>
              <div className="px-3 py-2.5 border-b border-purple-500/10 bg-purple-500/[0.03] flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-300 flex items-center gap-2"><span className="text-sm">⚡</span> Physics Controls</span>
                  {selectedPhysics.length > 0 && <button onClick={() => setSelectedPhysics([])} className="text-[10px] text-gray-600 hover:text-purple-400 transition-colors px-2 py-1 rounded hover:bg-purple-500/10">Clear All</button>}
                </div>
              </div>
              <div className="px-3 py-2 border-b border-white/[0.04] bg-black/20">
                <span className="text-[9px] text-gray-500">Select physics types to apply to your aura. Multi-select enabled.</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {[
                  { label: '↑ Upward Motion', color: 'green', items: ['levitate', 'fountain', 'tornado', 'drift', 'flutter'] },
                  { label: '⚡ Original', color: 'blue', items: ['float', 'zigzag', 'orbit', 'rise', 'wander', 'spiral'] },
                  { label: '🌀 Dynamic', color: 'purple', items: ['rain', 'explode', 'swarm', 'bounce', 'pulse', 'vortex'] },
                  { label: '✨ New Physics', color: 'amber', items: ['wave', 'whirlpool', 'magnetic', 'gravity', 'hover'] },
                ].map(({ label, color, items }) => (
                  <div key={label}>
                    <div className={`text-[10px] text-${color}-400/80 uppercase tracking-wide mb-2 px-1 font-semibold`}>{label}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map(physics => (
                        <button key={physics} onClick={() => togglePhysics(physics)} className={`px-2.5 py-1.5 rounded text-[11px] font-medium transition-all ${selectedPhysics.includes(physics) ? `bg-${color}-500/25 text-${color}-300 border border-${color}-500/50 shadow-sm shadow-${color}-500/20` : `bg-white/[0.04] text-gray-500 border border-white/[0.08] hover:text-gray-300 hover:border-${color}-500/30 hover:bg-${color}-500/10`}`}>
                          {physics}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <div className="text-[10px] text-rose-400/80 uppercase tracking-wide mb-2 px-1 font-semibold">🔷 Outer Shape</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(SHAPE_PRESETS).map(([key, preset]) => (
                      <button key={key} onClick={() => setActiveShapePreset(prev => prev === key ? null : key)} className={`px-2.5 py-1.5 rounded text-[11px] font-medium transition-all flex items-center gap-1 ${activeShapePreset === key ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-sm shadow-rose-500/20' : 'bg-white/[0.04] text-gray-500 border border-white/[0.08] hover:text-gray-300 hover:border-rose-500/30 hover:bg-rose-500/10'}`}>
                        <span className="text-[10px]">{preset.icon}</span> {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-white/[0.1]">
                  <div className="flex items-center gap-2 mb-3"><Sliders size={14} className="text-cyan-400" /><span className="text-xs font-semibold text-cyan-300">Aura Controls</span></div>
                  {[
                    { label: 'Density', value: densityMultiplier, set: setDensityMultiplier },
                    { label: 'Speed', value: speedMultiplier, set: setSpeedMultiplier },
                    { label: 'Size', value: sizeMultiplier, set: setSizeMultiplier },
                  ].map(({ label, value, set }) => (
                    <div key={label} className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-medium text-gray-400">{label}</label>
                        <span className="text-[10px] text-gray-500 font-mono">{(value * 100).toFixed(0)}%</span>
                      </div>
                      <input type="range" min="0.1" max="3" step="0.1" value={value} onChange={e => set(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, rgb(34 211 238) 0%, rgb(34 211 238) ${((value - 0.1) / 2.9) * 100}%, rgba(255,255,255,0.1) ${((value - 0.1) / 2.9) * 100}%, rgba(255,255,255,0.1) 100%)` }} />
                    </div>
                  ))}
                  <button onClick={() => { setDensityMultiplier(1.0); setSpeedMultiplier(1.0); setSizeMultiplier(1.0); }} className="w-full mt-3 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-white/[0.04] text-gray-500 border border-white/[0.08] hover:text-cyan-300 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all">Reset to 100%</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Center: canvas + controls */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 min-h-0 min-w-0">
          <div className="relative w-full max-w-lg flex-1 flex items-center justify-center min-h-0">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />
            <canvas ref={outerCanvasRef} className="absolute inset-0 w-full h-full z-[15] pointer-events-none" />
            <div className="relative z-20 w-56 h-56 md:w-72 md:h-72 transition-all duration-700 ease-out">
              {avatar ? (
                <>
                  <img src={avatar} alt="Avatar" className="w-full h-full object-contain transition-all duration-700" style={{ filter: hasAura ? `drop-shadow(0 0 30px ${glowColor}) drop-shadow(0 0 60px ${glowColor}80) drop-shadow(0 8px 16px rgba(0,0,0,0.6))` : 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))' }} />
                  <canvas ref={overlayCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="absolute pointer-events-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '150%', height: '150%' }} />
                </>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} className="w-full h-full rounded-3xl border border-white/[0.06] bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/30 hover:bg-purple-500/[0.03] transition-all duration-300 group">
                  <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4 group-hover:bg-purple-500/10 transition-colors"><Camera size={32} className="text-gray-600 group-hover:text-purple-400 transition-colors" /></div>
                  <p className="text-sm font-medium text-gray-600 group-hover:text-gray-400 transition-colors">Drop your character here</p>
                  <p className="text-xs text-gray-700 mt-1">PNG, JPG, or WebP</p>
                </div>
              )}
            </div>
            <div className="absolute inset-0 pointer-events-none z-30 rounded-3xl" style={{ background: 'radial-gradient(circle, transparent 55%, rgba(0,0,0,0.4) 100%)' }} />
          </div>

          <div className="relative z-40 w-full max-w-lg mt-2 space-y-3">
            {auraName && (
              <div className="flex items-center justify-center gap-3">
                <div className="px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.2em] uppercase transition-all duration-500 flex items-center gap-2" style={{ color: glowColor, background: `${glowColor}12`, border: `1px solid ${glowColor}25`, textShadow: `0 0 20px ${glowColor}60` }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: glowColor }} />
                  {auraName}
                </div>
                <button onClick={() => { setActiveAura(AURA_TYPES.NONE); resetAuraState(); }} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/10 transition-all"><X size={12} /></button>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {[
                { type: AURA_TYPES.FIRE, icon: <Flame size={13} />, label: 'Fire', color: '#ff5500' },
                { type: AURA_TYPES.WIND, icon: <Wind size={13} />, label: 'Wind', color: '#00ffcc' },
                { type: AURA_TYPES.ELECTRIC, icon: <Zap size={13} />, label: 'Shock', color: '#aa00ff' },
                { type: AURA_TYPES.COSMIC, icon: <Sparkles size={13} />, label: 'Cosmic', color: '#6366f1' },
                { type: AURA_TYPES.SAKURA, icon: <Flower2 size={13} />, label: 'Sakura', color: '#ff9ec8' },
              ].map(({ type, icon, label, color }) => (
                <button key={type} onClick={() => { if (activeAura === type) { setActiveAura(AURA_TYPES.NONE); } else { setActiveAura(type); resetAuraState(); } }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-300 border ${activeAura === type ? 'scale-105' : 'border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/[0.12] hover:bg-white/[0.04]'}`}
                  style={activeAura === type ? { background: `${color}18`, color, borderColor: `${color}35`, boxShadow: `0 0 10px ${color}25` } : {}}>
                  {icon} {label}
                </button>
              ))}
            </div>

            {aiMessage && <p className="text-center text-xs text-gray-500 italic truncate px-4">{aiMessage}</p>}

            <div className="relative group">
              <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" style={{ background: `linear-gradient(135deg, ${hasAura ? glowColor : '#a855f7'}40, transparent)` }} />
              <div className="relative flex items-center bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm group-focus-within:border-white/[0.15] transition-all">
                <div className="pl-4 pr-2 text-gray-600"><Wand2 size={16} /></div>
                <input type="text" value={promptInput} onChange={e => setPromptInput(e.target.value)} placeholder={aiLoading ? 'Generating...' : "Describe an aura... e.g. 'super saiyan energy'"} disabled={aiLoading} className="flex-1 bg-transparent py-3.5 pr-4 text-sm text-white focus:outline-none placeholder:text-gray-600 disabled:opacity-40" onKeyDown={e => e.key === 'Enter' && generateAura()} />
                {aiLoading ? <div className="pr-4"><Loader2 size={16} className="animate-spin text-purple-400" /></div>
                  : promptInput.trim() && <button onClick={generateAura} className="mr-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.08] text-gray-300 hover:bg-white/[0.15] hover:text-white transition-all">Enter</button>}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Dev panel */}
        <div className={`flex-shrink-0 border-l border-white/[0.06] bg-[#09090c] flex flex-col transition-all duration-300 ${showDevPanel ? 'w-96' : 'w-0 overflow-hidden border-l-0'}`}>
          {showDevPanel && (
            <>
              <div className="flex items-center justify-between px-2 py-2 border-b border-amber-500/10 bg-amber-500/[0.03] flex-shrink-0">
                <div className="flex gap-1">
                  {[{ id: 'glow', label: 'Glow', color: '#ff9500' }, { id: 'particle', label: 'Particle', color: '#00d4ff' }, { id: 'outerShape', label: 'OuterShape', color: '#a855f7' }].map(tab => (
                    <button key={tab.id} onClick={() => setActivePromptTab(tab.id)} className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${activePromptTab === tab.id ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`} style={activePromptTab === tab.id ? { background: `${tab.color}20`, color: tab.color, border: `1px solid ${tab.color}40` } : {}}>{tab.label}</button>
                  ))}
                </div>
                <button onClick={() => { if (activePromptTab === 'glow') setPromptGlow(PROMPT_LAYER_GLOW); else if (activePromptTab === 'particle') setPromptParticle(PROMPT_LAYER_PARTICLE); else setPromptOuterShape(PROMPT_LAYER_OUTERSHAPE); }} className="text-[10px] text-gray-600 hover:text-amber-400 transition-colors px-2 py-1 rounded hover:bg-amber-500/10">Reset</button>
              </div>
              <div className="px-3 py-2 border-b border-white/[0.04] bg-black/20">
                <span className="text-[9px] text-gray-500">
                  {activePromptTab === 'glow' && 'Controls: glowColor, background, renderMode, density'}
                  {activePromptTab === 'particle' && 'Controls: entities array (shapes, movement, style, size, speed)'}
                  {activePromptTab === 'outerShape' && 'Controls: outerShape object (animated hollow ring)'}
                </span>
              </div>
              <textarea value={activePromptTab === 'glow' ? promptGlow : activePromptTab === 'particle' ? promptParticle : promptOuterShape} onChange={e => { if (activePromptTab === 'glow') setPromptGlow(e.target.value); else if (activePromptTab === 'particle') setPromptParticle(e.target.value); else setPromptOuterShape(e.target.value); }} className="flex-1 w-full bg-transparent px-3 py-2.5 text-[11px] font-mono text-gray-400 focus:outline-none resize-none leading-relaxed" spellCheck={false} />
              <div className="px-3 py-2 border-t border-white/[0.04] bg-black/20 flex justify-end">
                <button onClick={() => { setPromptGlow(PROMPT_LAYER_GLOW); setPromptParticle(PROMPT_LAYER_PARTICLE); setPromptOuterShape(PROMPT_LAYER_OUTERSHAPE); }} className="text-[10px] text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10">Reset All Layers</button>
              </div>
            </>
          )}
        </div>
      </main>

      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg, image/webp" className="hidden" />
    </div>
  );
}

function resolveShapeConfig(activeAura, customAuraConfig, activeShapePreset) {
  if (activeShapePreset && SHAPE_PRESETS[activeShapePreset]) {
    const config = { ...SHAPE_PRESETS[activeShapePreset].config };
    const auraColor = activeAura === AURA_TYPES.CUSTOM
      ? customAuraConfig?.glowColor
      : (activeAura !== AURA_TYPES.NONE ? AURA_COLORS[activeAura] : null);
    if (auraColor && auraColor !== 'rgba(0,0,0,0)') {
      config.baseColor = auraColor;
      config.tipColor = lightenHex(auraColor);
    }
    return config;
  }
  if (activeAura === AURA_TYPES.CUSTOM && customAuraConfig?.outerShape) {
    return { ...customAuraConfig.outerShape, nature: customAuraConfig.nature || customAuraConfig.outerShape.nature };
  }
  if (activeAura !== AURA_TYPES.NONE && OUTER_SHAPE_PRESETS[activeAura]) return OUTER_SHAPE_PRESETS[activeAura];
  return null;
}

function clearParticleCanvas(ctx, canvas, activeAura, customAuraConfig) {
  let mode = 'clear';
  if (activeAura === AURA_TYPES.CUSTOM) {
    if (customAuraConfig?.renderMode !== 'fluid') {
      const bg = customAuraConfig?.background || 'clear';
      if (bg === 'dark-fade' || bg === 'black-fade') mode = bg;
    }
  } else if (activeAura === AURA_TYPES.FIRE || activeAura === AURA_TYPES.ELECTRIC) {
    mode = 'dark-fade';
  } else if (activeAura === AURA_TYPES.COSMIC || activeAura === AURA_TYPES.SAKURA) {
    mode = 'black-fade';
  }

  if (mode === 'dark-fade') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(10, 10, 15, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (mode === 'black-fade') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
