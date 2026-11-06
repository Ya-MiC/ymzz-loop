# Third-party notices

Full bilingual credits: **[CREDITS.md](CREDITS.md)** (致謝).

Checked 2026-11-05.

| Name | Version | License (SPDX) | URL | Used in |
|---|---|---|---|---|
| Tabler Icons | 3.50.0 | MIT | https://tabler.io/icons | `site/icons.svg` (18 icons inlined); license: `site/licenses/tabler-icons-LICENSE.txt` |
| Fraunces (variable, latin opsz subset via Fontsource 5.3.0) | 2020 | OFL-1.1 | https://github.com/undercasetype/Fraunces | `site/fonts/fraunces.woff2`; `site/licenses/Fraunces-OFL.txt` |
| Inter (variable, latin wght subset via Fontsource 5.3.0) | 4.x | OFL-1.1 | https://github.com/rsms/inter | `site/fonts/inter.woff2`; `site/licenses/Inter-OFL.txt` |
| JetBrains Mono (variable, latin via Fontsource 5.3.0) | 2.x | OFL-1.1 | https://github.com/JetBrains/JetBrainsMono | `site/fonts/jetbrains-mono.woff2`; `site/licenses/JetBrains-Mono-OFL.txt` |
| @notionhq/client | ^2.2 | MIT | https://github.com/makenotion/notion-sdk-js | Actions runtime |
| notion-to-md | ^3.1 | MIT | https://github.com/souvikinator/notion-to-md | Actions runtime |
| googleapis | ^144 | Apache-2.0 | https://github.com/googleapis/google-api-nodejs-client | Actions runtime |
| nodemailer | ^6.9 | MIT-0 | https://nodemailer.com | Actions runtime |

The website loads no fonts, scripts or styles from third parties; Latin fonts are self-hosted (≈150 KB total); CJK/Arabic use system fonts (Noto if installed). No React Bits, GSAP or award-site code is included; effects are re-implemented.

| Feishu / Lark Open API | — | proprietary API ToS (no SDK vendored) | https://open.feishu.cn/ | optional sink `scripts/sinks/feishu.mjs` |
