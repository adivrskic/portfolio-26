/**
 * GlassCube — reusable glass object with MeshTransmissionMaterial.
 *
 * All props are live-tweakable from DebugPanel via config.
 * Key props for refraction quality: samples (render passes) and resolution (buffer size).
 */

import { forwardRef, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial, Edges, RoundedBox } from "@react-three/drei";

const GlassCube = forwardRef(function GlassCube(
  {
    // Geometry
    size = 1,
    cornerRadius = 0.08,
    segments = 4,

    // Transmission material
    thickness = 2,
    backsideThickness = 5,
    roughness = 0,
    ior = 1.5,
    chromaticAberration = 0.02,
    transmission = 1,
    color = "#ffffff",
    backside = true,
    anisotropicBlur = 0.4,
    distortion = 0,
    distortionScale = 0.2,
    temporalDistortion = 0,

    // Quality — these control refraction fidelity
    samples = 10, // render samples for transmission buffer (higher = better, slower)
    resolution = 1024, // FBO resolution (256/512/1024/2048)

    // Edges
    showEdges = true,
    edgeColor = "#ffffff",
    edgeOpacity = 0.12,

    // Animation
    enableIdleSpin = false,
    spinSpeedX = 0.1,
    spinSpeedY = 0.15,

    children,
    ...groupProps
  },
  ref
) {
  const meshRef = useRef();
  const resolvedRef = ref || meshRef;

  useFrame((_, delta) => {
    if (!enableIdleSpin || !resolvedRef.current) return;
    resolvedRef.current.rotation.x += spinSpeedX * delta;
    resolvedRef.current.rotation.y += spinSpeedY * delta;
  });

  return (
    <group {...groupProps}>
      <RoundedBox
        ref={resolvedRef}
        args={[size, size, size]}
        radius={cornerRadius}
        smoothness={segments}
        castShadow
        receiveShadow
      >
        <MeshTransmissionMaterial
          // Backside rendering — gives thick glass depth
          backside={backside}
          backsideThickness={backsideThickness}
          // Core transmission
          thickness={thickness}
          transmission={transmission}
          roughness={roughness}
          ior={ior}
          chromaticAberration={chromaticAberration}
          color={color}
          // Blur/distortion
          anisotropicBlur={anisotropicBlur}
          distortion={distortion}
          distortionScale={distortionScale}
          temporalDistortion={temporalDistortion}
          // Quality
          samples={samples}
          resolution={resolution}
          // Rendering
          toneMapped={true}
        />

        {showEdges && (
          <Edges
            threshold={15}
            color={edgeColor}
            opacity={edgeOpacity}
            transparent
          />
        )}

        {children}
      </RoundedBox>
    </group>
  );
});

export default GlassCube;
