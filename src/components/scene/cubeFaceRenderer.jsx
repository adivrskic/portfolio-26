/**
 * cubeFaceRenderer.js
 *
 * Factory that creates all the face/wave drawing functions for the glass cube.
 * Encapsulates sparkle state and the full drawing pipeline.
 *
 * Usage:
 *   const renderer = createCubeFaceRenderer(canvas);
 *   renderer.drawCubeFace(dizzy, time, lookX, lookY, morph, colors, surprise, sleep, holdProg, happy, blink, expr);
 */

export function createCubeFaceRenderer(canvas) {
  const sCtx = canvas.getContext("2d");
  const smCx = 128,
    smCy = 128;

  // Gold theme sparkles — pre-rendered to avoid per-frame shadowBlur
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

  // Pre-render one sparkle texture per tone (star shape + baked glow)
  const SPTEX = 32;
  const sparkleTextures = GOLD_TONES.map(([r, g, b]) => {
    const cv = document.createElement("canvas");
    cv.width = SPTEX;
    cv.height = SPTEX;
    const pc = cv.getContext("2d");
    const cx = SPTEX / 2;
    // Soft glow background (replaces shadowBlur)
    const grd = pc.createRadialGradient(cx, cx, 0, cx, cx, cx);
    grd.addColorStop(0, `rgba(${r},${g},${b},0.5)`);
    grd.addColorStop(0.4, `rgba(${r},${g},${b},0.15)`);
    grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
    pc.fillStyle = grd;
    pc.fillRect(0, 0, SPTEX, SPTEX);
    // Star shape
    pc.fillStyle = `rgb(${r},${g},${b})`;
    pc.beginPath();
    const sz = cx * 0.55;
    for (let p = 0; p < 4; p++) {
      const a = (p / 4) * Math.PI * 2;
      const a2 = a + Math.PI / 4;
      pc.lineTo(cx + Math.cos(a) * sz * 2.5, cx + Math.sin(a) * sz * 2.5);
      pc.lineTo(cx + Math.cos(a2) * sz * 0.6, cx + Math.sin(a2) * sz * 0.6);
    }
    pc.closePath();
    pc.fill();
    return cv;
  });

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
      const sz = sp.size * (0.6 + twinkle * 0.4);
      const drawSz = sz * 3;
      sCtx.save();
      sCtx.globalAlpha = sparkAlpha;
      sCtx.translate(sx, sy);
      sCtx.rotate(time * 0.5 + sp.phase);
      sCtx.drawImage(
        sparkleTextures[sp.tone],
        -drawSz,
        -drawSz,
        drawSz * 2,
        drawSz * 2
      );
      sCtx.restore();
    }
  }

  function hexRgb(hex) {
    if (!hex || typeof hex !== "string") return { r: 180, g: 200, b: 255 };
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.substring(0, 2), 16) || 0,
      g: parseInt(h.substring(2, 4), 16) || 0,
      b: parseInt(h.substring(4, 6), 16) || 0,
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
    blink,
    ex
  ) {
    const lx = (lookX || 0) * 12;
    const ly = (lookY || 0) * -8;
    const sp = surprise || 0;
    const sl = sleep || 0;
    const hp = happy || 0;
    const bl = blink || 0;
    const X = ex || {};
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

      // #G — Weighted expression priority
      const WEIGHTS = {
        love: 10,
        startled: 9,
        shy: 8,
        cheeky: 7,
        proud: 6,
        wink: 5,
        phew: 4,
        curious: 3,
      };
      let domName = null,
        domScore = 0;
      for (const n in WEIGHTS) {
        const sc = (X[n] || 0) * WEIGHTS[n];
        if (sc > domScore) {
          domScore = sc;
          domName = n;
        }
      }
      const domVal = domName ? Math.min(1, X[domName] || 0) : 0;

      // Sharp crossfade: narrow overlap zone (~200ms) instead of full 0-1 range
      // Prevents seeing two ghost faces at once
      const blend = Math.min(1, Math.max(0, (domVal - 0.15) / 0.2));

      // #J — Idle eye drift
      const dX = X._driftX || 0;
      const dY = X._driftY || 0;
      const mVar = X._mouthVar || 0;

      // ── Helper: draw default eyes ──
      function defaultEyes(eAlpha) {
        if (eAlpha < 0.01) return;
        sCtx.save();
        sCtx.globalAlpha = a2 * eAlpha;
        sCtx.fillStyle = tint;
        sCtx.beginPath();
        sCtx.arc(eyeL.x + ox + dX, eyeL.y + oy + dY, eyeR_size, 0, Math.PI * 2);
        sCtx.fill();
        sCtx.beginPath();
        sCtx.arc(eyeR.x + ox + dX, eyeR.y + oy + dY, eyeR_size, 0, Math.PI * 2);
        sCtx.fill();
        sCtx.restore();
      }

      // ── Helper: draw default mouth ──
      function defaultMouth(mAlpha) {
        if (mAlpha < 0.01) return;
        sCtx.save();
        sCtx.globalAlpha = a2 * mAlpha;
        sCtx.strokeStyle = tint;
        sCtx.lineCap = "round";
        sCtx.lineWidth = 3.5;
        sCtx.beginPath();
        // Idle mouth variation — subtle curvature shift
        const mRadius = 26 + mVar * 4;
        sCtx.arc(fx + ox, fy + 2 + oy, mRadius, 0.25 * Math.PI, 0.75 * Math.PI);
        sCtx.stroke();
        sCtx.restore();
      }

      // ════ EYES ════
      // Special states override everything (blink, sleep, dizzy, surprise, happy)
      if (bl > 0.3) {
        sCtx.strokeStyle = tint;
        sCtx.lineWidth = 3;
        sCtx.lineCap = "round";
        [eyeL, eyeR].forEach((eye) => {
          sCtx.beginPath();
          sCtx.moveTo(eye.x + ox - 7, eye.y + oy);
          sCtx.lineTo(eye.x + ox + 7, eye.y + oy);
          sCtx.stroke();
        });
      } else if (sl > 0.3) {
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
        sCtx.strokeStyle = tint;
        sCtx.lineWidth = 2.5 + sp;
        [eyeL, eyeR].forEach((eye) => {
          sCtx.beginPath();
          sCtx.arc(eye.x + ox, eye.y + oy, eyeR_size, 0, Math.PI * 2);
          sCtx.stroke();
          sCtx.fillStyle = tint;
          sCtx.beginPath();
          sCtx.arc(eye.x + ox, eye.y + oy, 2.5, 0, Math.PI * 2);
          sCtx.fill();
        });
      } else if (dizzy >= 0.15) {
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
      } else if (hp > 0.3) {
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
      } else {
        // #2 — Expression blending: default base + expression overlay
        defaultEyes(1 - blend);

        if (blend > 0.01 && domName) {
          sCtx.save();
          sCtx.globalAlpha = a2 * blend;
          if (domName === "love") {
            sCtx.fillStyle = tint;
            [eyeL, eyeR].forEach((eye) => {
              const hx = eye.x + ox,
                hy = eye.y + oy - 2,
                hs = 8;
              sCtx.beginPath();
              sCtx.moveTo(hx, hy + hs * 0.4);
              sCtx.bezierCurveTo(
                hx,
                hy - hs * 0.5,
                hx - hs,
                hy - hs * 0.5,
                hx - hs,
                hy + hs * 0.1
              );
              sCtx.bezierCurveTo(
                hx - hs,
                hy + hs * 0.6,
                hx,
                hy + hs,
                hx,
                hy + hs
              );
              sCtx.bezierCurveTo(
                hx,
                hy + hs,
                hx + hs,
                hy + hs * 0.6,
                hx + hs,
                hy + hs * 0.1
              );
              sCtx.bezierCurveTo(
                hx + hs,
                hy - hs * 0.5,
                hx,
                hy - hs * 0.5,
                hx,
                hy + hs * 0.4
              );
              sCtx.fill();
            });
          } else if (domName === "proud") {
            sCtx.strokeStyle = tint;
            sCtx.lineWidth = 3;
            sCtx.lineCap = "round";
            [eyeL, eyeR].forEach((eye) => {
              sCtx.beginPath();
              sCtx.arc(eye.x + ox, eye.y + oy, 8, 1.1 * Math.PI, 1.9 * Math.PI);
              sCtx.stroke();
            });
            const skx = eyeR.x + ox + 14,
              sky = eyeR.y + oy - 10;
            sCtx.lineWidth = 1.5;
            for (let i = 0; i < 4; i++) {
              const a = (i / 4) * Math.PI * 2 + time * 2;
              sCtx.beginPath();
              sCtx.moveTo(skx + Math.cos(a), sky + Math.sin(a));
              sCtx.lineTo(skx + Math.cos(a) * 4, sky + Math.sin(a) * 4);
              sCtx.stroke();
            }
          } else if (domName === "cheeky") {
            sCtx.strokeStyle = tint;
            sCtx.lineWidth = 3;
            sCtx.lineCap = "round";
            [eyeL, eyeR].forEach((eye) => {
              sCtx.beginPath();
              sCtx.moveTo(eye.x + ox - 8, eye.y + oy + 1);
              sCtx.quadraticCurveTo(
                eye.x + ox,
                eye.y + oy - 4,
                eye.x + ox + 8,
                eye.y + oy + 1
              );
              sCtx.stroke();
            });
          } else if (domName === "wink") {
            sCtx.strokeStyle = tint;
            sCtx.lineWidth = 3;
            sCtx.lineCap = "round";
            sCtx.beginPath();
            sCtx.arc(
              eyeL.x + ox,
              eyeL.y + oy + 2,
              7,
              1.15 * Math.PI,
              1.85 * Math.PI
            );
            sCtx.stroke();
            sCtx.fillStyle = tint;
            sCtx.beginPath();
            sCtx.arc(eyeR.x + ox, eyeR.y + oy, 8, 0, Math.PI * 2);
            sCtx.fill();
          } else if (domName === "startled") {
            sCtx.strokeStyle = tint;
            sCtx.lineWidth = 2.5;
            [eyeL, eyeR].forEach((eye) => {
              sCtx.beginPath();
              sCtx.arc(eye.x + ox, eye.y + oy - 3, 12, 0, Math.PI * 2);
              sCtx.stroke();
              sCtx.fillStyle = tint;
              sCtx.beginPath();
              sCtx.arc(eye.x + ox, eye.y + oy - 3, 2, 0, Math.PI * 2);
              sCtx.fill();
            });
          } else if (domName === "shy") {
            sCtx.fillStyle = tint;
            const shyOff = -6;
            [eyeL, eyeR].forEach((eye) => {
              sCtx.beginPath();
              sCtx.arc(eye.x + ox + shyOff, eye.y + oy + 2, 6, 0, Math.PI * 2);
              sCtx.fill();
            });
            sCtx.globalAlpha = a2 * blend * 0.15;
            sCtx.fillStyle = "rgba(255,120,120,1)";
            sCtx.beginPath();
            sCtx.ellipse(
              eyeL.x + ox - 4,
              eyeL.y + oy + 16,
              12,
              6,
              0,
              0,
              Math.PI * 2
            );
            sCtx.fill();
            sCtx.beginPath();
            sCtx.ellipse(
              eyeR.x + ox + 4,
              eyeR.y + oy + 16,
              12,
              6,
              0,
              0,
              Math.PI * 2
            );
            sCtx.fill();
          } else if (domName === "curious") {
            sCtx.fillStyle = tint;
            sCtx.beginPath();
            sCtx.arc(eyeL.x + ox, eyeL.y + oy, 8, 0, Math.PI * 2);
            sCtx.fill();
            sCtx.beginPath();
            sCtx.arc(eyeR.x + ox, eyeR.y + oy, 8, 0, Math.PI * 2);
            sCtx.fill();
            sCtx.strokeStyle = tint;
            sCtx.lineWidth = 2.5;
            sCtx.lineCap = "round";
            sCtx.beginPath();
            sCtx.arc(
              eyeR.x + ox,
              eyeR.y + oy - 16,
              10,
              1.1 * Math.PI,
              1.9 * Math.PI
            );
            sCtx.stroke();
            sCtx.beginPath();
            sCtx.moveTo(eyeL.x + ox - 9, eyeL.y + oy - 14);
            sCtx.lineTo(eyeL.x + ox + 9, eyeL.y + oy - 14);
            sCtx.stroke();
          } else if (domName === "phew") {
            sCtx.strokeStyle = tint;
            sCtx.lineWidth = 3;
            sCtx.lineCap = "round";
            sCtx.beginPath();
            sCtx.arc(
              eyeL.x + ox,
              eyeL.y + oy + 2,
              7,
              1.0 * Math.PI,
              2.0 * Math.PI
            );
            sCtx.stroke();
            sCtx.beginPath();
            sCtx.arc(eyeR.x + ox, eyeR.y + oy, 6, 0, Math.PI * 2);
            sCtx.stroke();
            sCtx.fillStyle = tint;
            sCtx.beginPath();
            sCtx.arc(eyeR.x + ox, eyeR.y + oy + 1, 3, 0, Math.PI * 2);
            sCtx.fill();
            sCtx.fillStyle = tint;
            sCtx.globalAlpha = a2 * blend * 0.4;
            sCtx.beginPath();
            sCtx.ellipse(
              eyeR.x + ox + 14,
              eyeR.y + oy + 8 + Math.sin(time * 3) * 2,
              2.5,
              4,
              0,
              0,
              Math.PI * 2
            );
            sCtx.fill();
          }
          sCtx.restore();
        }
      }

      // ════ MOUTH ════
      sCtx.strokeStyle = tint;
      sCtx.lineCap = "round";

      // Special states override
      if (hp > 0.3) {
        sCtx.beginPath();
        sCtx.lineWidth = 4;
        sCtx.arc(fx + ox, fy - 6 + oy, 32, 0.25 * Math.PI, 0.75 * Math.PI);
        sCtx.stroke();
      } else if (sl > 0.3) {
        sCtx.beginPath();
        sCtx.lineWidth = 3;
        sCtx.moveTo(fx + ox - 12, fy + 8 + oy);
        sCtx.quadraticCurveTo(fx + ox, fy + 12 + oy, fx + ox + 12, fy + 8 + oy);
        sCtx.stroke();
      } else if (sp > 0.3) {
        sCtx.beginPath();
        sCtx.lineWidth = 3;
        const oSize = 10 + sp * 8;
        sCtx.arc(fx + ox, fy + 12 + oy, oSize, 0, Math.PI * 2);
        sCtx.stroke();
      } else if (dizzy >= 0.3) {
        sCtx.beginPath();
        const wobble = dizzy * 6;
        for (let i = 0; i <= 20; i++) {
          const t2 = i / 20;
          const angle = 0.25 * Math.PI + t2 * 0.5 * Math.PI;
          const wx = fx + ox + Math.cos(angle) * 26;
          const wy =
            fy +
            2 +
            oy +
            Math.sin(angle) * 26 +
            Math.sin(t2 * Math.PI * 3 + time * 5) * wobble;
          if (i === 0) sCtx.moveTo(wx, wy);
          else sCtx.lineTo(wx, wy);
        }
        sCtx.stroke();
      } else {
        // #2 — Blend: default mouth base + expression mouth overlay
        defaultMouth(1 - blend);

        if (blend > 0.01 && domName) {
          sCtx.save();
          sCtx.globalAlpha = a2 * blend;
          sCtx.strokeStyle = tint;
          sCtx.lineCap = "round";
          sCtx.beginPath();
          if (domName === "love") {
            sCtx.lineWidth = 3;
            sCtx.arc(fx + ox, fy + oy, 22, 0.3 * Math.PI, 0.7 * Math.PI);
          } else if (domName === "proud") {
            sCtx.lineWidth = 3;
            sCtx.arc(fx + ox, fy - 4 + oy, 20, 0.3 * Math.PI, 0.7 * Math.PI);
          } else if (domName === "cheeky") {
            sCtx.lineWidth = 4;
            sCtx.arc(fx + ox, fy - 2 + oy, 28, 0.2 * Math.PI, 0.8 * Math.PI);
            sCtx.stroke();
            sCtx.beginPath();
            sCtx.fillStyle = tint;
            sCtx.globalAlpha = a2 * blend * 0.35;
            sCtx.ellipse(fx + ox, fy + 24 + oy, 10, 8, 0, 0, Math.PI);
            sCtx.fill();
            sCtx.beginPath();
          } else if (domName === "wink") {
            sCtx.lineWidth = 3;
            sCtx.moveTo(fx + ox - 16, fy + 6 + oy);
            sCtx.quadraticCurveTo(
              fx + ox + 4,
              fy + 20 + oy,
              fx + ox + 18,
              fy + 2 + oy
            );
          } else if (domName === "startled") {
            sCtx.lineWidth = 2.5;
            sCtx.arc(fx + ox, fy + 10 + oy, 6, 0, Math.PI * 2);
          } else if (domName === "shy") {
            sCtx.lineWidth = 2.5;
            sCtx.moveTo(fx + ox - 10, fy + 6 + oy);
            sCtx.quadraticCurveTo(
              fx + ox,
              fy + 10 + oy,
              fx + ox + 10,
              fy + 6 + oy
            );
          } else if (domName === "curious") {
            sCtx.lineWidth = 3;
            sCtx.moveTo(fx + ox - 14, fy + 6 + oy);
            sCtx.quadraticCurveTo(
              fx + ox,
              fy + 4 + oy,
              fx + ox + 14,
              fy + 2 + oy
            );
          } else if (domName === "phew") {
            sCtx.lineWidth = 3;
            sCtx.moveTo(fx + ox - 14, fy + 4 + oy);
            sCtx.quadraticCurveTo(
              fx + ox - 2,
              fy + 16 + oy,
              fx + ox + 16,
              fy + oy
            );
          }
          sCtx.stroke();
          sCtx.restore();
        }
      }

      sCtx.restore();
    }

    drawFace(0, 0, faceColor(0.9), 0.75 + dizzy * 0.15);

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

  // Cached wave glow texture — re-rendered when theme changes
  const waveGlowCv = document.createElement("canvas");
  waveGlowCv.width = 256;
  waveGlowCv.height = 256;
  let waveGlowColor = "";

  function drawWaveLayer(time, alpha, colors) {
    sCtx.save();
    sCtx.globalAlpha = alpha;

    const cols = [
      hexRgb(colors?.[0]),
      hexRgb(colors?.[1]),
      hexRgb(colors?.[2]),
      hexRgb(colors?.[3]),
    ];

    // Glow center — cached, only re-render on theme change
    const glowKey = colors?.[1] || colors?.[0] || "";
    if (glowKey !== waveGlowColor) {
      waveGlowColor = glowKey;
      const gc = cols[1] || cols[0];
      const gCtx = waveGlowCv.getContext("2d");
      gCtx.clearRect(0, 0, 256, 256);
      const glow = gCtx.createRadialGradient(smCx, smCy, 8, smCx, smCy, 70);
      glow.addColorStop(0, `rgba(${gc.r},${gc.g},${gc.b},0.05)`);
      glow.addColorStop(1, `rgba(${gc.r},${gc.g},${gc.b},0)`);
      gCtx.fillStyle = glow;
      gCtx.fillRect(0, 0, 256, 256);
    }
    sCtx.drawImage(waveGlowCv, 0, 0);

    // ── Bars ──
    const totalW = 100;
    const barW = totalW / BAR_COUNT - 4;
    const startX = smCx - totalW / 2;

    for (let i = 0; i < BAR_COUNT; i++) {
      const colIdx = Math.min(
        cols.length - 1,
        Math.floor((i / BAR_COUNT) * cols.length)
      );
      const col = cols[colIdx];
      const h1 = Math.sin(time * barSpeeds[i] + barPhases[i]);
      const h2 = Math.sin(time * barSpeeds[i] * 1.3 + barPhases[i] * 0.7);
      const h3 = Math.cos(time * barSpeeds[i] * 0.5 + i);
      const height = (h1 * 0.5 + h2 * 0.3 + h3 * 0.2) * 55 + 8;
      const x = startX + (totalW / BAR_COUNT) * i;
      const barY = smCy - height / 2;
      const r = barW / 2;

      // Soft glow behind bar
      sCtx.fillStyle = `rgba(${col.r},${col.g},${col.b},0.06)`;
      sCtx.beginPath();
      sCtx.roundRect(x - 2, barY - 2, barW + 4, height + 4, r + 2);
      sCtx.fill();

      // Main bar
      sCtx.fillStyle = `rgba(${col.r},${col.g},${col.b},0.6)`;
      sCtx.beginPath();
      sCtx.roundRect(x, barY, barW, height, r);
      sCtx.fill();
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
    blink,
    ex
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
        blink,
        ex
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

      // Outer glow ring (wide, semi-transparent — no shadowBlur needed)
      sCtx.save();
      sCtx.globalAlpha = hp * 0.3;
      sCtx.strokeStyle = `rgba(${c2.r},${c2.g},${c2.b},0.4)`;
      sCtx.lineWidth = lineW + 12;
      sCtx.lineCap = "round";
      sCtx.beginPath();
      sCtx.arc(smCx, smCy, ringR * pulse, startAngle, endAngle);
      sCtx.stroke();
      sCtx.restore();

      // Main progress arc — soft glow layer underneath
      sCtx.save();
      sCtx.globalAlpha = (0.6 + hp * 0.35) * 0.3;
      sCtx.lineWidth = lineW + 6;
      sCtx.lineCap = "round";
      sCtx.strokeStyle = `rgba(${c1.r},${c1.g},${c1.b},0.3)`;
      sCtx.beginPath();
      sCtx.arc(smCx, smCy, ringR * pulse, startAngle, endAngle);
      sCtx.stroke();
      sCtx.restore();

      // Main progress arc — gradient segments
      sCtx.save();
      sCtx.globalAlpha = 0.6 + hp * 0.35;
      sCtx.lineWidth = lineW;
      sCtx.lineCap = "round";

      const steps = 20;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const a1 = startAngle + t * hp * Math.PI * 2;
        const a2 = startAngle + (t + 1 / steps) * hp * Math.PI * 2;
        const cr = Math.round(c1.r + (c2.r - c1.r) * t);
        const cg = Math.round(c1.g + (c2.g - c1.g) * t);
        const cb = Math.round(c1.b + (c2.b - c1.b) * t);
        sCtx.strokeStyle = `rgba(${cr},${cg},${cb},1)`;
        sCtx.beginPath();
        sCtx.arc(smCx, smCy, ringR * pulse, a1, a2 + 0.02);
        sCtx.stroke();
      }
      sCtx.restore();
    }
  }

  // Initial draw
  drawCubeFace(0, 0, 0, 0, 0, null, 0, 0, 0, 0, 0, null);

  return { drawCubeFace, canvas };
}
