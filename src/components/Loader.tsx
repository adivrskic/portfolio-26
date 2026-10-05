import { useEffect } from 'react'
import { PROJECTS } from '../data/projects'
import { allIn, reportLoad, sceneAt } from '../state/loading'
import { markLayoutDirty, useUI } from '../state/store'

/** how long the cube has to fade in (see .scene) before the rest of the page follows */
const CUBE_MS = 1000
/** never longer than this, however slow the rest is: the page comes in anyway */
const MAX_MS = 5000

/**
 * Runs the intro, drawing nothing of its own: the page waits for what its first screen shows (the 3D
 * scene's first frames, the fonts, every card's picture). The cube fades in where it rests as soon as the
 * scene is there (see Scene), and a beat after, once the rest is in too, the page comes in around it: the
 * equalizer, the gallery and the menu (the store's `ready`).
 */
export function Loader() {
  const setIntro = useUI((s) => s.setIntro)

  // preload what the first screen shows: fonts (including the heavy weight pressed into the cube)
  // and every card image
  useEffect(() => {
    Promise.allSettled([document.fonts?.ready, document.fonts?.load('900 64px "Geist Variable"')]).then(() =>
      reportLoad('fonts', 1),
    )
    // every card's first screen, and the scroll of the one in focus when the gallery opens
    const first = PROJECTS[useUI.getState().active]
    const urls = [...PROJECTS.map((p) => p.cover), first?.scroll?.src ?? ''].filter(Boolean)
    if (!urls.length) reportLoad('images', 1)
    let loaded = 0
    for (const src of urls) {
      const img = new Image()
      img.decoding = 'async'
      img.onload = img.onerror = () => reportLoad('images', ++loaded / urls.length)
      img.src = src
    }
  }, [])

  useEffect(() => {
    const cubeMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 200 : CUBE_MS
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const scene = sceneAt()
      if ((allIn() && scene !== null && now - scene >= cubeMs) || now - t0 > MAX_MS) {
        // (the cube's spot moves as the menu opens under it: follow it)
        markLayoutDirty(240)
        setIntro('done')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [setIntro])

  return null
}
