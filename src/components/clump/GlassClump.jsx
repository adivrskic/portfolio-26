import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, RoundedBox } from "@react-three/drei";
import { EffectComposer, N8AO, Bloom, SMAA } from "@react-three/postprocessing";

const COUNT = 30;
const ATTRACT = -35;
const LINEAR_DAMP = 0.6;
const ANGULAR_DAMP = 0.85;
const MOUSE_PUSH = 8;
const MOUSE_RADIUS = 4;
const CUBE_SIZE = 0.8;

function rfs(range) {
  return THREE.MathUtils.randFloatSpread(range);
}

function Clump() {
  const meshRef = useRef();
  const { viewport } = useThree();

  // Per-instance state: position, velocity, angular velocity, quaternion
  const state = useMemo(() => {
    const positions = [];
    const velocities = [];
    const angVels = [];
    const quats = [];
    for (let i = 0; i < COUNT; i++) {
      positions.push(new THREE.Vector3(rfs(16), rfs(16), rfs(8)));
      velocities.push(new THREE.Vector3(rfs(2), rfs(2), rfs(1)));
      angVels.push(new THREE.Vector3(rfs(1), rfs(1), rfs(0.5)));
      quats.push(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rfs(Math.PI), rfs(Math.PI), rfs(Math.PI))
        )
      );
    }
    return { positions, velocities, angVels, quats };
  }, []);

  // Mouse tracking
  const mouseWorld = useRef(new THREE.Vector3(0, 0, 0));
  useEffect(() => {
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseWorld.current.set(
        (x * viewport.width) / 2,
        (y * viewport.height) / 2,
        0
      );
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [viewport]);

  const mat4 = useMemo(() => new THREE.Matrix4(), []);
  const force = useMemo(() => new THREE.Vector3(), []);
  const dq = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    const clampDt = Math.min(dt, 0.033);

    for (let i = 0; i < COUNT; i++) {
      const pos = state.positions[i];
      const vel = state.velocities[i];
      const angVel = state.angVels[i];
      const quat = state.quats[i];

      // Attract to center
      force.copy(pos).normalize().multiplyScalar(ATTRACT);
      vel.addScaledVector(force, clampDt);

      // Mouse repulsion
      const toMouse = force.copy(pos).sub(mouseWorld.current);
      const dist = toMouse.length();
      if (dist < MOUSE_RADIUS && dist > 0.01) {
        toMouse.normalize().multiplyScalar(MOUSE_PUSH / (dist * 0.5 + 0.3));
        vel.addScaledVector(toMouse, clampDt);
      }

      // Damping
      vel.multiplyScalar(1 - LINEAR_DAMP * clampDt);
      angVel.multiplyScalar(1 - ANGULAR_DAMP * clampDt);

      // Integrate
      pos.addScaledVector(vel, clampDt);

      // Angular — convert angular vel to quaternion delta
      const angLen = angVel.length();
      if (angLen > 0.001) {
        euler.set(angVel.x * clampDt, angVel.y * clampDt, angVel.z * clampDt);
        dq.setFromEuler(euler);
        quat.premultiply(dq).normalize();
      }

      // Cube-cube collision (simple soft push)
      for (let j = i + 1; j < COUNT; j++) {
        const other = state.positions[j];
        const dx = pos.x - other.x;
        const dy = pos.y - other.y;
        const dz = pos.z - other.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        const minDist = CUBE_SIZE * 1.6;
        if (d2 < minDist * minDist && d2 > 0.001) {
          const d = Math.sqrt(d2);
          const overlap = (minDist - d) * 0.5;
          const nx = dx / d,
            ny = dy / d,
            nz = dz / d;
          pos.x += nx * overlap * 0.3;
          pos.y += ny * overlap * 0.3;
          pos.z += nz * overlap * 0.3;
          other.x -= nx * overlap * 0.3;
          other.y -= ny * overlap * 0.3;
          other.z -= nz * overlap * 0.3;
          // Transfer some angular velocity on collision
          const impulse = overlap * 2;
          angVel.x += ny * impulse;
          angVel.y += nx * impulse;
          state.angVels[j].x -= ny * impulse;
          state.angVels[j].y -= nx * impulse;
        }
      }

      // Write to instance matrix
      mat4.compose(pos, quat, new THREE.Vector3(1, 1, 1));
      meshRef.current.setMatrixAt(i, mat4);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Geometry — RoundedBox as buffer geometry
  const geo = useMemo(() => {
    const tempMesh = new THREE.Mesh();
    // We'll use a simple box with beveled edges approximation
    const g = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE, 2, 2, 2);
    return g;
  }, []);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, undefined, COUNT]}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        transmission={1}
        roughness={0.1}
        thickness={0.5}
        ior={1.5}
        chromaticAberration={0.02}
        envMapIntensity={1.2}
        transparent
        opacity={0.9}
        color="#ffffff"
      />
    </instancedMesh>
  );
}

function Pointer() {
  const ref = useRef();
  const { viewport } = useThree();
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.set(
        (state.mouse.x * viewport.width) / 2,
        (state.mouse.y * viewport.height) / 2,
        0
      );
    }
  });
  return (
    <mesh ref={ref} scale={0.15}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color={[3, 3, 3]} toneMapped={false} />
      <pointLight intensity={6} distance={8} />
    </mesh>
  );
}

export default function GlassClump() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <Canvas
        shadows
        gl={{ antialias: false, alpha: true }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 18], fov: 35, near: 1, far: 40 }}
        style={{ pointerEvents: "auto" }}
      >
        <ambientLight intensity={0.4} />
        <spotLight
          intensity={1}
          angle={0.2}
          penumbra={1}
          position={[20, 20, 20]}
          castShadow
        />
        <Clump />
        <Pointer />
        <Environment files="/adamsbridge.hdr" />
        <EffectComposer disableNormalPass multisampling={0}>
          <N8AO
            halfRes
            color="black"
            aoRadius={2}
            intensity={0.8}
            aoSamples={6}
            denoiseSamples={4}
          />
          <Bloom mipmapBlur levels={5} intensity={0.6} />
          <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
