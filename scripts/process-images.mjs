// Turns assets-src/<slug>/* into optimised frames in public/projects/<slug>/ and writes
// src/data/media.generated.json (sizes, baked blur backdrops, accent colours).
// Usage: npm run images
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import config from './media.config.mjs'

const OUT = 'public/projects'

function pipeline(src, crop) {
  const img = sharp(src, { limitInputPixels: false })
  return crop ? img.extract(crop) : img
}

/** most prominent saturated hue, weighted towards vivid pixels */
async function accentOf(src, crop) {
  const { data } = await pipeline(src, crop)
    .resize(72, 72, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const bins = Array.from({ length: 36 }, () => ({ w: 0, r: 0, g: 0, b: 0 }))
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255
    const g = data[i + 1] / 255
    const b = data[i + 2] / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const s = max === 0 ? 0 : (max - min) / max
    if (s < 0.28 || max < 0.22) continue
    let h
    if (max === r) h = ((g - b) / (max - min)) % 6
    else if (max === g) h = (b - r) / (max - min) + 2
    else h = (r - g) / (max - min) + 4
    h = (h * 60 + 360) % 360
    const w = s * s * max
    const bin = bins[Math.floor(h / 10) % 36]
    bin.w += w
    bin.r += r * w
    bin.g += g * w
    bin.b += b * w
  }
  let best = -1
  let bestW = 0
  for (let i = 0; i < 36; i++) {
    const w = bins[(i + 35) % 36].w * 0.5 + bins[i].w + bins[(i + 1) % 36].w * 0.5
    if (w > bestW) {
      bestW = w
      best = i
    }
  }
  if (best < 0 || bestW < 4) return null
  const bin = bins[best]
  const hex = [bin.r, bin.g, bin.b].map((v) => Math.round((v / bin.w) * 255).toString(16).padStart(2, '0')).join('')
  return `#${hex}`
}

const result = {}
for (const [slug, cfg] of Object.entries(config)) {
  await mkdir(`${OUT}/${slug}`, { recursive: true })
  const frames = []
  for (const f of cfg.frames) {
    const src = `assets-src/${slug}/${f.src}`
    const name = f.name ?? f.src.replace(/\.(png|webp|jpe?g)$/i, '')
    const maxW = f.device === 'mobile' ? 760 : 1680
    const info = await pipeline(src, f.crop)
      .resize({ width: maxW, withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(`${OUT}/${slug}/${name}.webp`)
    // baked heavy blur, pushed to vivid colour so it pops behind the glass: tiny file, no runtime filter cost
    const blurred = await pipeline(src, f.crop)
      .resize({ width: 200 })
      .blur(5.6)
      .modulate({ saturation: 2, brightness: 1.08 })
      .linear(1.1, -6)
      .png()
      .toBuffer({ resolveWithObject: true })
    await sharp(blurred.data).webp({ quality: 70 }).toFile(`${OUT}/${slug}/${name}-blur.webp`)
    // how light the band behind the card's label is, so the label can switch to dark text where white
    // would wash out. The card covers a ~1.06:1 box with the image, so only the middle of a wide image
    // shows; the label band sits roughly 72–90% of the way down.
    const { width: bw, height: bh } = blurred.info
    const visible = Math.min(1, 0.83 / (bw / bh))
    // (stats() always reads its input, so the crop has to be materialised first)
    const crop = await sharp(blurred.data)
      .extract({
        left: Math.round(bw * (0.5 - visible / 2)),
        top: Math.round(bh * 0.72),
        width: Math.max(1, Math.round(bw * visible)),
        height: Math.max(1, Math.round(bh * 0.18)),
      })
      .png()
      .toBuffer()
    const band = await sharp(crop).stats()
    const [r, g, b] = band.channels.map((c) => c.mean / 255)
    const tone = 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.58 ? 'light' : 'dark'
    frames.push({
      src: `/projects/${slug}/${name}.webp`,
      blur: `/projects/${slug}/${name}-blur.webp`,
      w: info.width,
      h: info.height,
      device: f.device,
      alt: f.alt,
      tone,
      ...(f.focus ? { focus: f.focus } : {}),
    })
  }
  const coverCfg = cfg.frames[cfg.cover ?? 0]
  const accent = cfg.accent ?? (await accentOf(`assets-src/${slug}/${coverCfg.src}`, coverCfg.crop)) ?? '#ff4d23'
  result[slug] = { accent, cover: cfg.cover ?? 0, frames }
  // a full-length capture of the live site (npm run scrolls), panned through on the card
  const scrollSrc = `assets-src/${slug}/scroll.png`
  if (existsSync(scrollSrc)) {
    const s = await sharp(scrollSrc, { limitInputPixels: false })
      .resize({ width: 960, withoutEnlargement: true })
      .webp({ quality: 72, effort: 5 })
      .toFile(`${OUT}/${slug}/scroll.webp`)
    // the thin frame round the site on its card: the top of the site (its first screen), blurred, so the
    // frame carries on the site's own colours
    const { width: sw, height: sh } = await sharp(scrollSrc, { limitInputPixels: false }).metadata()
    await sharp(scrollSrc, { limitInputPixels: false })
      .extract({ left: 0, top: 0, width: sw, height: Math.min(sh, Math.round(sw / 1.6)) })
      .resize({ width: 200 })
      .blur(5.6)
      .modulate({ saturation: 1.3 })
      .webp({ quality: 70 })
      .toFile(`${OUT}/${slug}/scroll-blur.webp`)
    result[slug].scroll = { src: `/projects/${slug}/scroll.webp`, w: s.width, h: s.height, blur: `/projects/${slug}/scroll-blur.webp` }
  }
  console.log(`${slug.padEnd(10)} ${frames.length} frames  accent ${accent}${result[slug].scroll ? '  + scroll' : ''}`)
}

await writeFile('src/data/media.generated.json', JSON.stringify(result, null, 2) + '\n')
console.log('wrote src/data/media.generated.json')
