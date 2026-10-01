/**
 * The intro flight, from the loader ring to the cube's spot: a fixed length (the page waits for the
 * landing). Its curves are shared by the camera rig (where the cube is) and the cube (how it turns and
 * leans). All take the flight's time, 0..1, and set off and land with no jolt: zero speed and zero
 * acceleration at both ends, so the cube eases straight into its idle motion. Its length, depth, arc and
 * turns are settings (src/config.ts).
 */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** 0 → 1 with zero speed and acceleration at both ends (smootherstep) */
const smoother = (x: number) => {
  const t = clamp01(x)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/** progress across the screen: one even push, landing at rest */
export const sweep = smoother

/** how far back into the scene it is: out first (deepest a little before halfway), forward as it lands */
export function depth(t: number) {
  const w = Math.pow(clamp01(t), 0.85)
  return 16 * w * w * (1 - w) * (1 - w)
}

/** the path's bow off a straight line, over the sweep's progress: a parabola, highest halfway */
export const arc = (k: number) => 4 * k * (1 - k)

/**
 * The turn's angle (radians) at flight time t, for a turn of `total` radians that lands still spinning: it
 * sets off from rest (no jolt) and lands at `landSpeed` (radians per unit of flight time), already slowing
 * at `landSlowing` (per unit time, squared), so the cube's spin carries on after the landing without a
 * seam. A quintic with those ends (with both zero it is the smootherstep).
 */
export function turnAngle(t: number, total: number, landSpeed: number, landSlowing: number) {
  const x = clamp01(t)
  const c3 = 10 * total - 4 * landSpeed + landSlowing / 2
  const c4 = 7 * landSpeed - 15 * total - landSlowing
  const c5 = 6 * total - 3 * landSpeed + landSlowing / 2
  return x * x * x * (c3 + x * (c4 + x * c5))
}

/** how much it leans towards the pointer: not in flight (the path is set), growing in as it lands */
export function lean(t: number) {
  const x = clamp01((t - 0.55) / 0.45)
  return x * x * (3 - 2 * x)
}
