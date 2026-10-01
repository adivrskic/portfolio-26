// Captures desktop + mobile screenshots of each project's live site into assets-src/<slug>/.
// Usage: npm run shots            (all)
//        npm run shots -- xsbl    (just one)
// Uses an installed Chromium-based browser; override with BROWSER_PATH.
import { mkdir } from 'node:fs/promises'
import { openBrowser, TARGETS, wait } from './browser.mjs'

const VIEWPORTS = [
  { name: 'live-desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
  { name: 'live-mobile', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
]

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

const only = process.argv.slice(2)
const { browser, close } = await openBrowser({ port: Number(process.env.SHOTS_PORT || 9333), profile: '.shots-profile' })

for (const t of TARGETS) {
  if (only.length && !only.includes(t.slug)) continue
  const dir = `assets-src/${t.slug}`
  await mkdir(dir, { recursive: true })
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage()
    try {
      await page.setViewport(vp)
      if (vp.isMobile) await page.setUserAgent(IPHONE_UA)
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 45000 })
      await wait(4000) // let intro animations settle
      await page.screenshot({ path: `${dir}/${vp.name}.png` })
      if (!vp.isMobile) {
        // more frames further down: scroll gently with the wheel so smooth-scroll libraries
        // follow along and scroll-triggered sections get a chance to animate in
        await page.mouse.move(vp.width / 2, vp.height / 2)
        const sections = t.sections ?? 1
        for (let s = 0; s < sections; s++) {
          for (let i = 0; i < 9; i++) {
            await page.mouse.wheel({ deltaY: 100 })
            await wait(160)
          }
          await wait(2800)
          await page.screenshot({ path: `${dir}/live-desktop-${s + 2}.png` })
        }
      }
      console.log('ok  ', t.slug, vp.name)
    } catch (e) {
      console.log('fail', t.slug, vp.name, e.message)
    } finally {
      await page.close()
    }
  }
}

await close()
