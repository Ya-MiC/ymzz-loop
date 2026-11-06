# Product notes — data retention & email reminders (v0.20.0)

This file documents what the product already does. It does not invent hosted services
or contest-legal conclusions.

## What already exists

Daily loop (`.github/workflows/daily-review.yml`):

1. Hourly gate (`scripts/gate.mjs`) continues only when local time ≥ `YMZZ_REMIND_TIME` and today has not run.
2. Create today’s blank Notion page (`npm run create-today`).
3. Email the Notion link (`npm run send-reminder` → `scripts/send-reminder.mjs`).
4. Sync yesterday to sinks (`npm run sync-yesterday`): Google Sheets, Markdown under `notion/YYYY/` in the operator’s fork, optional Feishu / Lark Bitable.
5. On failure, a short email can be sent if SMTP secrets are present.
6. When the 600-day chapter ends, a chapter-complete email can be sent if SMTP secrets are present; the daily loop pauses.

Email hook (`scripts/sinks/email.mjs`):

- Enabled only when `SMTP_USER`, `SMTP_PASS`, and `MAIL_TO` are all set.
- Defaults: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`.
- If email is not enabled, `send-reminder` logs a skip and exits 0 — the rest of the job can still succeed.

Retention (operator-owned, not a ymzz hosted database):

- Notion pages live in the operator’s workspace.
- Sheet rows live in the operator’s spreadsheet (`SHEET_ID`).
- Markdown copies are committed to the operator’s GitHub fork.
- The showcase site does not store reviews. Homepage demo to-dos use a first-party cookie + `localStorage` with a 60-hour TTL.

Signup on the showcase (`SIGNUP_ENDPOINT` in `site/config.js`) is empty unless an operator deploys `docs/signup.md`. That list is unrelated to daily-review reminders.

## What the operator must configure

Required Actions secrets: `NOTION_TOKEN`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `SHEET_ID`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`.

Optional: `SMTP_HOST`, `SMTP_PORT`, Feishu secrets, and Variables `YMZZ_TZ` / `YMZZ_REMIND_TIME`.

The fork must allow GitHub Actions. Use the `product` branch as the template — not the showcase `site/` on `main`. See `docs/product-only.md` and `site/start.html`.

## What is not built (do not claim)

- No multi-tenant hosted inbox or mailing list operated by ymzz-loop itself.
- No weekly digest, SMS, or push notifications.
- No delivery dashboard beyond GitHub Actions logs.
- Email HTML is a minimal inline template (not a full design-system template).
- No “empty page at end of day” follow-up reminder.

## Acceptance criteria

1. With `SMTP_USER`, `SMTP_PASS`, and `MAIL_TO` set, a successful `daily-review` run sends an email that contains today’s Notion URL.
2. Without those secrets, `send-reminder` skips and does not fail the job.
3. The next successful run writes yesterday to Google Sheets and to `notion/YYYY/*.md` in the operator’s repository.
4. `site/start.html` states (1)–(3) honestly, including that mail is sent from the operator’s SMTP.
5. Showcase demo to-dos expire after 60 hours in the browser and are not synced to Notion/Sheets.

## Remaining work (out of scope for this site patch)

- Richer, localized email templates.
- A `workflow_dispatch` “send me a test reminder” job.
- Optional second ping if today’s Notion page is still empty.
- Any contest, ICO, or payments compliance review — not covered here.
