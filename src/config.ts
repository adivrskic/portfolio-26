import { create } from 'zustand'

/**
 * Settings for the cube and the equalizer.
 *
 * Edit the defaults below, or play with them live: open the site with ?tune (e.g. localhost:5173/?tune)
 * and a panel appears. While ?tune is on, your changes are kept in this browser across reloads (the
 * intro only plays on load: "Replay intro" reloads), and "Copy settings" puts them on the clipboard
 * to paste back here. Without ?tune the site always uses these defaults.
 */
export const defaults = {
  cube: {
    // ---- size and pose
    /** size relative to its spot in the layout */
    size: 1.03,
    /** resting turn and tilt (radians): which faces show */
    yaw: 0.55,
    pitch: 0.76,
    /** slow idle drift around the resting pose (0 = still) */
    sway: 0.45,
    /** how much it leans towards the pointer (it is heavy: a little goes a long way) */
    lean: 0.3,

    // ---- blocks
    /** the groove between blocks, as a share of a block */
    gap: 0.035,
    /** corner rounding, as a share of a block */
    rounding: 0.11,
    color: '#eee9e1',
    roughness: 0.66,
    /** velvety highlight at grazing angles */
    sheen: 0.62,
    /** how deep the letters are pressed in, and how strongly their walls catch the light */
    letterDepth: 3.15,
    letterRelief: 0.2,
    /** how dark the joints between blocks are */
    groove: 0.13,

    // ---- light
    keyLight: 0.15,
    fillLight: 1,
    /** the two lights in the project's colours that orbit the cube, and their speed */
    tintLight: 0,
    tintOrbit: 0.1,
    /** while the cube is open, its centre glows in the project's colour this much (0 = not at all) */
    coreGlow: 1,

    // ---- spin: once it has landed it keeps turning
    /** how fast it is spinning as it lands (radians a second: the intro's turn carries on) */
    spinLanding: 0.8,
    /** the slow spin it settles to */
    spin: 0.18,
    /** how long its momentum takes to settle (after the landing, or a fling), seconds */
    momentum: 5,
    /** while it is parted (About, Contact, the chat, a project's case study) the cube stops and each
     *  block turns on its own instead, this fast (radians a second) */
    partSpin: 0.5,

    // ---- motion
    /** how far a hovered block (and its neighbours) lifts out */
    hoverPop: 0.31,
    /** turn one slice a full turn per project scrolled in the gallery */
    scrollSpin: true,
    /** how far the blocks part while About/Contact is open */
    open: 0.29,
    /** strongest blur of the tilt-shift lens, px */
    tiltShift: 26,
    /** how soft the whole cube goes behind a project's case study (Info), px */
    infoBlur: 16,

    // ---- shadow (on a floor under the cube, from a light of its own)
    /** how dark it is (0 = none) */
    shadow: 0.31,
    /** how soft its edge is */
    shadowSoftness: 12.5,
    /** how far below the cube the floor is, as a share of the cube's size */
    shadowDrop: 2,

    // ---- the loading puzzle (applies on reload)
    /** quarter turns to undo while the page loads (0 = starts solved) */
    scramble: 8,
    /** seconds per turn, and the pause between turns */
    moveSeconds: 0.26,
    movePause: 0.06,

    // ---- the intro flight from the loader ring to its spot (applies on reload)
    flightSeconds: 2.8,
    /** how far it draws back into the scene on the way (its size at the deepest point: 1 - this) */
    flightDepth: 0.28,
    /** how far the path bows off a straight line (a parabola), as a share of the distance */
    flightBow: 0.09,
    /** full turns on the way */
    flightTurns: 1,
  },

  equalizer: {
    /** where it shows: with the gallery only, on every page, or nowhere */
    show: 'home' as 'home' | 'always' | 'never',
    /** the edge of the screen the bars come in from */
    edge: 'bottom' as 'right' | 'left' | 'top' | 'bottom',
    /** how far in from the edge the longest bars reach, px */
    reach: 70,
    /** how many bars along the edge (100+ for tiny cubes) */
    lines: 302,
    /** the gap between cubes, as a share of the spacing */
    gap: 0,
    /** corner rounding of each cube, as a share of its size */
    rounding: 0.45,
    /** how much shorter the bars at the ends of the edge reach than the middle ones (a parabola) */
    taper: 0,
    /** how much smaller the cubes get by the far end (0.5 = half size) */
    shrink: 0.28,
    /** where along the reach the cubes start to fade and to blur (0 = at the edge, 1 = at the end) */
    fadeFrom: 0.68,
    blurFrom: 0.66,
    /** strongest blur at the far end, px */
    blur: 24,
    opacity: 0.4,

    // ---- motion
    /** how full the bars run on average */
    energy: 0.16,
    /** how much the bars swell and ebb in slow waves */
    waves: 0.68,
    /** overall tempo */
    speed: 0.26,
    /** how often beats ripple through the bars, and how hard */
    beats: 3,
    beatStrength: 2.6,
    /** how much scrolling the gallery pumps them up */
    scrollPump: 0.8,
    /** how fast the bars jump up, and fall back */
    attack: 21,
    release: 14.4,
    /** how ragged the tips are (cubes dropping out near the end of a bar) */
    ragged: 0.15,
    /** a held peak cube past each bar, how long it holds and how fast it falls */
    peaks: true,
    peakHold: 0,
    peakFall: 200,

    // ---- colour (shades of the project in focus)
    /** lightness of the darkest and the lightest shade */
    deep: 0.3,
    light: 0.7,
    saturation: 1,
    /** hue shift of the sparkle shade */
    sparkle: 0.08,
  },
}

export type Config = typeof defaults

const KEY = 'portfolio-tune'
export const tuning = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('tune')

/** the live settings: the defaults, plus what was tuned in this browser while ?tune is on */
export const config: Config = structuredClone(defaults)
if (tuning) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (saved) for (const part of ['cube', 'equalizer'] as const) Object.assign(config[part], saved[part])
  } catch {
    /* nothing saved, or storage unavailable */
  }
}

export function saveTuning() {
  try {
    localStorage.setItem(KEY, JSON.stringify(config))
  } catch {
    /* storage unavailable: changes still apply until reload */
  }
}

export function clearTuning() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable */
  }
}

/** bumps when a setting changes that needs something rebuilt (the equalizer's cubes, the blocks' shape) */
export const useTuning = create<{ rev: number; bump: () => void }>((set) => ({
  rev: 0,
  bump: () => set((s) => ({ rev: s.rev + 1 })),
}))
