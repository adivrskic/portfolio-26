import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

export const IconUser = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="8" cy="5.5" r="2.75" />
    <path d="M2.75 13.75c.9-2.35 2.95-3.75 5.25-3.75s4.35 1.4 5.25 3.75" />
  </svg>
)

export const IconChat = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 2.25a5.75 5.75 0 0 0-5.02 8.56l-.73 2.94 2.94-.73A5.75 5.75 0 1 0 8 2.25Z" />
    <path d="M5.6 8h.01M8 8h.01M10.4 8h.01" strokeWidth={2} />
  </svg>
)

export const IconInfo = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="8" cy="8" r="5.75" />
    <path d="M8 7.25v3.5M8 5.25h.01" />
  </svg>
)

export const IconImage = (p: P) => (
  <svg {...base} {...p}>
    <rect x="2.25" y="3" width="11.5" height="10" rx="2" />
    <path d="m2.5 11.25 3.5-3.5 3.25 3.25M8.25 10l1.75-1.75 3.5 3.5" />
    <circle cx="10.25" cy="6.1" r="1" />
  </svg>
)

export const IconArrowUpRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 11 11 5M6 5h5v5" />
  </svg>
)

export const IconArrowLeft = (p: P) => (
  <svg {...base} {...p}>
    <path d="M13 8H3M7 4 3 8l4 4" />
  </svg>
)

export const IconArrowRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
)

export const IconCollapse = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2.5 6.5h4v-4M13.5 9.5h-4v4M6.5 6.5 2 2M9.5 9.5 14 14" />
  </svg>
)

export const IconClose = (p: P) => (
  <svg {...base} {...p}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
)

export const IconCopy = (p: P) => (
  <svg {...base} {...p}>
    <rect x="5.25" y="5.25" width="8" height="8" rx="2" />
    <path d="M10.75 3.25a1.5 1.5 0 0 0-1.5-.75h-5a1.75 1.75 0 0 0-1.75 1.75v5a1.5 1.5 0 0 0 .75 1.5" />
  </svg>
)

export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="m3.5 8.5 3 3 6-7" />
  </svg>
)

export const IconMail = (p: P) => (
  <svg {...base} {...p}>
    <rect x="2" y="3.5" width="12" height="9" rx="2" />
    <path d="m2.75 4.75 5.25 4 5.25-4" />
  </svg>
)

export const IconGitHub = (p: P) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}>
    <path d="M8 1.33a6.67 6.67 0 0 0-2.1 13c.33.06.45-.15.45-.32v-1.12c-1.86.4-2.25-.9-2.25-.9-.3-.77-.74-.98-.74-.98-.6-.41.05-.4.05-.4.67.05 1.02.69 1.02.69.6 1.02 1.56.72 1.94.55.06-.43.23-.72.42-.89-1.48-.17-3.04-.74-3.04-3.3 0-.73.26-1.32.69-1.79-.07-.17-.3-.85.06-1.77 0 0 .56-.18 1.83.68a6.3 6.3 0 0 1 3.34 0c1.27-.86 1.83-.68 1.83-.68.36.92.13 1.6.07 1.77.43.47.68 1.06.68 1.79 0 2.57-1.56 3.13-3.05 3.3.24.2.45.61.45 1.23v1.82c0 .18.12.39.46.32A6.67 6.67 0 0 0 8 1.33Z" />
  </svg>
)

export const IconLinkedIn = (p: P) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}>
    <path d="M3.6 2.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8ZM2.4 6h2.4v7.6H2.4V6Zm3.9 0h2.3v1.04h.03c.32-.6 1.1-1.24 2.27-1.24 2.43 0 2.88 1.6 2.88 3.68v4.12h-2.4V9.95c0-.87-.02-1.99-1.21-1.99-1.22 0-1.4.95-1.4 1.93v3.71H6.3V6Z" />
  </svg>
)

export const IconX = (p: P) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}>
    <path d="M11.9 2h2.1L9.4 7.25 14.8 14h-4.2L7.3 9.8 3.5 14H1.4l4.9-5.6L1.2 2h4.3l3 3.9L11.9 2Zm-.74 10.8h1.16L4.9 3.14H3.66l7.5 9.66Z" />
  </svg>
)

export const IconArrowUp = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 13V3M4 7l4-4 4 4" />
  </svg>
)

export const IconArrowDown = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 3v10M4 9l4 4 4-4" />
  </svg>
)
