// SPDX-License-Identifier: MIT · ymzz-loop signup worker (Cloudflare Workers free plan)
// Secrets (set by the owner, never committed):  wrangler secret put NOTION_TOKEN / NOTION_SIGNUP_DB
// Var: ALLOWED_ORIGIN (comma-separated), e.g. "https://ya-mic.github.io"
const TAG_RE = /^[\p{L}\p{N} _\-/+.&]{1,32}$/u;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const hits = new Map(); // best-effort per-isolate rate limit: 5 / 10 min / IP

function cors(req, env) {
  const o = req.headers.get("origin") || "", ok = (env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
  return { "access-control-allow-origin": ok.includes(o) ? o : ok[0] || "null", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "vary": "origin" };
}
const json = (b, s, h) => new Response(JSON.stringify(b), { status: s, headers: { ...h, "content-type": "application/json" } });

export default {
  async fetch(req, env) {
    const h = cors(req, env), url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (req.method !== "POST" || url.pathname !== "/subscribe") return json({ error: "not_found" }, 404, h);
    const allowed = (env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim());
    if (!allowed.includes(req.headers.get("origin") || "")) return json({ error: "origin" }, 403, h);
    const ip = req.headers.get("cf-connecting-ip") || "0", now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 600000);
    if (arr.length >= 5) return json({ error: "rate_limited" }, 429, h);
    arr.push(now); hits.set(ip, arr);
    if ((+req.headers.get("content-length") || 0) > 4096) return json({ error: "too_large" }, 413, h);
    let b; try { b = await req.json(); } catch { return json({ error: "bad_json" }, 400, h); }
    const email = String(b.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) return json({ error: "email" }, 400, h);
    if (b.consent !== true) return json({ error: "consent" }, 400, h);
    const tags = [...new Set((Array.isArray(b.tags) ? b.tags : []).map(t => String(t).trim()).filter(t => TAG_RE.test(t)))].slice(0, 8);
    const locale = String(b.locale || "").slice(0, 16), timezone = String(b.timezone || "").slice(0, 64);
    if (!env.NOTION_TOKEN || !env.NOTION_SIGNUP_DB) return json({ error: "not_configured" }, 503, h);
    const r = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: { authorization: `Bearer ${env.NOTION_TOKEN}`, "notion-version": "2022-06-28", "content-type": "application/json" },
      body: JSON.stringify({ parent: { database_id: env.NOTION_SIGNUP_DB }, properties: {
        Email: { title: [{ text: { content: email } }] },
        Tags: { multi_select: tags.map(name => ({ name: name.replace(/,/g, " ") })) },
        Locale: { rich_text: [{ text: { content: locale } }] },
        Timezone: { rich_text: [{ text: { content: timezone } }] },
        Created: { date: { start: new Date().toISOString() } },
      } }),
    });
    if (!r.ok) return json({ error: "upstream" }, 502, h);
    return json({ ok: true }, 200, h);
  },
};
