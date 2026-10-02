import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, usePresence, usePresenceData, type AnimationPlaybackControls } from 'motion/react'
import { Link } from 'react-router'
import { SITE } from '../data/site'
import type { Project, Social } from '../data/types'
import { useUI } from '../state/store'
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconChat,
  IconGitHub,
  IconInfo,
  IconLinkedIn,
  IconMail,
  IconUser,
  IconX,
} from './Icons'
import { Roll } from './Roll'

/** the menu's row (its icons come in one after another, see layout.css) */
const row = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -8, filter: 'blur(6px)', transition: { duration: 0.22 } },
} as const

const SOCIAL_ICONS: Record<Social['icon'], typeof IconGitHub> = {
  github: IconGitHub,
  linkedin: IconLinkedIn,
  mail: IconMail,
  x: IconX,
}

export function LeftColumn({ project }: { project: Project | null }) {
  const panel = useUI((s) => s.panel)
  const infoMode = useUI((s) => s.infoMode)
  const setInfoMode = useUI((s) => s.setInfoMode)
  const ready = useUI((s) => s.ready)
  // the cube is on its way here (or has landed): from then on this is its spot
  const placed = useUI((s) => s.intro === 'moving' || s.intro === 'done')
  const brief = ready && !!project && infoMode
  // the menu stands upright on wide screens, a row on phones
  const upright = useUpright()
  const shut = upright ? { height: 0 } : { width: 0 }
  const open = upright ? { height: 44 } : { width: 44 }

  // over the cube, the case study's first line sits level with the menu's back arrow (the menu is centred
  // on the page, so where that is depends on how many links the project has). Measured as the info button
  // is pressed, so the study mounts in its place, and again if the window changes
  const back = useRef<HTMLAnchorElement>(null)
  const [backMid, setBackMid] = useState<number | null>(null)
  const measureBack = () => {
    const r = back.current?.getBoundingClientRect()
    if (r) setBackMid(r.top + r.height / 2)
  }
  useLayoutEffect(() => {
    if (!brief || !upright) return
    const measure = () => {
      const r = back.current?.getBoundingClientRect()
      if (r) setBackMid(r.top + r.height / 2)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [brief, upright])

  // Esc closes the case study
  useEffect(() => {
    if (!brief) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInfoMode(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [brief, setInfoMode])

  // how tall this column is: on a phone's project page it stays at the top, and the page scrolls under it
  // from there (--header-h, see project.css)
  const aside = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = aside.current
    if (!el) return
    const root = document.documentElement
    const ro = new ResizeObserver(() => root.style.setProperty('--header-h', `${Math.round(el.offsetHeight)}px`))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <aside
      ref={aside}
      className="left"
      data-view={project ? 'project' : 'home'}
      data-panel={panel ?? undefined}
      data-brief={brief || undefined}
    >
      {/* (a phone's project page: where the page scrolls under this column, it blurs as it goes) */}
      <div className="left-veil" aria-hidden="true" />
      {/* the name lives on the cube; keep it for screen readers and search */}
      {!project && (
        <h1 className="sr-only">
          {SITE.name}, {SITE.title}
        </h1>
      )}
      <div className="stage">
        {/* the cube's spot once the loader ring has gone (until then it sits inside the ring) */}
        <div className="cube-anchor" data-cube-anchor={placed ? '' : undefined} aria-hidden="true" />
        {/* the cube opens its chat when clicked; this is the same for the keyboard (and screen readers) */}
        {ready && (
          <Link to={panel === 'chat' ? '/' : '/chat'} className="cube-chat-link">
            {panel === 'chat' ? 'Close the chat' : 'Chat with Qb'}
          </Link>
        )}

        {/* under the cube on a project page, its name (in the gallery it is under the card in focus) */}
        <AnimatePresence initial={false}>
          {placed && project && (
            <motion.div
              key="caption"
              className="caption"
              // arriving straight on a project page, the title's space is there before the cube sets off
              // (so it flies to its final spot) and the title fades in once it has landed
              initial={{ opacity: 0, height: ready ? 0 : 'auto' }}
              animate={{
                opacity: ready ? 1 : 0,
                height: 'auto',
                transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
              }}
              exit={{ opacity: 0, height: 0, transition: { duration: 0.35 } }}
            >
              <h1 className="caption-title">
                <Roll text={project.title} />
              </h1>
              <p className="caption-sub">
                <Roll text={project.kind} delay={0.06} />
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* the written case study (the info button opens it), over the cube: it comes up from the title under
            it to the back arrow (on phones it opens at the top of the page instead, see ProjectPage). (Its
            custom: the project now on screen, so a study closing on its way to another project, or home,
            simply fades) */}
        <AnimatePresence initial={false} custom={project?.slug}>
          {brief && project && upright && (
            <motion.div
              key={`brief-${project.slug}`}
              id="project-brief"
              className="brief"
              // text over the cube: reading it never clicks the cube (that opens the chat)
              data-block-scene
              role="region"
              aria-label={`${project.title}: case study`}
              tabIndex={0}
              style={backMid !== null ? ({ '--back-mid': `${backMid}px` } as CSSProperties) : undefined}
            >
              <Lifted slug={project.slug}>
                <Brief project={project} />
              </Lifted>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="actions">
          <AnimatePresence mode="popLayout" initial={false}>
            {!ready ? null : project ? (
              <motion.div key={`p-${project.slug}`} className="actions-row" {...row}>
                <Link ref={back} to="/" className="icon-btn" aria-label="All projects" data-tip="Back">
                  <IconArrowLeft />
                </Link>
                <button
                  type="button"
                  className="icon-btn"
                  aria-expanded={infoMode}
                  aria-controls="project-brief"
                  data-active={infoMode || undefined}
                  aria-label={infoMode ? 'Close the case study' : 'Read the case study'}
                  data-tip={infoMode ? 'Close info' : 'Info'}
                  onClick={() => {
                    if (!infoMode) measureBack()
                    setInfoMode(!infoMode)
                  }}
                >
                  <IconInfo />
                </button>
                {project.links.live && (
                  <a
                    className="icon-btn"
                    href={project.links.live}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Visit ${project.title}`}
                    data-tip="Visit"
                  >
                    <IconArrowUpRight />
                  </a>
                )}
                {project.links.repo && (
                  <a
                    className="icon-btn"
                    href={project.links.repo}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${project.title} source code`}
                    data-tip="Code"
                  >
                    <IconGitHub />
                  </a>
                )}
              </motion.div>
            ) : (
              <motion.div key="home" className="actions-row" {...row}>
                {/* while About/Contact is open, a way back to the work slides in at the front */}
                <AnimatePresence initial={false}>
                  {panel && (
                    <motion.span
                      key="back"
                      className="actions-back"
                      // it opens up along the menu: downwards when upright, sideways in the phone's row
                      initial={{ opacity: 0, ...shut }}
                      animate={{ opacity: 1, ...open, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
                      exit={{ opacity: 0, ...shut, transition: { duration: 0.35, ease: [0.7, 0, 0.84, 0] } }}
                    >
                      <Link to="/" className="icon-btn" aria-label="Back to the work" data-tip="Back">
                        <IconArrowLeft />
                      </Link>
                    </motion.span>
                  )}
                </AnimatePresence>
                <Link
                  to={panel === 'about' ? '/' : '/about'}
                  className="icon-btn"
                  data-active={panel === 'about' || undefined}
                  aria-current={panel === 'about' ? 'page' : undefined}
                  aria-label="About"
                  data-tip="About"
                >
                  <IconUser />
                </Link>
                <Link
                  to={panel === 'contact' ? '/' : '/contact'}
                  className="icon-btn"
                  data-active={panel === 'contact' || undefined}
                  aria-current={panel === 'contact' ? 'page' : undefined}
                  aria-label="Contact"
                  data-tip="Contact"
                >
                  <IconChat />
                </Link>
                <span className="actions-sep" aria-hidden="true" />
                {SITE.socials.map((s) => {
                  const Icon = SOCIAL_ICONS[s.icon]
                  return (
                    <a
                      key={s.label}
                      className="icon-btn"
                      href={s.href}
                      target={s.icon === 'mail' ? undefined : '_blank'}
                      rel="noreferrer"
                      aria-label={s.label}
                      data-tip={s.label}
                    >
                      <Icon />
                    </a>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  )
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const
const EASE_IN = [0.7, 0, 0.84, 0] as const
/** the study sliding up into place from under the cube: unhurried out of the caption, settling in */
const RISE = { duration: 1.1, ease: [0.62, 0, 0.16, 1] } as const

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** where a line of text sits: its letters, not its box (the caption's lines are centred) */
function letters(el: Element | null | undefined) {
  if (!el) return null
  const range = document.createRange()
  range.selectNodeContents(el)
  const r = range.getBoundingClientRect()
  return r.width > 0 ? r : null
}

/**
 * A line rolling within its mask, as the caption's do when they change (see Roll): out of view upwards,
 * or up into view from below. On the CSS translate, so it adds to the transform Roll animates. `keep`
 * holds a line rolled out where it went.
 */
function roll(el: HTMLElement, way: 'out' | 'in', delay = 0, keep = false) {
  const still = reducedMotion()
  return el.animate(way === 'out' ? [{ translate: '0 0' }, { translate: '0 -110%' }] : [{ translate: '0 110%' }, { translate: '0 0' }], {
    duration: still ? 0 : way === 'out' ? 380 : 850,
    delay: still ? 0 : delay,
    easing: way === 'out' ? 'cubic-bezier(0.7, 0, 0.84, 0)' : 'cubic-bezier(0.16, 1, 0.3, 1)',
    fill: keep ? 'forwards' : 'backwards',
  })
}

/** the name under the cube, both lines */
const captionLines = () => [...document.querySelectorAll<HTMLElement>('.caption .roll-line')]

/** done, unless it was called off (a cancelled roll's promise rejects) */
const settled = (a: Animation | AnimationPlaybackControls) => ('finished' in a ? a.finished : Promise.resolve(a))

/**
 * The case study over the cube (wide screens). Opening, the name under the cube rolls up out of sight and
 * the study slides up into place from there, its own title and line rolling up into view at the top as
 * the rest of it arrives. Closing, its title and line roll away, the rest slides back down as it fades,
 * and the name under the cube rolls back in. Leaving for another project, or for home, it simply fades.
 */
function Lifted({ slug, children }: { slug: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [present, safeToRemove] = usePresence()
  // the project on screen now (AnimatePresence's custom)
  const onScreen = usePresenceData() as string | undefined
  const running = useRef<(Animation | AnimationPlaybackControls)[]>([])
  // the name under the cube, held rolled out of sight while the study is up
  const held = useRef<Animation[]>([])
  // was it present last time (a change is a close, or a reopening on the way down), and which move is the
  // latest (an earlier one finishing late does nothing)
  const was = useRef(present)
  const turn = useRef(0)

  const parts = () => {
    const inner = ref.current?.querySelector<HTMLElement>('.brief-inner') ?? null
    return {
      inner,
      head: inner ? [...inner.querySelectorAll<HTMLElement>('.brief-line')] : [],
      rest: inner ? ([...inner.children].filter((c) => !c.classList.contains('brief-head')) as HTMLElement[]) : [],
    }
  }
  const stop = () => {
    for (const a of running.current) {
      if ('stop' in a) a.stop()
      else a.cancel()
    }
    running.current = []
  }
  const captionOut = () => {
    held.current.forEach((a) => a.cancel())
    held.current = captionLines().map((el, i) => roll(el, 'out', i * 60, true))
  }
  const captionIn = (delay: number) => {
    held.current.forEach((a) => a.cancel())
    held.current = []
    return captionLines().map((el, i) => roll(el, 'in', delay + i * 70))
  }

  // up, as it mounts (all set before the first paint): it starts where the name under the cube is
  useLayoutEffect(() => {
    const p = parts()
    if (!p.inner) return
    const title = letters(p.inner.querySelector('.brief-title'))
    const caption = letters(document.querySelector('.caption-title'))
    const from = title && caption && !reducedMotion() ? Math.max(0, caption.top - title.top) : 0
    captionOut()
    for (const el of p.rest) {
      el.style.opacity = '0'
      el.style.transform = `translateY(${from + 24}px)`
    }
    // (the study sets off once the name has rolled out of its way, and its title and line roll in to land
    // with the rest of it)
    running.current = [
      ...p.head.map((el, i) => roll(el, 'in', 560 + i * 70)),
      ...p.rest.flatMap((el, i) => [
        animate(el, { y: [from + 24, 0] }, { ...RISE, delay: 0.22 + i * 0.045 }),
        animate(el, { opacity: [0, 1] }, { duration: 0.8, ease: EASE_OUT, delay: 0.3 + i * 0.045 }),
      ]),
    ]
    return () => {
      stop()
      // (gone: the name under the cube is back)
      held.current.forEach((a) => a.cancel())
      held.current = []
    }
    // (once, as it mounts)
  }, [])

  // down when it closes (and back up if it is opened again on the way)
  useEffect(() => {
    if (was.current === present) return
    was.current = present
    const p = parts()
    if (!p.inner) return
    const t = ++turn.current
    stop()
    if (present) {
      captionOut()
      running.current = [
        ...p.head.map((el) => roll(el, 'in')),
        ...p.rest.map((el) => animate(el, { y: 0, opacity: 1 }, { duration: 0.8, ease: EASE_OUT })),
      ]
      return
    }
    const done = () => {
      if (turn.current === t) safeToRemove?.()
    }
    if (onScreen !== slug) {
      // leaving for another project, or for home: the name under the cube is another, and comes in itself
      held.current.forEach((a) => a.cancel())
      held.current = []
      const fade = animate(p.inner, { opacity: 0 }, { duration: 0.3, ease: EASE_IN })
      running.current = [fade]
      void fade.then(done)
      return
    }
    const away = [
      ...p.head.map((el, i) => roll(el, 'out', i * 50, true)),
      ...p.rest.map((el, i) => animate(el, { y: 36, opacity: 0 }, { duration: 0.45, ease: EASE_IN, delay: i * 0.03 })),
    ]
    running.current = away
    const back = captionIn(260)
    Promise.all([...away, ...back].map(settled)).then(done, () => {})
  }, [present])

  return <div ref={ref}>{children}</div>
}

/**
 * At the top of a phone's project page (see ProjectPage): it unfolds with some weight, on a spring that
 * gathers speed, carries on a touch past its full height and settles back (about a second), its parts
 * rising in one after another as it opens (see layout.css)
 */
export const underTitle = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: 'auto',
    transition: {
      height: { type: 'spring', stiffness: 43, damping: 11.5, mass: 1.2 },
      opacity: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
    },
  },
  exit: { opacity: 0, height: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } },
} as const

const UPRIGHT = '(min-width: 860px)'

export function useUpright() {
  const [upright, setUpright] = useState(() => window.matchMedia(UPRIGHT).matches)
  useEffect(() => {
    const mq = window.matchMedia(UPRIGHT)
    const on = () => setUpright(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return upright
}

/** what a project was and how it was built: a summary, the case study's sections, year and stack */
export function Brief({ project: p }: { project: Project }) {
  return (
    <div className="brief-inner">
      {/* over the cube the study carries the title (the one under the cube steps aside) */}
      <header className="brief-head">
        {/* (each line rolls in and out of view, see Lifted) */}
        <p className="brief-title">
          <span className="brief-line">{p.title}</span>
        </p>
        <p className="brief-kind">
          <span className="brief-line">{p.kind}</span>
        </p>
      </header>
      {/* (--i: each part's place as they rise in on phones) */}
      <p className="brief-summary" style={{ '--i': 0 } as CSSProperties}>
        {p.summary}
      </p>
      {p.sections.map((s, i) => (
        <section key={s.label} className="brief-section" style={{ '--i': i + 1 } as CSSProperties}>
          <h2 className="brief-label mono">{s.label}</h2>
          <p className="brief-body">{s.body}</p>
        </section>
      ))}
      <dl className="brief-facts" style={{ '--i': p.sections.length + 1 } as CSSProperties}>
        <div>
          <dt className="mono">Year</dt>
          <dd>{p.year}</dd>
        </div>
        <div>
          <dt className="mono">Stack</dt>
          <dd>{p.stack.join(', ')}</dd>
        </div>
      </dl>
    </div>
  )
}
