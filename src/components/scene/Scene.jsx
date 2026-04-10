import { useEffect, useRef } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  CanvasTexture,
  Clock,
  Color,
  EdgesGeometry,
  FrontSide,
  HalfFloatType,
  IcosahedronGeometry,
  LinearFilter,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  Plane,
  Quaternion,
  Raycaster,
  Scene as THREEScene,
  ShaderMaterial,
  Sphere,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { getCurrentSeason } from "../../config/defaults";
import { easeOutSoft } from "../../utils/math";
import { sphereVertexShader } from "./shaders/sphereVertex.glsl.js";
import { sphereFragmentShader } from "./shaders/sphereFragment.glsl.js";
import {
  glassVertexShader,
  glassFragmentShader,
} from "./shaders/glass.glsl.js";

// Shaders imported from ./shaders/ — see sphereVertexShader, sphereFragmentShader, etc.
const FV = sphereVertexShader;
const FF = sphereFragmentShader;

// Cubic-bezier easing — attempt Newton's method, fall back to bisection
function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const sampleDx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return function (x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) break;
      const d = sampleDx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    t = Math.max(0, Math.min(1, t));
    return sampleY(t);
  };
}

export default function Scene({
  configRef,
  onBirthProgress,
  gradientCanvas,
  menuOpen,
  chatMode,
  showcaseTransition,
  showcaseOpen,
  activeSeason,
  onCubeClick,
  onCubeHold,
  onCubeProximity,
}) {
  const containerRef = useRef(null);
  const gradCanvasRef = useRef(null);
  gradCanvasRef.current = gradientCanvas;
  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen || false;
  const chatModeRef = useRef(false);
  chatModeRef.current = chatMode || false;
  const showcaseTransRef = useRef(false);
  showcaseTransRef.current = showcaseTransition || false;
  const showcaseOpenRef = useRef(false);
  showcaseOpenRef.current = showcaseOpen || false;
  const activeSeasonRef = useRef(activeSeason || getCurrentSeason());
  activeSeasonRef.current = activeSeason || getCurrentSeason();
  const onCubeClickRef = useRef(onCubeClick);
  onCubeClickRef.current = onCubeClick;
  const onCubeHoldRef = useRef(onCubeHold);
  onCubeHoldRef.current = onCubeHold;
  const onCubeProximityRef = useRef(onCubeProximity);
  onCubeProximityRef.current = onCubeProximity;
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cfg = configRef,
      W = () => window.innerWidth,
      H = () => window.innerHeight;
    const isMobile = "ontouchstart" in window || window.innerWidth < 768;
    const renderer = new WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)
    );
    renderer.setSize(W(), H());
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    const scene = new THREEScene();
    const camera = new PerspectiveCamera(50, W() / H(), 0.1, 200);
    camera.position.set(0, 0, 8);

    // ── Mesh ──
    const sphereGeo = new IcosahedronGeometry(1, 64);
    const fU = {
      uTime: { value: 0 },
      uNoiseFreq: { value: 0.2 },
      uNoiseAmp: { value: 0 },
      uNoiseSpeed: { value: 0 },
      uNoiseOctaves: { value: 2 },
      uNoiseLac: { value: 4 },
      uNoisePers: { value: 0.9 },
      uSpikeSharp: { value: 4 },
      uNoiseWarp: { value: 0 },
      uMouseWorld: { value: new Vector3(0, 0, 3) },
      uMouseStrength: { value: 0 },
      uMouseRadius: { value: 2 },
      uMouseFalloff: { value: 1.2 },
      uMouseNoiseBoost: { value: 0.4 },
      uMouseNoiseFreq: { value: 2.6 },
      uMouseAttract: { value: -2 },
      uBaseBrightStart: { value: 0.92 },
      uBaseBrightEnd: { value: 0.04 },
      uRoughness: { value: 0.01 },
      uMetallic: { value: 2 },
      uSpecularIntensity: { value: 4 },
      uFresnelPower: { value: 8.6 },
      uFresnelIntensity: { value: 0.15 },
      uIridescence: { value: 0.1 },
      uEnvReflect: { value: 2 },
      uEnvBrightness: { value: 3 },
      uAoStrength: { value: 0 },
      uAoRange: { value: 0.99 },
      uRimStrength: { value: 0 },
      uRimColor: { value: new Color(0x1a2a4a) },
      uAmbientIntensity: { value: 0 },
      uLight1Pos: { value: new Vector3(3, 4, 5) },
      uLight1Int: { value: 1.2 },
      uLight2Pos: { value: new Vector3(-3, -1, 3) },
      uLight2Int: { value: 3 },
      uLight3Pos: { value: new Vector3(-0.2, -8, 0) },
      uLight3Int: { value: 3 },
      uScrollProgress: { value: 0 },
      uWaveformMix: { value: 0 },
      uWaveTime: { value: 0 },
      uShape: { value: 0 },
      uMeshAlpha: { value: 1 },
      uBounds: { value: 3.0 },
      uTetraScale: { value: 1 },
      uCubeScale: { value: 1 },
      uShapeTiltX: { value: 0 },
      uShapeTiltY: { value: 0 },
      uGC1: { value: new Color("#1a0a3e") },
      uGC2: { value: new Color("#d41878") },
      uGC3: { value: new Color("#08b4a8") },
      uGC4: { value: new Color("#f5a623") },
    };
    const sphere = new Mesh(
      sphereGeo,
      new ShaderMaterial({
        vertexShader: FV,
        fragmentShader: FF,
        uniforms: fU,
        transparent: true,
        depthWrite: true,
      })
    );
    sphere.renderOrder = 0;
    scene.add(sphere);

    // ── Glass cube (two-pass refraction — proven approach) ──
    const sceneRT = new WebGLRenderTarget(W(), H(), {
      type: HalfFloatType,
    });
    let bgTex = null;
    const glassUniforms = {
      uSceneTex: { value: null },
      uBgTex: { value: null },
      uRes: { value: new Vector2(W(), H()) },
      uRefract: { value: 0.15 },
      uBlur: { value: 2.9 },
      uEdgeAlpha: { value: 1.0 },
      uFresnelPow: { value: 0.5 },
      uSpecular: { value: 4.0 },
      uSpecPower: { value: 120.0 },
      uIridescence: { value: 0.0 },
      uOpacity: { value: 0.92 },
      uTint: { value: new Vector3(0.9, 0.92, 1.0) },
    };
    const glassGeo = new RoundedBoxGeometry(1, 1, 1, 4, 0.08);
    const glassMat = new ShaderMaterial({
      uniforms: glassUniforms,
      vertexShader: glassVertexShader,
      fragmentShader: glassFragmentShader,
      transparent: true,
      depthWrite: false,
      side: FrontSide,
    });
    const glassCube = new Mesh(glassGeo, glassMat);
    glassCube.renderOrder = 10;
    scene.add(glassCube);

    const glassEdgeGeo = new EdgesGeometry(glassGeo);
    const glassEdgeMat = new LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
    });
    const glassEdges = new LineSegments(glassEdgeGeo, glassEdgeMat);
    glassEdges.renderOrder = 11;
    glassCube.add(glassEdges);

    // ── Glowing smiley / audio wave inside the cube ──
    const smileyCanvas = document.createElement("canvas");
    smileyCanvas.width = 256;
    smileyCanvas.height = 256;
    const sCtx = smileyCanvas.getContext("2d");
    const smCx = 128,
      smCy = 128;
    let dizzySmooth = 0;
    let chatMorph = 0; // 0 = smiley, 1 = wave
    let sleepSmooth = 0; // 0 = awake, 1 = sleeping
    let happySmooth = 0; // 0 = normal, 1 = happy (after chat closes)
    let prevChatMode = false;
    let blinkTimer = 0; // countdown to next blink
    let blinkAmount = 0; // 0 = open, 1 = closed
    let nextBlink = 2 + Math.random() * 4; // seconds until next blink
    let prevMx = 0,
      prevMy = 0;
    let glitchTimer = 0;
    let glitchOffset = 0;
    let glitchSlice = -1;

    // Gold theme sparkles
    const SPARKLE_COUNT = 24;
    const sparkles = Array.from({ length: SPARKLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
      size: 0.8 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 2,
      driftX: (Math.random() - 0.5) * 0.3,
      driftY: -0.1 - Math.random() * 0.3,
      tone: Math.floor(Math.random() * 4),
    }));
    const GOLD_TONES = [
      [255, 215, 0],
      [255, 200, 80],
      [218, 165, 32],
      [255, 240, 160],
    ];

    function drawGoldSparkles(time, colors) {
      const isGold = (colors?.[0] || "").toLowerCase() === "#b8860b";
      if (!isGold) return;
      for (let si = 0; si < SPARKLE_COUNT; si++) {
        const sp = sparkles[si];
        const twinkle = Math.sin(time * sp.speed + sp.phase) * 0.5 + 0.5;
        const sparkAlpha = twinkle * twinkle * 0.8;
        if (sparkAlpha < 0.05) continue;
        const sx = smCx + ((sp.x + sp.driftX * time * 30) % 180) - 90;
        const sy = smCy + ((sp.y + sp.driftY * time * 30 + 200) % 200) - 100;
        const tone = GOLD_TONES[sp.tone];
        sCtx.save();
        sCtx.globalAlpha = sparkAlpha;
        sCtx.fillStyle = `rgb(${tone[0]},${tone[1]},${tone[2]})`;
        sCtx.shadowColor = `rgba(${tone[0]},${tone[1]},${tone[2]},0.6)`;
        sCtx.shadowBlur = 4 + twinkle * 4;
        const sz = sp.size * (0.6 + twinkle * 0.4);
        const rot = time * 0.5 + sp.phase;
        sCtx.translate(sx, sy);
        sCtx.rotate(rot);
        sCtx.beginPath();
        for (let p = 0; p < 4; p++) {
          const a = (p / 4) * Math.PI * 2;
          const a2 = a + Math.PI / 4;
          sCtx.lineTo(Math.cos(a) * sz * 2.5, Math.sin(a) * sz * 2.5);
          sCtx.lineTo(Math.cos(a2) * sz * 0.6, Math.sin(a2) * sz * 0.6);
        }
        sCtx.closePath();
        sCtx.fill();
        sCtx.shadowBlur = 0;
        sCtx.restore();
      }
    }

    function hexRgb(hex) {
      if (!hex || typeof hex !== "string") return { r: 180, g: 200, b: 255 };
      const h = hex.replace("#", "");
      return {
        r: parseInt(h.substring(0, 2), 16) || 180,
        g: parseInt(h.substring(2, 4), 16) || 200,
        b: parseInt(h.substring(4, 6), 16) || 255,
      };
    }

    // ── Draw smiley face ──
    function drawFaceLayer(
      dizzy,
      time,
      lookX,
      lookY,
      alpha,
      surprise,
      sleep,
      colors,
      happy,
      blink
    ) {
      const lx = (lookX || 0) * 12;
      const ly = (lookY || 0) * -8;
      const sp = surprise || 0;
      const sl = sleep || 0;
      const hp = happy || 0;
      const bl = blink || 0;
      const fx = smCx + lx;
      const fy = smCy + ly;
      const eyeL = { x: fx - 30, y: fy - 18 - sp * 4 };
      const eyeR = { x: fx + 30, y: fy - 18 - sp * 4 };

      // Theme colors for face
      const fc = hexRgb(colors?.[0]); // primary — darkest
      const fc2 = hexRgb(colors?.[1]); // secondary
      const faceColor = (a) => `rgba(${fc.r},${fc.g},${fc.b},${a})`;
      const face2Color = (a) => `rgba(${fc2.r},${fc2.g},${fc2.b},${a})`;

      sCtx.save();
      sCtx.globalAlpha = alpha;

      // Glow — theme tinted
      const glow = sCtx.createRadialGradient(
        smCx + lx * 0.3,
        smCy + ly * 0.3,
        20,
        smCx,
        smCy,
        110
      );
      glow.addColorStop(0, faceColor(0.18));
      glow.addColorStop(0.5, face2Color(0.06));
      glow.addColorStop(1, faceColor(0));
      sCtx.fillStyle = glow;
      sCtx.fillRect(0, 0, 256, 256);

      // ── Floating zzz when sleepy ──
      if (sl > 0.3) {
        const zBase = time * 0.6;
        for (let zi = 0; zi < 3; zi++) {
          const zOff = (zBase + zi * 1.2) % 3.6;
          const zx = fx + 38 + zi * 8;
          const zy = fy - 20 - zOff * 18;
          const za = Math.max(0, 1 - zOff / 3.6) * sl * 0.55;
          const zScale = 10 + zi * 3;
          sCtx.save();
          sCtx.globalAlpha = za;
          sCtx.font = `bold ${zScale}px Inter, sans-serif`;
          sCtx.fillStyle = face2Color(1);
          sCtx.fillText("z", zx, zy);
          sCtx.restore();
        }
      }

      function drawFace(ox, oy, tint, a2) {
        sCtx.save();
        sCtx.globalAlpha = a2;

        const eyeR_size = 8 + sp * 4;

        if (hp > 0.3) {
          // Happy eyes — ^_^ upward arcs
          sCtx.strokeStyle = tint;
          sCtx.lineWidth = 3;
          sCtx.lineCap = "round";
          [eyeL, eyeR].forEach((eye) => {
            sCtx.beginPath();
            sCtx.arc(
              eye.x + ox,
              eye.y + oy + 2,
              8,
              1.15 * Math.PI,
              1.85 * Math.PI
            );
            sCtx.stroke();
          });
        } else if (sl > 0.3) {
          // Sleepy eyes — closed downward arcs
          sCtx.strokeStyle = tint;
          sCtx.lineWidth = 3;
          sCtx.lineCap = "round";
          [eyeL, eyeR].forEach((eye) => {
            sCtx.beginPath();
            sCtx.arc(
              eye.x + ox,
              eye.y + oy + 2,
              7,
              0.15 * Math.PI,
              0.85 * Math.PI
            );
            sCtx.stroke();
          });
        } else if (sp > 0.3) {
          // Surprised eyes — open rings
          sCtx.strokeStyle = tint;
          sCtx.lineWidth = 2.5 + sp;
          sCtx.beginPath();
          sCtx.arc(eyeL.x + ox, eyeL.y + oy, eyeR_size, 0, Math.PI * 2);
          sCtx.stroke();
          sCtx.beginPath();
          sCtx.arc(eyeR.x + ox, eyeR.y + oy, eyeR_size, 0, Math.PI * 2);
          sCtx.stroke();
          sCtx.fillStyle = tint;
          sCtx.beginPath();
          sCtx.arc(eyeL.x + ox, eyeL.y + oy, 2.5, 0, Math.PI * 2);
          sCtx.fill();
          sCtx.beginPath();
          sCtx.arc(eyeR.x + ox, eyeR.y + oy, 2.5, 0, Math.PI * 2);
          sCtx.fill();
        } else if (bl > 0.3) {
          // Blinking — short horizontal lines
          sCtx.strokeStyle = tint;
          sCtx.lineWidth = 3;
          sCtx.lineCap = "round";
          [eyeL, eyeR].forEach((eye) => {
            sCtx.beginPath();
            sCtx.moveTo(eye.x + ox - 7, eye.y + oy);
            sCtx.lineTo(eye.x + ox + 7, eye.y + oy);
            sCtx.stroke();
          });
        } else if (dizzy < 0.15) {
          // Normal eyes
          sCtx.fillStyle = tint;
          sCtx.beginPath();
          sCtx.arc(eyeL.x + ox, eyeL.y + oy, eyeR_size, 0, Math.PI * 2);
          sCtx.fill();
          sCtx.beginPath();
          sCtx.arc(eyeR.x + ox, eyeR.y + oy, eyeR_size, 0, Math.PI * 2);
          sCtx.fill();
        } else {
          sCtx.strokeStyle = tint;
          sCtx.lineWidth = 2.5;
          sCtx.lineCap = "round";
          [eyeL, eyeR].forEach((eye, ei) => {
            const spin = time * (3 + dizzy * 4) + ei * Math.PI;
            const spiralR = 5 + dizzy * 6;
            sCtx.beginPath();
            for (let a = 0; a < Math.PI * 4; a += 0.15) {
              if (dizzy > 0.5 && Math.random() < 0.03) continue;
              const r = (a / (Math.PI * 4)) * spiralR;
              sCtx.lineTo(
                eye.x + ox + Math.cos(a + spin) * r,
                eye.y + oy + Math.sin(a + spin) * r
              );
            }
            sCtx.stroke();
          });
        }
        // Mouth
        sCtx.strokeStyle = tint;
        sCtx.lineCap = "round";
        sCtx.beginPath();
        if (hp > 0.3) {
          // Happy mouth — wide cheerful smile
          sCtx.lineWidth = 4;
          sCtx.arc(fx + ox, fy - 6 + oy, 32, 0.25 * Math.PI, 0.75 * Math.PI);
        } else if (sl > 0.3) {
          // Sleepy mouth — small flat line, slightly droopy
          sCtx.lineWidth = 3;
          sCtx.moveTo(fx + ox - 12, fy + 8 + oy);
          sCtx.quadraticCurveTo(
            fx + ox,
            fy + 12 + oy,
            fx + ox + 12,
            fy + 8 + oy
          );
        } else if (sp > 0.3) {
          // Surprised O mouth
          sCtx.lineWidth = 3;
          const oSize = 10 + sp * 8;
          sCtx.arc(fx + ox, fy + 12 + oy, oSize, 0, Math.PI * 2);
        } else if (dizzy < 0.3) {
          sCtx.lineWidth = 5;
          sCtx.arc(fx + ox, fy - 2 + oy, 38, 0.2 * Math.PI, 0.8 * Math.PI);
        } else {
          const wobble = dizzy * 6;
          for (let i = 0; i <= 20; i++) {
            const t2 = i / 20;
            const angle = 0.2 * Math.PI + t2 * 0.6 * Math.PI;
            const wx = fx + ox + Math.cos(angle) * 38;
            const wy =
              fy -
              2 +
              oy +
              Math.sin(angle) * 38 +
              Math.sin(t2 * Math.PI * 3 + time * 5) * wobble;
            if (i === 0) sCtx.moveTo(wx, wy);
            else sCtx.lineTo(wx, wy);
          }
        }
        sCtx.stroke();
        sCtx.restore();
      }

      // Glitch triggers
      glitchTimer -= 1;
      if (glitchTimer <= 0) {
        glitchTimer =
          dizzy > 0.3
            ? Math.floor(2 + Math.random() * 4)
            : Math.floor(8 + Math.random() * 20);
        glitchOffset = (Math.random() - 0.5) * (6 + dizzy * 20);
        glitchSlice =
          Math.random() < 0.15 + dizzy * 0.4
            ? Math.floor(Math.random() * 200 + 28)
            : -1;
      }

      const glitchAmt = dizzy * 0.4 + (Math.abs(glitchOffset) > 4 ? 0.3 : 0);
      if (glitchAmt > 0.1) {
        const split = 2 + glitchAmt * 5;
        sCtx.globalCompositeOperation = "lighter";
        drawFace(-split, 0, face2Color(glitchAmt * 0.5), glitchAmt * 0.5);
        drawFace(split, 0, faceColor(glitchAmt * 0.5), glitchAmt * 0.5);
        sCtx.globalCompositeOperation = "source-over";
      }
      drawFace(0, 0, faceColor(0.9), 0.75 + dizzy * 0.15);

      if (glitchSlice > 0 && Math.abs(glitchOffset) > 2) {
        const sliceH = 8 + Math.random() * 16;
        const imgData = sCtx.getImageData(0, glitchSlice, 256, sliceH);
        sCtx.clearRect(0, glitchSlice, 256, sliceH);
        sCtx.putImageData(imgData, glitchOffset, glitchSlice);
      }
      sCtx.fillStyle = "rgba(0,0,0,0.04)";
      for (let y = 0; y < 256; y += 4) sCtx.fillRect(0, y, 256, 1);
      if (Math.random() < dizzy * 0.08) {
        sCtx.fillStyle = faceColor(0.03 + Math.random() * 0.06);
        sCtx.fillRect(0, 0, 256, 256);
      }

      // ── Gold sparkles ──
      drawGoldSparkles(time, colors);

      sCtx.restore();
    }

    // ── Draw audio wave visualizer ──
    const BAR_COUNT = 10;
    const barPhases = Array.from(
      { length: BAR_COUNT },
      () => Math.random() * Math.PI * 2
    );
    const barSpeeds = Array.from(
      { length: BAR_COUNT },
      () => 1.2 + Math.random() * 1.8
    );

    function drawWaveLayer(time, alpha, colors) {
      sCtx.save();
      sCtx.globalAlpha = alpha;

      const cols = [
        hexRgb(colors?.[0]),
        hexRgb(colors?.[1]),
        hexRgb(colors?.[2]),
        hexRgb(colors?.[3]),
      ];

      // Very soft glow center
      const glow = sCtx.createRadialGradient(smCx, smCy, 8, smCx, smCy, 70);
      const gc = cols[1] || cols[0];
      glow.addColorStop(0, `rgba(${gc.r},${gc.g},${gc.b},0.05)`);
      glow.addColorStop(1, `rgba(${gc.r},${gc.g},${gc.b},0)`);
      sCtx.fillStyle = glow;
      sCtx.fillRect(0, 0, 256, 256);

      const totalW = 110;
      const gap = totalW / BAR_COUNT;
      const barW = gap * 0.45;
      const startX = smCx - totalW / 2 + gap / 2;

      for (let i = 0; i < BAR_COUNT; i++) {
        const t = i / (BAR_COUNT - 1);
        const h1 = Math.sin(time * barSpeeds[i] + barPhases[i]) * 0.5 + 0.5;
        const h2 = Math.sin(time * 1.4 + i * 0.9) * 0.5 + 0.5;
        const h3 = Math.sin(time * 2.6 + i * 0.5) * 0.3 + 0.5;
        const height = (h1 * 0.5 + h2 * 0.3 + h3 * 0.2) * 55 + 8;

        // Color: cycle through theme colors per bar
        const colIdx = i % cols.length;
        const cr = cols[colIdx].r;
        const cg = cols[colIdx].g;
        const cb = cols[colIdx].b;

        const bx = startX + i * gap;
        const r = barW / 2;

        // Glow
        sCtx.shadowColor = `rgba(${cr},${cg},${cb},0.5)`;
        sCtx.shadowBlur = 8;

        sCtx.fillStyle = `rgba(${cr},${cg},${cb},0.85)`;
        sCtx.beginPath();
        sCtx.roundRect(bx - r, smCy - height / 2, barW, height, r);
        sCtx.fill();

        sCtx.shadowBlur = 0;
      }

      sCtx.restore();
    }

    // ── Combined draw — sequential fade: face out → pause → wave in ──
    function drawCubeFace(
      dizzy,
      time,
      lookX,
      lookY,
      morph,
      colors,
      surprise,
      sleep,
      holdProg,
      happy,
      blink
    ) {
      sCtx.clearRect(0, 0, 256, 256);
      const faceAlpha = Math.max(0, 1 - morph * 2.5);
      const waveAlpha = Math.max(0, (morph - 0.5) * 2);
      if (faceAlpha > 0.01)
        drawFaceLayer(
          dizzy,
          time,
          lookX,
          lookY,
          faceAlpha,
          surprise,
          sleep,
          colors,
          happy,
          blink
        );
      if (waveAlpha > 0.01) drawWaveLayer(time, waveAlpha, colors);
      // Gold sparkles persist across both face and wave modes
      drawGoldSparkles(time, colors);

      // ── Hold progress ring ──
      const hp = holdProg || 0;
      if (hp > 0.01) {
        const c1 = hexRgb(colors?.[0]);
        const c2 = hexRgb(colors?.[1]);
        const ringR = 90;
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + hp * Math.PI * 2;
        const lineW = 3 + hp * 4;
        const pulse = 1 + Math.sin(time * 12) * 0.15 * hp;

        // Outer glow ring
        sCtx.save();
        sCtx.globalAlpha = hp * 0.3;
        sCtx.strokeStyle = `rgba(${c2.r},${c2.g},${c2.b},0.4)`;
        sCtx.lineWidth = lineW + 8;
        sCtx.lineCap = "round";
        sCtx.shadowColor = `rgba(${c2.r},${c2.g},${c2.b},0.6)`;
        sCtx.shadowBlur = 12 * pulse;
        sCtx.beginPath();
        sCtx.arc(smCx, smCy, ringR * pulse, startAngle, endAngle);
        sCtx.stroke();
        sCtx.restore();

        // Main progress arc — gradient from color1 to color2
        sCtx.save();
        sCtx.globalAlpha = 0.6 + hp * 0.35;
        sCtx.lineWidth = lineW;
        sCtx.lineCap = "round";
        sCtx.shadowColor = `rgba(${c1.r},${c1.g},${c1.b},0.5)`;
        sCtx.shadowBlur = 6 * pulse;

        // Sweep gradient via multiple small arcs
        const steps = Math.max(4, Math.floor(hp * 40));
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const a0 = startAngle + t * hp * Math.PI * 2;
          const a1 = startAngle + (t + 1.5 / steps) * hp * Math.PI * 2;
          const cr = Math.round(c1.r + (c2.r - c1.r) * t);
          const cg = Math.round(c1.g + (c2.g - c1.g) * t);
          const cb = Math.round(c1.b + (c2.b - c1.b) * t);
          sCtx.strokeStyle = `rgba(${cr},${cg},${cb},1)`;
          sCtx.beginPath();
          sCtx.arc(smCx, smCy, ringR * pulse, a0, Math.min(a1, endAngle));
          sCtx.stroke();
        }

        // Leading edge dot
        const dotX = smCx + Math.cos(endAngle) * ringR * pulse;
        const dotY = smCy + Math.sin(endAngle) * ringR * pulse;
        sCtx.fillStyle = `rgba(${c2.r},${c2.g},${c2.b},${0.7 + hp * 0.3})`;
        sCtx.shadowColor = `rgba(${c2.r},${c2.g},${c2.b},0.8)`;
        sCtx.shadowBlur = 10 * pulse;
        sCtx.beginPath();
        sCtx.arc(dotX, dotY, 3 + hp * 2, 0, Math.PI * 2);
        sCtx.fill();

        sCtx.restore();

        // Background track ring
        sCtx.save();
        sCtx.globalAlpha = 0.08;
        sCtx.strokeStyle = `rgba(${c1.r},${c1.g},${c1.b},1)`;
        sCtx.lineWidth = 2;
        sCtx.beginPath();
        sCtx.arc(smCx, smCy, ringR, 0, Math.PI * 2);
        sCtx.stroke();
        sCtx.restore();
      }
    }

    drawCubeFace(0, 0, 0, 0, 0, null, 0, 0, 0, 0, 0);
    const smileyTex = new CanvasTexture(smileyCanvas);
    smileyTex.needsUpdate = true;
    const smileyMat = new SpriteMaterial({
      map: smileyTex,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const smiley = new Sprite(smileyMat);
    smiley.scale.set(0.75, 0.75, 1);
    smiley.position.set(0, 0, 0.05);
    smiley.renderOrder = 12;
    glassCube.add(smiley);

    let lastCornerR = 0.08;
    // Quaternion-based rotation — spin always matches screen-space mouse direction
    const cubeQuat = new Quaternion();
    const angVel = new Vector3(0, 0, 0); // angular velocity in world space

    // ── No scroll — shatter/helix removed ──
    const scrollProg = 0;
    const mouse = new Vector2(-999, -999),
      mouseWorld = new Vector3(),
      mouseSmooth = new Vector3();
    let lastActivity = performance.now();
    const raycaster = new Raycaster(),
      mSp = new Sphere(new Vector3(), 1);
    const onMM = (e) => {
      mouse.x = (e.clientX / W()) * 2 - 1;
      mouse.y = -(e.clientY / H()) * 2 + 1;
      lastActivity = performance.now();
    };
    const onTM = (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        mouse.x = (t.clientX / W()) * 2 - 1;
        mouse.y = -(t.clientY / H()) * 2 + 1;
        lastActivity = performance.now();
      }
    };
    window.addEventListener("mousemove", onMM);
    window.addEventListener("touchmove", onTM);

    // Hold detection on cube
    let bounceZ = 0,
      bounceSpin = 0,
      bounceDecay = 0;
    let holdTimer = null,
      isHolding = false,
      holdStartTime = 0,
      holdFired = false;
    const testCubeHit = (e) => {
      const mx = (e.clientX / W()) * 2 - 1,
        my = -(e.clientY / H()) * 2 + 1;
      raycaster.setFromCamera(new Vector2(mx, my), camera);
      return raycaster.ray.intersectSphere(mSp, new Vector3());
    };
    const onDown = (e) => {
      lastActivity = performance.now();
      // Don't interact with cube when overlays are open
      if (
        menuOpenRef.current ||
        chatModeRef.current ||
        showcaseOpenRef.current ||
        showcaseTransRef.current
      )
        return;
      if (!testCubeHit(e)) return;
      isHolding = true;
      holdFired = false;
      holdStartTime = performance.now();
      holdTimer = setTimeout(() => {
        if (isHolding) {
          // Hold — trigger showcase
          holdFired = true;
          clickScaleVel = -0.8;
          isHolding = false;
          if (onCubeHoldRef.current) onCubeHoldRef.current();
        }
      }, 600);
    };
    const onUp = () => {
      if (holdTimer) clearTimeout(holdTimer);
      // Quick click only — if held long enough to start progress ring, don't open chat
      const holdDuration = performance.now() - holdStartTime;
      if (isHolding && !holdFired && holdDuration < 150) {
        clickScaleVel = -0.8;
        setTimeout(() => {
          if (onCubeClickRef.current) onCubeClickRef.current();
        }, 300);
      }
      isHolding = false;
      holdFired = false;
      holdTimer = null;
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    // Touch hold support
    const onTouchDown = (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      onDown({ clientX: t.clientX, clientY: t.clientY });
    };
    const onTouchUp = () => onUp();
    window.addEventListener("touchstart", onTouchDown, { passive: true });
    window.addEventListener("touchend", onTouchUp);
    window.addEventListener("touchcancel", onTouchUp);

    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        camera.aspect = W() / H();
        camera.updateProjectionMatrix();
        renderer.setSize(W(), H());
        sceneRT.setSize(W(), H());
      }, 150);
    };
    window.addEventListener("resize", onResize);
    const clock = new Clock();
    let raf;
    let birthStart = performance.now();
    let lastReplayKey = 0;
    let rotAngle = 0;
    // Menu animation: smoothly move object to left + scale up
    const menuPos = new Vector3(0, 0, 0);
    const menuVel = new Vector3(0, 0, 0);
    let menuScale = 1;
    let menuScaleVel = 0;
    let prevMouseX = 0,
      prevMouseY = 0;
    // Menu floating cubes
    const menuCubes = [];
    let menuCubesShown = false;
    let chatZ = 0,
      chatZVel = 0,
      chatSpinBurst = 0,
      chatArc = 0,
      chatArcVel = 0,
      chatArcX = 0,
      chatArcXVel = 0,
      wasInChat = false;
    let clickScale = 1,
      clickScaleVel = 0;
    // Showcase transition — cube zooms toward camera
    let scZoom = 0; // 0 = normal, 1 = fully zoomed

    function loop() {
      raf = requestAnimationFrame(loop);

      // When showcase is open, hide canvas entirely and skip all rendering
      if (showcaseOpenRef.current) {
        renderer.domElement.style.visibility = "hidden";
        return;
      }
      renderer.domElement.style.visibility = "visible";

      const dt = Math.min(clock.getDelta(), 0.0333);
      const el = clock.elapsedTime;
      const c = cfg.current;

      // Replay detection — reset birth when birthReplay changes
      if (c.birthReplay && c.birthReplay !== lastReplayKey) {
        lastReplayKey = c.birthReplay;
        birthStart = performance.now();
        rotAngle = 0;
        // Apply initial spin burst
        angVel.x += c.birthSpinBurstX ?? 0;
        angVel.y += c.birthSpinBurstY ?? 0;
        angVel.z += c.birthSpinBurstZ ?? 0;
      }

      const birthT = Math.min(
        1,
        (performance.now() - birthStart) / 1000 / c.birthDuration
      );
      // Easing — cubic-bezier or power ease
      let birth;
      if ((c.birthUseBezier ?? 0) > 0.5) {
        const ease = cubicBezier(
          c.birthBezierX1 ?? 0.16,
          c.birthBezierY1 ?? 1.0,
          c.birthBezierX2 ?? 0.3,
          c.birthBezierY2 ?? 1.0
        );
        birth = ease(birthT);
      } else {
        const birthEase = c.birthEasing || 2.5;
        birth = 1 - Math.pow(1 - birthT, birthEase);
      }
      if (onBirthProgress) onBirthProgress(birth);
      // Fly-in from behind camera, settles slightly upward
      const bR = c.sphereRadius;
      const bA = c.noiseAmp;
      const bM = c.mouseStrength * birth;
      const birthYDist = c.birthFloatDist ?? 1.2;
      const birthY = -birthYDist * (1 - birth);
      const birthZDist = c.birthFlyInDist ?? 7;
      const birthZCurve = c.birthFlyInCurve ?? 1.8;
      const birthZ = birthZDist * Math.pow(1 - birth, birthZCurve);
      // Parabolic arc — peaks mid-flight, zero at start & end
      const birthArc = Math.sin(birth * Math.PI) * (c.birthArcHeight ?? 2.0);
      const birthScaleStart = c.birthScaleStart ?? 1.0;
      const birthScaleCurve = birthScaleStart + (1 - birthScaleStart) * birth;
      const birthOpacity = Math.min(birth * (c.birthFadeSpeed || 3), 1);
      // X/Y coordinate offsets — lerp from start to end
      const birthX =
        (c.birthStartX ?? 0) +
        ((c.birthEndX ?? 0) - (c.birthStartX ?? 0)) * birth;
      const birthYOffset =
        (c.birthStartY ?? 0) +
        ((c.birthEndY ?? 0) - (c.birthStartY ?? 0)) * birth;

      // Birth rotation
      rotAngle += (c.birthSpinSpeed || 0.4) * (c.birthSpinMult || 0.15) * dt;
      // Idle base rotation
      if (birth > 0.98) rotAngle += c.rotationSpeed * 0.5 * dt;

      // Bounce animation (click reaction) — clicky spring
      bounceDecay += dt;
      const bSpring = 8,
        bDamp = 4;
      const bzAccel = -bounceZ * bSpring - bounceSpin * 0.1;
      bounceZ += bounceZ * -bDamp * dt + bzAccel * dt * dt;
      if (Math.abs(bounceZ) < 0.01 && bounceDecay > 0.5) bounceZ = 0;
      bounceSpin *= Math.max(0, 1 - 3 * dt);
      rotAngle += bounceSpin * dt;

      // Click scale — gradual shrink during hold, spring back after
      if (isHolding) {
        const holdProgress = Math.min(
          1,
          (performance.now() - holdStartTime) / 600
        );
        const holdTarget = 1 - holdProgress * 0.18;
        clickScale += (holdTarget - clickScale) * 0.12;
        clickScaleVel = 0;
      } else {
        const csAccel = (1 - clickScale) * 6 - clickScaleVel * 3;
        clickScaleVel += csAccel * dt;
        clickScale += clickScaleVel * dt;
        if (
          Math.abs(clickScale - 1) < 0.001 &&
          Math.abs(clickScaleVel) < 0.005
        ) {
          clickScale = 1;
          clickScaleVel = 0;
        }
      }

      sphere.rotation.y = rotAngle;
      sphere.rotation.x =
        Math.sin(el * (c.birthTiltSpeed || 0.2)) *
        (c.birthTiltAmp || 0.04) *
        birth;

      // Proximity reporting — project sphere to screen, measure distance from mouse
      let cubeProx = 0;
      if (birth > 0.5 && onCubeProximityRef.current) {
        const screenPos = sphere.position.clone().project(camera);
        const dx = screenPos.x - mouse.x,
          dy = screenPos.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        cubeProx = Math.max(0, 1 - dist / (c.reticleRange || 1.2));
        onCubeProximityRef.current(cubeProx);
        // Update sphere for click detection
        mSp.set(sphere.position, bR * (c.shapeScale || 1) * menuScale * 1.3);
      }

      // ── Position animation: damped spring ──
      const mOpen = menuOpenRef.current;
      // ── Menu floating cubes — two glass cubes, left and right ──
      if (mOpen && !menuCubesShown) {
        menuCubesShown = true;
        const cubeSize = (c.glassCubeSize || 3.6) * 0.55;
        const cr = c.glassCornerRadius || 0.08;
        const zones = [
          { x: [-1.5, 1.5], y: [1.5, 3.5], z: [-5, -3] }, // above, behind
          { x: [-1.5, 1.5], y: [-3.5, -1.5], z: [-5, -3] }, // below, behind
        ];
        zones.forEach((zone, i) => {
          const px = zone.x[0] + Math.random() * (zone.x[1] - zone.x[0]);
          const py = zone.y[0] + Math.random() * (zone.y[1] - zone.y[0]);
          const pz = zone.z[0] + Math.random() * (zone.z[1] - zone.z[0]);
          const g = new RoundedBoxGeometry(
            cubeSize,
            cubeSize,
            cubeSize,
            4,
            cr * cubeSize
          );
          const m = new MeshPhysicalMaterial({
            transmission: 0.92,
            roughness: 0.05,
            ior: 1.5,
            thickness: 1.2,
            transparent: true,
            opacity: 0,
            metalness: 0,
            envMapIntensity: 1.2,
            color: 0xffffff,
          });
          const edgeGeo = new EdgesGeometry(g);
          const lineMat = new LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
          });
          const mesh = new Mesh(g, m);
          const wire = new LineSegments(edgeGeo, lineMat);
          mesh.add(wire);
          mesh.position.set(px, py - 1.5, pz);
          mesh.scale.setScalar(0.01);
          mesh.rotation.set(
            Math.random() * 0.6,
            Math.random() * 0.6,
            Math.random() * 0.3
          );
          mesh.userData.rotSpeed = new Vector3(
            (Math.random() - 0.5) * 0.12,
            (Math.random() - 0.5) * 0.18,
            0
          );
          mesh.userData.targetY = py;
          mesh.userData.delay = i * 0.2;
          mesh.userData.born = performance.now();
          scene.add(mesh);
          menuCubes.push({ mesh, mat: m, lineMat, geo: g, edges: edgeGeo });
        });
      }
      if (
        !mOpen &&
        menuCubesShown &&
        menuCubes.every((mc) => mc.mat.opacity < 0.01 && mc.mesh.scale.x < 0.02)
      ) {
        menuCubesShown = false;
        menuCubes.forEach((mc) => {
          scene.remove(mc.mesh);
          mc.geo.dispose();
          mc.mat.dispose();
          mc.edges.dispose();
          mc.lineMat.dispose();
        });
        menuCubes.length = 0;
      }
      menuCubes.forEach((mc) => {
        const age = (performance.now() - mc.mesh.userData.born) / 1000;
        const delay = mc.mesh.userData.delay || 0;
        const t = Math.max(0, age - delay);
        const entrance = Math.min(1, t / 1.0); // slower entrance
        const ease = entrance * entrance * (3 - 2 * entrance);
        const targetOp = mOpen ? 0.88 * ease : 0;
        const targetLineOp = mOpen ? 0.1 * ease : 0;
        const targetS = mOpen ? ease : 0;
        mc.mat.opacity += (targetOp - mc.mat.opacity) * 2.5 * dt;
        mc.lineMat.opacity += (targetLineOp - mc.lineMat.opacity) * 2.5 * dt;
        const curS = mc.mesh.scale.x;
        mc.mesh.scale.setScalar(curS + (targetS - curS) * 2.5 * dt);
        const ty = mc.mesh.userData.targetY || 0;
        mc.mesh.position.y +=
          ((mOpen ? ty : ty - 1.5) - mc.mesh.position.y) * 2.5 * dt;
        mc.mesh.rotation.x += mc.mesh.userData.rotSpeed.x * dt;
        mc.mesh.rotation.y += mc.mesh.userData.rotSpeed.y * dt;
      });
      const inChat = chatModeRef.current;
      const targetX = inChat ? -3.2 : 0;
      const targetY = inChat ? 0 : 0;
      const targetZ = inChat ? 4 : 0;
      const targetS = inChat ? 1.6 : 1;
      const stiffness = inChat
        ? c.chatStiffness || 1.8
        : c.chatReturnStiffness || 5.0;
      const damping = inChat
        ? c.chatDamping || 3.5
        : c.chatReturnDamping || 4.0;
      const dxM = targetX - menuPos.x,
        dyM = targetY - menuPos.y;
      menuVel.x += (dxM * stiffness - menuVel.x * damping) * dt;
      menuVel.y += (dyM * stiffness - menuVel.y * damping) * dt;
      menuPos.x += menuVel.x * dt;
      menuPos.y += menuVel.y * dt;
      const dsM = targetS - menuScale;
      menuScaleVel += (dsM * stiffness - menuScaleVel * damping) * dt;
      menuScale += menuScaleVel * dt;
      // Chat Z spring (separate)
      const dzM = targetZ - chatZ;
      chatZVel += (dzM * stiffness - chatZVel * damping) * dt;
      chatZ += chatZVel * dt;
      // Parabolic arc: push away + leftward, then curve back
      const arcStiff = c.chatArcStiffness || 2.0;
      const arcDamp = c.chatArcDamping || 2.5;
      chatArcVel += (0 - chatArc) * arcStiff * dt - chatArcVel * arcDamp * dt;
      chatArc += chatArcVel * dt;
      chatArcXVel +=
        (0 - chatArcX) * arcStiff * dt - chatArcXVel * arcDamp * dt;
      chatArcX += chatArcXVel * dt;
      if (Math.abs(chatArc) < 0.01 && Math.abs(chatArcVel) < 0.01) {
        chatArc = 0;
        chatArcVel = 0;
      }
      if (Math.abs(chatArcX) < 0.01 && Math.abs(chatArcXVel) < 0.01) {
        chatArcX = 0;
        chatArcXVel = 0;
      }
      // Chat spin — big spin burst on enter
      if (inChat && !wasInChat) {
        chatSpinBurst = c.chatSpinKick || 5.0;
        chatArcVel = c.chatArcKickZ || -6;
        chatArcXVel = c.chatArcKickX || -4;
        angVel.y += c.chatSpinKick || 5.0;
        angVel.x += 1.5;
        wasInChat = true;
      }
      if (!inChat && wasInChat) {
        chatSpinBurst = -(c.chatSpinKick || 5.0);
        chatArcVel = -(c.chatArcKickZ || -6);
        chatArcXVel = -(c.chatArcKickX || -4);
        angVel.y -= c.chatSpinKick || 5.0;
        angVel.x -= 1.5;
        wasInChat = false;
      }
      chatSpinBurst *= Math.max(0, 1 - (c.chatSpinDecay || 1.4) * dt);
      rotAngle += chatSpinBurst * dt;
      angVel.y += chatSpinBurst * 0.5 * dt;
      // Mouse → camera-space torque on angular velocity (always consistent)
      const mdx = mouse.x - prevMouseX,
        mdy = mouse.y - prevMouseY;
      prevMouseX = mouse.x;
      prevMouseY = mouse.y;
      const validMouse = mouse.x > -900 && prevMouseX > -900;

      // Mouse-driven spin
      if (validMouse && cubeProx > 0.5 && birth > 0.95) {
        const speed = Math.sqrt(mdx * mdx + mdy * mdy);
        const proxStrength = Math.pow(cubeProx, 2);
        const mass = 5.0;
        const strength = (6 + speed * 100) * proxStrength;
        angVel.y += (mdx * strength) / mass;
        angVel.x += (-mdy * strength * 0.8) / mass;
      }
      // Gentle base rotation
      if (birth > 0.98) {
        angVel.y += (c.glassRotSpeedY || 0.36) * 0.08 * dt;
        angVel.x += (c.glassRotSpeedX || 0.62) * 0.08 * dt;
      }
      // Drag
      const drag = 0.75;
      angVel.x -= angVel.x * drag * dt;
      angVel.y -= angVel.y * drag * dt;
      angVel.z -= angVel.z * drag * dt;
      // Clamp
      angVel.clampLength(0, 8);
      // Apply angular velocity to quaternion (world-space rotation)
      const avLen = angVel.length();

      // ── Smiley / wave visualizer ──
      const dizzyTarget = Math.min(1, Math.max(0, (avLen - 1.5) / 3.5));
      dizzySmooth +=
        (dizzyTarget - dizzySmooth) *
        (dizzyTarget > dizzySmooth ? 3 : 1.5) *
        dt;
      // Smooth morph: 0 = smiley face, 1 = wave visualizer
      const morphTarget = chatModeRef.current ? 1 : 0;
      chatMorph += (morphTarget - chatMorph) * 1.8 * dt;
      // Happy face when returning from chat
      if (prevChatMode && !chatModeRef.current) happySmooth = 1;
      prevChatMode = chatModeRef.current;
      happySmooth = Math.max(0, happySmooth - dt * 0.3); // decay over ~3s
      // Blink
      blinkTimer += dt;
      if (blinkTimer >= nextBlink) {
        blinkAmount = 1;
        blinkTimer = 0;
        nextBlink = 2.5 + Math.random() * 4;
      }
      blinkAmount = Math.max(0, blinkAmount - dt * 8); // quick open ~0.12s
      // Sleep: ramp after 15s of inactivity
      const idleTime = (performance.now() - lastActivity) / 1000;
      const sleepTarget = idleTime > 15 ? Math.min(1, (idleTime - 15) / 3) : 0;
      sleepSmooth += (sleepTarget - sleepSmooth) * 2 * dt;
      // Safe mouse coords (0,0 if cursor hasn't entered yet)
      const safeMx = mouse.x < -900 ? 0 : mouse.x;
      const safeMy = mouse.y < -900 ? 0 : mouse.y;
      const themeColors = [
        c.gradColor1,
        c.gradColor2,
        c.gradColor3,
        c.gradColor4,
      ];
      const holdProgress =
        isHolding && !holdFired
          ? Math.max(0, Math.min(1, (performance.now() - holdStartTime) / 600))
          : 0;

      // #16 — skip smiley redraw when nothing is changing
      const isGold = (c.gradColor1 || "").toLowerCase() === "#b8860b";
      const smileyDirty =
        dizzySmooth > 0.01 ||
        happySmooth > 0.01 ||
        blinkAmount > 0.01 ||
        Math.abs(chatMorph - (chatModeRef.current ? 1 : 0)) > 0.01 ||
        Math.abs(sleepSmooth - (sleepTarget > 0.5 ? 1 : 0)) > 0.01 ||
        holdProgress > 0 ||
        scZoom > 0.01 ||
        isGold ||
        Math.abs(safeMx - (prevMx || 0)) > 0.001 ||
        Math.abs(safeMy - (prevMy || 0)) > 0.001;
      prevMx = safeMx;
      prevMy = safeMy;

      if (smileyDirty) {
        drawCubeFace(
          dizzySmooth,
          el,
          safeMx,
          safeMy,
          chatMorph,
          themeColors,
          scZoom,
          sleepSmooth,
          holdProgress,
          happySmooth,
          blinkAmount
        );
        smileyTex.needsUpdate = true;
      }

      if (avLen > 0.0001) {
        const axis = angVel.clone().normalize();
        const dq = new Quaternion().setFromAxisAngle(axis, avLen * dt);
        cubeQuat.premultiply(dq);
        cubeQuat.normalize();
      }
      // Showcase transition: cube gently zooms toward camera and enlarges
      if (showcaseTransRef.current || showcaseOpenRef.current) {
        scZoom = Math.min(1, scZoom + dt * 0.5); // ~2s to fully zoom
      } else {
        scZoom = Math.max(0, scZoom - dt * 1.5);
      }
      // Ease the raw scZoom for smooth acceleration/deceleration
      const zoomEased =
        scZoom < 0.5
          ? 2 * scZoom * scZoom
          : 1 - Math.pow(-2 * scZoom + 2, 2) / 2;
      const zoomZ = zoomEased * 12;
      const zoomScale = 1 + zoomEased * 1.2;

      const baseX = menuPos.x + chatArcX + birthX;
      const baseY = menuPos.y + birthY + birthYOffset + birthArc;
      const baseZ = birthZ - bounceZ + chatZ + chatArc;

      // Gently center as it zooms
      const px = baseX * (1 - zoomEased);
      const py = baseY * (1 - zoomEased * 0.4);
      const pz = baseZ + zoomZ;

      sphere.position.set(px, py, pz);
      glassCube.position.set(px, py, pz);

      // Glass cube — hidden when fully zoomed into showcase
      const cubeVisible = zoomEased < 0.99;
      glassCube.visible = cubeVisible;
      glassEdges.visible = cubeVisible;

      {
        const cr = c.glassCornerRadius || 0.08;
        if (Math.abs(cr - lastCornerR) > 0.005) {
          lastCornerR = cr;
          const newGeo = new RoundedBoxGeometry(1, 1, 1, 4, cr);
          glassCube.geometry.dispose();
          glassCube.geometry = newGeo;
          const newEdgeGeo = new EdgesGeometry(newGeo);
          glassEdges.geometry.dispose();
          glassEdges.geometry = newEdgeGeo;
        }
        glassCube.quaternion.copy(cubeQuat);
        const gSize = c.glassCubeSize || 3.6;
        glassCube.scale
          .set(gSize, gSize, gSize)
          .multiplyScalar(
            bR * menuScale * clickScale * birthScaleCurve * zoomScale
          );
        glassUniforms.uRefract.value = c.glassRefraction || 0.15;
        glassUniforms.uBlur.value = c.glassBlur || 2.9;
        glassUniforms.uEdgeAlpha.value = c.glassEdgeAlpha || 1;
        glassUniforms.uFresnelPow.value = c.glassFresnelPower || 0.5;
        glassUniforms.uSpecular.value = c.glassSpecular || 4;
        glassUniforms.uSpecPower.value = c.glassSpecPower || 120;
        glassUniforms.uIridescence.value = c.glassIridescence || 0;
        glassUniforms.uOpacity.value =
          (c.glassOpacity != null ? c.glassOpacity : 0.92) *
          birthOpacity *
          (1 - zoomEased);
        glassUniforms.uTint.value.set(
          c.glassTintR || 0.9,
          c.glassTintG || 0.92,
          c.glassTintB || 1
        );
        glassUniforms.uRes.value.set(W(), H());
        glassEdgeMat.opacity = (c.glassEdgeOpacity ?? 0.12) * (1 - zoomEased);
        const halfSide = (c.glassCubeSize || 3.6) * 0.5;
        fU.uBounds.value = halfSide - 0.15;
      }

      // Sphere — hidden, particles replace it
      sphere.visible = false;
      sphere.scale.setScalar(bR * (c.shapeScale || 1) * menuScale * clickScale);
      fU.uTime.value = el;
      fU.uScrollProgress.value = scrollProg;
      fU.uShape.value = 0;
      fU.uMeshAlpha.value = birthOpacity;
      fU.uTetraScale.value = c.tetraScale;
      fU.uCubeScale.value = c.cubeScale;
      fU.uShapeTiltX.value = c.shapeTiltX || 0;
      fU.uShapeTiltY.value = c.shapeTiltY || 0;
      fU.uGC1.value.set(c.gradColor1 || "#1a0a3e");
      fU.uGC2.value.set(c.gradColor2 || "#d41878");
      fU.uGC3.value.set(c.gradColor3 || "#08b4a8");
      fU.uGC4.value.set(c.gradColor4 || "#f5a623");
      fU.uNoiseFreq.value = c.noiseFreq;
      fU.uNoiseAmp.value = bA;
      fU.uNoiseSpeed.value = c.noiseSpeed;
      fU.uNoiseOctaves.value = c.noiseOctaves;
      fU.uNoiseLac.value = c.noiseLacunarity;
      fU.uNoisePers.value = c.noisePersistence;
      fU.uSpikeSharp.value = c.spikeSharpness;
      fU.uNoiseWarp.value = c.noiseWarp;
      fU.uMouseStrength.value = bM;
      fU.uMouseRadius.value = c.mouseRadius;
      fU.uMouseFalloff.value = c.mouseFalloff;
      fU.uMouseNoiseBoost.value = c.mouseNoiseBoost;
      fU.uMouseNoiseFreq.value = c.mouseNoiseFreq;
      fU.uMouseAttract.value = c.mouseAttract;
      fU.uBaseBrightStart.value = c.baseBrightStart;
      fU.uBaseBrightEnd.value = c.baseBrightEnd;
      fU.uRoughness.value = c.roughness;
      fU.uMetallic.value = c.metallic;
      fU.uSpecularIntensity.value = c.specularIntensity;
      fU.uFresnelPower.value = c.fresnelPower;
      fU.uFresnelIntensity.value = c.fresnelIntensity;
      fU.uIridescence.value = c.iridescence;
      fU.uEnvReflect.value = c.envReflect;
      fU.uEnvBrightness.value = c.envBrightness;
      fU.uAoStrength.value = c.aoStrength;
      fU.uAoRange.value = c.aoRange;
      fU.uRimStrength.value = c.rimStrength;
      fU.uRimColor.value.set(c.rimColor);
      fU.uAmbientIntensity.value = c.ambientIntensity;
      fU.uLight1Pos.value.set(c.light1X, c.light1Y, c.light1Z);
      fU.uLight1Int.value = c.light1Intensity;
      fU.uLight2Pos.value.set(c.light2X, c.light2Y, c.light2Z);
      fU.uLight2Int.value = c.light2Intensity;
      fU.uLight3Pos.value.set(c.light3X, c.light3Y, c.light3Z);
      fU.uLight3Int.value = c.light3Intensity;
      fU.uWaveformMix.value = 0;
      fU.uWaveTime.value = el;
      if (birth > 0.95) {
        raycaster.setFromCamera(mouse, camera);
        mSp.set(sphere.position, bR * 1.5);
        const hit = new Vector3();
        if (raycaster.ray.intersectSphere(mSp, hit)) mouseWorld.copy(hit);
        else {
          const pl = new Plane(new Vector3(0, 0, 1), 0);
          raycaster.ray.intersectPlane(pl, mouseWorld);
        }
        mouseSmooth.lerp(mouseWorld, 0.08);
        fU.uMouseWorld.value.copy(
          mouseSmooth.clone().sub(sphere.position).divideScalar(bR)
        );
      }

      // Background texture from gradient canvas
      if (gradCanvasRef.current && !bgTex) {
        bgTex = new CanvasTexture(gradCanvasRef.current);
        bgTex.minFilter = LinearFilter;
        bgTex.magFilter = LinearFilter;
        glassUniforms.uBgTex.value = bgTex;
      }
      if (bgTex) bgTex.needsUpdate = true;

      // Two-pass: scene to RT (no glass), then full scene to screen
      const gVis = glassCube.visible;
      glassCube.visible = false;
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      glassCube.visible = gVis;
      glassUniforms.uSceneTex.value = sceneRT.texture;
      renderer.render(scene, camera);
    }
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMM);
      window.removeEventListener("touchmove", onTM);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchstart", onTouchDown);
      window.removeEventListener("touchend", onTouchUp);
      window.removeEventListener("touchcancel", onTouchUp);
      container.removeChild(renderer.domElement);
      renderer.dispose();
      sphereGeo.dispose();
      glassGeo.dispose();
      glassMat.dispose();
      glassEdgeGeo.dispose();
      glassEdgeMat.dispose();
      menuCubes.forEach((mc) => {
        scene.remove(mc.mesh);
        mc.geo.dispose();
        mc.mat.dispose();
      });
      sceneRT.dispose();
      if (bgTex) bgTex.dispose();
      smileyTex.dispose();
      smileyMat.dispose();
      sphere.material.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 1,
      }}
    />
  );
}
