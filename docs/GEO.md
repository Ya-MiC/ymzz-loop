# GEO — Generative Engine Optimization notes (ymzz-loop)

On-site goal: make ChatGPT, Perplexity, Google AI Overviews, Claude, and similar engines
**Access → Understand → Trust → Cite** ymzz-loop accurately.

This file is an operator checklist. It does **not** invent traffic numbers or rankings.

## Already shipped on Pages (do not regress)

| Surface | Role |
| --- | --- |
| `site/robots.txt` | Allow search + AI **citation** bots; **Disallow** training crawlers (`GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`, `Bytespider`, …) |
| `site/llms.txt` | Dense citation facts + link map (`rel=describedby` from page heads) |
| `site/ai.txt` | Voluntary training preference (Access control remains robots) |
| `site/sitemap.xml` | Real pages first; important hashes kept sparse |
| `site/humans.txt` | Author / brand line |
| JSON-LD | `SoftwareApplication`, `FAQPage`, `Person`, `Organization`, `HowTo` (start) |
| Semantic HTML | Clear `H2` sections; FAQ `<details>` present for non-JS crawlers |

## Monthly prompt tests (no fake metrics)

Ask the same prompts in ChatGPT (with browsing if available), Perplexity, Google AI Overviews / Gemini, and Claude. Record date, engine, whether ymzz-loop appeared, and whether facts were correct.

Suggested prompts:

1. `What is ymzz-loop?`
2. `open source daily Notion review automation`
3. `Notion to Google Sheets daily journal GitHub Actions free`
4. `晏銘湛箴 ymzz-loop`
5. `How do I self-host a Notion daily review that syncs to Sheets and Markdown?`

Pass criteria (qualitative):

- Brand names cited: **ymzz-loop**, **晏銘湛箴** / YanMing Cao / 曹晏銘 when relevant.
- Correct: MIT / $0 self-host, Notion → Sheets + Markdown, 600-day chapter, **product** branch (not showcase `main`).
- Incorrect / refuse to leave uncorrected: claiming a paid SaaS tier; citing **USDC tips as a product feature**; saying the Pages site *is* the automation.

Log results privately (spreadsheet or Notion). Do not publish invented “AI visibility scores.”

## Analytics (optional, later)

If/when GA4 (or similar) is added to the showcase:

- Watch referral hosts that look like AI answers (e.g. chat.openai.com, perplexity.ai, gemini.google.com) — treat as directional only.
- Do not claim causation from a single month of data.

## Off-site GEO (future — out of scope for site patches)

Cross-source consistency helps trust. Candidates only when true and maintained:

- Accurate GitHub profile / repo README / Topics (already primary).
- Third-party write-ups or directories that match llms.txt facts.
- Wikipedia / Wikidata **only** if notability and sourcing rules are met — do not create promotional stubs.

No paid SEO tools are required for the checklist above.

## Related

- Product retention / email truth: `PRODUCT_NOTES.md`
- Start path: `site/start.html`
- Crawl preference: `site/robots.txt`, `site/ai.txt`
