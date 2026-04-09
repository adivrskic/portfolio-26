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
    lerp.current = THREE.MathUtils.lerp(lerp.current, page, 0.12);
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
function FadeGroup({ sectionY, children, parallaxStrength = 0.08 }) {
  const groupRef = useRef();
  const opRef = useRef(0);

  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    const dist = Math.abs(camera.position.y - sectionY);
    const target = clamp(1 - (dist - 2) / 5, 0, 1);
    opRef.current += (target - opRef.current) * 0.05;
    // Parallax: content drifts slightly slower than camera
    const camDelta = camera.position.y - sectionY;
    const drift = camDelta * parallaxStrength + (1 - opRef.current) * 0.8;
    groupRef.current.position.y = drift;
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
  const textMaxW = vw * 0.38;

  return (
    <group position={[0, sectionY, 0]}>
      <FadeGroup sectionY={sectionY}>
        <ImageGrid images={project.images} side={imageSide} vw={vw} vh={vh} />

        <Text
          position={[textX, vh * 0.32, 0.5]}
          fontSize={0.14 * s}
          letterSpacing={0.2}
          anchorX={anc}
          color="#bbbbbb"
        >
          {project.number}
        </Text>
        <Text
          position={[textX, vh * 0.26, 0.5]}
          fontSize={0.1 * s}
          letterSpacing={0.25}
          anchorX={anc}
          textAlign={tAlign}
          color="#aaaaaa"
        >
          {project.tag}
        </Text>
        <Text
          position={[textX, vh * 0.1, 0.5]}
          fontSize={1.1 * s}
          lineHeight={1.1}
          letterSpacing={-0.03}
          anchorX={anc}
          anchorY="middle"
          textAlign={tAlign}
          maxWidth={textMaxW}
          color="#1a1a2e"
        >
          {project.title}
        </Text>
        <Text
          position={[textX, -vh * 0.08, 0.5]}
          fontSize={0.24 * s}
          lineHeight={1.8}
          letterSpacing={0}
          anchorX={anc}
          anchorY="top"
          textAlign={tAlign}
          maxWidth={textMaxW}
          color="#888888"
        >
          {project.text}
        </Text>
      </FadeGroup>
    </group>
  );
}

// ── Hero ──// ── Hero ──
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
        fontSize={w * 0.12}
        lineHeight={1}
        letterSpacing={-0.03}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={w * 0.95}
        color="#1a1a2e"
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
function ShowcaseCube() {
  const cubeRef = useRef();
  const glowRef = useRef();
  const shadowRef = useRef();
  const { viewport, size, pointer } = useThree();
  const scrollLerp = useRef(0);
  const glowColor = useRef(new THREE.Color("#ffffff"));
  const scaleSmooth = useRef(1);
  const posX = useRef(0);
  const posY = useRef(0);
  const pushX = useRef(0);
  const pushY = useRef(0);
  const spinVelX = useRef(0);
  const spinVelY = useRef(0);
  const prevIdx = useRef(-1);

  useFrame(({ clock }) => {
    if (!cubeRef.current) return;
    const dt = clock.getDelta ? Math.min(clock.getDelta(), 0.033) : 0.016;
    const maxScroll = size.height * (TOTAL_H / viewport.height);
    const raw = (state.top / Math.max(1, maxScroll)) * TOTAL_H;
    scrollLerp.current = THREE.MathUtils.lerp(scrollLerp.current, raw, 0.1);
    const scroll = scrollLerp.current;

    const vw = viewport.width;
    const vh = viewport.height;

    // ── Zone detection ──
    const inHero = scroll < HERO_H * 0.3;
    const heroExit = scroll >= HERO_H * 0.3 && scroll < HERO_H;
    const projScroll = Math.max(0, scroll - HERO_H * 0.5);
    const rawIdx = projScroll / SECTION_H;
    const idx = Math.min(N - 1, Math.floor(rawIdx));
    const sectionT = clamp(rawIdx - idx, 0, 1);
    const inSettle = scroll > SETTLE_START;
    const settleT = clamp((scroll - SETTLE_START) / 8, 0, 1);
    const inProject = !inHero && !heroExit && !inSettle;

    // Image grid positions — exactly matching ImageGrid component
    // textSide = idx % 2 === 0 ? 1 : -1; imageSide = -textSide
    const imageSide = idx % 2 === 0 ? -1 : 1;
    const imageGridX = imageSide * vw * 0.26;
    // Cube sits on outer edge of image grid, half off-screen
    const cubeAtSectionX = imageSide * (vw * 0.48);
    const sectionCenterY = -(HERO_H + idx * SECTION_H);

    // Section transition progress
    const transRaw = clamp(sectionT / 0.4, 0, 1);
    const midArc = Math.sin(transRaw * Math.PI);
    // How settled we are in the current section (0 = just arrived, 1 = fully settled)
    const settled = clamp((sectionT - 0.4) / 0.3, 0, 1);
    // How close to leaving (approaching next section)
    const leaving = clamp((sectionT - 0.8) / 0.2, 0, 1);

    // Rotation burst on section change
    if (idx !== prevIdx.current && prevIdx.current >= 0 && inProject) {
      const dir = idx > prevIdx.current ? 1 : -1;
      spinVelY.current += dir * 0.15;
      spinVelX.current += dir * 0.06;
    }
    prevIdx.current = idx;

    // ── Target scale: 0 = fully hidden, >0 = visible ──
    let targetScale;
    let targetX, targetY;
    const SECTION_CUBE_SIZE = 2.5;

    if (inHero) {
      // Hero: visible, centered
      targetScale = 1;
      targetX = 0;
      targetY = -scroll;
    } else if (heroExit) {
      // Leaving hero: shrink to 0
      const exitT = clamp((scroll - HERO_H * 0.3) / (HERO_H * 0.7), 0, 1);
      targetScale = 1 - exitT;
      targetX = 0;
      targetY = -scroll;
    } else if (inSettle) {
      // Settle zone: expand and fade
      targetScale = (1 + settleT * 4) * (1 - settleT);
      targetX = 0;
      targetY = -(SETTLE_START + settleT);
    } else {
      // Project sections:
      // During transition (sectionT 0→0.4): scale 0 → SECTION_CUBE_SIZE (grow in)
      // Settled (0.4→0.8): full size, at rest
      // Leaving (0.8→1.0): shrink back to 0
      if (transRaw < 1) {
        // Growing in during transition
        const growT = ease(transRaw);
        targetScale = SECTION_CUBE_SIZE * growT;
      } else if (leaving > 0) {
        // Shrinking out before next section
        targetScale = SECTION_CUBE_SIZE * (1 - ease(leaving));
      } else {
        // At rest
        targetScale = SECTION_CUBE_SIZE;
      }
      targetX = cubeAtSectionX;
      targetY = sectionCenterY;
    }

    // ── Cursor push — only cube, push away from images ──
    const mouseWX = (pointer.x * vw) / 2;
    const mouseWY = (pointer.y * vh) / 2;
    // Mouse in world Y needs camera offset
    const camY = -scrollLerp.current;
    const mouseAbsY = mouseWY + camY;
    const cubeAbsX = posX.current;
    const cubeAbsY = posY.current;
    const dx = cubeAbsX - mouseWX;
    const dy = cubeAbsY - mouseAbsY;
    const distToCube = Math.sqrt(dx * dx + dy * dy);
    const pushRadius = SECTION_CUBE_SIZE * 4;

    if (
      distToCube < pushRadius &&
      distToCube > 0.1 &&
      inProject &&
      scaleSmooth.current > 0.5
    ) {
      const pushStr = Math.pow(1 - distToCube / pushRadius, 2) * 3;
      const nx = dx / distToCube;
      const ny = dy / distToCube;
      pushX.current += (nx * pushStr - pushX.current) * 0.08;
      pushY.current += (ny * pushStr - pushY.current) * 0.08;
    } else {
      pushX.current *= 0.9;
      pushY.current *= 0.9;
    }
    if (Math.abs(pushX.current) < 0.001) pushX.current = 0;
    if (Math.abs(pushY.current) < 0.001) pushY.current = 0;

    // ── Apply position — fast lerp so it snaps to new sections quickly ──
    posX.current = THREE.MathUtils.lerp(posX.current, targetX, 0.06);
    posY.current = THREE.MathUtils.lerp(posY.current, targetY, 0.06);
    cubeRef.current.position.x = posX.current + pushX.current;
    cubeRef.current.position.y = posY.current + pushY.current;
    cubeRef.current.position.z = 1;

    // ── Scale — this IS the fade. 0 = invisible, >0 = visible ──
    scaleSmooth.current = THREE.MathUtils.lerp(
      scaleSmooth.current,
      targetScale,
      0.07
    );
    if (scaleSmooth.current < 0.01) scaleSmooth.current = 0;
    cubeRef.current.scale.setScalar(Math.max(0.001, scaleSmooth.current));
    cubeRef.current.visible = scaleSmooth.current > 0.01;

    // ── Rotation ──
    spinVelX.current *= 0.96;
    spinVelY.current *= 0.96;
    cubeRef.current.rotation.x += 0.001 + spinVelX.current;
    cubeRef.current.rotation.y += 0.002 + spinVelY.current;

    // ── Material — refraction effects during transitions ──
    const mat =
      cubeRef.current?.children?.[0]?.material || cubeRef.current?.material;
    if (mat) {
      mat.roughness = 0.02 + midArc * 0.08;
      if (mat.chromaticAberration !== undefined) {
        mat.chromaticAberration = 0.05 + midArc * 0.15;
      }
      mat.ior = 1.5 + midArc * 0.1;
    }

    // ── Glow ──
    const accent = new THREE.Color(
      inProject ? PROJECTS[idx].accent : "#ffffff"
    );
    glowColor.current.lerp(accent, 0.03);
    if (glowRef.current) {
      glowRef.current.color.copy(glowColor.current);
      glowRef.current.intensity =
        (inProject ? 3 : 0.5) * Math.min(1, scaleSmooth.current);
      glowRef.current.position.copy(cubeRef.current.position);
      glowRef.current.position.z += 1;
    }
    if (shadowRef.current) {
      shadowRef.current.visible = scaleSmooth.current > 0.1;
      shadowRef.current.position.x = cubeRef.current.position.x;
      shadowRef.current.position.y =
        cubeRef.current.position.y - 2.5 * scaleSmooth.current;
      const ss = 3 * scaleSmooth.current;
      shadowRef.current.scale.set(ss * 1.2, ss, ss);
      shadowRef.current.material.opacity =
        0.08 * Math.min(1, scaleSmooth.current);
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
        opacity={0.08}
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
  const { size, viewport } = useThree();
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

    // Compute settle progress from camera position
    const camY = -camera.position.y;
    const settleT = clamp((camY - SETTLE_START) / 8, 0, 1);
    const targetOp = settleT;
    opSmooth.current += (targetOp - opSmooth.current) * 0.04;

    // Apply opacity to material
    const mat = meshRef.current.material;
    if (mat) {
      mat.opacity = opSmooth.current * 0.85;
    }

    for (let i = 0; i < CLUMP_COUNT; i++) {
      const p = particles[i];
      tmpV.copy(p.pos).normalize().multiplyScalar(-6);
      p.vel.addScaledVector(tmpV, d);
      p.vel.multiplyScalar(1 - 2.5 * d);
      p.angVel.multiplyScalar(1 - 1.5 * d);
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
    <group ref={groupRef} position={[0, -(SETTLE_START + 4), 0]}>
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
    const camY = -camera.position.y;
    const settleT = clamp((camY - SETTLE_START) / 8, 0, 1);
    const target = settleT;
    opRef.current += (target - opRef.current) * 0.035;
    groupRef.current.traverse((child) => {
      if (child.material && child.material.opacity !== undefined) {
        child.material.opacity = opRef.current * 0.15;
        child.material.transparent = true;
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, -(SETTLE_START + 4), -3]}>
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
