export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 560;
export const AVATAR_SIZE = 288;

export const CENTER_Y_RATIO = 0.55;
export const FEET_Y_RATIO = 0.58;

export const TAU = Math.PI * 2;
export const MAX_FLAME_POINTS = 48;
export const LUT_SIZE = 360;

export const AURA_TYPES = {
  NONE: 'none',
  FIRE: 'fire',
  WIND: 'wind',
  ELECTRIC: 'electric',
  COSMIC: 'cosmic',
  SAKURA: 'sakura',
  CUSTOM: 'custom',
};

export const AURA_COLORS = {
  [AURA_TYPES.NONE]: 'rgba(0,0,0,0)',
  [AURA_TYPES.FIRE]: '#ff5500',
  [AURA_TYPES.WIND]: '#00ffcc',
  [AURA_TYPES.ELECTRIC]: '#aa00ff',
  [AURA_TYPES.COSMIC]: '#6366f1',
  [AURA_TYPES.SAKURA]: '#ff9ec8',
  [AURA_TYPES.CUSTOM]: '#ffffff',
};

export const PRESET_LABELS = {
  [AURA_TYPES.FIRE]: 'Fire',
  [AURA_TYPES.WIND]: 'Wind',
  [AURA_TYPES.ELECTRIC]: 'Shock',
  [AURA_TYPES.COSMIC]: 'Cosmic',
  [AURA_TYPES.SAKURA]: 'Sakura',
};

export const OUTER_SHAPE_PRESETS = {
  [AURA_TYPES.FIRE]: {
    baseColor: '#FF4500', tipColor: '#FFD700',
    speed: 1.2, jaggedness: 0.7, smoothness: 0.25, height: 1.2, thickness: 0.7,
    dualLayer: false, intensity: 1.1, contourStyle: 'flame', nature: 'aggressive', overlay: 'none',
  },
  [AURA_TYPES.WIND]: {
    baseColor: '#22D3EE', tipColor: '#A5F3FC',
    speed: 0.8, jaggedness: 0.35, smoothness: 0.7, height: 0.8, thickness: 0.7,
    dualLayer: false, intensity: 0.85, nature: 'calm', overlay: 'streaks',
  },
  [AURA_TYPES.ELECTRIC]: {
    baseColor: '#FFD700', tipColor: '#FFFFFF',
    speed: 1.5, jaggedness: 0.9, smoothness: 0.1, height: 1.1, thickness: 0.6,
    dualLayer: false, intensity: 1.3, nature: 'aggressive', overlay: 'bolts',
  },
  [AURA_TYPES.COSMIC]: {
    baseColor: '#8B00FF', tipColor: '#FF00FF',
    speed: 1.0, jaggedness: 0.8, smoothness: 0.15, height: 1.3, thickness: 0.8,
    dualLayer: true, dualColor: '#1A0030', intensity: 1.2, nature: 'aggressive', overlay: 'none',
  },
  [AURA_TYPES.SAKURA]: {
    baseColor: '#FB7185', tipColor: '#FECDD3',
    speed: 0.6, jaggedness: 0.3, smoothness: 0.8, height: 0.7, thickness: 0.6,
    dualLayer: false, intensity: 0.8, nature: 'calm', overlay: 'streaks',
  },
};

export const SHAPE_PRESETS = {
  flame: {
    name: 'Flame',
    icon: '🔥',
    config: {
      baseColor: '#FFD700',
      tipColor: '#FF8C00',
      speed: 1.4,
      jaggedness: 0.7,
      smoothness: 0.25,
      height: 1.2,
      thickness: 0.7,
      dualLayer: false,
      intensity: 1.1,
      contourStyle: 'flame',
    },
  },
  shadow: {
    name: 'Shadow',
    icon: '👤',
    config: {
      baseColor: '#6366F1',
      tipColor: '#3B82F6',
      speed: 0.9,
      jaggedness: 0.8,
      smoothness: 0.15,
      height: 1.3,
      thickness: 0.8,
      dualLayer: true,
      dualColor: '#1A0030',
      intensity: 1.2,
    },
  },
  blaze: {
    name: 'Blaze',
    icon: '🔷',
    config: {
      baseColor: '#60A5FA',
      tipColor: '#38BDF8',
      speed: 1.3,
      jaggedness: 0.6,
      smoothness: 0.3,
      height: 1.1,
      thickness: 0.65,
      dualLayer: false,
      intensity: 1.0,
    },
  },
  burst: {
    name: 'Burst',
    icon: '💥',
    config: {
      baseColor: '#EF4444',
      tipColor: '#F97316',
      speed: 1.6,
      jaggedness: 0.9,
      smoothness: 0.1,
      height: 1.0,
      thickness: 0.6,
      dualLayer: false,
      intensity: 1.3,
    },
  },
};

export const PARTICLE_COUNTS = {
  [AURA_TYPES.FIRE]: 140,
  [AURA_TYPES.WIND]: 105,
  [AURA_TYPES.ELECTRIC]: 8,
  [AURA_TYPES.COSMIC]: 70,
  [AURA_TYPES.SAKURA]: 56,
};
