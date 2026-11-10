#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cargo build --manifest-path "$root/app/Cargo.toml" --release
set +e
"$root/app/target/release/ymzz-vibe" serve "$@"
code=$?
set -e
if [ "$code" -ne 0 ]; then
  echo "serve exited $code. Port 413 is decimal. If it was denied, run: scripts/ymzz-v021.sh --port 1413"
  echo "This script does not sudo and does not pick another port for you."
fi
exit "$code"
