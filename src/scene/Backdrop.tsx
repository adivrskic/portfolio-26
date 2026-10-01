import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { bus } from '../state/store'
import { glowColor } from './palette'

/**
 * The page background, drawn in WebGL so the glass cube has something opaque to refract:
 * the page colour plus the soft light the cube's core casts around it.
 */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec2 uView;
  uniform vec3 uBg;
  uniform vec4 uGlow;
  uniform vec3 uGlowColor;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uView;
    vec2 gd = (p - uGlow.xy) / max(uGlow.z, 1.0);
    vec3 col = mix(uBg, uGlowColor, exp(-dot(gd, gd) * 1.6) * uGlow.w);
    // a hair of noise so the soft gradient never bands
    col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

export const BREAKPOINT = 860

export function Backdrop() {
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)

  // we own the material: handing R3F a uniforms prop gives the material its own copies,
  // so values reassigned later would never reach the GPU
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uView: { value: new THREE.Vector2() },
          uBg: { value: new THREE.Color('#f3f3f1') },
          uGlow: { value: new THREE.Vector4() },
          uGlowColor: { value: new THREE.Color().copy(glowColor.current) },
        },
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const u = material.uniforms
    const c = bus.view
    u.uView.value.set(width, height)
    u.uGlowColor.value.lerp(glowColor.current, 1 - Math.exp(-dt * 4))
    u.uGlow.value.set(c.x, c.y, c.size * 1.05, c.ready ? 0.07 : 0)
  }, -1)

  return (
    <mesh frustumCulled={false} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
