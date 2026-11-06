# ymzz-loop · 競品與差異化 Competitors & differentiation

更新日期 Updated: 2026-11-05 (Asia/Seoul)

## One-liner / 一句話

**繁中：** 一次部署＝一段 600 天篇章的每日復盤；倒數 600→0 後產出 **600 天總結**、每日迴圈暫停；Notion 書寫，Sheets + 自有 GitHub（可選飛書）自動攝取前一日。

**EN:** One deploy = one **600-day chapter** of daily review; countdown **600→0**, then a **600-day summary** and the daily loop pauses; Notion to write, Sheets + your GitHub (+ optional Feishu) auto-ingest yesterday.

---

## 競品表 Competitor table

| Name | Link | Model | Price (indicative) | What they do | Gap vs ymzz-loop |
|---|---|---|---|---|---|
| **Day One** | https://dayoneapp.com/plans/ | Consumer journal SaaS | Free Basic; Silver ~$49.99/yr; Gold ~$74.99/yr (2026) | Polished daily journal, sync, media, AI on Gold | Closed vault; no Notion→Sheets→Git multi-end; no fixed 600-day chapter → summary |
| **Reflect** | https://reflect.app/ | Notes + daily notes | Free on Mac; paid iPhone/iPad sub | Local Markdown, backlinks, optional BYOK AI | Notes graph, not review→Sheets archive loop; no Actions self-host chapter length |
| **Capacities** | https://capacities.io/ | Object-based PKM | Freemium / Pro sub | Daily notes + objects | SaaS PKM; not fork-owned Git+Sheets sinks |
| **Obsidian Daily Notes** | https://obsidian.md/ | Local MD + plugins | App free; Sync/Publish paid | Daily notes in vault | You DIY sync; no baked Notion email + Sheets + 600-day chapter gate |
| **Notion journal templates** | https://www.notion.com/templates | Template in Notion | Free–Notion AI paid | Manual daily pages in Notion | No auto page+email+yesterday ingest to Sheets/Git; no chapter→summary identity |
| **Notion + Zapier** | https://zapier.com/apps/notion/integrations | Automation glue | Free ~100 tasks/mo (2-step); Pro from ~$19.99/mo annual (2026) | Glue Notion↔other apps | Task metering cost; not a productized daily-review loop with chapter length |
| **Notion + Make** | https://www.make.com/ | Automation glue | Free ~1k credits/mo; Core from ~$9/mo (2026) | Visual scenarios | Same as Zapier — rent + complexity; no MIT template product |
| **GitHub Actions Notion syncers** | e.g. community Actions | DIY scripts | $0 Actions (within free minutes) | One-off Notion/Git sync | Rarely: email + Sheets + holdings + Feishu + **productized 600-day chapter** |
| **飛書 / Lark journals** | https://www.feishu.cn/ | Suite + Bitable | Free tier / org plans | Docs/Bitable daily logs inside Feishu | Vendor lock; ymzz-loop treats Feishu as **optional sink**, not the cage |
| **Apple Journal / 系統日記** | OS built-in | On-device | Free | Personal journal | No multi-end Sheets+Git product loop |

Sources: Day One plans https://dayoneapp.com/plans/ · Reflect https://reflect.app/ · Zapier Notion integrations https://zapier.com/apps/notion/integrations · Capacities https://capacities.io/ · Obsidian https://obsidian.md/

---

## 差異化論點 Differentiation thesis

1. **產品身分 = 600 天篇章 → 總結**：一次部署跑滿 600 天每日復盤，倒數 600→0 後暫停並收束成一篇總結；部署新版＝下一章。不是「無限訂閱日記」，也不是毀滅敘事。
2. **多端預設**：Notion（寫）→ Google Sheets + **你自己的** GitHub Markdown（+ 可選飛書），每次自動攝取前一日。
3. **$0 自託管**：跑在使用者 Fork 的 GitHub Actions；無 SaaS 租金、無 AI 配額。
4. **MIT 產品模板**：每一位 Fork 者都是產品使用者；設定文檔用人稱「你」。
5. **可驗證章節長度**：gate 在首次成功後計日，到上限暫停排程以便總結——訊息與實作一致（日曆天 ≤600；文案講 600→0 倒數至總結）。

---

## 今日衝 GitHub Trending · Checklist（Asia/Seoul）

### A. Repo 鉤子（前 10 行就必須打中）

1. [ ] README 首屏加粗：**600-day chapter → summary / 600 天篇章 → 總結**。
2. [ ] Badge 列：`600→0` · `$0/mo` · `MIT` · `Actions`。
3. [ ] Topics：`notion`, `daily-review`, `github-actions`, `google-sheets`, `feishu`, `obsidian-alternative`, `self-hosted`, `productivity`.
4. [ ] Description：`Daily review loop · Notion→Sheets+Git · 600-day chapter → summary · MIT · $0`.
5. [ ] Social preview：官網 hero（含 pillars「600-day chapter → summary」）。

### B. 可點擊證據

6. [ ] 官網 https://ya-mic.github.io/ymzz-loop/ 已部署最新（含 Differentiation）。
7. [ ] 15 秒螢幕錄影／GIF：Actions 綠勾 → Notion 新頁 → Sheet 多一行。
8. [ ] `CREDITS.md` + MIT 清晰；商標免責保留。

### C. 分發

9. [ ] **X**：繁中 + EN 各一則，置頂 600 天篇章→總結 + repo + 官網。
10. [ ] **Show HN**：`Show HN: ymzz-loop – Notion daily review as a 600-day chapter (MIT)`.
11. [ ] **Product Hunt**：首評寫清 vs Day One / Zapier。
12. [ ] 中文圈：V2EX、即刻／小紅書開發者向——「600 天一章、一章一總結」鉤子。
13. [ ] 請 3–5 位朋友 Star + 真實 Issue。
14. [ ] 英文：r/Notion、r/ObsidianMD、r/selfhosted ——遵守版規。

### D. 度量

15. [ ] Stars、Traffic、官網 referrer、Clone。

---

## 風險與誠實邊界

- Trending **無法保證**。
- 600→0 是**章節長度與閘門行為**；實作仍為自首次成功起的日曆天上限（見 `scripts/gate.mjs`）。到 0 是暫停以便總結，不是銷毀資料。
- 競品價格會變；上表為 2026-11 檢索快照。
