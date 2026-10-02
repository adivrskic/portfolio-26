// Shared by the site's functions (chat, contact): settings, origin checks, a best-effort rate limit and
// JSON replies. The functions use the web-standard Request/Response, so the Vite dev server can run them
// as they are (see vite.config.ts).

const ALLOWED_ORIGINS = ['https://adivrskic.dev', 'https://www.adivrskic.dev']

/** a setting: Netlify's environment in production, process.env in the dev server (filled from .env.local) */
export const env = (key) => globalThis.Netlify?.env.get(key) ?? process.env[key]

/**
 * The site itself, wherever it is served from (its domain, a deploy preview calling its own functions,
 * local dev). Browsers always say where a POST comes from, so one that doesn't isn't from the site; and
 * other sites, other Netlify sites included, can't call these functions from their pages.
 */
export function allowedOrigin(req) {
  const origin = req.headers.get('origin')
  if (!origin) return false
  return origin === new URL(req.url).origin || ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin)
}

export function cors(req) {
  const origin = req.headers.get('origin')
  return origin && allowedOrigin(req) ? { 'Access-Control-Allow-Origin': origin } : {}
}

export const json = (status, body, req) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(req) } })

export function preflight(req) {
  if (!allowedOrigin(req)) return new Response(null, { status: 403 })
  return new Response(null, {
    status: 204,
    headers: { ...cors(req), 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
  })
}

export const clientIp = (req, context) => context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown'

/**
 * Best-effort, per-instance rate limit (functions are ephemeral, so it resets on a cold start; it still
 * blunts abuse from a single client). Returns a check that counts a hit and says if it is over the limit.
 */
export function rateLimit(limit, windowMs) {
  const hits = new Map()
  return (key) => {
    const now = Date.now()
    const rec = hits.get(key) || { count: 0, start: now }
    if (now - rec.start > windowMs) {
      rec.count = 0
      rec.start = now
    }
    rec.count += 1
    hits.set(key, rec)
    if (hits.size > 5000) hits.clear()
    return rec.count > limit
  }
}
