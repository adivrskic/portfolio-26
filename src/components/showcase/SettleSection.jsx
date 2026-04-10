import { useRef, useMemo } from "react";
import { Color, Euler, MathUtils, Quaternion, Vector3 } from "three";
import { useThree, useFrame } from "@react-three/fiber";
import {
  Text as DreiText,
  MeshTransmissionMaterial,
  RoundedBox,
} from "@react-three/drei";
import { state, clamp, FONT_URL, N, SETTLE_START } from "./ShowcaseLayout";

function Text(props) {
  return <DreiText font={FONT_URL} {...props} />;
}

// ── Letter cubes ──
const LETTERS = "ADI VRSKIC".split("");
const CUBE_SIZE = 1.2;

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
  const spacing = 1 + -0.03;
  const positions = [];
  let x = 0;
  for (let i = 0; i < LETTERS.length; i++) {
    const ch = LETTERS[i];
    const w = (CHAR_W[ch] || 0.5) * fontSize * spacing;
    if (ch !== " ") {
      positions.push({ x: x + w / 2, char: ch, index: i });
    }
    x += w;
  }
  const offset = x / 2;
  for (const p of positions) p.x -= offset;
  return positions;
}

function LetterCube({ particle, opSmooth }) {
  const ref = useRef();

  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.lerp(particle.pos, 0.12);
    ref.current.quaternion.slerp(particle.quat, 0.12);

    const mesh = ref.current.children[0];
    if (mesh?.material && mesh.material.opacity !== undefined) {
      mesh.material.opacity = opSmooth.current * 0.9;
    }
  });

  return (
    <group ref={ref}>
      <RoundedBox
        args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]}
        radius={0.12}
        smoothness={3}
      >
        <MeshTransmissionMaterial
          backside
          backsideThickness={4}
          thickness={2.5}
          transmission={1}
          roughness={0.02}
          ior={1.5}
          chromaticAberration={0.05}
          anisotropicBlur={0.4}
          samples={4}
          resolution={128}
          color="#ffffff"
          transparent
          opacity={0}
          toneMapped
        />
      </RoundedBox>
    </group>
  );
}

export function SettleFloor({ themeColor }) {
  const groupRef = useRef();
  const textRef = useRef();
  const { viewport, pointer } = useThree();
  const opSmooth = useRef(0);
  const floorMatRef = useRef();
  const lineMatRef = useRef();
  const tmpV2 = useMemo(() => new Vector3(), []);
  const tmpE = useMemo(() => new Euler(), []);
  const tmpQ = useMemo(() => new Quaternion(), []);

  const lockedVw = useRef(null);
  if (viewport.width > 1 && lockedVw.current === null)
    lockedVw.current = viewport.width;
  const vw = lockedVw.current || viewport.width;
  const vh = viewport.height;

  const letterPos = useMemo(() => getLetterPositions(vw), [vw]);

  const floorY = -vh * 0.35;
  const cubeY = floorY + CUBE_SIZE / 2;
  const cubeZ = 2.0;

  const themeColorObj = useMemo(
    () => new Color(themeColor || "#1a1a2e"),
    [themeColor]
  );

  // Particles start exactly at home — no random offset, no initial velocity
  const particles = useMemo(() => {
    return letterPos.map((lp) => ({
      homeX: lp.x,
      homeZ: cubeZ,
      pos: new Vector3(lp.x, cubeY, cubeZ),
      vel: new Vector3(0, 0, 0),
      angVel: new Vector3(0, 0, 0),
      quat: new Quaternion(),
    }));
  }, [letterPos, cubeY, cubeZ]);

  useFrame(({ camera }, dt) => {
    const d = Math.min(dt, 0.033);
    const isSettle = state.section >= N + 1;
    const camDist = Math.abs(-camera.position.y - SETTLE_START);
    const targetOp = isSettle ? clamp(1 - camDist / 4, 0, 1) : 0;
    opSmooth.current += (targetOp - opSmooth.current) * 0.04;

    // Floor + line opacity
    if (floorMatRef.current) {
      floorMatRef.current.opacity = opSmooth.current * 0.045;
      floorMatRef.current.color.lerp(themeColorObj, 0.05);
    }
    if (lineMatRef.current) {
      lineMatRef.current.opacity = opSmooth.current * 0.12;
      lineMatRef.current.color.lerp(themeColorObj, 0.05);
    }

    // Text opacity
    if (textRef.current) {
      textRef.current.traverse((child) => {
        if (child.material && child.material.opacity !== undefined) {
          child.material.opacity = opSmooth.current;
          child.material.transparent = true;
        }
      });
    }

    // Mouse in world space
    const mxW = (pointer.x * viewport.width) / 2;
    const myW = (pointer.y * viewport.height) / 2;

    const pushRadius = 4;
    const pushStrength = 32;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Spring back to home — only activates when displaced
      const dispX = p.homeX - p.pos.x;
      const dispZ = p.homeZ - p.pos.z;
      p.vel.x += dispX * 6 * d;
      p.vel.z += dispZ * 6 * d;

      // Mouse push
      if (isSettle) {
        const dx = p.pos.x - mxW;
        const dz = p.pos.z - (cubeZ + myW * 0.3);
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < pushRadius && dist > 0.05) {
          const force = Math.pow(1 - dist / pushRadius, 2) * pushStrength * d;
          p.vel.x += (dx / dist) * force;
          p.vel.z += (dz / dist) * force;
          p.angVel.y += (dx / dist) * force * 1.2;
          p.angVel.x += (dz / dist) * force * 0.6;
        }
      }

      // Inter-cube collisions
      for (let j = i + 1; j < particles.length; j++) {
        const o = particles[j];
        tmpV2.subVectors(p.pos, o.pos);
        const d2 = tmpV2.x * tmpV2.x + tmpV2.z * tmpV2.z;
        const minD = CUBE_SIZE * 1.5;
        if (d2 < minD * minD && d2 > 0.001) {
          const dist = Math.sqrt(d2);
          const nx = tmpV2.x / dist;
          const nz = tmpV2.z / dist;
          const push = (minD - dist) * 0.35;
          p.pos.x += nx * push;
          p.pos.z += nz * push;
          o.pos.x -= nx * push;
          o.pos.z -= nz * push;
          p.angVel.y += nx * push * 2;
          o.angVel.y -= nx * push * 2;
        }
      }

      // Damping — heavy so cubes feel grounded and stop quickly
      p.vel.multiplyScalar(1 - 5 * d);
      p.angVel.multiplyScalar(1 - 4 * d);
      p.pos.addScaledVector(p.vel, d);

      // Floor constraint
      p.pos.y = cubeY;

      // Rotation — only spin from mouse push, decays to identity
      if (p.angVel.length() > 0.001) {
        tmpE.set(p.angVel.x * d, p.angVel.y * d, p.angVel.z * d);
        tmpQ.setFromEuler(tmpE);
        p.quat.premultiply(tmpQ).normalize();
      }
      // Slowly return rotation to upright
      p.quat.slerp(new Quaternion(), 0.02);
    }
  });

  return (
    <group ref={groupRef} position={[0, -SETTLE_START, -3]}>
      {/* Ground plane — large, theme colored */}
      <mesh rotation-x={-Math.PI / 2} position={[0, floorY - 0.01, 0]}>
        <planeGeometry args={[vw * 2, 30]} />
        <meshStandardMaterial
          ref={floorMatRef}
          color={themeColor || "#1a1a2e"}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* Floor accent line at cube row */}
      <mesh position={[0, floorY + 0.005, cubeZ]}>
        <planeGeometry args={[vw * 1.2, 0.012]} />
        <meshBasicMaterial
          ref={lineMatRef}
          color={themeColor || "#1a1a2e"}
          transparent
          opacity={0}
        />
      </mesh>

      {/* Text sitting on the ground — baseline on floor */}
      <group ref={textRef}>
        <Text
          position={[0, floorY, 0]}
          fontSize={vw * 0.12}
          lineHeight={1}
          letterSpacing={-0.03}
          anchorX="center"
          anchorY="bottom"
          textAlign="center"
          maxWidth={vw * 0.95}
          color="#1a1a2e"
        >
          ADI VRSKIC
        </Text>
      </group>

      {/* Letter cubes on the floor */}
      {particles.map((p, i) => (
        <LetterCube key={i} particle={p} opSmooth={opSmooth} />
      ))}
    </group>
  );
}
