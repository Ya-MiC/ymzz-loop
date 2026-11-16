# Official websites live on the product branch

`product` is the source of truth for the 稟冊 / ymzz-loop product, including both official website faces:

- `site/` → GitHub Pages at https://ya-mic.github.io/ymzz-loop/ (daily review showcase and the ~10 minute start guide)
- `bingce-site/public/` → the Bingce / 稟冊 site at https://bingce.yanmingx0215.filegear-sg.me/ (desktop app, download status, first-run onboarding)

They are one product, not an old site and a new site. The Pages face is the daily review / start guide, not a deprecated earlier version.

The Pages deploy workflow is `.github/workflows/pages.yml` on `product`. It publishes `site/` to the existing GitHub Pages URL. The Bingce Worker `ymzz-bingce-site` is deployed separately from `bingce-site/` (see `bingce-site/DEPLOY.md`); that step is authorized when the site files are ready, not automatically by this workflow.

## How to take the product

1. Open https://github.com/Ya-MiC/ymzz-loop/tree/product
2. **Code → Download ZIP**, or
   `git clone --depth 1 --branch product --single-branch https://github.com/Ya-MiC/ymzz-loop.git`
3. Push that tree to **your** empty repository as `main`.

The live daily-review site remains at https://ya-mic.github.io/ymzz-loop/. The live Bingce site remains at https://bingce.yanmingx0215.filegear-sg.me/.
