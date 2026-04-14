import { useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Text as DreiText } from "@react-three/drei";
import { L, state, clamp, FONT_URL, N } from "./ShowcaseLayout";

function Text(props) {
  return <DreiText font={FONT_URL} {...props} />;
}

export function SettleFloor({ themeColor }) {
  const groupRef = useRef();
  const { viewport } = useThree();
  const opSmooth = useRef(0);
  const basesStored = useRef(false);
  const lockedVw = useRef(null);
  if (viewport.width > 1 && lockedVw.current === null)
    lockedVw.current = viewport.width;
  const vw = lockedVw.current || viewport.width;

  useFrame(({ camera }) => {
    const isSettle = state.section >= N + 1;
    const camDist = Math.abs(-camera.position.y - (L.heroH + N * L.sectionH));
    const targetOp = isSettle ? clamp(1 - camDist / 4, 0, 1) : 0;
    opSmooth.current += (targetOp - opSmooth.current) * 0.06;

    if (groupRef.current) {
      // First pass: store each material's base opacity
      if (!basesStored.current) {
        groupRef.current.traverse((child) => {
          if (child.material && child.material.opacity !== undefined) {
            child.material.userData = child.material.userData || {};
            child.material.userData.baseOp = child.material.opacity;
          }
        });
        basesStored.current = true;
      }
      // Every frame: multiply base opacity by fade progress
      groupRef.current.traverse((child) => {
        if (child.material && child.material.userData?.baseOp !== undefined) {
          child.material.opacity =
            child.material.userData.baseOp * opSmooth.current;
          child.material.transparent = true;
        }
      });
    }
  });

  const D = "#1a1a2e";

  return (
    <group ref={groupRef} position={[0, -(L.heroH + N * L.sectionH), -1]}>
      <Text
        position={[0, 1.2, 0]}
        fontSize={vw * 0.08}
        letterSpacing={-0.03}
        color={D}
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.9}
      >
        Adi Vrskic
      </Text>
      <Text
        position={[0, -0.2, 0]}
        fontSize={0.14}
        letterSpacing={0.2}
        color={D}
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.6}
      >
        LET'S WORK TOGETHER
      </Text>
    </group>
  );
}
