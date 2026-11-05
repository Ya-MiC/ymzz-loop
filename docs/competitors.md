# ymzz-loop · 競品與差異化 Competitors & differentiation

更新日期 Updated: 2026-11-05 (Asia/Seoul) · 供今日衝 GitHub Trending 使用

## One-liner / 一句話

**繁中：** 一次部署最多 600 次每日復盤，從 600 倒数到 0 後湮滅——像比特幣的硬上限；Notion 書寫，Sheets + 自有 GitHub（可選飛書）自動攝取前一日。

**EN:** One deploy = 600 daily reviews max, counting down **600→0** then annihilate — a hard cap like Bitcoin’s 21M; Notion to write, Sheets + your GitHub (+ optional Feishu) auto-ingest yesterday.

---

## 競品表 Competitor table

| Name | Link | Model | Price (indicative) | What they do | Gap vs ymzz-loop |
|---|---|---|---|---|---|
| **Day One** | https://dayoneapp.com/plans/ | Consumer journal SaaS | Free Basic; Silver ~$49.99/yr; Gold ~$74.99/yr (2026) | Polished daily journal, sync, media, AI on Gold | Closed vault; no Notion→Sheets→Git multi-end; no hard 600→0 scarcity; paid sync/AI |
| **Reflect** | https://reflect.app/ | Notes + daily notes | Free on Mac; paid iPhone/iPad sub | Local Markdown, backlinks, optional BYOK AI | Notes graph, not review→Sheets archive loop; no Actions self-host product cap |
| **Capacities** | https://capacities.io/ | Object-based PKM | Freemium / Pro sub | Daily notes + objects | SaaS PKM; not fork-owned Git+Sheets sinks |
| **Obsidian Daily Notes** | https://obsidian.md/ | Local MD + plugins | App free; Sync/Publish paid | Daily notes in vault | You DIY sync; no baked Notion email + Sheets + 600→0 gate |
| **Notion journal templates** | https://www.notion.com/templates | Template in Notion | Free–Notion AI paid | Manual daily pages in Notion | No auto page+email+yesterday ingest to Sheets/Git; no annihilate identity |
| **Notion + Zapier** | https://zapier.com/apps/notion/integrations | Automation glue | Free ~100 tasks/mo (2-step); Pro from ~$19.99/mo annual (2026) | Glue Notion↔other apps | Task metering cost; not a productized daily-review loop with hard cap |
| **Notion + Make** | https://www.make.com/ | Automation glue | Free ~1k credits/mo; Core from ~$9/mo (2026) | Visual scenarios | Same as Zapier — rent + complexity; no MIT template product |
| **GitHub Actions Notion syncers** | e.g. community Actions | DIY scripts | $0 Actions (within free minutes) | One-off Notion/Git sync | Rarely: email + Sheets + holdings + Feishu + **productized 600→0** lifespan |
| **飛書 / Lark journals** | https://www.feishu.cn/ | Suite + Bitable | Free tier / org plans | Docs/Bitable daily logs inside Feishu | Vendor lock; ymzz-loop treats Feishu as **optional sink**, not the cage |
| **Apple Journal / 系統日記** | OS built-in | On-device | Free | Personal journal | No multi-end Sheets+Git product loop |

Sources: Day One plans https://dayoneapp.com/plans/ · Reflect https://reflect.app/ · Zapier Notion integrations https://zapier.com/apps/notion/integrations · Capacities https://capacities.io/ · Obsidian https://obsidian.md/

---

## 差異化論點 Differentiation thesis

1. **產品身分 = 硬上限 600→0 湮滅**（類比特幣 2100 萬）：稀缺、可敘事、可截圖。不是「無限訂閱日記」。
2. **多端預設**：Notion（寫）→ Google Sheets + **你自己的** GitHub Markdown（+ 可選飛書），每次自動攝取前一日。
3. **$0 自託管**：跑在使用者 Fork 的 GitHub Actions；無 SaaS 租金、無 AI 配額。
4. **MIT 產品模板**：每一位 Fork 者都是產品使用者；設定文檔用人稱「你」。
5. **可驗證稀缺**：gate 在首次成功後計日，到上限停排程——訊息與實作一致（日曆天 ≤600；文案講 600→0 倒数）。

---

## 今日衝 GitHub Trending · Checklist（Asia/Seoul · 可數小時內做完）

### A. Repo 鉤子（前 10 行就必須打中）

1. [ ] README 首屏加粗：**Hard 600→0 annihilate / 硬上限 600→0 湮滅** + Bitcoin 21M 一句類比。  
2. [ ] Badge 列加：`600→0` · `$0/mo` · `MIT` · `Actions`（已有可微調文案）。  
3. [ ] Topics（Settings → Topics）：`notion`, `daily-review`, `github-actions`, `google-sheets`, `feishu`, `obsidian-alternative`, `self-hosted`, `bitcoin`（敘事鉤）`productivity`.  
4. [ ] Description 一行：`Daily review loop · Notion→Sheets+Git · hard 600→0 annihilate · MIT · $0`.  
5. [ ] Social preview：官網 hero 截圖（含 pillars「600→0」）設為 Open Graph（`site/og.svg` / README banner）。

### B. 可點擊證據

6. [ ] 官網 https://ya-mic.github.io/ymzz-loop/ 已部署最新（含 Differentiation 摺疊卡）。  
7. [ ] 15 秒螢幕錄影／GIF：Actions 綠勾 → Notion 新頁 → Sheet 多一行（放 README 頂）。  
8. [ ] `CREDITS.md` + MIT 清晰；商標免責保留。

### C. 分發（今日可發）

9. [ ] **X / 推特**：繁中 + EN 各一則，置頂 600→0 類比 + repo 連結 + 官網。  
10. [ ] **Show HN**（https://news.ycombinator.com/submit）：標題例 `Show HN: ymzz-loop – Notion daily review with a hard 600→0 cap (MIT)`。  
11. [ ] **Product Hunt**（https://www.producthunt.com/）：Maker 帳號排程；首評寫清 vs Day One / Zapier。  
12. [ ] 中文圈：V2EX（https://www.v2ex.com/）、即刻／小紅書開發者向、Telegram/Discord 開源群——貼「比特幣式 600 天上限」鉤子，勿純廣告。  
13. [ ] 請 3–5 位朋友 **Star + 真實 Issue/討論**（Trending 看互動，不只 star）。  
14. [ ] 英文社群：r/Notion、r/ObsidianMD、r/selfhosted ——遵守版規，開源分享語氣。

### D. 度量

15. [ ] 今晚看：Stars 曲線、GitHub Traffic、官網 referrer、Clone。明早依數據補第二波推文。

---

## 風險與誠實邊界

- Trending **無法保證**；鉤子 + 真實演示 + 多渠道同日聲量是可控部分。  
- 600→0 是**產品敘事與閘門行為**；實作仍為自首次成功起的日曆天上限（見 `scripts/gate.mjs`），勿宣稱鏈上發行。  
- 競品價格會變；上表為 2026-11 檢索快照，發布前再點開連結確認。
