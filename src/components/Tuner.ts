import { Pane, type FolderApi } from 'tweakpane'
import { clearTuning, config, defaults, saveTuning, useTuning } from '../config'

type Part = 'cube' | 'equalizer'
type Range = { min: number; max: number; step: number; label?: string }
type Choice = { options: Record<string, string | number>; label?: string }
type Spec = Record<string, Range | Choice | { label?: string } | null>

/** settings that change what is built (the blocks' shape, the equalizer's layout), not just how it looks */
const REBUILD = new Set(['cube.gap', 'cube.rounding', 'equalizer.edge', 'equalizer.reach', 'equalizer.lines'])

const CUBE: Record<string, Spec> = {
  'Size & pose': {
    size: { min: 0.3, max: 1.8, step: 0.01 },
    yaw: { min: -3.14, max: 3.14, step: 0.01 },
    pitch: { min: -1.2, max: 1.2, step: 0.01 },
    sway: { min: 0, max: 4, step: 0.05 },
    lean: { min: 0, max: 4, step: 0.05, label: 'lean to pointer' },
  },
  Blocks: {
    gap: { min: 0, max: 0.3, step: 0.005 },
    rounding: { min: 0, max: 0.5, step: 0.01 },
    color: null,
    roughness: { min: 0, max: 1, step: 0.01 },
    sheen: { min: 0, max: 1, step: 0.01 },
    letterDepth: { min: 0, max: 8, step: 0.05, label: 'letter depth' },
    letterRelief: { min: 0, max: 3, step: 0.05, label: 'letter relief' },
    groove: { min: 0, max: 1, step: 0.01, label: 'joint shade' },
  },
  Light: {
    keyLight: { min: 0, max: 6, step: 0.05, label: 'key' },
    fillLight: { min: 0, max: 3, step: 0.05, label: 'fill' },
    tintLight: { min: 0, max: 10, step: 0.05, label: 'tint' },
    tintOrbit: { min: 0, max: 3, step: 0.01, label: 'tint orbit' },
    coreGlow: { min: 0, max: 3, step: 0.05, label: 'core glow (open)' },
    coreHeat: { min: 1, max: 6, step: 0.05, label: 'core brightness' },
    coreBloom: { min: 0, max: 4, step: 0.05, label: 'core bloom' },
    coreBloomRadius: { min: 0, max: 1, step: 0.01, label: 'bloom spread' },
  },
  Spin: {
    spin: { min: 0, max: 1.5, step: 0.01, label: 'slow spin' },
    spinLanding: { min: 0, max: 4, step: 0.05, label: 'landing spin' },
    momentum: { min: 0.3, max: 20, step: 0.1, label: 'momentum (s)' },
    partSpin: { min: 0, max: 3, step: 0.01, label: 'parted: blocks spin' },
  },
  Motion: {
    hoverPop: { min: 0, max: 0.6, step: 0.01, label: 'hover pop' },
    scrollSpin: { label: 'spin on scroll' },
    open: { min: 0, max: 1.5, step: 0.01, label: 'part on about' },
    tiltShift: { min: 0, max: 30, step: 0.5, label: 'tilt-shift blur' },
    infoBlur: { min: 0, max: 40, step: 0.5, label: 'blur behind info' },
  },
  'Floor & shadow': {
    shadow: { min: 0, max: 0.8, step: 0.01, label: 'darkness' },
    shadowColor: { label: 'shadow colour' },
    shadowSoftness: { min: 1, max: 30, step: 0.5, label: 'softness' },
    shadowMap: { options: { '128 (softest)': 128, '256': 256, '512': 512, '1024 (crispest)': 1024 }, label: 'detail' },
    shadowDrop: { min: 0, max: 3, step: 0.01, label: 'drop below' },
    floorTilt: { min: -0.8, max: 0.8, step: 0.01, label: 'floor tilt' },
    shadowAngle: { min: -3.14, max: 3.14, step: 0.01, label: 'light direction' },
    shadowSlant: { min: 0, max: 1.2, step: 0.01, label: 'light slant' },
    floorGlow: { min: 0, max: 2, step: 0.05, label: 'core glow on floor' },
  },
  'Intro (replay to see)': {
    scramble: { min: 0, max: 30, step: 1, label: 'scramble turns' },
    moveSeconds: { min: 0.05, max: 1.5, step: 0.01, label: 'turn seconds' },
    movePause: { min: 0, max: 1, step: 0.01, label: 'turn pause' },
    flightSeconds: { min: 0.4, max: 6, step: 0.05, label: 'flight seconds' },
    flightDepth: { min: 0, max: 0.9, step: 0.01, label: 'flight depth' },
    flightBow: { min: -0.6, max: 0.6, step: 0.01, label: 'flight bow' },
    flightTurns: { min: 0, max: 4, step: 0.25, label: 'flight turns' },
  },
}

const EQUALIZER: Record<string, Spec> = {
  Placement: {
    edge: { options: { right: 'right', left: 'left', top: 'top', bottom: 'bottom' } },
    show: { options: { 'gallery only': 'home', 'every page': 'always', off: 'never' } },
    reach: { min: 40, max: 1600, step: 10 },
    lines: { min: 8, max: 400, step: 1 },
  },
  Cubes: {
    gap: { min: 0, max: 0.8, step: 0.01 },
    rounding: { min: 0, max: 1, step: 0.01 },
    taper: { min: 0, max: 1, step: 0.01, label: 'taper (parabola)' },
    shrink: { min: 0, max: 1, step: 0.01, label: 'shrink outwards' },
    opacity: { min: 0, max: 1, step: 0.01 },
  },
  'Fade & blur': {
    fadeFrom: { min: 0, max: 1, step: 0.01, label: 'fade from' },
    blurFrom: { min: 0, max: 1, step: 0.01, label: 'blur from' },
    blur: { min: 0, max: 24, step: 0.1, label: 'max blur' },
  },
  Motion: {
    energy: { min: 0, max: 1.2, step: 0.01 },
    waves: { min: 0, max: 3, step: 0.01 },
    speed: { min: 0, max: 4, step: 0.01 },
    beats: { min: 0, max: 5, step: 0.05, label: 'beats / s' },
    beatStrength: { min: 0, max: 4, step: 0.05, label: 'beat strength' },
    scrollPump: { min: 0, max: 4, step: 0.05, label: 'scroll pump' },
    attack: { min: 1, max: 60, step: 0.5 },
    release: { min: 0.2, max: 20, step: 0.1 },
    ragged: { min: 0, max: 1, step: 0.01, label: 'ragged tips' },
    peaks: { label: 'peak cubes' },
    peakHold: { min: 0, max: 3, step: 0.05, label: 'peak hold' },
    peakFall: { min: 1, max: 200, step: 1, label: 'peak fall' },
  },
  Colour: {
    deep: { min: 0, max: 1, step: 0.01, label: 'dark shade' },
    light: { min: 0, max: 1, step: 0.01, label: 'light shade' },
    saturation: { min: 0, max: 2, step: 0.01 },
    sparkle: { min: -0.5, max: 0.5, step: 0.01, label: 'sparkle hue' },
  },
}

function addFolders(parent: FolderApi | Pane, part: Part, groups: Record<string, Spec>, open: string) {
  const target = config[part] as Record<string, unknown>
  for (const [title, spec] of Object.entries(groups)) {
    const folder = parent.addFolder({ title, expanded: title === open })
    for (const [key, opts] of Object.entries(spec)) {
      folder.addBinding(target, key, { ...(opts ?? {}), label: opts?.label ?? key }).on('change', () => {
        saveTuning()
        if (REBUILD.has(`${part}.${key}`)) useTuning.getState().bump()
      })
    }
  }
}

/** only what differs from the defaults, as lines to paste into src/config.ts */
function changes() {
  const lines: string[] = []
  for (const part of ['cube', 'equalizer'] as Part[]) {
    const now = config[part] as Record<string, unknown>
    const was = defaults[part] as Record<string, unknown>
    const diff = Object.keys(now).filter((k) => now[k] !== was[k])
    if (!diff.length) continue
    lines.push(`// ${part}`)
    for (const k of diff) {
      const v = now[k]
      // sliders leave floating-point tails (0.44999999999999996): round them
      const shown = typeof v === 'string' ? `'${v}'` : typeof v === 'number' ? Number(v.toFixed(4)) : v
      lines.push(`${k}: ${shown},`)
    }
  }
  return lines.length ? lines.join('\n') : '// no changes from the defaults'
}

/**
 * The tuning panel (open the site with ?tune): every setting in src/config.ts, live. Changes are kept in
 * this browser while ?tune is on; the intro only plays on load, so "Replay intro" reloads.
 */
let mounted = false

export function mountTuner() {
  // once (React runs effects twice in development)
  if (mounted) return
  mounted = true
  const host = document.createElement('div')
  host.className = 'tuner'
  // the gallery leaves wheel and arrow keys alone in here
  host.setAttribute('data-scroll-own', '')
  document.body.appendChild(host)
  const pane = new Pane({ container: host, title: 'Tune' })

  addFolders(pane.addFolder({ title: 'Cube', expanded: true }), 'cube', CUBE, 'Size & pose')
  addFolders(pane.addFolder({ title: 'Equalizer', expanded: true }), 'equalizer', EQUALIZER, 'Placement')

  pane.addBlade({ view: 'separator' })
  pane.addButton({ title: 'Replay intro' }).on('click', () => window.location.reload())
  const copy = pane.addButton({ title: 'Copy settings' })
  copy.on('click', async () => {
    try {
      await navigator.clipboard.writeText(changes())
      copy.title = 'Copied: paste into src/config.ts'
    } catch {
      copy.title = 'Copy failed (see console)'
      console.log(changes())
    }
    window.setTimeout(() => (copy.title = 'Copy settings'), 2400)
  })
  pane.addButton({ title: 'Reset to defaults' }).on('click', () => {
    clearTuning()
    window.location.reload()
  })
}
