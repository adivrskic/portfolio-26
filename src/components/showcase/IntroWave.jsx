import { useRef, useEffect } from "react";
import "../showcase/Showcase.css";

export default function IntroWave({ config }) {
  const tickRefs = useRef([]);
  const startTime = useRef(performance.now());

  const TICK_COUNT = 60;
  const TICK_H = 2;
  const TICK_GAP = 6;
  const totalH = TICK_COUNT * (TICK_H + TICK_GAP);

  const c = config || {};
  const gc1 = c.gradColor1 || "#1a1a2e";
  const gc2 = c.gradColor2 || "#2a2a4e";
  const gc3 = c.gradColor3 || "#3a3a6e";

  useEffect(() => {
    let raf;
    function tick() {
      raf = requestAnimationFrame(tick);
      const t = (performance.now() - startTime.current) / 1000;
      for (let i = 0; i < TICK_COUNT; i++) {
        const el = tickRefs.current[i];
        if (!el) continue;
        const phase = (i / TICK_COUNT) * Math.PI * 3 - t * 4;
        const wave = Math.sin(phase) * 0.5 + 0.5;
        const baseW = 40;
        const maxW = window.innerWidth * 0.85;
        el.style.width = baseW + (maxW - baseW) * wave + "px";
        el.style.opacity = 0.04 + 0.15 * wave;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="intro-wave"
      style={{ "--gc1": gc1, "--gc2": gc2, "--gc3": gc3 }}
    >
      <svg
        className="intro-wave__fingerprint"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          <linearGradient id="fp-grad-intro" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gc1} />
            <stop offset="50%" stopColor={gc2} />
            <stop offset="100%" stopColor={gc3} />
          </linearGradient>
        </defs>
        <path
          className="fp-line fp-line--0"
          pathLength="1"
          d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"
        />
        <path
          className="fp-line fp-line--1"
          pathLength="1"
          d="M14 13.12c0 2.38 0 6.38-1 8.88"
        />
        <path
          className="fp-line fp-line--2"
          pathLength="1"
          d="M17.29 21.02c.12-.6.43-2.3.5-3.02"
        />
        <path
          className="fp-line fp-line--3"
          pathLength="1"
          d="M2 12a10 10 0 0 1 18-6"
        />
        <path className="fp-line fp-line--4" pathLength="1" d="M2 16h.01" />
        <path
          className="fp-line fp-line--5"
          pathLength="1"
          d="M21.8 16c.2-2 .131-5.354 0-6"
        />
        <path
          className="fp-line fp-line--6"
          pathLength="1"
          d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"
        />
        <path
          className="fp-line fp-line--7"
          pathLength="1"
          d="M8.65 22c.21-.66.45-1.32.57-2"
        />
        <path
          className="fp-line fp-line--8"
          pathLength="1"
          d="M9 6.8a6 6 0 0 1 9 5.2v2"
        />
      </svg>
      <div className="intro-wave__ticks" style={{ height: totalH }}>
        {Array.from({ length: TICK_COUNT }, (_, i) => (
          <div
            key={i}
            ref={(el) => {
              tickRefs.current[i] = el;
            }}
            className="intro-wave__tick"
            style={{ top: i * (TICK_H + TICK_GAP) }}
          />
        ))}
      </div>
    </div>
  );
}
