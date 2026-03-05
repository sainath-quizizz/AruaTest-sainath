export const random = (min, max) => Math.random() * (max - min) + min;

export const hexToRgb = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16) || 0,
  g: parseInt(hex.slice(3, 5), 16) || 0,
  b: parseInt(hex.slice(5, 7), 16) || 0,
});

export const lightenHex = (hex, amount = 0.4) => {
  const { r, g, b } = hexToRgb(hex);
  const lighten = (v) => Math.min(255, Math.round(v + (255 - v) * amount));
  return `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`;
};

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h, s, l) {
  h = ((h % 1) + 1) % 1;
  const hue2rgb = (p, q, t) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const toHex = (v) => Math.round(Math.min(255, Math.max(0, v * 255))).toString(16).padStart(2, '0');
  return `#${toHex(hue2rgb(p, q, h + 1/3))}${toHex(hue2rgb(p, q, h))}${toHex(hue2rgb(p, q, h - 1/3))}`;
}

/**
 * Generate a harmonious 4-color gradient palette from base and tip colors.
 * Uses analogous + complementary hue shifts with varied saturation/lightness.
 */
export function deriveGradientColors(baseHex, tipHex) {
  const base = hexToRgb(baseHex);
  const tip = hexToRgb(tipHex);
  const [bH, bS, bL] = rgbToHsl(base.r, base.g, base.b);
  const [tH, tS, tL] = rgbToHsl(tip.r, tip.g, tip.b);

  return [
    baseHex,
    hslToHex(bH + 0.08, Math.min(1, bS * 1.1), Math.min(0.7, bL + 0.1)),
    tipHex,
    hslToHex(tH - 0.08, Math.min(1, tS * 1.05), Math.min(0.75, tL + 0.05)),
  ];
}

/**
 * Ray-cast from center outward at each degree to find the furthest opaque pixel,
 * producing a 360-entry radial distance map of the character's silhouette.
 * Used to position bolts relative to the character shape.
 */
export function extractSilhouette(imageSrc, canvasW, canvasH, centerYRatio) {
  const TAU = Math.PI * 2;
  const DEGREES = 360;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const cx = canvasW / 2;
      const cy = canvasH * centerYRatio;
      const offscreen = document.createElement('canvas');
      offscreen.width = canvasW;
      offscreen.height = canvasH;
      const ctx = offscreen.getContext('2d');

      const targetH = canvasH * 0.64;
      const scale = targetH / img.naturalHeight;
      const drawW = img.naturalWidth * scale;
      ctx.drawImage(img, cx - drawW / 2, cy - targetH / 2, drawW, targetH);

      const { data: pixels } = ctx.getImageData(0, 0, canvasW, canvasH);
      const radii = new Float32Array(DEGREES);
      const maxRay = Math.max(canvasW, canvasH);

      for (let deg = 0; deg < DEGREES; deg++) {
        const angle = (deg / DEGREES) * TAU;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        let furthest = 20;

        for (let step = 1; step < maxRay; step++) {
          const px = Math.round(cx + dirX * step);
          const py = Math.round(cy + dirY * step);
          if (px < 0 || px >= canvasW || py < 0 || py >= canvasH) break;
          if (pixels[(py * canvasW + px) * 4 + 3] > 10) furthest = step;
        }
        radii[deg] = furthest;
      }

      const smoothed = new Float32Array(DEGREES);
      for (let i = 0; i < DEGREES; i++) {
        smoothed[i] =
          radii[(i - 1 + DEGREES) % DEGREES] * 0.2 +
          radii[i] * 0.6 +
          radii[(i + 1) % DEGREES] * 0.2;
      }
      resolve(smoothed);
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}
