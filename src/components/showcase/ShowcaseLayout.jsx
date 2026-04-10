import { SHOWCASE_PROJECTS } from "./ShowcaseProjects";

export const FONT_URL =
  "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.1/files/inter-latin-300-normal.woff";

export const state = { top: 0, section: 0, totalSections: 0, hoveredPanel: -1 };

export const L = {
  sectionH: 14,
  heroH: 8,
  img: {
    halfWidth: 0.46,
    gap: 0.15,
    aspect: 0.65,
    centerX: 0.25,
    offsetY: 0.12,
  },
  text: {
    centerX: 0.25,
    maxWidth: 0.44,
    number: { y: -0.06, size: 0.12, spacing: 0.2, color: "#bbbbbb" },
    tag: { y: -0.11, size: 0.08, spacing: 0.25, color: "#aaaaaa" },
    title: { y: -0.2, size: 0.7, spacing: -0.03, color: "#1a1a2e", lineH: 1.1 },
    body: { y: -0.34, size: 0.2, spacing: 0, color: "#888888", lineH: 1.8 },
  },
  backdrop: {
    centerX: 0.25,
    width: 0.5,
    height: 0.85,
    z: -2,
    opacity: 0.18,
    fadeSpeed: 0.04,
    visRange: 4,
  },
  cube: {
    size: 0.6,
    centerX: 0,
    z: 1,
    fadeSpeed: 0.08,
    hiddenPause: 0.1,
    push: {
      radius: 14,
      strength: 6,
      response: 0.1,
      decayActive: 0.95,
      decayIdle: 0.92,
    },
  },
  anim: {
    cameraLerp: 0.045,
    textFade: 0.03,
    textDrift: 2.0,
    textStagger: 0.2,
    textVisRange: 4,
    imgFade: 0.03,
    imgScale: 0.025,
    imgScaleFrom: 0.92,
    wheelDebounce: 1000,
  },
  perspective: {
    imgRotY: 0.03,
    textRotY: 0.015,
  },
  hero: {
    titleSize: 0.12,
    titleColor: "#1a1a2e",
  },
  // ── Postprocessing ──
  post: {
    aoRadius: 0.5,
    aoIntensity: 0.6,
    dofFocusRange: 0.15,
    dofBokehScale: 6,
  },
  // ── Lighting ──
  light: {
    ambientIntensity: 0.4,
    dirIntensity: 1,
    dirX: -10,
    dirY: 10,
    dirZ: 5,
    env1Intensity: 4,
    env2Intensity: 3,
    env3Intensity: 3,
  },
  // ── Glass card ──
  card: {
    bgOpacity: 0.28,
    borderOpacity: 0.15,
    bgFadeSpeed: 0.04,
  },
  // ── Settle physics ──
  physics: {
    pushRadius: 2.5,
    pushStrength: 18,
    gravity: -9.81,
    cubeMass: 5,
    linearDamping: 4,
    angularDamping: 3,
    floorFriction: 1.5,
    cubeFriction: 1.2,
    restitution: 0.15,
  },
  // ── Glass material ──
  glass: {
    thickness: 2.5,
    backsideThickness: 4,
    roughness: 0.02,
    ior: 1.5,
    chromaticAberration: 0.05,
    anisotropicBlur: 0.4,
    samples: 4,
    resolution: 128,
  },
};

export function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export const N = SHOWCASE_PROJECTS.length;
export const SECTION_H = L.sectionH;
export const HERO_H = L.heroH;
export const SETTLE_START = HERO_H + N * SECTION_H;
export const TOTAL_H = SETTLE_START + 8;

export function getSectionY(idx) {
  if (idx <= 0) return 0;
  if (idx <= N) return HERO_H + (idx - 1) * SECTION_H;
  return SETTLE_START;
}

export const TOTAL_SECTIONS = N + 2;
state.totalSections = TOTAL_SECTIONS;
