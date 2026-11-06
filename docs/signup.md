# Email sign-up (optional, free)

The website's "Stay in the loop" form posts `{ email, tags[], locale, timezone, consent }` as JSON to
`SIGNUP_ENDPOINT` in `site/config.js`. While that is empty the form says sign-up is not open yet
(or opens a `mailto:` if `SIGNUP_MAILTO` is set). It never fakes success.

## Backend: Cloudflare Worker → Notion database (free tier)

1. In Notion create a database **Signups** with properties:
   `Email` (Title), `Tags` (Multi-select), `Locale` (Text), `Timezone` (Text), `Created` (Date).
   Share it with your integration (⋯ → Connections) and copy its ID from the URL.
2. Deploy:
   ```bash
   cd integrations/signup-worker
   npx wrangler login
   npx wrangler secret put NOTION_TOKEN       # paste token (only into this prompt)
   npx wrangler secret put NOTION_SIGNUP_DB   # paste database ID
   npx wrangler deploy                        # prints https://ymzz-signup.<sub>.workers.dev
   ```
3. Set `SIGNUP_ENDPOINT: "https://ymzz-signup.<sub>.workers.dev/subscribe"` in `site/config.js`, commit, push.
   If you use a custom domain, add it to `ALLOWED_ORIGIN` in `wrangler.toml`.

The worker checks the Origin, validates email/tags (max 8 tags, 32 chars), requires consent,
caps body size and applies a best-effort 5 requests / 10 min per IP limit (add a Cloudflare
rate-limiting rule for stronger protection). Manage users by filtering the Notion database by Tags.

Privacy: only email, tags, locale, time zone and timestamp are stored. Delete a row to remove a person.

---

## 站長指南 Owner guide

**資料存在哪 / Where the data lives** — 每筆訂閱只寫進你 Notion 裡**獨立的「Signups」資料庫**（由 `NOTION_SIGNUP_DB` 指定），和每日復盤、持倉資料庫完全分開。Every sign-up is written only to a **separate Notion database "Signups"** (the ID in `NOTION_SIGNUP_DB`), apart from your Daily Review and Holdings databases. Nothing is stored on the website or in this repo.

**怎麼看 / How to view** — 打開 Notion 的 Signups 資料庫；用 Tags 篩選或分組（例如只看 trader），用 Created 排序。Open the Signups database in Notion; filter or group by Tags, sort by Created.

**怎麼匯出 / How to export** — Notion 資料庫右上 `⋯` → Export → CSV（可再匯入 Google Sheets / Excel）。In Notion: `⋯` → Export → CSV.

**刪除 / Delete** — 有人要求刪除時，直接刪掉那一列。When someone asks to be removed, delete their row.

**費用 / Cost** — 後端是 Cloudflare Workers 免費方案（每天 100,000 次請求），Notion API 免費；**完全不使用 Grok Bot 額度**，網站與 Worker 自己運作。The backend runs on the Cloudflare Workers free plan (100,000 requests/day) and the free Notion API — **zero Grok Bot usage**; the site and Worker run on their own.
