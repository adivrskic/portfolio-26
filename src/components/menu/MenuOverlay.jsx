import { useEffect, useRef, useState, useCallback } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import gsap from "gsap";

import { X } from "lucide-react";
import { hexToRgba } from "../../utils/color";
import { FONT_FAMILY } from "../../constants/style";

const F = FONT_FAMILY;
import { THEMES } from "../../constants/themes";
import { checkerReveal, checkerDissolve } from "../../utils/checkerTransition";
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
  const checkerRef = useRef(null);
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
      if (checkerRef.current) {
        checkerRef.current();
        checkerRef.current = null;
      }

      const panelBg = `rgba(232,232,238,${c.menuBgOpacity ?? 0.85})`;
      const panelBlurPx = c.menuBlur ?? 28;
      const panelBlur = `blur(${panelBlurPx}px) saturate(1.15)`;

      if (open) {
        gsap.set(p, { visibility: "visible", pointerEvents: "auto" });
        [lp, rp].forEach((panel) => {
          if (!panel) return;
          panel.style.background = "transparent";
          panel.style.backdropFilter = "none";
          panel.style.WebkitBackdropFilter = "none";
          gsap.set(panel, { opacity: 1, clipPath: "none" });
        });
        if (cb) gsap.set(cb, { scale: 0, opacity: 0 });
        if (nm) gsap.set(nm, { opacity: 0, y: -10 });
        if (nmr) gsap.set(nmr, { opacity: 0, y: -10 });
        els.forEach((el) => gsap.set(el, { opacity: 0, y: 16 }));

        const cleanups = [];
        let done = 0;
        const totalPanels = (lp ? 1 : 0) + (rp ? 1 : 0);
        const onPanelDone = () => {
          if (++done < totalPanels) return;
          checkerRef.current = null;
          // Swap tiles for real panel bg (seamless)
          cleanups.forEach((fn) => fn());
          [lp, rp].forEach((panel) => {
            if (!panel) return;
            panel.style.background = panelBg;
            panel.style.backdropFilter = panelBlur;
            panel.style.WebkitBackdropFilter = panelBlur;
          });
        };

        if (lp) {
          const ck = checkerReveal(lp, {
            color: panelBg,
            blur: panelBlurPx,
            maxDelay: 250,
            onComplete: onPanelDone,
          });
          cleanups.push(ck.cleanup);
        }
        if (rp) {
          const ck = checkerReveal(rp, {
            color: panelBg,
            blur: panelBlurPx,
            maxDelay: 250,
            onComplete: onPanelDone,
          });
          cleanups.push(ck.cleanup);
        }
        checkerRef.current = () => cleanups.forEach((fn) => fn());

        // Content fades in overlapping the last tiles
        setTimeout(() => {
          const tl = gsap.timeline();
          tlRef.current = tl;
          if (cb)
            tl.to(
              cb,
              { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)" },
              0
            );
          if (nm)
            tl.to(
              nm,
              { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out" },
              0
            );
          if (nmr)
            tl.to(
              nmr,
              { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out" },
              0
            );
          els.forEach((el, i) => {
            tl.to(
              el,
              { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
              0.04 + i * 0.06
            );
          });
          tl.call(() => animateContentIn(), [], 0.25);
        }, 450);
      } else {
        // Fade out content
        const tl = gsap.timeline();
        tlRef.current = tl;
        if (stgRef.current) {
          const kids = stgRef.current.querySelectorAll("[data-stg]");
          tl.to(
            kids,
            {
              opacity: 0,
              y: -8,
              duration: 0.15,
              stagger: 0.01,
              ease: "power2.in",
            },
            0
          );
        }
        els.forEach((el, i) => {
          tl.to(
            el,
            { opacity: 0, y: -8, duration: 0.15, ease: "power2.in" },
            0.02 + i * 0.01
          );
        });
        if (nm)
          tl.to(nm, { opacity: 0, duration: 0.15, ease: "power2.in" }, 0.02);
        if (nmr)
          tl.to(nmr, { opacity: 0, duration: 0.15, ease: "power2.in" }, 0.02);
        if (cb)
          tl.to(
            cb,
            { scale: 0, opacity: 0, duration: 0.15, ease: "power2.in" },
            0
          );
        // Glass tiles appear, panel bg strips, tiles dissolve out
        tl.call(
          () => {
            const cleanups = [];
            let done = 0;
            const totalPanels = (lp ? 1 : 0) + (rp ? 1 : 0);
            const onPanelDone = () => {
              if (++done < totalPanels) return;
              checkerRef.current = null;
              gsap.set(p, { visibility: "hidden", pointerEvents: "none" });
              setMounted(false);
            };
            if (lp) {
              const ck = checkerDissolve(lp, {
                color: panelBg,
                blur: panelBlurPx,
                maxDelay: 250,
                onComplete: onPanelDone,
              });
              cleanups.push(ck.cleanup);
            }
            if (rp) {
              const ck = checkerDissolve(rp, {
                color: panelBg,
                blur: panelBlurPx,
                maxDelay: 250,
                onComplete: onPanelDone,
              });
              cleanups.push(ck.cleanup);
            }
            [lp, rp].forEach((panel) => {
              if (!panel) return;
              panel.style.background = "transparent";
              panel.style.backdropFilter = "none";
              panel.style.WebkitBackdropFilter = "none";
            });
            checkerRef.current = () => cleanups.forEach((fn) => fn());
          },
          [],
          0.2
        );
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
