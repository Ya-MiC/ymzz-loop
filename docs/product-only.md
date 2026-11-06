# Product-only branch (no showcase site)

`main` carries both the **automation product** and the **marketing site** (`site/` → GitHub Pages).

Visitors who click **Get the automation** are sent to the **`product` branch**, which is rebuilt from `main` on every push (workflow `sync-product.yml`) and **excludes**:

- `site/` (the showcase web page)
- `.github/workflows/pages.yml`

## How to take the product without the website

1. Open https://github.com/Ya-MiC/ymzz-loop/tree/product  
2. **Code → Download ZIP**, or  
   `git clone --depth 1 --branch product --single-branch https://github.com/Ya-MiC/ymzz-loop.git`
3. Push that tree to **your** empty repository as `main`.

Do **not** use GitHub “Use this template” / fork of `main` if you want to avoid the site — that always copies the default branch as a whole.

The live demo site remains at https://ya-mic.github.io/ymzz-loop/ (read-only).
