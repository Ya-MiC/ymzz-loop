# 變更紀錄 Changelog

格式依 [Keep a Changelog](https://keepachangelog.com/)，版本依 [SemVer](https://semver.org/)。

## [1.7.1] - 2026-11-05
### Added
- Donations: `.github/FUNDING.yml` custom link to site `#donate` (commented `github: Ya-MiC` until the owner enables Sponsors).
- Site + README **Donate / 贊助** section — receive-only USDC address on Arbitrum One, copy button, static QR (`site/donate-usdc-arb.svg`, generated offline with segno BSD-3-Clause; no wallet connect / sign / approve).
- Warning copy fixed: "USDC on Arbitrum One only. Sending other tokens or using other networks may lose funds."

## [1.7.0] - 2026-11-05
### Added
- **Feishu / Lark sink** (`scripts/sinks/feishu.mjs`): optional Bitable upsert for yesterday's review (+ holdings table, optional Docx). Enabled only when `FEISHU_APP_ID` / `FEISHU_APP_SECRET` / `FEISHU_BITABLE_APP_TOKEN` / `FEISHU_BITABLE_TABLE_ID` are set; otherwise skipped. Setup guide `docs/feishu.md`; unit tests `test/feishu.test.mjs`. Workflow passes the new secrets. 600-day lifespan unchanged.
- **CREDITS.md（致謝）**: full commercial-use audit of Fraunces / Inter / JetBrains Mono (SIL OFL-1.1), Tabler Icons (MIT), runtime deps (MIT / Apache-2.0 / MIT-0); linked from the site footer and `THIRD_PARTY.md`.

## [1.6.0] - 2026-11-05
### Added
- **Hard 600-day lifespan**: `scripts/gate.mjs` records `.ymzz/started` on first success and stops when calendar day count exceeds 600; workflow disables the schedule and emails once. Override for tests via `YMZZ_MAX_DAYS`.
- Site palette switch: 雲箋 (cloud) / 陶土 (earth) light themes with matching Morandi dark modes 暮靄 / 暮林 (wenrun design system v7.1).
- Research pack: `site-research/notes.md`, `refs.md` (verified links), `prompt.md` (reusable design prompt).
### Changed
- Official site v1.6.0: wenrun four-palette tokens, surface-based intro/feature cards (no stacked overlapping colour blocks), hero stats show 600-day lifespan, copy and READMEs state the cap clearly.
- Dark ground shifts to warm black `#1F1B16`; glass blur locked at 6px; ink easing `cubic-bezier(.16,1,.3,1)`.

## [1.5.1] - 2026-11-05
### Changed
- "How the loop works": replaced flat cards with layered brand gradients (sky→paper, lotus→lilac, lilac→sky), blurred glow orbs, section mesh + grain, inner highlight and soft depth, gentle hover lift, gradient connectors; dark-mode variant; reduced-motion safe.

## [1.5.0] - 2026-11-05
### Changed
- Design system pass: strict fluid type scale (`--t-xs` … `--t-6xl`), Fraunces for display only (≥ `--t-xl`), Inter for all UI/body/labels/numbers, JetBrains Mono only for code; weights limited to 400/500/600; line-height and tracking tokens per script.
- Real 12-column layout grid (fluid gutters, logical properties) for hero, loop, intro, bento, story, setup, FAQ and sign-up; 8-pt spacing rhythm.
- Numerals: tabular + lining everywhere; section indices 01–08, loop steps 01–03, setup steps 01–08, story 01–05, template sections 01–10 (replaces circled digits); isolated LTR in all locales.
- "How the loop works" uses one palette family (sky → lilac) plus neutrals.
### Docs
- `docs/signup.md`: bilingual owner guide — separate Notion "Signups" DB, view/export/delete, Cloudflare free tier, zero Grok Bot usage.

## [1.4.0] - 2026-11-05
### Changed
- **Renamed ymzz-notion → ymzz-loop** (the daily-review loop): repo, site, READMEs, locales, package name, docs, workflow display name. New URLs: https://github.com/Ya-MiC/ymzz-loop · https://ya-mic.github.io/ymzz-loop/ (GitHub redirects the old repo URL). `YMZZ_*` env vars and `.ymzz/` paths are unchanged, so existing forks keep working.
- Tagline: "Your daily review, on a loop: Notion to write, Google Sheets + your own GitHub to keep."
### Added
- "How the loop works" — mermaid diagram in all READMEs and a 3-step loop section at the top of the site (template in → you write → backed up to Google Sheets + your GitHub fork, daily).

## [1.3.0] - 2026-11-05
### Added
- Brief, skippable intro preloader (~1.4 s, once per session, off for reduced motion / no-JS; `?nopre` to skip).
- Grail-style scrolling marquee strip (pauses on hover, reverses in RTL, static for reduced motion).
- Email + tags sign-up form with consent note; posts to `SIGNUP_ENDPOINT` in `site/config.js`. Optional free backend: `integrations/signup-worker/` (Cloudflare Worker → Notion database), see `docs/signup.md`.
### Changed
- Hero: removed the live local-time 24h dial; replaced with a "today's page" date card (weekday, date, week strip) in the visitor's locale.
- Sheet mockup rows are relative to the visitor's browser date; today's row is highlighted.
- Motion tokens `cubic-bezier(.2,.7,.2,1)`, 300–900 ms; CSP `connect-src` allows the HTTPS signup endpoint.

## [1.2.0] - 2026-11-04
### Changed
- Website redesign after a study of quynh.moe and grail-app.com (docs/design-study.md): framed panels, live 24-hour dial hero, floating layered mockups, bento grid with real content (Notion page, email, Sheet, holdings bars, world clocks, code), sticky dark storytelling section, pointer tilt + glow, grain, self-hosted Fraunces / Inter / JetBrains Mono (OFL).

## [1.1.0] - 2026-11-04
### Changed
- Default time zone is now **UTC** (`Etc/UTC`, 07:00); filename zone slug `utc`. Set `YMZZ_TZ` (e.g. `America/Los_Angeles`) to change it.
- README is English by default, with 繁體中文 / 简体中文 / 한국어 versions.
- Website rebuilt: product introduction, before/after, mockups, FAQ, i18n (en, zh-Hant, zh-CN, ko, ar beta), RTL-ready logical CSS, Tabler icons (no emoji), CSP, no third-party requests.
- Pages workflow: `configure-pages` with `enablement: true`; Node 22 in workflows.
### Added
- THIRD_PARTY.md, TRADEMARK.md.

## [1.0.0] - 2026-11-04
### 新增 Added
- 任意時區與提醒時間：repo Variables `YMZZ_TZ`、`YMZZ_REMIND_TIME` 或 `sync.config.json`（預設 Asia/Seoul 07:00）。Any time zone / reminder time.
- 每小時閘門 + 每日去重（`.ymzz/last-run`），閘門不安裝依賴、數秒結束。Hourly gate with once-per-day dedupe.
- 檔名 `notion/YYYY/MMDD_HHMM_<時區>.md`，檔內寫明時區。Filenames carry the zone slug.
- Sink 介面（`scripts/sinks/`）：markdown、sheets；email 通知器。Pluggable sink interface.
- 官網與互動式引導教學 `site/`（GitHub Pages）。Website with interactive onboarding.
- CI（lint + test）、Pages 部署、社群檔案（LICENSE、CONTRIBUTING、SECURITY…）。
### 既有 Existing (0.x)
- KPT 每日復盤 + IBKR 持倉模板、每日建頁、提醒信、同步 Google Sheet 與 Markdown、600 天 keepalive、失敗通知。
