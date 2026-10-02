import { create } from 'zustand'

export type Panel = 'about' | 'contact' | 'chat' | null
export type View = 'home' | 'project'
/** the intro, in order: the ring fills, the ring fades, the cube moves to its spot, the page appears */
export type Intro = 'loading' | 'leaving' | 'moving' | 'done'
/** a box in viewport px */
export type Rect = { x: number; y: number; w: number; h: number }
/** a gallery card growing into a project's hero, or the hero shrinking back into the gallery (see Morph) */
export type Morph = {
  dir: 'expand' | 'collapse'
  slug: string
  /** where the flying card starts */
  from: Rect
  /** 'next': it takes off from the picture on a project page's next-project card (a bare picture, without
   *  the gallery card's words, so they stay hidden all the way) */
  source?: 'next'
}

/**
 * What the page that is leaving is told about where the app is going (AnimatePresence's custom): a card
 * growing into its project, or a slide to another project page (1: on to the next, up; -1: back, down).
 * Left undefined otherwise, so each of the leaving page's blocks keeps its own place in the stagger.
 */
export type Leaving = { expanding?: boolean; slide?: 1 | -1 }

type UIState = {
  /** project index focused in the carousel (also the project open on a detail page) */
  active: number
  setActive: (i: number) => void
  view: View
  panel: Panel
  setRoute: (view: View, panel: Panel) => void
  /** project page: the written case study is open under the title */
  infoMode: boolean
  setInfoMode: (v: boolean) => void
  /** bumps whenever the cube should spin a slice on its own (cube click, project-page navigation);
   *  on the home page the gallery drives the spin directly, see bus.drum */
  twist: number
  requestTwist: () => void
  /** bumps when the cube is clicked: the chat opens (or closes, if it is open), see App */
  chatAsk: number
  askChat: () => void
  intro: Intro
  setIntro: (intro: Intro) => void
  /** the intro has finished: the loader is gone and the cube sits in its spot */
  ready: boolean
  morph: Morph | null
  setMorph: (morph: Morph | null) => void
}

export const useUI = create<UIState>((set) => ({
  active: 0,
  setActive: (active) => set((s) => (s.active === active ? s : { active })),
  view: 'home',
  panel: null,
  setRoute: (view, panel) => set({ view, panel }),
  infoMode: false,
  setInfoMode: (infoMode) => set({ infoMode }),
  twist: 0,
  requestTwist: () => set((s) => ({ twist: s.twist + 1 })),
  chatAsk: 0,
  askChat: () => set((s) => ({ chatAsk: s.chatAsk + 1 })),
  intro: 'loading',
  setIntro: (intro) => set({ intro, ready: intro === 'done' }),
  ready: false,
  morph: null,
  setMorph: (morph) => set({ morph }),
}))

/**
 * Per-frame data shared between the DOM and the WebGL scene.
 * Mutated in place and read inside animation loops, so it never triggers React renders.
 */
export const bus = {
  /** where the cube should sit, in CSS px (viewport space), measured from [data-cube-anchor] */
  cube: { x: 0, y: 0, size: 0, ready: false },
  /** where the cube is drawn right now: eases towards `cube`, so effects can follow it in flight */
  view: { x: 0, y: 0, size: 0, ready: false },
  /** the cube's core, as drawn: where (CSS px, viewport space), how far its glow reaches (px), and how
   *  bright it glows (0 while the cube is closed). The equalizer, drawn over the finished frame, fades
   *  under it */
  core: { x: 0, y: 0, r: 0, glow: 0 },
  /** the gallery's continuous position (virtual index); NaN when no gallery is driving the cube */
  drum: Number.NaN,
  /** the intro flight from the loader ring to the cube's spot, in time (0 in the ring, 1 once landed);
   *  its curves are in scene/flight.ts */
  flight: 0,
  /** the loading puzzle: how far the scrambled cube has turned back to solved (0..1); the loader's ring
   *  fills with it and the intro waits for it */
  solve: 0,
  pointer: { x: -9999, y: -9999, active: false },
  /** frames left during which anchors are re-measured every frame (to follow CSS transitions) */
  dirty: 90,
}

export function markLayoutDirty(frames = 60) {
  bus.dirty = Math.max(bus.dirty, frames)
}
