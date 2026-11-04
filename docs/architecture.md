# 架構與擴充介面 Architecture & extension points

```
          ┌──────── GitHub Actions (cron hourly, :05 UTC) ────────┐
          │ ⓪ gate.mjs  ── local time ≥ REMIND_TIME && not ran today? ── no → exit (<10s)
          │      │ yes
          │ ① create-today.mjs  ──►  Notion: today's blank review page   (SOURCE)
          │ ② send-reminder.mjs ──►  email notifier (SMTP)
          │ ③ sync-yesterday.mjs: Notion (source) ─► SyncContext ─► sinks[]
          │        sinks: markdown → notion/YYYY/MMDD_HHMM_<tz>.md
          │               sheets   → Google Sheets 「每日復盤」「持倉」
          │ ④ commit snapshot + .ymzz/last-run (dedupe)
          │ ⑤ write-log.mjs ──► Notion 「同步紀錄 Sync Log」
          └────────────────────────────────────────────────────────┘
```

## 時間 Time (`scripts/time.mjs`)
唯一時間來源。優先序：環境變數 `YMZZ_TZ` / `YMZZ_REMIND_TIME`（GitHub repo Variables）→ `sync.config.json` 的 `timezone` / `remind_time` → 預設 `Asia/Seoul` / `07:00`。
所有日期、「昨天」、檔名、信件與 Notion 紀錄都用它。檔名 `MMDD_HHMM_<slug>`，slug 取 IANA 名稱最後一段小寫（`America/New_York` → `new_york`），檔內寫完整時區與 UTC 偏移。

## 閘門與去重 Gate & dedupe (`scripts/gate.mjs`)
GitHub cron 只支援 UTC，因此每小時喚醒一次。閘門零依賴、只讀 `.ymzz/last-run`：
- 手動執行 `workflow_dispatch`：一定執行。
- 排程：本地時間 ≥ `REMIND_TIME` 且今天未執行過 → 執行；否則立即結束。
- 用「≥」而不是「＝」：GitHub 排程常延遲，甚至漏掉某一小時，下一小時會補上；半小時時區（如 Asia/Kolkata）也會在下一個整點後執行。
- 成功後才寫入 `.ymzz/last-run`（步驟 ④），失敗會在下一小時自動重試。

**Actions 分鐘 Minutes**：公開倉庫免費無限。私人倉庫每次 job 以 1 分鐘計：24 次/天 × 30 ≈ 720 分鐘/月，低於免費 2,000 分鐘。

## Source 介面
目前唯一來源是 Notion（`scripts/notion-client.mjs`：`findReview`、`queryAll`、`plain`）。新來源只要產出同一個 `SyncContext` 即可共用所有 sinks。

## Sink 介面 (`scripts/sinks/`)
```js
/** @type {import('./index.mjs').Sink} */
export default {
  name: "obsidian",
  enabled: env => !!env.OBSIDIAN_VAULT_REPO,   // 缺設定 → 自動略過 skip when unconfigured
  async write(ctx) { /* ctx.date, ctx.reviewCols, ctx.reviewRow, ctx.holdingCols, ctx.holdings, ctx.bodyMarkdown, ctx.time */ },
};
```
步驟 Steps：
1. 新增 `scripts/sinks/<name>.mjs`。
2. 在 `scripts/sinks/index.mjs` 的 `registry` 註冊。
3. 在 `sync.config.json` 的 `"sinks"` 陣列加上名稱；所需金鑰放 GitHub Secrets，並在 workflow 步驟 ③ 的 `env` 傳入。

`SyncContext`
| 欄位 | 型別 | 說明 |
|---|---|---|
| `date` | `string` | 昨日本地日期 YYYY-MM-DD |
| `reviewCols` / `reviewRow` | `string[]` / `string[]\|null` | 復盤欄位與那一列（最後一欄 Notion 連結）|
| `holdingCols` / `holdings` | `string[]` / `string[][]` | 持倉快照 |
| `bodyMarkdown` | `string` | 復盤頁內文 |
| `time` | `{tz, stamp, year, human}` | 時區、檔名 stamp、年、可讀時間 |

## 通知 Notifier (`scripts/sinks/email.mjs`)
`emailEnabled(env)`、`sendMail({subject,text,html})`。要接 Telegram / Slack / LINE，比照實作一個 notifier 並在 `send-reminder.mjs` 呼叫。

## 建議路線 Roadmap ideas
Obsidian / Logseq vault sink · Telegram notifier · 週報/月報彙整 weekly rollup · IBKR Flex Query 自動填持倉 · CSV export。
