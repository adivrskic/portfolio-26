import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useChat } from '../state/chat'
import { IconArrowRight } from './Icons'
import { Rich } from './Rich'
import { Typed } from './Typed'
import { block } from './reveal'
import './chat.css'

const SUGGESTIONS = ['What does Adi do?', 'How was this site built?', 'Is he available for work?']

/**
 * The cube's chat, in the About column's type: Qb's words on the left in grey with its key words in ink,
 * the visitor's on the right in ink, and the line to type into right after the last of them. The
 * conversation itself lives in state/chat (it outlasts the panel).
 */
export function Chat() {
  const messages = useChat((s) => s.messages)
  const reply = useChat((s) => s.reply)
  const draft = useChat((s) => s.draft)
  const setDraft = useChat((s) => s.setDraft)
  const send = useChat((s) => s.send)
  // Qb is answering while a reply streams in, and until the last of it has been written out (messages
  // before writtenTo are shown in full)
  const [writtenTo, setWrittenTo] = useState(messages.length)
  const writing = messages.length > writtenTo && messages[messages.length - 1]?.role === 'assistant'
  const busy = reply !== null || writing
  const fresh = !messages.some((m) => m.role === 'user')
  const form = useRef<HTMLFormElement>(null)
  const input = useRef<HTMLInputElement>(null)
  // messages already here rise in with the panel; ones that arrive while it is open come in on their own
  // (the visitor's rise in, Qb's are written out a word at a time). A reply already under way when the
  // panel opens shows what has arrived of it at once
  const [opened] = useState(messages.length)
  const [underWay] = useState(() => reply?.length ?? 0)
  // follow the conversation down as it grows, unless the reader has scrolled up to an earlier part
  const follow = useRef(true)
  const settled = useRef(false)
  const keepUp = useCallback(() => {
    if (follow.current) form.current?.scrollIntoView({ block: 'nearest', behavior: settled.current ? 'smooth' : 'instant' })
  }, [])

  useLayoutEffect(() => {
    keepUp()
    settled.current = true
  }, [messages, reply, keepUp])

  useEffect(() => {
    const onScroll = () => {
      const r = form.current?.getBoundingClientRect()
      if (r) follow.current = r.top < window.innerHeight
    }
    // capture: the column scrolls itself on wide screens, the page does on phones
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  // ready to type once the column has risen in (not on touch screens, where a keyboard would cover it)
  useEffect(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 650)
    return () => clearTimeout(t)
  }, [])

  const ask = (text: string) => {
    follow.current = true
    send(text)
  }

  // the latest finished reply, for screen readers (the visible one streams in word by word)
  const last = messages[messages.length - 1]
  const announce = !busy && last?.role === 'assistant' && messages.length > opened ? last.text.replace(/\*\*/g, '') : ''

  return (
    <>
      <h2 className="sr-only">Chat with Qb, Adi's personal assistant</h2>
      <motion.div className="chat-log" aria-label="Conversation" variants={block} custom={0}>
        {/* the reply on its way comes last: dots until its first words, then the words written out as they
            arrive. It keeps its place (and key) when it lands, so it carries on where it was */}
        {(reply === null ? messages : [...messages, { role: 'assistant' as const, text: reply }]).map((m, i) => {
          const pending = i >= messages.length
          const arrived = i >= opened
          return pending && !m.text ? (
            <p key={i} className="chat-dots" data-new aria-hidden="true">
              <i />
              <i />
              <i />
            </p>
          ) : (
            <p
              key={i}
              className={`info-text chat-msg chat-msg--${m.role}`}
              data-new={(arrived && m.role === 'user') || undefined}
              aria-hidden={pending || undefined}
            >
              {m.role === 'user' ? (
                m.text
              ) : arrived ? (
                <Typed
                  text={m.text}
                  done={!pending}
                  from={i === opened ? underWay : 0}
                  onStep={keepUp}
                  onWritten={() => setWrittenTo((w) => Math.max(w, i + 1))}
                />
              ) : (
                <Rich text={m.text} />
              )}
            </p>
          )
        })}
      </motion.div>
      <p className="sr-only" aria-live="polite">
        {busy ? 'Qb is answering…' : announce}
      </p>

      <motion.form
        ref={form}
        className="chat-form"
        variants={block}
        custom={1}
        onSubmit={(e) => {
          e.preventDefault()
          if (!busy) ask(draft)
        }}
      >
        <input
          ref={input}
          className="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={busy ? 'Qb is answering…' : fresh ? 'Ask me anything' : 'Ask something else'}
          aria-label="Ask Qb about Adi's work"
          autoComplete="off"
          enterKeyHint="send"
          maxLength={1000}
        />
        <button type="submit" className="icon-btn chat-send" disabled={busy || !draft.trim()} aria-label="Send">
          <IconArrowRight />
        </button>
      </motion.form>

      {fresh && (
        <motion.div className="chat-suggest" variants={block} custom={2}>
          {SUGGESTIONS.map((q) => (
            <button key={q} type="button" className="chat-chip" disabled={busy} onClick={() => ask(q)}>
              {q}
            </button>
          ))}
        </motion.div>
      )}
    </>
  )
}
