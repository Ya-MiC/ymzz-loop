# 貢獻指南 Contributing

謝謝你願意幫忙！Thanks for helping.

1. Fork → 建分支 branch → `npm install` → 修改 → `npm run lint && npm test`。
2. 新增同步目的地請寫一個 sink：`scripts/sinks/<name>.mjs`，實作 `{ name, enabled(env), write(ctx) }`，在 `scripts/sinks/index.mjs` 註冊，詳見 [docs/architecture.md](docs/architecture.md)。
   New destinations = one sink file implementing `{ name, enabled(env), write(ctx) }`.
3. 不加付費服務、不加需要常駐伺服器的依賴；每日 Actions 執行時間保持在 2 分鐘內。No paid services, no servers; keep daily runs under 2 min.
4. 介面文字一律繁中 + 英文。UI copy: Traditional Chinese + English.
5. 提交訊息用祈使句，例如 `add: notion → obsidian sink`。

Bug / 想法請開 [Issue](https://github.com/Ya-MiC/ymzz-loop/issues/new/choose)。
