# 變更紀錄 Changelog

格式依 [Keep a Changelog](https://keepachangelog.com/)，版本依 [SemVer](https://semver.org/)。

## [1.0.0] - 2026-11-04
### 新增 Added
- 任意時區與提醒時間：repo Variables `YMZZ_TZ`、`YMZZ_REMIND_TIME` 或 `sync.config.json`（預設 Asia/Seoul 07:00）。Any time zone / reminder time.
- 每小時閘門 + 每日去重（`.ymzz/last-run`），閘門不安裝依賴、數秒結束。Hourly gate with once-per-day dedupe.
- 檔名 `notion/YYYY/MMDD_HHMM_<時區>.md`，檔內寫明時區。Filenames carry the zone slug.
- Sink 介面（`scripts/sinks/`）：markdown、sheets；email 通知器。Pluggable sink interface.
- 官網與互動式引導教學 `site/`（GitHub Pages）。Website with interactive onboarding.
- CI（lint + test）、Pages 部署、社群檔案（LICENSE、CONTRIBUTING、SECURITY…）。
### 既有 Existing (0.x)
- KPT 每日復盤 + IBKR 持倉模板、每日建頁、提醒信、同步 Google Sheet 與 Markdown、600 天 keepalive、失敗通知。
