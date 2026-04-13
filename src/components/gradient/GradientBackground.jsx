import { useEffect, useRef } from "react";
import { hslToRgb, hexToHsl } from "../../utils/color";
import { rand } from "../../utils/math";

const IS_MOBILE =
  typeof window !== "undefined" &&
  ("ontouchstart" in window || window.innerWidth < 768);

export default function GradientBackground({
  config: c,
  onCanvasReady,
  active,
}) {
  const canvasRef = useRef(null);
  const activeRef = useRef(false);
  activeRef.current = active;
  const configRef = useRef(c);
  configRef.current = c;
  const blobsRef = useRef(null);
  const glitterRef = useRef([]);
  const blobTexDirtyRef = useRef(false);

  useEffect(() => {
    if (onCanvasReady && canvasRef.current) onCanvasReady(canvasRef.current);
  }, [onCanvasReady]);

  // Update blob colors when theme changes (without resetting mask)
  useEffect(() => {
    if (!blobsRef.current) return;
    const themeColors = [
      c.gradColor1 || "#1a4a2e",
      c.gradColor2 || "#e8a0bf",
      c.gradColor3 || "#3d9e5c",
      c.gradColor4 || "#d4f0c6",
    ].map(hexToHsl);
    blobsRef.current.forEach((blob, i) => {
      const tc = themeColors[i % themeColors.length];
      blob.baseHue = tc[0];
      blob.hueVar = rand(-6, 6);
      blob.sat = Math.min(100, tc[1] + rand(-8, 8));
      blob.lit = Math.min(80, Math.max(25, tc[2] + rand(-8, 8)));
    });
    blobTexDirtyRef.current = true;
  }, [c.gradColor1, c.gradColor2, c.gradColor3, c.gradColor4]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const mask = document.createElement("canvas");
    const mCtx = mask.getContext("2d");
    const tmp = document.createElement("canvas");
    const tCtx = tmp.getContext("2d");

    const dpr = Math.min(window.devicePixelRatio, 2);
    let W, H;

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      for (const cv of [canvas, mask, tmp]) {
        cv.width = W * dpr;
        cv.height = H * dpr;
      }
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: -500, y: -500 };
    const smooth = { x: -500, y: -500 };
    let prevX = -500,
      prevY = -500;
    let lastBrushTime = 0; // tracks last cursor movement for idle fade
    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      lastBrushTime = performance.now();
    };
    window.addEventListener("mousemove", onMove);

    // Bristles — normalized, scaled by config each frame
    const BRISTLES = 18,
      bristles = [];
    for (let i = 0; i < BRISTLES; i++) {
      bristles.push({
        angleFrac: i / BRISTLES,
        angleJitter: Math.random() - 0.5,
        distFrac: Math.random(),
        sizeFrac: Math.random(),
        opacityFrac: Math.random(),
      });
    }

    function drawBrushStamp(x, y, size, opacity, cc) {
      const aSpread = cc.bristleAngleSpread ?? 0.8;
      const dMin = cc.bristleDistMin ?? 0.15;
      const dMax = cc.bristleDistMax ?? 0.6;
      const sMin = cc.bristleSizeMin ?? 0.25;
      const sMax = cc.bristleSizeMax ?? 0.7;
      const oMin = cc.bristleOpacityMin ?? 0.4;
      const oMax = cc.bristleOpacityMax ?? 1.0;
      const coreSize = cc.brushCoreSize ?? 0.5;
      const coreOp = cc.brushCoreOpacity ?? 0.6;
      const coreFall = cc.brushCoreFalloff ?? 0.15;
      for (const b of bristles) {
        const angle = b.angleFrac * Math.PI * 2 + b.angleJitter * aSpread;
        const dist = dMin + b.distFrac * (dMax - dMin);
        const bSize = (sMin + b.sizeFrac * (sMax - sMin)) * size;
        const bOp = oMin + b.opacityFrac * (oMax - oMin);
        const bx = x + Math.cos(angle) * dist * size;
        const by = y + Math.sin(angle) * dist * size;
        const grad = mCtx.createRadialGradient(bx, by, 0, bx, by, bSize);
        const a = opacity * bOp;
        grad.addColorStop(0, `rgba(255,255,255,${a})`);
        grad.addColorStop(0.5, `rgba(255,255,255,${a * 0.5})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        mCtx.fillStyle = grad;
        mCtx.beginPath();
        mCtx.arc(bx, by, bSize, 0, Math.PI * 2);
        mCtx.fill();
      }
      const cg = mCtx.createRadialGradient(x, y, 0, x, y, size * coreSize);
      cg.addColorStop(0, `rgba(255,255,255,${opacity * coreOp})`);
      cg.addColorStop(0.7, `rgba(255,255,255,${opacity * coreFall})`);
      cg.addColorStop(1, "rgba(255,255,255,0)");
      mCtx.fillStyle = cg;
      mCtx.beginPath();
      mCtx.arc(x, y, size * coreSize, 0, Math.PI * 2);
      mCtx.fill();
    }

    // Blobs colored from theme gradient — hues LOCKED to palette
    const themeColors = [
      configRef.current.gradColor1 || "#1a4a2e",
      configRef.current.gradColor2 || "#e8a0bf",
      configRef.current.gradColor3 || "#3d9e5c",
      configRef.current.gradColor4 || "#d4f0c6",
    ].map(hexToHsl);
    const BLOB_COUNT = IS_MOBILE ? 8 : configRef.current.blobCount || 15,
      blobs = [];
    for (let i = 0; i < BLOB_COUNT; i++) {
      const tc = themeColors[i % themeColors.length];
      const bSMin = configRef.current.blobSizeMin || 0.25;
      const bSMax = configRef.current.blobSizeMax || 0.65;
      const bAMin = configRef.current.blobAlphaMin || 0.3;
      const bAMax = configRef.current.blobAlphaMax || 0.85;
      blobs.push({
        x: rand(-0.1, 1.1),
        y: rand(-0.1, 1.1),
        r: rand(bSMin, bSMax),
        baseHue: tc[0],
        hueVar: rand(-6, 6),
        hueOscSpeed: rand(0.02, 0.08),
        hueOscAmp: rand(3, 8),
        sat: Math.min(100, tc[1] + rand(-8, 8)),
        lit: Math.min(80, Math.max(25, tc[2] + rand(-8, 8))),
        alpha: rand(bAMin, bAMax),
        spdX: rand(0.15, 0.55),
        spdY: rand(0.15, 0.55),
        phX: rand(0, Math.PI * 2),
        phY: rand(0, Math.PI * 2),
        ampX: rand(0.08, 0.3),
        ampY: rand(0.08, 0.3),
        scaleX: rand(0.6, 1.4),
        scaleY: rand(0.6, 1.4),
        rotation: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.1, 0.1),
      });
    }
    blobsRef.current = blobs;

    // ── Pre-rendered blob textures ──
    // Each blob gets a small offscreen canvas with its radial gradient baked in.
    // Per frame we drawImage with transforms (GPU-accelerated) instead of
    // calling createRadialGradient + addColorStop + rgba string interpolation.
    const BLOB_TEX_SIZE = 128;
    const blobTextures = blobs.map(() => {
      const cv = document.createElement("canvas");
      cv.width = BLOB_TEX_SIZE;
      cv.height = BLOB_TEX_SIZE;
      return cv;
    });

    function renderBlobTexture(idx) {
      const blob = blobs[idx];
      const cv = blobTextures[idx];
      const btx = cv.getContext("2d");
      const cx = BLOB_TEX_SIZE / 2;
      const hue = (blob.baseHue + blob.hueVar + blob._hueOsc + 360) % 360;
      const [r, g, b] = hslToRgb(hue, blob.sat, blob.lit);
      // Skip if color hasn't actually changed
      if (r === blob._texR && g === blob._texG && b === blob._texB) return;
      btx.clearRect(0, 0, BLOB_TEX_SIZE, BLOB_TEX_SIZE);
      const grad = btx.createRadialGradient(cx, cx, 0, cx, cx, cx);
      grad.addColorStop(0, `rgba(${r},${g},${b},${blob.alpha})`);
      grad.addColorStop(0.3, `rgba(${r},${g},${b},${blob.alpha * 0.6})`);
      grad.addColorStop(0.6, `rgba(${r},${g},${b},${blob.alpha * 0.15})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      btx.fillStyle = grad;
      btx.fillRect(0, 0, BLOB_TEX_SIZE, BLOB_TEX_SIZE);
      blob._texR = r;
      blob._texG = g;
      blob._texB = b;
    }

    // Initial texture render
    blobs.forEach((blob) => {
      blob._hueOsc = 0;
      blob._texR = -1;
      blob._texG = -1;
      blob._texB = -1;
    });
    blobs.forEach((_, i) => renderBlobTexture(i));
    let blobTexFrame = 0;

    // Glitter trail system (for gold theme) — spawns at cursor, drifts outward, fades
    const GLITTER_MAX = 300;
    const glitterTrail = [];
    for (let i = 0; i < GLITTER_MAX; i++) {
      glitterTrail.push({
        x: 0,
        y: 0,
        alive: false,
        birth: 0,
        size: 0,
        shape: 0,
        tone: 0,
        speed: 0,
        phase: 0,
        lifetime: 0,
        driftAngle: 0,
        driftSpeed: 0,
      });
    }
    let glitterHead = 0;
    let glitterAlive = 0; // fast path — skip rendering when 0
    glitterRef.current = { trail: glitterTrail, head: glitterHead };

    // ── Pre-rendered gold particle textures ──
    // Replaces per-particle canvas path ops (save/translate/rotate/beginPath/
    // quadraticCurveTo/fill/restore) with a single drawImage per particle.
    const GOLD_TONES = [
      [255, 215, 0],
      [255, 200, 80],
      [255, 230, 120],
      [255, 252, 230],
      [218, 165, 32],
    ];
    const PTEX = 64;
    const PTEX_HALF = PTEX / 2;

    function makeParticleCanvas() {
      const cv = document.createElement("canvas");
      cv.width = PTEX;
      cv.height = PTEX;
      return cv;
    }

    // Star shape (shape 0) — per tone
    const starTextures = GOLD_TONES.map(([r, g, b]) => {
      const cv = makeParticleCanvas();
      const pc = cv.getContext("2d");
      const arm = PTEX_HALF * 0.85;
      const w = PTEX_HALF * 0.06;
      pc.fillStyle = `rgb(${r},${g},${b})`;
      pc.beginPath();
      pc.moveTo(PTEX_HALF - arm, PTEX_HALF);
      pc.quadraticCurveTo(PTEX_HALF, PTEX_HALF - w, PTEX_HALF + arm, PTEX_HALF);
      pc.quadraticCurveTo(PTEX_HALF, PTEX_HALF + w, PTEX_HALF - arm, PTEX_HALF);
      pc.fill();
      pc.beginPath();
      pc.moveTo(PTEX_HALF, PTEX_HALF - arm);
      pc.quadraticCurveTo(PTEX_HALF - w, PTEX_HALF, PTEX_HALF, PTEX_HALF + arm);
      pc.quadraticCurveTo(PTEX_HALF + w, PTEX_HALF, PTEX_HALF, PTEX_HALF - arm);
      pc.fill();
      pc.beginPath();
      pc.arc(PTEX_HALF, PTEX_HALF, PTEX_HALF * 0.12, 0, Math.PI * 2);
      pc.fillStyle = "rgba(255,255,240,0.9)";
      pc.fill();
      return cv;
    });

    // Diamond shape (shape 1) — per tone
    const diamondTextures = GOLD_TONES.map(([r, g, b]) => {
      const cv = makeParticleCanvas();
      const pc = cv.getContext("2d");
      const d = PTEX_HALF * 0.85;
      pc.fillStyle = `rgb(${r},${g},${b})`;
      pc.beginPath();
      pc.moveTo(PTEX_HALF, PTEX_HALF - d);
      pc.lineTo(PTEX_HALF + d * 0.35, PTEX_HALF);
      pc.lineTo(PTEX_HALF, PTEX_HALF + d);
      pc.lineTo(PTEX_HALF - d * 0.35, PTEX_HALF);
      pc.closePath();
      pc.fill();
      return cv;
    });

    // Glow dot (shape 2) — per tone (replaces per-particle createRadialGradient)
    const glowTextures = GOLD_TONES.map(([r, g, b]) => {
      const cv = makeParticleCanvas();
      const pc = cv.getContext("2d");
      const grd = pc.createRadialGradient(
        PTEX_HALF,
        PTEX_HALF,
        0,
        PTEX_HALF,
        PTEX_HALF,
        PTEX_HALF
      );
      grd.addColorStop(0, `rgb(${r},${g},${b})`);
      grd.addColorStop(0.4, `rgba(${r},${g},${b},0.35)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      pc.fillStyle = grd;
      pc.fillRect(0, 0, PTEX, PTEX);
      return cv;
    });

    // Halo texture — single warm glow (replaces per-particle createRadialGradient)
    const haloTex = (() => {
      const cv = makeParticleCanvas();
      const pc = cv.getContext("2d");
      const grd = pc.createRadialGradient(
        PTEX_HALF,
        PTEX_HALF,
        0,
        PTEX_HALF,
        PTEX_HALF,
        PTEX_HALF
      );
      grd.addColorStop(0, "rgba(255,230,150,1)");
      grd.addColorStop(1, "rgba(255,215,0,0)");
      pc.fillStyle = grd;
      pc.fillRect(0, 0, PTEX, PTEX);
      return cv;
    })();

    // Cursor glow texture — golden aura
    const GLOW_TEX = 128;
    const cursorGlowTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = GLOW_TEX;
      cv.height = GLOW_TEX;
      const pc = cv.getContext("2d");
      const cx = GLOW_TEX / 2;
      const grd = pc.createRadialGradient(cx, cx, 0, cx, cx, cx);
      grd.addColorStop(0, "rgba(255,220,100,0.15)");
      grd.addColorStop(0.4, "rgba(255,200,50,0.06)");
      grd.addColorStop(1, "rgba(255,180,0,0)");
      pc.fillStyle = grd;
      pc.fillRect(0, 0, GLOW_TEX, GLOW_TEX);
      return cv;
    })();

    const shapeLookup = [starTextures, diamondTextures, glowTextures];

    let raf;
    let skipFrame = false;
    function tick() {
      raf = requestAnimationFrame(tick);
      // Throttle to ~30fps — blobs and glitter don't need 60fps fidelity
      skipFrame = !skipFrame;
      if (skipFrame) return;

      const cc = configRef.current;

      smooth.x += (mouse.x - smooth.x) * (cc.brushSmoothing || 0.12);
      smooth.y += (mouse.y - smooth.y) * (cc.brushSmoothing || 0.12);

      // Compute cursor movement ONCE for both brush and glitter
      const cursorDx = smooth.x - prevX,
        cursorDy = smooth.y - prevY;
      const cursorMoved = Math.sqrt(cursorDx * cursorDx + cursorDy * cursorDy);
      const cursorActive = smooth.x > 0 && smooth.y > 0;

      // ── Mask decay — accelerates to full fade after idle period ──
      const idleMs = performance.now() - lastBrushTime;
      const idleThreshold = 8000; // start fading after 8s idle
      const idleRamp = 4000; // ramp to full fade over 4s
      let decayRate = (cc.brushFade || 0.018) * 0.5;
      if (lastBrushTime > 0 && idleMs > idleThreshold) {
        const ramp = Math.min(1, (idleMs - idleThreshold) / idleRamp);
        decayRate = decayRate + ramp * 0.06; // dramatically increase fade
      }
      const decay = 1 - decayRate;
      tCtx.clearRect(0, 0, W, H);
      tCtx.globalAlpha = decay;
      tCtx.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, W, H);
      tCtx.globalAlpha = 1;
      mCtx.clearRect(0, 0, W, H);
      const expand = cc.brushMaskExpand || 1.002;
      mCtx.drawImage(
        tmp,
        0,
        0,
        tmp.width,
        tmp.height,
        (-W * (expand - 1)) / 2,
        (-H * (expand - 1)) / 2,
        W * expand,
        H * expand
      );

      // ── Brush stamps (desktop only — no brush on touch devices) ──
      if (!IS_MOBILE && activeRef.current && mouse.x > 0 && mouse.y > 0) {
        const dx = smooth.x - prevX,
          dy = smooth.y - prevY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1.5) {
          const spacing = cc.brushSpacing || 4;
          const steps = Math.max(1, Math.ceil(dist / spacing));
          const bSize = cc.revealRadius * (cc.brushSizeMult || 0.4);
          for (let s = 0; s < steps; s++) {
            const t = s / steps;
            drawBrushStamp(
              prevX + dx * t,
              prevY + dy * t,
              bSize,
              cc.revealIntensity * (cc.brushOpacityMult || 0.1),
              cc
            );
          }
        }
      }
      prevX = smooth.x;
      prevY = smooth.y;

      // ── Blob gradients (texture-cached) ──
      const time = performance.now() * 0.001 * (cc.gradSpeed || 0.07);
      const rawTime = performance.now() * 0.001;
      const dim = Math.max(W, H);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#080810";
      ctx.fillRect(0, 0, W, H);

      // Update blob textures periodically for hue oscillation (~3×/sec at 30fps)
      // or immediately when theme changes (blobTexDirtyRef)
      blobTexFrame++;
      const refreshTex = blobTexDirtyRef.current || blobTexFrame % 10 === 0;
      if (blobTexDirtyRef.current) blobTexDirtyRef.current = false;

      ctx.globalCompositeOperation = "screen";
      const currentBlobs = blobsRef.current || [];
      for (let i = 0; i < currentBlobs.length; i++) {
        const blob = currentBlobs[i];
        const bx =
          W * (blob.x + Math.sin(time * blob.spdX + blob.phX) * blob.ampX);
        const by =
          H * (blob.y + Math.cos(time * blob.spdY + blob.phY) * blob.ampY);
        const br = dim * blob.r;
        const rot = blob.rotation + rawTime * blob.rotSpeed;

        if (refreshTex) {
          blob._hueOsc = Math.sin(rawTime * blob.hueOscSpeed) * blob.hueOscAmp;
          renderBlobTexture(i);
        }

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(rot);
        ctx.scale(blob.scaleX, blob.scaleY);
        ctx.drawImage(blobTextures[i], -br, -br, br * 2, br * 2);
        ctx.restore();
      }

      // ── Gold glitter trail — texture-cached rendering ──
      const isGold = (cc.gradColor1 || "").toLowerCase() === "#b8860b";
      if (!IS_MOBILE && isGold && glitterRef.current) {
        const gt = glitterRef.current;
        const trail = gt.trail;

        // Spawn new particles along cursor path
        const gSpread = cc.glitterSpread || 24;
        const gSzMin = cc.glitterSizeMin || 0.4;
        const gSzMax = cc.glitterSizeMax || 2.0;
        const gLifeMin = cc.glitterLifetimeMin || 4;
        const gLifeMax = cc.glitterLifetimeMax || 10;
        const gDriftMin = cc.glitterDriftMin || 8;
        const gDriftMax = cc.glitterDriftMax || 25;
        const gSpawnMax = cc.glitterSpawnRate || 12;
        const gPoolMax = Math.min(cc.glitterCount || 200, GLITTER_MAX);
        const gFadeExp = cc.glitterFadeExp || 0.8;

        if (cursorActive && cursorMoved > 0.5) {
          const spawnCount = Math.min(gSpawnMax, Math.ceil(cursorMoved));
          for (let s = 0; s < spawnCount; s++) {
            const t = s / spawnCount;
            const p = trail[gt.head % gPoolMax];
            if (!p.alive) glitterAlive++;
            p.x =
              smooth.x - cursorDx * (1 - t) + (Math.random() - 0.5) * gSpread;
            p.y =
              smooth.y - cursorDy * (1 - t) + (Math.random() - 0.5) * gSpread;
            p.alive = true;
            p.birth = rawTime;
            p.size = rand(gSzMin, gSzMax);
            p.shape = Math.floor(Math.random() * 3);
            p.tone = Math.floor(Math.random() * 5);
            p.speed = rand(2, 7);
            p.phase = Math.random() * Math.PI * 2;
            p.lifetime = rand(gLifeMin, gLifeMax);
            p.driftAngle = Math.random() * Math.PI * 2;
            p.driftSpeed = rand(gDriftMin, gDriftMax);
            gt.head++;
          }
        }

        // Ambient sparkles when cursor is still
        if (cursorActive && Math.random() < (cc.glitterIdleRate || 0.5)) {
          const p = trail[gt.head % gPoolMax];
          if (!p.alive) glitterAlive++;
          p.x = smooth.x + (Math.random() - 0.5) * gSpread * 1.6;
          p.y = smooth.y + (Math.random() - 0.5) * gSpread * 1.6;
          p.alive = true;
          p.birth = rawTime;
          p.size = rand(gSzMin, gSzMax * 0.7);
          p.shape = Math.floor(Math.random() * 3);
          p.tone = Math.floor(Math.random() * 5);
          p.speed = rand(3, 8);
          p.phase = Math.random() * Math.PI * 2;
          p.lifetime = rand(gLifeMin * 0.7, gLifeMax * 0.6);
          p.driftAngle = Math.random() * Math.PI * 2;
          p.driftSpeed = rand(gDriftMin * 0.6, gDriftMax * 0.6);
          gt.head++;
        }

        // Render alive particles using pre-rendered textures
        if (glitterAlive > 0) {
          const limit = Math.min(trail.length, gPoolMax);
          for (let i = 0; i < limit; i++) {
            const p = trail[i];
            if (!p.alive) continue;
            const age = rawTime - p.birth;
            if (age > p.lifetime) {
              p.alive = false;
              glitterAlive--;
              continue;
            }

            const drift = age * (p.driftSpeed || 0);
            const px = p.x + Math.cos(p.driftAngle || 0) * drift;
            const py = p.y + Math.sin(p.driftAngle || 0) * drift;

            const life = age / p.lifetime;
            const fade =
              life < 0.05 ? life / 0.05 : Math.pow(1 - life, gFadeExp);
            const sparkle = Math.pow(
              Math.sin(rawTime * p.speed + p.phase) * 0.5 + 0.5,
              2.5
            );
            const a = fade * (0.3 + sparkle * 0.7);
            if (a < 0.02) continue;

            const sz = p.size * (0.5 + sparkle * 0.5) * (0.7 + fade * 0.3);
            const tex = shapeLookup[p.shape % 3][p.tone % 5];
            const drawR = sz * 2;

            if (p.shape === 0 || p.shape === 1) {
              // Star/diamond — needs rotation
              ctx.save();
              ctx.globalAlpha = a;
              ctx.translate(px, py);
              ctx.rotate(p.phase + rawTime * (p.shape === 0 ? 0.15 : 0.3));
              ctx.drawImage(tex, -drawR, -drawR, drawR * 2, drawR * 2);
              ctx.restore();
            } else {
              // Glow dot — no rotation needed
              ctx.globalAlpha = a;
              ctx.drawImage(tex, px - drawR, py - drawR, drawR * 2, drawR * 2);
            }

            // Halo on bright particles
            if (a > 0.5) {
              const hR = sz * 3;
              ctx.globalAlpha = (a - 0.5) * 0.15;
              ctx.drawImage(haloTex, px - hR, py - hR, hR * 2, hR * 2);
            }
          }
          ctx.globalAlpha = 1;
        }

        // Warm cursor glow — pre-rendered texture
        if (cursorActive) {
          const glowR = 50 + Math.sin(rawTime * 2) * 10;
          ctx.drawImage(
            cursorGlowTex,
            smooth.x - glowR,
            smooth.y - glowR,
            glowR * 2,
            glowR * 2
          );

          // Orbiting sparkle ring — using star texture
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2 + rawTime * 1.8;
            const orbitR = 18 + Math.sin(rawTime * 3 + i * 1.2) * 8;
            const sx = smooth.x + Math.cos(ang) * orbitR;
            const sy = smooth.y + Math.sin(ang) * orbitR;
            const sp = Math.pow(Math.sin(rawTime * 5 + i * 1.6) * 0.5 + 0.5, 2);
            if (sp < 0.15) continue;
            const ssz = 1 + sp * 2;
            ctx.globalAlpha = sp * 0.85;
            ctx.drawImage(
              starTextures[0],
              sx - ssz * 2,
              sy - ssz * 2,
              ssz * 4,
              ssz * 4
            );
          }
          ctx.globalAlpha = 1;
        }
      }

      ctx.globalCompositeOperation = "source-over";

      // ── Apply mask ──
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}
