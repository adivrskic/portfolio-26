// The contact form (and emails Qb sends from the chat): delivers them with Resend. How the email looks is
// in ../lib/email.js.
// Required env: RESEND_API_KEY
// Optional env: CONTACT_TO_EMAIL (default adivrskic123@gmail.com),
//               CONTACT_FROM_EMAIL (must be a Resend-verified sender/domain; defaults to
//               onboarding@resend.dev, which only delivers to the Resend account owner's inbox —
//               fine for a personal contact form)
import { contactEmail } from '../lib/email.js'
import { allowedOrigin, clientIp, env, json, preflight, rateLimit } from '../lib/http.js'

// contact submissions are rare: limit hard
const limited = rateLimit(5, 10 * 60 * 1000)

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export default async (req, context) => {
  if (req.method === 'OPTIONS') return preflight(req)
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' }, req)
  if (!allowedOrigin(req)) return json(403, { error: 'Forbidden' }, req)
  if (limited(clientIp(req, context))) return json(429, { error: 'Too many requests' }, req)

  let body
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON' }, req)
  }

  // the form's hidden field: only bots fill it in. They get a thank-you and nothing is sent.
  if (str(body?.company, 200)) return json(200, { ok: true }, req)

  const name = str(body?.name, 100)
  const email = str(body?.email, 200)
  const message = str(body?.message, 5000)
  const source = str(body?.source, 40) || 'contact-form'
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: 'Missing or invalid fields' }, req)
  }

  const apiKey = env('RESEND_API_KEY')
  if (!apiKey) return json(500, { error: 'Email is not configured', code: 'no-key' }, req)

  const to = env('CONTACT_TO_EMAIL') || 'adivrskic123@gmail.com'
  const from = env('CONTACT_FROM_EMAIL') || 'adivrskic.dev <onboarding@resend.dev>'
  const { subject, html, text } = contactEmail({ name, email, message, source })

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject,
        html,
        text,
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('Resend error:', res.status, detail.slice(0, 500))
      return json(502, { error: 'Failed to send email' }, req)
    }
    return json(200, { ok: true }, req)
  } catch {
    return json(502, { error: 'Failed to send email' }, req)
  }
}

export const config = { path: '/api/contact' }
