import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import {
  Text as DreiText,
  Environment,
  Lightformer,
  Shadow,
  Loader,
} from "@react-three/drei";
import GlassCube from "../scene/GlassCube";

// Inter font for 3D text — matches the rest of the site
const FONT_URL =
  "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.1/files/inter-latin-300-normal.woff";
function Text(props) {
  return <DreiText font={FONT_URL} {...props} />;
}

const state = { top: 0 };

function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

const PROJECTS = [
  {
    number: "01",
    title: "Nimbus",
    tag: "AI WEBSITE GENERATOR · 2025",
    text: "Full-stack AI that generates production-ready websites from prompts. Real-time streaming, 60+ design controls, multi-format export.",
    accent: "#1a8fe0",
    images: [
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&h=400&fit=crop&q=80",
    ],
  },
  {
    number: "02",
    title: "XSBL",
    tag: "WEB ACCESSIBILITY · 2024",
    text: "Accessibility auditing platform with AI analysis, Slack alerts, and WCAG compliance tracking at scale.",
    accent: "#8b5cf6",
    images: [
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=400&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop&q=80",
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop&q=80",
    ],
  },
  {
    number: "03",
    title: "Nimbus WMS",
    tag: "AI WAREHOUSE · 2024",
    text: "Inventory platform with AI demand forecasting, intelligent routing, and native mobile apps.",
    accent: "#10b981",
    images: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&q=80",
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=400&fit=crop&q=80",
      "https://images.unsplash.com/photo-1565688534245-05d6b5be184a?w=600&h=400&fit=crop&q=80",
    ],
  },
  {
    number: "04",
    title: "Pillow",
    tag: "COMPONENT LIBRARY · 2023",
    text: "Neumorphism React library with soft UI design, customizable theming, and composable API.",
    accent: "#f59e0b",
    images: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=400&fit=crop&q=80",
      "https://images.unsplash.com/photo-1545235617-9465d2a55698?w=600&h=400&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop&q=80",
    ],
  },
  {
    number: "05",
    title: "Halo",
    tag: "3D ART · 2023",
    text: "Creative coding — neon text around a 3D object with dynamic lighting in WebGL.",
    accent: "#a855f7",
    images: [
      "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=600&h=400&fit=crop&q=80",
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop&q=80",
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop&q=80",
    ],
  },
];

const N = PROJECTS.length;
const SECTION_H = 14;
const HERO_H = 8;
// Last project center + half section for scrolling past
const SETTLE_START = HERO_H + (N - 1) * SECTION_H + SECTION_H * 0.5;
// Extra 8 units for cube settling zone at the end
const TOTAL_H = SETTLE_START + 8;

// ── Preload all textures + font so they're cached before showcase opens ──
PROJECTS.forEach((p) => {
  p.images.forEach((url) => {
    useLoader.preload(THREE.TextureLoader, url);
  });
});

// ── Eagerly preload via browser — fires at import time, long before showcase opens ──
if (typeof document !== "undefined") {
  const head = document.head;
  // Font
  const fl = document.createElement("link");
  fl.rel = "preload";
  fl.href = FONT_URL;
  fl.as = "fetch";
  fl.crossOrigin = "anonymous";
  head.appendChild(fl);
  // All project images
  PROJECTS.forEach((p) => {
    p.images.forEach((url) => {
      const il = document.createElement("link");
      il.rel = "preload";
      il.href = url;
      il.as = "image";
      head.appendChild(il);
    });
  });
}

// ── Camera — scrolls Y, intro rise from below ──
function CameraScroll() {
  const { camera, viewport, size } = useThree();
  const lerp = useRef(0);
  const introOffset = useRef(null);

  useFrame(() => {
    // Init offset on first frame — content starts below camera
    if (introOffset.current === null)
      introOffset.current = viewport.height * 1.3;
    // Decay offset to 0 — content rises into view
    introOffset.current *= 0.975;
    if (Math.abs(introOffset.current) < 0.01) introOffset.current = 0;

    const maxScroll = size.height * (TOTAL_H / viewport.height);
    const page = (state.top / Math.max(1, maxScroll)) * TOTAL_H;
    lerp.current = THREE.MathUtils.lerp(lerp.current, page, 0.04);
    camera.position.y = -lerp.current + introOffset.current;
    camera.position.x = 0;
  });
  return null;
}

// ── Image plane ──
function Img({ url, w, h }) {
  const tex = useLoader(THREE.TextureLoader, url);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

// ── Image grid: 50vw × 100vh — top spans full, 2 below ──
function ImageGrid({ images, side, vw, vh }) {
  const gap = 0.2;
  const gridW = vw * 0.48;
  const totalH = vh * 0.92;
  const topH = totalH * 0.6;
  const botH = totalH * 0.4 - gap;
  const botW = (gridW - gap) / 2;
  const cx = side * vw * 0.26;

  return (
    <group position={[cx, 0, 0]}>
      {/* Top image — full grid width */}
      <group position={[0, (totalH - topH) / 2, 0]}>
        <Suspense fallback={null}>
          <Img url={images[0]} w={gridW} h={topH} />
        </Suspense>
      </group>
      {/* Bottom left */}
      <group position={[-(botW + gap) / 2, -(totalH - botH) / 2, 0]}>
        <Suspense fallback={null}>
          <Img url={images[1]} w={botW} h={botH} />
        </Suspense>
      </group>
      {/* Bottom right */}
      <group position={[(botW + gap) / 2, -(totalH - botH) / 2, 0]}>
        <Suspense fallback={null}>
          <Img url={images[2]} w={botW} h={botH} />
        </Suspense>
      </group>
    </group>
  );
}

// ── Project section ──
// ── Fade group — fades children based on camera proximity ──
function FadeGroup({ sectionY, children }) {
  const groupRef = useRef();
  const opRef = useRef(0);

  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    // Distance from camera center to section center
    const dist = Math.abs(camera.position.y - sectionY);
    // Fade in when within ~6 units, fully visible within ~3
    const target = clamp(1 - (dist - 3) / 4, 0, 1);
    opRef.current += (target - opRef.current) * 0.035;
    // Also add a subtle upward drift as it fades in
    const drift = (1 - opRef.current) * 1.2;
    groupRef.current.position.y = drift;
    // Apply opacity to all text materials in the group
    groupRef.current.traverse((child) => {
      if (child.material && child.material.opacity !== undefined) {
        child.material.opacity = opRef.current;
        child.material.transparent = true;
      }
    });
  });

  return <group ref={groupRef}>{children}</group>;
}

function ProjectSection({ project, index, s, vw, vh }) {
  const textSide = index % 2 === 0 ? 1 : -1;
  const imageSide = -textSide;
  const sectionY = -(HERO_H + index * SECTION_H);

  const textX = textSide * vw * 0.02;
  const anc = textSide > 0 ? "left" : "right";
  const tAlign = textSide > 0 ? "left" : "right";
  const textMaxW = vw * 0.44;

  return (
    <group position={[0, sectionY, 0]}>
      <FadeGroup sectionY={sectionY}>
        <ImageGrid images={project.images} side={imageSide} vw={vw} vh={vh} />

        <Text
          position={[textX, vh * 0.35, 0.5]}
          fontSize={0.2 * s}
          letterSpacing={0.15}
          anchorX={anc}
          color="#cccccc"
        >
          {project.number}
        </Text>
        <Text
          position={[textX, vh * 0.28, 0.5]}
          fontSize={0.15 * s}
          letterSpacing={0.2}
          anchorX={anc}
          textAlign={tAlign}
          color="#aaaaaa"
        >
          {project.tag}
        </Text>
        <Text
          position={[textX, vh * 0.08, 0.5]}
          fontSize={1.6 * s}
          lineHeight={1.05}
          letterSpacing={-0.04}
          anchorX={anc}
          anchorY="middle"
          textAlign={tAlign}
          maxWidth={textMaxW}
          color="black"
        >
          {project.title}
        </Text>
        <Text
          position={[textX, -vh * 0.12, 0.5]}
          fontSize={0.34 * s}
          lineHeight={1.8}
          letterSpacing={-0.01}
          anchorX={anc}
          anchorY="top"
          textAlign={tAlign}
          maxWidth={textMaxW}
          color="#777777"
        >
          {project.text}
        </Text>
      </FadeGroup>
    </group>
  );
}

// ── Hero ──
function Hero({ s, vw }) {
  const groupRef = useRef();
  const opRef = useRef(0);

  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    const dist = Math.abs(camera.position.y);
    const target = clamp(1 - (dist - 1) / 5, 0, 1);
    opRef.current += (target - opRef.current) * 0.03;
    groupRef.current.traverse((child) => {
      if (child.material && child.material.opacity !== undefined) {
        child.material.opacity = opRef.current;
        child.material.transparent = true;
      }
    });
  });

  return (
    <group position={[0, 0, -1]} ref={groupRef}>
      <Text
        position={[0, 0, 0]}
        fontSize={vw * 0.12}
        lineHeight={1}
        letterSpacing={-0.03}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={vw * 0.95}
        color="#1a1a2e"
      >
        Selected Work
      </Text>
    </group>
  );
}

// ── Glass cube — arcs between image grids, settles at end ──
function ShowcaseCube() {
  const cubeRef = useRef();
  const glowRef = useRef();
  const shadowRef = useRef();
  const { viewport, size } = useThree();
  const lerp = useRef(0);
  const glowColor = useRef(new THREE.Color("#ffffff"));
  const scaleSmooth = useRef(1);

  useFrame(({ clock }) => {
    if (!cubeRef.current) return;
    const maxScroll = size.height * (TOTAL_H / viewport.height);
    const raw = (state.top / Math.max(1, maxScroll)) * TOTAL_H;
    lerp.current = THREE.MathUtils.lerp(lerp.current, raw, 0.035);
    const scroll = lerp.current;

    const t = (1 + Math.sin(clock.getElapsedTime() * 1.0)) / 2;
    const vw = viewport.width;

    const inHero = scroll < HERO_H * 0.6;
    const projScroll = Math.max(0, scroll - HERO_H * 0.5);
    const rawIdx = projScroll / SECTION_H;
    const idx = Math.min(N - 1, Math.floor(rawIdx));
    const sectionT = clamp(rawIdx - idx, 0, 1);
    const inSettle = scroll > SETTLE_START;
    const settleT = clamp((scroll - SETTLE_START) / 8, 0, 1);

    const imageSide = idx % 2 === 0 ? -1 : 1;
    const prevImageSide = idx === 0 ? 0 : (idx - 1) % 2 === 0 ? -1 : 1;
    const imageX = imageSide * vw * 0.26;
    const prevImageX = prevImageSide * vw * 0.26;

    const transRaw = clamp(sectionT / 0.45, 0, 1);
    const transT = ease(transRaw);
    const arcDip = Math.sin(transRaw * Math.PI) * -0.8;

    let targetX, targetY, targetScale;
    if (inHero) {
      targetX = 0;
      targetY = -scroll;
      targetScale = 1;
    } else if (inSettle) {
      targetX = 0;
      targetY = -(SETTLE_START + settleT * 2);
      targetScale = 1 - settleT * 0.65;
    } else {
      targetX = prevImageX + (imageX - prevImageX) * transT;
      const sectionCenterY = -(HERO_H + idx * SECTION_H);
      if (transRaw < 1) {
        targetY = sectionCenterY + arcDip;
      } else {
        const holdDrift = clamp((sectionT - 0.45) / 0.55, 0, 1);
        const nextY = -(HERO_H + Math.min(idx + 1, N - 1) * SECTION_H);
        targetY = THREE.MathUtils.lerp(sectionCenterY, nextY, holdDrift * 0.3);
      }
      targetScale = 1;
    }

    cubeRef.current.position.x = THREE.MathUtils.lerp(
      cubeRef.current.position.x,
      targetX,
      0.025
    );
    cubeRef.current.position.y = THREE.MathUtils.lerp(
      cubeRef.current.position.y,
      targetY,
      0.025
    );
    cubeRef.current.position.z = 2;

    scaleSmooth.current = THREE.MathUtils.lerp(
      scaleSmooth.current,
      targetScale,
      0.03
    );
    cubeRef.current.scale.setScalar(scaleSmooth.current);

    const rotMult = 1 - settleT * 0.9;
    cubeRef.current.rotation.x += 0.001 * rotMult;
    cubeRef.current.rotation.y += 0.002 * rotMult;
    if (inSettle) {
      cubeRef.current.rotation.x *= 0.997;
      cubeRef.current.rotation.z *= 0.997;
    }

    const accent = new THREE.Color(
      !inHero && !inSettle ? PROJECTS[idx].accent : "#ffffff"
    );
    glowColor.current.lerp(accent, 0.03);
    if (glowRef.current) {
      glowRef.current.color.copy(glowColor.current);
      glowRef.current.intensity =
        (!inHero ? 3 + transT * 2 : 0.5) * (1 - settleT * 0.7);
      glowRef.current.position.copy(cubeRef.current.position);
      glowRef.current.position.z += 1;
    }

    if (shadowRef.current) {
      shadowRef.current.position.x = cubeRef.current.position.x;
      shadowRef.current.position.y =
        cubeRef.current.position.y - 2.8 * scaleSmooth.current;
      const ss = (3.5 + t * 0.3) * scaleSmooth.current;
      shadowRef.current.scale.set(ss * 1.2, ss, ss);
      shadowRef.current.material.opacity = 0.12 + settleT * 0.08;
    }
  });

  return (
    <>
      <GlassCube
        ref={cubeRef}
        size={4.0}
        cornerRadius={0.55}
        thickness={2.5}
        backsideThickness={5}
        roughness={0.02}
        ior={1.5}
        chromaticAberration={0.05}
        transmission={1}
        samples={8}
        resolution={512}
        enableIdleSpin={false}
        showEdges={true}
        edgeOpacity={0.06}
      />
      <pointLight ref={glowRef} intensity={0.5} distance={18} />
      <Shadow
        ref={shadowRef}
        opacity={0.12}
        rotation-x={-Math.PI / 2}
        position={[0, -3, 0]}
        scale={[3.5, 3.5, 3.5]}
      />
    </>
  );
}

// ── Scene ──
function Content({ onVpHeight }) {
  const { viewport } = useThree();
  const s = Math.min(1, viewport.width / 16);
  const vw = viewport.width;
  const vh = viewport.height;

  // Report viewport height to parent for scroll calculation
  useEffect(() => {
    if (onVpHeight) onVpHeight(viewport.height);
  }, [viewport.height, onVpHeight]);

  return (
    <>
      <CameraScroll />
      <Hero s={s} vw={vw} />
      {PROJECTS.map((p, i) => (
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
    </>
  );
}

// ── Main export ──
export default function ShowcaseCanvas({ open, onClose }) {
  const scrollArea = useRef();
  const containerRef = useRef();
  const [visible, setVisible] = useState(false);
  const pullRef = useRef(0);
  const closingRef = useRef(false);
  // Measured from R3F — the exact world-space viewport height
  const [vpHeight, setVpHeight] = useState(null);
  const [containerH, setContainerH] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (open) {
      state.top = 0;
      pullRef.current = 0;
      closingRef.current = false;
      setScrollProgress(0);
      if (scrollArea.current) scrollArea.current.scrollTop = 0;
      setVisible(true);
    } else {
      closingRef.current = false;
      const t = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Measure container height precisely via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerH(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible]);

  const handleVpHeight = useCallback((h) => setVpHeight(h), []);

  const onScroll = useCallback((e) => {
    const el = e.target;
    state.top = el.scrollTop;
    const max = el.scrollHeight - el.clientHeight;
    if (max > 0) setScrollProgress(el.scrollTop / max);
  }, []);

  // Scroll up at top → close showcase and return to scene
  const onWheel = useCallback(
    (e) => {
      if (closingRef.current) return;
      const el = scrollArea.current;
      if (!el || el.scrollTop > 2) {
        pullRef.current = 0;
        return;
      }
      if (e.deltaY < 0) {
        pullRef.current += Math.abs(e.deltaY);
        if (pullRef.current > 150) {
          closingRef.current = true;
          onClose();
        }
      } else {
        pullRef.current = 0;
      }
    },
    [onClose]
  );

  // Precise scroll div height: containerH * (1 + TOTAL_H / vpHeight)
  // This makes scrollTop max = containerH * TOTAL_H / vpHeight = maxScroll exactly
  let scrollDivPx = null;
  if (vpHeight && containerH) {
    scrollDivPx = Math.round(containerH * (1 + TOTAL_H / vpHeight));
  }
  // Fallback before R3F measures viewport (brief flash before first frame)
  const fallbackHeight = `${Math.round((1 + TOTAL_H / 9.94) * 100)}%`;

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        cursor: "default",
        background: "#e8e8ee",
        overflow: "hidden",
      }}
    >
      <Canvas
        dpr={[1, 2]}
        raycaster={{ enabled: false }}
        camera={{ position: [0, 0, 12], fov: 45, far: 200, near: 0.1 }}
        gl={{
          powerPreference: "high-performance",
          alpha: false,
          antialias: true,
        }}
        onCreated={({ gl }) => gl.setClearColor("#e8e8ee")}
      >
        <ambientLight intensity={0.5} />
        <spotLight
          castShadow
          angle={0.3}
          penumbra={1}
          position={[0, 10, 20]}
          intensity={4}
        />
        <Environment resolution={256}>
          <Lightformer
            intensity={5}
            position={[10, 5, 0]}
            scale={[10, 50, 1]}
            onUpdate={(self) => self.lookAt(0, 0, 0)}
          />
        </Environment>
        <Suspense fallback={null}>
          <Content onVpHeight={handleVpHeight} />
        </Suspense>
      </Canvas>

      {/* Scroll overlay */}
      <div
        ref={scrollArea}
        onScroll={onScroll}
        onWheel={onWheel}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          overflow: "auto",
          cursor: "default",
          zIndex: 3,
        }}
      >
        <div
          style={{
            height: scrollDivPx ? `${scrollDivPx}px` : fallbackHeight,
          }}
        />
      </div>

      {/* End overlay — fades in when scrolled to the settling zone */}
      {(() => {
        const opacity = clamp((scrollProgress - 0.85) / 0.15, 0, 1);
        const yShift = (1 - opacity) * 30;
        return (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingBottom: 48,
              gap: 20,
              opacity,
              transform: `translateY(${yShift}px)`,
              transition: "opacity 0.3s ease, transform 0.3s ease",
              pointerEvents: opacity > 0.3 ? "auto" : "none",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontFamily: "'Inter',-apple-system,sans-serif",
                fontWeight: 300,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "rgba(26,26,46,0.25)",
              }}
            >
              End of showcase
            </span>
            <div style={{ display: "flex", gap: 32 }}>
              <button
                onClick={() => {
                  if (scrollArea.current) {
                    scrollArea.current.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                style={{
                  fontSize: 13,
                  fontFamily: "'Inter',-apple-system,sans-serif",
                  fontWeight: 300,
                  letterSpacing: "0.06em",
                  color: "rgba(26,26,46,0.6)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 16px",
                  borderRadius: 6,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.background = "rgba(26,26,46,0.04)")
                }
                onMouseLeave={(e) => (e.target.style.background = "none")}
              >
                ↑ Back to top
              </button>
              <button
                onClick={onClose}
                style={{
                  fontSize: 13,
                  fontFamily: "'Inter',-apple-system,sans-serif",
                  fontWeight: 300,
                  letterSpacing: "0.06em",
                  color: "rgba(26,26,46,0.6)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 16px",
                  borderRadius: 6,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.background = "rgba(26,26,46,0.04)")
                }
                onMouseLeave={(e) => (e.target.style.background = "none")}
              >
                Contact →
              </button>
            </div>
          </div>
        );
      })()}

      <Loader />
    </div>
  );
}
