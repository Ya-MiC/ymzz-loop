#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$root"
cargo build --release --manifest-path app/Cargo.toml
mkdir -p src-tauri/binaries/core
if [ -f app/target/release/ymzz-vibe.exe ]; then
  cp app/target/release/ymzz-vibe.exe src-tauri/binaries/core/ymzz-vibe.exe
else
  cp app/target/release/ymzz-vibe src-tauri/binaries/core/ymzz-vibe
  chmod 755 src-tauri/binaries/core/ymzz-vibe
fi
echo "core ready: src-tauri/binaries/core"
