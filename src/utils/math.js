/**
 * Shared math utility functions.
 */

export function rand(a, b) {
  return a + Math.random() * (b - a);
}

export function easeOutSoft(t) {
  return 1 - Math.pow(1 - t, 2.5);
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
