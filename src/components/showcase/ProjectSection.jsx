import { Suspense, useRef } from "react";
import { Color, MathUtils, SRGBColorSpace, TextureLoader } from "three";
import { useThree, useFrame, useLoader } from "@react-three/fiber";
import { Text as DreiText } from "@react-three/drei";
import {
  L,
  state,
  clamp,
  getSectionY,
  FONT_URL,
  HERO_H,
  SECTION_H,
} from "./ShowcaseLayout";

function Text(props) {
  return <DreiText font={FONT_URL} {...props} />;
}

export function CameraScroll() {
  const { camera, viewport } = useThree();
  const lerp = useRef(0);
  const introOffset = useRef(null);

  useFrame(() => {
    if (introOffset.current === null)
      introOffset.current = viewport.height * 1.3;
    introOffset.current *= 0.975;
    if (Math.abs(introOffset.current) < 0.01) introOffset.current = 0;

    const targetY = getSectionY(state.section);
    lerp.current = MathUtils.lerp(lerp.current, targetY, L.anim.cameraLerp);
    state.top = lerp.current;
    camera.position.y = -lerp.current + introOffset.current;
    camera.position.x = 0;
  });
  return null;
}

function Img({ url, w, h }) {
  const tex = useLoader(TextureLoader, url);
  tex.colorSpace = SRGBColorSpace;
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

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

function ImageFade({ sectionY, delay = 0, children }) {
  const ref = useRef();
  const op = useRef(0);
  const sc = useRef(L.anim.imgScaleFrom);
  const started = useRef(false);
  const timer = useRef(0);

  useFrame(({ camera }, delta) => {
    if (!ref.current) return;
    const dist = Math.abs(camera.position.y - sectionY);
    const visible = dist < L.anim.textVisRange;
    if (visible && !started.current) started.current = true;
    if (!started.current) {
      ref.current.traverse((child) => {
        if (child.material && child.material.opacity !== undefined) {
          child.material.opacity = 0;
          child.material.transparent = true;
        }
      });
      return;
    }
    timer.current += delta;
    const staggerDelay = delay * 0.18;
    const active = visible && timer.current >= staggerDelay;
    const target = active ? 1 : 0;
    if (!visible) {
      timer.current = 0;
      started.current = false;
    }
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

export function ProjectSection({ project, index, s, vw, vh }) {
  const sectionY = -(HERO_H + index * SECTION_H);

  const rightPadScreen = 80;
  const rightPadWorld =
    (rightPadScreen /
      (typeof window !== "undefined" ? window.innerWidth : 1440)) *
    vw;
  const pad = rightPadWorld;
  const gap = vw * 0.008;

  const availW = vw - pad * 2;
  const availH = vh - pad * 2;

  const heroW = (availW - gap) * 0.64;
  const stackW = (availW - gap) * 0.36;
  const stackH = (availH - gap) / 2;

  const flipped = index % 2 === 1;
  const leftEdge = -vw / 2 + pad;
  const rightEdge = vw / 2 - pad;
  const heroX = flipped ? rightEdge - heroW / 2 : leftEdge + heroW / 2;
  const stackX = flipped
    ? leftEdge + stackW / 2
    : leftEdge + heroW + gap + stackW / 2;

  const heroY = 0;
  const stackTopY = stackH / 2 + gap / 2;
  const stackBotY = -stackH / 2 - gap / 2;

  const seamX = flipped
    ? rightEdge - heroW - gap / 2
    : leftEdge + heroW + gap / 2;

  if (!state.panels) state.panels = {};
  state.panels[index] = {
    panelX: (i) => (i === 0 ? heroX : stackX),
    panelW: heroW,
    panelH: availH,
    pad,
    gap,
    sectionY,
    seamX,
  };

  const textX = flipped ? rightEdge - heroW + pad * 1.5 : leftEdge + pad * 2;
  const textBottomY = -availH / 2 + pad * 0.5;
  const titleSize = Math.min(1.0 * s, vw * 0.055);
  const bodySize = 0.15 * s;
  const tagSize = 0.06 * s;
  const skillSize = 0.05 * s;

  return (
    <group position={[0, sectionY, 0]}>
      <TextFade sectionY={sectionY} delay={0}>
        <Text
          position={[
            flipped ? rightEdge - pad : leftEdge + heroW - pad,
            availH * 0.35,
            -1,
          ]}
          fontSize={vw * 0.2}
          letterSpacing={-0.05}
          color="#1a1a2e"
          anchorX="right"
          anchorY="top"
          fillOpacity={0.03}
        >
          {project.number}
        </Text>
      </TextFade>

      <ImageFade sectionY={sectionY} delay={0}>
        <group position={[heroX, heroY, 0]}>
          <Suspense fallback={null}>
            <Img url={project.images[0]} w={heroW} h={availH} />
          </Suspense>
        </group>
      </ImageFade>

      <ImageFade sectionY={sectionY} delay={1}>
        <group position={[stackX, stackTopY, 0]}>
          <Suspense fallback={null}>
            <Img url={project.images[1]} w={stackW} h={stackH} />
          </Suspense>
        </group>
      </ImageFade>

      <ImageFade sectionY={sectionY} delay={2}>
        <group position={[stackX, stackBotY, 0]}>
          <Suspense fallback={null}>
            <Img url={project.images[2]} w={stackW} h={stackH} />
          </Suspense>
        </group>
      </ImageFade>

      <mesh position={[0, -vh * 0.15, 1]}>
        <planeGeometry args={[vw, vh]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={{ uColor: { value: new Color("#000000") } }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 uColor;
            varying vec2 vUv;
            void main() {
              float alpha = smoothstep(1.0, 0.2, vUv.y) * 0.7;
              gl_FragColor = vec4(uColor, alpha);
            }
          `}
        />
      </mesh>

      <TextFade sectionY={sectionY} delay={1}>
        <Text
          position={[textX, textBottomY + vh * 0.18, 2]}
          fontSize={tagSize}
          letterSpacing={0.15}
          color="#ffffff"
          anchorX="left"
          anchorY="bottom"
          fillOpacity={0.7}
        >
          {project.tag}
        </Text>
      </TextFade>

      <TextFade sectionY={sectionY} delay={2}>
        <Text
          position={[textX, textBottomY + vh * 0.04, 2]}
          fontSize={titleSize}
          letterSpacing={-0.03}
          lineHeight={1.1}
          color="#ffffff"
          anchorX="left"
          anchorY="bottom"
          textAlign="left"
          maxWidth={heroW * 0.85}
          fillOpacity={1}
        >
          {project.title}
        </Text>
      </TextFade>

      <TextFade sectionY={sectionY} delay={3}>
        <Text
          position={[textX, textBottomY - vh * 0.02, 2]}
          fontSize={bodySize}
          lineHeight={1.7}
          color="#ffffff"
          anchorX="left"
          anchorY="top"
          textAlign="left"
          maxWidth={heroW * 0.7}
          fillOpacity={0.65}
        >
          {project.text}
        </Text>
      </TextFade>

      <TextFade sectionY={sectionY} delay={4}>
        <Text
          position={[textX, textBottomY - vh * 0.12, 2]}
          fontSize={skillSize}
          letterSpacing={0.1}
          color="#ffffff"
          anchorX="left"
          fillOpacity={0.5}
        >
          {project.skills.join("  ·  ")}
        </Text>
      </TextFade>
    </group>
  );
}

export function Hero({ s, vw }) {
  const groupRef = useRef();
  const opRef = useRef(0);
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
