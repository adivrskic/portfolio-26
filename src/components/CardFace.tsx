import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { Project } from '../data/types'

/** how long one pass down a site and back up takes, by how many screens the capture holds */
const cycleFor = (w: number, h: number) => 5 + (h / (w * 0.625)) * 2.2

/** when each project's capture (re)started its pass, on the page's clock (0, the page's start, unless set) */
const scrollStart = new Map<string, number>()

/**
 * Starts a project's capture over from the top of its site, now: every copy of it (the picture taking off
 * from a next-project card, the card in flight, the hero it lands as) then shows the same moment.
 */
export function restartScroll(slug: string) {
  const now = document.timeline.currentTime
  scrollStart.set(slug, typeof now === 'number' ? now : 0)
}

/**
 * What a project card shows: just the site, scrolling (a full-length capture panned like a screen
 * recording), with nothing over it (the project's name is under its card in the gallery). The site is set
 * in a little from the card's edges, on a thin frame of its own colours blurred, so its corners (and a
 * page's header, logo to button) clear the card's rounded ones. Everything is sized relative to the card
 * (see carousel.css), so the same card in the gallery, in flight and heading the project page is one card
 * at different sizes.
 */
export function CardFace({ project: p, live = true }: { project: Project; live?: boolean }) {
  const cover = p.media.find((m) => m.src === p.cover) ?? p.media[0]
  return (
    <div className="card-media">
      {/* (the frame, on the card in focus: turned away, a card is plain gray; from the top of the site it
          shows, or its picture) */}
      {live && (
        <img className="card-backdrop" src={p.scroll?.blur ?? p.blur} alt="" aria-hidden="true" decoding="async" draggable={false} />
      )}
      <div className="card-screen">
        <img
          className="card-cover"
          src={p.cover}
          alt=""
          decoding="async"
          draggable={false}
          style={cover?.focus ? { objectPosition: cover.focus } : undefined}
        />
        {live && p.scroll && <SiteScroll {...p.scroll} start={scrollStart.get(p.slug) ?? 0} />}
      </div>
    </div>
  )
}

/**
 * The capture, panning down the site and back up. Every copy runs on the page's clock (all start at the
 * same moment, the page's time zero unless the project's pass was restarted, whenever they mount), so a
 * card and its flying copy always show the same moment.
 */
function SiteScroll({ src, w, h, start }: { src: string; w: number; h: number; start: number }) {
  const cycle = cycleFor(w, h)
  const img = useRef<HTMLImageElement>(null)
  useLayoutEffect(() => {
    for (const a of img.current?.getAnimations() ?? []) a.startTime = start
  }, [cycle, start])
  return (
    <img
      ref={img}
      className="card-scroll"
      src={src}
      alt=""
      decoding="async"
      draggable={false}
      style={{ '--k': h / w, animationDuration: `${cycle}s` } as CSSProperties}
    />
  )
}
