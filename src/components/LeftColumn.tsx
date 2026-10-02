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

const row = {
  initial: { opacity: 0, y: 12, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.18 } },
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

  // the title under the cube is the study's own while it is up (opening, open, or settling back down):
  // the study carries it up to the back arrow and back, so the one here stays out of sight meanwhile
  const [studyUp, setStudyUp] = useState(false)
  if (brief && upright && !studyUp) setStudyUp(true)
  // (switching to the phone layout while it is up, the study runs on under the title instead)
  if (!upright && studyUp) setStudyUp(false)

  // Esc closes the case study
  useEffect(() => {
    if (!brief) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInfoMode(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [brief, setInfoMode])

  return (
    <aside
      className="left"
      data-view={project ? 'project' : 'home'}
      data-panel={panel ?? undefined}
      data-brief={brief || undefined}
      data-lifted={studyUp || undefined}
    >
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

        {/* the written case study (the info button opens it): over the cube, lifted up off the title under
            it to the back arrow; on phones, under the title. (Its custom: the project now on screen, so a
            study closing on its way to another project, or home, simply fades) */}
        <AnimatePresence initial={false} custom={project?.slug}>
          {brief && project && (
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
              {...(upright ? {} : underTitle)}
            >
              {upright ? (
                <Lifted slug={project.slug} onDown={() => setStudyUp(false)}>
                  <Brief project={project} />
                </Lifted>
              ) : (
                <Brief project={project} />
              )}
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
/** the study's lift: unhurried out of the caption, settling at the back arrow; and its way back down */
const LIFT = { duration: 1.05, ease: [0.62, 0, 0.16, 1] } as const
const SETTLE = { duration: 0.8, ease: [0.55, 0, 0.22, 1] } as const

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** where a line of text sits: its letters, not its box (the caption's lines are centred) */
function letters(el: Element | null | undefined) {
  if (!el) return null
  const range = document.createRange()
  range.selectNodeContents(el)
  const r = range.getBoundingClientRect()
  return r.width > 0 ? r : null
}

/** how far an element is moved by its transform right now */
function shifted(el: HTMLElement) {
  const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
  return { x: m.m41, y: m.m42 }
}

/**
 * The case study over the cube (wide screens), lifted up off the title under the cube: the study's own
 * title and line start exactly over the caption's (which steps out of sight, see studyUp) and rise with
 * the whole study up to the back arrow, the rest of it fading up under them. Closing, it all settles back
 * down onto the caption, which takes over again once it has landed (onDown). Leaving for another project,
 * or for home, it simply fades.
 */
function Lifted({ slug, onDown, children }: { slug: string; onDown: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [present, safeToRemove] = usePresence()
  // the project on screen now (AnimatePresence's custom)
  const onScreen = usePresenceData() as string | undefined
  const running = useRef<AnimationPlaybackControls[]>([])
  // was it present last time (a change is a close, or a reopening on the way down), and which move is the
  // latest (an earlier one finishing late does nothing)
  const was = useRef(present)
  const turn = useRef(0)
  const down = useRef(onDown)
  down.current = onDown

  const parts = () => {
    const inner = ref.current?.querySelector<HTMLElement>('.brief-inner') ?? null
    return {
      inner,
      title: inner?.querySelector<HTMLElement>('.brief-title') ?? null,
      kind: inner?.querySelector<HTMLElement>('.brief-kind') ?? null,
      rest: inner ? ([...inner.children].filter((c) => !c.classList.contains('brief-head')) as HTMLElement[]) : [],
    }
  }
  /** from the study's title and line (as they sit now) to the caption's; null if there is none to go to */
  const toCaption = () => {
    const p = parts()
    const from = { title: letters(p.title), kind: letters(p.kind) }
    const to = { title: letters(document.querySelector('.caption-title')), kind: letters(document.querySelector('.caption-sub')) }
    if (!p.inner || !p.title || !p.kind || !from.title || !from.kind || !to.title || !to.kind) return null
    return { y: to.title.top - from.title.top, xTitle: to.title.left - from.title.left, xKind: to.kind.left - from.kind.left }
  }
  const stop = () => {
    running.current.forEach((a) => a.stop())
    running.current = []
  }

  // up: from over the caption (set before the first paint, so it never shows anywhere else; measured from
  // where it sits untouched)
  useLayoutEffect(() => {
    const p = parts()
    for (const el of [p.inner, p.title, p.kind]) el?.style.removeProperty('transform')
    const g = reducedMotion() ? null : toCaption()
    if (!p.inner || !p.title || !p.kind || !g) {
      if (p.inner) running.current = [animate(p.inner, { opacity: [0, 1] }, { duration: 0.45 })]
      return stop
    }
    p.inner.style.transform = `translateY(${g.y}px)`
    p.title.style.transform = `translateX(${g.xTitle}px)`
    p.kind.style.transform = `translateX(${g.xKind}px)`
    for (const el of p.rest) el.style.opacity = '0'
    running.current = [
      animate(p.inner, { y: [g.y, 0] }, LIFT),
      animate(p.title, { x: [g.xTitle, 0] }, LIFT),
      animate(p.kind, { x: [g.xKind, 0] }, LIFT),
      ...p.rest.map((el, i) => animate(el, { opacity: [0, 1], y: [26, 0] }, { duration: 0.95, ease: EASE_OUT, delay: 0.24 + i * 0.06 })),
    ]
    return stop
    // (once, as it mounts)
  }, [])

  // down when it closes (and back up if it is opened again on the way)
  useEffect(() => {
    if (was.current === present) return
    was.current = present
    const p = parts()
    if (!p.inner || !p.title || !p.kind) return
    const t = ++turn.current
    if (present) {
      stop()
      running.current = [
        animate(p.inner, { y: 0, opacity: 1 }, LIFT),
        animate(p.title, { x: 0 }, LIFT),
        animate(p.kind, { x: 0 }, LIFT),
        ...p.rest.map((el) => animate(el, { opacity: 1, y: 0 }, { duration: 0.7, ease: EASE_OUT })),
      ]
      return
    }
    stop()
    const done = () => {
      if (turn.current !== t) return
      down.current()
      safeToRemove?.()
    }
    const g = onScreen === slug && !reducedMotion() ? toCaption() : null
    if (!g) {
      const fade = animate(p.inner, { opacity: 0 }, { duration: 0.3, ease: EASE_IN })
      running.current = [fade]
      void fade.then(done)
      return
    }
    const now = { inner: shifted(p.inner), title: shifted(p.title), kind: shifted(p.kind) }
    const anims = [
      animate(p.inner, { y: now.inner.y + g.y }, SETTLE),
      animate(p.title, { x: now.title.x + g.xTitle }, SETTLE),
      animate(p.kind, { x: now.kind.x + g.xKind }, SETTLE),
      ...p.rest.map((el) => animate(el, { opacity: 0, y: 14 }, { duration: 0.34, ease: EASE_IN })),
    ]
    running.current = anims
    void Promise.all(anims).then(done)
  }, [present])

  return <div ref={ref}>{children}</div>
}

/**
 * Under the title (phones): it unfolds with some weight, on a spring that gathers speed, carries on a
 * touch past its full height and settles back (about a second), its parts rising in one after another
 * as it opens (see layout.css)
 */
const underTitle = {
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

function useUpright() {
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
function Brief({ project: p }: { project: Project }) {
  return (
    <div className="brief-inner">
      {/* over the cube the study carries the title (the one under the cube steps aside) */}
      <header className="brief-head">
        <p className="brief-title">{p.title}</p>
        <p className="brief-kind">{p.kind}</p>
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
