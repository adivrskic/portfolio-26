// The email the site sends Adi when someone writes (from the contact form, or through Qb in the chat): a
// clean card in the site's colours, with a plain-text twin. It's built for mail apps, not browsers: tables
// and inline styles carry the layout (Outlook and Gmail ignore most of the rest), and a <style> block only
// adds what can fall away: dark mode and small screens. Everything the visitor typed is escaped.

const SITE = 'adivrskic.dev'
/** times are shown in Adi's zone (the US East Coast) */
const TIME_ZONE = 'America/New_York'

// the site's palette (src/styles/global.css), and its counterpart for mail apps in dark mode
const LIGHT = { page: '#f3f3f1', card: '#ffffff', edge: '#e8e8e4', well: '#f6f6f3', ink: '#161616', ink2: '#6e6e69' }
const DARK = { page: '#0f0f0e', card: '#1a1a19', edge: '#2c2c2a', well: '#232321', ink: '#f2f2ef', ink2: '#a3a39d' }
const ACCENT = '#ff4d23'
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"

/** where a message came from: its label at the top, and a line under it when it needs explaining */
const SOURCES = {
  'contact-form': { label: 'Contact form' },
  'qb-chat': { label: 'Via Qb', note: 'Written with Qb, the assistant in the site’s chat.' },
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** (a line break in the subject could inject email headers) */
const oneLine = (s) => s.replace(/[\r\n]+/g, ' ')

/** longhand type styles (some mail apps drop the font shorthand) */
const type = (size, lineHeight, weight = 400, family = SANS) =>
  `font-family:${family};font-size:${size}px;line-height:${lineHeight};font-weight:${weight};`

/** a mailto: link to the visitor (anything that could add a field to it, like ? or &, is percent-encoded) */
const mailto = (email, subject) =>
  `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}`

/** a message to Adi from the site, as { subject, html, text } */
export function contactEmail({ name, email, message, source, receivedAt = new Date(), siteUrl = `https://www.${SITE}` }) {
  const from = SOURCES[source] ?? { label: `Via ${source}` }
  // "Reply to Jane": the first name when it looks like one (letters, maybe an apostrophe or a hyphen),
  // else the whole name if it's short, else just "Reply"
  const first = name.split(/\s+/)[0]
  const who = /^\p{L}[\p{L}'’-]{1,19}$/u.test(first) ? first : name.length <= 24 ? name : null
  const day = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const time = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
  const when = `${day.format(receivedAt)} · ${time.format(receivedAt)}`
  const subject = oneLine(`New message from ${name}${source === 'qb-chat' ? ', via Qb' : SOURCES[source] ? '' : ` (via ${source})`}`)
  const reply = mailto(email, `Re: your message on ${SITE}`)
  // as typed, with runs of blank lines closed up
  const body = message.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n')
  // the line an inbox shows after the subject (padded, so it doesn't run on into the email's own text)
  const preview = esc(body.replace(/\s+/g, ' ').slice(0, 110)) + '&#847;&zwnj;&nbsp;'.repeat(40)

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(subject)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  @media (max-width: 620px) {
    .card { padding: 28px 22px 22px !important; border-radius: 20px !important; }
    .name { font-size: 23px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .page { background: ${DARK.page} !important; }
    .card { background: ${DARK.card} !important; border-color: ${DARK.edge} !important; }
    .well { background: ${DARK.well} !important; }
    .rule { border-color: ${DARK.edge} !important; }
    .ink { color: ${DARK.ink} !important; }
    .ink2 { color: ${DARK.ink2} !important; }
    .btn { background: ${DARK.ink} !important; }
    .btn a { color: ${LIGHT.ink} !important; }
  }
</style>
</head>
<body class="page" style="margin:0;padding:0;background:${LIGHT.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${preview}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="page" style="background:${LIGHT.page};">
<tr><td align="center" style="padding:40px 12px;">
<!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td class="card" style="background:${LIGHT.card};border:1px solid ${LIGHT.edge};border-radius:24px;padding:36px 36px 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td class="ink2" style="${type(11, 1, 500, MONO)}letter-spacing:0.08em;text-transform:uppercase;color:${LIGHT.ink2};padding-bottom:22px;"><span style="color:${ACCENT};">&#9679;</span>&nbsp;&nbsp;New message&nbsp;&middot;&nbsp;${esc(from.label)}</td></tr>
  <tr><td class="ink name" style="${type(26, 1.2, 600)}letter-spacing:-0.02em;color:${LIGHT.ink};">${esc(name)}</td></tr>
  <tr><td style="padding:6px 0 24px;${type(15, 1.4)}"><a href="${esc(reply)}" class="ink2" style="color:${LIGHT.ink2};text-decoration:none;">${esc(email)}</a></td></tr>
  <tr><td class="well ink" style="background:${LIGHT.well};border-radius:16px;padding:20px 22px;${type(15, 1.65)}color:${LIGHT.ink};word-break:break-word;overflow-wrap:anywhere;">${esc(body).replace(/\n/g, '<br>')}</td></tr>
  ${from.note ? `<tr><td class="ink2" style="padding-top:12px;${type(13, 1.5)}color:${LIGHT.ink2};">${esc(from.note)}</td></tr>` : ''}
  <tr><td style="padding-top:24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td class="btn" style="background:${LIGHT.ink};border-radius:12px;mso-padding-alt:12px 20px;"><a href="${esc(reply)}" style="display:inline-block;padding:12px 20px;${type(14, 1.3, 500)}color:#ffffff;text-decoration:none;border-radius:12px;">${who ? `Reply to ${esc(who)}` : 'Reply'}&nbsp;&rarr;</a></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding-top:28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="rule" style="border-top:1px solid ${LIGHT.edge};font-size:0;line-height:0;">&nbsp;</td></tr></table>
  </td></tr>
  <tr><td style="padding-top:14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td class="ink2" style="${type(12, 1.5)}color:${LIGHT.ink2};">${esc(when)}</td>
    <td align="right" style="${type(12, 1.5)}"><a href="${esc(siteUrl)}" class="ink2" style="color:${LIGHT.ink2};text-decoration:none;">${SITE}&nbsp;&#8599;</a></td>
    </tr></table>
  </td></tr>
  </table>
</td></tr>
<tr><td align="center" class="ink2" style="padding:20px 16px 0;${type(12, 1.5)}color:${LIGHT.ink2};">Replying to this email goes straight to ${esc(who ?? 'them')}.</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`

  const text = [
    `New message from ${name}`,
    `${email} · ${from.label}`,
    when,
    '',
    body,
    ...(from.note ? ['', from.note] : []),
    '',
    '—',
    `Reply to this email to answer ${who ?? 'them'} directly.`,
    siteUrl,
  ].join('\n')

  return { subject, html, text }
}
