<p align="center"><img src="assets/banner.svg" alt="ymzz-loop · Daily Review Loop" width="100%"></p>

<p align="center"><a href="README.md">English</a> · <a href="README.zh-Hant.md">繁體中文</a> · <a href="README.zh-CN.md">简体中文</a> · <b>한국어</b></p>

<p align="center">
<a href="https://github.com/Ya-MiC/ymzz-loop/actions/workflows/ci.yml"><img src="https://github.com/Ya-MiC/ymzz-loop/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-CDBFE0" alt="MIT"></a>
<img src="https://img.shields.io/badge/cost-%240%2Fmonth-B7C8A8" alt="$0/month">
<img src="https://img.shields.io/badge/node-%E2%89%A520-B9DDF1" alt="node 20+">
</p>

<h1 align="center">ymzz-loop</h1>
<p align="center"><b>매일 복기를 위한 멀티엔드 데이터 동기화 제품.</b><br>
제품 사용자로서 템플릿을 Fork하고 Notion/Google/메일을 한 번 연결하면, GitHub Actions가 <em>내</em> Fork에서 오늘의 빈 복기를 만들고 링크를 보내며 <strong>전일을 자동 수집</strong>해 Sheets + Markdown(선택 Feishu)에 남깁니다.<br>
<strong>배포당 600일 챕터 → 요약</strong>. 600→0 후 일일 루프가 일시정지하고 장을 닫습니다. 새 버전으로 다음 장.<br>
$0 · 모든 시간대 · 서버 없음 · AI 쿼터 없음 · MIT</p>
<p align="center"><a href="https://ya-mic.github.io/ymzz-loop/">웹사이트 & 설정 가이드</a> · <a href="docs/architecture.md">아키텍처</a></p>


## 순환은 이렇게 작동합니다

```mermaid
flowchart LR
  A["1 · 템플릿 → Notion<br>+ 메일 알림"] --> B["2 · Notion에서 작성"]
  B --> C["3 · 다음 실행 때 어제 백업"]
  C --> D["Google Sheets"]
  C --> E["내 GitHub 포크 (.md)"]
  D -. "↻" .-> A
```

1. **도착** — 정한 시간에 빈 회고 템플릿이 Notion에 만들어지고 링크가 담긴 메일이 옵니다.
2. **작성** — 어떤 기기에서든 작성하세요.
3. **보관** — 다음 실행 때 어제 기록이 Google Sheets와 내 포크의 `notion/YYYY/*.md`로 복사됩니다. 그리고 매일 반복하다 600→0에서 요약으로 장을 닫습니다.


**챕터(600→0):** 첫 성공 시 남은 **600**일, 매일 감소, **0**에서 일일 루프가 일시정지하고 **600일 요약**으로 장을 닫음. 새 버전으로 다음 장. Notion·Sheets·Markdown은 그대로 당신의 것.

## 하는 일
정한 시각(기본 **07:00 UTC**)에 GitHub Actions가:
1. Notion에 오늘의 빈 회고 페이지(①–⑩ 섹션)를 만들고,
2. 그 페이지 링크를 메일로 보내고,
3. **어제** 회고와 현재 보유 현황을 Google Sheets와 이 저장소의 `notion/YYYY/MMDD_HHMM_<시간대>.md`(예: `1105_0705_utc.md`)에 동기화합니다.

GitHub 무료 Actions 시간과 무료 Notion/Google API만 사용합니다. 실패하면 메일로 알려 줍니다.

## 시간대
저장소 Variables `YMZZ_TZ`(예: `America/Los_Angeles`, `Asia/Seoul`)와 `YMZZ_REMIND_TIME`(`HH:MM`)을 설정하거나 `sync.config.json`의 `timezone` / `remind_time`을 수정하세요. 기본값은 `Etc/UTC` `07:00`입니다. 워크플로는 매시간 깨어나고, 정한 시각이 지나고 오늘 아직 실행하지 않았을 때만 진행합니다.

## 설정 (모든 Fork 제품 사용자)

아래 단계는 작성자만이 아니라 **Fork 이후의 당신**을 위한 것입니다. (한 번, 약 15분)
1. **Notion 통합** — https://www.notion.so/profile/integrations → New integration(Internal) `ymzz` → 토큰 복사 → 회고 페이지 `⋯` → Connections → `ymzz` 추가.
2. **데이터베이스 생성**(Node.js 20+):
   ```bash
   git clone https://github.com/<you>/ymzz-loop && cd ymzz-loop
   NOTION_TOKEN=<token> ./setup.sh "https://www.notion.so/<페이지>"
   git add sync.config.json && git commit -m "setup ids" && git push
   ```
3. **Google 서비스 계정** — Google Cloud Console → Google Sheets API 사용 설정 → 서비스 계정 → JSON 키. 시트를 서비스 계정 이메일에 편집자로 공유. `/d/<SHEET_ID>/edit`.
4. **Gmail 앱 비밀번호** — https://myaccount.google.com/apppasswords (2단계 인증 필요).
5. **GitHub Secrets** — `NOTION_TOKEN`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `SHEET_ID`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`.
6. **시간대(선택)** — Variables 탭에 `YMZZ_TZ`, `YMZZ_REMIND_TIME`.
7. **첫 실행** — Actions → daily-review → Run workflow.

## 확장
새 대상은 파일 하나: `scripts/sinks/<name>.mjs`에 `{ name, enabled(env), write(ctx) }` 구현. [docs/architecture.md](docs/architecture.md) 참고.

## 라이선스
[MIT](LICENSE) © 2026 YanMing Cao · **晏銘湛箴** — 작은 소프트웨어, 큰 질서.
ymzz-loop은 독립 프로젝트이며 Notion, Google, GitHub, Interactive Brokers와 제휴하지 않았습니다.

## Donate / 贊助

ymzz-loop는 **무료 MIT**입니다. 팁 환영.

**USDC on Arbitrum One only. Sending other tokens or using other networks may lose funds.**

```
0x9C4345b0a652D063a79321fe099C65a7Dc5a9C3A
```

수신 전용: https://ya-mic.github.io/ymzz-loop/#donate

