import { Fragment, useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { SITE } from '../data/site'
import { Chat } from './Chat'
import { IconArrowRight, IconArrowUpRight } from './Icons'
import { Rich } from './Rich'
import { block } from './reveal'
import './info.css'

export type InfoKind = 'about' | 'contact' | 'chat'

const LABELS: Record<InfoKind, string> = { about: 'About', contact: 'Contact', chat: 'Chat' }

/**
 * About, Contact and the cube's chat: a scrollable text column on the right, in place of the gallery
 * (which animates out as this animates in, and back again on the way out).
 */
export function InfoSection({ kind }: { kind: InfoKind }) {
  const navigate = useNavigate()
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  // move focus into the section so the text is announced and keyboard scrolling works
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])

  return (
    <motion.section
      ref={ref}
      className="info"
      tabIndex={-1}
      aria-label={LABELS[kind]}
      data-scroll-own
      // text, not the cube: a click here never reaches the scene
      data-block-scene
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <div className="info-inner">{kind === 'about' ? <About /> : kind === 'contact' ? <Contact /> : <Chat />}</div>
    </motion.section>
  )
}

function About() {
  const a = SITE.about
  let i = 0
  return (
    <>
      <h2 className="sr-only">About</h2>
      <motion.p className="info-text" variants={block} custom={i++}>
        <Rich text={a.lead} />
      </motion.p>
      {a.paragraphs.map((p) => (
        <motion.p key={p.slice(0, 24)} className="info-text" variants={block} custom={i++}>
          <Rich text={p} />
        </motion.p>
      ))}
      {/* the toolkit by area: a small label, then the tools in ink, each row rising in on the stagger */}
      <div className="info-group">
        <motion.p className="info-label" variants={block} custom={i++}>
          Toolkit:
        </motion.p>
        <dl className="info-kit">
          {a.toolkit.map((g) => (
            <motion.div key={g.label} className="info-kit-row" variants={block} custom={i++}>
              <dt className="info-kit-label">{g.label}</dt>
              <dd className="info-kit-items">
                {/* a space after each tool, so a row can wrap between them (never inside one) */}
                {g.items.map((t, k) => (
                  <Fragment key={t}>
                    <span className="info-kit-item">{t}</span>
                    {k < g.items.length - 1 && ' '}
                  </Fragment>
                ))}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
      <motion.div className="info-group" variants={block} custom={i++}>
        <p className="info-label">Studied:</p>
        <p className="info-text">
          <Rich text={a.education} />
        </p>
      </motion.div>
      <motion.p className="info-text" variants={block} custom={i++}>
        <Rich text={a.based} />
      </motion.p>
      <motion.p className="info-foot" variants={block} custom={i++}>
        <Link to="/contact" replace className="info-link">
          Get in touch →
        </Link>
      </motion.p>
    </>
  )
}

function Contact() {
  // the lead, then the form's parts on the stagger, then the rest
  const form = 1
  let i = form + FORM_STEPS
  return (
    <>
      <h2 className="sr-only">Contact</h2>
      <motion.p className="info-text" variants={block} custom={0}>
        <Rich text={SITE.contact.lead} />
      </motion.p>
      <ContactForm order={form} />
      <motion.div className="info-group" variants={block} custom={i++}>
        <p className="info-label">Elsewhere:</p>
        <ul className="info-list">
          {SITE.socials.map((s) => (
            <li key={s.label}>
              <a
                className="info-social"
                href={s.href}
                target={s.icon === 'mail' ? undefined : '_blank'}
                rel="noreferrer"
              >
                {s.label} <span className="info-dim">{s.handle}</span>
                <IconArrowUpRight />
              </a>
            </li>
          ))}
        </ul>
      </motion.div>
      <motion.p className="info-text" variants={block} custom={i++}>
        <Rich text={SITE.about.based} />
      </motion.p>
    </>
  )
}

type Fields = { name: string; email: string; message: string; company: string }
type Problems = Partial<Record<'name' | 'email' | 'message', string>>

const BLANK: Fields = { name: '', email: '', message: '', company: '' }
/** the form's parts in the column's stagger: its label, the name, the email, the message, the send button */
const FORM_STEPS = 5

/** what is still missing, in words that finish "Just need …" */
function check(f: Fields): Problems {
  const p: Problems = {}
  if (!f.name.trim()) p.name = 'your name'
  if (!f.email.trim()) p.email = 'your email'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) p.email = 'an email that works'
  if (!f.message.trim()) p.message = 'a message'
  return p
}

/** "a", "a and b", "a, b and c" */
const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

/** when a block of the column starts to rise (see reveal.ts): a field's hairline draws in just after */
const rises = (i: number) => 0.08 + i * 0.07
const drawAt = (i: number) => ({ '--draw': `${(rises(i) + 0.38).toFixed(2)}s` }) as CSSProperties

/** the form fading as one: once sent (for the thank-you), and as the column leaves */
const fadeAway = { opacity: 0, y: -12, filter: 'blur(4px)', transition: { duration: 0.32, ease: [0.7, 0, 0.84, 0] } } as const

/**
 * The form itself doesn't move on the way in: its parts rise one by one, in the column's stagger. It must
 * not name its own variants (initial / animate / exit as labels): a motion element that does takes charge
 * of its children's, and they would no longer follow the column's. So its exit for the thank-you is an
 * object, and the column's exit reaches it through these.
 */
const shell: Variants = {
  hidden: {},
  show: {},
  exit: fadeAway,
}

/**
 * Name, email, message, send: plain fields in the column's own type, each with its name over it and a
 * hairline under it that draws in as it rises. Posted to the contact function (netlify/functions/contact.js).
 */
function ContactForm({ order }: { order: number }) {
  const [fields, setFields] = useState(BLANK)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  // problems show once a send has been tried, and clear as they are fixed
  const [tried, setTried] = useState(false)
  const problems = tried ? check(fields) : {}
  const missing = Object.values(problems)
  const form = useRef<HTMLFormElement>(null)

  const edit = (key: keyof Fields) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value
    setFields((f) => ({ ...f, [key]: value }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return
    setTried(true)
    const wrong = (['name', 'email', 'message'] as const).find((k) => check(fields)[k])
    if (wrong) {
      ;(form.current?.elements.namedItem(wrong) as HTMLElement | null)?.focus()
      return
    }
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fields.name.trim(),
          email: fields.email.trim(),
          message: fields.message.trim(),
          company: fields.company,
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setStatus('sent')
    } catch {
      setStatus('failed')
    }
  }

  const again = () => {
    setFields(BLANK)
    setTried(false)
    setStatus('idle')
  }

  return (
    // once sent, the form falls away for a thank-you
    <AnimatePresence mode="wait">
      {status === 'sent' ? (
        <motion.div key="sent" className="contact-sent" variants={block} custom={0} initial="hidden" animate="show" exit="exit">
          <p className="info-text" role="status">
            <em>Thanks, {fields.name.trim().split(/\s+/)[0]}.</em> Your message is on its way. I'll get back to you soon.
          </p>
          <button type="button" className="info-link" onClick={again}>
            Send another →
          </button>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          ref={form}
          className="contact-form"
          noValidate
          onSubmit={submit}
          variants={shell}
          exit={fadeAway}
        >
          <motion.p className="info-label contact-title" variants={block} custom={order}>
            Send a message:
          </motion.p>
          <motion.label className="contact-field" variants={block} custom={order + 1}>
            <span className="contact-label">Name</span>
            <input
              className="contact-input"
              name="name"
              type="text"
              autoComplete="name"
              aria-describedby="contact-status"
              value={fields.name}
              onChange={edit('name')}
              aria-invalid={!!problems.name || undefined}
              style={drawAt(order + 1)}
            />
          </motion.label>
          <motion.label className="contact-field" variants={block} custom={order + 2}>
            <span className="contact-label">Email</span>
            <input
              className="contact-input"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-describedby="contact-status"
              value={fields.email}
              onChange={edit('email')}
              aria-invalid={!!problems.email || undefined}
              style={drawAt(order + 2)}
            />
          </motion.label>
          <motion.label className="contact-field" variants={block} custom={order + 3}>
            <span className="contact-label">Message</span>
            <textarea
              className="contact-input contact-message"
              name="message"
              rows={2}
              placeholder="Tell me a little about it…"
              aria-describedby="contact-status"
              value={fields.message}
              onChange={edit('message')}
              onInput={grow}
              aria-invalid={!!problems.message || undefined}
              style={drawAt(order + 3)}
            />
          </motion.label>
          {/* left empty by people (it is out of sight): a bot that fills it in is thanked and ignored */}
          <input className="contact-trap" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" value={fields.company} onChange={edit('company')} />
          <motion.div className="contact-send" variants={block} custom={order + 4}>
            <button type="submit" className="btn btn--dark" disabled={status === 'sending'}>
              <span className="btn-label">{status === 'sending' ? 'Sending…' : 'Send'}</span>
              <IconArrowRight />
            </button>
            <p id="contact-status" className="contact-status" role="status" data-problem={status === 'failed' || missing.length > 0 || undefined}>
              {status === 'failed' ? (
                <>
                  That didn't send. Try again, or write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
                </>
              ) : missing.length ? (
                `Just need ${listed(missing)}.`
              ) : null}
            </p>
          </motion.div>
        </motion.form>
      )}
    </AnimatePresence>
  )
}

/** the message box grows with what is typed */
function grow(e: FormEvent<HTMLTextAreaElement>) {
  const el = e.currentTarget
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
