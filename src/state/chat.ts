import { create } from 'zustand'
import { SITE } from '../data/site'
import { useUI } from './store'

/**
 * The cube's chat (Qb, see netlify/functions/chat.js for its brief): the conversation and the reply
 * streaming in. It lives outside the panel, so the conversation stays (and a reply keeps arriving) while
 * the panel is closed.
 */

export type ChatMessage = {
  role: 'user' | 'assistant'
  /** as shown: **marked** words read in ink */
  text: string
  /** what the model said, when it differs from what is shown (the email tag it sent) */
  raw?: string
  /** a whole reply's signature from the chat function: the conversation goes back with each question,
   *  and only replies it signed are taken as Qb's (see netlify/functions/chat.js) */
  sig?: string
  /** shown here only, never sent to the model (the greeting, connection trouble, a reply that broke off) */
  local?: boolean
}

type ChatState = {
  messages: ChatMessage[]
  /** the reply as it streams in ('' until its first words); null when none is on its way */
  reply: string | null
  /** the question being typed (kept while the panel is closed) */
  draft: string
  setDraft: (draft: string) => void
  send: (text: string) => void
}

/** the most recent messages sent along each time (the function takes up to 40) */
const KEEP = 30

function greeting(): ChatMessage {
  return {
    role: 'assistant',
    local: true,
    text: "**Hey, I'm Qb**, Adi's personal assistant. Ask me anything about his work, his projects, or how this site was built.",
  }
}

export const useChat = create<ChatState>((set, get) => ({
  messages: [greeting()],
  reply: null,
  draft: '',
  setDraft: (draft) => set({ draft }),
  send: (raw) => {
    const text = raw.trim()
    if (!text || get().reply !== null) return
    set((s) => ({ messages: [...s.messages, { role: 'user', text }], draft: '', reply: '' }))
    void converse(get().messages)
  },
}))

const add = (...messages: ChatMessage[]) =>
  useChat.setState((s) => ({ messages: [...s.messages, ...messages], reply: null }))

class ChatError extends Error {
  status: number
  code?: string
  constructor(status: number, code?: string) {
    super(`chat failed (${status})`)
    this.status = status
    this.code = code
  }
}

async function converse(messages: ChatMessage[]) {
  let full = ''
  let sig: string | undefined
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        localTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        messages: history(messages),
      }),
    })
    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => null)
      throw new ChatError(res.status, body?.code)
    }
    for await (const evt of events(res.body)) {
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
        // the cube turns a slice as it starts to answer
        if (!full) useUI.getState().requestTwist()
        full += evt.delta.text
        useChat.setState({ reply: shown(full) })
      } else if (evt.type === 'qb_signature' && evt.sig) {
        sig = evt.sig
      } else if (evt.type === 'error') {
        throw new ChatError(0)
      }
    }
    const text = shown(full)
    // a reply only counts once it is whole (signed when it ends): otherwise it broke off on the way
    if (!text || !sig) throw new ChatError(0)
    add({ role: 'assistant', text, raw: full !== text ? full : undefined, sig })
    const email = emailIn(full)
    if (email) void forward(email)
  } catch (err) {
    // keep whatever arrived before it broke off, to read (it doesn't go back to Qb)
    const partial = shown(full)
    add(...(partial ? [{ role: 'assistant' as const, local: true, text: partial }] : []), { role: 'assistant', local: true, text: sorry(err) })
  }
}

/** the conversation as the model sees it: no local lines, the newest KEEP, starting with the visitor;
 *  Qb's replies with their signatures */
function history(messages: ChatMessage[]) {
  const sent = messages
    .filter((m) => !m.local && (m.role === 'user' || m.sig))
    .slice(-KEEP)
    .map((m) => (m.role === 'user' ? { role: m.role, content: m.text } : { role: m.role, content: m.raw ?? m.text, sig: m.sig }))
  while (sent.length && sent[0].role !== 'user') sent.shift()
  return sent
}

type StreamEvent = { type?: string; delta?: { type?: string; text?: string }; sig?: string }

/** the server-sent events of a streamed reply, parsed */
async function* events(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        yield JSON.parse(data) as StreamEvent
      } catch {
        // a malformed line: skip it
      }
    }
  }
}

/** the reply without the email tag Qb adds when it sends one (hidden while it streams in, too) */
function shown(full: string) {
  return full
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!--[\s\S]*$/, '')
    .replace(/<!?-?$/, '')
    .trim()
}

type Email = { name: string; email: string; message: string }

function emailIn(full: string): Email | null {
  const match = full.match(/<!--EMAIL:([\s\S]*?)-->/)
  if (!match) return null
  try {
    const d = JSON.parse(match[1])
    return typeof d?.name === 'string' && typeof d.email === 'string' && typeof d.message === 'string' ? d : null
  } catch {
    return null
  }
}

/** Qb offered to email Adi for the visitor and they said yes: send it like the contact form does */
async function forward(email: Email) {
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...email, source: 'qb-chat' }),
    })
    if (!res.ok) throw new Error(String(res.status))
  } catch {
    add({
      role: 'assistant',
      local: true,
      text: `That email didn't go through, sorry. The **Contact** form works too, or write to ${SITE.email}.`,
    })
  }
}

function sorry(err: unknown) {
  if (err instanceof ChatError) {
    if (err.status === 429) return "You're going a little fast for me. Give it a minute and ask again."
    if (err.code === 'no-key' && import.meta.env.DEV)
      return "I'm not set up yet: add **ANTHROPIC_API_KEY** to .env.local (see .env.example)."
  }
  return 'Having trouble connecting right now. Try again in a moment.'
}
