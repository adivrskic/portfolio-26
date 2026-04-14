import { useEffect, useRef } from "react";
import { Fingerprint } from "lucide-react";
import { sampleLuminance } from "../../utils/color";
import { BG_COLOR } from "../../constants/style";
import "./Reticle.css";

const IS_TOUCH =
  typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

export default function Reticle({
  proximityRef,
  chatMode,
  menuOpen,
  config: c,
  gradientCanvas,
  scrollProgress,
  showcaseTriggered,
}) {
  if (IS_TOUCH) return null;
  const ref = useRef(null);
  const lineRef = useRef(null);
  const line2Ref = useRef(null);
  const pillRef = useRef(null);
  const pill2Ref = useRef(null);
  const smoothP = useRef(0);
  const mouseRef = useRef({ x: -200, y: -200 });
  const gradCanvasRef = useRef(null);
  gradCanvasRef.current = gradientCanvas;

  const scrollRef = useRef(0);
  const chatRef = useRef(false);
  scrollRef.current = scrollProgress;
  chatRef.current = chatMode;

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (ref.current) {
        ref.current.style.left = e.clientX + "px";
        ref.current.style.top = e.clientY + "px";
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    let raf;
    let frame = 0;
    let skipFrame = false;
    let lastSampleX = -1;
    let lastSampleY = -1;

    function tick() {
      raf = requestAnimationFrame(tick);
      // Throttle to ~30fps — proximity smoothing and pill updates are gradual
      skipFrame = !skipFrame;
      if (skipFrame) return;
      const smoothing = c.reticleSmoothing || 0.08;
      smoothP.current += (proximityRef.current - smoothP.current) * smoothing;
      const p = Math.max(0, Math.min(1, smoothP.current));

      if (ref.current) {
        const baseSize = 24;
        const grow = p * 8;
        const size = baseSize + grow;
        const opacity = 0.25 + p * 0.35;
        ref.current.style.width = size + "px";
        ref.current.style.height = size + "px";
        ref.current.style.margin = -size / 2 + "px 0 0 " + -size / 2 + "px";
        ref.current.style.opacity = chatMode || menuOpen ? 0 : opacity;

        // Sample luminance for adaptive cursor color.
        // Only read back pixels when: enough frames have passed AND
        // the cursor moved enough to be over a different gradient region.
        if (++frame % 5 === 0 && gradCanvasRef.current) {
          const gc = gradCanvasRef.current;
          const dpr =
            gc.width / (parseFloat(gc.style.width) || window.innerWidth);
          const cx = Math.round(mouseRef.current.x * dpr);
          const cy = Math.round(mouseRef.current.y * dpr);
          const dx = cx - lastSampleX;
          const dy = cy - lastSampleY;
          if (dx * dx + dy * dy > 400) {
            // ~20px movement threshold
            lastSampleX = cx;
            lastSampleY = cy;
            if (cx >= 0 && cy >= 0 && cx < gc.width && cy < gc.height) {
              try {
                const ctx = gc.getContext("2d", { willReadFrequently: true });
                const lum = sampleLuminance(
                  ctx,
                  cx,
                  cy,
                  gc.width,
                  gc.height,
                  BG_COLOR
                );
                if (lum !== null) {
                  ref.current.style.color =
                    lum < 0.5
                      ? c.textColorLight || "#ffffff"
                      : c.textColor || "#1a1a2e";
                }
              } catch {}
            }
          }
        }
      }

      const showHint =
        p > 0.8 && !chatMode && !menuOpen && scrollRef.current < 0.01;

      const showHold = showHint;
      if (lineRef.current && pillRef.current) {
        if (showHold) {
          const pr = pillRef.current.getBoundingClientRect();
          const px2 = pr.left;
          const py2 = pr.top + pr.height / 2;
          const dx1 = px2 - mouseRef.current.x;
          const dy1 = py2 - mouseRef.current.y;
          const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
          const pad = 28;
          lineRef.current.setAttribute(
            "x1",
            mouseRef.current.x + (dx1 / d1) * pad
          );
          lineRef.current.setAttribute(
            "y1",
            mouseRef.current.y + (dy1 / d1) * pad
          );
          lineRef.current.setAttribute("x2", px2);
          lineRef.current.setAttribute("y2", py2);
          lineRef.current.style.opacity = Math.min(1, (p - 0.8) / 0.1) * 0.7;
        } else {
          lineRef.current.style.opacity = 0;
        }
      }
      if (pillRef.current)
        pillRef.current.style.opacity = showHold
          ? Math.min(1, (p - 0.8) / 0.1)
          : 0;

      const showScroll = showHint;
      if (line2Ref.current && pill2Ref.current) {
        if (showScroll) {
          const pr2 = pill2Ref.current.getBoundingClientRect();
          const px4 = pr2.left + pr2.width;
          const py4 = pr2.top + pr2.height / 2;
          const dx2 = px4 - mouseRef.current.x;
          const dy2 = py4 - mouseRef.current.y;
          const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
          const pad2 = 28;
          line2Ref.current.setAttribute(
            "x1",
            mouseRef.current.x + (dx2 / d2) * pad2
          );
          line2Ref.current.setAttribute(
            "y1",
            mouseRef.current.y + (dy2 / d2) * pad2
          );
          line2Ref.current.setAttribute("x2", px4);
          line2Ref.current.setAttribute("y2", py4);
          line2Ref.current.style.opacity = Math.min(1, (p - 0.8) / 0.1) * 0.7;
        } else {
          line2Ref.current.style.opacity = 0;
        }
      }
      if (pill2Ref.current)
        pill2Ref.current.style.opacity = showScroll
          ? Math.min(1, (p - 0.8) / 0.1)
          : 0;
    }

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, [chatMode, menuOpen, c.reticleSmoothing]);

  const lc = c.pillLineColor || "rgba(18,18,40,0.45)";
  const lw = c.pillLineWidth || 0.8;
  const px = c.pillOffsetX ?? 200;
  const py = c.pillOffsetY ?? 140;

  const isTouch =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const verb = isTouch ? "tap" : "click";

  return (
    <>
      <div
        ref={ref}
        className="reticle__cursor"
        style={{ color: c.textColor || "#1a1a2e" }}
      >
        <Fingerprint size="100%" strokeWidth={1.5} color="currentColor" />
      </div>
      <svg className="reticle__lines">
        <line
          ref={lineRef}
          className="reticle__line"
          x1="0"
          y1="0"
          x2="0"
          y2="0"
          stroke={lc}
          strokeWidth={lw}
        />
        <line
          ref={line2Ref}
          className="reticle__line"
          x1="0"
          y1="0"
          x2="0"
          y2="0"
          stroke={lc}
          strokeWidth={lw}
        />
      </svg>
      <div
        ref={pillRef}
        className="reticle__pill"
        style={{ left: `calc(50% + ${px}px)`, top: `calc(50% + ${py}px)` }}
      >
        {verb} to chat
      </div>
      <div
        ref={pill2Ref}
        className="reticle__pill"
        style={{
          left: `calc(50% - ${px}px)`,
          top: `calc(50% - ${py}px)`,
          transform: "translateX(-100%)",
        }}
      >
        {verb} and hold to explore
      </div>
    </>
  );
}
