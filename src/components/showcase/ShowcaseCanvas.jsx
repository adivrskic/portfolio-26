import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { TextureLoader } from "three";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { Environment, Lightformer, Loader } from "@react-three/drei";
import ContactForm from "../contact/ContactForm";
import ShowcaseDebug from "../debug/ShowcaseDebug";

import { SHOWCASE_PROJECTS } from "./ShowcaseProjects";
import { L, state, FONT_URL, TOTAL_SECTIONS } from "./ShowcaseLayout";
import { CameraScroll, ProjectSection, Hero } from "./ProjectSection";
import ShowcaseCube from "./ShowcaseCube";
import { SettleFloor } from "./SettleSection";
import IntroWave from "./IntroWave";
import { SectionProgress, SettleFooter } from "./SectionProgress";
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

  useEffect(() => {
    preloadPromise.then(() => setPreloaded(true));
  }, []);

  useEffect(() => {
    if (open) {
      state.section = initialSection || 0;
      state.top = 0;
      closingRef.current = false;
      setVisible(true);
      setLoaderVisible(true);
      const t = setTimeout(() => setLoaderVisible(false), 600);
      return () => clearTimeout(t);
    } else {
      closingRef.current = false;
      setLoaderVisible(false);
      const t = setTimeout(() => setVisible(false), 800);
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

  const onWheel = useCallback(
    (e) => {
      if (closingRef.current) return;
      const now = performance.now();
      if (now - lastWheelRef.current < L.anim.wheelDebounce) return;
      lastWheelRef.current = now;

      if (e.deltaY > 10) {
        if (state.section < state.totalSections - 1) state.section += 1;
      } else if (e.deltaY < -10) {
        if (state.section > 0) {
          state.section -= 1;
        } else {
          closingRef.current = true;
          onClose();
        }
      }
    },
    [onClose]
  );

  if (!preloaded && visible) return <IntroWave />;

  const isShown = visible && preloaded;

  return (
    <div
      ref={containerRef}
      onWheel={isShown ? onWheel : undefined}
      className={`showcase ${
        isShown ? "showcase--visible" : "showcase--hidden"
      }`}
    >
      <Canvas
        dpr={[1, 1.5]}
        frameloop={isShown ? "always" : "demand"}
        raycaster={{}}
        camera={{ position: [0, 0, 12], fov: 45, far: 200, near: 0.1 }}
        gl={{
          powerPreference: "high-performance",
          alpha: false,
          antialias: false,
        }}
        onCreated={({ gl }) => gl.setClearColor("#e8e8ee")}
      >
        <ambientLight intensity={0.5} />
        <spotLight
          angle={0.3}
          penumbra={1}
          position={[0, 10, 20]}
          intensity={4}
        />
        <Environment resolution={128}>
          <Lightformer
            intensity={5}
            position={[10, 5, 0]}
            scale={[10, 50, 1]}
            onUpdate={(self) => self.lookAt(0, 0, 0)}
          />
        </Environment>
        <Suspense fallback={null}>
          <Content
            onVpHeight={handleVpHeight}
            themeColor={config?.gradColor1}
          />
        </Suspense>
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
            stroke="#1a1a2e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
            <path d="M2 12a10 10 0 0 1 18-6" />
            <path d="M2 16h.01" />
            <path d="M21.8 16c.2-2 .131-5.354 0-6" />
            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
            <path d="M8.65 22c.21-.66.45-1.32.57-2" />
            <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
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
          />
          <ShowcaseDebug />
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

      <Loader />
    </div>
  );
}

export { L } from "./ShowcaseLayout";
