import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { Fingerprint } from "lucide-react";
import { luminance } from "../../utils/color";
import { BG_COLOR } from "../../constants/style";

export default function TextOverlay({
  config: c,
  birthComplete,
  fadeFactor,
  gradientCanvas,
  menuOpen,
  onMenuToggle,
}) {
  const [revealed, setRevealed] = useState(false);
  const [initialRevealDone, setInitialRevealDone] = useState(false);
  const [menuHover, setMenuHover] = useState(false);
  const [btnColor, setBtnColor] = useState(c.textColor || "#1a1a2e");
  const letterRefs = useRef([]);
  const menuBtnRef = useRef(null);
  const textRowRef = useRef(null);

  useEffect(() => {
    if (birthComplete && !revealed) setRevealed(true);
  }, [birthComplete, revealed]);

  // Mark initial reveal as done after letters finish staggering
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setInitialRevealDone(true), 1500);
    return () => clearTimeout(t);
  }, [revealed]);

  useEffect(() => {
    if (!textRowRef.current || !revealed) return;
    if (menuOpen) {
      gsap.to(textRowRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: "power2.in",
      });
    } else {
      gsap.to(textRowRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        delay: 0.3,
      });
    }
  }, [menuOpen, revealed]);

  useEffect(() => {
    if (!gradientCanvas || !revealed) return;
    const ctx = gradientCanvas.getContext("2d", { willReadFrequently: true });
    const dpr = Math.min(window.devicePixelRatio, 2);
    let raf,
      frame = 0;
    function sample() {
      raf = requestAnimationFrame(sample);
      if (++frame % 3 !== 0) return;
      for (const el of letterRefs.current.filter(Boolean)) {
        const rect = el.getBoundingClientRect();
        const cx = Math.round((rect.left + rect.width / 2) * dpr);
        const cy = Math.round((rect.top + rect.height / 2) * dpr);
        if (
          cx < 0 ||
          cy < 0 ||
          cx >= gradientCanvas.width ||
          cy >= gradientCanvas.height
        )
          continue;
        try {
          const pixel = ctx.getImageData(cx, cy, 1, 1).data;
          const a = pixel[3] / 255;
          const lum = luminance(
            pixel[0] * a + BG_COLOR.r * (1 - a),
            pixel[1] * a + BG_COLOR.g * (1 - a),
            pixel[2] * a + BG_COLOR.b * (1 - a)
          );
          el.style.color = lum < 0.5 ? c.textColorLight : c.textColor;
        } catch {}
      }
      // Sample at menu button center
      if (menuBtnRef.current) {
        const rect = menuBtnRef.current.getBoundingClientRect();
        const cx = Math.round((rect.left + rect.width / 2) * dpr);
        const cy = Math.round((rect.top + rect.height / 2) * dpr);
        if (
          cx >= 0 &&
          cy >= 0 &&
          cx < gradientCanvas.width &&
          cy < gradientCanvas.height
        ) {
          try {
            const p = ctx.getImageData(cx, cy, 1, 1).data;
            const a = p[3] / 255;
            const lum = luminance(
              p[0] * a + BG_COLOR.r * (1 - a),
              p[1] * a + BG_COLOR.g * (1 - a),
              p[2] * a + BG_COLOR.b * (1 - a)
            );
            setBtnColor(lum < 0.5 ? c.textColorLight : c.textColor);
          } catch {}
        }
      }
    }
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, [gradientCanvas, revealed, c.textColor, c.textColorLight]);

  const name = "ADI VRSKIC";
  const letters = name.split("");
  const ff = fadeFactor ?? 1;
  const setLetterRef = useCallback(
    (i) => (el) => {
      letterRefs.current[i] = el;
    },
    []
  );

  return (
    <>
      <div
        ref={textRowRef}
        style={{
          position: "fixed",
          bottom: `${c.textBottom}vh`,
          left: 0,
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <div
          aria-label={name}
          style={{ display: "flex", alignItems: "center", lineHeight: 1 }}
        >
          {letters.map((ch, i) => (
            <span
              key={i}
              ref={setLetterRef(i)}
              style={{
                display: "inline-block",
                color: c.textColor,
                fontSize: `clamp(14px, ${c.fontSize}vw, 48px)`,
                fontWeight: c.fontWeight,
                fontFamily: "'Inter',-apple-system,sans-serif",
                textTransform: "uppercase",
                letterSpacing: `clamp(0.1em, ${c.letterSpacing}em, 0.5em)`,
                minWidth: ch === " " ? "0.3em" : "auto",
                lineHeight: 1,
                opacity: revealed ? c.textOpacity * ff : 0,
                transform: revealed
                  ? "translateY(0)"
                  : `translateY(${c.textTravelDist || 10}px)`,
                filter: revealed ? "none" : "blur(2px)",
                transition: `opacity ${
                  c.emergeDuration
                }s cubic-bezier(.33,1,.68,1) ${
                  (c.textRevealDelay || 0.3) + i * c.letterStagger
                }s, transform ${c.emergeDuration}s cubic-bezier(.33,1,.68,1) ${
                  (c.textRevealDelay || 0.3) + i * c.letterStagger
                }s, filter ${c.emergeDuration}s ease ${
                  (c.textRevealDelay || 0.3) + i * c.letterStagger
                }s, color 0.3s ease`,
                cursor: "default",
                userSelect: "none",
              }}
              aria-hidden="true"
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </div>
      </div>
      <style>{`@keyframes taperedFloat{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-4px)}}`}</style>
      {!menuOpen && (
        <button
          ref={menuBtnRef}
          onClick={onMenuToggle}
          onMouseEnter={() => setMenuHover(true)}
          onMouseLeave={() => setMenuHover(false)}
          aria-label="Open menu"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2,
            pointerEvents: revealed ? "auto" : "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "14px 16px",
            minWidth: 48,
            minHeight: 48,
            opacity: revealed ? c.textOpacity * 0.7 * ff : 0,
            transition: `opacity 0.6s cubic-bezier(.33,1,.68,1) ${
              !initialRevealDone ? (c.menuBtnDelay || 1.3) + "s" : "0s"
            }`,
            animation: "taperedFloat 4s ease-in-out infinite",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.4s cubic-bezier(0.33,1,0.68,1)",
              transform: menuHover ? "scale(1.08)" : "scale(1)",
            }}
          >
            <Fingerprint
              size={24}
              strokeWidth={1.5}
              color={btnColor}
              style={{
                opacity: menuHover ? 0.7 : 0.5,
                transition: "opacity 0.3s",
              }}
            />
          </div>
        </button>
      )}
    </>
  );
}
