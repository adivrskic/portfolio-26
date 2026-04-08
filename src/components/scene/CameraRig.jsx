/**
 * CameraRig — smooth mouse-follow camera.
 *
 * Dampens camera position toward a target derived from pointer position,
 * using maath's easing utilities (same approach as the reference code).
 */

import { useFrame } from "@react-three/fiber";
import { easing } from "maath";

export default function CameraRig({ damping = 0.2, intensity = 1 }) {
  useFrame((state, delta) => {
    // Target: slight orbit based on pointer
    const targetX = Math.sin(-state.pointer.x) * 5 * intensity;
    const targetY = state.pointer.y * 3.5 * intensity;
    const targetZ = 15 + Math.cos(state.pointer.x) * 10 * intensity;

    easing.damp3(
      state.camera.position,
      [targetX, targetY, targetZ],
      damping,
      delta
    );
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}
