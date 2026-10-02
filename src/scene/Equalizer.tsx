import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { config, useTuning } from '../config'
import { bus, useUI } from '../state/store'
import { BREAKPOINT } from './Backdrop'
import { glowColor } from './palette'

/**
 * The equalizer is drawn on top of the finished frame, after the tilt-shift lens (so its cubes stay sharp
 * where the lens blurs, on the cube's side of the page), on a layer of its own; but it reads as behind
 * everything. The big cube is also on CUBE_DEPTH, so its depth can go in first and the cube stays in front
 * where they meet; and the cube's shadow on its floor (with the light that casts it) is on SHADOW_ONLY,
 * drawn alone into a small soft target the cubes are shaded by, so they lie under the shadow too.
 */
export const OVERLAY = 1
export const CUBE_DEPTH = 2
export const SHADOW_ONLY = 3
/** the shadow's target, this much smaller than the page (it softens as it is scaled back up) */
const SHADOW_SCALE = 4

const vertexShader = /* glsl */ `
  attribute vec2 aCell;
  attribute vec2 aRand;
  uniform vec2 uView;
  uniform vec2 uOrigin;
  uniform vec2 uDir;
  uniform vec2 uAcross;
  uniform float uPitch;
  uniform float uCell;
  uniform float uReach;
  uniform float uLines;
  uniform float uTime;
  uniform float uFade;
  uniform float uShrink;
  uniform float uFadeFrom;
  uniform float uBlurFrom;
  uniform float uBlur;
  uniform float uRagged;
  uniform float uPeaks;
  uniform sampler2D uLevels;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uLight;
  uniform vec3 uHot;
  varying vec2 vLocal;
  varying float vHalf;
  varying float vSoft;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float col = aCell.x;   // cubes in from the edge
    float line = aCell.y;  // bars along the edge
    vec4 lv = texture2D(uLevels, vec2((line + 0.5) / uLines, 0.5));
    float level = lv.r;
    float peak = lv.g;
    float dist = (col + 0.5) * uPitch;
    float t = dist / uReach;

    // the bar: whole cubes up to its level, the next one growing in. Near the tip cubes drop out at
    // random, so the end is ragged like an LED wall
    float tip = clamp((level - col) / 3.0, 0.0, 1.0);
    float on = clamp(level - col, 0.0, 1.0) * step(aRand.x, 1.0 - uRagged + uRagged * tip);
    // the bar's peak: held a moment past it, then falling back
    float held = uPeaks * step(level + 1.5, peak) * (1.0 - step(0.5, abs(col + 0.5 - peak)));
    float lit = max(on, held);

    // on the way out the cubes shrink (parabolically), blur and fade
    float size = uCell * max(0.0, 1.0 - uShrink * t * t) * lit;
    float soft = mix(0.45, max(0.45, uBlur), smoothstep(uBlurFrom, 1.0, t));
    float alpha = (1.0 - smoothstep(uFadeFrom, 1.0, t)) * uFade;
    if (size < 0.05 || alpha < 0.003 || t > 1.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    // a quad around the cube with room for its blur, in screen px: along the edge, then in from it
    float ext = size * 0.5 + soft * 1.6 + 0.5;
    vLocal = vec2(position.x, -position.y) * 2.0 * ext;
    vec2 p = uOrigin + uAcross * ((line + 0.5) * uPitch) + uDir * dist + vLocal;
    // far back, so the big cube (which writes depth) stays in front where they meet
    gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.999, 1.0);
    vHalf = size * 0.5;
    vSoft = soft;
    vAlpha = alpha;

    // shades of the project's colour drift across the field in slow diagonal bands, dithered where
    // they meet; the held peaks are the sparkle shade
    float f = 0.5 + 0.3 * sin(col * 0.17 + line * 0.085 - uTime * 0.6)
                  + 0.2 * sin(line * 0.05 - col * 0.12 + uTime * 0.37 + 1.7)
                  + (aRand.y - 0.5) * 0.3;
    vec3 tone = f < 0.32 ? uDeep : f < 0.66 ? uMid : f < 0.9 ? uLight : uHot;
    vColor = held > 0.5 ? uHot : tone;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uRound;
  uniform sampler2D uShadow;
  uniform vec2 uScreen;
  varying vec2 vLocal;
  varying float vHalf;
  varying float vSoft;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    // a tiny rounded block, its edge softening with distance (the blur)
    float r = vHalf * uRound;
    vec2 q = abs(vLocal) - vec2(vHalf - r);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    float a = 1.0 - smoothstep(-vSoft, vSoft, d);
    // blurred, the same light spreads thinner
    a *= vAlpha * (vHalf + 1.0) / (vHalf + vSoft + 0.55);
    if (a < 0.004) discard;
    // a faint light along the top edge, like the big cube's blocks
    float up = clamp(-vLocal.y / max(vHalf, 0.5), -1.0, 1.0);
    vec3 col = vColor * (1.0 + 0.1 * up);
    // under the big cube's shadow, as the page behind it is (the shadow on its own: its colour already
    // weighed by how dark it is there, and how dark in alpha)
    vec4 shade = texture2D(uShadow, gl_FragCoord.xy / uScreen);
    col = col * (1.0 - shade.a) + shade.rgb;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`

/** a stable random number per cube */
function hash(a: number, b: number, c: number) {
  let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 1, 668265263) ^ Math.imul(c + 1, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

type Beat = { t: number; amp: number; at: number }
const hsl = { h: 0, s: 0, l: 0 }

/**
 * Coming in from an edge of the page (the right, by default): an equalizer of tiny cubes, one bar per
 * line along the edge (100+ of them). Each bar's level jumps up quickly and falls back slowly, with its
 * peak held a moment and dropping back; the reach is a parabola (longest in the middle of the edge); on
 * the way out the cubes shrink, blur and fade. Shades of the project in focus. Beats ripple along the
 * bars, and scrolling the gallery pumps them up. With the gallery only, by default: the bars draw back
 * in elsewhere, and grow out with the gallery once the intro is over. Every setting is in src/config.ts.
 */
export function Equalizer() {
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  // the layout below is rebuilt when it is tuned
  useTuning((s) => s.rev)
  const cfg = config.equalizer

  const side = cfg.edge === 'left' || cfg.edge === 'right'
  const along = side ? height : width
  const across = side ? width : height
  // never across the whole screen (and only a strip on a phone's sides)
  const reach = Math.max(20, Math.min(cfg.reach, across * (side && width < BREAKPOINT ? 0.36 : 0.9)))
  const lines = Math.max(4, Math.round(cfg.lines))
  const pitch = along / lines
  const cols = Math.ceil(reach / pitch) + 1

  // one quad per cube, instanced over lines × cols
  const geometry = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = base.index
    g.setAttribute('position', base.getAttribute('position'))
    const n = lines * cols
    const cell = new Float32Array(n * 2)
    const rand = new Float32Array(n * 2)
    let i = 0
    for (let r = 0; r < lines; r++)
      for (let c = 0; c < cols; c++, i++) {
        cell[i * 2] = c
        cell[i * 2 + 1] = r
        rand[i * 2] = hash(r, c, 1)
        rand[i * 2 + 1] = hash(r, c, 2)
      }
    g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 2))
    g.setAttribute('aRand', new THREE.InstancedBufferAttribute(rand, 2))
    g.instanceCount = n
    base.dispose()
    return g
  }, [lines, cols])

  // each bar's level and held peak (in cubes), read by the vertex shader
  const levels = useMemo(() => {
    const tex = new THREE.DataTexture(new Float32Array(lines * 4), lines, 1, THREE.RGBAFormat, THREE.FloatType)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    tex.needsUpdate = true
    return tex
  }, [lines])

  // we own the material (R3F would copy a uniforms prop, and later values would never reach the GPU)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uView: { value: new THREE.Vector2() },
          uOrigin: { value: new THREE.Vector2() },
          uDir: { value: new THREE.Vector2() },
          uAcross: { value: new THREE.Vector2() },
          uPitch: { value: 8 },
          uCell: { value: 6 },
          uReach: { value: 500 },
          uLines: { value: 112 },
          uTime: { value: 0 },
          uFade: { value: 0 },
          uShrink: { value: 0.5 },
          uFadeFrom: { value: 0.42 },
          uBlurFrom: { value: 0.3 },
          uBlur: { value: 6.5 },
          uRagged: { value: 0.6 },
          uPeaks: { value: 1 },
          uRound: { value: 0.3 },
          uLevels: { value: null as THREE.Texture | null },
          uDeep: { value: new THREE.Color() },
          uMid: { value: new THREE.Color() },
          uLight: { value: new THREE.Color() },
          uHot: { value: new THREE.Color() },
          uShadow: { value: null as THREE.Texture | null },
          uScreen: { value: new THREE.Vector2(1, 1) },
        },
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => geometry.dispose(), [geometry])
  const mesh = useRef<THREE.Mesh>(null)
  const depthOnly = useMemo(() => new THREE.MeshBasicMaterial({ colorWrite: false }), [])
  useEffect(() => () => depthOnly.dispose(), [depthOnly])
  // the big cube's shadow on its own (see SHADOW_ONLY)
  const shadow = useMemo(() => new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false }), [])
  useEffect(() => () => shadow.dispose(), [shadow])
  const screen = useMemo(() => new THREE.Vector2(), [])
  const clearColor = useMemo(() => new THREE.Color(), [])
  useEffect(() => () => levels.dispose(), [levels])

  const sim = useRef({
    level: new Float32Array(0),
    peak: new Float32Array(0),
    hold: new Float32Array(0),
    fall: new Float32Array(0),
    time: 7,
    vis: 0,
    pump: 0,
    lastDrum: Number.NaN,
    beats: [] as Beat[],
    nextBeat: 0,
    color: new THREE.Color().copy(glowColor.current),
  })
  if (sim.current.level.length !== lines) {
    const s = sim.current
    s.level = new Float32Array(lines)
    s.peak = new Float32Array(lines)
    s.hold = new Float32Array(lines)
    s.fall = new Float32Array(lines)
  }

  // a new project in focus sends a strong beat out from the middle
  useEffect(
    () =>
      useUI.subscribe((s, prev) => {
        if (s.active === prev.active || reduced) return
        const sm = sim.current
        sm.beats.push({ t: sm.time, amp: 0.5, at: 0 })
      }),
    [reduced],
  )

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const s = sim.current
    const ui = useUI.getState()
    const shown =
      cfg.show === 'always' ? ui.ready : cfg.show === 'home' ? ui.ready && ui.view === 'home' && !ui.panel : false
    // out with the gallery, back in (a little quicker) when it goes
    s.vis = THREE.MathUtils.damp(s.vis, shown ? 1 : 0, shown ? 1.3 : 3.5, dt)
    if (!reduced) s.time += dt * cfg.speed
    const T = s.time

    // beats at an uneven tempo, each rippling along the bars from where it lands
    if (!reduced && cfg.beats > 0 && T >= s.nextBeat) {
      s.beats.push({ t: T, amp: (0.14 + Math.random() * 0.3) * cfg.beatStrength, at: Math.random() * 1.6 - 0.8 })
      s.nextBeat = T + (0.45 + Math.random() * 0.9) / cfg.beats
    }
    for (let i = s.beats.length - 1; i >= 0; i--) if (T - s.beats[i].t > 1.6) s.beats.splice(i, 1)

    // the gallery moving pumps energy in
    const drum = bus.drum
    const moving = Number.isFinite(drum) && Number.isFinite(s.lastDrum) ? Math.abs(drum - s.lastDrum) / dt : 0
    s.lastDrum = drum
    const surge = Math.min(1, moving * 0.8)
    s.pump = THREE.MathUtils.damp(s.pump, surge, surge > s.pump ? 10 : 2.4, dt)

    const data = levels.image.data as Float32Array
    const reachCells = reach / pitch
    for (let r = 0; r < lines; r++) {
      const u = (2 * (r + 0.5)) / lines - 1
      const envelope = Math.max(0, 1 - cfg.taper * u * u) * reachCells
      let e =
        cfg.energy +
        cfg.waves *
          (0.15 * Math.sin(T * 1.25 + r * 0.23) +
            0.11 * Math.sin(T * 2.3 - r * 0.41 + 1.7) +
            0.07 * Math.sin(T * 4.3 + r * 0.97 + 0.6))
      for (const b of s.beats) {
        const age = T - b.t
        const front = Math.abs(u - b.at) - age * 1.7
        e += b.amp * Math.exp(-front * front * 60) * Math.exp(-age * 2.4)
      }
      e += s.pump * cfg.scrollPump * (0.22 + 0.18 * Math.sin(r * 0.73 + T * 10))
      const target = Math.min(1, Math.max(0, e)) * envelope * s.vis
      // a quick attack and a slow release, like a meter
      const lv = s.level[r]
      const level = lv + (target - lv) * (1 - Math.exp(-dt * (target > lv ? cfg.attack : cfg.release)))
      s.level[r] = level
      // the peak holds for a moment, then falls back with gravity
      if (level >= s.peak[r]) {
        s.peak[r] = level
        s.hold[r] = cfg.peakHold
        s.fall[r] = 0
      } else if (s.hold[r] > 0) {
        s.hold[r] -= dt
      } else {
        s.fall[r] += dt * cfg.peakFall
        s.peak[r] = Math.max(level, s.peak[r] - s.fall[r] * dt)
      }
      data[r * 4] = level
      data[r * 4 + 1] = s.peak[r]
    }
    levels.needsUpdate = true

    // shades of the project in focus, easing over when it changes
    s.color.lerp(glowColor.current, 1 - Math.exp(-dt * 3))
    s.color.getHSL(hsl)
    const sat = hsl.s * cfg.saturation
    const u = material.uniforms
    u.uDeep.value.setHSL(hsl.h + 0.015, Math.min(1, sat * 0.7), cfg.deep)
    u.uMid.value.setHSL(hsl.h, Math.min(1, sat * 0.95), 0.5)
    u.uLight.value.setHSL(hsl.h - 0.015, Math.min(1, sat * 0.8), cfg.light)
    u.uHot.value.setHSL(hsl.h + cfg.sparkle, Math.min(1, sat * 1.05), 0.6)

    // which edge: where the bars start, which way they grow, and which way the bars line up
    const edge = cfg.edge
    u.uOrigin.value.set(edge === 'right' ? width : 0, edge === 'bottom' ? height : 0)
    u.uDir.value.set(edge === 'right' ? -1 : edge === 'left' ? 1 : 0, edge === 'bottom' ? -1 : edge === 'top' ? 1 : 0)
    u.uAcross.value.set(side ? 0 : 1, side ? 1 : 0)
    u.uView.value.set(width, height)
    u.uPitch.value = pitch
    u.uCell.value = pitch * (1 - cfg.gap)
    u.uReach.value = reach
    u.uLines.value = lines
    u.uTime.value = T
    u.uFade.value = THREE.MathUtils.smoothstep(s.vis, 0, 0.12) * cfg.opacity
    u.uShrink.value = cfg.shrink
    u.uFadeFrom.value = Math.min(0.99, cfg.fadeFrom)
    u.uBlurFrom.value = Math.min(0.99, cfg.blurFrom)
    u.uBlur.value = cfg.blur
    u.uRagged.value = cfg.ragged
    u.uPeaks.value = cfg.peaks ? 1 : 0
    u.uRound.value = Math.min(1, cfg.rounding)
    u.uLevels.value = levels
  }, -1)

  // after the post-processing composer (which renders at priority 1): the cube's shadow on its own, the
  // cube's depth, then the cubes
  useFrame(({ gl, scene, camera }) => {
    const m = mesh.current
    if (!m) return
    m.layers.set(OVERLAY)
    const autoClear = gl.autoClear
    const shadows = gl.shadowMap.autoUpdate
    gl.autoClear = false
    gl.shadowMap.autoUpdate = false
    // the shadow (from the shadow map the frame just made) on a clear target, at a fraction of the size
    gl.getDrawingBufferSize(screen)
    const sw = Math.max(1, Math.round(screen.x / SHADOW_SCALE))
    const sh = Math.max(1, Math.round(screen.y / SHADOW_SCALE))
    if (shadow.width !== sw || shadow.height !== sh) shadow.setSize(sw, sh)
    gl.getClearColor(clearColor)
    const clearAlpha = gl.getClearAlpha()
    gl.setRenderTarget(shadow)
    gl.setClearColor(0x000000, 0)
    gl.clear(true, false, false)
    camera.layers.set(SHADOW_ONLY)
    gl.render(scene, camera)
    gl.setClearColor(clearColor, clearAlpha)
    material.uniforms.uShadow.value = shadow.texture
    material.uniforms.uScreen.value.copy(screen)
    gl.setRenderTarget(null)
    gl.clearDepth()
    camera.layers.set(CUBE_DEPTH)
    scene.overrideMaterial = depthOnly
    gl.render(scene, camera)
    scene.overrideMaterial = null
    camera.layers.set(OVERLAY)
    gl.render(scene, camera)
    camera.layers.set(0)
    gl.shadowMap.autoUpdate = shadows
    gl.autoClear = autoClear
  }, 2)

  return (
    <mesh ref={mesh} geometry={geometry} frustumCulled={false} renderOrder={-500}>
      <primitive object={material} attach="material" />
    </mesh>
  )
}
