import { useEffect, useRef, useState, useCallback } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import gsap from "gsap";

import { X } from "lucide-react";
import { hexToRgba } from "../../utils/color";
import { FONT_FAMILY } from "../../constants/style";

const F = FONT_FAMILY;
import { THEMES } from "../../constants/themes";
import "./MenuOverlay.css";
import ThemeCard from "./ThemeCard";
import MenuAbout from "./MenuAbout";
import MenuWork from "./MenuWork";
import MenuContact from "./MenuContact";
export default function MenuOverlay({
  open,
  onClose,
  config: c,
  onThemeChange,
  activeSeason,
  onShowcase,
}) {
  const [mounted, setMounted] = useState(false);
  const [section, setSection] = useState("about");
  const [hovered, setHovered] = useState(null);
  const isMobile = useIsMobile();

  const panelRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const closeBtnRef = useRef(null);
  const nameRef = useRef(null);
  const nameRightRef = useRef(null);
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
      const nmr = nameRightRef.current;
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
        if (nmr)
          tl.fromTo(
            nmr,
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
        if (nmr)
          tl.to(
            nmr,
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
  const menuHex = c.menuTextColor || "#1a1a2e";
  const mtR = parseInt(menuHex.replace("#", "").substring(0, 2), 16) || 0;
  const mtG = parseInt(menuHex.replace("#", "").substring(2, 4), 16) || 0;
  const mtB = parseInt(menuHex.replace("#", "").substring(4, 6), 16) || 0;
  const NAV = [
    { id: "about", label: "About" },
    { id: "work", label: "Work" },
    { id: "contact", label: "Contact" },
    { id: "theme", label: "Theme" },
  ];
  const themes = THEMES;

  return (
    <>
      <div
        ref={panelRef}
        className="menu-wrapper"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        style={{
          "--panel-solid": "rgb(232,232,238)",
          "--mt-r": mtR,
          "--mt-g": mtG,
          "--mt-b": mtB,
          "--mf": F,
        }}
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
              Adi Vrskic
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
          <div
            style={{
              flex: 1,
              padding: isMobile ? "16px 20px" : "70px 70px",
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
              {section === "about" && <MenuAbout />}

              {section === "work" && (
                <MenuWork isMobile={isMobile} onShowcase={onShowcase} />
              )}

              {section === "contact" && <MenuContact config={c} />}

              {/* ═══ THEME — full-height paint-stroke columns ═══ */}
              {section === "theme" &&
                (() => {
                  return (
                    <>
                      <div
                        data-stg
                        style={{
                          flex: 1,
                          display: isMobile ? "grid" : "flex",
                          gridTemplateColumns: isMobile ? "1fr" : undefined,
                          gap: isMobile ? 8 : 10,
                          minHeight: 0,
                          position: "relative",
                          overflow: isMobile ? "auto" : "visible",
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
