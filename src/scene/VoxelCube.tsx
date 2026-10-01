import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { config, useTuning } from '../config'
import { bus, useUI } from '../state/store'
import { depth, lean, turnAngle } from './flight'
import { ATLAS_COLS, ATLAS_ROWS, createLetterAtlas, glyphIndex, NAME_ROWS } from './letters'
import { CUBE_DEPTH } from './Equalizer'
import { glowColor } from './palette'

const N = 3
const HALF = (N - 1) / 2
/** 3 blocks of this make the same size of cube the camera rig expects */
const PITCH = 2 / 3
/** projected size of the cube (world units, before scaling) relative to its anchor */
const SILHOUETTE = 3.25
const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]
const QUARTER = Math.PI / 2
const TAU = Math.PI * 2
/** parted, the blocks turn on their own; turned, a block is wider, so they sit at least this far apart
 *  (a share of their spacing) and this much smaller, and never touch */
const ROOM = 1.3
const SHRINK = 0.12
/** a reply starting (or a click) while the cube is parted flicks each block round this hard (rad/s) */
const KICK = 5
/** the core's glow while the cube is open (times config.cube.coreGlow): the light at the centre (scaled
 *  with the cube, so it looks the same at any size), the haze around the orb (its width in the cube's
 *  units, and how strong it gets) */
const CORE_LIGHT = 2.2
const HAZE_SIZE = 1.9
const HAZE_OPACITY = 0.5
const WHITE = new THREE.Color(1, 1, 1)

/** a soft round falloff, for the haze around the core */
function hazeTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
/* resting pose, sway, the blocks' shape and material, the lights, the loading puzzle and the intro
   turn are settings: see src/config.ts */
/** after the cube first appears, so its first turn of the loading puzzle is seen */
const SOLVE_DELAY = 0.35
const hsl = { h: 0, s: 0, l: 0 }

type Voxel = {
  /** where the block sits in the solved cube, in grid units (-1..1); its letters are laid out for it */
  pos: THREE.Vector3
  /** where it sits now (the loading puzzle moves blocks around) and how it is turned: an exact rotation
   *  matrix (row-major) made of quarter turns, and the same as a quaternion for drawing */
  cur: THREE.Vector3
  rot: number[]
  turned: THREE.Quaternion
  dir: THREE.Vector3
  phase: number
  pop: number
  /** its own turn while the cube is parted (angle, speed), when it joins in, and a flick on its way */
  whirl: { x: number; v: number }
  wait: number
  kickAt: number
}

type Twist = { axis: number; layer: number; dir: number; angle: number; vel: number }
/** a quarter turn of one layer, like a Rubik's cube move (dir ±1) */
type Move = { axis: number; layer: number; dir: number }

function buildVoxels(): Voxel[] {
  const out: Voxel[] = []
  for (let x = 0; x < N; x++)
    for (let y = 0; y < N; y++)
      for (let z = 0; z < N; z++) {
        const pos = new THREE.Vector3(x - HALF, y - HALF, z - HALF)
        const shell = Math.abs(pos.x) === HALF || Math.abs(pos.y) === HALF || Math.abs(pos.z) === HALF
        if (!shell) continue
        out.push({
          pos,
          cur: pos.clone(),
          rot: [1, 0, 0, 0, 1, 0, 0, 0, 1],
          turned: new THREE.Quaternion(),
          dir: pos.clone().normalize().addScaledVector(new THREE.Vector3().randomDirection(), 0.35).normalize(),
          phase: Math.random() * Math.PI * 2,
          pop: 0,
          whirl: { x: 0, v: 0 },
          // the top layer first, then the middle, then the bottom (a little out of step within each)
          wait: (HALF - pos.y) * 0.16 + Math.random() * 0.1,
          kickAt: 0,
        })
      }
  return out
}

/** a quarter turn about an axis, as an exact rotation matrix (row-major) */
function quarter(axis: number, dir: number) {
  if (axis === 0) return [1, 0, 0, 0, 0, -dir, 0, dir, 0]
  if (axis === 1) return [0, 0, dir, 0, 1, 0, -dir, 0, 0]
  return [0, -dir, 0, dir, 0, 0, 0, 0, 1]
}

function mul3(a: number[], b: number[]) {
  const out = new Array<number>(9)
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]
  return out
}

const m4 = new THREE.Matrix4()
/** turn one layer of blocks a quarter turn, for good: they move to new places and turn with it */
function applyMove(voxels: Voxel[], mv: Move) {
  const R = quarter(mv.axis, mv.dir)
  for (const v of voxels) {
    if (Math.round(v.cur.getComponent(mv.axis)) !== mv.layer) continue
    const { x, y, z } = v.cur
    v.cur.set(R[0] * x + R[1] * y + R[2] * z, R[3] * x + R[4] * y + R[5] * z, R[6] * x + R[7] * y + R[8] * z)
    v.rot = mul3(R, v.rot)
    const r = v.rot
    m4.set(r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0, 0, 0, 0, 1)
    v.turned.setFromRotationMatrix(m4)
  }
}

/** n random quarter turns: never the same layer twice in a row, mostly the outer layers */
function scramble(n: number) {
  const moves: Move[] = []
  while (moves.length < n) {
    const axis = (Math.random() * 3) | 0
    const layer = Math.random() < 0.2 ? 0 : Math.random() < 0.5 ? -1 : 1
    const last = moves[moves.length - 1]
    if (last && last.axis === axis && last.layer === layer) continue
    moves.push({ axis, layer, dir: Math.random() < 0.5 ? 1 : -1 })
  }
  return moves
}

/**
 * The blocks and the loading puzzle: they start a number of random quarter turns away from solved, and
 * `solve` is the way back (the same turns undone, last first). Pure, so it is safe to build twice.
 */
function buildPuzzle(turns: number) {
  const voxels = buildVoxels()
  const moves = scramble(turns)
  for (const mv of moves) applyMove(voxels, mv)
  const solve = moves.reverse().map((mv) => ({ ...mv, dir: -mv.dir }))
  return { voxels, solve }
}

/** a block's place in the cube seen from its own (turned) frame, i.e. which of its sides have neighbours */
function localGrid(v: Voxel, out: Float32Array, i: number) {
  const r = v.rot
  const { x, y, z } = v.cur
  out[i] = r[0] * x + r[3] * y + r[6] * z
  out[i + 1] = r[1] * x + r[4] * y + r[7] * z
  out[i + 2] = r[2] * x + r[5] * y + r[8] * z
}

/** every face of the cube: outward normal, plus the right/up directions a reader of that face sees */
const FACES = [
  { n: [1, 0, 0], r: [0, 0, -1], u: [0, 1, 0], positive: true, axis: 0 },
  { n: [-1, 0, 0], r: [0, 0, 1], u: [0, 1, 0], positive: false, axis: 0 },
  { n: [0, 1, 0], r: [1, 0, 0], u: [0, 0, -1], positive: true, axis: 1 },
  { n: [0, -1, 0], r: [1, 0, 0], u: [0, 0, 1], positive: false, axis: 1 },
  { n: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], positive: true, axis: 2 },
  { n: [0, 0, -1], r: [-1, 0, 0], u: [0, 1, 0], positive: false, axis: 2 },
] as const

/**
 * Per-block attributes: which glyph each block shows on each of its six sides (+x +y +z / -x -y -z),
 * so every face of the cube spells the name, and its grid position (for the groove shading). The shader
 * maps fragments to the same right/up directions (see blockFace).
 */
function blockAttributes(voxels: Voxel[]) {
  const pos = new Float32Array(voxels.length * 3)
  const neg = new Float32Array(voxels.length * 3)
  const grid = new Float32Array(voxels.length * 3)
  const dot = (v: THREE.Vector3, a: readonly number[]) => v.x * a[0] + v.y * a[1] + v.z * a[2]
  voxels.forEach((v, i) => {
    localGrid(v, grid, i * 3)
    for (const f of FACES) {
      if (dot(v.pos, f.n) !== HALF) continue
      const col = Math.round(dot(v.pos, f.r) + HALF)
      const row = Math.round(HALF - dot(v.pos, f.u))
      ;(f.positive ? pos : neg)[i * 3 + f.axis] = glyphIndex(NAME_ROWS[row]?.[col] ?? ' ')
    }
  })
  return { pos, neg, grid }
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** the slice that turns between gallery positions i and i + 1 (stable, so scrolling back reverses it) */
function sliceFor(i: number) {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  // (unsigned again: a bare ^ gives a signed number, and a negative h % 3 is no axis)
  h = (h ^ (h >>> 16)) >>> 0
  return { axis: h % 3, layer: ((h >>> 2) % N) - HALF, dir: (h >>> 5) & 1 ? 1 : -1 }
}

/** under-damped spring step (semi-implicit Euler) */
function spring(s: { x: number; v: number }, target: number, k: number, c: number, dt: number) {
  s.v += ((target - s.x) * k - s.v * c) * dt
  s.x += s.v * dt
}

const vertexPars = /* glsl */ `#include <common>
  attribute vec3 aLetterP;
  attribute vec3 aLetterN;
  attribute vec3 aGrid;
  varying vec3 vBlockPos;
  varying vec3 vBlockNormal;
  varying vec3 vLetterP;
  varying vec3 vLetterN;
  varying vec3 vGrid;`

const vertexMain = /* glsl */ `#include <begin_vertex>
  vBlockPos = position;
  vBlockNormal = normal;
  vLetterP = aLetterP;
  vLetterN = aLetterN;
  vGrid = aGrid;`

const fragmentPars = /* glsl */ `#include <common>
  varying vec3 vBlockPos;
  varying vec3 vBlockNormal;
  varying vec3 vLetterP;
  varying vec3 vLetterN;
  varying vec3 vGrid;
  uniform sampler2D uLetters;
  uniform vec2 uAtlas;
  uniform float uVox;
  uniform float uLetterDepth;
  uniform float uRelief;
  uniform float uOpen;
  uniform float uHalf;
  uniform float uGroove;

  // the block side this fragment sits on: its glyph, the coordinates across it as a reader sees them,
  // and that side's right/up directions (block-local)
  float blockFace(vec3 n, vec3 p, out vec2 uv, out vec3 r, out vec3 u) {
    vec3 a = abs(n);
    if (a.x >= a.y && a.x >= a.z) {
      u = vec3(0.0, 1.0, 0.0);
      if (n.x > 0.0) { r = vec3(0.0, 0.0, -1.0); uv = vec2(-p.z, p.y); return vLetterP.x; }
      r = vec3(0.0, 0.0, 1.0); uv = vec2(p.z, p.y); return vLetterN.x;
    }
    if (a.y >= a.z) {
      r = vec3(1.0, 0.0, 0.0);
      if (n.y > 0.0) { u = vec3(0.0, 0.0, -1.0); uv = vec2(p.x, -p.z); return vLetterP.y; }
      u = vec3(0.0, 0.0, 1.0); uv = vec2(p.x, p.z); return vLetterN.y;
    }
    u = vec3(0.0, 1.0, 0.0);
    if (n.z > 0.0) { r = vec3(1.0, 0.0, 0.0); uv = vec2(p.x, p.y); return vLetterP.z; }
    r = vec3(-1.0, 0.0, 0.0); uv = vec2(-p.x, p.y); return vLetterN.z;
  }`

// after the normal is set up: sample the letter height map, bevel the normal along its walls, and work
// out how deep this point sits in a groove between blocks
const fragmentNormal = /* glsl */ `#include <normal_fragment_maps>
  vec2 faceUv;
  vec3 faceR;
  vec3 faceU;
  float glyph = floor(blockFace(vBlockNormal, vBlockPos, faceUv, faceR, faceU) + 0.5);
  vec2 fuv = clamp(faceUv / uVox + 0.5, 0.0, 1.0);
  float cellIdx = max(glyph - 1.0, 0.0);
  vec2 cell = vec2(mod(cellIdx, uAtlas.x), floor(cellIdx / uAtlas.x));
  vec2 auv = vec2((cell.x + fuv.x) / uAtlas.x, 1.0 - (cell.y + 1.0 - fuv.y) / uAtlas.y);
  // derivatives stay in uniform control flow
  vec2 dSTdx = dFdx(auv);
  vec2 dSTdy = dFdy(auv);
  float hC = texture2D(uLetters, auv).r;
  float hX = texture2D(uLetters, auv + dSTdx).r;
  float hY = texture2D(uLetters, auv + dSTdy).r;
  vec3 absN = abs(vBlockNormal);
  float faceFlat = smoothstep(0.93, 0.995, max(absN.x, max(absN.y, absN.z)));
  float hasGlyph = step(0.5, glyph) * faceFlat;
  float imprint = (1.0 - hC) * hasGlyph;
  // derivative bump mapping (as three's perturbNormalArb), so the bevel holds at any size on screen
  vec3 baseNormal = normal;
  vec2 dHdxy = vec2(hX - hC, hY - hC) * uLetterDepth * hasGlyph;
  vec3 sigmaX = normalize(dFdx(-vViewPosition));
  vec3 sigmaY = normalize(dFdy(-vViewPosition));
  vec3 bR1 = cross(sigmaY, normal);
  vec3 bR2 = cross(normal, sigmaX);
  float bDet = dot(sigmaX, bR1) * faceDirection;
  vec3 bGrad = sign(bDet) * (dHdxy.x * bR1 + dHdxy.y * bR2);
  normal = normalize(abs(bDet) * normal - bGrad);
  vec3 bumpDelta = normal - baseNormal;
  // grooves: shade the edges of a block side only where they meet a neighbouring block, so the
  // joints read as carved while the cube's outer edges stay clean (fades as the blocks part)
  float gR = dot(vGrid, faceR);
  float gU = dot(vGrid, faceU);
  float inner = uHalf - 0.1;
  vec4 joint = vec4(step(-inner, gR), step(gR, inner), step(-inner, gU), step(gU, inner));
  vec4 near = 1.0 - smoothstep(0.0, 0.17, vec4(fuv.x, 1.0 - fuv.x, fuv.y, 1.0 - fuv.y));
  vec4 shade = 1.0 - joint * near * uGroove * (1.0 - uOpen);
  float groove = shade.x * shade.y * shade.z * shade.w;`

const fragmentClearcoat = /* glsl */ `#include <clearcoat_normal_fragment_maps>
  #ifdef USE_CLEARCOAT
    clearcoatNormal = normalize(mix(clearcoatNormal, normal, hasGlyph));
  #endif`

// plaster: the lighting does most of the work on the bevelled normals; a soft extra relief term, a
// crease along each cut and the groove shading keep the carving legible from any angle
const fragmentLight = /* glsl */ `#include <transmission_fragment>
  float relief = dot(bumpDelta, normalize(vec3(-0.5, 0.7, 0.5)));
  float crease = hasGlyph * clamp(hC * (1.0 - hC) * 4.0, 0.0, 1.0);
  totalDiffuse *= groove * clamp(1.0 + relief * uRelief, 0.65, 1.25) * (1.0 - crease * 0.28) * (1.0 - imprint * 0.1);
  totalSpecular *= groove;`

export function VoxelCube() {
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const puzzle = useMemo(() => buildPuzzle(reduced ? 0 : Math.max(0, Math.round(config.cube.scramble))), [reduced])
  // the blocks' shape is rebuilt when it is tuned
  useTuning((s) => s.rev)
  const vox = PITCH * (1 - config.cube.gap)
  const rounding = config.cube.rounding
  const voxels = puzzle.voxels
  const mesh = useRef<THREE.InstancedMesh>(null)
  const group = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)
  const floorFrame = useRef<THREE.Group>(null)
  const floor = useRef<THREE.Mesh>(null)
  const floorMat = useRef<THREE.ShadowMaterial>(null)
  const shade = useRef<THREE.DirectionalLight>(null)
  const coreMat = useRef<THREE.MeshBasicMaterial>(null)
  const coreLight = useRef<THREE.PointLight>(null)
  const haze = useRef<THREE.Sprite>(null)
  const hazeMat = useRef<THREE.SpriteMaterial>(null)
  const hazeMap = useMemo(hazeTexture, [])
  useEffect(() => () => hazeMap.dispose(), [hazeMap])
  const tintA = useRef<THREE.PointLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.HemisphereLight>(null)
  const tintB = useRef<THREE.PointLight>(null)

  const geometry = useMemo(() => {
    const g = new RoundedBoxGeometry(vox, vox, vox, 4, vox * Math.min(0.5, rounding))
    const { pos, neg, grid } = blockAttributes(voxels)
    g.setAttribute('aLetterP', new THREE.InstancedBufferAttribute(pos, 3))
    g.setAttribute('aLetterN', new THREE.InstancedBufferAttribute(neg, 3))
    g.setAttribute('aGrid', new THREE.InstancedBufferAttribute(grid, 3))
    return g
  }, [voxels, vox, rounding])
  const atlas = useMemo(createLetterAtlas, [])

  // shared with the shader (assigned into shader.uniforms, so mutating .value reaches the GPU)
  const fx = useMemo(
    () => ({
      uLetters: { value: atlas },
      uAtlas: { value: new THREE.Vector2(ATLAS_COLS, ATLAS_ROWS) },
      uVox: { value: PITCH },
      uLetterDepth: { value: 2.6 },
      uRelief: { value: 0.9 },
      uGroove: { value: 0.4 },
      uOpen: { value: 0 },
      uHalf: { value: HALF },
    }),
    [atlas],
  )

  // matte plaster, like a cast bust: warm white, rough, a soft velvety sheen at grazing angles and no
  // shine, with the letters pressed into every block face
  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: '#eee9e1',
      roughness: 0.88,
      metalness: 0,
      sheen: 0.5,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color('#ffffff'),
      specularIntensity: 0.35,
      envMapIntensity: 0.55,
    })
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, fx)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', vertexPars)
        .replace('#include <begin_vertex>', vertexMain)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', fragmentPars)
        .replace('#include <normal_fragment_maps>', fragmentNormal)
        .replace('#include <clearcoat_normal_fragment_maps>', fragmentClearcoat)
        .replace('#include <transmission_fragment>', fragmentLight)
    }
    return m
  }, [fx])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      atlas.dispose()
    },
    [geometry, material, atlas],
  )

  const sim = useRef({
    explode: { x: 0, v: 0 },
    /** its own spin (drag, flings, and the momentum it lands with), and how fast it is going */
    yawDrag: 0,
    yawVel: 0,
    landed: false,
    spinDir: -1,
    /** parted (and since when); how much room the blocks have to turn in (0..1); a flick to hand out */
    wasParted: false,
    partedAt: 0,
    room: 0,
    kick: false,
    tiltX: 0,
    tiltY: 0,
    pulse: 0,
    hovered: -1,
    dragging: false,
    dragX: 0,
    dragT: 0,
    dragMoved: 0,
    twist: null as Twist | null,
    queue: [] as Twist[],
    glow: new THREE.Color().copy(glowColor.current),
    glow2: new THREE.Color(),
    coupled: { axis: 0, layer: 0, dir: 1, angle: 0, vel: 0 } as Twist,
    color: '',
    puzzle: null as { voxels: Voxel[]; solve: Move[] } | null,
    solve: [] as Move[],
    move: null as (Move & { t0: number; angle: number }) | null,
    done: 0,
    total: 0,
    firstFrame: -1,
    nextMoveAt: 0,
  })
  // the way back to solved, for the puzzle this render keeps
  if (sim.current.puzzle !== puzzle) {
    const s = sim.current
    s.puzzle = puzzle
    s.solve = puzzle.solve.slice()
    s.total = puzzle.solve.length
    s.done = 0
    s.move = null
  }
  // until it is solved the loader keeps its ring short of full
  useLayoutEffect(() => {
    bus.solve = puzzle.solve.length ? 0 : 1
  }, [puzzle])

  // On the home page the gallery turns the cube directly (see the frame loop). Elsewhere (a cube click,
  // project-page navigation, the chat starting to answer) the store asks for a single full turn of a
  // slice; requests that arrive while one is under way are dropped. While the cube is parted its blocks
  // are each flicked round instead. A project change also gives the light a small pulse.
  useEffect(
    () =>
      useUI.subscribe((s, prev) => {
        const state = sim.current
        if (s.active !== prev.active) state.pulse = Math.max(state.pulse, 0.6)
        if (s.twist === prev.twist) return
        if (state.room > 0.5) {
          state.kick = true
          state.pulse = 1
          return
        }
        if (!state.twist && state.queue.length === 0) {
          state.queue.push({
            axis: (Math.random() * 3) | 0,
            layer: ((Math.random() * N) | 0) - HALF,
            dir: Math.random() < 0.5 ? -1 : 1,
            angle: 0,
            vel: 0,
          })
          state.pulse = 1
        }
      }),
    [],
  )

  // drag to spin (window listeners so the drag survives leaving the cube)
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = sim.current
      if (!s.dragging) return
      const dx = e.clientX - s.dragX
      const now = performance.now()
      const dtE = Math.max(8, now - s.dragT) / 1000
      s.dragX = e.clientX
      s.dragT = now
      s.dragMoved += Math.abs(dx)
      s.yawDrag += dx * 0.009
      s.yawVel = THREE.MathUtils.lerp(s.yawVel, (dx * 0.009) / dtE, 0.6)
    }
    const up = () => {
      const s = sim.current
      if (!s.dragging) return
      s.dragging = false
      // flung: it keeps spinning that way, settling back to its slow spin
      s.spinDir = Math.sign(s.yawVel) || s.spinDir
      document.documentElement.removeAttribute('data-cube-drag')
      // a click (not a spin): a slice turns, and the cube's chat opens (or closes)
      if (s.dragMoved < 4) {
        const ui = useUI.getState()
        ui.requestTwist()
        ui.askChat()
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  const blocked = (e: ThreeEvent<PointerEvent>) => {
    const target = e.nativeEvent.target as HTMLElement | null
    return !!target?.closest?.('a, button, input, textarea, [data-block-scene]')
  }

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (blocked(e) || !useUI.getState().ready) return
    e.stopPropagation()
    sim.current.hovered = e.instanceId ?? -1
    document.documentElement.setAttribute('data-cube-hover', '')
  }
  const onOut = () => {
    sim.current.hovered = -1
    document.documentElement.removeAttribute('data-cube-hover')
  }
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (blocked(e) || e.nativeEvent.button !== 0 || !useUI.getState().ready) return
    e.stopPropagation()
    const s = sim.current
    s.dragging = true
    s.dragX = e.nativeEvent.clientX
    s.dragT = performance.now()
    s.dragMoved = 0
    s.yawVel = 0
    document.documentElement.setAttribute('data-cube-drag', '')
  }

  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      p: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      q2: new THREE.Quaternion(),
      s: new THREE.Vector3(),
    }),
    [],
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const t = state.clock.elapsedTime
    const s = sim.current
    const m = mesh.current
    const g = group.current
    if (!m || !g || !bus.cube.ready) return
    const { panel, ready, view, infoMode } = useUI.getState()

    // ---- size: the in-flight size from the camera rig (it eases between anchors)
    const cam = state.camera as THREE.PerspectiveCamera
    const visibleH = 2 * cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
    const cfg = config.cube
    const scale = ((bus.view.size * visibleH) / state.size.height / SILHOUETTE) * cfg.size
    g.scale.setScalar(scale)
    // also on the layer the equalizer's pass reads the cube's depth from (see Equalizer)
    m.layers.enable(CUBE_DEPTH)

    // ---- the shadow, on a floor a little below the cube, tilted with its resting pose (so the floor
    // is seen from a little above, like a product shot on a seamless backdrop); it follows the cube's
    // size through the intro and the layout
    if (floorFrame.current) floorFrame.current.rotation.x = cfg.pitch
    if (floor.current) floor.current.position.y = -scale * (1 + cfg.shadowDrop)
    if (floorMat.current) floorMat.current.opacity = cfg.shadow
    if (shade.current) shade.current.shadow.radius = cfg.shadowSoftness

    // ---- the blocks part a little while About/Contact is open (never inside the loader)
    // the tunable look, applied as it changes
    fx.uVox.value = vox
    fx.uLetterDepth.value = cfg.letterDepth
    fx.uRelief.value = cfg.letterRelief
    fx.uGroove.value = cfg.groove
    if (s.color !== cfg.color) material.color.set((s.color = cfg.color))
    material.roughness = cfg.roughness
    material.sheen = cfg.sheen
    if (key.current) key.current.intensity = cfg.keyLight
    if (fill.current) fill.current.intensity = cfg.fillLight
    const OPEN = Math.max(0.001, cfg.open)

    // (and while a project's case study is open, behind its text)
    const parted = ready && (!!panel || (view === 'project' && infoMode))
    if (parted && !s.wasParted) s.partedAt = t
    s.wasParted = parted

    // ---- parted, the cube itself stops turning and each block turns on its own instead, about the
    // cube's axis through its centre: they join in one after another (the top layer first) and settle
    // to an even pace. Closing, each one settles back square (to its nearest full turn) before the cube
    // closes up, so the name reads true again
    const pace = reduced ? 0 : cfg.partSpin * s.spinDir
    if (s.kick) {
      for (const v of voxels) v.kickAt = t + v.wait
      s.kick = false
    }
    let askew = 0
    for (const v of voxels) {
      const w = v.whirl
      if (parted) {
        if (v.kickAt && t >= v.kickAt) {
          w.v += KICK * Math.sign(pace)
          v.kickAt = 0
        }
        const join = smoothstep(0, 1.2, t - s.partedAt - v.wait)
        w.v += (pace * join - w.v) * (1 - Math.exp(-dt * 2))
        w.x = (w.x + w.v * dt) % TAU
      } else if (w.x || w.v) {
        v.kickAt = 0
        const square = Math.round(w.x / TAU) * TAU
        spring(w, square, 60, 15.5, dt)
        if (Math.abs(square - w.x) < 0.002 && Math.abs(w.v) < 0.02) w.x = w.v = 0
        else askew = Math.max(askew, Math.abs(square - w.x) + Math.abs(w.v) * 0.1)
      }
    }
    // turned blocks need room: the cube stays open until they are all square again
    s.room = THREE.MathUtils.damp(s.room, (parted && pace !== 0) || askew > 0.01 ? 1 : 0, 5, dt)
    spring(s.explode, parted || askew > 0.01 ? OPEN : 0, 40, 10.5, dt)
    const e = Math.max(0, s.explode.x)
    fx.uOpen.value = Math.min(1, e / OPEN)

    // ---- orientation. The cube is heavy: from its landing on it keeps turning on its own momentum,
    // easing down to a slow spin (a drag or a fling adds to it and settles back the same way), coming to
    // a stop while its blocks turn on their own; a slow sway around the resting pose; and a gentle,
    // unhurried lean towards the pointer
    const flightS = Math.max(0.2, cfg.flightSeconds)
    const settle = Math.max(0.1, cfg.momentum)
    const landSpeed = reduced ? 0 : cfg.spinLanding
    const idleSpeed = reduced ? 0 : cfg.spin
    if (!s.landed && bus.flight >= 1) {
      // the intro's turn hands its speed over and carries on the same way
      s.landed = true
      s.yawVel = -landSpeed
      s.spinDir = -1
    }
    if (s.landed && !s.dragging) {
      const still = s.room > 0.5
      const goal = still ? 0 : idleSpeed * s.spinDir
      // (it stops in under a second, and picks up again over a couple once the blocks are back)
      const tau = still ? 0.8 : Math.abs(s.yawVel) < Math.abs(goal) ? Math.min(settle, 2) : settle
      s.yawVel += (goal - s.yawVel) * (1 - Math.exp(-dt / tau))
      s.yawDrag += s.yawVel * dt
    }
    const p = bus.pointer
    const W = state.size.width
    const H = state.size.height
    const tx = p.active ? THREE.MathUtils.clamp((p.x - bus.view.x) / (W * 0.5), -1, 1) : 0
    const ty = p.active ? THREE.MathUtils.clamp((p.y - bus.view.y) / (H * 0.5), -1, 1) : 0
    s.tiltX = THREE.MathUtils.damp(s.tiltX, tx, 1.2, dt)
    s.tiltY = THREE.MathUtils.damp(s.tiltY, ty, 1.2, dt)
    const sway = reduced ? 0 : cfg.sway
    // the intro flight: one heavy turn (the front leads towards the spot) that lands still spinning, at
    // the speed and slowing the spin above carries on with; the top tips towards the viewer as it draws
    // back into the scene
    const total = Math.PI * 2 * cfg.flightTurns
    const turning = reduced
      ? 0
      : total -
        turnAngle(bus.flight, total, landSpeed * flightS, (-(landSpeed - idleSpeed) * flightS * flightS) / settle)
    // the pointer only pulls on it once it is landing (in flight the path is set)
    const leaning = (reduced ? 1 : lean(bus.flight)) * cfg.lean
    const nod = reduced ? 0 : depth(bus.flight) * 0.14
    g.rotation.set(
      cfg.pitch + Math.sin(t * 0.16 + 1.2) * 0.05 * sway + s.tiltY * 0.16 * leaning + nod,
      cfg.yaw +
        Math.sin(t * 0.21) * 0.3 * sway +
        s.yawDrag +
        s.tiltX * 0.3 * leaning +
        turning,
      0,
      'XYZ',
    )

    // ---- the loading puzzle: the blocks start scrambled and turn back to solved, a quarter turn at a
    // time, while the page loads (the loader's ring fills with it, and waits for it)
    if (s.total) {
      if (s.firstFrame < 0) s.firstFrame = t
      if (!s.move && s.solve.length && t - s.firstFrame > SOLVE_DELAY && t >= s.nextMoveAt) {
        s.move = { ...s.solve.shift()!, t0: t, angle: 0 }
      }
      let partial = 0
      if (s.move) {
        const k = Math.min(1, (t - s.move.t0) / Math.max(0.05, cfg.moveSeconds))
        // a crisp turn that settles softly, like a well-oiled cube
        partial = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
        s.move.angle = partial * QUARTER
        if (k >= 1) {
          applyMove(voxels, s.move)
          // the groove shading follows the blocks to their new neighbours
          const grid = geometry.getAttribute('aGrid') as THREE.InstancedBufferAttribute
          voxels.forEach((v, i) => localGrid(v, grid.array as Float32Array, i * 3))
          grid.needsUpdate = true
          s.move = null
          s.done++
          partial = 0
          s.nextMoveAt = t + cfg.movePause
        }
      }
      bus.solve = (s.done + partial) / s.total
    }

    // ---- slice spins. On the home page the gallery drives them: each step between two projects is
    // exactly one full turn of one slice, eased with the scroll, still at rest, reversed when scrolling
    // back. Requested spins (cube click, project pages) play on their own spring.
    const drum = bus.drum
    const drumStep = Number.isFinite(drum) ? Math.floor(drum) : 0
    const drumTurn = Number.isFinite(drum) && cfg.scrollSpin ? smoothstep(0.02, 0.98, drum - drumStep) : 0
    const drumMoving = drumTurn > 0 && drumTurn < 1
    // (requests made before the cube has landed wait for it, e.g. arriving straight on a project page)
    if (!s.twist && s.queue.length && e < 0.05 && !drumMoving && ready) s.twist = s.queue.shift()!
    let tw = s.twist
    if (tw) {
      const goal = Math.PI * 2
      // critically damped: exactly one time around, no wobble past it
      tw.vel += ((goal - tw.angle) * 40 - tw.vel * 12.6) * dt
      tw.angle += tw.vel * dt
      if (Math.abs(goal - tw.angle) < 0.003 && Math.abs(tw.vel) < 0.03) s.twist = null
    } else if (drumMoving) {
      tw = Object.assign(s.coupled, sliceFor(drumStep), { angle: drumTurn * Math.PI * 2 })
    }

    // ---- hover pop (the hovered block and its neighbours lift out a little)
    const hov = s.hovered >= 0 ? voxels[s.hovered] : null
    s.pulse = Math.max(0, s.pulse - dt * 1.6)
    const breathe = reduced ? 1 : 1 + Math.sin(t * 1.3) * 0.006

    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i]
      const near = hov ? Math.max(0, 1 - v.pos.distanceTo(hov.pos) / 1.25) : 0
      v.pop = THREE.MathUtils.damp(v.pop, near, 9, dt)

      // where the block is now (moved about while the puzzle is unsolved) and how it is turned
      tmp.p.copy(v.cur)
      tmp.q.copy(v.turned)
      const mv = s.move
      if (mv && Math.round(v.cur.getComponent(mv.axis)) === mv.layer) {
        tmp.q2.setFromAxisAngle(AXES[mv.axis], mv.angle * mv.dir)
        tmp.p.applyQuaternion(tmp.q2)
        tmp.q.premultiply(tmp.q2)
      }
      if (tw && Math.abs(v.pos.getComponent(tw.axis) - tw.layer) < 0.01) {
        tmp.q2.setFromAxisAngle(AXES[tw.axis], tw.angle * tw.dir)
        tmp.p.applyQuaternion(tmp.q2)
        tmp.q.premultiply(tmp.q2)
      }
      tmp.p.multiplyScalar(PITCH * breathe)
      // pop outwards along the block's direction from the centre
      tmp.p.addScaledVector(v.dir, v.pop * cfg.hoverPop)

      // an exploded view: the blocks drift apart a little and bob (with more room while they turn)
      tmp.p.multiplyScalar(Math.max(1 + e * 0.55, 1 + s.room * (ROOM - 1)))
      if (e > 0.001) {
        tmp.p.addScaledVector(v.dir, e * (0.35 + 0.08 * Math.sin(t * 0.7 + v.phase)))
        tmp.p.y += e * Math.sin(t * 0.9 + v.phase) * 0.06
      }
      // its own turn, about the cube's axis through its centre
      if (v.whirl.x) {
        tmp.q2.setFromAxisAngle(AXES[1], v.whirl.x)
        tmp.q.premultiply(tmp.q2)
      }
      tmp.s.setScalar(1 - s.room * SHRINK)
      tmp.m.compose(tmp.p, tmp.q, tmp.s)
      m.setMatrixAt(i, tmp.m)
    }
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()

    // ---- colour: two faint lights in the project's colour and a neighbouring hue orbit the cube, so a
    // slow gradient of tinted light drifts over the plaster
    s.glow.lerp(glowColor.current, 1 - Math.exp(-dt * 3))
    s.glow.getHSL(hsl)
    s.glow2.setHSL((hsl.h + 0.2) % 1, hsl.s, hsl.l)
    const orbit = reduced ? 0.6 : t * cfg.tintOrbit
    const r = 3.4 * scale
    const glow = cfg.tintLight + s.pulse * 1.6
    if (tintA.current) {
      tintA.current.color.copy(s.glow)
      tintA.current.intensity = glow
      tintA.current.position.set(Math.cos(orbit) * r, (0.6 + Math.sin(orbit * 0.7) * 0.9) * scale, Math.sin(orbit) * r)
    }
    if (tintB.current) {
      tintB.current.color.copy(s.glow2)
      tintB.current.intensity = glow
      tintB.current.position.set(
        Math.cos(orbit + Math.PI) * r,
        (-0.4 + Math.cos(orbit * 0.6) * 0.9) * scale,
        Math.sin(orbit + Math.PI) * r,
      )
    }
    // the core, seen through the gaps when the blocks part: while the cube is open it glows in the
    // project's colour, lighting the blocks' inner faces and with a soft haze around it (a reply
    // starting, or a project change, brightens it for a moment); closed, it is dark
    const lit = fx.uOpen.value * cfg.coreGlow * (1 + s.pulse * 0.6)
    if (coreMat.current) coreMat.current.color.copy(s.glow).lerp(WHITE, 0.3).multiplyScalar(0.55 + 0.6 * Math.min(1, lit))
    if (core.current) core.current.scale.setScalar(1 + Math.sin(t * 1.7) * 0.03 + s.pulse * 0.04)
    if (coreLight.current) {
      coreLight.current.color.copy(s.glow)
      // (always there, only its strength changes: adding and removing a light recompiles the materials)
      coreLight.current.intensity = lit * CORE_LIGHT * scale * scale
      coreLight.current.distance = 4 * scale
    }
    if (haze.current && hazeMat.current) {
      hazeMat.current.color.copy(s.glow)
      hazeMat.current.opacity = Math.min(1, lit) * HAZE_OPACITY * (0.92 + Math.sin(t * 1.7) * 0.08)
      haze.current.visible = hazeMat.current.opacity > 0.002
    }
  }, -1)

  return (
    <>
      {/* studio light for a cast: a warm key from the upper left and a soft fill (world space, so the
          shading stays put as the cube turns) */}
      <directionalLight ref={key} position={[-3.5, 5.5, 4.5]} intensity={2.1} color="#fff6ec" />
      <hemisphereLight ref={fill} args={['#ffffff', '#cdc6bb', 0.75]} />
      <pointLight ref={tintA} distance={0} decay={1.4} intensity={0} />
      <pointLight ref={tintB} distance={0} decay={1.4} intensity={0} />
      <group ref={group}>
        <instancedMesh
          ref={mesh}
          args={[geometry, material, voxels.length]}
          castShadow
          frustumCulled={false}
          onPointerMove={onMove}
          onPointerOut={onOut}
          onPointerDown={onDown}
        />
        <mesh ref={core}>
          <icosahedronGeometry args={[0.3, 5]} />
          <meshBasicMaterial ref={coreMat} toneMapped={false} />
        </mesh>
        {/* the core's glow (see the frame loop): a light at the centre, and a haze around the orb */}
        <pointLight ref={coreLight} intensity={0} decay={2} />
        <sprite ref={haze} scale={HAZE_SIZE} visible={false}>
          <spriteMaterial ref={hazeMat} map={hazeMap} transparent depthWrite={false} toneMapped={false} opacity={0} />
        </sprite>
      </group>
      {/* an invisible floor that only shows the cube's shadow, cast by a light of its own from nearly
          overhead and a little behind, so it pools forwards where it can be seen (it lights nothing: the cube's look stays the key light's); a small shadow map, so the
          blur spreads wide and soft */}
      <group ref={floorFrame}>
        <directionalLight
          ref={shade}
          position={[-1.6, 9, -2.6]}
          intensity={0}
          castShadow
          shadow-mapSize={[256, 256]}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={4}
          shadow-camera-bottom={-4}
          shadow-camera-near={1}
          shadow-camera-far={24}
          shadow-blurSamples={24}
          shadow-bias={-0.0002}
        />
        <mesh ref={floor} rotation-x={-Math.PI / 2} receiveShadow renderOrder={-400}>
          <planeGeometry args={[6.5, 6.5]} />
          <shadowMaterial ref={floorMat} transparent depthWrite={false} color="#2a241e" opacity={0.22} />
        </mesh>
      </group>
    </>
  )
}
