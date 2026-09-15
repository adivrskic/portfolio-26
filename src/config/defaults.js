import { BG_HEX } from "../constants/style";

// Season-based gradient theme
const SEASON_COLORS = {
  spring: ["#1a4a2e", "#e8a0bf", "#3d9e5c", "#d4f0c6"],
  summer: ["#f5a623", "#1a8fe0", "#ff6b35", "#08b4a8"],
  fall: ["#8b2500", "#d85a30", "#f5a623", "#4a1b0c"],
  winter: ["#2c3e6b", "#a0c4e8", "#4a6fa5", "#d0e8f5"],
};
export function getCurrentSeason() {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "fall";
  return "winter";
}
const _sc = SEASON_COLORS[getCurrentSeason()];

export const DEFAULTS = {
  // ── Blob (see components/scene/Scene.jsx + shaders/blob.glsl.js) ──
  blobRadius: 1.45, // world units at rest
  blobNoiseFreq: 1.1, // lumps across the surface
  blobNoiseAmp: 0.14, // lump height, fraction of radius
  blobNoiseSpeed: 0.28, // how fast the resting shape drifts
  blobIor: 1.32, // refraction strength for the background
  blobFaceIor: 1.12, // gentler index for the face so it swims, not scatters
  blobDispersion: 0.06, // chromatic split, grows with jiggle
  blobRefract: 0.09, // background offset per unit of refracted normal
  blobShimmer: 0.85, // theme-palette iridescence at grazing angles
  blobGlint: 0.35, // flickering surface sparkles (off on low-power)
  blobRim: 0.5, // bright silhouette rim
  blobEdgeDark: 0.28, // darkening just inside the silhouette
  blobOpacity: 0.96,
  blobFaceScale: 1.25, // face plane width, in radii
  blobFaceBlur: 0.4, // mip bias at rest
  blobFaceBlurJiggle: 4, // extra mip bias at full jiggle
  blobFaceFadeJiggle: 0.55, // face visibility lost at full jiggle
  blobSpinX: 0.62, // idle drift spin
  blobSpinY: 0.36,
  // Surface waves (a wave equation solved on the blob, see scene/waveSim.js)
  blobWaveSpeed: 2.6, // how fast rings travel, radians of surface per second
  blobWaveDamping: 1.2, // how quickly they die away (1/s)
  blobWaveTension: 2, // pull back toward the resting shape (1/s²)
  blobWaveImpulse: 1.4, // how hard a press hits the surface
  blobWaveAmbient: 0.35, // idle raindrop ripples; 0 for a still surface
  blobWaveGain: 1, // display scale of the simulated height
  // Presses poke the blob; a tap also opens chat and a hold (holdDuration)
  // opens the showcase. Set false to make presses purely physical — the
  // menu links to both either way, and the hint copy follows these flags.
  blobTapOpensChat: true,
  blobHoldOpensShowcase: true,
  // ── Floor shadow ──
  floorY: -2.05,
  shadowOpacity: 0.14,
  shadowSoftness: 22, // VSM blur radius in shadow-map texels
  totalScrollRange: 130,
  scrollSpeed: 1,
  bgColor: BG_HEX,
  textColor: "#1a1a2e",
  textColorLight: "#ffffff",
  textOpacity: 0.7,
  fontSize: 1.1,
  fontWeight: 100,
  letterSpacing: 0.4,
  textBottom: 13,
  emergeDuration: 0.7,
  letterStagger: 0.08,
  textRevealDelay: 0.3,
  textTravelDist: 10,
  menuBtnDelay: 1.3,
  birthDuration: 2,
  birthFloatDist: 100,
  birthSpinSpeed: 2.95,
  birthFadeSpeed: 2,
  birthTextAt: 0.96,
  birthFlyInDist: 45,
  birthFlyInCurve: 8.8,
  birthArcHeight: -15,
  birthStartX: 0,
  birthStartY: -20,
  birthEndX: 0,
  birthEndY: 0,
  birthScaleStart: 4.7,
  birthSpinMult: 0.15,
  birthTiltAmp: 0.125,
  birthTiltSpeed: 1.7,
  birthSpinBurstX: 8,
  birthSpinBurstY: 0,
  birthSpinBurstZ: 0,
  birthUseBezier: 0,
  birthBezierX1: 0.16,
  birthBezierY1: 1,
  birthBezierX2: 0.3,
  birthBezierY2: 1,
  revealRadius: 420,
  revealIntensity: 1.95,
  brushFade: 0.006,
  brushSizeMult: 0.4,
  brushOpacityMult: 0.15,
  brushSpacing: 10,
  brushSmoothing: 0.12,
  brushMaskExpand: 1.001,
  bristleCount: 18,
  bristleAngleSpread: 0,
  bristleDistMin: 0.15,
  bristleDistMax: 0.6,
  bristleSizeMin: 0.25,
  bristleSizeMax: 0.7,
  bristleOpacityMin: 0.4,
  bristleOpacityMax: 1,
  brushCoreSize: 0.76,
  brushCoreOpacity: 0.6,
  brushCoreFalloff: 0.01,
  blobCount: 10,
  blobSizeMin: 0.34,
  blobSizeMax: 1.06,
  blobAlphaMin: 0.17,
  blobAlphaMax: 0.93,
  gradSpeed: 2.6,
  gradScale: 3.5,
  gradColor1: _sc[0],
  gradColor2: _sc[1],
  gradColor3: _sc[2],
  gradColor4: _sc[3],
  shatterSpeed: 2,
  shatterSpread: 1,
  shatterFade: 2.5,
  shatterOpacity: 0.35,
  shatterColor: "#d0d4e8",
  shatterDuration: 0.12,
  shatterGravity: 4,
  shatterFadeSpeed: 3,
  explodeDuration: 6,
  explodeCap: 1.2,
  shardSegments: 1,
  shardRotSpeed: 0,
  progressSpinSpeed: 0.2,
  shatterThreshold: 0.15,
  convergenceRange: 0.5,
  convergenceSharpness: 0.23,
  helixRotationMult: 1,
  streamSpeed: 3.1,
  spiralStrength: 0.3,
  dissipateStart: 0.7,
  helixCount: 120000,
  helixLength: 66,
  helixRadius: 2.8,
  helixTurns: 10,
  helixSpread: 0.2,
  helixStartRadius: 0.8,
  helixSizeMin: 0.15,
  helixSizeMax: 0.45,
  helixPointSize: 0.4,
  helixOpacity: 0.7,
  menuBlur: 30,
  menuBgOpacity: 0.2,
  menuTextColor: "#1a1a2e",
  menuInputColor: BG_HEX,
  reticleRange: 1.2,
  reticleMinR: 16,
  reticleMaxR: 50,
  reticleCrossSize: 10,
  reticleOpacity: 0.55,
  reticleSmoothing: 0.08,
  chatStiffness: 4.6,
  chatDamping: 5.7,
  chatReturnStiffness: 5.3,
  chatReturnDamping: 6.9,
  chatArcStiffness: 2.7,
  chatArcDamping: 1.3,
  chatArcKickZ: -5,
  chatArcKickX: -3,
  chatSpinKick: 3.9,
  chatSpinDecay: 2.5,
  pillOffsetX: 280,
  pillOffsetY: 200,
  pillLineColor: "rgba(18,18,40,0.45)",
  pillLineWidth: 0.8,
  glitterCount: 200,
  glitterSizeMin: 0.35,
  glitterSizeMax: 1.7,
  glitterLifetimeMin: 4,
  glitterLifetimeMax: 10,
  glitterDriftMin: 18,
  glitterDriftMax: 120,
  glitterSpread: 105,
  glitterSpawnRate: 12,
  glitterIdleRate: 2,
  glitterFadeExp: 0.6,
  // Timestamp seed used to trigger birth animation replays (change to replay)
  birthReplay: 1775786365506,
  birthEasing: 4.2,

  // ── Smiley face ──
  smileyScale: 0.75,
  smileyOpacity: 0.6,

  // ── Sleep mode ──
  sleepIdleTime: 15,
  sleepRampTime: 3,

  // ── Press and hold: a release before this is a tap, after it the hold
  // fires (showcase when blobHoldOpensShowcase is on) ──
  holdDuration: 600,

  // ── Showcase zoom ──
  showcaseZoomSpeed: 0.5,
  showcaseOpenDelay: 3200,

  // ── Angular velocity ──
  angularDrag: 0.75,
  angularClamp: 8,
  dizzyThreshold: 1.5,

  // ── UI constants ──
  panelBorderRadius: 120,
  panelPadding: 70,
  panelPaddingMobile: 16,
  panelBlur: 50,
};
