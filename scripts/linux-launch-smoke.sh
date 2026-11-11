#!/bin/sh
# Install the just-built deb and confirm the core serves the nickname page.
set -eu
DEB=$(find src-tauri/target/release/bundle -name '*.deb' | head -1)
if [ -z "$DEB" ]; then
  echo "no deb to install"
  exit 1
fi
sudo dpkg -i "$DEB" || sudo apt-get install -y -f
sudo apt-get install -y xvfb
BIN=$(command -v ymzz-bingce || true)
if [ -z "$BIN" ]; then
  BIN=$(find /usr -name ymzz-bingce -type f | head -1)
fi
xvfb-run -a "$BIN" >/tmp/ymzz-linux-smoke.log 2>&1 &
PID=$!
trap 'kill "$PID" >/dev/null 2>&1 || true' EXIT
ok=0
i=0
while [ "$i" -lt 40 ]; do
  if curl -fsS http://127.0.0.1:1413/ -o /tmp/ymzz-linux-page.html; then
    ok=1
    break
  fi
  i=$((i + 1))
  sleep 1
done
if [ "$ok" != 1 ]; then
  echo "installed app did not serve the page"
  cat /tmp/ymzz-linux-smoke.log || true
  exit 1
fi
grep -q '稟冊' /tmp/ymzz-linux-page.html || grep -q '怎麼稱呼你' /tmp/ymzz-linux-page.html
echo "YMZZ_SMOKE linux installed core"
