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
