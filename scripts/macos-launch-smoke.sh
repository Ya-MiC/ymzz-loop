#!/bin/sh
# Launch the packaged macOS app and read the page the core serves.
set -eu
APP=$(find src-tauri/target/release/bundle/macos -name '*.app' -type d | head -1)
BIN="$APP/Contents/MacOS/ymzz-bingce"
if [ ! -f "$BIN" ]; then
  echo "no packaged binary at $BIN"
  exit 1
fi
chmod 755 "$BIN"
"$BIN" >/tmp/ymzz-macos-smoke.log 2>&1 &
PID=$!
trap 'kill "$PID" >/dev/null 2>&1 || true' EXIT
ok=0
i=0
while [ "$i" -lt 40 ]; do
  if curl -fsS http://127.0.0.1:1413/ -o /tmp/ymzz-macos-page.html; then
    ok=1
    break
  fi
  i=$((i + 1))
  sleep 1
done
if [ "$ok" != 1 ]; then
  echo "core did not serve the page"
  cat /tmp/ymzz-macos-smoke.log || true
  exit 1
fi
if ! grep -q '稟冊' /tmp/ymzz-macos-page.html && ! grep -q '怎麼稱呼你' /tmp/ymzz-macos-page.html; then
  echo "page did not contain the briefing"
  exit 1
fi
mkdir -p docs/mobile
screencapture -x docs/mobile/macos-launch.png || true
echo "YMZZ_SMOKE macos packaged core"
