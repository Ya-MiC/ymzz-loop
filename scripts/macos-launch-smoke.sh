#!/bin/sh
# Launch the packaged macOS app and read the page the core serves.
# tauri-action removes the .app after it builds the dmg, so mount the dmg.
set -eu
PID=""
MOUNT=""
cleanup() {
  if [ -n "$PID" ]; then
    kill "$PID" >/dev/null 2>&1 || true
  fi
  if [ -n "$MOUNT" ]; then
    hdiutil detach "$MOUNT" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

APP=""
if [ -d src-tauri/target/release/bundle/macos ]; then
  APP=$(find src-tauri/target/release/bundle/macos -name '*.app' -type d | head -1 || true)
fi
if [ -z "$APP" ]; then
  DMG=$(find src-tauri/target/release/bundle -name '*.dmg' | head -1 || true)
  if [ -z "$DMG" ]; then
    echo "no dmg or app bundle"
    exit 1
  fi
  MOUNT=/tmp/ymzz-dmg
  rm -rf "$MOUNT"
  mkdir -p "$MOUNT"
  hdiutil attach "$DMG" -mountpoint "$MOUNT" -nobrowse
  APP=$(find "$MOUNT" -name '*.app' -type d | head -1 || true)
fi
if [ -z "$APP" ]; then
  echo "no packaged app"
  exit 1
fi
rm -rf /tmp/ymzz-bingce.app
cp -R "$APP" /tmp/ymzz-bingce.app
xattr -cr /tmp/ymzz-bingce.app || true
BIN=/tmp/ymzz-bingce.app/Contents/MacOS/ymzz-bingce
if [ ! -f "$BIN" ]; then
  BIN=$(find /tmp/ymzz-bingce.app/Contents/MacOS -type f | head -1 || true)
fi
if [ -z "$BIN" ] || [ ! -f "$BIN" ]; then
  echo "no packaged binary in $APP"
  find /tmp/ymzz-bingce.app -maxdepth 3 -type f || true
  exit 1
fi
chmod 755 "$BIN"
"$BIN" >/tmp/ymzz-macos-smoke.log 2>&1 &
PID=$!
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
