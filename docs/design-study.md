# Design study: quynh.moe & grail-app.com (2026-11-04)

Method: fetched HTML + CSS with curl, read the `:root` tokens and the most frequent declarations, and took headless Chrome screenshots at 1440×900 and 390×844 (scrolled in 4 steps). Notes are measurements and principles only — no code, text or assets were copied.

## quynh.moe (Awwwards: quynh-folio)
| Aspect | Observed |
|---|---|
| Stack | Vite build, 2 CSS files (13 KB + 71 KB), self-hosted **Helvetica Now Display Bold** + **JetBrains Mono** woff2 (preloaded) |
| Frame | Page is a warm grey frame `rgb(230,225,223)` with **two inset panels** (~6px gutter, ~12px radius); the left panel is sticky, the right one scrolls. Everything sits *inside* framed surfaces — cards, but as architecture |
| Living data | Left panel is a live clock drawn as a radial fan of 60 minute ticks with mono numerals; the current minute is highlighted in a single accent color. Information as ornament |
| Type | Display headings at `letter-spacing:-.02em/-.03em`; all UI labels in **mono, uppercase, 12px, wide tracking** (`--text-mono-12`) |
| Motion | `transform 1.4s cubic-bezier(.22,1,.36,1), opacity .9s` reveals; staggered `transition-delay: calc(.2s + var(--i)*.05s)`; content in the right panel crossfades on scroll with a vertical "wheel" list (prev/current/next) |
| Imagery | Full-bleed photography inside the panel, warm grain; text sits on top in small mono labels |
| Contrast | Near-black on off-white; only one accent (orange) used sparingly |

## grail-app.com
| Aspect | Observed |
|---|---|
| Stack | Vite, self-hosted **Switzer Variable** (sans) + **PP Pangaia Light** (display serif) |
| Tokens | `--landing-radius: 2rem`, `--landing-radius-inner: calc(2rem - 6px)` (**nested bezel**: a card inside a card with a 6px rim), `--landing-shadow: 0 20px 40px -15px #18181b0f` (very soft, 6% alpha), hover shadow 10%, border `#18181b0f`, warm grounds `#fafaf8` / `#f0ede6`, glass `#fffc` + 20px blur |
| Composition | Black stage, enormous light-weight serif headline (≈ 12vw) that **cards overlap**; product cards float in 3D at different depths and tilts; a radial pastel glow (lilac) blooms behind on scroll; a floating pill dock with the CTA stays at the bottom |
| Cards | Real product UI inside every card (quest text, avatars, timers) — never an empty icon card |
| Motion | Scroll-linked 3D rotation of the card cloud, glow scale, giant countdown numerals behind cards |

## Takeaways applied to ymzz-notion
1. **Frame + panels**: a warm ground with inset rounded panels instead of full-width stripes; nested bezel cards (outer rim 6px, inner radius = outer − rim).
2. **Living data**: a live 24-hour dial in the hero showing the visitor's local time and the next reminder (default 07:00 UTC) — the product's core idea made visible.
3. **Real content in every card**: the bento grid shows the Notion page, email, Sheet, Git log, a time-zone clock and code — not icons.
4. **Depth**: floating, slightly rotated mockups overlapping the headline; soft 6–10% shadows, 1px hairline borders, subtle grain (SVG noise), radial pastel glows from the brand palette.
5. **Type**: one expressive display serif (Fraunces, OFL, optical size) at very large size and tight tracking for Latin; CJK uses system serif with 0 tracking; mono uppercase micro-labels (JetBrains Mono, OFL) for metadata.
6. **Sticky storytelling**: “How it works” on a dark stage: the left side is sticky with a big step numeral and progress; steps scroll on the right and light up.
7. **Motion**: 0.9–1.4s ease-out reveals with index-based stagger; pointer tilt (≤6°) + glow on cards for fine pointers only; everything off under `prefers-reduced-motion`.
8. **Restraint**: one dark stage, the rest warm paper; accents only from the 8 brand colors.
