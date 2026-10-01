import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { Project } from '../data/types'
import { IconArrowRight } from './Icons'

/** how long one pass down a site and back up takes, by how many screens the capture holds */
const cycleFor = (w: number, h: number) => 5 + (h / (w * 0.625)) * 2.2

/**
 * What a project card shows: the site, filling the card and scrolling (a full-length capture panned like
 * a screen recording), and at its foot the title, a line about it and a call to explore on a band of
 * frosted glass. Everything is sized relative to the card (see carousel.css), so the same card in the
 * gallery, in flight and heading the project page is one card at different sizes. A project's hero has
 * no words on it (foot={false}).
 */
export function CardFace({ project: p, live = true, foot = true }: { project: Project; live?: boolean; foot?: boolean }) {
  const cover = p.media.find((m) => m.src === p.cover) ?? p.media[0]
  const site = (
    <div className="card-screen">
      <img
        className="card-cover"
        src={p.cover}
        alt=""
        decoding="async"
        draggable={false}
        style={cover?.focus ? { objectPosition: cover.focus } : undefined}
      />
      {live && p.scroll && <SiteScroll {...p.scroll} />}
    </div>
  )
  return (
    <div className="card-media">
      {site}
      {foot && (
      <div className="card-foot">
        {/* the glass: the same site behind it, blurred (it scrolls in step), under a light gradient */}
        <div className="card-glass" aria-hidden="true">
          <div className="card-glass-site">{site}</div>
        </div>
        <div className="card-body">
          <p className="card-title">{p.title}</p>
          <p className="card-text">{p.summary}</p>
          <span className="card-cta">
            Explore <IconArrowRight />
          </span>
        </div>
      </div>
      )}
    </div>
  )
}

/**
 * The capture, panning down the site and back up. Every copy runs on the page's clock (all start at
 * the page's time zero, whenever they mount), so a card and its flying copy always show the same moment.
 */
function SiteScroll({ src, w, h }: { src: string; w: number; h: number }) {
  const cycle = cycleFor(w, h)
  const img = useRef<HTMLImageElement>(null)
  useLayoutEffect(() => {
    for (const a of img.current?.getAnimations() ?? []) a.startTime = 0
  }, [cycle])
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
