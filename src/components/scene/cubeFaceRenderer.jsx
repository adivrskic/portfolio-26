/**
 * cubeFaceRenderer.js
 *
 * Factory that creates all the face/wave drawing functions for the glass cube.
 * Encapsulates sparkle state, glitch state, and the full drawing pipeline.
 *
 * Usage:
 *   const renderer = createCubeFaceRenderer(canvas);
 *   renderer.drawCubeFace(dizzy, time, lookX, lookY, morph, colors, surprise, sleep, holdProg, happy, blink, expr);
 */

export function createCubeFaceRenderer(canvas) {
  const sCtx = canvas.getContext("2d");
  const smCx = 128,
    smCy = 128;

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

      // ── Pick dominant new expression ──
      const exMax = Math.max(
        X.love || 0,
        X.proud || 0,
        X.cheeky || 0,
        X.wink || 0,
        X.startled || 0,
        X.shy || 0,
        X.curious || 0,
        X.phew || 0
      );

      // ════ EYES ════
      if ((X.love || 0) > 0.3 && (X.love || 0) >= exMax) {
        // Love — heart eyes
        sCtx.fillStyle = tint;
        [eyeL, eyeR].forEach((eye) => {
          const hx = eye.x + ox,
            hy = eye.y + oy - 2;
          const hs = 8;
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
          sCtx.bezierCurveTo(hx - hs, hy + hs * 0.6, hx, hy + hs, hx, hy + hs);
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
      } else if ((X.proud || 0) > 0.3 && (X.proud || 0) >= exMax) {
        // Proud — confident closed arcs + sparkle
        sCtx.strokeStyle = tint;
        sCtx.lineWidth = 3;
        sCtx.lineCap = "round";
        [eyeL, eyeR].forEach((eye) => {
          sCtx.beginPath();
          sCtx.arc(eye.x + ox, eye.y + oy, 8, 1.1 * Math.PI, 1.9 * Math.PI);
          sCtx.stroke();
        });
        // Tiny sparkle near right eye
        const skx = eyeR.x + ox + 14,
          sky = eyeR.y + oy - 10;
        sCtx.strokeStyle = tint;
        sCtx.lineWidth = 1.5;
        const skLen = 4;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + time * 2;
          sCtx.beginPath();
          sCtx.moveTo(skx + Math.cos(a) * 1, sky + Math.sin(a) * 1);
          sCtx.lineTo(skx + Math.cos(a) * skLen, sky + Math.sin(a) * skLen);
          sCtx.stroke();
        }
      } else if ((X.cheeky || 0) > 0.3 && (X.cheeky || 0) >= exMax) {
        // Cheeky — squinty narrow eyes
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
      } else if ((X.wink || 0) > 0.3 && (X.wink || 0) >= exMax) {
        // Wink — left eye closed arc, right eye open dot
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
      } else if ((X.startled || 0) > 0.3 && (X.startled || 0) >= exMax) {
        // Startled — extra wide circle eyes with small pupils
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
      } else if ((X.shy || 0) > 0.3 && (X.shy || 0) >= exMax) {
        // Shy — eyes looking away (offset), blush circles
        sCtx.fillStyle = tint;
        const shyOff = -6;
        sCtx.beginPath();
        sCtx.arc(eyeL.x + ox + shyOff, eyeL.y + oy + 2, 6, 0, Math.PI * 2);
        sCtx.fill();
        sCtx.beginPath();
        sCtx.arc(eyeR.x + ox + shyOff, eyeR.y + oy + 2, 6, 0, Math.PI * 2);
        sCtx.fill();
        // Blush
        sCtx.globalAlpha = a2 * 0.15;
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
        sCtx.globalAlpha = a2;
      } else if ((X.curious || 0) > 0.3 && (X.curious || 0) >= exMax) {
        // Curious — normal eyes but one eyebrow raised
        sCtx.fillStyle = tint;
        sCtx.beginPath();
        sCtx.arc(eyeL.x + ox, eyeL.y + oy, 8, 0, Math.PI * 2);
        sCtx.fill();
        sCtx.beginPath();
        sCtx.arc(eyeR.x + ox, eyeR.y + oy, 8, 0, Math.PI * 2);
        sCtx.fill();
        // Raised eyebrow on right
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
        // Flat eyebrow on left
        sCtx.beginPath();
        sCtx.moveTo(eyeL.x + ox - 9, eyeL.y + oy - 14);
        sCtx.lineTo(eyeL.x + ox + 9, eyeL.y + oy - 14);
        sCtx.stroke();
      } else if ((X.phew || 0) > 0.3 && (X.phew || 0) >= exMax) {
        // Phew — relief: one closed arc, one half-open + sweat drop
        sCtx.strokeStyle = tint;
        sCtx.lineWidth = 3;
        sCtx.lineCap = "round";
        // Left eye: closed arc (relieved)
        sCtx.beginPath();
        sCtx.arc(eyeL.x + ox, eyeL.y + oy + 2, 7, 1.0 * Math.PI, 2.0 * Math.PI);
        sCtx.stroke();
        // Right eye: half-open
        sCtx.beginPath();
        sCtx.arc(eyeR.x + ox, eyeR.y + oy, 6, 0, Math.PI * 2);
        sCtx.stroke();
        sCtx.beginPath();
        sCtx.fillStyle = tint;
        sCtx.arc(eyeR.x + ox, eyeR.y + oy + 1, 3, 0, Math.PI * 2);
        sCtx.fill();
        // Sweat drop
        sCtx.fillStyle = tint;
        sCtx.globalAlpha = a2 * 0.4;
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
        sCtx.globalAlpha = a2;
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
      if ((X.love || 0) > 0.3 && (X.love || 0) >= exMax) {
        sCtx.lineWidth = 3;
        sCtx.arc(fx + ox, fy + oy, 22, 0.3 * Math.PI, 0.7 * Math.PI);
      } else if ((X.proud || 0) > 0.3 && (X.proud || 0) >= exMax) {
        sCtx.lineWidth = 3;
        sCtx.arc(fx + ox, fy - 4 + oy, 20, 0.3 * Math.PI, 0.7 * Math.PI);
      } else if ((X.cheeky || 0) > 0.3 && (X.cheeky || 0) >= exMax) {
        sCtx.lineWidth = 4;
        sCtx.arc(fx + ox, fy - 2 + oy, 28, 0.2 * Math.PI, 0.8 * Math.PI);
        sCtx.stroke();
        sCtx.beginPath();
        sCtx.fillStyle = tint;
        sCtx.globalAlpha = a2 * 0.35;
        sCtx.ellipse(fx + ox, fy + 24 + oy, 10, 8, 0, 0, Math.PI);
        sCtx.fill();
        sCtx.globalAlpha = a2;
        sCtx.beginPath();
      } else if ((X.wink || 0) > 0.3 && (X.wink || 0) >= exMax) {
        sCtx.lineWidth = 3;
        sCtx.moveTo(fx + ox - 16, fy + 6 + oy);
        sCtx.quadraticCurveTo(
          fx + ox + 4,
          fy + 20 + oy,
          fx + ox + 18,
          fy + 2 + oy
        );
      } else if ((X.startled || 0) > 0.3 && (X.startled || 0) >= exMax) {
        sCtx.lineWidth = 2.5;
        sCtx.arc(fx + ox, fy + 10 + oy, 6, 0, Math.PI * 2);
      } else if ((X.shy || 0) > 0.3 && (X.shy || 0) >= exMax) {
        sCtx.lineWidth = 2.5;
        sCtx.moveTo(fx + ox - 10, fy + 6 + oy);
        sCtx.quadraticCurveTo(fx + ox, fy + 10 + oy, fx + ox + 10, fy + 6 + oy);
      } else if ((X.curious || 0) > 0.3 && (X.curious || 0) >= exMax) {
        sCtx.lineWidth = 3;
        sCtx.moveTo(fx + ox - 14, fy + 6 + oy);
        sCtx.quadraticCurveTo(fx + ox, fy + 4 + oy, fx + ox + 14, fy + 2 + oy);
      } else if ((X.phew || 0) > 0.3 && (X.phew || 0) >= exMax) {
        // Phew — crooked exhale smile
        sCtx.lineWidth = 3;
        sCtx.moveTo(fx + ox - 14, fy + 4 + oy);
        sCtx.quadraticCurveTo(fx + ox - 2, fy + 16 + oy, fx + ox + 16, fy + oy);
      } else if (hp > 0.3) {
        sCtx.lineWidth = 4;
        sCtx.arc(fx + ox, fy - 6 + oy, 32, 0.25 * Math.PI, 0.75 * Math.PI);
      } else if (sl > 0.3) {
        sCtx.lineWidth = 3;
        sCtx.moveTo(fx + ox - 12, fy + 8 + oy);
        sCtx.quadraticCurveTo(fx + ox, fy + 12 + oy, fx + ox + 12, fy + 8 + oy);
      } else if (sp > 0.3) {
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
    if (Math.random() < 0.03 + dizzy * 0.3) {
      sCtx.fillRect(
        0,
        Math.random() * 256,
        256,
        1 + Math.random() * (dizzy * 4)
      );
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
    const barW = totalW / BAR_COUNT - 2;
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
      const y = smCy - height / 2;

      // Bar
      sCtx.fillStyle = `rgba(${col.r},${col.g},${col.b},0.7)`;
      sCtx.beginPath();
      const r = barW / 2;
      sCtx.roundRect(x, y, barW, height, r);
      sCtx.fill();

      // Glow per bar
      sCtx.save();
      sCtx.globalAlpha = 0.15;
      sCtx.shadowColor = `rgba(${col.r},${col.g},${col.b},0.8)`;
      sCtx.shadowBlur = 8;
      sCtx.fillStyle = `rgba(${col.r},${col.g},${col.b},0.3)`;
      sCtx.beginPath();
      sCtx.roundRect(x, y, barW, height, r);
      sCtx.fill();
      sCtx.restore();
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

      // Main progress arc
      sCtx.save();
      sCtx.globalAlpha = 0.6 + hp * 0.35;
      sCtx.lineWidth = lineW;
      sCtx.lineCap = "round";
      sCtx.shadowColor = `rgba(${c1.r},${c1.g},${c1.b},0.5)`;
      sCtx.shadowBlur = 6 * pulse;

      const steps = 20;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const a1 = startAngle + t * hp * Math.PI * 2;
        const a2 = startAngle + (t + 1 / steps) * hp * Math.PI * 2;
        const r1 = hexRgb(colors?.[0]);
        const r2 = hexRgb(colors?.[1]);
        const cr = Math.round(r1.r + (r2.r - r1.r) * t);
        const cg = Math.round(r1.g + (r2.g - r1.g) * t);
        const cb = Math.round(r1.b + (r2.b - r1.b) * t);
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
