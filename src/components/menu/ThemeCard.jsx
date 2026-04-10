import { useEffect, useRef, useState, useCallback } from "react";
import { hexRGB } from "../../utils/color";
import { rand } from "../../utils/math";
import { FONT_FAMILY, DARK_RGBA } from "../../constants/style";

const F = FONT_FAMILY;
const D = DARK_RGBA;

function ThemeCard({ theme: t, isActive, onClick }) {
  const mainRef = useRef(null);
  const maskRef = useRef(null);
  const tmpRef = useRef(null);
  const bristlesRef = useRef(null);
  const blobsRef = useRef(null);
  const mouseRef = useRef({ x: -999, y: -999 });
  const smoothRef = useRef({ x: -999, y: -999 });
  const prevRef = useRef({ x: -999, y: -999 });
  const hoveringRef = useRef(false);
  const isActiveRef = useRef(false);
  const rafRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const revealRef = useRef(0);
  const prevActiveRef = useRef(false);
  const justMountedRef = useRef(true);
  const sparklesRef = useRef(null);
  const [cardLight, setCardLight] = useState(false);
  isActiveRef.current = isActive;

  // Init bristles + blobs once
  useEffect(() => {
    bristlesRef.current = Array.from({ length: 14 }, (_, i) => ({
      angle: (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.8,
      dist: 0.15 + Math.random() * 0.45,
      size: 0.25 + Math.random() * 0.45,
      opacity: 0.4 + Math.random() * 0.6,
    }));
    blobsRef.current = t.colors.flatMap((hex) => {
      const rgb = hexRGB(hex);
      return Array.from({ length: 3 }, () => ({
        x: rand(-0.1, 1.1),
        y: rand(-0.1, 1.1),
        r: rand(0.25, 0.6),
        rgb,
        alpha: rand(0.3, 0.8),
        spdX: rand(0.15, 0.5),
        spdY: rand(0.15, 0.5),
        phX: rand(0, Math.PI * 2),
        phY: rand(0, Math.PI * 2),
        ampX: rand(0.08, 0.25),
        ampY: rand(0.08, 0.25),
        scaleX: rand(0.6, 1.4),
        scaleY: rand(0.6, 1.4),
        rotation: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.15, 0.15),
      }));
    });
    maskRef.current = document.createElement("canvas");
    tmpRef.current = document.createElement("canvas");
    // Init sparkles for gold theme
    if (t.id === "gold") {
      sparklesRef.current = Array.from({ length: 28 }, () => ({
        x: rand(0, 1),
        y: rand(0, 1),
        size: rand(1, 3),
        alpha: rand(0.3, 1),
        speed: rand(0.4, 1.2),
        phase: rand(0, Math.PI * 2),
        drift: rand(-0.03, 0.03),
      }));
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [t.colors]);

  const resize = useCallback(() => {
    const cv = mainRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = Math.round(rect.width * dpr),
      h = Math.round(rect.height * dpr);
    for (const c of [cv, maskRef.current, tmpRef.current]) {
      if (c && (c.width !== w || c.height !== h)) {
        c.width = w;
        c.height = h;
      }
    }
    sizeRef.current = { w: rect.width, h: rect.height };
    // Set DPR transform on all contexts so we draw in CSS coords
    const d = dpr;
    cv.getContext("2d").setTransform(d, 0, 0, d, 0, 0);
    maskRef.current?.getContext("2d")?.setTransform(d, 0, 0, d, 0, 0);
    tmpRef.current?.getContext("2d")?.setTransform(d, 0, 0, d, 0, 0);
  }, []);

  const drawStamp = useCallback((x, y, size, opacity) => {
    const mCtx = maskRef.current?.getContext("2d");
    if (!mCtx || !bristlesRef.current) return;
    for (const b of bristlesRef.current) {
      const bx = x + Math.cos(b.angle) * b.dist * size;
      const by = y + Math.sin(b.angle) * b.dist * size;
      const bs = b.size * size;
      const a = opacity * b.opacity;
      const g = mCtx.createRadialGradient(bx, by, 0, bx, by, bs);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.5, `rgba(255,255,255,${a * 0.5})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      mCtx.fillStyle = g;
      mCtx.beginPath();
      mCtx.arc(bx, by, bs, 0, Math.PI * 2);
      mCtx.fill();
    }
    const cg = mCtx.createRadialGradient(x, y, 0, x, y, size * 0.5);
    cg.addColorStop(0, `rgba(255,255,255,${opacity * 0.6})`);
    cg.addColorStop(0.7, `rgba(255,255,255,${opacity * 0.15})`);
    cg.addColorStop(1, "rgba(255,255,255,0)");
    mCtx.fillStyle = cg;
    mCtx.beginPath();
    mCtx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    mCtx.fill();
  }, []);

  const tick = useCallback(() => {
    const cv = mainRef.current,
      mask = maskRef.current,
      tmp = tmpRef.current;
    if (!cv || !mask || !tmp) return;
    const ctx = cv.getContext("2d"),
      mCtx = mask.getContext("2d"),
      tCtx = tmp.getContext("2d");
    let { w, h } = sizeRef.current;
    if (!w || !h) {
      resize();
      w = sizeRef.current.w;
      h = sizeRef.current.h;
      if (!w || !h) {
        if (hoveringRef.current || isActiveRef.current) {
          rafRef.current = requestAnimationFrame(tick);
        }
        return;
      }
    }

    smoothRef.current.x += (mouseRef.current.x - smoothRef.current.x) * 0.12;
    smoothRef.current.y += (mouseRef.current.y - smoothRef.current.y) * 0.12;

    const decay = 0.98;
    tCtx.clearRect(0, 0, w, h);
    tCtx.globalAlpha = decay;
    tCtx.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, w, h);
    tCtx.globalAlpha = 1;
    mCtx.clearRect(0, 0, w, h);
    const ex = 1.002;
    mCtx.drawImage(
      tmp,
      0,
      0,
      tmp.width,
      tmp.height,
      (-w * (ex - 1)) / 2,
      (-h * (ex - 1)) / 2,
      w * ex,
      h * ex
    );

    if (hoveringRef.current && mouseRef.current.x > 0) {
      const dx = smoothRef.current.x - prevRef.current.x;
      const dy = smoothRef.current.y - prevRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1.5) {
        const steps = Math.max(1, Math.ceil(dist / 4));
        const bSize = Math.min(w, h) * 0.35;
        for (let s = 0; s < steps; s++) {
          const p = s / steps;
          drawStamp(
            prevRef.current.x + dx * p,
            prevRef.current.y + dy * p,
            bSize,
            0.1
          );
        }
      }
    }
    prevRef.current.x = smoothRef.current.x;
    prevRef.current.y = smoothRef.current.y;

    const time = performance.now() * 0.001;
    const dim = Math.max(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#080810";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "screen";
    for (const blob of blobsRef.current || []) {
      const bx =
        w * (blob.x + Math.sin(time * blob.spdX + blob.phX) * blob.ampX);
      const by =
        h * (blob.y + Math.cos(time * blob.spdY + blob.phY) * blob.ampY);
      const br = dim * blob.r;
      const [r, g, b] = blob.rgb;
      const rot = blob.rotation + time * blob.rotSpeed;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rot);
      ctx.scale(blob.scaleX, blob.scaleY);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, br);
      gr.addColorStop(0, `rgba(${r},${g},${b},${blob.alpha})`);
      gr.addColorStop(0.3, `rgba(${r},${g},${b},${blob.alpha * 0.6})`);
      gr.addColorStop(0.6, `rgba(${r},${g},${b},${blob.alpha * 0.15})`);
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(-br, -br, br * 2, br * 2);
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";

    // Gradual reveal: only when active (clicked). Hover just shows brush strokes.
    if (isActiveRef.current) {
      revealRef.current = Math.min(1, revealRef.current + 0.12);
    } else {
      revealRef.current = Math.max(0, revealRef.current - 0.04);
    }
    prevActiveRef.current = isActiveRef.current;

    // Canvas visible when hovering (brush strokes) or revealing/decaying (active)
    if (mainRef.current) {
      const revealOp = Math.min(1, revealRef.current * 2.5);
      mainRef.current.style.opacity = hoveringRef.current
        ? "1"
        : String(revealOp);
    }

    const reveal = revealRef.current;
    if (reveal < 1) {
      // Draw a radial reveal circle from center onto the mask, then composite
      const cx = w * 0.5,
        cy = h * 0.5;
      const maxR = Math.sqrt(cx * cx + cy * cy);
      const revealR = maxR * reveal;
      if (revealR > 0) {
        // Add the reveal circle to the existing mask
        const rg = mCtx.createRadialGradient(
          cx,
          cy,
          revealR * 0.7,
          cx,
          cy,
          revealR
        );
        rg.addColorStop(0, "rgba(255,255,255,1)");
        rg.addColorStop(1, "rgba(255,255,255,0)");
        mCtx.fillStyle = rg;
        mCtx.beginPath();
        mCtx.arc(cx, cy, revealR, 0, Math.PI * 2);
        mCtx.fill();
      }
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    }

    // Gold sparkles
    if (sparklesRef.current && (isActiveRef.current || hoveringRef.current)) {
      const st = performance.now() * 0.001;
      ctx.globalCompositeOperation = "screen";
      for (const sp of sparklesRef.current) {
        const flickr = Math.sin(st * sp.speed * 3 + sp.phase);
        const a = sp.alpha * (0.4 + 0.6 * Math.max(0, flickr));
        if (a < 0.05) continue;
        const sx = w * (sp.x + Math.sin(st * sp.drift * 4 + sp.phase) * 0.04);
        const sy =
          h * (sp.y + Math.cos(st * sp.drift * 3 + sp.phase * 1.3) * 0.04);
        const r = sp.size * (0.8 + 0.4 * Math.max(0, flickr));

        // Draw 4-point star
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(st * 0.3 + sp.phase);
        ctx.fillStyle = `rgba(255,223,100,${a})`;
        ctx.beginPath();
        const arm = r * 2.5;
        const thick = r * 0.4;
        ctx.moveTo(0, -arm);
        ctx.quadraticCurveTo(thick, -thick, arm, 0);
        ctx.quadraticCurveTo(thick, thick, 0, arm);
        ctx.quadraticCurveTo(-thick, thick, -arm, 0);
        ctx.quadraticCurveTo(-thick, -thick, 0, -arm);
        ctx.fill();

        // Core glow
        const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.5);
        gg.addColorStop(0, `rgba(255,248,200,${a * 0.8})`);
        gg.addColorStop(1, `rgba(255,223,100,0)`);
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    try {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const sx = Math.floor(w * 0.5 * dpr),
        sy = Math.floor(h * 0.5 * dpr);
      if (sx > 0 && sy > 0 && sx < cv.width && sy < cv.height) {
        const px = ctx.getImageData(sx, sy, 1, 1).data;
        const a = px[3] / 255;
        if (a > 0.15) {
          const lum = (px[0] * 0.299 + px[1] * 0.587 + px[2] * 0.114) / 255;
          setCardLight(lum < 0.45);
        } else {
          setCardLight(false);
        }
      }
    } catch {}

    if (
      hoveringRef.current ||
      isActiveRef.current ||
      revealRef.current > 0.001
    ) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      const sample = mCtx.getImageData(
        Math.floor(w * 0.5),
        Math.floor(h * 0.5),
        1,
        1
      ).data;
      if (sample[3] > 1) rafRef.current = requestAnimationFrame(tick);
    }
  }, [drawStamp, resize]);

  const onMove = useCallback((e) => {
    const cv = mainRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  }, []);

  const onEnter = useCallback(
    (e) => {
      hoveringRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      resize();
      const cv = mainRef.current;
      if (cv) {
        const rect = cv.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        mouseRef.current = { x, y };
        smoothRef.current = { x, y };
        prevRef.current = { x, y };
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [resize, tick]
  );

  const onLeave = useCallback(() => {
    hoveringRef.current = false;
    mouseRef.current = { x: -999, y: -999 };
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [resize]);

  useEffect(() => {
    if (!isActive) {
      // Keep the loop running so revealRef can decay smoothly
      if (revealRef.current > 0) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
      }
      justMountedRef.current = false;
      return;
    }
    // Already selected when section opens — fill immediately
    if (justMountedRef.current) {
      revealRef.current = 1;
      prevActiveRef.current = true;
    }
    justMountedRef.current = false;
    const frame = requestAnimationFrame(() => {
      resize();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [isActive, resize, tick]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseMove={onMove}
      role="button"
      tabIndex={0}
      style={{
        flex: 1,
        padding: 0,
        borderRadius: 14,
        border: "0.5px solid " + D + "0.04)",
        cursor: "pointer",
        background: "transparent",
        opacity: 1,
        filter: "none",
        transition: "border-color 0.3s, transform 0.3s",
        transform: "scale(1)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={mainRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          borderRadius: 14,
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0,
          transition: "opacity 0.1s",
        }}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 16,
          position: "relative",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: cardLight ? "rgba(255,255,255,0.08)" : D + "0.03)",
            border:
              "0.5px solid " +
              (cardLight ? "rgba(255,255,255,0.12)" : D + "0.06)"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.4s, border-color 0.4s",
          }}
        >
          {t.icon(cardLight ? "rgba(255,255,255,0.8)" : D + "0.55)")}
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 400,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: cardLight ? "rgba(255,255,255,0.75)" : D + "0.5)",
            fontFamily: F,
            transition: "color 0.4s",
          }}
        >
          {t.label}
        </span>
      </div>
    </div>
  );
}

// ── Main ──

export default ThemeCard;
