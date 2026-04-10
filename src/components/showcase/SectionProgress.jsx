import { useRef, useEffect } from "react";
import { state } from "./ShowcaseLayout";
import "./Showcase.css";

export function SettleFooter({ onClose, onContact, totalSections }) {
  const ref = useRef();

  useEffect(() => {
    let raf;
    function tick() {
      raf = requestAnimationFrame(tick);
      if (!ref.current) return;
      const atEnd = state.section >= totalSections - 1;
      ref.current.style.opacity = atEnd ? "1" : "0";
      ref.current.style.transform = `translateX(-50%) translateY(${
        atEnd ? "0" : "8px"
      })`;
      ref.current.style.pointerEvents = atEnd ? "auto" : "none";
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalSections]);

  return (
    <div ref={ref} className="sc-footer">
      <button className="sc-footer__link sc-label" onClick={onContact}>
        Contact
      </button>
      <button className="sc-footer__link sc-label" onClick={onClose}>
        Exit
      </button>
    </div>
  );
}

export function SectionProgress({ totalSections, themeColor, onClose }) {
  const ticksRef = useRef([]);
  const startRef = useRef();
  const endRef = useRef();

  const TICKS_PER = 8;
  const TICK_SPACING = 8;
  const TICK_H = 2;
  const TOTAL_TICKS = totalSections * TICKS_PER;
  const BASE_W = 6;
  const MAX_W = 48;
  const totalH = TOTAL_TICKS * TICK_SPACING;

  useEffect(() => {
    let raf;
    function tick() {
      raf = requestAnimationFrame(tick);
      const sec = state.section;
      const center = sec * TICKS_PER + TICKS_PER / 2;
      const sigma = TICKS_PER * 1.4;

      const hex = themeColor || "#1a1a2e";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const themeRgb = `${r},${g},${b}`;

      for (let i = 0; i < TOTAL_TICKS; i++) {
        const el = ticksRef.current[i];
        if (!el) continue;
        const dist = Math.abs(i - center);
        const gauss = Math.exp(-(dist * dist) / (2 * sigma * sigma));
        el.style.width = BASE_W + (MAX_W - BASE_W) * gauss + "px";
        el.style.opacity = 0.06 + 0.5 * gauss;
        el.style.backgroundColor =
          gauss > 0.15 ? `rgba(${themeRgb},1)` : "rgba(26,26,46,1)";
      }
      if (startRef.current)
        startRef.current.style.opacity = sec === 0 ? "0.3" : "0";
      if (endRef.current)
        endRef.current.style.opacity = sec >= totalSections - 1 ? "0.3" : "0";
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalSections, themeColor]);

  return (
    <div className="sc-progress" style={{ height: totalH }}>
      <button className="sc-progress__close sc-label" onClick={onClose}>
        Close
      </button>
      <div
        ref={startRef}
        className="sc-progress__endpoint sc-progress__endpoint--start sc-label"
      >
        Start
      </div>

      {Array.from({ length: TOTAL_TICKS }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            ticksRef.current[i] = el;
          }}
          className="sc-progress__tick"
          style={{ top: i * TICK_SPACING, width: BASE_W, height: TICK_H }}
        />
      ))}

      <div
        ref={endRef}
        className="sc-progress__endpoint sc-progress__endpoint--end sc-label"
      >
        End
      </div>
    </div>
  );
}
