# Run ymzz-vibe 0.21

The Node daily review is unchanged:

```bash
npm run lint && npm test
```

The local app is a separate Rust binary. It listens on `127.0.0.1` only.

```bash
cargo test --manifest-path app/Cargo.toml
cargo run --manifest-path app/Cargo.toml -- serve --data /tmp/ymzz-vibe
```

Port `413` is decimal. If the operating system refuses it, the program stops and tells you. Pass `--port 1413` yourself. It will not switch ports, and it will not use sudo.

Open `http://127.0.0.1:1413/`. The session cookie is set by that page. The token file in the data directory is mode `0600`.

`ymzz-vibe desktop` opens a GTK 3 window with the system WebKit and listens on 127.0.0.1:1413. Port 413 is privileged, so the program does not try it and does not use sudo. The header button is a GTK folder chooser. Tauri is not used. `scripts/package-deb.sh` builds a Linux amd64 .deb that depends on the distro WebKit and GTK packages. Windows and macOS shells are not built. OCR wheels are not in the package; the window installs the hash-pinned set into its data directory.

PaddleOCR weights are not in git. `app/ocr/pins.json` records sha256 values computed here from the downloaded bytes. The app downloads those HTTPS URLs with curl, checks the pin, and extracts only if the archive listing has no symlink, absolute path, or `..`. The isolated interpreter is `python3 -m venv` under the data directory plus `app/ocr/requirements-ocr.txt`. Until that interpreter exists, the catalog says the runtime is not bundled. A saved API address is not a call. A call happens only after opt-in, and this build places that call on an explicit loopback URL.

Sandbox payment keeps the browser return separate from a signed notification or a signed query. Activity rules at the Alipay render URL were not fully extracted; the catalog marks them unverified. WeaveFox is not required. Live merchant credentials are a different class and are not present.

What you can do in this build:

- Load the synthetic file sample, or scan a folder you select. The default filters are the date range and one drive-by-type group. Query runs only after the query button. A graph group opens the files in that group.
- Preview a move, confirm with the word CONFIRM, then undo it. Existing files are not overwritten.
- Keep a conversation, search it with the vendored T3 modules, and export or archive it. Import also runs the vendored commit-message cleaner.
- Read a synthetic digital PDF text layer, or recognize the synthetic scan once the pinned models and runtime are present.
- Walk a sandbox order through pending, failed, duplicate, and delayed delivery. The catalog says the price is not an approved merchant price. Local files stay readable without paying.

The Node sinks, the 600-day chapter, and `sync.config.json` stay the writers and the schedule for the daily review. `ymzz-vibe capabilities` prints the row-by-row gap list. `parity` is false on every row.
