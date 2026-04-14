import { useRef, useMemo, useEffect, useState } from "react";
import { Color } from "three";
import { useThree, useFrame } from "@react-three/fiber";
import {
  Text3D,
  Center,
  MeshTransmissionMaterial,
  RoundedBox,
  Instance,
  Instances,
  Html,
} from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { L, state, clamp, N } from "./ShowcaseLayout";

const CUBE_SIZE = 1.0;
const HALF = CUBE_SIZE / 2;
const FONT_3D = "/Inter_Medium_Regular.json";

// ── Mutable config — debug sliders write here, useFrame reads every frame ──
const S = {
  // Scene rotation (isometric tilt)
  rotX: -0.65,
  rotY: -0.35,
  rotZ: 0,
  // Scene position offset
  sceneX: 0,
  sceneY: 0,
  sceneZ: 0,
  // Text
  textX: -4.5,
  textY: 0.02,
  textZ: 0,
  textScale: 3.5,
  textGap: 3.3,
  // Cubes area
  cubeOffX: 5,
  cubeOffZ: 0,
  cubeSpread: 3,
  // Ground
  groundShow: true,
  groundSize: 60,
  groundOpacity: 0.03,
  groundY: -0.01,
  // Grid
  gridShow: true,
  gridCount: 17,
  // Key light
  keyX: 8,
  keyY: 12,
  keyZ: 8,
  keyIntensity: 4,
  // Fill light
  fillX: -8,
  fillY: 6,
  fillZ: 4,
  fillIntensity: 1.5,
  // Rim light
  rimX: 0,
  rimY: 4,
  rimZ: -8,
  rimIntensity: 1,
};

// Glass config
const GLASS_TEXT = {
  backside: true,
  backsideThickness: 0.15,
  transmission: 1,
  clearcoat: 1,
  clearcoatRoughness: 0,
  thickness: 0.3,
  chromaticAberration: 0.15,
  anisotropy: 0.25,
  roughness: 0,
  distortion: 0.5,
  distortionScale: 0.1,
  temporalDistortion: 0,
  ior: 1.25,
  color: "white",
  samples: 8,
  resolution: 512,
};

// ── Debug Panel (HTML overlay) ──
function SettleDebug() {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate((n) => n + 1);

  const slider = (label, key, min, max, step = 0.01) => (
    <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <label style={{ width: 90, fontSize: 10, opacity: 0.7 }}>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={S[key]}
        onChange={(e) => {
          S[key] = parseFloat(e.target.value);
          refresh();
        }}
        style={{ flex: 1, height: 2 }}
      />
      <span
        style={{ width: 42, fontSize: 9, textAlign: "right", opacity: 0.5 }}
      >
        {S[key].toFixed(2)}
      </span>
    </div>
  );

  const toggle = (label, key) => (
    <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <label style={{ width: 90, fontSize: 10, opacity: 0.7 }}>{label}</label>
      <input
        type="checkbox"
        defaultChecked={S[key]}
        onChange={(e) => {
          S[key] = e.target.checked;
          refresh();
        }}
      />
    </div>
  );

  const section = (title, items) => (
    <div key={title} style={{ marginBottom: 8 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          opacity: 0.4,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {items}
    </div>
  );

  const copy = () => {
    const out = {};
    for (const k in S)
      out[k] = typeof S[k] === "number" ? +S[k].toFixed(3) : S[k];
    navigator.clipboard?.writeText(JSON.stringify(out, null, 2));
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        zIndex: 9999,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        borderRadius: 8,
        padding: "10px 14px",
        width: 280,
        maxHeight: "90vh",
        overflowY: "auto",
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        color: "#1a1a2e",
        boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 11 }}>Settle Debug</span>
        <button
          onClick={copy}
          style={{
            fontSize: 9,
            opacity: 0.5,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Copy
        </button>
      </div>

      {section("Scene Rotation", [
        slider("Tilt X", "rotX", -Math.PI, Math.PI),
        slider("Tilt Y", "rotY", -Math.PI, Math.PI),
        slider("Tilt Z", "rotZ", -Math.PI, Math.PI),
      ])}
      {section("Scene Offset", [
        slider("X", "sceneX", -20, 20),
        slider("Y", "sceneY", -20, 20),
        slider("Z", "sceneZ", -20, 20),
      ])}
      {section("Text", [
        slider("X", "textX", -15, 15),
        slider("Y", "textY", -5, 5),
        slider("Z", "textZ", -15, 15),
        slider("Scale", "textScale", 0.5, 10),
        slider("Line gap", "textGap", 0.5, 8),
      ])}
      {section("Cubes", [
        slider("Offset X", "cubeOffX", -15, 15),
        slider("Offset Z", "cubeOffZ", -15, 15),
        slider("Spread", "cubeSpread", 1, 8),
      ])}
      {section("Ground", [
        toggle("Show", "groundShow"),
        slider("Size", "groundSize", 10, 200, 1),
        slider("Opacity", "groundOpacity", 0, 0.2),
        slider("Y", "groundY", -5, 5),
      ])}
      {section("Grid", [
        toggle("Show", "gridShow"),
        slider("Count", "gridCount", 5, 30, 1),
      ])}
      {section("Key Light", [
        slider("X", "keyX", -20, 20),
        slider("Y", "keyY", -20, 20),
        slider("Z", "keyZ", -20, 20),
        slider("Intensity", "keyIntensity", 0, 10),
      ])}
      {section("Fill Light", [
        slider("X", "fillX", -20, 20),
        slider("Y", "fillY", -20, 20),
        slider("Z", "fillZ", -20, 20),
        slider("Intensity", "fillIntensity", 0, 10),
      ])}
      {section("Rim Light", [
        slider("X", "rimX", -20, 20),
        slider("Y", "rimY", -20, 20),
        slider("Z", "rimZ", -20, 20),
        slider("Intensity", "rimIntensity", 0, 10),
      ])}
    </div>
  );
}

// ── Grid of crosses ──
function Grid({ opSmooth }) {
  const matRef = useRef();
  const groupRef = useRef();
  useFrame(() => {
    if (matRef.current) matRef.current.opacity = (opSmooth?.current || 0) * 0.3;
  });
  const n = Math.round(S.gridCount);
  if (!S.gridShow) return null;
  return (
    <Instances position={[0, -0.01, 0]} limit={n * n * 2}>
      <planeGeometry args={[0.026, 0.5]} />
      <meshBasicMaterial ref={matRef} color="#999" transparent opacity={0} />
      {Array.from({ length: n }, (_, y) =>
        Array.from({ length: n }, (_, x) => (
          <group
            key={x + ":" + y}
            position={[
              x * 2 - Math.floor(n / 2) * 2,
              0,
              y * 2 - Math.floor(n / 2) * 2,
            ]}
          >
            <Instance rotation={[-Math.PI / 2, 0, 0]} />
            <Instance rotation={[-Math.PI / 2, 0, Math.PI / 2]} />
          </group>
        ))
      )}
    </Instances>
  );
}

// ── Scattered cube positions ──
function getScatteredCubes(baseY) {
  return [
    [1.5, baseY, 1.5],
    [3.0, baseY, -1.0],
    [2.0, baseY, -3.5],
    [4.5, baseY, 0.5],
    [0.5, baseY, -2.0],
    [3.5, baseY, 2.5],
    [5.0, baseY, -2.5],
    [2.0, baseY + CUBE_SIZE + 0.05, -3.5],
    [3.0, baseY + CUBE_SIZE + 0.05, -1.0],
  ];
}

function PhysicsCube({ position, opSmooth, mouseRef }) {
  const rbRef = useRef();
  const meshRef = useRef();

  useFrame(() => {
    if (!rbRef.current || !meshRef.current) return;
    const mesh = meshRef.current.children?.[0];
    if (mesh?.material && mesh.material.opacity !== undefined) {
      mesh.material.opacity = opSmooth.current * 0.9;
    }
    const m = mouseRef.current;
    if (!m.active) return;
    const pos = rbRef.current.translation();
    const dx = pos.x - m.x;
    const dz = pos.z - m.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const pr = L.physics.pushRadius;
    if (dist < pr && dist > 0.01) {
      const pen = 1 - dist / pr;
      const mag = pen * pen * L.physics.pushStrength;
      const nx = dx / dist;
      const nz = dz / dist;
      rbRef.current.applyImpulse({ x: nx * mag, y: 0, z: nz * mag }, true);
      rbRef.current.applyTorqueImpulse(
        { x: nz * mag * 0.4, y: nx * mag * 0.2, z: -nx * mag * 0.4 },
        true
      );
    }
  });

  return (
    <RigidBody
      ref={rbRef}
      position={position}
      colliders={false}
      mass={L.physics.cubeMass}
      linearDamping={L.physics.linearDamping}
      angularDamping={L.physics.angularDamping}
    >
      <CuboidCollider
        args={[HALF, HALF, HALF]}
        friction={L.physics.cubeFriction}
        restitution={L.physics.restitution}
      />
      <group ref={meshRef}>
        <RoundedBox
          args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]}
          radius={0.1}
          smoothness={3}
          castShadow
          receiveShadow
        >
          <MeshTransmissionMaterial
            backside
            backsideThickness={L.glass.backsideThickness}
            thickness={L.glass.thickness}
            transmission={1}
            roughness={L.glass.roughness}
            ior={L.glass.ior}
            chromaticAberration={L.glass.chromaticAberration}
            anisotropicBlur={L.glass.anisotropicBlur}
            samples={L.glass.samples}
            resolution={L.glass.resolution}
            color="#ffffff"
            transparent
            opacity={0}
            toneMapped
          />
        </RoundedBox>
      </group>
    </RigidBody>
  );
}

// ── Inner 3D scene (reads from S every frame) ──
function SettleScene({ themeColor, opSmooth }) {
  const sceneRef = useRef();
  const textRef = useRef();
  const floorRef = useRef();
  const keyRef = useRef();
  const fillRef = useRef();
  const rimRef = useRef();
  const { viewport, pointer } = useThree();
  const mouseRef = useRef({ x: 0, z: 0, active: false });

  const cubeY = HALF + 0.05;
  const baseCubes = useMemo(() => getScatteredCubes(cubeY), [cubeY]);
  const themeColorObj = useMemo(
    () => new Color(themeColor || "#1a1a2e"),
    [themeColor]
  );

  useFrame(() => {
    // Scene tilt
    if (sceneRef.current) {
      sceneRef.current.rotation.set(S.rotX, S.rotY, S.rotZ);
      sceneRef.current.position.set(S.sceneX, S.sceneY, S.sceneZ);
    }
    // Ground
    if (floorRef.current) {
      floorRef.current.visible = S.groundShow;
      floorRef.current.position.y = S.groundY;
      floorRef.current.material.opacity = opSmooth.current * S.groundOpacity;
      floorRef.current.material.color.lerp(themeColorObj, 0.05);
    }
    // Text fade
    if (textRef.current) {
      textRef.current.traverse((child) => {
        if (child.material && child.material.opacity !== undefined) {
          child.material.opacity = opSmooth.current;
          child.material.transparent = true;
        }
      });
    }
    // Lights
    if (keyRef.current) {
      keyRef.current.position.set(S.keyX, S.keyY, S.keyZ);
      keyRef.current.intensity = S.keyIntensity;
    }
    if (fillRef.current) {
      fillRef.current.position.set(S.fillX, S.fillY, S.fillZ);
      fillRef.current.intensity = S.fillIntensity;
    }
    if (rimRef.current) {
      rimRef.current.position.set(S.rimX, S.rimY, S.rimZ);
      rimRef.current.intensity = S.rimIntensity;
    }

    // Mouse
    const isSettle = state.section >= N + 1;
    const mxW = (pointer.x * viewport.width) / 2;
    const myW = (pointer.y * viewport.height) / 2;
    mouseRef.current.x = mxW * 1.5 + S.cubeOffX;
    mouseRef.current.z = myW * -1.5 + S.cubeOffZ;
    mouseRef.current.active = isSettle;
  });

  // Offset cube positions by the debug controls
  const cubePositions = baseCubes.map(([x, y, z]) => [
    x + S.cubeOffX - 5,
    y,
    z + S.cubeOffZ,
  ]);

  return (
    <group ref={sceneRef}>
      {/* Ground */}
      <mesh
        ref={floorRef}
        rotation-x={-Math.PI / 2}
        position={[0, S.groundY, 0]}
        receiveShadow
      >
        <planeGeometry args={[S.groundSize, S.groundSize]} />
        <meshStandardMaterial
          color={themeColor || "#1a1a2e"}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* Text */}
      <group ref={textRef} position={[S.textX, S.textY, S.textZ]}>
        <Center
          position={[0, 0, S.textGap / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <Text3D
            castShadow
            bevelEnabled
            font={FONT_3D}
            scale={S.textScale}
            letterSpacing={-0.03}
            height={0.25}
            bevelSize={0.01}
            bevelSegments={10}
            curveSegments={128}
            bevelThickness={0.01}
          >
            ADI
            <MeshTransmissionMaterial {...GLASS_TEXT} />
          </Text3D>
        </Center>

        <Center
          position={[0, 0, -S.textGap / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <Text3D
            castShadow
            bevelEnabled
            font={FONT_3D}
            scale={S.textScale}
            letterSpacing={-0.03}
            height={0.25}
            bevelSize={0.01}
            bevelSegments={10}
            curveSegments={128}
            bevelThickness={0.01}
          >
            VRSKIC
            <MeshTransmissionMaterial {...GLASS_TEXT} />
          </Text3D>
        </Center>
      </group>

      {/* Grid */}
      <Grid opSmooth={opSmooth} />

      {/* Lighting */}
      <spotLight
        ref={keyRef}
        position={[S.keyX, S.keyY, S.keyZ]}
        intensity={S.keyIntensity}
        angle={0.5}
        penumbra={0.8}
        color="#fff5e0"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0002}
      />
      <pointLight
        ref={fillRef}
        position={[S.fillX, S.fillY, S.fillZ]}
        intensity={S.fillIntensity}
        color="#c8daf0"
      />
      <pointLight
        ref={rimRef}
        position={[S.rimX, S.rimY, S.rimZ]}
        intensity={S.rimIntensity}
        color="#e0e0ff"
      />

      {/* Physics cubes */}
      <Physics gravity={[0, L.physics.gravity, 0]} colliders={false}>
        <RigidBody type="fixed" position={[0, -0.5, 0]} colliders={false}>
          <CuboidCollider
            args={[50, 0.5, 50]}
            friction={L.physics.floorFriction}
            restitution={0.05}
          />
        </RigidBody>

        {cubePositions.map((pos, i) => (
          <PhysicsCube
            key={i}
            position={pos}
            opSmooth={opSmooth}
            mouseRef={mouseRef}
          />
        ))}
      </Physics>
    </group>
  );
}

// ── Main export ──
export function SettleFloor({ themeColor }) {
  const groupRef = useRef();
  const { viewport } = useThree();
  const opSmooth = useRef(0);
  const [showDebug, setShowDebug] = useState(false);

  const lockedVw = useRef(null);
  if (viewport.width > 1 && lockedVw.current === null)
    lockedVw.current = viewport.width;
  const vw = lockedVw.current || viewport.width;

  // Set text scale based on viewport
  S.textScale = Math.max(1.5, vw * 0.2);

  useFrame(({ camera }) => {
    const isSettle = state.section >= N + 1;
    const camDist = Math.abs(-camera.position.y - (L.heroH + N * L.sectionH));
    const targetOp = isSettle ? clamp(1 - camDist / 4, 0, 1) : 0;
    opSmooth.current += (targetOp - opSmooth.current) * 0.04;

    // Toggle debug with 'D' key
    if (!showDebug && isSettle && window.__settleDebugKey) {
      setShowDebug(true);
      window.__settleDebugKey = false;
    }
  });

  // Keyboard listener for debug toggle
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "d" && e.shiftKey) {
        setShowDebug((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <group ref={groupRef} position={[0, -(L.heroH + N * L.sectionH), -3]}>
        <SettleScene themeColor={themeColor} opSmooth={opSmooth} />
      </group>
      {showDebug && (
        <Html fullscreen zIndexRange={[9999, 9999]}>
          <SettleDebug />
        </Html>
      )}
    </>
  );
}
