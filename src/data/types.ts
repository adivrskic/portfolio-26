export type Media = {
  /** sharp image shown inset on the frame */
  src: string
  alt: string
  /** desktop screenshots sit in a wide inset, mobile ones in a phone-shaped inset, art fills the frame */
  device: 'desktop' | 'mobile' | 'art'
  /** pre-blurred backdrop for this frame (defaults to the project's blur) */
  blur?: string
  /** object-position for the inset image */
  focus?: string
  /** intrinsic size of src, used to size the inset without layout shift */
  w?: number
  h?: number
  /** whether the blurred backdrop is light or dark where a label sits (measured at build time) */
  tone?: Tone
}

export type Tone = 'light' | 'dark'

export type Section = { label: string; body: string }

export type Project = {
  slug: string
  title: string
  /** short category line shown under the title, e.g. "Warehouse platform" */
  kind: string
  year: string
  /** one-line description for cards and meta tags */
  summary: string
  stack: string[]
  links: { live?: string; repo?: string }
  /** glow colour for the cube when this project is in focus */
  accent: string
  /** main image (sharp) */
  cover: string
  /** heavily blurred version of the cover for the card background */
  blur: string
  /** tone of that blur behind the card's label: light gets dark text */
  tone: Tone
  media: Media[]
  /** a full-length capture of the live site (from the top down), panned through on the card */
  scroll?: { src: string; w: number; h: number }
  /** written case study, shown when the info toggle is on */
  sections: Section[]
}

export type Social = { label: string; href: string; handle: string; icon: 'github' | 'linkedin' | 'x' | 'mail' }
