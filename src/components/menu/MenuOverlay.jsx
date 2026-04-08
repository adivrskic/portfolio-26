import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import ContactForm from "../contact/ContactForm";
import { Flower2, Sun, Leaf, Snowflake, X } from "lucide-react";
import { hexToRgba, hexRGB } from "../../utils/color";
import { rand } from "../../utils/math";
import { FONT_FAMILY, DARK_RGBA } from "../../constants/style";
import { THEMES } from "../../constants/themes";
import { MENU_PROJECTS, SPECS } from "../../constants/projects";

import "./MenuOverlay.css";

const F = FONT_FAMILY;
const D = DARK_RGBA;

const PROJECTS = MENU_PROJECTS;

// ── Paint-stroke theme card (mirrors GradientBackground system) ──

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

    if (!isActiveRef.current) {
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, w, h);
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

    if (hoveringRef.current || isActiveRef.current) {
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

  const onMove = useCallback(
    (e) => {
      if (t.locked) return;
      const cv = mainRef.current;
      if (!cv) return;
      const rect = cv.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    },
    [t.locked]
  );

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
    if (!isActive) return;
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
        border: isActive
          ? "1.5px solid " + D + "0.22)"
          : "0.5px solid " + D + "0.04)",
        cursor: t.locked ? "default" : "pointer",
        background: "transparent",
        opacity: t.locked ? 0.2 : 1,
        filter: t.locked ? "grayscale(0.6)" : "none",
        transition: "border-color 0.3s, transform 0.3s",
        transform: isActive ? "scale(1.02)" : "scale(1)",
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
export default function MenuOverlay({
  open,
  onClose,
  config: c,
  onThemeChange,
  activeSeason,
  goldUnlocked,
}) {
  const [mounted, setMounted] = useState(false);
  const [section, setSection] = useState("about");
  const [hovered, setHovered] = useState(null);
  const [goldPop, setGoldPop] = useState(false);

  const panelRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const closeBtnRef = useRef(null);
  const nameRef = useRef(null);
  const stgRef = useRef(null);
  const tlRef = useRef(null);
  const sectionTlRef = useRef(null);
  const elRefs = useRef([]);
  const ir = (i) => (el) => {
    elRefs.current[i] = el;
  };

  const initialOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setSection("about");
      initialOpenRef.current = true;
    }
  }, [open]);

  const animateContentIn = useCallback(() => {
    if (!stgRef.current) return;
    if (sectionTlRef.current) sectionTlRef.current.kill();
    const kids = stgRef.current.querySelectorAll("[data-stg]");
    if (!kids.length) return;
    gsap.set(kids, { opacity: 0, y: 14 });
    const tl = gsap.timeline();
    sectionTlRef.current = tl;
    tl.to(kids, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.12,
      ease: "power2.out",
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const frame = requestAnimationFrame(() => {
      const p = panelRef.current;
      const lp = leftRef.current;
      const rp = rightRef.current;
      const cb = closeBtnRef.current;
      if (!p) return;
      const nm = nameRef.current;
      const els = elRefs.current.filter(Boolean);
      if (tlRef.current) tlRef.current.kill();
      const tl = gsap.timeline({ onReverseComplete: () => setMounted(false) });
      tlRef.current = tl;
      if (open) {
        tl.set(p, { visibility: "visible", pointerEvents: "auto" });
        if (lp)
          tl.fromTo(
            lp,
            { clipPath: "inset(0 0 0 100%)" },
            {
              clipPath: "inset(0 0 0 0%)",
              duration: 0.9,
              ease: "power3.inOut",
            },
            0
          );
        if (rp)
          tl.fromTo(
            rp,
            { clipPath: "inset(0 100% 0 0)" },
            {
              clipPath: "inset(0 0% 0 0)",
              duration: 0.9,
              ease: "power3.inOut",
            },
            0.08
          );
        if (cb)
          tl.fromTo(
            cb,
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" },
            0.6
          );
        if (nm)
          tl.fromTo(
            nm,
            { opacity: 0, y: -10, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power2.out" },
            0.5
          );
        els.forEach((el, i) => {
          tl.fromTo(
            el,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
            0.55 + i * 0.12
          );
        });
        tl.call(() => animateContentIn(), [], 0.8);
      } else {
        if (stgRef.current) {
          const kids = stgRef.current.querySelectorAll("[data-stg]");
          tl.to(
            kids,
            {
              opacity: 0,
              y: -8,
              duration: 0.15,
              stagger: 0.015,
              ease: "power2.in",
            },
            0
          );
        }
        els.forEach((el, i) => {
          tl.to(
            el,
            { opacity: 0, y: -8, duration: 0.15, ease: "power2.in" },
            0.04 + i * 0.015
          );
        });
        if (nm)
          tl.to(
            nm,
            {
              opacity: 0,
              y: -6,
              scale: 0.98,
              duration: 0.15,
              ease: "power2.in",
            },
            0.02
          );
        if (cb)
          tl.to(
            cb,
            { scale: 0, opacity: 0, duration: 0.2, ease: "power2.in" },
            0.05
          );
        if (lp)
          tl.to(
            lp,
            {
              clipPath: "inset(0 0 0 100%)",
              duration: 0.55,
              ease: "power3.inOut",
            },
            0.15
          );
        if (rp)
          tl.to(
            rp,
            {
              clipPath: "inset(0 100% 0 0)",
              duration: 0.55,
              ease: "power3.inOut",
            },
            0.18
          );
        tl.set(p, { visibility: "hidden", pointerEvents: "none" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, mounted, animateContentIn]);

  const switchSection = useCallback(
    (id) => {
      if (id === section) return;
      if (!stgRef.current) {
        setSection(id);
        return;
      }
      const kids = stgRef.current.querySelectorAll("[data-stg]");
      if (kids.length) {
        gsap.to(kids, {
          opacity: 0,
          y: -8,
          duration: 0.25,
          stagger: 0.04,
          ease: "power2.in",
          onComplete: () => setSection(id),
        });
      } else {
        setSection(id);
      }
    },
    [section]
  );

  useEffect(() => {
    if (!mounted || !open) return;
    if (initialOpenRef.current) {
      initialOpenRef.current = false;
      return;
    }
    animateContentIn();
  }, [section, mounted, open, animateContentIn]);

  const pickTheme = useCallback(
    (t) => {
      if (t.locked) {
        setGoldPop(true);
        setTimeout(() => setGoldPop(false), 2000);
        return;
      }
      if (onThemeChange)
        onThemeChange(
          {
            gradColor1: t.colors[0],
            gradColor2: t.colors[1],
            gradColor3: t.colors[2],
            gradColor4: t.colors[3],
          },
          t.id
        );
    },
    [onThemeChange]
  );

  if (!mounted) return null;

  const blur = c.menuBlur ?? 28;
  const bgOp = c.menuBgOpacity ?? 0.85;
  const T = hexToRgba(c.menuTextColor || "#1a1a2e");
  const NAV = [
    { id: "about", label: "About" },
    { id: "work", label: "Work" },
    { id: "contact", label: "Contact" },
    { id: "theme", label: "Theme" },
  ];
  const feat = PROJECTS.find((p) => p.featured);
  const rest = PROJECTS.filter((p) => !p.featured);
  const themes = THEMES.map((t) =>
    t.id === "gold" ? { ...t, locked: !goldUnlocked } : t
  );

  return (
    <>
      <div
        ref={panelRef}
        className="menu-wrapper"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        style={{ "--panel-solid": "rgb(232,232,238)" }}
      >
        {/* ═══ LEFT PANEL ═══ */}
        <div
          ref={leftRef}
          className="menu-panel menu-panel--left"
          style={{
            background: `rgba(232,232,238,${bgOp})`,
            backdropFilter: `blur(${blur}px) saturate(1.15)`,
            WebkitBackdropFilter: `blur(${blur}px) saturate(1.15)`,
          }}
        >
          <div ref={nameRef} className="menu-name-left">
            <p
              className="menu-name"
              style={{ color: T + "0.65)", fontFamily: F }}
            >
              Adi
            </p>
          </div>

          <div className="menu-nav">
            {NAV.map((nav, i) => {
              const active = section === nav.id;
              const hover = hovered === nav.id && !active;
              return (
                <div
                  key={nav.id}
                  ref={ir(i)}
                  onClick={() => switchSection(nav.id)}
                  onMouseEnter={() => setHovered(nav.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="menu-nav-item"
                >
                  <span
                    className="menu-nav-label"
                    style={{
                      fontFamily: F,
                      letterSpacing: active ? "0.6em" : "0.2em",
                      marginRight: active ? "-0.6em" : "-0.2em",
                      color: T + (active ? "0.88)" : hover ? "0.55)" : "0.25)"),
                    }}
                  >
                    {nav.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div
          ref={rightRef}
          className="menu-panel menu-panel--right"
          style={{
            background: `rgba(232,232,238,${bgOp})`,
            backdropFilter: `blur(${blur}px) saturate(1.15)`,
            WebkitBackdropFilter: `blur(${blur}px) saturate(1.15)`,
          }}
        >
          <div className="menu-name-right">
            <p
              className="menu-name"
              style={{ color: T + "0.65)", fontFamily: F }}
            >
              Vrskic
            </p>
          </div>

          <div
            style={{
              flex: 1,
              padding: "20px 48px 80px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            <div
              ref={stgRef}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              {/* ═══ ABOUT — vertically centered ═══ */}
              {section === "about" && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    maxWidth: 800,
                  }}
                >
                  <div data-stg style={{ marginBottom: 20 }}>
                    <h2
                      style={{
                        fontSize: 28,
                        fontWeight: 200,
                        color: T + "0.92)",
                        fontFamily: F,
                        letterSpacing: "0.04em",
                        margin: 0,
                        lineHeight: 1.4,
                        maxWidth: 520,
                      }}
                    >
                      Designing interactive 3D experiences powered by AI.
                    </h2>
                  </div>
                  <div data-stg style={{ marginBottom: 14 }}>
                    <p
                      style={{
                        fontSize: 15,
                        color: T + "0.7)",
                        lineHeight: 2,
                        fontFamily: F,
                        fontWeight: 300,
                        maxWidth: 500,
                        margin: 0,
                      }}
                    >
                      I specialize in 3D interaction design, WebGL development,
                      and integrating AI into websites and applications. From
                      immersive product configurators to intelligent interfaces,
                      I build things that feel alive.
                    </p>
                  </div>
                  <div data-stg style={{ marginBottom: 28 }}>
                    <p
                      style={{
                        fontSize: 15,
                        color: T + "0.58)",
                        lineHeight: 2,
                        fontFamily: F,
                        fontWeight: 300,
                        maxWidth: 500,
                        margin: 0,
                      }}
                    >
                      Currently focused on real-time 3D for the web, AI-powered
                      interfaces, and generative design systems. Every project
                      is an opportunity to push the craft forward.
                    </p>
                  </div>
                  <div
                    data-stg
                    style={{ display: "flex", gap: 7, flexWrap: "wrap" }}
                  >
                    {SPECS.map((s) => (
                      <span
                        key={s}
                        style={{
                          fontSize: 11,
                          padding: "7px 16px",
                          borderRadius: 6,
                          background: T + "0.025)",
                          border: "0.5px solid " + T + "0.08)",
                          color: T + "0.6)",
                          fontFamily: F,
                          fontWeight: 300,
                          display: "inline-block",
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ WORK — hero + 3-col ═══ */}
              {section === "work" && (
                <>
                  {feat && (
                    <div
                      data-stg
                      style={{
                        padding: "28px 28px 24px",
                        borderRadius: 14,
                        border: "0.5px solid " + T + "0.08)",
                        marginBottom: 12,
                        cursor: "pointer",
                        transition: "border-color 0.3s, background 0.3s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = T + "0.18)";
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = T + "0.08)";
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          marginBottom: 10,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 20,
                            fontWeight: 300,
                            color: T + "0.88)",
                            fontFamily: F,
                            letterSpacing: "0.04em",
                            display: "inline-block",
                          }}
                        >
                          {feat.title}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: T + "0.40)",
                            fontFamily: F,
                            letterSpacing: "0.1em",
                          }}
                        >
                          FEATURED · {feat.year}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 300,
                          color: T + "0.6)",
                          fontFamily: F,
                          lineHeight: 1.7,
                          margin: "0 0 10px",
                          maxWidth: 500,
                        }}
                      >
                        {feat.desc}
                      </p>
                      <span
                        style={{
                          fontSize: 10,
                          color: T + "0.55)",
                          fontFamily: F,
                          fontWeight: 300,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {feat.tech}
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 10,
                      flex: 1,
                    }}
                  >
                    {rest.map((p, j) => (
                      <div
                        key={j}
                        data-stg
                        style={{
                          padding: "18px 18px 14px",
                          borderRadius: 12,
                          border: "0.5px solid " + T + "0.08)",
                          cursor: "pointer",
                          transition: "border-color 0.3s, background 0.3s",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = T + "0.18)";
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = T + "0.08)";
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "baseline",
                              marginBottom: 8,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 15,
                                fontWeight: 400,
                                color: T + "0.85)",
                                fontFamily: F,
                                display: "inline-block",
                              }}
                            >
                              {p.title}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                color: T + "0.35)",
                                fontFamily: F,
                              }}
                            >
                              {p.year}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 300,
                              color: T + "0.55)",
                              fontFamily: F,
                              lineHeight: 1.65,
                            }}
                          >
                            {p.desc}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: T + "0.40)",
                            fontFamily: F,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            marginTop: 12,
                          }}
                        >
                          {p.tech}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ═══ CONTACT — vertically centered, validated form ═══ */}
              {section === "contact" && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div data-stg style={{ marginBottom: 24 }}>
                    <p
                      style={{
                        fontSize: 15,
                        color: T + "0.65)",
                        lineHeight: 1.8,
                        fontFamily: F,
                        fontWeight: 300,
                        margin: 0,
                        maxWidth: 440,
                      }}
                    >
                      Have a project in mind or want to collaborate? I'd love to
                      hear about it.
                    </p>
                  </div>
                  <div data-stg>
                    <ContactForm textColor={T} inputColor={c.menuInputColor} />
                  </div>
                  <div
                    data-stg
                    style={{ display: "flex", gap: 16, marginTop: 32 }}
                  >
                    {[
                      {
                        label: "GitHub",
                        href: "https://github.com",
                        icon: (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                          </svg>
                        ),
                      },
                      {
                        label: "LinkedIn",
                        href: "https://linkedin.com",
                        icon: (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                            <rect x="2" y="9" width="4" height="12" />
                            <circle cx="4" cy="4" r="2" />
                          </svg>
                        ),
                      },
                      {
                        label: "Dribbble",
                        href: "https://dribbble.com",
                        icon: (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M19.13 5.09C15.22 9.14 10 10.44 2.25 10.94" />
                            <path d="M21.75 12.84c-6.62-1.41-12.14 1-16.38 6.32" />
                            <path d="M8.56 2.75c4.37 6 6.02 9.42 8.18 17.72" />
                          </svg>
                        ),
                      },
                      {
                        label: "X",
                        href: "https://x.com",
                        icon: (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                            <path d="M4 20l6.768 -6.768" />
                            <path d="M20 4l-6.768 6.768" />
                          </svg>
                        ),
                      },
                    ].map((s) => (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={s.label}
                        style={{
                          color: T + "0.30)",
                          textDecoration: "none",
                          padding: 8,
                          borderRadius: 8,
                          border: "1px solid " + T + "0.10)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition:
                            "color 0.3s, border-color 0.3s, background 0.3s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = T + "0.6)";
                          e.currentTarget.style.borderColor = T + "0.20)";
                          e.currentTarget.style.background = T + "0.03)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = T + "0.30)";
                          e.currentTarget.style.borderColor = T + "0.10)";
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {s.icon}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ THEME — full-height paint-stroke columns ═══ */}
              {section === "theme" &&
                (() => {
                  return (
                    <>
                      <div data-stg style={{ marginBottom: 16 }}>
                        <p
                          style={{
                            fontSize: 15,
                            color: T + "0.65)",
                            fontFamily: F,
                            fontWeight: 300,
                            margin: 0,
                          }}
                        >
                          Hover to preview. Click to apply.
                        </p>
                      </div>
                      <div
                        data-stg
                        style={{
                          flex: 1,
                          display: "flex",
                          gap: 10,
                          minHeight: 0,
                          position: "relative",
                          overflow: "visible",
                        }}
                      >
                        {themes.map((t) => (
                          <ThemeCard
                            key={t.id}
                            theme={t}
                            isActive={activeSeason === t.id}
                            onClick={() => pickTheme(t)}
                          />
                        ))}
                        {goldPop && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: -36,
                              right: 0,
                              width: "20%",
                              textAlign: "center",
                              padding: "7px 16px",
                              borderRadius: 8,
                              background: "rgba(255,255,255,0.9)",
                              border: "0.5px solid " + T + "0.08)",
                              fontSize: 12,
                              color: T + "0.6)",
                              fontFamily: F,
                              fontWeight: 300,
                              animation: "goldPop 0.4s ease",
                            }}
                          >
                            Unlock this theme first
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
            </div>
          </div>
        </div>

        {/* Close button — overlaid at bottom center */}
        <button ref={closeBtnRef} className="menu-close-btn" onClick={onClose}>
          <X size={18} strokeWidth={1.5} color={T + "0.45)"} />
        </button>
      </div>
    </>
  );
}
