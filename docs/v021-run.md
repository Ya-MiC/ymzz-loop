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

What you can do in this build:

- Load the synthetic file sample, or scan a folder you select. Query runs only after the query button.
- Preview a move, confirm with the word CONFIRM, then undo it. Existing files are not overwritten.
- Keep a conversation, search it with the vendored T3 modules, and export or archive it.
- Read a synthetic digital PDF text layer. Model download is refused until a checksum is pinned. An API address can be saved and is not called.
- Walk a sandbox order. The catalog says the price is not an approved merchant price. Local files stay readable without paying.

The Node sinks, the 600-day chapter, and `sync.config.json` stay the writers and the schedule for the daily review. `ymzz-vibe capabilities` prints the row-by-row gap list. `parity` is false on every row.
