import { useState, useRef, useEffect } from "react";

export default function GoldCoin({ onClick, unlocked }) {
  const canvasRef = useRef(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio, 2);
    const size = 120;
    cv.width = size * dpr;
    cv.height = size * dpr;
    cv.style.width = size + "px";
    cv.style.height = size + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sparkles = Array.from({ length: 20 }, () => ({
      x: Math.random() * size,
      y: Math.random() * size,
      size: 0.5 + Math.random() * 2,
      speed: 0.5 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    }));

    let raf;
    function draw() {
      raf = requestAnimationFrame(draw);
      const t = performance.now() * 0.001;
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const r = 42;
      for (const s of sparkles) {
        const dx = s.x - cx;
        const dy = s.y - cy;
        if (dx * dx + dy * dy > r * r) continue;
        const alpha = Math.sin(t * s.speed + s.phase) * 0.5 + 0.5;
        if (alpha < 0.1) continue;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,220,${alpha * 0.9})`;
        ctx.fill();
      }
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      onClick={!unlocked ? onClick : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        width: 120,
        height: 120,
        cursor: unlocked ? "default" : "pointer",
        transform: hover && !unlocked ? "scale(1.08)" : "scale(1)",
        transition: "transform 0.3s ease",
      }}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="coinGrad" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="50%" stopColor="#daa520" />
            <stop offset="100%" stopColor="#b8860b" />
          </radialGradient>
          <radialGradient id="coinShadow" cx="50%" cy="50%">
            <stop offset="70%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="62" r="44" fill="rgba(0,0,0,0.12)" />
        <circle cx="60" cy="60" r="42" fill="url(#coinGrad)" />
        <circle cx="60" cy="60" r="42" fill="url(#coinShadow)" />
        <circle cx="60" cy="60" r="38" fill="none" stroke="rgba(255,255,200,0.3)" strokeWidth="0.5" />
        <circle cx="60" cy="60" r="35" fill="none" stroke="rgba(180,130,10,0.4)" strokeWidth="0.5" />
        <circle cx="60" cy="60" r="14" fill="none" stroke="rgba(120,85,0,0.5)" strokeWidth="1.2" />
        <line x1="60" y1="52" x2="60" y2="60" stroke="rgba(120,85,0,0.5)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="60" y1="60" x2="66" y2="63" stroke="rgba(120,85,0,0.5)" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}
