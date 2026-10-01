import { AnimatePresence, motion } from 'motion/react'

const EASE_OUT = [0.16, 1, 0.3, 1] as const
const EASE_IN = [0.7, 0, 0.84, 0] as const

/** A line of text that rolls up through a mask whenever it changes. */
export function Roll({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={className ? `roll ${className}` : 'roll'}>
      <AnimatePresence mode="popLayout" initial>
        <motion.span
          key={text}
          className="roll-line"
          initial={{ y: '110%' }}
          animate={{ y: '0%', transition: { duration: 0.85, ease: EASE_OUT, delay: 0.12 + delay } }}
          exit={{ y: '-110%', transition: { duration: 0.42, ease: EASE_IN, delay: delay * 0.5 } }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
