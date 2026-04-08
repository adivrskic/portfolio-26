/**
 * /api/chat.js — Vercel serverless proxy for Anthropic API.
 *
 * The frontend calls POST /api/chat with the same body it would
 * send to Anthropic. This function adds the API key and forwards it.
 *
 * Setup:
 *   1. Add ANTHROPIC_API_KEY to your Vercel environment variables
 *      (Settings → Environment Variables in the Vercel dashboard)
 *   2. Deploy — the /api/chat endpoint is live automatically
 *
 * For other hosts (Netlify, Cloudflare Workers, etc.) the logic
 * is the same — just adapt the function signature.
 */

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Failed to reach Anthropic API" });
  }
}
