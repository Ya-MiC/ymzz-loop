# 變更紀錄 Changelog

格式依 [Keep a Changelog](https://keepachangelog.com/)，版本依 [SemVer](https://semver.org/)。

## [0.20.1] — 2026-11-06

### Fixed
- **Sticky nav covering section titles** on hash / spy jumps (`#intro`, Benefits, etc.): `scroll-padding-block-start` on `html` and `scroll-margin-block-start` on `.sec[id]` clear the contracted glass nav (`--scroll-clear`).
- **“How it flows” invisible** between hero and Benefits: a leftover v1.11.1 rule hid `#flow` with `display:none !important` after the trust-layer section was restored. `#flow` is visible again in normal document order; obsolete `.stage` / `#flowList` leftovers stay hidden.

## [0.20.0] — 2026-11-06

Intentional early-version reset for the Alipay PAYATHON / vibe-coding track.
Showcase iterations lived at 1.0–1.19; **0.20.0** marks the product as early hackathon software.
The 1.x history below is preserved and is not rewritten.

### Added
- **Start guide** (`site/start.html`): about 10 minutes from product-branch copy to the first Notion review — fork/clone `product` only (never the showcase `site/`), Notion setup, Sheet + mailbox, secrets checklist, turn Actions on, first workflow + reminder email.
- Shared chrome (`site/chrome.js`) for start/support pages (same language / palette / theme keys as the homepage).
- `PRODUCT_NOTES.md`: what the daily-review email and retention hooks already do, what the operator must configure, and acceptance criteria that are not invented features.

### Changed
- Package and site version **1.19.0 → 0.20.0** (`package.json`, `site/config.js`, footers). Tests now assert the version from `package.json` instead of a hardcoded 1.18.0 string.
- Hero primary CTA and a top-nav **Start** link point at `/start.html`. Homepage interactive setup remains as extra detail (~10 minute framing).
- **USDC tip UI moved off the landing surface** to `site/support.html`. The homepage `#donate` section is a short optional note with no address, QR, or token details (old `#donate` hash still resolves). README donate links now point at `support.html`. This is a product-surface choice, not a legal conclusion.

## [1.19.0] — 2026-11-06

### Changed
- **Showcase hero rebalance:** value proposition takes the wider center column; the live clock is a supporting widget (no empty full-height stretch). Operational one-liner sits next to the headline (Notion review today → yesterday to Sheets + GitHub); 600-day chapters stay secondary.
- **Contrast and surfaces:** stronger text in light and dark; quieter grain and competing treatments; value-contrast scale still rules — no resting card borders (hover/focus only). Fonts unchanged: Fraunces display, Inter UI, JetBrains Mono.
- **Density and nav:** top bar keeps brand + language/palette/theme only; section jumping lives in the frosted-glass dock (six sections, clickable, no numeric %). Footer padding clears the dock so footnotes stay readable. Cards still fold/expand; later sections stay aligned to the contracted nav width.
- **Trust layer:** compact data-flow (Notion → Sheets + Git Markdown + optional Feishu) with a sample of the real archive shape (not live account data). FAQ expanded (free, data, failures, chapter, template, prerequisites, product-vs-showcase, demo to-dos, comparison sources). Privacy copy now mentions the 60-hour first-party to-do cookie. Comparison note cites Day One / Zapier / Obsidian public pricing pages. No invented stars or user counts.
- **Continuous-curvature corners:** `corner-shape: squircle` inside `@supports`, with a slightly larger `border-radius` so squircles do not read smaller than round. Fallback remains plain `border-radius` on cards, panels, pills, buttons, and docks.

## [1.18.1] — 2026-11-06

### Added
- **GEO / SEO discovery stack on Pages:** `site/llms.txt` (Answer.AI map), `site/robots.txt` (allow search + AI citation; disallow training/scrape bots), `site/ai.txt` (training preference), `site/sitemap.xml`, `site/humans.txt`.
- **Head discovery links:** canonical, og:url, `rel=describedby` → llms.txt, alternate ai.txt / humans.txt.









## [1.17.1] — 2026-11-05

### Changed
- **Hero equal height:** three cards stretch to the same column height even with empty to-dos; dayp content distributes (todos flex, holdings settle to bottom) — no accidental short right card.
- **Product-only CTA:** “Get the automation” → `product` branch (no `site/`, no Pages workflow). `main` keeps the showcase. Builder `scripts/build-product-branch.mjs` + workflow `sync-product.yml` refresh `product` from `main`. See `docs/product-only.md`.
- **Bottom spy:** removed 0–100 meter/number; progress is glass depth + soft accent wash inside the existing section capsule; jumps stay clickable.
- **Dial rhythm:** smaller live clock (≈15.5rem), tighter dialp padding/foot so it matches center/right cards.

## [1.17.0] — 2026-11-05

### Changed
- **Dark today-card text (AA):** weekday / big date / month / week-circle numerals and holdings labels/% raised to cream on warm dusk (~4.5:1). Inactive week circles use darker wash + cream digits (no pale-on-pale). Local weight only where needed; global dark weight stay −1. No new resting borders; light untouched.
- **Holdings → 4 editable sliders:** edit label, drag % (0–100, keyboard/touch), optional https link per row; browser `localStorage` + cookie only; Reset restores defaults. Row 3 easter egg still zh-CN+UTC8 → `600519.SH` (贵州茅台) unless the visitor customized that label.

## [1.16.1] — 2026-11-05

### Changed
- **Today-card to-dos unified with preview rows:** visitor items fill slots **03–08** (max 6), same numbered list as 01 / 02 / 09; add / edit / delete; 60h cookie+localStorage TTL unchanged. 7th attempt shows exact 繁中：「如果 6 個代辦不能滿足您的期待，那您剛才一定輸入了一個偽需求。」 (localized in en / zh-CN / ko / ar).
- **Dark mode dividers only:** raised cream hairlines/separators/rings toward ~3:1 (WCAG 1.4.11 / Primer dark steps 7–8 / Material divider guidance). Soft Morandi kept; no resting card borders; light mode untouched.

## [1.16.0] — 2026-11-05

### Added
- **Today card (right):** keeps Notion preview rows (保持/學到/明日); adds compact holdings 彩蛋 + interactive to-do.
- **Today-card to-do demo:** visitors can add/check/remove to-dos. Stored only in `localStorage` + `ymzz_todos` cookie (60h `max-age`); items and store auto-purge after 60 hours. Note:「只存瀏覽器 · 60 小時後自動銷毀」. No server / signup DB.
- **Bottom spy 0–100:** section capsule shows live read % fill + number; dots stay clickable for jump.

### Changed
- **Top nav capsule:** never full-bleed. Screen 1 width = three hero cards (`--nav-hero-w`). Shrinks to `--content-w` only after the entire hero has scrolled past (not at 120px).
- **Font license re-check** in CREDITS.md — Fraunces / Inter / JetBrains Mono still SIL OFL-1.1 only; no new fonts.

## [1.15.1] — 2026-11-05

### Fixed
- **Holdings 彩蛋 card restored** (removed when Features bento was cut in v1.14.2). Compact broker-agnostic mock: VT 46% / QQQ 28% / ticker 16% / Cash 10%. Easter egg: page locale `zh-CN` **and** browser timezone UTC+8 (`Asia/Shanghai|Chongqing|Urumqi` or `Etc/GMT-8`, or offset −480) → `600519.SH`; otherwise `2330.TW`. No IBKR. Matches `--content-w` and no-rest-border value contrast.

## [1.15.0] — 2026-11-05

### Changed
- **Hero screen 1 = time urgency:** restored v1.2 live 24h dial (local zone, next-review arc, 07:00 UTC reminder). First viewport: dial + urgency copy + today page + 600→0 chip. Screen 2 begins when the reactbits nav starts shrinking.
- **One content width:** `--content-w` (= `--nav-content`). Every post-hero section/card matches the shrunk top nav width.
- **Value-contrast scale is king:** zero card borders at rest (no 1px rims / double edges). Depth via warm Morandi value steps (`--v-raised` / `--v-card` / `--v-inset`). Soft lift or focus-visible ring only on hover/focus/touch.
- **Dark today-card:** stronger ink on labels/numbers; week dots and `.daycard` use clearer value steps (no white blast); inner date box no dim rim.

### Kept
- Brand, four palettes, fonts, 600-day chapter→summary (no annihilate), section spy, donate copy contrast, OSS table, Feishu, zh-CN egg, reduced-motion.

## [1.14.2] — 2026-11-05

### Changed
- **Dark readability (暮靄/暮林):** raised `--line` / `--edge` / `--ink-3` so borders and labels clear WCAG-ish contrast without bumping font-weight (weight stays −1). Donate `#donateCopy` ghost → solid accent wash with visible hover/focus.
- **Date + week cohesion:** tightened `.dmo`→`.week` gap inside `.daycard`; `.dayp` uses flex-start + smaller gap so the date hero and week strip read as one unit.
- **Cut redundancy:** removed sync strip, marquee, The Loop, Features bento, FAQ twin OSS panel (vs table already covers OSS), FAQ trimmed to 3 (free / data / 600 chapter), dropped hero.identity (pillars cover it). Kept: hero+today mock, short benefits, short OSS vs, setup, donate, signup, minimal FAQ.
- **Section preview strip (Grail-inspired):** fixed bottom labelled dots (Hero → Benefits → OSS → Setup → FAQ → Join → Donate); IntersectionObserver highlights the active section. Complements top `%` readbar — strip = *what*, bar = *how far*. Reduced-motion + mobile (dots-only) safe.
- **Colour on the subject:** palette washes/glows sit behind the today mock (`.dayp`); quieted headp / join decorative glows.
- **Nav (reactbits-style):** at load full-bleed flush; on scroll (~120px) glass blur + shrinks to content width (`--nav-content`), pill radius. `--nav-p` decoupled from read `%`. Reduced-motion parks in contained glass state.

## [1.14.1] — 2026-11-05

### Changed
- **Calm urgency copy:** hero + benefits — a day you never review is a day you don’t get back; 600→0 is the chapter’s gentle clock. Static mock「本章還剩 599」chip (clearly labelled 示意 / mock, not a live user counter).
- README top rewritten as Trending hook. Added `.github/description-ready.txt`, `LAUNCH.md` (owner-only steps; no agent posting), social `site/og.png` (1200×630) wired to `og:image`.

## [1.14.0] — 2026-11-05

### Changed
- **Site as product, not brochure:** hero keeps today-page mock + one clear promise (blank review already waiting; yesterday already backed up). Benefits are outcomes — clarity daily, streak without willpower, data in 3 homes, $0 self-host.
- **Open-source superiority table:** honest rows vs Day One / Notion+Zapier / Obsidian DIY — cost, ownership, multi-end default, auto previous-day ingest, 600-day chapter → summary, no AI quota, MIT fork-and-own. No invented benchmarks.
- Cut duplicate Intro / Before-After / three-bullet Differentiation list in favour of Benefits + comparison table. Setup / FAQ / OSS / Join / Donate kept.
- Calm section rhythm; focus-visible; reduced-motion; CJK table line-height. Brand, four palettes, fonts, 600→0 summary, donate USDC Arbitrum One, Feishu optional, zh-CN A-share egg, no IBKR, no sticky How-it-works all unchanged.

## [1.13.1] — 2026-11-05

### Fixed
- **Mock cards hug content:** Notion template card (「值得寫的模板」) no longer stretches with an empty lower third — `align-self:start`, no `margin-top:auto` keyword footer desert. Section labels (01 保持 / 09 明日三件事) paired snug with body; CJK-friendly label letter-spacing. Same hug for other sparse feature tiles.
- **Donate QR caption:** breathing room between QR and「掃描 · Arbitrum One · USDC」; CJK-friendly caption placement.
- **Page rhythm:** restore calm breathing *between* sections (not overall tighter). Internal card layout stops when content is enough. Keeps Grail motion, fonts, palettes, 600-day chapter → summary framing (no annihilate).

## [1.13.0] — 2026-11-05

### Changed
- **Chapter framing (owner correction):** never “annihilate / 湮滅”. Each deploy runs **600 days of daily review**, then produces one **600-day summary（總結）**. Countdown 600→0 = days remaining until the summary; at 0 the daily loop **pauses / chapter closes**; redeploy starts the next chapter. Gate still enforces calendar days ≤600; comments, workflow email, READMEs, i18n, Differentiation, competitors, and product brief updated.
- **Site layout (Grail cadence):** fewer competing cards, tighter vertical rhythm, clearer hierarchy, denser card interiors, stronger one-axis flow. Soft reveals / hover with `cubic-bezier(.22,1,.36,1)`; `prefers-reduced-motion` safe. Fonts, four palettes, micro borders, read progress, fold, donate, Feishu, zh-CN A-share egg kept; IBKR still gone; no How-it-works sticky story.

### Site
- Official site v1.13.0 · screenshots `v17-*`.

## [1.12.0] — 2026-11-05

### Changed
- Lifespan messaging: **600→0 annihilate** (Bitcoin 21M analogy), not 0→600. First success starts with 600 remaining; hits 0 → gate stops. Redeploy = fresh window. Gate implementation unchanged (calendar days from first success ≤600).

### Added
- Site Differentiation foldable section (vs Day One / Notion / Zapier glue).
- Research notes for Trending push: `site-research/competitors.md` (outside or alongside brief).

## [1.11.2] — 2026-11-05

### Changed
- Holdings copy: removed IBKR; any-broker wording. zh-CN mock ticker easter egg `600519.SH` (others keep `2330.TW`).

## [1.11.1] — 2026-11-05

### Removed
- Entire 「運作方式」 / How it works sticky story section (`#flow`, 05 — steps 01–05). Nav link and exclusive i18n keys removed.

## [1.11.0] — 2026-11-05

### Added
- Product framing site-wide + READMEs (all locales): multi-end sync · daily review · auto previous-day ingest · day 0→600 annihilate unless newer version deployed. Setup voice = every forker is a product user.
- Grail-inspired motion feel (vanilla): soft rise reveals, stagger, hover lift; `prefers-reduced-motion` safe.
- Foldable secondary cards (chevron); phone starts secondary collapsed; tighter card padding.

### Kept
- Fonts locked, four palettes, no black cards, micro edges, read progress, full-bleed, donate, Feishu, signup, MIT.

## [1.10.0] — 2026-11-05

### Added
- Top reading-progress bar (`--read-p`) that fills with scroll position (separate from nav frost). Reduced-motion still shows position.
- Mobile nav drawer (hamburger) with Escape / link-close.

### Changed
- Four palettes locked and never mixed: 雲箋 (blue/pink/purple/beige), 陶土 (tea/green/brown/beige), 暮靄, 暮林. Soft glows use active palette only.
- Micro value-contrast edges only (same-family shade/tint); one layer; concentric radii.
- Full-bleed stage: body padding removed; content uses `--edge-x` gutters so hero/bento span the viewport.
- Responsive breakpoints hardened (phone ≤48rem / tablet ≤68rem / wide ≥90rem).
- Fonts locked forever: Inter UI · Fraunces display · JetBrains Mono code · tabular lining nums (`config.js` + CREDITS).

### Kept
- No charcoal/black cards, donate (Arbitrum USDC), 600-day, Feishu, signup, scroll-nav frost, MIT.

## [1.9.1] — 2026-11-05

### Fixed
- Restored soft pastel 光斑 (pink / blue / purple / sage radial glows) on hero and feature cards — kept, not stripped.
- Calendar today marker: soft lilac→sky pastel fill (never charcoal / `--cta` near-black).
- Git sync (`.fc3`) card: light paper + lilac/sky wash (never dark terminal fill).
- Marquee/ticker: light paper strip with soft pastel wash + ink text (never dark banner).

### Kept
- No black backgrounds, one-layer soft edges, concentric radii, Inter UI + tabular nums, dark weight −1, 4 palettes, donate, 600-day, Feishu, signup, MIT.

## [1.9.0] — 2026-11-05

### Changed
- Soft Morandi paper surfaces site-wide (雲箋/陶土 light; 暮靄/暮林 warm dark). Deleted black / charcoal / near-black card fills.
- Value-contrast scale (維對比色階): depth via shade/tint of the same hue family; at most one soft same-family edge; no coloured borders.
- Concentric nested radii (`--Ri = --R − pad`); no multi-rim nesting.
- UI typography unified to Inter; Fraunces kept for display headlines only. Tabular lining numerals everywhere. Dark mode font-weight one step down.
- How-it-works / stage / marquee / code / git tiles: soft paper, never ink fills.

### Kept
- Four wenrun palettes, i18n + RTL, Arbitrum USDC donate, 600-day gate, signup, Feishu sink, scroll-nav opacity, MIT credit.

## [1.8.0] - 2026-11-05
### Changed
- Site layout: one consistent vertical axis (centered column, shared paper family) — no left/right theme flip; fewer 1px borders, soft tonal surfaces and spacing instead.
- **How it works**: replaced the clashing dark stage with a light MIT-like paper wash (soft accent gradients); numbers and copy stay dark ink. Dark theme uses warm Morandi surfaces, not a black well.
- Hero stacks headline → today's page (same reading order on all breakpoints).
- Nav bar: `--nav-p` scroll progress (rAF) drives background opacity and blur from near-transparent at the top to frosted at the bottom; `prefers-reduced-motion` keeps a steady bar.

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
