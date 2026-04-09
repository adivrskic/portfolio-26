import { useEffect, useRef, useState, useCallback } from "react";
import { FONT_FAMILY, DARK_RGBA } from "../../constants/style";
import { X } from "lucide-react";

const F = FONT_FAMILY;
const D = DARK_RGBA;

// ── Enriched showcase data ──
const PROJECTS = [
  {
    id: "nimbus",
    number: "01",
    title: "Nimbus",
    tag: "AI WEBSITE GENERATOR",
    desc: "Full-stack AI application that generates production-ready, responsive websites from plain-English prompts. Users describe what they want, customize with 60+ design controls, watch the site stream in real-time, then export as static HTML or scaffolded framework projects.",
    features: [
      "Real-time HTML streaming with live preview",
      "60+ design options — layout, typography, color, animation",
      "Multi-page generation with tab navigation",
      "Export to Vite + React, Next.js, Astro, or static HTML",
    ],
    tech: ["React 19", "Supabase", "Claude API", "Stripe"],
    year: "2025",
    accent: "#1a8fe0",
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&h=520&fit=crop&q=80",
  },
  {
    id: "xsbl",
    number: "02",
    title: "XSBL",
    tag: "WEB ACCESSIBILITY SUITE",
    desc: "Comprehensive web accessibility auditing and monitoring platform with a full dashboard. Integrates AI for automated analysis, Slack for team alerts, and email for scheduled reporting. Helps organizations maintain WCAG compliance at scale.",
    features: [
      "AI-powered accessibility analysis",
      "Slack & email notification pipelines",
      "WCAG compliance tracking dashboard",
      "Automated scheduled auditing",
    ],
    tech: ["React", "AI", "Slack API", "Node.js"],
    year: "2024",
    accent: "#8b5cf6",
    image:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=900&h=520&fit=crop&q=80",
  },
  {
    id: "nimbus-wms",
    number: "03",
    title: "Nimbus WMS",
    tag: "AI WAREHOUSE MANAGEMENT",
    desc: "Full inventory and warehouse management platform powered by AI. Web dashboard for operations plus native Android and iOS mobile apps for warehouse floor use. AI-driven demand forecasting, inventory optimization, and intelligent routing.",
    features: [
      "AI demand forecasting & optimization",
      "Native Android & iOS mobile apps",
      "Real-time inventory tracking",
      "Intelligent warehouse routing",
    ],
    tech: ["React", "React Native", "AI/ML", "Python"],
    year: "2024",
    accent: "#10b981",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&h=520&fit=crop&q=80",
  },
  {
    id: "pillow",
    number: "04",
    title: "Pillow",
    tag: "NEUMORPHISM COMPONENT LIBRARY",
    desc: "React component library built around the neumorphism design system. Ready-to-use soft UI components with consistent shadow styling, customizable theming engine, and a clean developer-facing API.",
    features: [
      "Soft UI design system",
      "Customizable theming engine",
      "Clean composable API",
      "Accessible by default",
    ],
    tech: ["React", "SCSS", "Storybook", "Rollup"],
    year: "2023",
    accent: "#f59e0b",
    image:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&h=520&fit=crop&q=80",
  },
  {
    id: "ascend",
    number: "05",
    title: "Ascend",
    tag: "CHROME START PAGE",
    desc: "Custom Chrome new-tab page integrating real-time APIs for news headlines, weather forecasts, geolocation, and live traffic. A clean, functional daily dashboard that replaces the default start page.",
    features: [
      "Real-time news, weather, traffic",
      "Geolocation-aware content",
      "Minimal daily dashboard",
      "Chrome extension architecture",
    ],
    tech: ["JavaScript", "REST APIs", "Chrome APIs"],
    year: "2023",
    accent: "#ef4444",
    image:
      "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=900&h=520&fit=crop&q=80",
  },
  {
    id: "halo",
    number: "06",
    title: "Halo",
    tag: "3D ART PROJECT",
    desc: "Creative coding experiment rendering neon text around a 3D object using Three.js and WebGL. An exploration of typography in three-dimensional space with dynamic lighting and camera interaction.",
    features: [
      "Three.js / WebGL rendering",
      "3D neon text effects",
      "Dynamic lighting system",
      "Interactive camera controls",
    ],
    tech: ["Three.js", "WebGL", "GLSL", "JavaScript"],
    year: "2023",
    accent: "#a855f7",
    image:
      "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=900&h=520&fit=crop&q=80",
  },
];

// ── Showcase ──
export default function Showcase({ open, onClose, onScrollProgress }) {
  const [mounted, setMounted] = useState(false);
  const [entering, setEntering] = useState(false);
  const scrollRef = useRef(null);
  const sectionsRef = useRef([]);
  const progressRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setEntering(true))
      );
    } else {
      setEntering(false);
      const t = setTimeout(() => setMounted(false), 800);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Scroll-driven animation loop ──
  const tick = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const sections = sectionsRef.current.filter(Boolean);
    const scrollTop = container.scrollTop;
    const viewH = container.clientHeight;

    // Overall progress for cube
    const maxScroll = container.scrollHeight - viewH;
    const overallProgress = maxScroll > 0 ? scrollTop / maxScroll : 0;
    progressRef.current = overallProgress;
    if (onScrollProgress) onScrollProgress(overallProgress, sections.length);

    // Per-section fade/zoom/parallax
    sections.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = (center - viewH / 2) / viewH; // -1 to 1
      const absDist = Math.abs(dist);

      // Opacity: peak at center, fade at edges
      const opacity = Math.max(0, 1 - absDist * 1.4);
      // Scale: slight zoom
      const scale = 0.92 + 0.08 * (1 - absDist);
      // Parallax Y shift
      const yShift = dist * 40;

      const inner = el.querySelector("[data-sc-inner]");
      if (inner) {
        inner.style.opacity = opacity;
        inner.style.transform = `translateY(${yShift}px) scale(${scale})`;
      }
    });

    rafRef.current = requestAnimationFrame(tick);
  }, [onScrollProgress]);

  useEffect(() => {
    if (!mounted || !entering) return;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, entering, tick]);

  if (!mounted) return null;

  const active = entering && open;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9,
        opacity: active ? 1 : 0,
        transition: active
          ? "opacity 0.8s cubic-bezier(0.16,1,0.3,1)"
          : "opacity 0.6s ease",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      {/* Frosted backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(232,232,238,0.6)",
          backdropFilter: "blur(40px) saturate(1.2)",
          WebkitBackdropFilter: "blur(40px) saturate(1.2)",
        }}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          top: 28,
          right: 28,
          zIndex: 20,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "0.5px solid " + D + "0.08)",
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(12px)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: active ? 1 : 0,
          transform: active ? "scale(1)" : "scale(0.8)",
          transition: "all 0.5s cubic-bezier(0.16,1,0.3,1) 0.3s",
        }}
      >
        <X size={16} strokeWidth={1.5} color={D + "0.5)"} />
      </button>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Hero / intro */}
        <div
          style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(30px)",
            transition:
              "opacity 1s cubic-bezier(0.16,1,0.3,1) 0.2s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.2s",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontFamily: F,
              fontWeight: 300,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: D + "0.3)",
              marginBottom: 16,
            }}
          >
            Selected Work
          </span>
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 56px)",
              fontFamily: F,
              fontWeight: 100,
              color: D + "0.85)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Showcase
          </h1>
          <p
            style={{
              fontSize: 14,
              fontFamily: F,
              fontWeight: 300,
              color: D + "0.4)",
              marginTop: 20,
              maxWidth: 360,
              textAlign: "center",
              lineHeight: 1.8,
            }}
          >
            AI products, creative coding, and developer tools — built
            end-to-end.
          </p>
          <div
            style={{
              marginTop: 48,
              fontSize: 10,
              fontFamily: F,
              fontWeight: 300,
              letterSpacing: "0.15em",
              color: D + "0.25)",
              animation: "showcaseFloat 3s ease-in-out infinite",
            }}
          >
            ↓ SCROLL
          </div>
        </div>

        {/* Project sections */}
        {PROJECTS.map((p, i) => {
          const left = i % 2 === 0;
          return (
            <section
              key={p.id}
              ref={(el) => (sectionsRef.current[i] = el)}
              style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 0",
                position: "relative",
              }}
            >
              <div
                data-sc-inner
                style={{
                  width: "100%",
                  maxWidth: 1100,
                  margin: "0 auto",
                  padding: "0 48px",
                  display: "flex",
                  flexDirection: left ? "row" : "row-reverse",
                  alignItems: "center",
                  gap: 60,
                  opacity: 0,
                  willChange: "transform, opacity",
                }}
              >
                {/* Image side */}
                <div style={{ flex: "1 1 50%", position: "relative" }}>
                  <div
                    style={{
                      position: "relative",
                      borderRadius: 16,
                      overflow: "hidden",
                      aspectRatio: "16/10",
                      background: D + "0.03)",
                      border: "0.5px solid " + D + "0.06)",
                    }}
                  >
                    <img
                      src={p.image}
                      alt={p.title}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        filter: "saturate(0.85)",
                      }}
                    />
                    {/* Accent overlay */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: `linear-gradient(135deg, ${p.accent}15, transparent 60%)`,
                        mixBlendMode: "multiply",
                      }}
                    />
                    {/* Number badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: 16,
                        [left ? "right" : "left"]: 16,
                        fontSize: 11,
                        fontFamily: F,
                        fontWeight: 300,
                        letterSpacing: "0.15em",
                        color: "rgba(255,255,255,0.7)",
                        background: "rgba(0,0,0,0.25)",
                        backdropFilter: "blur(8px)",
                        padding: "6px 14px",
                        borderRadius: 20,
                      }}
                    >
                      {p.number}
                    </div>
                  </div>
                  {/* Tech chips under image */}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 14,
                      justifyContent: left ? "flex-start" : "flex-end",
                    }}
                  >
                    {p.tech.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: 9,
                          fontFamily: F,
                          fontWeight: 400,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          padding: "5px 12px",
                          borderRadius: 4,
                          background: D + "0.03)",
                          border: "0.5px solid " + D + "0.06)",
                          color: D + "0.45)",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Text side */}
                <div
                  style={{
                    flex: "1 1 40%",
                    textAlign: left ? "left" : "right",
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: F,
                      fontWeight: 400,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: p.accent,
                      opacity: 0.7,
                    }}
                  >
                    {p.tag}
                  </span>
                  <h2
                    style={{
                      fontSize: "clamp(28px, 3.5vw, 44px)",
                      fontFamily: F,
                      fontWeight: 100,
                      color: D + "0.88)",
                      letterSpacing: "0.06em",
                      margin: "12px 0 20px",
                      lineHeight: 1.1,
                    }}
                  >
                    {p.title}
                  </h2>
                  <p
                    style={{
                      fontSize: 14,
                      fontFamily: F,
                      fontWeight: 300,
                      color: D + "0.55)",
                      lineHeight: 1.9,
                      margin: "0 0 24px",
                    }}
                  >
                    {p.desc}
                  </p>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      alignItems: left ? "flex-start" : "flex-end",
                    }}
                  >
                    {p.features.map((f, fi) => (
                      <li
                        key={fi}
                        style={{
                          fontSize: 12,
                          fontFamily: F,
                          fontWeight: 300,
                          color: D + "0.45)",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexDirection: left ? "row" : "row-reverse",
                        }}
                      >
                        <span
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: p.accent,
                            opacity: 0.5,
                            flexShrink: 0,
                          }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div
                    style={{
                      marginTop: 28,
                      fontSize: 11,
                      fontFamily: F,
                      fontWeight: 300,
                      letterSpacing: "0.1em",
                      color: D + "0.25)",
                    }}
                  >
                    {p.year}
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        {/* End spacer */}
        <div style={{ height: "50vh" }} />
      </div>

      <style>{`
        @keyframes showcaseFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
