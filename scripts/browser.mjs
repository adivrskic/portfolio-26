// Shared by the capture scripts: the live sites, and a headless Chromium to drive.
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const TARGETS = [
  { slug: 'plumeform', url: 'https://plumeform.com' },
  // scroll-driven sections only draw as a visitor scrolls: its full-length capture is stitched from screens
  { slug: 'nautilus', url: 'https://nautilusinventory.com', sections: 4, stitch: true },
  { slug: 'nimbus', url: 'https://nimbuswebsites.com' },
  { slug: 'xsbl', url: 'https://xsbl.io' },
  { slug: 'afs', url: 'https://americanflooringservices.com' },
  { slug: 'ljiljan', url: 'https://ljiljan.netlify.app' },
  { slug: 'halo', url: 'https://halo-effect.netlify.app' },
  { slug: 'pinnacle', url: 'https://pinnacleacctga.com', sections: 4 },
]

export const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const CANDIDATES = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean)

/**
 * Starts a headless Chromium and connects over DevTools. (On Windows the Edge launcher can detach from
 * the real browser process, which breaks puppeteer.launch's stdio handshake, so we launch it ourselves.)
 * A short, throwaway profile path: deep temp folders can exceed Windows' MAX_PATH inside the profile.
 */
export async function openBrowser({ port, profile }) {
  const executablePath = CANDIDATES.find((p) => existsSync(p))
  if (!executablePath) throw new Error('No Chromium-based browser found. Set BROWSER_PATH.')
  const userDataDir = join(homedir(), profile)
  spawn(
    executablePath,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--hide-scrollbars',
      '--force-color-profile=srgb',
      '--enable-unsafe-swiftshader',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' },
  ).unref()
  let browser
  for (let i = 0; i < 60 && !browser; i++) {
    try {
      browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}`, defaultViewport: null })
    } catch {
      await wait(500)
    }
  }
  if (!browser) throw new Error(`Could not reach the browser on port ${port}`)
  return {
    browser,
    async close() {
      await browser.close()
      // the profile stays locked for a moment while the browser shuts down
      for (let i = 0; i < 10; i++) {
        await wait(700)
        try {
          await rm(userDataDir, { recursive: true, force: true })
          break
        } catch {
          /* still locked */
        }
      }
    },
  }
}
