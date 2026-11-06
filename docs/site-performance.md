# Site performance notes — v1.14.0

Measured locally (headless Chrome, `?nopre&lang=en`) 2026-11-05 Asia/Seoul.

## Lighthouse (local static server)

| Category | Score |
|---|---|
| Performance | 87 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |

- FCP ≈ 1.5s · LCP ≈ 3.0s · TBT ≈ 80ms (local machine; Pages CDN will vary).
- CLS still dominated by hero/date count-up + preloader-free first paint; mock card reserves space.

## Payload (approx, uncompressed)

- `site/` total ≈ 472 KB (three self-hosted OFL fonts dominate).
- `index.html` ≈ 25 KB · `style.css` ≈ 113 KB · `app.js` ≈ 21 KB.
- No runtime framework, no build step, no external JS/CSS CDN.

## Accessibility

- Color-contrast audit clean after label/primary-action ink fixes.
- `:focus-visible` outlines; comparison table is a real `<table>` with row/col headers and a labelled scroll region.
- `prefers-reduced-motion` disables reveal/hover motion.
