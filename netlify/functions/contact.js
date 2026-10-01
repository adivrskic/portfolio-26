// The contact form (and emails Qb sends from the chat): delivers them with Resend.
// Required env: RESEND_API_KEY
// Optional env: CONTACT_TO_EMAIL (default adivrskic123@gmail.com),
//               CONTACT_FROM_EMAIL (must be a Resend-verified sender/domain; defaults to
//               onboarding@resend.dev, which only delivers to the Resend account owner's inbox —
//               fine for a personal contact form)
import { allowedOrigin, clientIp, env, json, preflight, rateLimit } from '../lib/http.js'

// contact submissions are rare: limit hard
const limited = rateLimit(5, 10 * 60 * 1000)

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

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
  // (a line break in what goes into the subject could inject email headers)
  const oneLine = (s) => s.replace(/[\r\n]+/g, ' ')
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: 'Missing or invalid fields' }, req)
  }

  const apiKey = env('RESEND_API_KEY')
  if (!apiKey) return json(500, { error: 'Email is not configured', code: 'no-key' }, req)

  const to = env('CONTACT_TO_EMAIL') || 'adivrskic123@gmail.com'
  const from = env('CONTACT_FROM_EMAIL') || 'Portfolio Contact <onboarding@resend.dev>'

  const rows = [
    ['From', `${name} <${email}>`],
    ['Source', source],
  ]
  const html = `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px">
      <h2 style="margin:0 0 12px;font-weight:500">New portfolio message</h2>
      <table style="border-collapse:collapse;font-size:14px">
        ${rows
          .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#888">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`)
          .join('')}
      </table>
      <p style="white-space:pre-wrap;border-left:3px solid #ddd;padding:8px 12px;margin-top:16px;font-size:14px">${esc(message)}</p>
    </div>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: oneLine(`Portfolio: ${name}${source === 'contact-form' ? '' : ` (via ${source})`}`),
        html,
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
