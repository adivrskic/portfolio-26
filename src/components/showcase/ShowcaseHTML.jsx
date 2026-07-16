import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ArrowUpRight, X, Mail } from "lucide-react";
import { SHOWCASE_PROJECTS } from "./ShowcaseProjects";
import { state, N, TOTAL_SECTIONS } from "./showcaseState";
import { SectionProgress } from "./SectionProgress";
import ContactForm from "../contact/ContactForm";
import { checkerReveal, checkerDissolve } from "../../utils/checkerTransition";
import { mixHex } from "../../utils/color";
import "./ShowcaseHTML.css";

const FROST = "rgba(232,232,238,0.62)";
const FROST_BLUR = 26;

// ── Hero title, split into letters for the staggered reveal ──
function HeroTitle() {
  return (
    <h1 className="shx-hero__title" aria-label="Selected Work">
      {"Selected Work".split("").map((ch, i) => (
        <span key={i} className="shx-hero__letter" aria-hidden="true">
          {ch === " " ? " " : ch}
        </span>
      ))}
    </h1>
  );
}

// ── One project section ──
function ProjectSection({ project, index, sectionRef }) {
  const collageRef = useRef(null);
  const flipped = index % 2 === 1;

  const accent = project.accent;
  const ghost = mixHex(accent, "#ffffff", 0.45);
  const tagColor = mixHex(accent, "#1a1a2e", 0.25);
  const linkColor = mixHex(accent, "#1a1a2e", 0.35);

  // Gentle mouse parallax on the collage (desktop pointers only)
  const onMouseMove = useCallback((e) => {
    const el = collageRef.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    el.style.setProperty("--mx", mx.toFixed(3));
    el.style.setProperty("--my", my.toFixed(3));
  }, []);

  const onMouseLeave = useCallback(() => {
    const el = collageRef.current;
    if (!el) return;
    el.style.setProperty("--mx", 0);
    el.style.setProperty("--my", 0);
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`shx-section shx-proj ${flipped ? "shx-proj--flip" : ""}`}
      style={{ "--accent": accent }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Accent glow blobs — echo the homepage gradient blobs */}
      <div className="shx-proj__glow shx-proj__glow--main" />
      <div className="shx-proj__glow shx-proj__glow--edge" />

      <div className="shx-proj__inner">
        <div className="shx-proj__text">
          <div className="shx-proj__number" style={{ color: ghost }}>
            {project.number}
          </div>
          <div className="shx-proj__tag sc-label" style={{ color: tagColor }}>
            {project.tag}
          </div>
          <h2 className="shx-proj__title">{project.title}</h2>
          <p className="shx-proj__desc">{project.text}</p>
          <div className="shx-proj__pills">
            {project.skills.map((s) => (
              <span key={s} className="shx-pill">
                {s}
              </span>
            ))}
          </div>
          <a
            className="shx-link sc-label"
            style={{ color: linkColor, "--link-color": linkColor }}
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            View project
            <ArrowUpRight size={13} strokeWidth={1.5} />
          </a>
        </div>

        <div className="shx-proj__collage" ref={collageRef}>
          {project.images.map((url, i) => (
            <div
              key={url}
              className={`shx-card ${
                i === 0 ? "shx-card--hero" : "shx-card--sm"
              }`}
            >
              <img
                src={url}
                alt={`${project.title} — screen ${i + 1}`}
                loading="lazy"
                onLoad={(e) => e.currentTarget.classList.add("shx-img--loaded")}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main export ──
export default function ShowcaseHTML({ open, onClose, config, initialSection }) {
  const rootRef = useRef(null);
  const bgRef = useRef(null);
  const scrollRef = useRef(null);
  const sectionRefs = useRef([]);
  const checkerRef = useRef(null);
  const hasOpened = useRef(false);
  const closingRef = useRef(false);
  const [visible, setVisible] = useState(false);

  const setSectionRef = (i) => (el) => {
    sectionRefs.current[i] = el;
  };

  // ── Open / close orchestration (mirrors MenuOverlay's checker pattern) ──
  useEffect(() => {
    const root = rootRef.current;
    const bg = bgRef.current;
    const scroll = scrollRef.current;
    if (!root || !bg || !scroll) return;

    if (checkerRef.current) {
      checkerRef.current();
      checkerRef.current = null;
    }

    if (open) {
      hasOpened.current = true;
      closingRef.current = false;
      setVisible(true);

      // Jump to the requested section before anything is shown
      const target = sectionRefs.current[initialSection || 0];
      if (target) scroll.scrollTop = target.offsetTop;
      state.section = initialSection || 0;

      bg.style.background = "transparent";
      bg.style.backdropFilter = "none";
      bg.style.WebkitBackdropFilter = "none";
      gsap.set(scroll, { opacity: 0 });

      const ck = checkerReveal(root, {
        color: FROST,
        blur: FROST_BLUR,
        maxDelay: 300,
        onComplete: () => {
          checkerRef.current = null;
          bg.style.background = FROST;
          bg.style.backdropFilter = `blur(${FROST_BLUR}px) saturate(1.15)`;
          bg.style.WebkitBackdropFilter = `blur(${FROST_BLUR}px) saturate(1.15)`;
          ck.cleanup();
        },
      });
      checkerRef.current = ck.cleanup;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      gsap.to(scroll, { opacity: 1, duration: 0.5, delay: 0.35 });
      const letters = root.querySelectorAll(".shx-hero__letter");
      const heroBits = root.querySelectorAll(".shx-hero [data-reveal]");
      if (!reduced && letters.length) {
        gsap.fromTo(
          letters,
          { y: 26, opacity: 0, filter: "blur(6px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.8,
            stagger: 0.035,
            ease: "power3.out",
            delay: 0.4,
          }
        );
        gsap.fromTo(
          heroBits,
          { y: 14, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.12,
            ease: "power2.out",
            delay: 0.8,
          }
        );
      } else {
        gsap.set([...letters, ...heroBits], {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
        });
      }

      // Focus the scroller so arrow keys / PageDown work immediately
      scroll.focus({ preventScroll: true });
    } else {
      if (!hasOpened.current) return;

      gsap.to(scroll, { opacity: 0, duration: 0.25, ease: "power2.in" });
      const ck = checkerDissolve(root, {
        color: FROST,
        blur: FROST_BLUR,
        maxDelay: 300,
        onComplete: () => {
          checkerRef.current = null;
          setVisible(false);
        },
      });
      checkerRef.current = ck.cleanup;
      // Tiles carry the frost while the real bg drops away underneath them
      bg.style.background = "transparent";
      bg.style.backdropFilter = "none";
      bg.style.WebkitBackdropFilter = "none";
    }
  }, [open, initialSection]);

  useEffect(() => () => checkerRef.current && checkerRef.current(), []);

  // ── Escape closes ──
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !closingRef.current) {
        closingRef.current = true;
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ── Track current section for the progress rail ──
  const onScroll = useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const mid = scroll.scrollTop + scroll.clientHeight / 2;
    let sec = 0;
    for (let i = 0; i < sectionRefs.current.length; i++) {
      const el = sectionRefs.current[i];
      if (el && el.offsetTop <= mid) sec = i;
    }
    state.section = sec;
  }, []);

  // ── Section reveal on scroll ──
  useEffect(() => {
    if (!visible) return;
    const els = sectionRefs.current.filter(Boolean);
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach(
          (e) => e.isIntersecting && e.target.classList.add("is-in")
        ),
      { root: scrollRef.current, threshold: 0.3 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [visible]);

  const jumpTo = useCallback((idx) => {
    const el = sectionRefs.current[idx];
    const scroll = scrollRef.current;
    if (el && scroll) scroll.scrollTo({ top: el.offsetTop, behavior: "smooth" });
  }, []);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    onClose();
  }, [onClose]);

  const c = config || {};
  const years = "2023 — 2025";

  return (
    <div
      ref={rootRef}
      className={`shx ${visible ? "shx--visible" : ""}`}
      style={{
        "--gc1": c.gradColor1 || "#2c3e6b",
        "--gc2": c.gradColor2 || "#a0c4e8",
        "--gc3": c.gradColor3 || "#4a6fa5",
      }}
    >
      <div ref={bgRef} className="shx__bg" />

      <div
        ref={scrollRef}
        className="shx__scroll"
        onScroll={onScroll}
        tabIndex={-1}
      >
        {/* ── Hero ── */}
        <section ref={setSectionRef(0)} className="shx-section shx-hero">
          <div className="shx-hero__glow" />
          <div className="shx-hero__eyebrow sc-label" data-reveal>
            Portfolio — {String(N).padStart(2, "0")} projects
          </div>
          <HeroTitle />
          <div className="shx-hero__meta sc-label" data-reveal>
            {years} · AI, 3D & full-stack builds
          </div>
          <div className="shx-hero__hint" data-reveal>
            <span className="sc-label">Scroll</span>
            <span className="shx-hero__hint-line" />
          </div>
        </section>

        {/* ── Projects ── */}
        {SHOWCASE_PROJECTS.map((p, i) => (
          <ProjectSection
            key={p.number}
            project={p}
            index={i}
            sectionRef={setSectionRef(i + 1)}
          />
        ))}

        {/* ── Outro / contact ── */}
        <section
          ref={setSectionRef(N + 1)}
          className="shx-section shx-outro"
        >
          <div className="shx-outro__glow" />
          <h2 className="shx-outro__title">Let’s work together</h2>
          <p className="shx-outro__sub">
            Have a project in mind — or just want to say hi?
          </p>
          <div className="shx-outro__social">
            <a
              className="shx-outro__social-link sc-label"
              href="https://github.com/adivrskic"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub <ArrowUpRight size={12} strokeWidth={1.5} />
            </a>
            <a
              className="shx-outro__social-link sc-label"
              href="https://linkedin.com/in/adi-vrskic"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn <ArrowUpRight size={12} strokeWidth={1.5} />
            </a>
            <a
              className="shx-outro__social-link sc-label"
              href="mailto:adivrskic123@gmail.com"
            >
              <Mail size={13} strokeWidth={1.5} /> Email
            </a>
          </div>
          <div className="shx-outro__card">
            <ContactForm compact />
          </div>
          <button className="shx-outro__exit sc-label" onClick={handleClose}>
            <X size={13} strokeWidth={1.5} /> Exit showcase
          </button>
        </section>
      </div>

      {/* Desktop progress rail (hidden on mobile via CSS) */}
      <SectionProgress
        totalSections={TOTAL_SECTIONS}
        themeColor={c.gradColor1}
        onClose={handleClose}
        onJump={jumpTo}
      />

      {/* Mobile close */}
      <button
        className="shx__close"
        onClick={handleClose}
        aria-label="Close showcase"
      >
        <X size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}
