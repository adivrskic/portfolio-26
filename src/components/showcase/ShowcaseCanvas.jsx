import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { TextureLoader, Vector3, MathUtils as ThrMath } from "three";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import {
  EffectComposer,
  DepthOfField,
  N8AO,
} from "@react-three/postprocessing";
import ContactForm from "../contact/ContactForm";
import ShowcaseDebug from "../debug/ShowcaseDebug";

import { SHOWCASE_PROJECTS } from "./ShowcaseProjects";
import { L, state, FONT_URL, TOTAL_SECTIONS, N } from "./ShowcaseLayout";
import { CameraScroll, ProjectSection, Hero } from "./ProjectSection";
import ShowcaseCube from "./ShowcaseCube";
import { SettleFloor } from "./SettleSection";
import IntroWave from "./IntroWave";
import { SectionProgress, SettleFooter } from "./SectionProgress";
import { BG_HEX } from "../../constants/style";
import "./Showcase.css";

// ── Eagerly preload via browser — fires at import time ──
const ALL_IMAGE_URLS = SHOWCASE_PROJECTS.flatMap((p) => p.images);
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
    useLoader.preload(TextureLoader, url);
  });
});

// ── Dynamic depth of field ──
state.focusZ = 0;

function DynamicDof() {
  const dofRef = useRef();
  const smoothZ = useRef(0);
  const smoothBokeh = useRef(L.post.dofBokehScale);
  const smoothRange = useRef(L.post.dofFocusRange);

  useFrame(({ camera }) => {
    if (!dofRef.current) return;

    const sec = state.section;
    const onHero = sec === 0;
    const hovered = state.focusZ > 0 && onHero;

    let targetBokeh, targetRange;

    if (!onHero) {
      // Project sections + settle — kill DOF
      targetBokeh = 0;
      targetRange = 100;
    } else if (hovered) {
      // Hero with cube hover — eliminate blur for sharp cube view
      targetBokeh = 0;
      targetRange = 100;
    } else {
      // Hero idle — normal DoF
      targetBokeh = L.post.dofBokehScale;
      targetRange = L.post.dofFocusRange;
    }

    smoothBokeh.current = ThrMath.lerp(smoothBokeh.current, targetBokeh, 0.1);
    smoothRange.current = ThrMath.lerp(smoothRange.current, targetRange, 0.1);

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

  // Make each section exactly one viewport tall
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

// ── Main export ──
export default function ShowcaseCanvas({
  open,
  onClose,
  config,
  initialSection,
}) {
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
    const container = containerRef.current;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cellW = w / COLS;
    const cellH = h / ROWS;

    // Use pre-made screenshot for the current section
    const curSec = state.section;
    const imgIdx = String(curSec).padStart(2, "0");
    const imgUrl =
      curSec >= 1 && curSec <= N ? `/projects/${imgIdx}.PNG` : null;

    const styleEl = document.createElement("style");
    styleEl.textContent = imgUrl
      ? `.ck-cell{background-image:url(${imgUrl});background-size:${w}px ${h}px;}`
      : `.ck-cell{background:${BG_HEX};}`;
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
  }, []);

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
      // Reset direct DOM visibility override
      if (containerRef.current) containerRef.current.style.visibility = "";
      setVisible(true);
      setLoaderVisible(true);
      const t = setTimeout(() => setLoaderVisible(false), 600);
      return () => clearTimeout(t);
    } else {
      closingRef.current = false;
      setLoaderVisible(false);
      if (!hasOpened.current) return; // don't animate on initial mount
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

  // ── Section checker transition (inside showcase) ──
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

    // Use pre-made screenshot for the current section (before transition)
    const curSec = state.section;
    const imgIdx = String(curSec).padStart(2, "0");
    const imgUrl =
      curSec >= 1 && curSec <= N ? `/projects/${imgIdx}.PNG` : null;

    const styleEl = document.createElement("style");
    const cls = "sk-cell-" + Date.now();
    styleEl.textContent = imgUrl
      ? `.${cls}{background-image:url(${imgUrl});background-size:${w}px ${h}px;}`
      : `.${cls}{background:${BG_HEX};}`;
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
  }, []);

  const onWheel = useCallback(
    (e) => {
      if (closingRef.current) return;
      if (sectionTransitioning.current) return;
      const now = performance.now();
      if (now - lastWheelRef.current < L.anim.wheelDebounce) return;
      lastWheelRef.current = now;

      if (e.deltaY > 10) {
        if (state.section < state.totalSections - 1) {
          triggerSectionTransition(state.section + 1);
        }
      } else if (e.deltaY < -10) {
        if (state.section > 0) {
          triggerSectionTransition(state.section - 1);
        } else {
          closingRef.current = true;
          onClose();
        }
      }
    },
    [onClose, triggerSectionTransition]
  );

  if (!preloaded && visible) return <IntroWave config={config} />;

  const isShown = visible && preloaded;

  return (
    <div
      ref={containerRef}
      onWheel={isShown ? onWheel : undefined}
      className={`showcase ${
        isShown ? "showcase--visible" : "showcase--hidden"
      }`}
      style={{
        "--showcase-bg": BG_HEX,
        "--gc1": config?.gradColor1 || "#1a1a2e",
        "--gc2": config?.gradColor2 || "#2a2a4e",
        "--gc3": config?.gradColor3 || "#3a3a6e",
      }}
    >
      <Canvas
        flat
        shadows
        dpr={[1, 1.5]}
        frameloop={isShown ? "always" : "demand"}
        raycaster={{}}
        camera={{ position: [0, 0, 12], fov: 45, far: 200, near: 0.1 }}
        gl={{
          powerPreference: "high-performance",
          alpha: false,
          antialias: false,
          preserveDrawingBuffer: true,
        }}
        onCreated={({ gl }) => gl.setClearColor(BG_HEX)}
      >
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

      {/* Fingerprint loading overlay */}
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

      {/* UI overlays */}
      {isShown && (
        <>
          <SectionProgress
            totalSections={TOTAL_SECTIONS}
            themeColor={config?.gradColor1}
            onClose={onClose}
            onJump={triggerSectionTransition}
          />
          <SettleFooter
            onClose={onClose}
            onContact={() => setShowContact(true)}
            totalSections={TOTAL_SECTIONS}
          />
        </>
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
  );
}

export { L } from "./ShowcaseLayout";
