# ymzz-notion — 每日復盤 + 持倉 Daily Review + Holdings

全自動、免費（GitHub Actions），不用 Grok Bot 額度。每天首爾 21:00：
Fully automatic and free (GitHub Actions), zero Grok Bot quota. Every day at 21:00 Seoul:
1. 在 Notion「每日復盤」資料庫建今天的**空白**頁（已存在就跳過）/ creates today's **blank** review row in Notion
2. 寄 email 提醒你寫，附頁面連結 / emails you a reminder with the link
3. 把「每日復盤」與「持倉」同步到 Google 表格和本倉庫 `notion/` 的 md / syncs both databases to Google Sheets + md in `notion/`
4. 在 Notion「同步紀錄 Sync Log」**只追加**一筆紀錄 / **appends** one entry to a Notion Sync Log page

你只在 Notion 填寫。持倉有變就直接改「持倉 Holdings」那一列；模板全是空白欄位，不寫死任何持倉。
You only edit in Notion. Change a Holdings row whenever positions change; templates are blank, nothing hard-coded.
欄位在 `scripts/templates.mjs`，想加欄位改那裡。Fields live in `scripts/templates.mjs`.
（GitHub 排程可能延遲幾分鐘到一小時 / scheduled runs may be delayed by GitHub.）

## 你要做的事 / Your steps (one time)
1. **Notion 整合 / integration**：權限只勾「讀取內容 Read content」+「插入內容 Insert content」（不勾 Update）。https://developers.notion.com/docs/create-a-notion-integration
2. 在 Notion 建一個空白頁（例如「復盤中心」），把它**連接**到這個整合 / create an empty page and connect it to the integration: https://www.notion.com/help/add-and-manage-connections-with-the-api
3. **一鍵建資料庫 / one command**（電腦需 Node.js 20+ 與 git）：
   ```bash
   git clone https://github.com/Ya-MiC/ymzz-notion && cd ymzz-notion
   NOTION_TOKEN=你的整合金鑰 ./setup.sh "https://www.notion.so/你的頁面網址"
   git add sync.config.json && git commit -m "setup ids" && git push
   ```
   會在該頁下建「每日復盤 Daily Review」和「持倉 Holdings」兩個空白資料庫，並把 ID 寫進 `sync.config.json`。
4. **Google 表格 / Sheet**：建服務帳號＋JSON 金鑰、啟用 Sheets API，把表格「共用」給服務帳號 email（編輯者）。表格 ID ＝網址 `/d/` 與 `/edit` 之間。
   https://cloud.google.com/iam/docs/service-accounts-create · https://cloud.google.com/iam/docs/keys-create-delete · https://developers.google.com/workspace/sheets/api/quickstart/nodejs
5. **Email 提醒 / reminder**：Gmail 開兩步驟驗證後建「應用程式密碼」/ create a Gmail app password: https://support.google.com/accounts/answer/185833
6. **倉庫 Secrets**：https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions

   | Secret | 內容 / Value |
   |---|---|
   | `NOTION_TOKEN` | 整合金鑰 / integration secret |
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | 服務帳號 JSON 全文 / full JSON |
   | `SHEET_ID` | 表格 ID |
   | `SMTP_USER` | 寄件 Gmail 地址 / sending Gmail |
   | `SMTP_PASS` | Gmail 應用程式密碼 / app password |
   | `MAIL_TO` | 收提醒的信箱 / where reminders go |
   | `SMTP_HOST`, `SMTP_PORT` | 選填，預設 smtp.gmail.com / 465 (optional) |

7. Actions → **daily-review** → Run workflow 跑第一次。https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/manually-running-a-workflow
   第一次會在你的頁面下建「同步紀錄 Sync Log」，記錄裡印出的 ID 可填回 `notion_log_page_id`（不填也會自動找到）。

金鑰只放 GitHub Secrets 和你自己的終端機，不要貼給任何人或 AI。缺 Google 或 SMTP secrets 時該步驟自動跳過。
Keys only go in GitHub Secrets and your own terminal — never paste them to anyone or any AI. Missing Google/SMTP secrets just skip that step.

## 費用 / Cost
每次約 1–2 分鐘，每月約 60 分鐘，在私人倉庫免費額度內。≈60 min/month, within private-repo free minutes. https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions

## 參考 / Prior art
每日建頁的做法參考 / daily-page approach similar to [azujuuuuuun/notion-diary-page-creator](https://github.com/azujuuuuuun/notion-diary-page-creator)；它不含持倉、表格、email，所以自建。It lacks holdings, Sheets and email, so this repo is self-built.
