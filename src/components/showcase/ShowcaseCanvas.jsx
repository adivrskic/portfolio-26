import {
  Suspense,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import {
  TextureLoader,
  Vector3,
  MathUtils as ThrMath,
  CanvasTexture,
  SRGBColorSpace,
} from "three";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import {
  EffectComposer,
  DepthOfField,
  N8AO,
} from "@react-three/postprocessing";
import ContactForm from "../contact/ContactForm";
import { ChevronDown, ChevronUp, X as XIcon } from "lucide-react";

import { SHOWCASE_PROJECTS } from "./ShowcaseProjects";
import { L, state, FONT_URL, TOTAL_SECTIONS, N } from "./ShowcaseLayout";
import { CameraScroll, ProjectSection, Hero } from "./ProjectSection";
import ShowcaseCube from "./ShowcaseCube";
import { SettleFloor } from "./SettleSection";
import IntroWave from "./IntroWave";
import { SectionProgress, SettleFooter } from "./SectionProgress";
import { BG_HEX } from "../../constants/style";
import { mixHex } from "../../utils/color";
import "./Showcase.css";

// Width-based only: touch-capable laptops should still get the desktop UI.
// Matches the ~vw<8 breakpoint the canvas layouts use.
const IS_MOBILE = typeof window !== "undefined" && window.innerWidth < 768;

// Full-screen stills used by the checkerboard transitions
const TRANSITION_URLS = SHOWCASE_PROJECTS.map(
  (_, i) => `/projects/${String(i + 1).padStart(2, "0")}.jpg`
);

// ── Eagerly preload via browser — fires at import time ──
const ALL_IMAGE_URLS = [
  ...SHOWCASE_PROJECTS.flatMap((p) => p.images),
  ...TRANSITION_URLS,
];
const preloadPromise =
  typeof document !== "undefined"
    ? Promise.all([
        fetch(FONT_URL, { mode: "cors" }).catch(() => {}),
        ...ALL_IMAGE_URLS.map(
          (url) =>
            new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = resolve;
              img.onerror = resolve;
              img.src = url;
            })
        ),
      ])
    : Promise.resolve();

SHOWCASE_PROJECTS.forEach((p) => {
  p.images.forEach((url) => {
    try {
      useLoader.preload(TextureLoader, url);
    } catch (e) {}
  });
});

// ── Gradient backdrop — carries the homepage's blob gradient into the
// showcase so it reads as the same world, not a separate page. Captures the
// live gradient canvas once per open into a tiny texture (LinearFilter
// upscaling keeps it soft) with a light wash for text contrast. ──
function GradientBackdrop({ gradientCanvas, bg }) {
  const { viewport } = useThree();
  const meshRef = useRef();

  const texture = useMemo(() => {
    if (!gradientCanvas) return null;
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 60;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
    try {
      ctx.drawImage(gradientCanvas, 0, 0, c.width, c.height);
    } catch {}
    ctx.fillStyle = "rgba(232,232,238,0.68)";
    ctx.fillRect(0, 0, c.width, c.height);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [gradientCanvas, bg]);

  useEffect(() => () => texture && texture.dispose(), [texture]);

  useFrame(({ camera }) => {
    // Slight parallax lag against the camera for depth
    if (meshRef.current) meshRef.current.position.y = camera.position.y * 0.985;
  });

  if (!texture) return null;
  // Plane sits at z=-30, camera at z=12 → needs viewport × (42/12) to cover
  return (
    <mesh ref={meshRef} position={[0, 0, -30]} renderOrder={-10}>
      <planeGeometry args={[viewport.width * 3.8, viewport.height * 3.8]} />
      <meshBasicMaterial map={texture} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

// ── Dynamic depth of field ──
state.focusZ = 0;

function DynamicDof() {
  const dofRef = useRef();
  const smoothBokeh = useRef(L.post.dofBokehScale);
  const smoothRange = useRef(L.post.dofFocusRange);

  useFrame(({ camera }) => {
    if (!dofRef.current) return;
    const sec = state.section;
    const onHero = sec === 0;

    if (!onHero) {
      smoothBokeh.current = 0;
      smoothRange.current = 100;
    } else if (state.focusZ > 0) {
      smoothBokeh.current = ThrMath.lerp(smoothBokeh.current, 0, 0.15);
      smoothRange.current = ThrMath.lerp(smoothRange.current, 100, 0.15);
    } else {
      smoothBokeh.current = ThrMath.lerp(
        smoothBokeh.current,
        L.post.dofBokehScale,
        0.1
      );
      smoothRange.current = ThrMath.lerp(
        smoothRange.current,
        L.post.dofFocusRange,
        0.1
      );
    }

    dofRef.current.target.set(0, camera.position.y, 0);
    dofRef.current.bokehScale = smoothBokeh.current;
    dofRef.current.focusRange = smoothRange.current;
  });

  return (
    <DepthOfField
      ref={dofRef}
      target={[0, 0, 0]}
      focusRange={L.post.dofFocusRange}
      bokehScale={L.post.dofBokehScale}
    />
  );
}

// ── Scene content ──
function Content({ onVpHeight, themeColor }) {
  const { viewport } = useThree();
  const lockedRef = useRef(null);
  if (viewport.width > 1 && lockedRef.current === null) {
    lockedRef.current = { w: viewport.width, h: viewport.height };
  }
  const vw = lockedRef.current?.w || viewport.width;
  const vh = lockedRef.current?.h || viewport.height;
  const s = Math.min(1, vw / 16);

  if (vh > 1) {
    L.heroH = vh;
    L.sectionH = vh;
  }

  useEffect(() => {
    if (onVpHeight) onVpHeight(viewport.height);
  }, [viewport.height, onVpHeight]);

  return (
    <>
      <CameraScroll />
      <Hero s={s} vw={vw} />
      {SHOWCASE_PROJECTS.map((p, i) => (
        <ProjectSection
          key={p.number}
          project={p}
          index={i}
          s={s}
          vw={vw}
          vh={vh}
        />
      ))}
      <ShowcaseCube />
      <SettleFloor themeColor={themeColor} />
    </>
  );
}

// ── Bottom nav bar (mobile + desktop) ──
function NavBar({ onNext, onPrev, onClose, currentSection, totalSections }) {
  const [sec, setSec] = useState(state.section);

  useEffect(() => {
    return state.subscribe((v) => setSec(v));
  }, []);

  const isFirst = sec === 0;
  const isLast = sec >= totalSections - 1;

  return (
    <div className="showcase__nav">
      {isFirst ? (
        <button
          className="showcase__nav-btn showcase__nav-btn--close"
          onClick={onClose}
        >
          <XIcon size={16} strokeWidth={1.5} />
          <span>Close</span>
        </button>
      ) : (
        <button className="showcase__nav-btn" onClick={onPrev}>
          <ChevronUp size={16} strokeWidth={1.5} />
          <span>Prev</span>
        </button>
      )}

      <span className="showcase__nav-label">
        {String(sec + 1).padStart(2, "0")} /{" "}
        {String(totalSections).padStart(2, "0")}
      </span>

      {isLast ? (
        <button
          className="showcase__nav-btn showcase__nav-btn--close"
          onClick={onClose}
        >
          <XIcon size={16} strokeWidth={1.5} />
          <span>Exit</span>
        </button>
      ) : (
        <button
          className="showcase__nav-btn showcase__nav-btn--next"
          onClick={onNext}
        >
          <span>Next</span>
          <ChevronDown size={16} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

// ── Main export ──
export default function ShowcaseCanvas({
  open,
  onClose,
  config,
  initialSection,
  gradientCanvas,
}) {
  // Theme-tinted background so the showcase inherits the active season
  const tintedBg = useMemo(
    () => mixHex(BG_HEX, config?.gradColor1 || "#1a1a2e", 0.08),
    [config?.gradColor1]
  );
  const containerRef = useRef();
  const [visible, setVisible] = useState(false);
  const [preloaded, setPreloaded] = useState(false);
  const closingRef = useRef(false);
  const [vpHeight, setVpHeight] = useState(null);
  const lastWheelRef = useRef(0);
  const [showContact, setShowContact] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(false);
  const checkerGridRef = useRef(null);
  const hasOpened = useRef(false);

  // Touch swipe tracking
  const touchStartY = useRef(null);
  const touchStartTime = useRef(0);

  const COLS = 16,
    ROWS = 10;

  const cellDelaysRef = useRef(null);
  if (!cellDelaysRef.current) {
    const cx = COLS / 2,
      cy = ROWS / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const d = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        d.push(Math.sqrt((c - cx) ** 2 + (r - cy) ** 2) / maxR);
    cellDelaysRef.current = d;
  }

  const triggerCheckerClose = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cellW = w / COLS;
    const cellH = h / ROWS;

    const curSec = state.section;
    const imgIdx = String(curSec).padStart(2, "0");
    const imgUrl =
      curSec >= 1 && curSec <= N ? `/projects/${imgIdx}.jpg` : null;

    const styleEl = document.createElement("style");
    styleEl.textContent = imgUrl
      ? `.ck-cell{background-image:url(${imgUrl});background-size:${w}px ${h}px;}`
      : `.ck-cell{background:${tintedBg};}`;
    document.head.appendChild(styleEl);

    const grid = document.createElement("div");
    grid.style.cssText =
      "position:fixed;inset:0;z-index:9999;display:grid;pointer-events:none;" +
      `grid-template-columns:repeat(${COLS},1fr);grid-template-rows:repeat(${ROWS},1fr);`;

    const cells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "ck-cell";
        cell.style.cssText =
          `background-position:${-c * cellW}px ${-r * cellH}px;` +
          "transform:scale(1);" +
          "transition:transform 0.8s cubic-bezier(0.25,0,0.2,1);";
        grid.appendChild(cell);
        cells.push(cell);
      }
    }

    document.body.appendChild(grid);
    checkerGridRef.current = grid;
    checkerGridRef.styleEl = styleEl;

    requestAnimationFrame(() => {
      if (containerRef.current)
        containerRef.current.style.visibility = "hidden";
      setVisible(false);
      requestAnimationFrame(() => {
        const delays = cellDelaysRef.current;
        for (let i = 0; i < cells.length; i++) {
          cells[i].style.transitionDelay = delays[i] * 1000 + "ms";
          cells[i].style.transform = "scale(0)";
        }
      });
    });
  }, [tintedBg]);

  const clearChecker = useCallback(() => {
    if (checkerGridRef.current) {
      checkerGridRef.current.remove();
      if (checkerGridRef.styleEl) checkerGridRef.styleEl.remove();
      checkerGridRef.current = null;
    }
  }, []);

  useEffect(() => {
    preloadPromise.then(() => setPreloaded(true));
  }, []);

  useEffect(() => {
    if (open) {
      hasOpened.current = true;
      state.section = initialSection || 0;
      state.top = 0;
      closingRef.current = false;
      clearChecker();
      if (sectionGridRef.current) {
        sectionGridRef.current.remove();
        sectionGridRef.current = null;
      }
      sectionTransitioning.current = false;
      if (containerRef.current) containerRef.current.style.visibility = "";
      setVisible(true);
      setLoaderVisible(true);
      const t = setTimeout(() => setLoaderVisible(false), 600);
      return () => clearTimeout(t);
    } else {
      closingRef.current = false;
      setLoaderVisible(false);
      if (!hasOpened.current) return;
      triggerCheckerClose();
      const t = setTimeout(() => {
        clearChecker();
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !closingRef.current) {
        closingRef.current = true;
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  const handleVpHeight = useCallback((h) => setVpHeight(h), []);

  const sectionGridRef = useRef(null);
  const sectionTransitioning = useRef(false);

  const triggerSectionTransition = useCallback((newSection) => {
    if (sectionTransitioning.current) return;
    sectionTransitioning.current = true;

    const container = containerRef.current;
    if (!container) {
      sectionTransitioning.current = false;
      return;
    }

    const w = container.offsetWidth;
    const h = container.offsetHeight;
    const cellW = w / COLS;
    const cellH = h / ROWS;

    const curSec = state.section;
    const imgIdx = String(curSec).padStart(2, "0");
    const imgUrl =
      curSec >= 1 && curSec <= N ? `/projects/${imgIdx}.jpg` : null;

    const styleEl = document.createElement("style");
    const cls = "sk-cell-" + Date.now();
    styleEl.textContent = imgUrl
      ? `.${cls}{background-image:url(${imgUrl});background-size:${w}px ${h}px;}`
      : `.${cls}{background:${tintedBg};}`;
    document.head.appendChild(styleEl);

    const grid = document.createElement("div");
    grid.style.cssText =
      "position:absolute;inset:0;z-index:12;display:grid;pointer-events:none;" +
      `grid-template-columns:repeat(${COLS},1fr);grid-template-rows:repeat(${ROWS},1fr);`;

    const cells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement("div");
        cell.className = cls;
        cell.style.cssText =
          `background-position:${-c * cellW}px ${-r * cellH}px;` +
          "transform:scale(1);" +
          "transition:transform 0.6s cubic-bezier(0.25,0,0.2,1);";
        grid.appendChild(cell);
        cells.push(cell);
      }
    }

    container.appendChild(grid);
    sectionGridRef.current = grid;

    requestAnimationFrame(() => {
      state.section = newSection;
      state.snapCamera = true;

      requestAnimationFrame(() => {
        const delays = cellDelaysRef.current;
        for (let i = 0; i < cells.length; i++) {
          cells[i].style.transitionDelay = delays[i] * 600 + "ms";
          cells[i].style.transform = "scale(0)";
        }
        setTimeout(() => {
          if (sectionGridRef.current) {
            sectionGridRef.current.remove();
            sectionGridRef.current = null;
          }
          styleEl.remove();
          sectionTransitioning.current = false;
        }, 1600);
      });
    });
  }, [tintedBg]);

  // ── Navigation helpers ──
  const goNext = useCallback(() => {
    if (closingRef.current || sectionTransitioning.current) return;
    if (state.section < state.totalSections - 1) {
      triggerSectionTransition(state.section + 1);
    }
  }, [triggerSectionTransition]);

  const goPrev = useCallback(() => {
    if (closingRef.current || sectionTransitioning.current) return;
    if (state.section > 0) {
      triggerSectionTransition(state.section - 1);
    } else {
      closingRef.current = true;
      onClose();
    }
  }, [onClose, triggerSectionTransition]);

  const onWheel = useCallback(
    (e) => {
      if (closingRef.current || sectionTransitioning.current) return;
      const now = performance.now();
      if (now - lastWheelRef.current < L.anim.wheelDebounce) return;
      lastWheelRef.current = now;

      if (e.deltaY > 10) goNext();
      else if (e.deltaY < -10) goPrev();
    },
    [goNext, goPrev]
  );

  // ── Touch swipe ──
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      touchStartY.current = e.touches[0].clientY;
      touchStartTime.current = performance.now();
    }
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      if (touchStartY.current === null) return;
      const endY = e.changedTouches[0].clientY;
      const dy = touchStartY.current - endY;
      const elapsed = performance.now() - touchStartTime.current;
      touchStartY.current = null;

      // Require at least 40px swipe within 500ms
      if (Math.abs(dy) < 40 || elapsed > 500) return;
      if (closingRef.current || sectionTransitioning.current) return;

      const now = performance.now();
      if (now - lastWheelRef.current < L.anim.wheelDebounce) return;
      lastWheelRef.current = now;

      if (dy > 0) goNext();
      else goPrev();
    },
    [goNext, goPrev]
  );

  const isShown = visible && preloaded;

  return (
    <>
      {/* Loading overlay while assets preload — Canvas stays mounted so the
          scene keeps compiling behind it instead of remounting from scratch */}
      {visible && !preloaded && <IntroWave config={config} />}
      <div
      ref={containerRef}
      onWheel={isShown ? onWheel : undefined}
      onTouchStart={isShown ? onTouchStart : undefined}
      onTouchEnd={isShown ? onTouchEnd : undefined}
      className={`showcase ${
        isShown ? "showcase--visible" : "showcase--hidden"
      }`}
      style={{
        "--showcase-bg": tintedBg,
        "--gc1": config?.gradColor1 || "#1a1a2e",
        "--gc2": config?.gradColor2 || "#2a2a4e",
        "--gc3": config?.gradColor3 || "#3a3a6e",
      }}
    >
      <Canvas
        flat
        shadows
        dpr={[1, IS_MOBILE ? 1 : 1.5]}
        frameloop={isShown ? "always" : "demand"}
        camera={{ position: [0, 0, 12], fov: 45, far: 200, near: 0.1 }}
        gl={{
          powerPreference: "high-performance",
          alpha: false,
          antialias: false,
        }}
      >
        <color attach="background" args={[tintedBg]} />
        <GradientBackdrop gradientCanvas={gradientCanvas} bg={tintedBg} />
        <ambientLight intensity={L.light.ambientIntensity} />
        <directionalLight
          position={[L.light.dirX, L.light.dirY, L.light.dirZ]}
          intensity={L.light.dirIntensity}
          castShadow
          shadow-mapSize={[256, 256]}
          shadow-bias={-0.0001}
        />
        <Environment resolution={64}>
          <Lightformer
            position={[10, 10, 10]}
            scale={10}
            intensity={L.light.env1Intensity}
          />
          <Lightformer
            position={[10, 0, -10]}
            scale={10}
            intensity={L.light.env2Intensity}
          />
          <Lightformer
            position={[-10, -10, -10]}
            scale={10}
            intensity={L.light.env3Intensity}
          />
        </Environment>
        <Suspense fallback={null}>
          <Content
            onVpHeight={handleVpHeight}
            themeColor={config?.gradColor1}
          />
        </Suspense>
        <EffectComposer>
          <N8AO aoRadius={L.post.aoRadius} intensity={L.post.aoIntensity} />
          <DynamicDof />
        </EffectComposer>
      </Canvas>

      {/* Fingerprint loading overlay — theme gradient fill */}
      {isShown && (
        <div
          className={`showcase__loader ${
            loaderVisible
              ? "showcase__loader--visible"
              : "showcase__loader--hidden"
          }`}
        >
          <svg
            className="showcase__loader-icon"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <defs>
              <linearGradient id="fp-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--gc1, #1a1a2e)" />
                <stop offset="50%" stopColor="var(--gc2, #2a2a4e)" />
                <stop offset="100%" stopColor="var(--gc3, #3a3a6e)" />
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
        </div>
      )}

      {/* UI overlays — portaled to body so they sit above checkerboard grids */}
      {isShown &&
        createPortal(
          <div
            className="showcase-nav-portal"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              pointerEvents: "none",
            }}
          >
            {/* Desktop: side progress ticks. Hidden on mobile. */}
            {!IS_MOBILE && (
              <SectionProgress
                totalSections={TOTAL_SECTIONS}
                themeColor={config?.gradColor1}
                onClose={onClose}
                onJump={triggerSectionTransition}
              />
            )}
            <SettleFooter
              onClose={onClose}
              onContact={() => setShowContact(true)}
              totalSections={TOTAL_SECTIONS}
            />
            {/* Bottom nav bar — mobile only */}
            {IS_MOBILE && (
              <NavBar
                onNext={goNext}
                onPrev={goPrev}
                onClose={onClose}
                currentSection={0}
                totalSections={TOTAL_SECTIONS}
              />
            )}
          </div>,
          document.body
        )}

      {/* Contact overlay */}
      <div
        className={`showcase__contact ${
          showContact ? "showcase__contact--open" : ""
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowContact(false);
        }}
      >
        <div className="showcase__contact-inner">
          <button
            className="showcase__contact-close sc-label"
            onClick={() => setShowContact(false)}
          >
            Close
          </button>
          <ContactForm />
        </div>
      </div>
    </div>
    </>
  );
}

export { L } from "./ShowcaseLayout";
