import { useEffect, useLayoutEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { PROJECTS } from '../data/projects'
import { loadProgress, reportLoad } from '../state/loading'
import { bus, markLayoutDirty, useUI } from '../state/store'
import './loader.css'

const R = 72
const CIRCUMFERENCE = 2 * Math.PI * R
/** never shorter than this, so a cached visit still gets the intro instead of a flash */
const MIN_MS = 1500
/** how much of the ring loading fills before the cube is there; the cube's puzzle (it starts scrambled
 *  and turns back to solved) fills the rest, so the ring closes as the name reads true on every face */
const RING_LOAD = 0.4
/** a beat at 100% before the ring goes */
const HOLD_MS = 200
/** the ring fades out completely, then a short pause before the cube sets off */
const FADE_S = 0.55
const PAUSE_MS = 120

/**
 * Runs the intro, one step at a time: a thin ring fills as the page loads while the cube fades in at its
 * centre, scrambled, and turns itself back to solved; at 100% the ring fades out; once it is gone the cube flies to its spot, turning as it goes (see
 * CameraRig); and only when it has landed does the page appear (the store's `ready`).
 */
export function Loader() {
  const intro = useUI((s) => s.intro)
  const setIntro = useUI((s) => s.setIntro)
  const ring = useRef<SVGCircleElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)

  // the ring is drawn in a 160-unit viewBox but shown at the cube's size: keep the line at 1.5px
  useLayoutEffect(() => {
    const el = svg.current
    if (!el) return
    const fit = () => el.style.setProperty('--sw', String((1.5 * 160) / Math.max(1, el.clientWidth)))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  // 1. fill the ring
  useEffect(() => {
    if (intro !== 'loading') return
    const minMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 400 : MIN_MS
    const t0 = performance.now()
    let last = t0
    let shown = 0
    let raf = 0
    let timer = 0
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const target = Math.min(
        loadProgress((now - t0) / 1000),
        (now - t0) / minMs,
        RING_LOAD + (1 - RING_LOAD) * bus.solve,
      )
      shown += (target - shown) * (1 - Math.exp(-dt * 6))
      if (target >= 1 && shown > 0.996) shown = 1
      ring.current?.style.setProperty('stroke-dashoffset', String(CIRCUMFERENCE * (1 - shown)))
      const pct = Math.round(shown * 100)
      if (label.current) label.current.textContent = String(pct)
      root.current?.setAttribute('aria-valuenow', String(pct))
      if (shown >= 1) {
        timer = window.setTimeout(() => setIntro('leaving'), HOLD_MS)
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [intro, setIntro])

  // 2. the ring has faded out: send the cube on its way (CameraRig moves to 'done' when it lands)
  useEffect(() => {
    if (intro !== 'leaving') return
    const t = window.setTimeout(() => {
      markLayoutDirty(240)
      setIntro('moving')
    }, FADE_S * 1000 + PAUSE_MS)
    return () => clearTimeout(t)
  }, [intro, setIntro])

  // 3. without WebGL there is no cube to wait for, and a stalled frame loop must not hold the page back
  useEffect(() => {
    if (intro !== 'moving') return
    if (!bus.view.ready) {
      setIntro('done')
      return
    }
    const t = window.setTimeout(() => setIntro('done'), 8000)
    return () => clearTimeout(t)
  }, [intro, setIntro])

  if (intro === 'moving' || intro === 'done') return null
  return (
    <motion.div
      ref={root}
      className="loader"
      role="progressbar"
      aria-label="Loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      initial={{ opacity: 0 }}
      animate={
        intro === 'leaving'
          ? { opacity: 0, transition: { duration: FADE_S, ease: [0.45, 0, 0.55, 1] } }
          : { opacity: 1, transition: { duration: 0.4 } }
      }
    >
      <div className="loader-stage">
        <svg ref={svg} className="loader-ring" viewBox="0 0 160 160" aria-hidden="true">
          <circle className="loader-track" cx="80" cy="80" r={R} />
          <circle
            ref={ring}
            className="loader-progress"
            cx="80"
            cy="80"
            r={R}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE}
          />
        </svg>
        {/* the cube's first spot: it fades in here, inside the ring, and stays until the ring is gone */}
        <div className="loader-cube" data-cube-anchor aria-hidden="true" />
        <span className="loader-label mono" aria-hidden="true">
          <span ref={label}>0</span>%
        </span>
      </div>
    </motion.div>
  )
}
