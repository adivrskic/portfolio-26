import { useRef, useMemo } from "react";
import { Color, Vector3 } from "three";
import { useThree, useFrame } from "@react-three/fiber";
import {
  Text as DreiText,
  MeshTransmissionMaterial,
  RoundedBox,
} from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { L, state, clamp, FONT_URL, N } from "./ShowcaseLayout";

function Text(props) {
  return <DreiText font={FONT_URL} {...props} />;
}

const LETTERS = "ADI VRSKIC".split("");
const CUBE_SIZE = 1.2;
const HALF = CUBE_SIZE / 2;

const CHAR_W = {
  A: 0.62,
  D: 0.64,
  I: 0.24,
  " ": 0.25,
  V: 0.6,
  R: 0.58,
  S: 0.54,
  K: 0.58,
  C: 0.58,
};

function getLetterPositions(vw) {
  const fontSize = vw * 0.12;
  const spacing = 1 - 0.03;
  const positions = [];
  let x = 0;
  for (let i = 0; i < LETTERS.length; i++) {
    const ch = LETTERS[i];
    const w = (CHAR_W[ch] || 0.5) * fontSize * spacing;
    if (ch !== " ") positions.push({ x: x + w / 2, char: ch });
    x += w;
  }
  const offset = x / 2;
  for (const p of positions) p.x -= offset;
  return positions;
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

    // Read from L.physics for live debug tuning
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
          radius={0.12}
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

export function SettleFloor({ themeColor }) {
  const groupRef = useRef();
  const textRef = useRef();
  const { viewport, pointer } = useThree();
  const opSmooth = useRef(0);
  const floorMatRef = useRef();
  const lineMatRef = useRef();
  const mouseRef = useRef({ x: 0, z: 0, active: false });

  const lockedVw = useRef(null);
  if (viewport.width > 1 && lockedVw.current === null)
    lockedVw.current = viewport.width;
  const vw = lockedVw.current || viewport.width;
  const vh = viewport.height;

  const letterPos = useMemo(() => getLetterPositions(vw), [vw]);
  const floorY = -vh * 0.35;
  const cubeY = floorY + HALF + 0.05;
  const cubeZ = 2.0;
  const themeColorObj = useMemo(
    () => new Color(themeColor || "#1a1a2e"),
    [themeColor]
  );

  const cubePositions = useMemo(
    () => letterPos.map((lp) => [lp.x, cubeY, cubeZ]),
    [letterPos, cubeY, cubeZ]
  );

  useFrame(({ camera }) => {
    const isSettle = state.section >= N + 1;
    const camDist = Math.abs(-camera.position.y - (L.heroH + N * L.sectionH));
    const targetOp = isSettle ? clamp(1 - camDist / 4, 0, 1) : 0;
    opSmooth.current += (targetOp - opSmooth.current) * 0.04;

    if (floorMatRef.current) {
      floorMatRef.current.opacity = opSmooth.current * 0.045;
      floorMatRef.current.color.lerp(themeColorObj, 0.05);
    }
    if (lineMatRef.current) {
      lineMatRef.current.opacity = opSmooth.current * 0.12;
      lineMatRef.current.color.lerp(themeColorObj, 0.05);
    }
    if (textRef.current) {
      textRef.current.traverse((child) => {
        if (child.material && child.material.opacity !== undefined) {
          child.material.opacity = opSmooth.current;
          child.material.transparent = true;
        }
      });
    }

    const mxW = (pointer.x * viewport.width) / 2;
    const myW = (pointer.y * viewport.height) / 2;
    mouseRef.current.x = mxW;
    mouseRef.current.z = cubeZ + myW * 0.3;
    mouseRef.current.active = isSettle;
  });

  return (
    <group ref={groupRef} position={[0, -(L.heroH + N * L.sectionH), -3]}>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, floorY - 0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[vw * 2, 30]} />
        <meshStandardMaterial
          ref={floorMatRef}
          color={themeColor || "#1a1a2e"}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, floorY + 0.005, cubeZ]}>
        <planeGeometry args={[vw * 1.2, 0.012]} />
        <meshBasicMaterial
          ref={lineMatRef}
          color={themeColor || "#1a1a2e"}
          transparent
          opacity={0}
        />
      </mesh>

      <group ref={textRef}>
        <group position={[-vw * 0.22, floorY, -1]} rotation={[0, 0.12, 0]}>
          <Text
            position={[0, 0, 0]}
            fontSize={vw * 0.14}
            lineHeight={1}
            letterSpacing={-0.04}
            anchorX="left"
            anchorY="bottom"
            textAlign="left"
            maxWidth={vw * 0.95}
            color="#1a1a2e"
          >
            ADI{"\n"}VRSKIC
          </Text>
        </group>
      </group>

      <Physics gravity={[0, L.physics.gravity, 0]} colliders={false}>
        <RigidBody
          type="fixed"
          position={[0, floorY - 0.5, 0]}
          colliders={false}
        >
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
