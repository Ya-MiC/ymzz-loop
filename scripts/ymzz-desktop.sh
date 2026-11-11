#!/bin/sh
# Builds the local binary once, then opens the loopback page.
# The page has the folder browser. This script does not sudo and does not bind 0.0.0.0.
set -eu
cd "$(dirname "$0")/.."
if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is required to build ymzz-vibe on this machine. A prebuilt package is not in this tree." >&2
  exit 1
fi
cargo build --manifest-path app/Cargo.toml --release
exec ./app/target/release/ymzz-vibe desktop "$@"
