/**
 * Shared color utility functions.
 * Consolidated from GradientBackground, MenuOverlay, TextOverlay, and App.
 */

export function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

export function hexToRgba(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},`;
}

export function hexRGB(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * Calculate perceived luminance from RGB values.
 * Used for adaptive text color over gradients.
 */
export function luminance(r, g, b) {
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

/**
 * Sample luminance from a gradient canvas at a given pixel coordinate,
 * blending against a background color.
 */
export function sampleLuminance(ctx, cx, cy, canvasW, canvasH, bg = { r: 232, g: 232, b: 238 }) {
  if (cx < 0 || cy < 0 || cx >= canvasW || cy >= canvasH) return null;
  try {
    const px = ctx.getImageData(cx, cy, 1, 1).data;
    const a = px[3] / 255;
    return luminance(
      px[0] * a + bg.r * (1 - a),
      px[1] * a + bg.g * (1 - a),
      px[2] * a + bg.b * (1 - a)
    );
  } catch {
    return null;
  }
}
