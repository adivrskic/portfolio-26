// Captures each live site from the top down (up to MAX_SCREENS screens, in one tall image) into
// assets-src/<slug>/scroll.png. The cards scroll through it like a screen recording (see CardFace).
// Usage: npm run scrolls            (all)
//        npm run scrolls -- xsbl    (just one)
// Uses an installed Chromium-based browser; override with BROWSER_PATH.
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'
import { openBrowser, TARGETS, wait } from './browser.mjs'

/** the screen a site is captured at, unless its target sizes it (see TARGETS) */
const WIDTH = 1440
const HEIGHT = 900
const MAX_SCREENS = 6

const only = process.argv.slice(2)
const { browser, close } = await openBrowser({ port: Number(process.env.SHOTS_PORT || 9335), profile: '.scrolls-profile' })

for (const t of TARGETS) {
  if (only.length && !only.includes(t.slug)) continue
  const dir = `assets-src/${t.slug}`
  await mkdir(dir, { recursive: true })
  const page = await browser.newPage()
  const W = t.scroll?.width ?? WIDTH
  const H = t.scroll?.height ?? HEIGHT
  try {
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
    await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 45000 })
    await wait(3500) // let intro animations settle
    if (t.stitch) {
      await stitch(page, `${dir}/scroll.png`, W, H)
      console.log('ok  ', t.slug, 'stitched')
      continue
    }
    // walk down the page with the wheel, so lazy images load and scroll-triggered sections animate in
    // (smooth-scroll libraries follow the wheel too), then come back to the top
    const full = await page.evaluate(() => document.documentElement.scrollHeight)
    const depth = Math.min(full, H * MAX_SCREENS)
    await page.mouse.move(W / 2, H / 2)
    for (let y = 0; y < depth; y += 120) {
      await page.mouse.wheel({ deltaY: 120 })
      await wait(110)
    }
    await wait(2000)
    for (let y = 0; y < depth; y += 400) {
      await page.mouse.wheel({ deltaY: -400 })
      await wait(40)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await wait(2200)
    const height = Math.min(H * MAX_SCREENS, await page.evaluate(() => document.documentElement.scrollHeight))
    await page.screenshot({
      path: `${dir}/scroll.png`,
      clip: { x: 0, y: 0, width: W, height },
      captureBeyondViewport: true,
    })
    console.log('ok  ', t.slug, `${W}x${height}`)
  } catch (e) {
    console.log('fail', t.slug, e.message)
  } finally {
    await page.close()
  }
}

await close()

/**
 * For pages whose sections only draw as a visitor scrolls (scroll-driven animation, smooth-scroll
 * libraries): one screen at a time, scrolled with the wheel and given time to animate in, joined into
 * one image. After the first screen, small fixed or sticky bars (the nav) are hidden so they don't repeat.
 */
async function stitch(page, path, WIDTH, HEIGHT) {
  await page.mouse.move(WIDTH / 2, HEIGHT / 2)
  const screens = []
  let last = -1
  for (let i = 0; i < MAX_SCREENS; i++) {
    const y = await page.evaluate(() => Math.round(window.scrollY))
    if (i > 0 && y === last) break // nothing left to scroll
    last = y
    screens.push(await page.screenshot({ type: 'png' }))
    if (i === 0) {
      await page.evaluate((h) => {
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el)
          if ((cs.position === 'fixed' || cs.position === 'sticky') && el.getBoundingClientRect().height < h * 0.3)
            el.style.visibility = 'hidden'
        }
      }, HEIGHT)
    }
    for (let k = 0; k < HEIGHT / 100; k++) {
      await page.mouse.wheel({ deltaY: 100 })
      await wait(120)
    }
    await wait(2600)
  }
  await sharp({ create: { width: WIDTH, height: HEIGHT * screens.length, channels: 3, background: '#000' } })
    .composite(screens.map((input, i) => ({ input, left: 0, top: i * HEIGHT })))
    .png()
    .toFile(path)
}
