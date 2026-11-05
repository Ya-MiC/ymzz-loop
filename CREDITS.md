# 致謝 · Credits

ymzz-loop 使用的字體、圖標與函式庫皆為可商用開源授權（SIL OFL-1.1 / MIT / Apache-2.0 / MIT-0）。  
下列清單已於 2026-11-05 核對來源與授權頁；若你發行付費版或上架 App Store，請一併保留本檔或等價致謝畫面。

All fonts, icons and libraries below allow commercial use under their licenses. Keep this notice (or an equivalent About screen) when you redistribute.

---

## 網站字體 · Site fonts（self-hosted · `site/fonts/`）

| 資產 | 授權 | 來源 | 商用 |
|---|---|---|---|
| **Fraunces** (variable, Latin opsz subset via Fontsource) | [SIL Open Font License 1.1](https://openfontlicense.org/) | https://github.com/undercasetype/Fraunces · 全文 `site/licenses/Fraunces-OFL.txt` | ✅ |
| **Inter** (variable, Latin wght subset via Fontsource) | SIL OFL-1.1 | https://github.com/rsms/inter · `site/licenses/Inter-OFL.txt` | ✅ |
| **JetBrains Mono** (variable, Latin) | SIL OFL-1.1 | https://github.com/JetBrains/JetBrainsMono · `site/licenses/JetBrains-Mono-OFL.txt` | ✅ |

CJK / 韓文 / 阿拉伯文回退系統字（若已安裝則優先 Noto）；**未打包** Noto 字檔進倉庫，故無額外 OFL 嵌入義務。若你自行嵌入 Noto，請另附其 OFL。

## 圖標 · Icons

| 資產 | 授權 | 來源 | 商用 |
|---|---|---|---|
| **Tabler Icons** 3.50.0（18 個 inline SVG） | MIT | https://tabler.io/icons · https://github.com/tabler/tabler-icons · `site/licenses/tabler-icons-LICENSE.txt` | ✅ |

## 執行時依賴 · Runtime (GitHub Actions)

| 套件 | 授權 (SPDX) | 來源 | 商用 |
|---|---|---|---|
| `@notionhq/client` | MIT | https://github.com/makenotion/notion-sdk-js | ✅ |
| `notion-to-md` | MIT | https://github.com/souvikinator/notion-to-md | ✅ |
| `googleapis` | Apache-2.0 | https://github.com/googleapis/google-api-nodejs-client | ✅ |
| `nodemailer` | MIT-0 | https://github.com/nodemailer/nodemailer | ✅ |

飛書 / Lark 目的地使用官方 HTTPS Open API（無額外 SDK 依賴）。


## 捐款 QR · Donate QR (static asset)

| 資產 | 授權 | 來源 | 商用 |
|---|---|---|---|
| `site/donate-usdc-arb.svg` | 產出物隨本專案 MIT 散布；**產生工具** [segno](https://github.com/heuer/segno) 1.6.x 為 **BSD-3-Clause**（僅離線產生靜態 SVG，**未**打包進瀏覽器執行） | https://github.com/heuer/segno · https://pypi.org/project/segno/ | ✅ |

QR 內容為收款地址原文，無外部 API、無錢包連線腳本。

## 本專案授權 · This project

| | |
|---|---|
| 程式碼 Code | **MIT** · 見 [`LICENSE`](LICENSE) · © 2026 YanMing Cao |
| 品牌名與標誌 | 「晏銘湛箴」「ymzz-loop」與 logo **不**在 MIT 授權範圍內（見 `TRADEMARK.md`） |

MIT 明文允許「sell copies of the Software」——你可以販售本軟體或其衍生服務，條件是保留版權與許可聲明。詳見變現筆記（不在倉庫內的研究檔可由作者另行提供）。

## 未引入 · Explicitly not included

未嵌入 React Bits、GSAP、Awwwards 獲獎站原始碼或任何授權不明的素材；動效均以原生 CSS / 自寫 JS 重做。  
No React Bits / GSAP / award-site source is vendored.

## 更多 · See also

- [`THIRD_PARTY.md`](THIRD_PARTY.md) — 精簡第三方表  
- [`site/licenses/`](site/licenses/) — OFL / MIT 全文  
- [`docs/feishu.md`](docs/feishu.md) — 飛書 sink 設定  

核對日期 Checked: 2026-11-05 (Asia/Seoul).
