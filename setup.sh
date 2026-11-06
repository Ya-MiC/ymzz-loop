#!/usr/bin/env bash
# 一鍵建立 Notion 空白資料庫 / one-command setup
# 用法 usage:  NOTION_TOKEN=xxx ./setup.sh <Notion 頁面網址 page URL>
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "請先安裝 Node.js 20+ / install Node.js 20+: https://nodejs.org"; exit 1; }
npm install --no-audit --no-fund --silent
node scripts/setup-notion.mjs "${1:-}"
