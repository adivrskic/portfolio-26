// Contact form + Qb chat email handler. Sends via Resend.
// Required env: RESEND_API_KEY
// Optional env: CONTACT_TO_EMAIL (default adivrskic123@gmail.com),
//               CONTACT_FROM_EMAIL (must be a Resend-verified sender/domain;
//               defaults to onboarding@resend.dev which only delivers to the
//               account owner's inbox — fine for a personal contact form)

const ALLOWED_ORIGINS = [
  "https://adivrskic.dev",
  "https://www.adivrskic.dev",
];
const isAllowedOrigin = (origin) =>
  !origin ||
  ALLOWED_ORIGINS.includes(origin) ||
  /^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(origin) ||
  /^http:\/\/localhost(:\d+)?$/.test(origin);

// Contact submissions are rare — rate limit hard.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map();
const rateLimited = (ip) => {
  const now = Date.now();
  const rec = hits.get(ip) || { count: 0, start: now };
  if (now - rec.start > RATE_WINDOW_MS) {
    rec.count = 0;
    rec.start = now;
  }
  rec.count += 1;
  hits.set(ip, rec);
  if (hits.size > 5000) hits.clear();
  return rec.count > RATE_LIMIT;
};

const json = (status, body, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(isAllowedOrigin(origin) && origin
        ? { "Access-Control-Allow-Origin": origin }
        : {}),
    },
  });

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export default async (req, context) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || ALLOWED_ORIGINS[0],
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" }, origin);
  }

  if (!isAllowedOrigin(origin)) {
    return json(403, { error: "Forbidden" }, origin);
  }

  const ip =
    context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown";
  if (rateLimited(ip)) {
    return json(429, { error: "Too many requests" }, origin);
  }

  const apiKey = Netlify.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return json(500, { error: "Email is not configured" }, origin);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" }, origin);
  }

  const name = str(body.name, 100);
  const email = str(body.email, 200);
  const message = str(body.message, 5000);
  const budget = str(body.budget, 60);
  const timeline = str(body.timeline, 60);
  const source = str(body.source, 40) || "contact-form";
  const services = Array.isArray(body.services)
    ? body.services
        .filter((s) => typeof s === "string")
        .map((s) => s.trim().slice(0, 60))
        .slice(0, 10)
    : [];

  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "Missing or invalid fields" }, origin);
  }

  const to = Netlify.env.get("CONTACT_TO_EMAIL") || "adivrskic123@gmail.com";
  const from =
    Netlify.env.get("CONTACT_FROM_EMAIL") ||
    "Portfolio Contact <onboarding@resend.dev>";

  const rows = [
    ["From", `${name} <${email}>`],
    ["Source", source],
    services.length ? ["Interested in", services.join(", ")] : null,
    budget ? ["Budget", budget] : null,
    timeline ? ["Timeline", timeline] : null,
  ].filter(Boolean);

  const html = `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px">
      <h2 style="margin:0 0 12px;font-weight:500">New portfolio inquiry</h2>
      <table style="border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:4px 12px 4px 0;color:#888">${esc(
                k
              )}</td><td style="padding:4px 0">${esc(v)}</td></tr>`
          )
          .join("")}
      </table>
      <p style="white-space:pre-wrap;border-left:3px solid #ddd;padding:8px 12px;margin-top:16px;font-size:14px">${esc(
        message
      )}</p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Portfolio: ${name}${services.length ? ` · ${services[0]}` : ""}`,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Resend error:", res.status, detail);
      return json(502, { error: "Failed to send email" }, origin);
    }

    return json(200, { ok: true }, origin);
  } catch {
    return json(502, { error: "Failed to send email" }, origin);
  }
};

export const config = {
  path: "/api/contact",
};
