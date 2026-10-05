import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { EffectComposer } from '@react-three/postprocessing'
import { BloomEffect } from 'postprocessing'
import * as THREE from 'three'
import { reportLoad } from '../state/loading'
import { bus, markLayoutDirty, useUI } from '../state/store'
import { Backdrop, BREAKPOINT } from './Backdrop'
import { Equalizer } from './Equalizer'
import { config } from '../config'
import { VoxelCube } from './VoxelCube'
import { TiltShiftEffect } from './TiltShiftEffect'

/** Reads DOM anchors into the bus, but only while something might be moving. */
function LayoutSync() {
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  useEffect(() => markLayoutDirty(90), [width, height])
  useEffect(() => {
    document.fonts?.ready.then(() => markLayoutDirty(30))
  }, [])

  useFrame(() => {
    if (bus.dirty <= 0) return
    bus.dirty--
    const anchor = document.querySelector<HTMLElement>('[data-cube-anchor]')
    if (anchor) {
      const r = anchor.getBoundingClientRect()
      if (r.width > 0) {
        bus.cube.x = r.left + r.width / 2
        bus.cube.y = r.top + r.height / 2
        bus.cube.size = Math.min(r.width, r.height)
        bus.cube.ready = true
      }
    }
  }, -2)
  return null
}

function PointerTracker() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      bus.pointer.x = e.clientX
      bus.pointer.y = e.clientY
      bus.pointer.active = true
    }
    const leave = () => {
      bus.pointer.active = false
    }
    const up = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') bus.pointer.active = false
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', move, { passive: true })
    window.addEventListener('pointerup', up, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    window.addEventListener('blur', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', move)
      window.removeEventListener('pointerup', up)
      document.documentElement.removeEventListener('pointerleave', leave)
      window.removeEventListener('blur', leave)
    }
  }, [])
  return null
}

/**
 * Moves the cube to its anchor: shifts the projection centre there (no perspective skew, unlike moving
 * the cube) and eases its size, on a critically damped spring, so it glides without overshooting. It
 * starts there (the cube fades in where it rests). Publishes the spot as drawn, so the tilt-shift focus
 * and the glow travel with it.
 */
function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const vel = useRef({ x: 0, y: 0, size: 0 })
  useEffect(() => () => camera.clearViewOffset(), [camera])
  useFrame((state, delta) => {
    const c = bus.cube
    if (!c.ready) return
    const v = bus.view
    if (!v.ready) {
      v.x = c.x
      v.y = c.y
      v.size = c.size
      v.ready = true
    }
    const dt = Math.min(delta, 1 / 30)
    const sv = vel.current
    const w = 4.6
    for (const key of ['x', 'y', 'size'] as const) {
      sv[key] += ((c[key] - v[key]) * w * w - sv[key] * 2 * w) * dt
      v[key] += sv[key] * dt
    }
    const { width: W, height: H } = state.size
    camera.setViewOffset(W, H, W / 2 - v.x, H / 2 - v.y, W, H)
  }, -1)
  return null
}

/** fades the canvas in once a few frames have rendered (shaders compiled, environment baked) */
function FirstFrames({ onReady }: { onReady: () => void }) {
  const count = useRef(0)
  useFrame(() => {
    if (count.current < 0) return
    if (++count.current >= 4) {
      count.current = -1
      onReady()
    }
  })
  return null
}

/** only what is brighter than white blooms: the cube's glowing core while it is open (see coreHeat) */
const BLOOM_THRESHOLD = 1.05

function Effects() {
  const tilt = useMemo(() => new TiltShiftEffect(), [])
  useEffect(() => () => tilt.dispose(), [tilt])
  const bloom = useMemo(
    () => new BloomEffect({ mipmapBlur: true, luminanceThreshold: BLOOM_THRESHOLD, luminanceSmoothing: 0.3, intensity: 1, radius: 0.72 }),
    [],
  )
  useEffect(() => () => bloom.dispose(), [bloom])
  // a project's case study is open: the whole cube goes soft behind it
  const veil = useRef(0)
  useFrame((state, delta) => {
    const ui = useUI.getState()
    const reading = ui.ready && ui.view === 'project' && ui.infoMode
    veil.current = THREE.MathUtils.damp(veil.current, reading ? 1 : 0, reading ? 3.2 : 4.5, Math.min(delta, 1 / 30))
    const { width: W, height: H } = state.size
    const c = bus.view
    if (!c.ready) return
    const desktop = W >= BREAKPOINT
    const focus = 1 - c.y / H
    const band = (c.size * 0.1) / H
    const ramp = (c.size * 0.8) / H
    const region: [number, number, number, number] = desktop
      ? [(c.x - c.size * 1.2) / W, -1, (c.x + c.size * 1.2) / W, 2]
      : [-1, 1 - (c.y + c.size * 1.1) / H, 2, 2]
    const soft: [number, number] = desktop ? [0.06, 0.05] : [0.05, 0.035]
    const v = veil.current
    const blur = THREE.MathUtils.lerp(config.cube.tiltShift, config.cube.infoBlur, v)
    tilt.set(focus, band, ramp, blur * state.viewport.dpr, region, soft, v)
    bloom.intensity = config.cube.coreBloom
    bloom.mipmapBlurPass.radius = config.cube.coreBloomRadius
  })
  // the bloom after the lens (which draws its blur from the frame as rendered, so it would drop a glow
  // added before it)
  return (
    <EffectComposer multisampling={4}>
      <primitive object={tilt} />
      <primitive object={bloom} />
    </EffectComposer>
  )
}

function Studio() {
  // procedural light box for the glass reflections (no HDR download)
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#8d8d8a']} />
      <Lightformer form="rect" intensity={4} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[12, 3, 1]} />
      <Lightformer form="rect" intensity={2.2} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[2.5, 9, 1]} />
      <Lightformer form="rect" intensity={2.2} position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={[2.5, 9, 1]} />
      <Lightformer form="ring" intensity={1.4} position={[2.5, 2, 8]} scale={3.5} />
      <Lightformer form="rect" intensity={0.6} position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
    </Environment>
  )
}

/** three needs WebGL 2; without it the page goes on without the cube */
function hasWebGL() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!gl
  } catch {
    return false
  }
}

export default function Scene() {
  const [root] = useState(() => document.getElementById('root')!)
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, 1.6))
  const [visible, setVisible] = useState(false)
  const [webgl] = useState(hasWebGL)
  useEffect(() => {
    if (!webgl) {
      reportLoad('scene', 1)
    }
  }, [webgl])
  if (!webgl) return null
  return (
    <div className={visible ? 'scene is-visible' : 'scene'} aria-hidden="true">
      <Canvas
        eventSource={root}
        eventPrefix="client"
        dpr={dpr}
        flat
        // soft shadow maps, for the cube's shadow (variance maps blur nicely)
        shadows="variance"
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ fov: 24, position: [0, 0, 16], near: 0.1, far: 60 }}
        fallback={<div className="scene-fallback" />}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(window.devicePixelRatio, 1.6))} />
        <LayoutSync />
        <PointerTracker />
        <CameraRig />
        <Backdrop />
        <Equalizer />
        <Studio />
        <VoxelCube />
        <Effects />
        <FirstFrames
          onReady={() => {
            setVisible(true)
            reportLoad('scene', 1)
          }}
        />
      </Canvas>
    </div>
  )
}
