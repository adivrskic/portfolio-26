// Generates cover art for projects that have no screenshots (currently: Keyfall).
// A falling-notes piano roll drawn with the site's pixel blocks. Deterministic (seeded).
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const INK = '#0f1226'
const PALETTE = { blue: '#3557ff', yellow: '#ffc22e', red: '#ff4d23', neon: '#d6ff3c', ink: '#232a55' }

function rng(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const isBlack = (midi) => [1, 3, 6, 8, 10].includes(midi % 12)

function pianoRoll({ W, H, seed, cell = 10, gap = 2, keyH = 150, density = 1 }) {
  const rand = rng(seed)
  const lowest = 21
  const highest = 108
  const whites = []
  for (let m = lowest; m <= highest; m++) if (!isBlack(m)) whites.push(m)
  const kw = W / whites.length
  const keyX = new Map()
  whites.forEach((m, i) => keyX.set(m, { x: i * kw, w: kw, black: false }))
  for (let m = lowest; m <= highest; m++) {
    if (!isBlack(m)) continue
    const left = keyX.get(m - 1)
    keyX.set(m, { x: left.x + kw * 0.66, w: kw * 0.62, black: true })
  }

  const hitY = H - keyH
  let s = ''
  // grid
  for (let x = 0; x < W; x += cell) s += `<rect x="${x}" y="0" width="1" height="${hitY}" fill="#1a1f3d"/>`
  for (let y = 0; y < hitY; y += cell) s += `<rect x="0" y="${y}" width="${W}" height="1" fill="#1a1f3d"/>`

  // notes: a left-hand bass line and a right-hand melody, quantised to the cell grid
  const lit = new Map()
  const notes = []
  const melody = [72, 74, 76, 79, 77, 76, 74, 72, 71, 72, 76, 79, 81, 79, 77, 76]
  const bass = [48, 43, 45, 41]
  let y = hitY
  for (let i = 0; y > -200; i++) {
    const len = (2 + Math.floor(rand() * 4)) * cell * 2
    const pitch = melody[i % melody.length] + (rand() < 0.2 ? 12 : 0)
    notes.push({ pitch, y0: y - len, len, hand: 'r' })
    if (rand() < 0.55 * density) notes.push({ pitch: pitch - (rand() < 0.5 ? 3 : 4), y0: y - len, len, hand: 'r2' })
    if (i % 2 === 0) {
      const b = bass[(i / 2) % bass.length]
      notes.push({ pitch: b, y0: y - len * 2, len: len * 2 - cell, hand: 'l' })
      if (rand() < 0.7) notes.push({ pitch: b + 7, y0: y - len * 2 + cell * 2, len: len * 2 - cell * 3, hand: 'l2' })
    }
    y -= len + cell * (rand() < 0.3 ? 2 : 0)
  }

  const colorFor = (n) =>
    n.hand === 'r' ? (n.pitch > 80 ? PALETTE.neon : PALETTE.yellow) : n.hand === 'r2' ? PALETTE.red : n.hand === 'l' ? PALETTE.blue : PALETTE.ink

  for (const n of notes) {
    const k = keyX.get(n.pitch)
    if (!k) continue
    const color = colorFor(n)
    const x0 = Math.round(k.x / cell) * cell
    const cols = Math.max(1, Math.round(k.w / cell) - (k.black ? 0 : 1))
    const top = Math.max(-cell, Math.round(n.y0 / cell) * cell)
    const bottom = Math.min(hitY, Math.round((n.y0 + n.len) / cell) * cell)
    for (let yy = top; yy < bottom; yy += cell)
      for (let c = 0; c < cols; c++) {
        // ragged, dithered tails like the stream
        const t = (yy - top) / Math.max(1, bottom - top)
        if (t < 0.18 && rand() < 0.45 - t * 2) continue
        s += `<rect x="${x0 + c * cell + gap / 2}" y="${yy + gap / 2}" width="${cell - gap}" height="${cell - gap}" fill="${color}"/>`
      }
    if (n.y0 + n.len >= hitY - cell * 2) lit.set(n.pitch, color)
  }

  // hit line glow
  s += `<rect x="0" y="${hitY - 3}" width="${W}" height="3" fill="${PALETTE.neon}" opacity=".9"/>`
  s += `<rect x="0" y="${hitY - 26}" width="${W}" height="26" fill="url(#glow)"/>`

  // keyboard
  for (const m of whites) {
    const k = keyX.get(m)
    const c = lit.get(m)
    s += `<rect x="${k.x + 1}" y="${hitY + 2}" width="${k.w - 2}" height="${keyH - 4}" rx="4" fill="${c ?? '#eceae4'}"/>`
  }
  for (let m = lowest; m <= highest; m++) {
    if (!isBlack(m)) continue
    const k = keyX.get(m)
    const c = lit.get(m)
    s += `<rect x="${k.x}" y="${hitY + 2}" width="${k.w}" height="${keyH * 0.6}" rx="3" fill="${c ?? '#16182a'}"/>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="glow" x1="0" x2="0" y1="1" y2="0"><stop offset="0" stop-color="${PALETTE.neon}" stop-opacity=".35"/><stop offset="1" stop-color="${PALETTE.neon}" stop-opacity="0"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="${INK}"/>${s}</svg>`
}

await mkdir('assets-src/keyfall', { recursive: true })
await sharp(Buffer.from(pianoRoll({ W: 1600, H: 1000, seed: 7 }))).png().toFile('assets-src/keyfall/roll.png')
await sharp(Buffer.from(pianoRoll({ W: 1600, H: 1000, seed: 21, cell: 14, gap: 3, keyH: 210, density: 1.4 })))
  .png()
  .toFile('assets-src/keyfall/roll-close.png')
await sharp(Buffer.from(pianoRoll({ W: 780, H: 1690, seed: 3, cell: 10, gap: 2, keyH: 200 })))
  .png()
  .toFile('assets-src/keyfall/roll-tall.png')
console.log('generated keyfall art')
