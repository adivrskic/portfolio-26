import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'motion/react'
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
  // on the page, so where that is depends on how many links the project has)
  const back = useRef<HTMLAnchorElement>(null)
  const [backMid, setBackMid] = useState<number | null>(null)
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

  return (
    <aside
      className="left"
      data-view={project ? 'project' : 'home'}
      data-panel={panel ?? undefined}
      data-brief={brief || undefined}
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

        {/* the written case study, under the title (the info button opens it) */}
        <AnimatePresence initial={false}>
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
              {...(upright ? overCube : underTitle)}
            >
              <Brief project={project} />
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
                  onClick={() => setInfoMode(!infoMode)}
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

/** the case study over the cube (wide screens): it fades and sharpens in as the blocks part */
const overCube = {
  initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.12 } },
  exit: { opacity: 0, y: -8, filter: 'blur(6px)', transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
} as const

/** under the title (phones): it unfolds */
const underTitle = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
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
      <p className="brief-summary">{p.summary}</p>
      {p.sections.map((s) => (
        <section key={s.label} className="brief-section">
          <h2 className="brief-label mono">{s.label}</h2>
          <p className="brief-body">{s.body}</p>
        </section>
      ))}
      <dl className="brief-facts">
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
