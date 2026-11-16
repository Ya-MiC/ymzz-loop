# Deploy the Bingce site (do not run until authorized)

Live site: https://bingce.yanmingx0215.filegear-sg.me/

Existing Worker (inspected read-only, 16 Nov 2026):

- Name: `ymzz-bingce-site`
- Custom domain: `bingce.yanmingx0215.filegear-sg.me` (production, enabled)
- `compatibility_date`: `2026-11-01`
- Bindings: none
- `has_assets`: false (the current live script inlines the static files in one Worker module)

Static files to publish are in `public/`. `wrangler.jsonc` names the same Worker and points `assets.directory` at `./public`. The live Worker was last published with the inlined-module method in `gen2.mjs`, not a Workers Assets binding. Prefer that same method unless a change of deploy shape is explicitly reviewed:

```sh
cd bingce-site
node gen2.mjs          # writes worker.js from public/ (gitignored)
# Then deploy worker.js to the existing script name ymzz-bingce-site.
# Do not create a new Worker, change the custom domain, or publish releases.
```

A `wrangler deploy` that uploads `public/` as Workers Assets would change `has_assets` and should not be used without review. This file is only the repeatable preparation; do not deploy until authorized.
