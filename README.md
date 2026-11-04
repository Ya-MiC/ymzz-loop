# ymzz-notion — Notion → GitHub + Google Sheets 自動同步 / auto-sync

你只在 Notion 編輯；GitHub Actions 每天 3 次（首爾 09:00、15:00、21:00）免費把頁面匯出成 `notion/` 下的 md，並把資料庫列寫進 Google 表格。不用 Grok Bot 額度。
You edit only in Notion; GitHub Actions (free) exports pages to md under `notion/` 3× daily (Seoul 09:00/15:00/21:00) and writes database rows to a Google Sheet. No Grok Bot quota used.

## 加一個頁面 / Add a page
在 `sync.config.json` 的 `sources` 加一行 / add one line:
```json
{ "name": "新頁面", "type": "page", "id": "<Notion page id>", "sheetTab": "分頁名" }
```
`type: "page"` 會匯出頁面與其內嵌資料庫；`type: "database"` 直接匯出資料庫。並記得把該頁面分享給整合（步驟 2）。
`page` exports the page plus its inline databases; `database` exports a database directly. Remember to share it with the integration (step 2).

## 你要做的事 / What you need to do (one time)
1. **建立 Notion 內部整合 / Create a Notion internal integration**，權限只勾「讀取內容 Read content」。官方說明 / Official guide: https://developers.notion.com/docs/create-a-notion-integration
2. **把 1102 客戶側寫頁面分享給這個整合 / Share the 1102 page with the integration**（頁面右上「•••」→ 連接 Connections）。官方 / Official: https://www.notion.com/help/add-and-manage-connections-with-the-api
3. **建立 Google 服務帳號並下載 JSON 金鑰 / Create a Google service account + JSON key**，並在該專案啟用 Google Sheets API。官方 / Official: https://cloud.google.com/iam/docs/service-accounts-create 、 https://cloud.google.com/iam/docs/keys-create-delete 、 https://developers.google.com/workspace/sheets/api/quickstart/nodejs
4. **建一個 Google 表格，用「共用」把它分享給服務帳號的 email（…@….iam.gserviceaccount.com），權限「編輯者」**。表格 ID 是網址 `/d/` 和 `/edit` 之間那段。
   Create a Google Sheet and Share it with the service account email as **Editor**. The Sheet ID is the part of the URL between `/d/` and `/edit`.
5. **新增倉庫 Secrets / Add repo secrets**（Settings → Secrets and variables → Actions）。官方 / Official: https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions
   | Secret | 內容 / Value |
   |---|---|
   | `NOTION_TOKEN` | 步驟 1 的 Internal Integration Secret |
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | 步驟 3 下載的整個 JSON 檔內容 / full JSON file content |
   | `SHEET_ID` | 步驟 4 的表格 ID |
6. **Actions 分頁 → notion-sync → Run workflow** 手動跑第一次 / run once manually. 官方 / Official: https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/manually-running-a-workflow

金鑰只放在 GitHub Secrets，不要貼給任何人或 AI。Keys live only in GitHub Secrets — never paste them to anyone, including AI assistants.
沒設 Google secrets 時只同步到 GitHub。Without the Google secrets it syncs to GitHub only.

## 費用 / Cost
私人倉庫每月有免費 Actions 分鐘數，每次約 1 分鐘，一個月約 90 分鐘。Private repos get free monthly Actions minutes; each run ≈1 min, ≈90 min/month. https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions
