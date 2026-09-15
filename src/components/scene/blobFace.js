/**
 * createBlobFace()
 *
 * The simplified face that lives inside the blob. Draws to a 256×256 canvas
 * that the blob shader samples (refracted, dispersed and blurred by the
 * surface motion), so nothing here needs to know about 3D.
 *
 * States, all 0..1 and blended rather than switched:
 *   lookX/lookY  cursor direction (-1..1), eyes and mouth slide toward it
 *   blink        eyelids closed
 *   sleep        eyes closed as soft arcs, mouth relaxed
 *   press        eyes squint, smile becomes a small "o"
 *   morph        crossfade to the chat-mode audio wave
 *   driftX/driftY/mouthVar  idle micro-motion
 */
export function createBlobFace(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const C = size / 2;
  const S = size / 256;

  const BAR_COUNT = 10;
  const barPhases = Array.from(
    { length: BAR_COUNT },
    () => Math.random() * Math.PI * 2
  );
  const barSpeeds = Array.from(
    { length: BAR_COUNT },
    () => 1.2 + Math.random() * 1.8
  );

  function rgb(hex) {
    if (!hex || typeof hex !== "string") return { r: 40, g: 46, b: 90 };
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.substring(0, 2), 16) || 0,
      g: parseInt(h.substring(2, 4), 16) || 0,
      b: parseInt(h.substring(4, 6), 16) || 0,
    };
  }
  const rgba = (c, a) => `rgba(${c.r},${c.g},${c.b},${a})`;

  function drawFace(s, alpha) {
    const c1 = rgb(s.colors?.[0]);
    const c2 = rgb(s.colors?.[1]);
    const pr = s.press || 0;
    const sl = s.sleep || 0;
    const bl = s.blink || 0;
    const lx = (s.lookX || 0) * 14 * S;
    const ly = -(s.lookY || 0) * 10 * S;
    const fx = C + lx + (s.driftX || 0) * S;
    const fy = C + ly + (s.driftY || 0) * S;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Soft theme-tinted glow so the face reads as lit from inside
    const glow = ctx.createRadialGradient(fx, fy, 6 * S, C, C, 96 * S);
    glow.addColorStop(0, rgba(c2, 0.16));
    glow.addColorStop(0.55, rgba(c1, 0.05));
    glow.addColorStop(1, rgba(c1, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // Eyes
    const eyeDX = 27 * S;
    const eyeY = (-12 - pr * 2) * S;
    const r = 9 * S;
    const open =
      Math.max(0.06, (1 - bl) * (1 - sl * 0.92)) * (1 - pr * 0.5);
    const ink = rgba(c1, 0.92);
    ctx.fillStyle = ink;
    for (const sx of [-1, 1]) {
      const ex = fx + sx * eyeDX;
      const ey = fy + eyeY;
      ctx.beginPath();
      ctx.ellipse(ex, ey, r, r * open, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Asleep: soft closed arcs over the slits
    if (sl > 0.3) {
      ctx.save();
      ctx.globalAlpha = alpha * Math.min(1, (sl - 0.3) / 0.4);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3 * S;
      ctx.lineCap = "round";
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(
          fx + sx * eyeDX,
          fy + eyeY + 2 * S,
          7 * S,
          0.15 * Math.PI,
          0.85 * Math.PI
        );
        ctx.stroke();
      }
      ctx.restore();
    }
    // Highlights that slide with the look direction
    if (open > 0.35) {
      ctx.fillStyle = `rgba(255,255,255,${0.85 * Math.min(1, (open - 0.35) / 0.3)})`;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(
          fx + sx * eyeDX - r * 0.3 + lx * 0.12,
          fy + eyeY - r * 0.35 * open + ly * 0.12,
          r * 0.3,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    // Mouth: smile ↔ "o" while pressed, relaxed line while asleep
    ctx.strokeStyle = ink;
    ctx.lineCap = "round";
    ctx.lineWidth = 3.5 * S;
    const smile = (1 - pr) * (1 - sl);
    if (smile > 0.02) {
      ctx.globalAlpha = alpha * smile;
      ctx.beginPath();
      ctx.arc(
        fx,
        fy + 4 * S,
        (24 + (s.mouthVar || 0) * 3) * S,
        0.25 * Math.PI,
        0.75 * Math.PI
      );
      ctx.stroke();
    }
    if (pr > 0.02) {
      ctx.globalAlpha = alpha * pr;
      ctx.beginPath();
      ctx.arc(fx, fy + 17 * S, (5 + pr * 6) * S, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (sl > 0.3) {
      ctx.globalAlpha = alpha * Math.min(1, (sl - 0.3) / 0.4) * (1 - pr);
      ctx.lineWidth = 3 * S;
      ctx.beginPath();
      ctx.moveTo(fx - 11 * S, fy + 13 * S);
      ctx.quadraticCurveTo(fx, fy + 17 * S, fx + 11 * S, fy + 13 * S);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Chat mode: the face gives way to a loose audio-wave visualiser
  function drawWave(s, alpha) {
    const cols = [0, 1, 2, 3].map((i) => rgb(s.colors?.[i]));
    const time = s.time || 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    const gc = cols[1];
    const glow = ctx.createRadialGradient(C, C, 8 * S, C, C, 70 * S);
    glow.addColorStop(0, rgba(gc, 0.06));
    glow.addColorStop(1, rgba(gc, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    const totalW = 100 * S;
    const barW = totalW / BAR_COUNT - 4 * S;
    const startX = C - totalW / 2;
    for (let i = 0; i < BAR_COUNT; i++) {
      const col = cols[Math.min(3, Math.floor((i / BAR_COUNT) * 4))];
      const h1 = Math.sin(time * barSpeeds[i] + barPhases[i]);
      const h2 = Math.sin(time * barSpeeds[i] * 1.3 + barPhases[i] * 0.7);
      const h3 = Math.cos(time * barSpeeds[i] * 0.5 + i);
      const height = ((h1 * 0.5 + h2 * 0.3 + h3 * 0.2) * 55 + 8) * S;
      const x = startX + (totalW / BAR_COUNT) * i;
      const y = C - height / 2;
      ctx.fillStyle = rgba(col, 0.06);
      ctx.beginPath();
      ctx.roundRect(x - 2 * S, y - 2 * S, barW + 4 * S, height + 4 * S, barW / 2 + 2 * S);
      ctx.fill();
      ctx.fillStyle = rgba(col, 0.7);
      ctx.beginPath();
      ctx.roundRect(x, y, barW, height, barW / 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function draw(s) {
    ctx.clearRect(0, 0, size, size);
    const morph = s.morph || 0;
    const faceAlpha = Math.max(0, 1 - morph * 2.5);
    const waveAlpha = Math.max(0, (morph - 0.5) * 2);
    if (faceAlpha > 0.01) drawFace(s, faceAlpha);
    if (waveAlpha > 0.01) drawWave(s, waveAlpha);
  }

  draw({});
  return { canvas, draw };
}
