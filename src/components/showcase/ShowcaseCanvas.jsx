import {
  Suspense,
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
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
import { Flex, Box } from "@react-three/flex";

// Inter font for 3D text — matches the rest of the site
const FONT_URL =
  "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.1/files/inter-latin-300-normal.woff";
function Text(props) {
  return <DreiText font={FONT_URL} {...props} />;
}

const state = { top: 0, section: 0, totalSections: 0 };

// ╔══════════════════════════════════════════════════════════════════╗
// ║  LAYOUT CONFIG — edit these values to tweak everything          ║
// ║  Save the file and HMR will reload instantly                    ║
// ╚══════════════════════════════════════════════════════════════════╝
const L = {
  // ── Section spacing (world units) ──
  sectionH: 14, // vertical distance between sections
  heroH: 8, // hero section height

  // ── Images (3 in a row) — all values are multipliers of vw/vh ──
  img: {
    halfWidth: 0.46, // total row width as fraction of vw
    gap: 0.15, // gap between images (world units)
    aspect: 0.65, // image height = width × this
    centerX: 0.25, // horizontal center of content half (× vw)
    offsetY: 0.12, // push images up from section center (× vh)
  },

  // ── Text — positions are multipliers of vh, from section center ──
  text: {
    centerX: 0.25, // horizontal position (× vw, matches img.centerX)
    maxWidth: 0.44, // max text width (× vw)
    number: { y: -0.06, size: 0.12, spacing: 0.2, color: "#bbbbbb" },
    tag: { y: -0.11, size: 0.08, spacing: 0.25, color: "#aaaaaa" },
    title: { y: -0.2, size: 0.7, spacing: -0.03, color: "#1a1a2e", lineH: 1.1 },
    body: { y: -0.34, size: 0.2, spacing: 0, color: "#888888", lineH: 1.8 },
  },

  // ── Accent backdrop (colored plane behind cube) ──
  backdrop: {
    centerX: 0.25, // horizontal center (× vw)
    width: 0.5, // width (× vw)
    height: 0.85, // height (× vh)
    z: -2, // z depth (behind everything)
    opacity: 0.18, // target opacity when visible
    fadeSpeed: 0.04, // lerp speed for fade
    visRange: 4, // camera distance to start showing
  },

  // ── Glass cube ──
  cube: {
    size: 1.35, // scale at project sections
    centerX: 0.275, // horizontal position (× vw, center of 45% half)
    z: 5, // z depth (in front of everything)
    fadeSpeed: 0.08, // lerp speed for scale fade in/out
    hiddenPause: 0.1, // seconds to stay hidden before teleporting
    push: {
      radius: 14, // cursor push detection radius
      strength: 6, // max push force
      response: 0.1, // how fast push reacts
      decayActive: 0.95, // inertia decay when cursor is near
      decayIdle: 0.92, // inertia decay when cursor is far
    },
  },

  // ── Animations ──
  anim: {
    cameraLerp: 0.045, // camera snap-scroll speed
    textFade: 0.03, // text opacity lerp
    textDrift: 2.0, // text slide-up distance (world units)
    textStagger: 0.2, // delay multiplier between text elements
    textVisRange: 4, // camera distance for text to start showing
    imgFade: 0.03, // image opacity lerp
    imgScale: 0.025, // image scale-up lerp
    imgScaleFrom: 0.92, // starting scale for images
    wheelDebounce: 1000, // ms between scroll snaps
  },

  // ── 3D perspective ──
  perspective: {
    imgRotY: 0.03, // image grid Y rotation (radians)
    textRotY: 0.015, // text Y rotation (radians, half of images)
  },

  // ── Hero ──
  hero: {
    titleSize: 0.12, // × vw
    titleColor: "#1a1a2e",
  },
};

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
const SECTION_H = L.sectionH;
const HERO_H = L.heroH;
// Last project center + half section for scrolling past
const SETTLE_START = HERO_H + (N - 1) * SECTION_H + SECTION_H * 0.5;
// Extra 8 units for cube settling zone at the end
const TOTAL_H = SETTLE_START + 8;

// ── Eagerly preload via browser — fires at import time, long before showcase opens ──
const ALL_IMAGE_URLS = PROJECTS.flatMap((p) => p.images);
const preloadPromise =
  typeof document !== "undefined"
    ? Promise.all([
        // Font
        fetch(FONT_URL, { mode: "cors" }).catch(() => {}),
        // All images — load via Image() for reliable caching
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

// Also do R3F-level preload so useLoader hits cache
PROJECTS.forEach((p) => {
  p.images.forEach((url) => {
    useLoader.preload(THREE.TextureLoader, url);
  });
});

// ── Section positions ──
function getSectionY(idx) {
  if (idx <= 0) return 0; // hero
  if (idx <= N) return HERO_H + (idx - 1) * SECTION_H; // projects 1-N
  return SETTLE_START; // settle
}
const TOTAL_SECTIONS = N + 2; // hero + N projects + settle
state.totalSections = TOTAL_SECTIONS;

// ── Camera — snaps to sections ──
function CameraScroll() {
  const { camera, viewport } = useThree();
  const lerp = useRef(0);
  const introOffset = useRef(null);

  useFrame(() => {
    if (introOffset.current === null)
      introOffset.current = viewport.height * 1.3;
    introOffset.current *= 0.975;
    if (Math.abs(introOffset.current) < 0.01) introOffset.current = 0;

    const targetY = getSectionY(state.section);
    lerp.current = THREE.MathUtils.lerp(
      lerp.current,
      targetY,
      L.anim.cameraLerp
    );
    // Keep state.top in sync for other components
    state.top = lerp.current;
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

// ── Image row: 3 images side by side ──
// ── Text fade — fades + translates up, with stagger delay ──
function TextFade({ sectionY, delay = 0, children }) {
  const ref = useRef();
  const op = useRef(0);
  const started = useRef(false);

  useFrame(({ camera }) => {
    if (!ref.current) return;
    const dist = Math.abs(camera.position.y - sectionY);
    const visible = dist < L.anim.textVisRange;
    if (visible && !started.current) started.current = true;
    const target = visible ? 1 : 0;
    const d = started.current
      ? Math.max(0, target - delay * L.anim.textStagger)
      : 0;
    op.current += (d - op.current) * L.anim.textFade;
    const drift = (1 - op.current) * L.anim.textDrift;
    ref.current.position.y = drift;
    ref.current.traverse((child) => {
      if (child.material && child.material.opacity !== undefined) {
        child.material.opacity = op.current;
        child.material.transparent = true;
      }
    });
  });

  return <group ref={ref}>{children}</group>;
}

// ── Image fade — fades + scales up ──
function ImageFade({ sectionY, children }) {
  const ref = useRef();
  const op = useRef(0);
  const sc = useRef(L.anim.imgScaleFrom);

  useFrame(({ camera }) => {
    if (!ref.current) return;
    const dist = Math.abs(camera.position.y - sectionY);
    const target = dist < L.anim.textVisRange ? 1 : 0;
    op.current += (target - op.current) * L.anim.imgFade;
    sc.current +=
      ((target > 0.5 ? 1 : L.anim.imgScaleFrom) - sc.current) * L.anim.imgScale;
    ref.current.scale.setScalar(sc.current);
    ref.current.traverse((child) => {
      if (child.material && child.material.opacity !== undefined) {
        child.material.opacity = op.current;
        child.material.transparent = true;
      }
    });
  });

  return <group ref={ref}>{children}</group>;
}

// ── Accent plane — fills the cube's half with project color ──
function AccentPlane({ sectionY, color, w, h }) {
  const matRef = useRef();

  useFrame(({ camera }) => {
    if (!matRef.current) return;
    const dist = Math.abs(camera.position.y - sectionY);
    const target = dist < L.backdrop.visRange ? L.backdrop.opacity : 0;
    matRef.current.opacity +=
      (target - matRef.current.opacity) * L.backdrop.fadeSpeed;
  });

  return (
    <mesh position={[0, 0, L.backdrop.z]}>
      <planeGeometry args={[w * 0.9, h * 0.85]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

// ── Project section — @react-three/flex layout ──
function ProjectSection({ project, index, s, vw, vh }) {
  const sectionY = -(HERO_H + index * SECTION_H);
  const flip = index % 2 !== 0;
  const pad = vw * 0.04;
  const imgGap = vw * 0.008;
  const imgAspect = 0.62;

  // Content gets 55%, cube gets 45%
  const contentW = vw * 0.55;
  const cubeW = vw * 0.45;
  const innerW = contentW - pad * 2;

  // Image sizing — 3 across, fill the content width
  const singleImgW = (innerW - imgGap * 2) / 3;
  const singleImgH = singleImgW * imgAspect;

  // Text sizing
  const titleSize = 0.6 * s;
  const bodySize = 0.18 * s;
  const numSize = 0.1 * s;
  const tagSize = 0.07 * s;
  const textMaxW = innerW;

  return (
    <group position={[0, sectionY, 0]}>
      <Flex
        position={[-vw / 2, vh / 2, 0]}
        size={[vw, vh, 0]}
        flexDirection={flip ? "row-reverse" : "row"}
        alignItems="center"
      >
        {/* ── Content: images + text ── */}
        <Box
          width={contentW}
          height={vh}
          flexDirection="column"
          padding={pad}
          justifyContent="center"
        >
          {/* Image row */}
          <Box
            width={innerW}
            height={singleImgH}
            flexDirection="row"
            marginBottom={vh * 0.035}
          >
            {project.images.map((url, i) => (
              <Box
                key={i}
                width={singleImgW}
                height={singleImgH}
                marginLeft={i > 0 ? imgGap : 0}
              >
                <ImageFade sectionY={sectionY}>
                  <Suspense fallback={null}>
                    <Img url={url} w={singleImgW} h={singleImgH} />
                  </Suspense>
                </ImageFade>
              </Box>
            ))}
          </Box>

          {/* Number + Tag row */}
          <Box
            height={numSize * 1.6}
            marginBottom={vh * 0.008}
            flexDirection="row"
            alignItems="center"
          >
            <TextFade sectionY={sectionY} delay={0}>
              <Text
                fontSize={numSize}
                letterSpacing={0.15}
                color="#bbbbbb"
                anchorX="left"
              >
                {project.number}
              </Text>
            </TextFade>
          </Box>

          <Box height={tagSize * 1.6} marginBottom={vh * 0.025}>
            <TextFade sectionY={sectionY} delay={1}>
              <Text
                fontSize={tagSize}
                letterSpacing={0.2}
                color="#aaaaaa"
                anchorX="left"
              >
                {project.tag}
              </Text>
            </TextFade>
          </Box>

          {/* Title */}
          <Box height={titleSize * 1.4} marginBottom={vh * 0.018}>
            <TextFade sectionY={sectionY} delay={2}>
              <Text
                fontSize={titleSize}
                lineHeight={1.1}
                letterSpacing={-0.03}
                color="#1a1a2e"
                anchorX="left"
                anchorY="top"
                textAlign="left"
                maxWidth={textMaxW}
              >
                {project.title}
              </Text>
            </TextFade>
          </Box>

          {/* Description — wraps */}
          <Box height={bodySize * 6}>
            <TextFade sectionY={sectionY} delay={3}>
              <Text
                fontSize={bodySize}
                lineHeight={1.7}
                color="#888888"
                anchorX="left"
                anchorY="top"
                textAlign="left"
                maxWidth={textMaxW * 0.85}
              >
                {project.text}
              </Text>
            </TextFade>
          </Box>
        </Box>

        {/* ── Cube half: accent backdrop ── */}
        <Box
          width={cubeW}
          height={vh}
          justifyContent="center"
          alignItems="center"
          centerAnchor
        >
          {(w, h) => (
            <AccentPlane
              sectionY={sectionY}
              color={project.accent}
              w={w}
              h={h}
            />
          )}
        </Box>
      </Flex>
    </group>
  );
}

function Hero({ s, vw }) {
  const groupRef = useRef();
  const opRef = useRef(0);
  // Lock font size after first valid measurement to prevent jitter
  const lockedVw = useRef(null);
  if (vw > 1 && lockedVw.current === null) lockedVw.current = vw;
  const w = lockedVw.current || vw;

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
        fontSize={w * L.hero.titleSize}
        lineHeight={1}
        letterSpacing={-0.03}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={w * 0.95}
        color={L.hero.titleColor}
      >
        Selected Work
      </Text>
    </group>
  );
}

// ── Glass cube — arcs between image grids, settles at end ──
// Transition effects: refraction blur, scale breathing, rotation burst
// ── Glass cube — fades on scroll, reappears large at sections, cursor push ──
// ── Glass cube — true fade via scale, repositions at each section ──
// ── Glass cube — fade out → teleport → fade in, always in front ──
// ── Glass cube — section-based, fade out → teleport → fade in ──
function ShowcaseCube() {
  const cubeRef = useRef();
  const glowRef = useRef();
  const shadowRef = useRef();
  const { viewport, pointer } = useThree();

  const glowColor = useRef(new THREE.Color("#ffffff"));
  const scaleRef = useRef(1);
  const posX = useRef(0);
  const posY = useRef(0);
  const pushX = useRef(0);
  const pushY = useRef(0);
  const spinVelX = useRef(0);
  const spinVelY = useRef(0);

  // State machine
  const displayedSection = useRef(0); // which section cube is currently showing at
  const phase = useRef("visible"); // visible | fading-out | hidden | fading-in
  const hiddenTimer = useRef(0);

  useFrame(({ clock }) => {
    if (!cubeRef.current) return;
    const vw = viewport.width;
    const vh = viewport.height;
    const dt = 0.016;

    const wantSection = state.section;
    const needsChange = wantSection !== displayedSection.current;
    const FADE_SPEED = L.cube.fadeSpeed;
    const CUBE_SIZE_AT_SECTION = L.cube.size;

    // ── Compute target position for a given section ──
    function getPosForSection(sec) {
      if (sec === 0) {
        // Hero — centered
        return { x: 0, y: -state.top, scale: 1 };
      } else if (sec > 0 && sec <= N) {
        // Project section — on image grid side, half off-screen
        const projIdx = sec - 1;
        // Content is on contentSide, cube goes opposite
        const cubeSide = projIdx % 2 === 0 ? 1 : -1;
        return {
          x: cubeSide * vw * L.cube.centerX,
          y: -(HERO_H + projIdx * SECTION_H),
          scale: CUBE_SIZE_AT_SECTION,
        };
      } else {
        // Settle — expand and fade
        return {
          x: 0,
          y: -SETTLE_START,
          scale: 0.01,
        };
      }
    }

    // ── State machine ──
    if (
      needsChange &&
      (phase.current === "visible" || phase.current === "fading-in")
    ) {
      phase.current = "fading-out";
    }

    if (phase.current === "fading-out") {
      scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, 0, FADE_SPEED);
      if (scaleRef.current < 0.02) {
        scaleRef.current = 0;
        phase.current = "hidden";
        hiddenTimer.current = 0;
      }
    } else if (phase.current === "hidden") {
      scaleRef.current = 0;
      hiddenTimer.current += dt;
      if (hiddenTimer.current > 0.1) {
        displayedSection.current = wantSection;
        const p = getPosForSection(wantSection);
        posX.current = p.x;
        posY.current = p.y;
        phase.current = "fading-in";
        // Spin burst on arrival
        const dir = wantSection % 2 === 0 ? 1 : -1;
        spinVelY.current += dir * 0.12;
        spinVelX.current += 0.05;
      }
    } else if (phase.current === "fading-in") {
      const p = getPosForSection(displayedSection.current);
      scaleRef.current = THREE.MathUtils.lerp(
        scaleRef.current,
        p.scale,
        FADE_SPEED
      );
      posX.current = THREE.MathUtils.lerp(posX.current, p.x, 0.05);
      posY.current = THREE.MathUtils.lerp(posY.current, p.y, 0.05);
      if (Math.abs(scaleRef.current - p.scale) < 0.05) {
        scaleRef.current = p.scale;
        phase.current = "visible";
      }
    } else {
      // visible — track position smoothly
      const p = getPosForSection(displayedSection.current);
      scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, p.scale, 0.04);
      posX.current = THREE.MathUtils.lerp(posX.current, p.x, 0.04);
      posY.current = THREE.MathUtils.lerp(posY.current, p.y, 0.04);
    }

    // ── Cursor push — only at project sections ──
    const inProject =
      displayedSection.current > 0 &&
      displayedSection.current <= N &&
      phase.current === "visible";
    if (inProject) {
      const mouseWX = (pointer.x * vw) / 2;
      const camY = -state.top;
      const mouseAbsY = (pointer.y * vh) / 2 + camY;
      const dx = posX.current - mouseWX;
      const dy = posY.current - mouseAbsY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pushRadius = L.cube.push.radius;
      if (dist < pushRadius && dist > 0.1) {
        const str = Math.pow(1 - dist / pushRadius, 2) * L.cube.push.strength;
        pushX.current +=
          ((dx / dist) * str - pushX.current) * L.cube.push.response;
        pushY.current +=
          ((dy / dist) * str - pushY.current) * L.cube.push.response;
      } else {
        pushX.current *= L.cube.push.decayActive;
        pushY.current *= L.cube.push.decayActive;
      }
    } else {
      pushX.current *= L.cube.push.decayIdle;
      pushY.current *= L.cube.push.decayIdle;
    }

    // ── Apply ──
    cubeRef.current.position.x = posX.current + pushX.current;
    cubeRef.current.position.y = posY.current + pushY.current;
    cubeRef.current.position.z = L.cube.z;
    cubeRef.current.scale.setScalar(Math.max(0.001, scaleRef.current));
    cubeRef.current.visible = scaleRef.current > 0.01;

    // Rotation
    spinVelX.current *= 0.97;
    spinVelY.current *= 0.97;
    cubeRef.current.rotation.x += 0.001 + spinVelX.current;
    cubeRef.current.rotation.y += 0.002 + spinVelY.current;

    // Glow
    const projIdx = displayedSection.current - 1;
    const accent = new THREE.Color(
      projIdx >= 0 && projIdx < N ? PROJECTS[projIdx].accent : "#ffffff"
    );
    glowColor.current.lerp(accent, 0.03);
    if (glowRef.current) {
      glowRef.current.color.copy(glowColor.current);
      glowRef.current.intensity =
        (inProject ? 3 : 0.5) * Math.min(1, scaleRef.current);
      glowRef.current.position.copy(cubeRef.current.position);
      glowRef.current.position.z += 1;
    }
    if (shadowRef.current) {
      shadowRef.current.visible = scaleRef.current > 0.1;
      shadowRef.current.position.x = cubeRef.current.position.x;
      shadowRef.current.position.y =
        cubeRef.current.position.y - 2.5 * scaleRef.current;
      const ss = 3 * scaleRef.current;
      shadowRef.current.scale.set(ss * 1.2, ss, ss);
      shadowRef.current.material.opacity = 0.06 * Math.min(1, scaleRef.current);
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
        edgeOpacity={0.04}
      />
      <pointLight ref={glowRef} intensity={0.5} distance={18} />
      <Shadow
        ref={shadowRef}
        opacity={0.06}
        rotation-x={-Math.PI / 2}
        position={[0, -3, 0]}
        scale={[3, 3, 3]}
      />
    </>
  );
}

// ── Glass cube clump at the settling zone ──
const CLUMP_COUNT = 25;
const CLUMP_CUBE_SIZE = 0.6;

function SettleClump() {
  const meshRef = useRef();
  const groupRef = useRef();
  const mat4 = useMemo(() => new THREE.Matrix4(), []);
  const tmpV = useMemo(() => new THREE.Vector3(), []);
  const dq = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  const { size, viewport, pointer } = useThree();
  const opSmooth = useRef(0);

  const particles = useMemo(() => {
    const rfs = (r) => THREE.MathUtils.randFloatSpread(r);
    const arr = [];
    for (let i = 0; i < CLUMP_COUNT; i++) {
      arr.push({
        pos: new THREE.Vector3(rfs(10), rfs(8), rfs(4)),
        vel: new THREE.Vector3(rfs(0.3), rfs(0.3), rfs(0.1)),
        angVel: new THREE.Vector3(rfs(0.3), rfs(0.3), rfs(0.2)),
        quat: new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rfs(Math.PI), rfs(Math.PI), rfs(Math.PI))
        ),
      });
    }
    return arr;
  }, []);

  const geo = useMemo(
    () =>
      new THREE.BoxGeometry(
        CLUMP_CUBE_SIZE,
        CLUMP_CUBE_SIZE,
        CLUMP_CUBE_SIZE,
        2,
        2,
        2
      ),
    []
  );

  useFrame(({ camera }, dt) => {
    if (!meshRef.current || !groupRef.current) return;
    const d = Math.min(dt, 0.033);

    // Compute settle progress from section state
    const isSettle = state.section >= N + 1;
    const camDist = Math.abs(-camera.position.y - SETTLE_START);
    const targetOp = isSettle ? clamp(1 - camDist / 4, 0, 1) : 0;
    opSmooth.current += (targetOp - opSmooth.current) * 0.04;

    // Apply opacity to material
    const mat = meshRef.current.material;
    if (mat) {
      mat.opacity = opSmooth.current * 0.85;
    }

    // Cursor in world space relative to settle group
    const vw = viewport.width;
    const vh = viewport.height;
    const mouseX = (pointer.x * vw) / 2;
    const mouseY = (pointer.y * vh) / 2;
    const pushRadius = 5;
    const pushStrength = 18;

    for (let i = 0; i < CLUMP_COUNT; i++) {
      const p = particles[i];

      // Attraction toward center
      tmpV.copy(p.pos).normalize().multiplyScalar(-6);
      p.vel.addScaledVector(tmpV, d);

      // Cursor push — repel particles from mouse
      if (isSettle) {
        const dx = p.pos.x - mouseX;
        const dy = p.pos.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pushRadius && dist > 0.05) {
          const force = Math.pow(1 - dist / pushRadius, 2) * pushStrength * d;
          p.vel.x += (dx / dist) * force;
          p.vel.y += (dy / dist) * force;
          // Spin from push
          p.angVel.x += (dy / dist) * force * 0.5;
          p.angVel.y += (dx / dist) * force * 0.5;
        }
      }

      // Damping — high inertia
      p.vel.multiplyScalar(1 - 1.8 * d);
      p.angVel.multiplyScalar(1 - 1.2 * d);
      p.pos.addScaledVector(p.vel, d);

      for (let j = i + 1; j < CLUMP_COUNT; j++) {
        const o = particles[j];
        tmpV.subVectors(p.pos, o.pos);
        const d2 = tmpV.lengthSq();
        const minD = CLUMP_CUBE_SIZE * 2.2;
        if (d2 < minD * minD && d2 > 0.001) {
          const dist = Math.sqrt(d2);
          tmpV.divideScalar(dist);
          const push = (minD - dist) * 0.15;
          p.pos.addScaledVector(tmpV, push);
          o.pos.addScaledVector(tmpV, -push);
          p.angVel.x += tmpV.y * push * 2;
          p.angVel.y += tmpV.x * push * 2;
        }
      }

      if (p.angVel.length() > 0.001) {
        euler.set(p.angVel.x * d, p.angVel.y * d, p.angVel.z * d);
        dq.setFromEuler(euler);
        p.quat.premultiply(dq).normalize();
      }

      mat4.compose(p.pos, p.quat, tmpV.set(1, 1, 1));
      meshRef.current.setMatrixAt(i, mat4);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={[0, -SETTLE_START, 0]}>
      <instancedMesh
        ref={meshRef}
        args={[geo, undefined, CLUMP_COUNT]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          transmission={1}
          roughness={0.08}
          thickness={0.5}
          ior={1.5}
          envMapIntensity={1}
          transparent
          opacity={0}
          color="#ffffff"
        />
      </instancedMesh>
    </group>
  );
}

// ── Name text behind the clump at settle zone ──
function SettleName() {
  const groupRef = useRef();
  const opRef = useRef(0);
  const lockedVw = useRef(null);
  const { viewport } = useThree();
  if (viewport.width > 1 && lockedVw.current === null)
    lockedVw.current = viewport.width;
  const vw = lockedVw.current || viewport.width;

  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    const isSettle = state.section >= N + 1;
    const camDist = Math.abs(-camera.position.y - SETTLE_START);
    const target = isSettle ? clamp(1 - camDist / 4, 0, 1) : 0;
    opRef.current += (target - opRef.current) * 0.035;
    groupRef.current.traverse((child) => {
      if (child.material && child.material.opacity !== undefined) {
        child.material.opacity = opRef.current * 0.15;
        child.material.transparent = true;
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, -SETTLE_START, -3]}>
      <Text
        position={[0, 0, 0]}
        fontSize={vw * 0.14}
        lineHeight={1}
        letterSpacing={0.25}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={vw * 0.95}
        color="#1a1a2e"
      >
        ADI VRSKIC
      </Text>
    </group>
  );
}

// ── Scene ──
function Content({ onVpHeight }) {
  const { viewport } = useThree();
  // Lock dimensions after first valid measurement — prevents text size jitter on mount
  const lockedRef = useRef(null);
  if (viewport.width > 1 && lockedRef.current === null) {
    lockedRef.current = { w: viewport.width, h: viewport.height };
  }
  const vw = lockedRef.current?.w || viewport.width;
  const vh = lockedRef.current?.h || viewport.height;
  const s = Math.min(1, vw / 16);

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
      <SettleName />
      <SettleClump />
    </>
  );
}

// ── Main export ──
export default function ShowcaseCanvas({ open, onClose, config }) {
  const containerRef = useRef();
  const [visible, setVisible] = useState(false);
  const [preloaded, setPreloaded] = useState(false);
  const closingRef = useRef(false);
  const [vpHeight, setVpHeight] = useState(null);
  const lastWheelRef = useRef(0);

  // Preload all assets on mount (not on open)
  useEffect(() => {
    preloadPromise.then(() => setPreloaded(true));
  }, []);

  useEffect(() => {
    if (open) {
      state.section = 0;
      state.top = 0;
      closingRef.current = false;
      setVisible(true);
    } else {
      closingRef.current = false;
      const t = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleVpHeight = useCallback((h) => setVpHeight(h), []);

  // Wheel handler — snap to sections with debounce
  const onWheel = useCallback(
    (e) => {
      if (closingRef.current) return;
      const now = performance.now();
      if (now - lastWheelRef.current < L.anim.wheelDebounce) return; // debounce
      lastWheelRef.current = now;

      if (e.deltaY > 10) {
        // Scroll down — next section
        if (state.section < state.totalSections - 1) {
          state.section += 1;
        }
      } else if (e.deltaY < -10) {
        // Scroll up — previous section
        if (state.section > 0) {
          state.section -= 1;
        } else {
          // At hero, scroll up = close showcase
          closingRef.current = true;
          onClose();
        }
      }
    },
    [onClose]
  );

  // Current section for footer visibility
  const isAtSettle = state.section >= state.totalSections - 1;

  if (!visible) return null;

  if (!preloaded) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: "#e8e8ee",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: "2px solid rgba(26,26,46,0.08)",
            borderTop: "2px solid rgba(26,26,46,0.3)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onWheel={onWheel}
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

      {/* Section progress indicator — rAF-driven, reads state.section directly */}
      <SectionProgress
        totalSections={TOTAL_SECTIONS}
        themeColor={config?.gradColor1}
      />

      <Loader />
    </div>
  );
}

// ── Section progress — vertical line with sliding marker ──
function SectionProgress({ totalSections, themeColor }) {
  const ticksRef = useRef([]);
  const startRef = useRef();
  const endRef = useRef();

  const TICKS_PER = 8;
  const TICK_SPACING = 8;
  const TICK_H = 2;
  const TOTAL_TICKS = totalSections * TICKS_PER;
  const BASE_W = 6;
  const MAX_W = 48;

  const totalH = TOTAL_TICKS * TICK_SPACING;

  useEffect(() => {
    let raf;
    function tick() {
      raf = requestAnimationFrame(tick);
      const sec = state.section;
      const center = sec * TICKS_PER + TICKS_PER / 2;
      const sigma = TICKS_PER * 1.4;

      // Parse theme hex to rgb
      const hex = themeColor || "#1a1a2e";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const themeRgb = `${r},${g},${b}`;

      for (let i = 0; i < TOTAL_TICKS; i++) {
        const el = ticksRef.current[i];
        if (!el) continue;
        const dist = Math.abs(i - center);
        const gauss = Math.exp(-(dist * dist) / (2 * sigma * sigma));
        const w = BASE_W + (MAX_W - BASE_W) * gauss;
        const op = 0.06 + 0.5 * gauss;
        el.style.width = w + "px";
        el.style.opacity = op;
        if (gauss > 0.15) {
          el.style.backgroundColor = `rgba(${themeRgb},1)`;
        } else {
          el.style.backgroundColor = "rgba(26,26,46,1)";
        }
      }
      if (startRef.current) {
        startRef.current.style.opacity = sec === 0 ? "0.3" : "0";
      }
      if (endRef.current) {
        endRef.current.style.opacity = sec >= totalSections - 1 ? "0.3" : "0";
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalSections, themeColor]);

  return (
    <div
      style={{
        position: "absolute",
        right: 24,
        top: "50%",
        transform: "translateY(-50%)",
        height: totalH,
        zIndex: 5,
        pointerEvents: "none",
      }}
    >
      {/* Start label */}
      <div
        ref={startRef}
        style={{
          position: "absolute",
          right: 0,
          top: -18,
          fontFamily: "'Inter',-apple-system,sans-serif",
          fontSize: 8,
          fontWeight: 300,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(26,26,46,1)",
          opacity: 0,
          transition: "opacity 0.5s",
        }}
      >
        Start
      </div>

      {Array.from({ length: TOTAL_TICKS }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            ticksRef.current[i] = el;
          }}
          style={{
            position: "absolute",
            right: 0,
            top: i * TICK_SPACING,
            height: TICK_H,
            width: BASE_W,
            borderRadius: 1,
            background: "rgba(26,26,46,1)",
            opacity: 0.06,
            transition:
              "width 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s, background-color 0.5s",
          }}
        />
      ))}

      {/* End label */}
      <div
        ref={endRef}
        style={{
          position: "absolute",
          right: 0,
          bottom: -18,
          fontFamily: "'Inter',-apple-system,sans-serif",
          fontSize: 8,
          fontWeight: 300,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(26,26,46,1)",
          opacity: 0,
          transition: "opacity 0.5s",
        }}
      >
        End
      </div>
    </div>
  );
}
