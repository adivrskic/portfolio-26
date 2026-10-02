import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { animate, motion, useMotionValue, type AnimationPlaybackControls, type Variants } from 'motion/react'
import { useNavigate } from 'react-router'
import { PROJECTS } from '../data/projects'
import type { Project } from '../data/types'
import { bus, useUI, type Leaving } from '../state/store'
import { CardFace } from './CardFace'
import './carousel.css'

const COUNT = PROJECTS.length
/** virtual slots rendered on each side of the focused one */
const SPAN = 4
const mod = (i: number, m: number) => ((i % m) + m) % m
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
/** the first appearance (once the cube has landed) comes in a beat sooner than later returns */
let introPlayed = false

/**
 * Where a card sits on the drum, one step from the focused one and two: how far up or down (as a share of
 * the card's height), how far it has tipped back (deg), and its size. Turned away, a card is just its
 * outline, its number and its name (see carousel.css).
 */
type Pose = { y: number; rx: number; sc: number }
const REST: Pose = { y: 0, rx: 0, sc: 1 }
const NEAR: Pose = { y: 0.74, rx: 64, sc: 0.84 }
const NEXT: Pose = { y: 1.08, rx: 74, sc: 0.7 }
/** how much further down the ones below go, as a share of the card's height: room for the name under it
 *  (more of a phone's shorter card) */
const ROOM = 0.18
const ROOM_COMPACT = 0.3
/** a project's number, as the cards and the name under the focused one show it */
const numberOf = (p: Project) => String(PROJECTS.indexOf(p) + 1).padStart(2, '0')

/** leaving: when the focused card grows into a project (see Morph) the rest simply fades */
const shell: Variants = {
  exit: (leaving?: Leaving) =>
    leaving?.expanding
      ? { opacity: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } }
      : { opacity: 0, y: 46, filter: 'blur(8px)', transition: { duration: 0.5, ease: [0.7, 0, 0.84, 0] } },
}

export function Carousel() {
  const navigate = useNavigate()
  const setActive = useUI((s) => s.setActive)
  const active = useUI((s) => s.active)

  const [initial] = useState(() => useUI.getState().active)
  // back from a project whose hero is shrinking into the focused spot: everything is already in place
  // and the rest fades in around it
  const [docking] = useState(() => useUI.getState().morph?.dir === 'collapse')
  const [arriving, setArriving] = useState(docking)
  // the card standing in for a hero in flight (hidden until it lands, see Morph)
  const morphSlug = useUI((s) => s.morph?.slug)
  // the gallery always comes in already on its project (the first time, the first one): it rises and
  // fades in slowly, and the cards stacked above and below then open out from behind it (rather than
  // rolling up through the projects before it)
  const [intro] = useState(() => (reducedMotion() || docking ? null : introPlayed ? 'return' : 'first'))
  const spread = useMotionValue(intro ? 0 : 1)
  const pos = useMotionValue(initial)
  const target = useRef(initial)
  const [base, setBase] = useState(initial)
  const baseRef = useRef(initial)
  const slots = useRef(new Map<number, HTMLLIElement>())
  const region = useRef<HTMLDivElement>(null)
  const drum = useRef<HTMLUListElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const anim = useRef<AnimationPlaybackControls | null>(null)
  const cardH = useRef(360)
  const drag = useRef({ id: -1, y: 0, start: 0, moved: 0, down: false, captured: false, lastY: 0, lastT: 0, vel: 0 })
  const suppressClick = useRef(false)

  /** position every rendered slot on the drum for a continuous index v (the stack opened out by `spread`:
   *  0, every card tucked flat behind the focused one; 1, the drum) */
  const layout = useCallback((v: number) => {
    const h = cardH.current
    const s = spread.get()
    const compact = window.innerWidth < 860
    // the neighbours sit in close enough to show whole, clear of the page's edges (and the equalizer)
    const lift = compact ? 0.92 : 1
    slots.current.forEach((el, vi) => {
      const d = vi - v
      const ad = Math.abs(d)
      const sgn = d < 0 ? -1 : 1
      // from the focused pose to one step away, on to two, and on the same way past it
      const [a, b, k] = ad <= 1 ? [REST, NEAR, ad] : [NEAR, NEXT, ad - 1]
      const at = (x: keyof Pose) => a[x] + (b[x] - a[x]) * k
      const y = (sgn * at('y') * lift + (d > 0 ? Math.min(ad, 1) * (compact ? ROOM_COMPACT : ROOM) : 0)) * h * s
      const rx = sgn * Math.min(at('rx'), NEXT.rx) * s
      const sc = Math.max(0.4, at('sc'))
      // two cards stacked on either side (a third would run into the page's edge, and the equalizer)
      const op = ad > 2.2 ? Math.max(0, 1 - (ad - 2.2) / 0.5) : 1
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${sc.toFixed(4)}) rotateX(${rx.toFixed(2)}deg)`
      el.style.opacity = op.toFixed(3)
      el.style.visibility = op < 0.002 ? 'hidden' : 'visible'
      el.style.zIndex = String(1000 - Math.round(ad * 100))
      el.style.setProperty('--f', Math.min(ad, 1).toFixed(3))
      el.toggleAttribute('data-focus', ad < 0.5)
    })
    // the name under the card: there while the drum is at a project, gone a third of the way to the next
    // one (it changes, unseen, halfway) and while it spins on past several
    const name = label.current
    if (name) {
      const off = Math.abs(v - Math.round(v))
      const k = (1 - smoothstep(0.04, 0.3, off)) * (1 - smoothstep(1.5, 3.5, Math.abs(pos.getVelocity())))
      name.style.opacity = k.toFixed(3)
      name.style.translate = `0 ${((1 - k) * 5).toFixed(2)}px`
    }
  }, [pos])

  useEffect(
    () =>
      pos.on('change', (v) => {
        layout(v)
        // the cube turns with the gallery
        bus.drum = v
        const b = Math.round(v)
        if (b !== baseRef.current) {
          baseRef.current = b
          setBase(b)
        }
      }),
    [pos, layout],
  )
  // freshly mounted slots get placed before paint
  useLayoutEffect(() => layout(pos.get()), [base, layout, pos])

  // card size drives the drum geometry
  useLayoutEffect(() => {
    const el = drum.current
    if (!el) return
    const measure = () => {
      cardH.current = el.offsetHeight || 360
      layout(pos.get())
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [layout, pos])

  // a heavy drum: a soft, slightly under-damped spring with mass, so steps glide in (~1s) and settle
  // without a snap. Without an explicit velocity, motion carries over the drum's current velocity,
  // so a new step while one is still moving keeps its momentum instead of restarting from rest.
  const goTo = useCallback(
    (t: number, velocity?: number) => {
      target.current = t
      anim.current?.stop()
      anim.current = animate(
        pos,
        t,
        reducedMotion()
          ? { duration: 0.25, ease: 'easeOut' }
          : {
              type: 'spring',
              stiffness: 48,
              damping: 14.5,
              mass: 1.6,
              restDelta: 0.0004,
              restSpeed: 0.002,
              ...(velocity !== undefined ? { velocity } : {}),
            },
      )
      setActive(mod(t, COUNT))
    },
    [pos, setActive],
  )
  const step = useCallback((dir: number) => goTo(target.current + dir), [goTo])

  useEffect(() => () => anim.current?.stop(), [])

  useEffect(() => {
    if (docking) introPlayed = true
    if (!arriving) return
    const t = setTimeout(() => setArriving(false), 1200)
    return () => clearTimeout(t)
  }, [docking, arriving])

  // the gallery's position drives the cube from the start
  useEffect(() => {
    introPlayed = true
    bus.drum = pos.get()
    return () => {
      bus.drum = Number.NaN
    }
  }, [pos])

  // coming in: once the focused card is on its way up, the stack opens out from behind it
  useEffect(() => {
    const off = spread.on('change', () => layout(pos.get()))
    const open = intro ? animate(spread, 1, { duration: 1.9, ease: [0.22, 1, 0.36, 1], delay: intro === 'first' ? 0.55 : 0.35 }) : null
    return () => {
      off()
      open?.stop()
    }
  }, [intro, layout, pos, spread])

  // wheel / trackpad: one project per gesture, inertia tails don't skip ahead
  useEffect(() => {
    let acc = 0
    let lastEvt = 0
    let lockUntil = 0
    let lastMag = 0
    const onWheel = (e: WheelEvent) => {
      if (useUI.getState().panel) return
      if ((e.target as HTMLElement)?.closest?.('[data-scroll-own]')) return
      e.preventDefault()
      const raw = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX
      const d = raw * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? 400 : 1)
      const now = performance.now()
      const mag = Math.abs(d)
      if (now < lockUntil) {
        if (mag < lastMag * 0.98 || mag < 3) lockUntil = Math.max(lockUntil, now + 90)
        lastMag = mag
        return
      }
      lastMag = mag
      acc = now - lastEvt > 220 ? d : acc + d
      lastEvt = now
      if (Math.abs(acc) >= 24) {
        step(Math.sign(acc))
        acc = 0
        // one project per gesture, and a beat before the next one so the drum never races
        lockUntil = now + 700
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [step])

  // keyboard (held keys step at a calm pace rather than auto-repeat speed)
  useEffect(() => {
    let last = 0
    const onKey = (e: KeyboardEvent) => {
      if (useUI.getState().panel || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target instanceof Element ? e.target : null
      if (t?.closest('input, textarea, [contenteditable], [data-scroll-own]')) return
      const next = ['ArrowDown', 'ArrowRight', 'PageDown', 'j'].includes(e.key)
      const prev = ['ArrowUp', 'ArrowLeft', 'PageUp', 'k'].includes(e.key)
      if (!next && !prev) return
      e.preventDefault()
      const now = performance.now()
      if (e.repeat && now - last < 520) return
      last = now
      const hadFocus = !!t?.closest('.card')
      step(next ? 1 : -1)
      if (hadFocus) {
        requestAnimationFrame(() => slots.current.get(target.current)?.querySelector<HTMLElement>('.card')?.focus({ preventScroll: true }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  // drag (mouse + touch)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    drag.current = {
      id: e.pointerId,
      y: e.clientY,
      start: pos.get(),
      moved: 0,
      down: true,
      captured: false,
      lastY: e.clientY,
      lastT: performance.now(),
      vel: 0,
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.down || e.pointerId !== d.id) return
    const dy = e.clientY - d.y
    d.moved = Math.max(d.moved, Math.abs(dy))
    if (!d.captured) {
      if (d.moved < 6) return
      d.captured = true
      region.current?.setPointerCapture(e.pointerId)
      anim.current?.stop()
      d.start = pos.get() + dy / cardH.current
    }
    const unit = cardH.current
    pos.set(d.start - dy / unit)
    const now = performance.now()
    const dt = (now - d.lastT) / 1000
    if (dt > 0.001) d.vel = d.vel * 0.6 + (-(e.clientY - d.lastY) / unit / dt) * 0.4
    d.lastY = e.clientY
    d.lastT = now
    const nearest = mod(Math.round(pos.get()), COUNT)
    if (nearest !== useUI.getState().active) setActive(nearest)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.down || e.pointerId !== d.id) return
    d.down = false
    if (!d.captured) return
    suppressClick.current = true
    setTimeout(() => (suppressClick.current = false), 0)
    const vel = Math.max(-12, Math.min(12, d.vel))
    const projected = pos.get() + vel * 0.22
    const t = Math.max(d.start - 2, Math.min(d.start + 2, Math.round(projected)))
    goTo(Math.round(t), vel)
  }

  const onCardClick = (e: React.MouseEvent<HTMLAnchorElement>, vi: number, slug: string) => {
    e.preventDefault()
    if (suppressClick.current) return
    if (vi !== target.current) {
      goTo(vi)
      return
    }
    // the card grows into the project's hero: a stand-in takes off from exactly here (see Morph)
    const slot = slots.current.get(vi)
    if (slot && !reducedMotion()) {
      const r = slot.getBoundingClientRect()
      useUI.getState().setMorph({ dir: 'expand', slug, from: { x: r.left, y: r.top, w: r.width, h: r.height } })
    }
    navigate(`/work/${slug}`)
  }

  const nearestVirtual = (i: number) => {
    let delta = i - mod(target.current, COUNT)
    if (delta > COUNT / 2) delta -= COUNT
    if (delta < -COUNT / 2) delta += COUNT
    return target.current + delta
  }

  const virtual: number[] = []
  for (let vi = base - SPAN; vi <= base + SPAN; vi++) virtual.push(vi)

  return (
    <motion.div
      className="carousel"
      data-arriving={arriving || undefined}
      variants={shell}
      // it rises slowly into place, fading in a little ahead of it
      initial={docking ? false : { opacity: 0, y: 48, scale: 0.985 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 1.7,
          ease: [0.16, 1, 0.3, 1],
          delay: intro === 'first' ? 0.1 : 0.15,
          opacity: { duration: 1.2, ease: [0.33, 1, 0.68, 1], delay: intro === 'first' ? 0.1 : 0.15 },
        },
      }}
      exit="exit"
    >
      <div
        ref={region}
        className="carousel-region"
        role="region"
        aria-roledescription="carousel"
        aria-label="Selected projects"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="drum-box">
          {/* the project in focus, named just under its card: its number, and its title over what it is (as
              the cards turned away show theirs), fading out as the gallery turns and back in as it settles on
              the next (see layout; the cards pass over it, on the page beneath them). The card itself carries
              the name for screen readers, and the gallery announces each one */}
          <p className="drum-label" aria-hidden="true">
            <span ref={label} className="tag drum-label-in">
              <span className="tag-n">{numberOf(PROJECTS[mod(base, COUNT)])}</span>
              <span className="tag-t">{PROJECTS[mod(base, COUNT)]?.title}</span>
              <span className="tag-k">{PROJECTS[mod(base, COUNT)]?.kind}</span>
            </span>
          </p>
          <ul ref={drum} className="drum">
            {virtual.map((vi) => {
              const p = PROJECTS[mod(vi, COUNT)]
              return (
                <li
                  key={vi}
                  className="slot"
                  aria-hidden={vi !== target.current}
                  ref={(el) => {
                    if (el) slots.current.set(vi, el)
                    else slots.current.delete(vi)
                  }}
                >
                  <Card
                    project={p}
                    focusable={vi === target.current}
                    standIn={vi === target.current && p.slug === morphSlug}
                    onClick={(e) => onCardClick(e, vi, p.slug)}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <Progress active={active} onSeek={(i) => goTo(nearestVirtual(i))} />

      <p className="sr-only" aria-live="polite">
        Project {active + 1} of {COUNT}: {PROJECTS[active]?.title}
      </p>
    </motion.div>
  )
}

/** progress bar: click to jump, drag along it to scrub through the projects. Upright beside the gallery;
 *  on phones a short rail across, under the menu icons */
function Progress({ active, onSeek }: { active: number; onSeek: (i: number) => void }) {
  const track = useRef<HTMLDivElement>(null)
  const scrubbing = useRef(false)
  const across = useMedia('(max-width: 859px)')
  const indexAt = (x: number, y: number) => {
    const r = track.current?.getBoundingClientRect()
    const size = across ? r?.width : r?.height
    if (!r || !size) return active
    const k = across ? (x - r.left) / size : (y - r.top) / size
    return Math.max(0, Math.min(COUNT - 1, Math.floor(k * COUNT)))
  }
  const seek = (x: number, y: number) => {
    const i = indexAt(x, y)
    if (i !== useUI.getState().active) onSeek(i)
  }
  return (
    <div className="progress">
      <div
        ref={track}
        className="progress-track"
        role="slider"
        tabIndex={0}
        aria-label="Projects"
        aria-orientation={across ? 'horizontal' : 'vertical'}
        aria-valuemin={1}
        aria-valuemax={COUNT}
        aria-valuenow={active + 1}
        aria-valuetext={`${PROJECTS[active]?.title}, ${active + 1} of ${COUNT}`}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          scrubbing.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          seek(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => scrubbing.current && seek(e.clientX, e.clientY)}
        onPointerUp={() => (scrubbing.current = false)}
        onPointerCancel={() => (scrubbing.current = false)}
      >
        <span className="progress-fill" style={{ '--p': (active + 1) / COUNT } as CSSProperties} />
      </div>
    </div>
  )
}

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

function Card({
  project: p,
  focusable,
  standIn,
  onClick,
}: {
  project: Project
  focusable: boolean
  /** a copy of it is flying to or from a project page; it shows again when that lands */
  standIn: boolean
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <a
      href={`/work/${p.slug}`}
      className="card rim"
      tabIndex={focusable ? 0 : -1}
      aria-label={`Open ${p.title}: ${p.summary}`}
      onClick={onClick}
      draggable={false}
      style={{ '--card-accent': p.accent, visibility: standIn ? 'hidden' : undefined } as CSSProperties}
    >
      {/* the site scrolls on the card in focus */}
      <CardFace project={p} live={focusable} />
      {/* turned away, a card shows its number and its name, as the one in focus has them under it */}
      <span className="tag card-mark" aria-hidden="true">
        <span className="tag-n">{numberOf(p)}</span>
        <span className="tag-t">{p.title}</span>
        <span className="tag-k">{p.kind}</span>
      </span>
    </a>
  )
}
