import { useRef } from "react";
import { Color, MathUtils } from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { Shadow } from "@react-three/drei";
import GlassCube from "../scene/GlassCube";
import { SHOWCASE_PROJECTS } from "./ShowcaseProjects";
import { L, state, N, HERO_H, SECTION_H, SETTLE_START } from "./ShowcaseLayout";

export default function ShowcaseCube() {
  const cubeRef = useRef();
  const glowRef = useRef();
  const shadowRef = useRef();
  const { viewport } = useThree();

  const glowColor = useRef(new Color("#ffffff"));
  const scaleRef = useRef(1);
  const posX = useRef(0);
  const posY = useRef(0);
  const spinVelX = useRef(0);
  const spinVelY = useRef(0);

  const displayedSection = useRef(0);
  const phase = useRef("visible");
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

    function getPosForSection(sec) {
      if (sec === 0) {
        const t = clock.elapsedTime;
        const driftX = Math.sin(t * 0.3) * vw * 0.22;
        return { x: driftX, y: -state.top, scale: 0.5 };
      } else if (sec > 0 && sec <= N) {
        const projIdx = sec - 1;
        const sectionCenterY = -(HERO_H + projIdx * SECTION_H);
        const panels = state.panels && state.panels[projIdx];
        const targetX = panels ? panels.seamX : 0;
        const topHalfY = sectionCenterY + vh * 0.04;
        return { x: targetX, y: topHalfY, scale: CUBE_SIZE_AT_SECTION };
      } else {
        return { x: 0, y: -SETTLE_START, scale: 0.01 };
      }
    }

    state.hoveredPanel = -1;

    if (
      needsChange &&
      (phase.current === "visible" || phase.current === "fading-in")
    ) {
      phase.current = "fading-out";
    }

    if (phase.current === "fading-out") {
      scaleRef.current = MathUtils.lerp(scaleRef.current, 0, FADE_SPEED);
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
        const dir = wantSection % 2 === 0 ? 1 : -1;
        spinVelY.current += dir * 0.12;
        spinVelX.current += 0.05;
      }
    } else if (phase.current === "fading-in") {
      const p = getPosForSection(displayedSection.current);
      scaleRef.current = MathUtils.lerp(scaleRef.current, p.scale, FADE_SPEED);
      posX.current = MathUtils.lerp(posX.current, p.x, 0.05);
      posY.current = MathUtils.lerp(posY.current, p.y, 0.05);
      if (Math.abs(scaleRef.current - p.scale) < 0.05) {
        scaleRef.current = p.scale;
        phase.current = "visible";
      }
    } else {
      const p = getPosForSection(displayedSection.current);
      scaleRef.current = MathUtils.lerp(scaleRef.current, p.scale, 0.04);
      posX.current = MathUtils.lerp(posX.current, p.x, 0.018);
      posY.current = MathUtils.lerp(posY.current, p.y, 0.018);
    }

    cubeRef.current.position.x = posX.current;
    cubeRef.current.position.y = posY.current;
    cubeRef.current.position.z = L.cube.z;
    cubeRef.current.scale.setScalar(Math.max(0.001, scaleRef.current));
    cubeRef.current.visible = scaleRef.current > 0.01;

    spinVelX.current *= 0.99;
    spinVelY.current *= 0.99;
    const atHero = displayedSection.current === 0;
    cubeRef.current.rotation.x += (atHero ? 0.012 : 0.001) + spinVelX.current;
    cubeRef.current.rotation.y += (atHero ? 0.016 : 0.002) + spinVelY.current;

    const projIdx = displayedSection.current - 1;
    const accent = new Color(
      projIdx >= 0 && projIdx < N
        ? SHOWCASE_PROJECTS[projIdx].accent
        : "#ffffff"
    );
    glowColor.current.lerp(accent, 0.03);
    if (glowRef.current) {
      glowRef.current.color.copy(glowColor.current);
      glowRef.current.intensity =
        (displayedSection.current > 0 && displayedSection.current <= N
          ? 3
          : 0.5) * Math.min(1, scaleRef.current);
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
        samples={4}
        resolution={256}
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
