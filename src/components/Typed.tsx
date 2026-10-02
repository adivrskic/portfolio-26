import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { linked } from './Rich'

/** the pace: a steady word every so often (only a long reply that has run far ahead of it is caught up
 *  with, a little quicker), and a breath after a sentence ends */
const WORD_MS = 72
const FASTEST_MS = 30
/** how many words may wait before the pace picks up */
const AHEAD = 40
const SENTENCE_MS = 140

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** where the next whole word ends after `at` (null if it isn't whole yet: more of it is on its way) */
function nextWord(text: string, at: number, done: boolean) {
  let i = at
  while (i < text.length && /\s/.test(text[i])) i++
  while (i < text.length && !/\s/.test(text[i])) i++
  if (i === at) return null
  return i < text.length || done ? i : null
}

/**
 * Qb's reply, written out a word at a time at an easy reading pace (it streams in faster than that, and in
 * uneven bursts), each word fading in as it comes. **Marked** words read in ink and addresses are links, as
 * in Rich. `from` is how much shows at once (a reply already under way when the chat opened); `done` once
 * the whole reply is in. `onStep` is called as it grows (the chat keeps the line to type into in view).
 */
export function Typed({
  text,
  done,
  from = 0,
  onStep,
  onWritten,
}: {
  text: string
  done: boolean
  from?: number
  onStep?: () => void
  /** all of it is in, and written out */
  onWritten?: () => void
}) {
  const [count, setCount] = useState(() => (reducedMotion() ? text.length : Math.min(from, text.length)))
  const latest = useRef({ text, done, count })
  latest.current = { text, done, count }

  useEffect(() => {
    if (reducedMotion()) return
    let raf = 0
    let last = performance.now()
    let wait = 0
    const tick = (now: number) => {
      const { text: t, done: whole, count: c } = latest.current
      wait -= now - last
      last = now
      if (wait <= 0) {
        const end = nextWord(t, c, whole)
        if (end !== null) {
          latest.current.count = end
          setCount(end)
          const behind = t.slice(end).split(/\s+/).filter(Boolean).length
          const pace = behind > AHEAD ? Math.max(FASTEST_MS, (WORD_MS * AHEAD) / behind) : WORD_MS
          wait = pace + (/[.!?…]["')\]]*$/.test(t.slice(0, end)) ? SENTENCE_MS : 0)
        }
      }
      // (written out, and nothing more coming: stop)
      if (!(whole && latest.current.count >= t.length)) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [done])

  // reduced motion: all of it, as it arrives
  const shown = reducedMotion() ? text : text.slice(0, count)
  useLayoutEffect(() => onStep?.(), [shown, onStep])
  const written = done && shown.length >= text.length
  useEffect(() => {
    if (written) onWritten?.()
  }, [written, onWritten])

  return <>{words(shown)}</>
}

/** the text in words, each keyed by where it starts in the reply (so one already shown never fades in again) */
function words(text: string) {
  const out: ReactNode[] = []
  let at = 0
  text.split('**').forEach((part, i) => {
    const ink = i % 2 === 1
    for (const m of part.matchAll(/\S+|\s+/g)) {
      const s = m[0]
      if (/^\s/.test(s)) {
        out.push(s)
        continue
      }
      const key = at + (m.index ?? 0)
      const word = (
        <span key={key} className="chat-word">
          {linked(s)}
        </span>
      )
      out.push(ink ? <em key={key}>{word}</em> : word)
    }
    at += part.length + 2
  })
  return out
}
