import { useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { motion, useIsPresent, usePresenceData, type Variants } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import type { Media, Project } from '../data/types'
import { useUI, type Leaving } from '../state/store'
import { CardFace, restartScroll } from './CardFace'
import { IconArrowRight } from './Icons'
import './project.css'

const EASE_OUT = [0.16, 1, 0.3, 1] as const

const frameIn: Variants = {
  hidden: { opacity: 0, y: 70, scale: 0.965 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 1, ease: EASE_OUT, delay: Math.min(i, 2) * 0.08 },
  }),
}

const inView = { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '0px 0px -8% 0px' } } as const

/** two project pages passing: the same time and curve for both, so they move as one strip */
const SLIDE = { duration: 1.05, ease: [0.76, 0, 0.24, 1] } as const

const page: Variants = {
  // arriving from another project page: from just below the screen (just above, going back)
  away: (dir: number) => ({ y: dir * window.innerHeight }),
  here: { y: 0, transition: SLIDE },
  // leaving for another project page it slides the other way; when the next project's picture grows into
  // that page's hero it fades where it is; otherwise it drops away
  exit: (leaving?: Leaving) =>
    leaving?.slide
      ? { y: -leaving.slide * window.innerHeight, transition: SLIDE }
      : leaving?.expanding
        ? { opacity: 0, filter: 'blur(6px)', transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }
        : { opacity: 0, y: 30, transition: { duration: 0.35, ease: [0.7, 0, 0.84, 0] } },
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A page leaving for another project page: it is fixed exactly where it is on screen, showing only what
 * was in view (the rest of it must not slide into sight), and the window goes back to the top for the
 * page coming in. Until the two have passed, the right column sits above the left one (on phones it would
 * otherwise show through the page on its way out). The same when it fades for the next project's picture
 * growing into that page's hero.
 */
function holdInPlace(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  const below = Math.max(0, r.bottom - window.innerHeight)
  Object.assign(el.style, {
    position: 'fixed',
    top: `${r.top}px`,
    left: `${r.left}px`,
    width: `${r.width}px`,
    margin: '0',
    clipPath: `inset(${Math.max(0, -r.top)}px 0 ${below}px 0)`,
  })
  const root = document.documentElement
  root.setAttribute('data-page-slide', '')
  window.setTimeout(() => root.removeAttribute('data-page-slide'), SLIDE.duration * 1000 + 150)
  window.scrollTo({ top: 0, behavior: 'instant' })
}

/**
 * The right-hand column of a project: the project's card from the gallery, grown, then the rest of its
 * media and the next project. The written case study opens over the cube on the left (LeftColumn).
 * `arrive` is set when it comes from another project page: it slides in from below (from above, going
 * back) as that page slides out.
 */
export function ProjectPage({ project, next, arrive = 0 }: { project: Project; next: Project; arrive?: 0 | 1 | -1 }) {
  const rest = project.media.filter((m) => m.src !== project.cover)
  const ref = useRef<HTMLElement>(null)
  const [from] = useState(arrive)
  // leaving for another project page: hold still where it is, then slide out
  const present = useIsPresent()
  const leaving = usePresenceData() as Leaving | undefined
  useLayoutEffect(() => {
    if (!present && (leaving?.slide || leaving?.expanding) && ref.current) holdInPlace(ref.current)
  }, [present, leaving])
  // arriving: only its first screen comes into view as it slides (coming down from above, what is below
  // that would otherwise pass over the page on its way out)
  useLayoutEffect(() => {
    const el = ref.current
    if (!from || !el) return
    const top = el.getBoundingClientRect().top - from * window.innerHeight
    const shown = window.innerHeight - top
    el.style.clipPath = `inset(0 0 ${Math.max(0, el.offsetHeight - shown)}px 0)`
  }, [from])
  return (
    <motion.article
      ref={ref}
      className="detail"
      aria-label={project.title}
      variants={page}
      custom={from}
      initial={from ? 'away' : false}
      animate="here"
      exit="exit"
      onAnimationComplete={(done) => {
        if (done === 'here') ref.current?.style.removeProperty('clip-path')
      }}
    >
      <div className="stack">
        <Hero project={project} still={from !== 0} />
        {rest.map((m, i) => (
          <MediaFrame key={m.src} media={m} index={i + 1} />
        ))}
      </div>

      <NextProject project={next} />
    </motion.article>
  )
}

/** the gallery card, grown: same face and proportions, so it reads as the card that was clicked */
function Hero({ project, still }: { project: Project; still: boolean }) {
  const slug = project.slug
  // while a copy of it is flying here from the gallery (or back there) that copy stands in for it
  const standIn = useUI((s) => s.morph?.slug === slug)
  // shrinking back into the gallery: it stays hidden for the rest of the page's exit
  const present = useIsPresent()
  const leftByMorph = useRef(false)
  if (!present && standIn) leftByMorph.current = true
  // arriving by a click in the gallery it is already in place (under its stand-in), and sliding in from
  // another project it comes with its page; otherwise it rises in
  const [grown] = useState(() => still || useUI.getState().morph?.slug === slug)
  const cover = project.media.find((m) => m.src === project.cover)
  return (
    <motion.div
      className="hero"
      data-hero={slug}
      role="img"
      aria-label={cover?.alt ?? project.title}
      style={standIn || leftByMorph.current ? { visibility: 'hidden' } : undefined}
      initial={grown ? false : { opacity: 0, y: 70, scale: 0.965 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 1, ease: EASE_OUT } }}
    >
      <div className="card rim" style={{ '--card-accent': project.accent } as CSSProperties}>
        <CardFace project={project} />
      </div>
    </motion.div>
  )
}

/** a picture in its frame, its caption under it */
function MediaFrame({ media: m, index }: { media: Media; index: number }) {
  const ratio = m.w && m.h ? m.w / m.h : 16 / 10
  return (
    <motion.figure className="shot" variants={frameIn} custom={index} {...inView}>
      <div className={`frame frame--media frame--${m.device}`} style={{ '--ratio': ratio } as CSSProperties}>
        <img className="frame-blur" src={m.blur} alt="" aria-hidden="true" />
        <div className="frame-frost" />
        <div className="frame-shot">
          <img
            src={m.src}
            alt={m.alt}
            width={m.w}
            height={m.h}
            loading={index < 2 ? 'eager' : 'lazy'}
            decoding="async"
            style={m.focus ? { objectPosition: m.focus } : undefined}
          />
        </div>
      </div>
      <figcaption className="frame-caption mono">
        <span className="frame-num">{String(index + 1).padStart(2, '0')}</span>
        {m.alt}
      </figcaption>
    </motion.figure>
  )
}

/**
 * The next project. Its picture takes off from here and grows into that project's hero (see Morph), and
 * the rest of that page comes in under it. The picture is the top of the site's full-length capture
 * (what the hero scrolls through), so the flight starts that capture's pass from the top as it leaves.
 */
function NextProject({ project }: { project: Project }) {
  const navigate = useNavigate()
  const shot = useRef<HTMLDivElement>(null)
  // the picture in flight stands in for this one, which stays hidden while this page fades
  const flying = useUI((s) => s.morph?.source === 'next' && s.morph.slug === project.slug)
  const open = (e: MouseEvent<HTMLAnchorElement>) => {
    // (a new tab, or a window: the link as it is)
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reducedMotion()) return
    const r = shot.current?.getBoundingClientRect()
    if (!r) return
    e.preventDefault()
    restartScroll(project.slug)
    useUI.getState().setMorph({
      dir: 'expand',
      slug: project.slug,
      from: { x: r.left, y: r.top, w: r.width, h: r.height },
      source: 'next',
    })
    navigate(`/work/${project.slug}`)
  }
  return (
    <motion.div variants={frameIn} {...inView}>
      <Link
        to={`/work/${project.slug}`}
        className="frame frame--next"
        data-tone={project.tone}
        aria-label={`Next project: ${project.title}`}
        onClick={open}
      >
        <img className="frame-blur" src={project.blur} alt="" aria-hidden="true" />
        <div className="frame-frost" />
        <div ref={shot} className="next-shot" style={flying ? { visibility: 'hidden' } : undefined}>
          <img src={project.scroll?.src ?? project.cover} alt="" loading="lazy" decoding="async" />
        </div>
        <div className="next-meta">
          <span className="mono">Next project</span>
          <span className="next-title">
            {project.title}
            <IconArrowRight />
          </span>
          <span className="next-kind">{project.kind}</span>
        </div>
      </Link>
    </motion.div>
  )
}
