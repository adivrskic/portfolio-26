import type { Variants } from 'motion/react'

const EASE_OUT = [0.16, 1, 0.3, 1] as const
const EASE_IN = [0.7, 0, 0.84, 0] as const

/**
 * The right-hand column's blocks (About, Contact, the chat): each rises in on a stagger after the
 * gallery has gone, and falls away before it returns. `custom` is the block's place in the stagger.
 */
export const block: Variants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(6px)' },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.9, ease: EASE_OUT, delay: 0.08 + i * 0.07 },
  }),
  exit: (i: number) => ({
    opacity: 0,
    y: -16,
    filter: 'blur(4px)',
    transition: { duration: 0.32, ease: EASE_IN, delay: i * 0.025 },
  }),
}
