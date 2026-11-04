# 設計與產品研究 Research (2026-11-04 首爾時間 (UTC+9))

## 設計與動效參考 Design & motion
| 來源 | 觀察 | 我們採用 |
|---|---|---|
| [Awwwards · Pastel colors collection](https://www.awwwards.com/Mixallo/collections/pastel-colors/)（1,400+ 站，2026 年多個 Honorable Mention / SOTD）| 粉彩 + 大量留白 + 大字排印，動效少而準 | 「溫潤」語言：暖紙白底、粉彩色塊、無粗框 |
| [Awwwards · Love Love Love You Events](https://www.awwwards.com/sites/love-love-love-you-events) | neo-romantic 粉彩、極簡、動畫點綴 | Hero 慢速漂浮色塊（mesh blobs）|
| [React Bits](https://reactbits.dev/c/text-animations)（215+ 免費元件）| Blur Text、Split Text、Scroll Reveal、Count Up、Gradient Text | 以原生 CSS/JS 重現：標題逐字模糊淡入、捲動揭示、數字遞增、漸層字（零依賴，不需 React 建置）|
| motionsites（AI 動態網站範例集）| 首屏動態背景 + 單一 CTA、分段捲動敘事 | 首屏一句話 + 兩個 CTA，下方「流程」捲動敘事 |

原則：全部動效遵守 `prefers-reduced-motion`；不用 WebGL、不載外部字型/追蹤，保持 Lighthouse 高分與零成本。

## 產品創意 Product ideas
| 來源 | 觀察 | 對 ymzz-notion 的啟發 |
|---|---|---|
| GitHub · [perinchiang/notion-automated-diary](https://github.com/perinchiang/log2notion) | 用 Actions 每日建日記頁、字數回寫 | 驗證「Actions + Notion 日記」需求；我們多了持倉、Sheet、信件與任意時區 |
| GitHub · [henu-wang/decision-journal-template](https://github.com/henu-wang/decision-journal-template) | 決策日誌，強調結果與決策品質分開 | 模板保留「決策 Decisions」欄位，未來可加 30 天回顧 |
| GitHub · notion-lifeos-skill（21★）| PARA + Make Time 日記、雙語 README | 雙語 README 與一鍵複製模板很重要 |
| Product Hunt · [Daily Journal (Notion)](https://www.producthunt.com/products/daily-journal-3)（#3 Day Rank，付費）| 一頁追蹤習慣/財務/任務 | 我們免費開源 + 自動化，是差異點 |
| Dev.to · Flowplan（2026-10 開源 Notion 替代）| 自架、無追蹤、資料可攜 | 強調「資料在你自己的帳號，不經第三方」 |

## 上榜策略 Trending checklist
1. README 首屏：橫幅 + 一句話價值 + GIF/截圖 + 3 步上手。
2. 「Use this template」按鈕、官網互動教學，降低第一次成功時間（目標 15 分鐘）。
3. Topics：`notion` `github-actions` `journal` `daily-review` `google-sheets` `trading-journal` `productivity` `kpt` `automation` `zero-cost`。
4. 發佈 v1.0.0 Release、在 Product Hunt / V2EX / 少數派 / r/Notion 同步發文（需使用者本人發佈）。
