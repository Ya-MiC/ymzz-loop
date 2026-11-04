# ymzz-notion · 每日復盤 Daily Review

每天 **07:00 首爾時間 (UTC+9)** GitHub Actions 自動：
1. 在 Notion 建今天的空白復盤頁（含 ①–⑩ 段落）/ creates today's blank review page in Notion
2. 寄信給你，附今日頁面連結 / emails you the link
3. 把**昨天**的復盤 + 目前持倉同步到 Google Sheet（分頁「每日復盤」「持倉」）與本倉庫 `notion/YYYY/MMDD_HHMM_seoul.md` / syncs yesterday to Google Sheets and a markdown snapshot

不用 Grok / AI 額度，只用 GitHub 免費分鐘（每天約 1–2 分鐘）。600 天免維護：每次執行重新啟用排程、45 天無提交自動補一次（避開 GitHub 60 天停用規則）、10 分鐘逾時、失敗寄信。
No AI quota; ~1–2 free GitHub minutes/day. Built to run unattended 600+ days.

## 模板 Template
- **每日復盤 Daily Review**：日期、評分、心情、精力、Keep 做得好、Problem 問題、Try 教訓、決策、明日三件事、資訊輸入、平台、市場/持倉筆記、深度工作時數、完成
- **持倉 Holdings**（IBKR 等）：代號、平台、類別、數量、成本價、現價、市值、幣別、佔比、論點、停損/目標、更新日期、備註
- 方法來源 Frameworks: **KPT** (Keep/Problem/Try, Agile retrospectives) · **曾國藩日課・三省** · **柳比歇爾時間統計法** (Lyubishchev time log) · **交易日誌每日復盤** (Brett Steenbarger, *The Daily Trading Coach*)

## 設定步驟 Setup（一次就好 / once）
1. **Notion integration**：到 https://www.notion.so/profile/integrations → New integration（Internal）名稱 `ymzz` → 複製 token。打開你要放復盤的 Notion 頁面 → 右上 `⋯` → Connections → 加入 `ymzz`。
2. **建立資料庫 Create databases**（在電腦上 / on your PC，需 Node.js 20+）：
   ```bash
   git clone https://github.com/Ya-MiC/ymzz-notion && cd ymzz-notion
   NOTION_TOKEN=你的token ./setup.sh "https://www.notion.so/你的頁面網址"
   git add sync.config.json && git commit -m "setup ids" && git push
   ```
   Windows PowerShell：`$env:NOTION_TOKEN="..."; npm install; node scripts/setup-notion.mjs "<頁面網址>"`
3. **Google service account**：https://console.cloud.google.com → 新專案 → 啟用 Google Sheets API → IAM → Service accounts → 建立 → Keys → Add key → JSON（下載）。建一個 Google Sheet，**共用**給 service account 的 email（編輯者 Editor）。網址 `/d/<SHEET_ID>/edit` 中間那段就是 SHEET_ID。
4. **Gmail 應用程式密碼 App password**：https://myaccount.google.com/apppasswords（需先開兩步驗證）→ 建立 → 16 位密碼。
5. **GitHub Secrets**：倉庫 → Settings → Secrets and variables → Actions → New repository secret：

   | Secret | 內容 |
   |---|---|
   | `NOTION_TOKEN` | Notion integration token |
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | 整個 JSON 檔內容 whole JSON |
   | `SHEET_ID` | Google Sheet ID |
   | `SMTP_USER` | 你的 Gmail |
   | `SMTP_PASS` | 16 位應用程式密碼 |
   | `MAIL_TO` | 收提醒的信箱 |
   | `SMTP_HOST` / `SMTP_PORT` | 選填，預設 smtp.gmail.com / 465 |
6. **第一次手動執行 First run**：Actions → daily-review → Run workflow。收到信、Notion 出現今天的頁、Sheet 出現兩個分頁就成功。

## 檔案 Files
| 路徑 | 用途 |
|---|---|
| `.github/workflows/daily-review.yml` | 每日排程 daily schedule |
| `setup.sh` → `scripts/setup-notion.mjs` | 建首頁說明＋資料庫 |
| `scripts/schema.mjs` | 欄位與頁面骨架（改模板只改這裡）|
| `scripts/create-today.mjs` · `send-reminder.mjs` · `sync-yesterday.mjs` · `write-log.mjs` | 每日步驟 |
| `scripts/seoul-time.mjs` · `notion-client.mjs` | 共用 helpers |
| `notion/YYYY/MMDD_HHMM_seoul.md` | 每日快照（內含首爾時間 (UTC+9)）|
