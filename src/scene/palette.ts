import * as THREE from 'three'
import { PROJECTS } from '../data/projects'
import { useUI } from '../state/store'

const FALLBACK = '#ff4d23'
const hsl = { h: 0, s: 0, l: 0 }

/** push any accent towards a saturated, mid-light hue so it reads as light, not as a dark blob */
export function toGlow(hex: string, out = new THREE.Color()) {
  out.set(hex)
  out.getHSL(hsl)
  if (hsl.s < 0.12) return out.set(FALLBACK)
  out.setHSL(hsl.h, Math.max(hsl.s, 0.78), THREE.MathUtils.clamp(hsl.l, 0.5, 0.6))
  return out
}

/** current target glow colour (the scene eases towards it) */
export const glowColor = { current: toGlow(PROJECTS[0]?.accent ?? FALLBACK) }

function sync(active: number) {
  const accent = PROJECTS[active]?.accent ?? FALLBACK
  toGlow(accent, glowColor.current)
  document.documentElement.style.setProperty('--accent', `#${glowColor.current.getHexString()}`)
}

sync(useUI.getState().active)
useUI.subscribe((s, prev) => {
  if (s.active !== prev.active) sync(s.active)
})
