#!/bin/sh
# Build a Linux amd64 .deb from the release binary. The binary links the
# system WebKitGTK and GTK libraries. It does not bundle Python wheels.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$root/app"
cargo build --release
ver=$(sed -n 's/^version = "\(.*\)"/\1/p' Cargo.toml | head -n 1)
stage=$(mktemp -d)
pkg=ymzz-vibe_${ver}_amd64
mkdir -p "$stage/$pkg/DEBIAN" "$stage/$pkg/usr/bin" "$stage/$pkg/usr/share/applications"
cp target/release/ymzz-vibe "$stage/$pkg/usr/bin/ymzz-vibe"
cp "$root/packaging/ymzz-loop.desktop" "$stage/$pkg/usr/share/applications/ymzz-loop.desktop"
cat > "$stage/$pkg/DEBIAN/control" <<EOF
Package: ymzz-vibe
Version: $ver
Section: utils
Priority: optional
Architecture: amd64
Depends: libgtk-3-0, libwebkit2gtk-4.1-0, python3, python3-venv, python3-pip, curl, ca-certificates
Maintainer: ymzz-loop <dev@localhost>
Description: ymzz-loop local archive
 GTK window around the local Rust core. OCR weights and wheels are fetched
 by the app after install and checked against hashes. This package is Linux
 amd64 only.
EOF
dpkg-deb --root-owner-group --build "$stage/$pkg" "$root/$pkg.deb"
echo "$root/$pkg.deb"
rm -rf "$stage"
