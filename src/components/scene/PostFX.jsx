/**
 * PostFX — post-processing effect stack.
 *
 * Wraps @react-three/postprocessing's EffectComposer with:
 *   - N8AO: ambient occlusion (soft contact shadows)
 *   - Bloom: glow on bright areas (glass highlights, edges)
 *   - TiltShift2: subtle depth blur for cinematic feel
 *
 * All values are tunable via props. Disable individual effects
 * by setting their intensity/blur to 0.
 */

import {
  EffectComposer,
  Bloom,
  N8AO,
  TiltShift2,
} from "@react-three/postprocessing";

export default function PostFX({
  // N8AO (ambient occlusion)
  aoRadius = 1,
  aoIntensity = 2,

  // Bloom
  bloomIntensity = 2,
  bloomLuminanceThreshold = 0.8,
  bloomLevels = 8,
  bloomMipmapBlur = true,

  // Tilt-shift
  tiltBlur = 0.2,

  enabled = true,
}) {
  if (!enabled) return null;

  return (
    <EffectComposer disableNormalPass>
      <N8AO aoRadius={aoRadius} intensity={aoIntensity} />
      <Bloom
        mipmapBlur={bloomMipmapBlur}
        luminanceThreshold={bloomLuminanceThreshold}
        intensity={bloomIntensity}
        levels={bloomLevels}
      />
      <TiltShift2 blur={tiltBlur} />
    </EffectComposer>
  );
}
