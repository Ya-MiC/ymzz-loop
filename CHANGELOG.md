# 變更紀錄 Changelog

格式依 [Keep a Changelog](https://keepachangelog.com/)，版本依 [SemVer](https://semver.org/)。

## [1.2.0] - 2026-11-04
### Changed
- Website redesign after a study of quynh.moe and grail-app.com (docs/design-study.md): framed panels, live 24-hour dial hero, floating layered mockups, bento grid with real content (Notion page, email, Sheet, holdings bars, world clocks, code), sticky dark storytelling section, pointer tilt + glow, grain, self-hosted Fraunces / Inter / JetBrains Mono (OFL).

## [1.1.0] - 2026-11-04
### Changed
- Default time zone is now **UTC** (`Etc/UTC`, 07:00); filename zone slug `utc`. Set `YMZZ_TZ` (e.g. `America/Los_Angeles`) to change it.
- README is English by default, with 繁體中文 / 简体中文 / 한국어 versions.
- Website rebuilt: product introduction, before/after, mockups, FAQ, i18n (en, zh-Hant, zh-CN, ko, ar beta), RTL-ready logical CSS, Tabler icons (no emoji), CSP, no third-party requests.
- Pages workflow: `configure-pages` with `enablement: true`; Node 22 in workflows.
### Added
- THIRD_PARTY.md, TRADEMARK.md.

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
