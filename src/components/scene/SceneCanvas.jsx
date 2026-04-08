/**
 * SceneCanvas — R3F replacement for the imperative Scene.jsx.
 *
 * Drop-in replacement: same props API as the old Scene component,
 * so App.jsx can swap `<Scene ... />` → `<SceneCanvas ... />` with
 * minimal changes.
 *
 * Migration step 1+2: Canvas scaffold + reusable GlassCube.
 * Other elements (NoiseSphere, HelixParticles, ExplodingCube, etc.)
 * will be added in subsequent steps.
 *
 * Architecture:
 *   SceneCanvas (React DOM layer — receives props from App)
 *     └─ <Canvas> (R3F layer)
 *           ├─ <SceneStoreProvider>   — shared mutable state
 *           ├─ <StoreSync>           — syncs React props → store each frame
 *           ├─ <Environment>         — HDR lighting
 *           ├─ <CameraRig>           — mouse-follow camera
 *           ├─ <Lighting>            — scene lights
 *           ├─ <GlassCube>           — the hero glass object (reusable)
 *           ├─ <ContactShadows>      — ground shadow
 *           └─ <PostFX>              — bloom, AO, tilt-shift
 */

import { useRef, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  ContactShadows,
  Float,
} from "@react-three/drei";
import * as THREE from "three";

import { SceneStoreProvider, useSceneStore } from "../../stores/useSceneStore";
import GlassCube from "./GlassCube";
import CameraRig from "./CameraRig";
import PostFX from "./PostFX";

// ── StoreSync: bridges React props → mutable store each frame ──
function StoreSync({
  configRef,
  menuOpen,
  chatMode,
  activeSeason,
  onScrollProgress,
  onBirthProgress,
  onCubeHold,
  onCubeProximity,
  onCardClick,
  onHelixProgress,
}) {
  const store = useSceneStore();

  // Keep config pointer current
  useEffect(() => {
    if (configRef?.current) store.config = configRef.current;
  });

  // Sync mode flags (avoid stale closures in useFrame)
  useEffect(() => {
    store.menuOpen = menuOpen || false;
  }, [menuOpen]);
  useEffect(() => {
    store.chatMode = chatMode || false;
  }, [chatMode]);

  // Store callback refs so useFrame consumers can call them
  const callbackRefs = useRef({});
  callbackRefs.current = {
    onScrollProgress,
    onBirthProgress,
    onCubeHold,
    onCubeProximity,
    onCardClick,
    onHelixProgress,
  };
  useEffect(() => {
    store._callbacks = callbackRefs.current;
  });

  return null;
}

// ── InputHandler: mouse + scroll events → store ──
function InputHandler() {
  const store = useSceneStore();
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    const onMouseMove = (e) => {
      store.mouse.x = (e.clientX / W()) * 2 - 1;
      store.mouse.y = -(e.clientY / H()) * 2 + 1;
    };

    const onTouchMove = (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        store.mouse.x = (t.clientX / W()) * 2 - 1;
        store.mouse.y = -(t.clientY / H()) * 2 + 1;
      }
    };

    const onWheel = (e) => {
      const c = store.config;
      const maxRange = c.totalScrollRange || 130;
      const speed = c.scrollSpeed || 1;
      store.scrollTarget = Math.max(
        0,
        Math.min(maxRange, store.scrollTarget + e.deltaY * 0.008 * speed)
      );
    };

    let touchY = 0;
    const onTouchStart = (e) => {
      if (e.touches.length === 1) touchY = e.touches[0].clientY;
    };
    const onTouchScroll = (e) => {
      if (e.touches.length !== 1) return;
      const dy = touchY - e.touches[0].clientY;
      touchY = e.touches[0].clientY;
      const c = store.config;
      const maxRange = c.totalScrollRange || 130;
      const speed = c.scrollSpeed || 1;
      store.scrollTarget = Math.max(
        0,
        Math.min(maxRange, store.scrollTarget + dy * 0.02 * speed)
      );
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchmove", onTouchScroll);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchScroll);
    };
  }, [gl, store]);

  return null;
}

// ── CoreLoop: updates shared physics (scroll, birth, springs) each frame ──
function CoreLoop() {
  const store = useSceneStore();

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.033);
    store.delta = dt;
    store.elapsed += dt;

    const c = store.config;

    // ── Birth animation ──
    const birthDur = c.birthDuration || 2.5;
    store.birthT = Math.min(
      1,
      (performance.now() - store.birthStart) / 1000 / birthDur
    );
    // Soft ease-out (same as easeOutSoft in utils/math)
    const t = store.birthT;
    store.birth = 1 - Math.pow(1 - t, 3);

    if (store._callbacks?.onBirthProgress) {
      store._callbacks.onBirthProgress(store.birth);
    }

    // ── Scroll smoothing ──
    const maxRange = c.totalScrollRange || 130;
    store.scrollCurrent += (store.scrollTarget - store.scrollCurrent) * 0.08;
    store.scrollProgress = Math.max(
      0,
      Math.min(1, store.scrollCurrent / maxRange)
    );

    if (store._callbacks?.onScrollProgress) {
      store._callbacks.onScrollProgress(store.scrollProgress);
    }

    // ── Menu/chat spring physics ──
    const inChat = store.chatMode;
    const targetX = inChat ? -3.2 : 0;
    const targetZ = inChat ? 4 : 0;
    const targetS = inChat ? 1.6 : 1;
    const stiffness = inChat ? 2.5 : 6.0;
    const damping = inChat ? 3.0 : 4.5;

    const dxM = targetX - store.menuPos.x;
    store.menuVel.x += (dxM * stiffness - store.menuVel.x * damping) * dt;
    store.menuPos.x += store.menuVel.x * dt;

    const dsM = targetS - store.menuScale;
    store.menuScaleVel += (dsM * stiffness - store.menuScaleVel * damping) * dt;
    store.menuScale += store.menuScaleVel * dt;

    // Chat Z spring
    const dzM = targetZ - store.chatZ;
    store.chatZVel += (dzM * stiffness - store.chatZVel * damping) * dt;
    store.chatZ += store.chatZVel * dt;

    // Chat arc springs
    const arcStiff = 2.8,
      arcDamp = 2.2;
    store.chatArcVel +=
      (0 - store.chatArc) * arcStiff * dt - store.chatArcVel * arcDamp * dt;
    store.chatArc += store.chatArcVel * dt;
    store.chatArcXVel +=
      (0 - store.chatArcX) * arcStiff * dt - store.chatArcXVel * arcDamp * dt;
    store.chatArcX += store.chatArcXVel * dt;

    // Chat transition impulses
    if (inChat && !store.wasInChat) {
      store.chatSpinBurst = 4;
      store.chatArcVel = -8;
      store.chatArcXVel = -5;
      store.angularVelocity.y += 2.5;
      store.wasInChat = true;
    }
    if (!inChat && store.wasInChat) {
      store.chatSpinBurst = -4;
      store.chatArcVel = 8;
      store.chatArcXVel = 5;
      store.angularVelocity.y -= 2.5;
      store.wasInChat = false;
    }
    store.chatSpinBurst *= Math.max(0, 1 - 1.8 * dt);

    // Click scale spring
    if (!store.isHolding) {
      const csAccel = (1 - store.clickScale) * 6 - store.clickScaleVel * 3;
      store.clickScaleVel += csAccel * dt;
      store.clickScale += store.clickScaleVel * dt;
      if (Math.abs(store.clickScale - 1) < 0.001) {
        store.clickScale = 1;
        store.clickScaleVel = 0;
      }
    }

    // ── Shatter progress ──
    const shatterStart = c.shatterThreshold || 0.15;
    const shatterTriggered = store.scrollProgress >= shatterStart;
    const targetSP = shatterTriggered
      ? Math.min(1, (store.scrollProgress - shatterStart) / (1 - shatterStart))
      : 0;
    const lerpRate = shatterTriggered ? 0.18 : 0.06;
    store.shatterProgress += (targetSP - store.shatterProgress) * lerpRate;

    // Birth float offset
    const birthY = -(c.birthFloatDist || 6) * (1 - store.birth);

    // Update shared cube position
    store.cubePosition.set(
      store.menuPos.x + store.chatArcX,
      store.menuPos.y + birthY,
      -store.bounceZ + store.chatZ + store.chatArc
    );

    // Previous mouse (for velocity calc in child components)
    store.prevMouse.copy(store.mouse);
  });

  return null;
}

// ── Lighting — matching reference exactly ──
function Lighting() {
  return (
    <spotLight position={[20, 20, 10]} penumbra={1} castShadow angle={0.2} />
  );
}

// ── MainGlassCube: the hero cube that reads from the store ──
function MainGlassCube() {
  const store = useSceneStore();
  const cubeRef = useRef();

  useFrame((_, delta) => {
    if (!cubeRef.current) return;
    const dt = Math.min(delta, 0.033);
    const c = store.config;

    // Position from store (computed in CoreLoop)
    cubeRef.current.position.copy(store.cubePosition);

    // Angular velocity → quaternion rotation
    const av = store.angularVelocity;

    // Idle spin
    if (store.birth > 0.98) {
      av.y += (c.glassRotSpeedY || 0.36) * 0.08 * dt;
      av.x += (c.glassRotSpeedX || 0.62) * 0.08 * dt;
    }

    // Chat spin burst
    av.y += store.chatSpinBurst * 0.5 * dt;

    // Drag
    const drag = 0.9;
    av.x -= av.x * drag * dt;
    av.y -= av.y * drag * dt;
    av.z -= av.z * drag * dt;
    av.clampLength(0, 4);

    // Apply angular velocity to quaternion
    const avLen = av.length();
    if (avLen > 0.0001) {
      const axis = av.clone().normalize();
      const dq = new THREE.Quaternion().setFromAxisAngle(axis, avLen * dt);
      store.cubeQuaternion.premultiply(dq);
      store.cubeQuaternion.normalize();
    }
    cubeRef.current.quaternion.copy(store.cubeQuaternion);

    // Scale
    const gSize = c.glassCubeSize || 3.6;
    const bR = c.sphereRadius || 0.7;
    const s = gSize * bR * store.menuScale * store.clickScale;
    cubeRef.current.scale.setScalar(s);

    // Visibility — hide after shatter
    const shatterStart = c.shatterThreshold || 0.15;
    const explodeRange = 0.12;
    const explodeT = Math.max(
      0,
      Math.min(1, (store.scrollProgress - shatterStart) / explodeRange)
    );
    cubeRef.current.visible = explodeT < 0.01;
  });

  // Read config for material props — all tweakable from DebugPanel
  const c = store.config;

  return (
    <GlassCube
      ref={cubeRef}
      size={1}
      cornerRadius={c.glassCornerRadius ?? 0.08}
      thickness={c.glassThickness ?? 2}
      backsideThickness={c.glassBacksideThickness ?? 5}
      roughness={c.glassRoughness ?? 0}
      ior={c.glassIor ?? 1.5}
      chromaticAberration={c.glassChromaticAberration ?? 0.02}
      anisotropicBlur={c.glassAnisotropicBlur ?? 0.4}
      transmission={c.glassTransmission ?? 1}
      distortion={c.glassDistortion ?? 0}
      distortionScale={c.glassDistortionScale ?? 0.2}
      temporalDistortion={c.glassTemporalDistortion ?? 0}
      color={c.glassColor || "#ffffff"}
      edgeOpacity={c.glassEdgeOpacity ?? 0.12}
      showEdges={true}
      samples={c.glassSamples ?? 10}
      resolution={c.glassResolution ?? 1024}
    />
  );
}

// ═══════════════════════════════════════════
// SceneCanvas — the public component
// ═══════════════════════════════════════════

export default function SceneCanvas({
  configRef,
  onScrollProgress,
  onBirthProgress,
  gradientCanvas,
  menuOpen,
  chatMode,
  activeSeason,
  onCubeHold,
  onCubeProximity,
  onCardClick,
  onHelixProgress,
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 1,
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 0, 20], fov: 50 }}
        gl={{
          antialias: true,
          alpha: false,
        }}
        dpr={[1, 2]}
        eventSource={document.getElementById("root")}
        eventPrefix="client"
      >
        <SceneStoreProvider initialConfig={configRef?.current || {}}>
          {/* Sync React props → mutable store */}
          <StoreSync
            configRef={configRef}
            menuOpen={menuOpen}
            chatMode={chatMode}
            activeSeason={activeSeason}
            onScrollProgress={onScrollProgress}
            onBirthProgress={onBirthProgress}
            onCubeHold={onCubeHold}
            onCubeProximity={onCubeProximity}
            onCardClick={onCardClick}
            onHelixProgress={onHelixProgress}
          />

          {/* Input handling (mouse, scroll, touch) */}
          <InputHandler />

          {/* Core physics loop (scroll, birth, springs) */}
          <CoreLoop />

          {/* Solid background — EXACTLY like the reference */}
          <color attach="background" args={["#e0e0e0"]} />

          {/* Single spot light — matching reference */}
          <Lighting />

          {/* Environment — preset="city" like the reference, NOT custom HDR */}
          <Environment preset="city">
            <Lightformer
              intensity={8}
              position={[10, 5, 0]}
              scale={[10, 50, 1]}
              onUpdate={(self) => self.lookAt(0, 0, 0)}
            />
          </Environment>

          {/* ── The hero glass cube ── */}
          <Float floatIntensity={2}>
            <MainGlassCube />
          </Float>

          {/* Ground shadow */}
          <ContactShadows
            scale={100}
            position={[0, -7.5, 0]}
            blur={1}
            far={100}
            opacity={0.85}
          />

          {/* Camera rig */}
          <CameraRig damping={0.2} intensity={1} />

          {/* Post-processing — matching reference exactly */}
          <PostFX
            aoRadius={1}
            aoIntensity={2}
            bloomIntensity={2}
            bloomLuminanceThreshold={0.8}
            bloomLevels={8}
            tiltBlur={0.2}
          />
        </SceneStoreProvider>
      </Canvas>
    </div>
  );
}
