import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { animate } from 'motion/react'
import { PROJECTS } from '../data/projects'
import type { Project } from '../data/types'
import { useUI, type Panel, type Rect } from '../state/store'
import { CardFace } from './CardFace'
import './morph.css'

const DESKTOP = '(min-width: 860px)'
const EASE = [0.55, 0, 0.1, 1] as const

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}

/** where the grown card sits on its project page: the hero once that has mounted, until then its CSS twin */
function heroSpot(slug: string): Rect | null {
  const hero = document.querySelector(`[data-hero="${slug}"]`)
  if (hero) return rectOf(hero)
  const probe = document.querySelector('.hero-probe')
  if (!probe) return null
  const r = rectOf(probe)
  if (window.matchMedia(DESKTOP).matches) return r
  // one column: the hero follows the left column (cube, title, icons), which may still be opening
  const left = document.querySelector('.left')
  return left ? { ...r, y: left.getBoundingClientRect().bottom } : r
}

/** the gallery's focused card: the real one once the gallery has mounted, until then its CSS twin */
function gallerySpot(): Rect | null {
  const slot = document.querySelector('.carousel .slot[data-focus]')
  if (slot) return rectOf(slot)
  const probe = document.querySelector('.dock-probe > i')
  return probe ? rectOf(probe) : null
}

/**
 * The card in flight. Clicking the focused gallery card grows it into the project's hero (the first and
 * largest card on the project page, over where the progress bar was, a padding in from the edge of the
 * page), and so does the picture on a project page's next-project card, into that project's hero;
 * leaving the project for the gallery shrinks the hero back into its place there. A fixed copy of
 * the card flies between the two spots, each measured live (the destination may still be mounting or
 * moving), then hands over to the real card, which stays hidden while its stand-in is up.
 */
export function Morph({ project, panel }: { project: Project | null; panel: Panel }) {
  const morph = useUI((s) => s.morph)
  const setMorph = useUI((s) => s.setMorph)
  const box = useRef<HTMLDivElement>(null)
  const face = useRef<HTMLDivElement>(null)

  // leaving a project for the gallery: its hero shrinks back into it, if enough of it is on screen
  // (the gallery card's click starts the opposite flight itself, see Carousel)
  const prev = useRef(project)
  useLayoutEffect(() => {
    const was = prev.current
    prev.current = project
    if (was === project) return
    const current = useUI.getState().morph
    if (!was || project || panel || reducedMotion()) {
      // somewhere else entirely: drop a flight that no longer has a destination
      if (current && current.slug !== project?.slug) setMorph(null)
      return
    }
    let from: Rect | null = null
    if (current && box.current) {
      // turned back mid-flight: return from wherever the card is now
      from = rectOf(box.current)
    } else {
      const hero = document.querySelector(`[data-hero="${was.slug}"]`)
      const r = hero ? rectOf(hero) : null
      if (r && r.y + r.h / 2 > 0 && r.y + r.h / 2 < window.innerHeight) from = r
    }
    setMorph(from ? { dir: 'collapse', slug: was.slug, from } : null)
  }, [project, panel, setMorph])

  // the flight
  useLayoutEffect(() => {
    const el = box.current
    const card = face.current
    if (!morph || !el || !card) return
    const { dir, slug, from, source } = morph
    // from a next-project card: a bare picture (no words) growing into the hero; its site's pass starts
    // from the top as it takes off (see restartScroll), so it is that picture all the way
    const bare = source === 'next'
    const spot = () => (dir === 'expand' ? heroSpot(slug) : gallerySpot()) ?? from
    const place = (r: Rect) => {
      el.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`
      el.style.width = `${r.w}px`
      el.style.height = `${r.h}px`
    }
    place(from)
    // the card opens up into all site on the way to the project (its words fade), and back on the way home
    card.style.setProperty('--grow', bare || dir === 'collapse' ? '1' : '0')
    let raf = 0
    let waited = 0
    const flight = animate(0, 1, {
      duration: bare ? 1.05 : dir === 'expand' ? 0.9 : 0.75,
      ease: EASE,
      onUpdate: (k) => {
        if (!bare) card.style.setProperty('--grow', String(dir === 'expand' ? k : 1 - k))
        const to = spot()
        place({
          x: from.x + (to.x - from.x) * k,
          y: from.y + (to.y - from.y) * k,
          w: from.w + (to.w - from.w) * k,
          h: from.h + (to.h - from.h) * k,
        })
      },
      onComplete: () => {
        // hand over to the real card as soon as it is there (it normally is by now)
        const settle = () => {
          place(spot())
          const real =
            dir === 'expand'
              ? document.querySelector(`[data-hero="${slug}"]`)
              : document.querySelector('.carousel .slot[data-focus]')
          if (real || ++waited > 90) setMorph(null)
          else raf = requestAnimationFrame(settle)
        }
        settle()
      },
    })
    return () => {
      flight.stop()
      cancelAnimationFrame(raf)
    }
  }, [morph, setMorph])

  const p = morph ? PROJECTS.find((x) => x.slug === morph.slug) : undefined
  return (
    <>
      {/* CSS twins of both ends of the flight, for before the real ones have mounted */}
      <div className="hero-probe" aria-hidden="true" />
      <div className="dock-probe" aria-hidden="true">
        <i />
      </div>
      {morph && p && (
        <div ref={box} className="morph" aria-hidden="true">
          <div
            ref={face}
            className="card rim"
            style={{ '--card-accent': p.accent } as CSSProperties}
          >
            <CardFace project={p} />
          </div>
        </div>
      )}
    </>
  )
}
