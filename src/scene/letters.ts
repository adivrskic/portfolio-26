import * as THREE from 'three'

/**
 * The name pressed into the cube, row by row (top to bottom) as it reads on each face of the
 * 3×3×3 cube: a letter on every block. A space would leave that block blank.
 */
export const NAME_ROWS = ['adi', 'vrs', 'kic']

const GLYPHS = [...new Set(NAME_ROWS.join('').replace(/ /g, ''))]
/** 0 = blank block, 1.. = glyph cell in the atlas */
export const glyphIndex = (ch: string) => (ch === ' ' ? 0 : GLYPHS.indexOf(ch) + 1)

export const ATLAS_COLS = 4
export const ATLAS_ROWS = Math.ceil(GLYPHS.length / ATLAS_COLS)
const CELL = 256
const FONT_SIZE = CELL * 0.74
const WEIGHT = 900

/**
 * Height-map atlas for the impressed letters: 1 = block surface, 0 = floor of the letter, with a
 * soft slope between them that the shader turns into a bevelled wall.
 */
export function createLetterAtlas() {
  const W = CELL * ATLAS_COLS
  const H = CELL * ATLAS_ROWS
  const data = new Uint8Array(W * H).fill(255)
  const texture = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.UnsignedByteType)
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.unpackAlignment = 1
  texture.anisotropy = 4

  const draw = (family: string) => {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#000'
    ctx.font = `${WEIGHT} ${FONT_SIZE}px ${family}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    // one shared baseline so the name reads as words across blocks; the ascender block is centred
    const ascent = ctx.measureText('dk').actualBoundingBoxAscent || FONT_SIZE * 0.72
    const baseline = CELL / 2 + ascent / 2
    GLYPHS.forEach((g, i) => {
      ctx.fillText(g, (i % ATLAS_COLS) * CELL + CELL / 2, Math.floor(i / ATLAS_COLS) * CELL + baseline)
    })

    const px = ctx.getImageData(0, 0, W, H).data
    const h = new Float32Array(W * H)
    for (let i = 0; i < h.length; i++) h[i] = px[i * 4] / 255
    // two box passes ≈ a gaussian: the slope of the letter walls
    boxBlur(h, W, H, 3)
    boxBlur(h, W, H, 3)
    // texture v = 1 is the top of the canvas
    for (let y = 0; y < H; y++) {
      const src = y * W
      const dst = (H - 1 - y) * W
      for (let x = 0; x < W; x++) data[dst + x] = Math.round(h[src + x] * 255)
    }
    texture.needsUpdate = true
  }

  draw('ui-sans-serif, system-ui, sans-serif')
  document.fonts
    ?.load(`${WEIGHT} ${FONT_SIZE}px "Geist Variable"`)
    .then(() => draw('"Geist Variable", ui-sans-serif, system-ui, sans-serif'))
    .catch(() => {})

  return texture
}

/** separable running-sum box blur, in place */
function boxBlur(a: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(a.length)
  const inv = 1 / (2 * r + 1)
  const cx = (x: number) => (x < 0 ? 0 : x >= w ? w - 1 : x)
  const cy = (y: number) => (y < 0 ? 0 : y >= h ? h - 1 : y)
  for (let y = 0; y < h; y++) {
    const row = y * w
    let acc = 0
    for (let x = -r; x <= r; x++) acc += a[row + cx(x)]
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc * inv
      acc += a[row + cx(x + r + 1)] - a[row + cx(x - r)]
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0
    for (let y = -r; y <= r; y++) acc += tmp[cy(y) * w + x]
    for (let y = 0; y < h; y++) {
      a[y * w + x] = acc * inv
      acc += tmp[cy(y + r + 1) * w + x] - tmp[cy(y - r) * w + x]
    }
  }
}
