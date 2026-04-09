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
    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
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

    // Glitter trail system (for gold theme) — spawns at cursor, drifts outward, fades
    const GLITTER_MAX = 800; // pool ceiling, actual count from config
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
    glitterRef.current = { trail: glitterTrail, head: glitterHead };

    let raf;
    function tick() {
      raf = requestAnimationFrame(tick);
      const cc = configRef.current;

      smooth.x += (mouse.x - smooth.x) * (cc.brushSmoothing || 0.12);
      smooth.y += (mouse.y - smooth.y) * (cc.brushSmoothing || 0.12);

      // Compute cursor movement ONCE for both brush and glitter
      const cursorDx = smooth.x - prevX,
        cursorDy = smooth.y - prevY;
      const cursorMoved = Math.sqrt(cursorDx * cursorDx + cursorDy * cursorDy);
      const cursorActive = smooth.x > 0 && smooth.y > 0;

      // ── Mask decay ──
      const decay = 1 - (cc.brushFade || 0.018) * 0.5;
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

      // ── Blob gradients ──
      const time = performance.now() * 0.001 * (cc.gradSpeed || 0.07);
      const rawTime = performance.now() * 0.001;
      const dim = Math.max(W, H);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#080810";
      ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = "screen";
      const currentBlobs = blobsRef.current || [];
      for (const blob of currentBlobs) {
        const bx =
          W * (blob.x + Math.sin(time * blob.spdX + blob.phX) * blob.ampX);
        const by =
          H * (blob.y + Math.cos(time * blob.spdY + blob.phY) * blob.ampY);
        const br = dim * blob.r;
        const hue =
          (blob.baseHue +
            blob.hueVar +
            Math.sin(rawTime * blob.hueOscSpeed) * blob.hueOscAmp +
            360) %
          360;
        const [r, g, b] = hslToRgb(hue, blob.sat, blob.lit);
        const rot = blob.rotation + rawTime * blob.rotSpeed;

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(rot);
        ctx.scale(blob.scaleX, blob.scaleY);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, br);
        grad.addColorStop(0, `rgba(${r},${g},${b},${blob.alpha})`);
        grad.addColorStop(0.3, `rgba(${r},${g},${b},${blob.alpha * 0.6})`);
        grad.addColorStop(0.6, `rgba(${r},${g},${b},${blob.alpha * 0.15})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(-br, -br, br * 2, br * 2);
        ctx.restore();
      }

      // ── Gold glitter trail — spawns at cursor, stays in place, fades out ──
      const isGold = (cc.gradColor1 || "").toLowerCase() === "#b8860b";
      if (!IS_MOBILE && isGold && glitterRef.current) {
        const gt = glitterRef.current;
        const trail = gt.trail;
        const GOLD_TONES = [
          [255, 215, 0],
          [255, 200, 80],
          [255, 230, 120],
          [255, 252, 230],
          [218, 165, 32],
        ];

        // Spawn new particles along cursor path — config-driven
        const gSpread = cc.glitterSpread || 24;
        const gSzMin = cc.glitterSizeMin || 0.4;
        const gSzMax = cc.glitterSizeMax || 2.0;
        const gLifeMin = cc.glitterLifetimeMin || 3;
        const gLifeMax = cc.glitterLifetimeMax || 8;
        const gDriftMin = cc.glitterDriftMin || 8;
        const gDriftMax = cc.glitterDriftMax || 25;
        const gSpawnMax = cc.glitterSpawnRate || 20;
        const gPoolMax = cc.glitterCount || 600;
        const gFadeExp = cc.glitterFadeExp || 0.8;

        if (cursorActive && cursorMoved > 0.5) {
          const spawnCount = Math.min(gSpawnMax, Math.ceil(cursorMoved));
          for (let s = 0; s < spawnCount; s++) {
            const t = s / spawnCount;
            const p = trail[gt.head % Math.min(trail.length, gPoolMax)];
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
          const p = trail[gt.head % Math.min(trail.length, gPoolMax)];
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

        // Render all alive particles
        for (const p of trail) {
          if (!p.alive) continue;
          const age = rawTime - p.birth;
          if (age > p.lifetime) {
            p.alive = false;
            continue;
          }

          // Outward drift from spawn point
          const drift = age * (p.driftSpeed || 0);
          const px = p.x + Math.cos(p.driftAngle || 0) * drift;
          const py = p.y + Math.sin(p.driftAngle || 0) * drift;

          // Slow fade: quick flash in, very gradual fade out
          const life = age / p.lifetime;
          const fade = life < 0.05 ? life / 0.05 : Math.pow(1 - life, gFadeExp);
          const sparkle = Math.pow(
            Math.sin(rawTime * p.speed + p.phase) * 0.5 + 0.5,
            2.5
          );
          const a = fade * (0.3 + sparkle * 0.7);
          if (a < 0.02) continue;

          const [gr, gg, gb] = GOLD_TONES[p.tone % GOLD_TONES.length];
          const sz = p.size * (0.5 + sparkle * 0.5) * (0.7 + fade * 0.3);

          if (p.shape === 0) {
            // 4-point star
            const armLen = sz * 2;
            const armW = sz * 0.15;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(p.phase + rawTime * 0.15);
            ctx.fillStyle = `rgba(${gr},${gg},${gb},${a})`;
            ctx.beginPath();
            ctx.moveTo(-armLen, 0);
            ctx.quadraticCurveTo(0, -armW, armLen, 0);
            ctx.quadraticCurveTo(0, armW, -armLen, 0);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, -armLen);
            ctx.quadraticCurveTo(-armW, 0, 0, armLen);
            ctx.quadraticCurveTo(armW, 0, 0, -armLen);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, sz * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,240,${a * 0.9})`;
            ctx.fill();
            ctx.restore();
          } else if (p.shape === 1) {
            // Diamond
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(p.phase + rawTime * 0.3);
            const ds = sz * 1.2;
            ctx.fillStyle = `rgba(${gr},${gg},${gb},${a * 0.9})`;
            ctx.beginPath();
            ctx.moveTo(0, -ds);
            ctx.lineTo(ds * 0.35, 0);
            ctx.lineTo(0, ds);
            ctx.lineTo(-ds * 0.35, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          } else {
            // Soft glow dot
            const grd = ctx.createRadialGradient(px, py, 0, px, py, sz * 1.8);
            grd.addColorStop(0, `rgba(${gr},${gg},${gb},${a})`);
            grd.addColorStop(0.4, `rgba(${gr},${gg},${gb},${a * 0.35})`);
            grd.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
            ctx.fillStyle = grd;
            ctx.fillRect(px - sz * 1.8, py - sz * 1.8, sz * 3.6, sz * 3.6);
          }

          // Subtle halo on bright particles
          if (a > 0.5) {
            const hR = sz * 3;
            const hGrd = ctx.createRadialGradient(px, py, 0, px, py, hR);
            hGrd.addColorStop(0, `rgba(255,230,150,${(a - 0.5) * 0.15})`);
            hGrd.addColorStop(1, `rgba(255,215,0,0)`);
            ctx.fillStyle = hGrd;
            ctx.fillRect(px - hR, py - hR, hR * 2, hR * 2);
          }
        }

        // ── Warm cursor glow — always visible while brushing in gold ──
        if (cursorActive) {
          // Soft golden aura around cursor
          const glowR = 50 + Math.sin(rawTime * 2) * 10;
          const cGrd = ctx.createRadialGradient(
            smooth.x,
            smooth.y,
            0,
            smooth.x,
            smooth.y,
            glowR
          );
          cGrd.addColorStop(0, "rgba(255,220,100,0.15)");
          cGrd.addColorStop(0.4, "rgba(255,200,50,0.06)");
          cGrd.addColorStop(1, "rgba(255,180,0,0)");
          ctx.fillStyle = cGrd;
          ctx.fillRect(
            smooth.x - glowR,
            smooth.y - glowR,
            glowR * 2,
            glowR * 2
          );

          // Orbiting sparkle ring
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2 + rawTime * 1.8;
            const orbitR = 18 + Math.sin(rawTime * 3 + i * 1.2) * 8;
            const sx = smooth.x + Math.cos(ang) * orbitR;
            const sy = smooth.y + Math.sin(ang) * orbitR;
            const sp = Math.pow(Math.sin(rawTime * 5 + i * 1.6) * 0.5 + 0.5, 2);
            if (sp < 0.15) continue;
            const ssz = 1 + sp * 2;
            // Star shape for orbiters
            ctx.save();
            ctx.translate(sx, sy);
            ctx.fillStyle = `rgba(255,248,200,${sp * 0.85})`;
            const al = ssz * 2;
            const aw = ssz * 0.15;
            ctx.beginPath();
            ctx.moveTo(-al, 0);
            ctx.quadraticCurveTo(0, -aw, al, 0);
            ctx.quadraticCurveTo(0, aw, -al, 0);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, -al);
            ctx.quadraticCurveTo(-aw, 0, 0, al);
            ctx.quadraticCurveTo(aw, 0, 0, -al);
            ctx.fill();
            ctx.restore();
          }
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
