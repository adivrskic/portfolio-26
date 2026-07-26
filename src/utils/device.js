/**
 * Single source of truth for device capability checks.
 *
 * These replace four separate ad-hoc detectors that used three different
 * definitions (`"ontouchstart" in window`, `innerWidth < 768`,
 * `matchMedia("(hover: none)")`), which disagreed on touchscreen laptops
 * and large tablets.
 *
 * Evaluated once at module load — they gate construction-time decisions
 * (renderer settings, material choice), so they must be stable for the
 * lifetime of the page. Use `useIsMobile()` for layout that must react to
 * resize/rotation.
 */

const mq = (q) =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(q).matches;

/** True when the primary input is a finger/stylus rather than a mouse. */
export const IS_TOUCH = mq("(pointer: coarse)") || mq("(hover: none)");

/** True when there is a precise pointer available (mouse/trackpad). */
export const HAS_FINE_POINTER = mq("(pointer: fine)") || mq("(hover: hover)");

/** Phone-sized viewport. */
export const IS_SMALL_SCREEN =
  typeof window !== "undefined" && window.innerWidth < 768;

/**
 * Use for PERFORMANCE gating (render quality, effect counts).
 * A touchscreen laptop counts as mobile here only if its viewport is small.
 */
export const IS_LOW_POWER = IS_TOUCH || IS_SMALL_SCREEN;

/**
 * Use for INTERACTION gating (cursor-driven effects).
 * A touchscreen laptop with a mouse still gets cursor effects.
 */
export const NEEDS_TOUCH_FALLBACK = !HAS_FINE_POINTER;
