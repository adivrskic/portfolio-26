import { useRef, useEffect } from "react";
import { Mail, X } from "lucide-react";
import { state } from "./showcaseState";
import { hexRGB } from "../../utils/color";
import "./ShowcaseHTML.css";

// Sample a multi-stop hex gradient at t ∈ [0,1] → "r,g,b"
function sampleGradient(stops, t) {
  const n = stops.length - 1;
  if (n < 1) {
    const [r, g, b] = hexRGB(stops[0] || "#1a1a2e");
    return `${r},${g},${b}`;
  }
  const pos = Math.min(0.9999, Math.max(0, t)) * n;
  const i = Math.floor(pos);
  const f = pos - i;
  const [r1, g1, b1] = hexRGB(stops[i]);
  const [r2, g2, b2] = hexRGB(stops[i + 1]);
  return `${Math.round(r1 + (r2 - r1) * f)},${Math.round(
    g1 + (g2 - g1) * f
  )},${Math.round(b1 + (b2 - b1) * f)}`;
}

export function SectionProgress({
  totalSections,
  themeColors,
  onClose,
  onJump,
}) {
  const ticksRef = useRef([]);
  const startRef = useRef();
  const endRef = useRef();
  const numRefs = useRef([]);

  const TICKS_PER = 8;
  const TICK_SPACING = 8;
  const TICK_H = 2;
  const TOTAL_TICKS = totalSections * TICKS_PER;
  const BASE_W = 6;
  const MAX_W = 48;
  const totalH = TOTAL_TICKS * TICK_SPACING;
  const projectCount = Math.max(0, totalSections - 2);
  const settleIdx = totalSections - 1;

  useEffect(() => {
    // Per-tick colors: the theme's gradient runs down the whole rail
    const stops =
      themeColors && themeColors.filter(Boolean).length > 1
        ? themeColors.filter(Boolean)
        : ["#1a1a2e", "#1a1a2e"];
    const tickRgb = Array.from({ length: TOTAL_TICKS }, (_, i) =>
      sampleGradient(stops, i / (TOTAL_TICKS - 1))
    );

    function update(sec) {
      const center = sec * TICKS_PER + TICKS_PER / 2;
      const sigma = TICKS_PER * 1.4;

      for (let i = 0; i < TOTAL_TICKS; i++) {
        const el = ticksRef.current[i];
        if (!el) continue;
        const dist = Math.abs(i - center);
        const gauss = Math.exp(-(dist * dist) / (2 * sigma * sigma));
        el.style.width = BASE_W + (MAX_W - BASE_W) * gauss + "px";
        el.style.opacity = 0.06 + 0.5 * gauss;
        el.style.backgroundColor =
          gauss > 0.15 ? `rgba(${tickRgb[i]},1)` : "rgba(26,26,46,1)";
      }
      for (let p = 0; p < projectCount; p++) {
        const el = numRefs.current[p];
        if (!el) continue;
        const isActive = sec === p + 1;
        el.style.color = isActive ? "#333355" : "#b4b4ca";
      }
      if (startRef.current)
        startRef.current.style.color = sec === 0 ? "#747498" : "transparent";
      if (endRef.current)
        endRef.current.style.color =
          sec >= totalSections - 1 ? "#747498" : "transparent";
    }
    update(state.section);
    return state.subscribe(update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSections, projectCount, (themeColors || []).join("|")]);

  return (
    <div className="sc-progress" style={{ height: totalH }}>
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

      {/* Section numbers + actions beneath the ticks */}
      <div className="sc-progress__nums">
        {Array.from({ length: projectCount }, (_, p) => {
          const sectionIdx = p + 1;
          return (
            <button
              key={`num-${p}`}
              ref={(el) => {
                numRefs.current[p] = el;
              }}
              className="sc-progress__num"
              onClick={() => onJump && onJump(sectionIdx)}
            >
              {String(p + 1).padStart(2, "0")}
            </button>
          );
        })}

        {/* Contact — jump to settle section */}
        <button
          className="sc-progress__action"
          onClick={() => onJump && onJump(settleIdx)}
          title="Contact"
        >
          <Mail size={13} strokeWidth={1.5} />
        </button>

        {/* Close */}
        <button className="sc-progress__action" onClick={onClose} title="Close">
          <X size={13} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
