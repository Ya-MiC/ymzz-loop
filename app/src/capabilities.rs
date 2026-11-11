use serde_json::{json, Value};

struct Row {
    id: &'static str,
    implemented: bool,
    tested: &'static str,
    unverified: &'static str,
    gap: &'static str,
}

const ROWS: &[Row] = &[
    Row { id: "T01", implemented: true, tested: "http::tests::pages_and_auth", unverified: "", gap: "No hosted app.t3.codes client." },
    Row { id: "T02", implemented: true, tested: "src-tauri builds the Tauri 2 shell around this core", unverified: "A window was opened on Linux. Windows, macOS, Android, and iOS installers are produced only when the GitHub Actions jobs succeed.", gap: "The shipped window is Tauri 2. The older GTK window remains available as ymzz-vibe desktop and is not the installer. Windows, macOS, Android, and iOS bundles are unsigned and exist only after the installer workflow succeeds." },
    Row { id: "T03", implemented: false, tested: "", unverified: "", gap: "No iOS or Android store client." },
    Row { id: "T04", implemented: true, tested: "main help text", unverified: "A Linux amd64 deb is produced by scripts/package-deb.sh when that script is run. This row does not mean Windows or macOS packages were built.", gap: "Windows and macOS installers were not built. winget, Homebrew, and AUR are not produced." },
    Row { id: "T05", implemented: true, tested: "net::tests::port_413_is_decimal_and_non_loopback_is_refused", unverified: "", gap: "systemd unit is printed only. It is not installed." },
    Row { id: "T06", implemented: true, tested: "inventory::tests::inventory_does_not_invent_gpu_or_tpu", unverified: "macOS and Windows were not executed.", gap: "Only this Linux host was sampled." },
    Row { id: "T10", implemented: true, tested: "engine::tests::a_digital_pdf_becomes_a_searchable_archive", unverified: "Live Claude and Codex account calls were not made.", gap: "The window can store a session and probe --version. It does not send the sentence to those accounts. Upstream Effect provider packages are not vendored." },
    Row { id: "T11", implemented: true, tested: "engine::tests::provider_fixture_runs", unverified: "", gap: "No multi-account pool." },
    Row { id: "T12", implemented: true, tested: "engine::tests::permission_and_terminal", unverified: "", gap: "danger-full still requires CONFIRM. Modes are not a byte-for-byte T3 port." },
    Row { id: "T13", implemented: true, tested: "http::tests::pages_and_auth", unverified: "", gap: "Policy is a local admin flag, not an org MDM." },
    Row { id: "T14", implemented: true, tested: "mcp::tests::search_files_tool", unverified: "", gap: "MCP exposes the local tools only, not every T3 outside-agent." },
    Row { id: "T15", implemented: true, tested: "engine::tests::threads_roundtrip_and_search", unverified: "", gap: "" },
    Row { id: "T16", implemented: true, tested: "engine::tests::permission_and_terminal", unverified: "", gap: "Non-interactive argv only. No PTY or TUI." },
    Row { id: "T17", implemented: true, tested: "engine::tests::threads_roundtrip_and_search", unverified: "", gap: "" },
    Row { id: "T18", implemented: true, tested: "engine::tests::threads_roundtrip_and_search", unverified: "", gap: "Triage is archive plus search, not T3's full sidebar product." },
    Row { id: "T19", implemented: true, tested: "engine::tests::git_worktree", unverified: "", gap: "" },
    Row { id: "T20", implemented: true, tested: "engine::tests::threads_roundtrip_and_search", unverified: "", gap: "" },
    Row { id: "T21", implemented: true, tested: "t3bridge::tests::vendored_modules_execute", unverified: "No model wrote the commit text.", gap: "Local template plus vendored credit stripping only." },
    Row { id: "T22", implemented: true, tested: "engine::tests::threads_roundtrip_and_search", unverified: "", gap: "Stored HTML is sandboxed in the UI. No agent browser and no port proxy." },
    Row { id: "T23", implemented: false, tested: "", unverified: "", gap: "Voice input is not implemented." },
    Row { id: "T24", implemented: true, tested: "engine::tests::telemetry_stays_off", unverified: "", gap: "There is no usage dashboard and no telemetry sender." },
    Row { id: "T25", implemented: true, tested: "connectors::tests::hosts_stay_on_their_own_products", unverified: "", gap: "No 1Password Connect or service-account integration." },
    Row { id: "T26", implemented: true, tested: "third_party/t3code/NOTICE.md", unverified: "", gap: "NOTICE covers vendored modules, not a generated license bill of the whole T3 monorepo." },
    Row { id: "T27", implemented: true, tested: "ui copy", unverified: "No moderated usability session.", gap: "Traditional Chinese onboarding is in the UI; it was not tested with a new user." },
    Row { id: "T28", implemented: true, tested: "engine version field", unverified: "", gap: "No auto-update and no release-channel sync." },
    Row { id: "T29", implemented: true, tested: "inventory::tests::inventory_does_not_invent_gpu_or_tpu", unverified: "GPU marketing names are intentionally blank.", gap: "" },
    Row { id: "T30", implemented: true, tested: "engine::tests::threads_roundtrip_and_search", unverified: "", gap: "Guest token is loopback-only. No internet guest link." },
    Row { id: "T31", implemented: true, tested: "engine::tests::threads_roundtrip_and_search", unverified: "", gap: "" },
    Row { id: "T32", implemented: true, tested: "engine::tests::prompt_link", unverified: "", gap: "ymzz:// links are parsed locally. They do not open a remote app." },
    Row { id: "T33", implemented: true, tested: "engine::tests::threads_roundtrip_and_search", unverified: "", gap: "" },
    Row { id: "T34", implemented: false, tested: "", unverified: "", gap: "T3 window snap-shot is not implemented. Query snapshots are a different feature and are tested." },
    Row { id: "T35", implemented: true, tested: "ui keybindings", unverified: "", gap: "Only query, panels, and sidebar bindings are wired." },
    Row { id: "T36", implemented: true, tested: "test/v021-tokens.test.mjs", unverified: "Dark derivative colors are not claimed final.", gap: "Noto Sans SC variable slices used by the window are bundled under SIL OFL. Glyphs outside those slices use the next installed face." },
    Row { id: "T37", implemented: false, tested: "", unverified: "", gap: "No mobile push notifications." },
    Row { id: "T38", implemented: true, tested: "engine::tests::threads_roundtrip_and_search", unverified: "", gap: "JSON import only. No browser profile import." },
    Row { id: "T39", implemented: true, tested: "engine::tests::task_and_hook", unverified: "", gap: "Inbound loopback hook only. No outbound webhook fan-out." },
    Row { id: "T40", implemented: false, tested: "", unverified: "", gap: "No multi-machine load balancing." },
    Row { id: "T41", implemented: false, tested: "", unverified: "", gap: "No linked environment delegate." },
    Row { id: "T42", implemented: true, tested: "net::tests::port_413_is_decimal_and_non_loopback_is_refused", unverified: "", gap: "Tailscale, SSH, LAN, and T3 Connect serving are not implemented. Bind stays on 127.0.0.1." },
    Row { id: "T43", implemented: true, tested: "engine::tests::git_worktree", unverified: "Live GitHub pull requests were not opened.", gap: "Local git only. GitHub/GitLab/Bitbucket/Azure/Forgejo PR stacks are not executed." },
    Row { id: "T44", implemented: false, tested: "", unverified: "", gap: "ACP registry agents are not vendored." },
    Row { id: "T45", implemented: true, tested: "connectors::tests::hosts_stay_on_their_own_products", unverified: "", gap: "Public connector hosts stay blocked unless the owner sets both explicit env flags. Default is off." },
    Row { id: "S01", implemented: true, tested: "scripts/ymzz-v021.sh", unverified: "", gap: "One command builds and serves. It does not silently pick a fallback port." },
    Row { id: "S02", implemented: true, tested: "net::tests::live_413_is_privileged_here_or_explained", unverified: "", gap: "" },
    Row { id: "S03", implemented: true, tested: "engine::tests::panel_query_selects_frozen_snapshot", unverified: "", gap: "Semantic contours stay unavailable until a local embedding model exists. None is bundled." },
    Row { id: "S04", implemented: true, tested: "inventory::tests::inventory_does_not_invent_gpu_or_tpu", unverified: "", gap: "Installed, authorized, and operable are separate. Finding a binary is not remote control." },
    Row { id: "S05", implemented: true, tested: "query::tests::more_filter_is_not_a_third_default", unverified: "", gap: "" },
    Row { id: "S06", implemented: true, tested: "engine::tests::panel_query_selects_frozen_snapshot", unverified: "", gap: "" },
    Row { id: "S07", implemented: true, tested: "dates::tests::seoul_fixture_windows", unverified: "", gap: "" },
    Row { id: "S08", implemented: true, tested: "dates::tests::seoul_fixture_windows", unverified: "", gap: "" },
    Row { id: "S09", implemented: true, tested: "query::tests::synthetic_fixture_matches_expected_ids", unverified: "", gap: "Default time basis is mtime. Other clocks are not invented." },
    Row { id: "S10", implemented: true, tested: "engine::tests::panel_query_selects_frozen_snapshot", unverified: "", gap: "" },
    Row { id: "S11", implemented: true, tested: "engine::tests::panel_query_selects_frozen_snapshot", unverified: "", gap: "" },
    Row { id: "S12", implemented: true, tested: "engine::tests::panel_query_selects_frozen_snapshot", unverified: "", gap: "" },
    Row { id: "S13", implemented: true, tested: "engine::tests::markdown_and_organize", unverified: "", gap: "" },
    Row { id: "S14", implemented: true, tested: "paths::tests::move_conflict_and_undo", unverified: "", gap: "No delete and no overwrite." },
    Row { id: "S15", implemented: true, tested: "paths::tests::rejects_traversal_reserved_and_escape_symlink", unverified: "", gap: "" },
    Row { id: "S16", implemented: true, tested: "engine::tests::scan_skips_secrets_and_symlinks", unverified: "", gap: "" },
    Row { id: "S17", implemented: true, tested: "inventory sample everything_search", unverified: "", gap: "Everything is not downloaded or installed." },
    Row { id: "S18", implemented: true, tested: "engine::tests::telemetry_stays_off", unverified: "", gap: "Full-text cloud sync is not implemented." },
    Row { id: "S19", implemented: true, tested: "engine::tests::connector_sync_is_idempotent", unverified: "Live Notion, Google, GitHub, Feishu, Lark, and Oomol were not called.", gap: "Default transport is the in-process fixture. Public hosts are blocked." },
    Row { id: "S20", implemented: true, tested: "connectors::tests::loopback_exchange_and_mapping_types", unverified: "Live APIs unverified.", gap: "First sync is one-way. No bidirectional merge." },
    Row { id: "S21", implemented: true, tested: "connectors::tests::hosts_stay_on_their_own_products", unverified: "Oomol was not contacted.", gap: "Hosted key+team is not Login with Oomol. Self-host OAuth is stored separately and not completed against a server. Oomol license redistribution was not cleared, so no Oomol package is vendored." },
    Row { id: "S22", implemented: true, tested: "inventory::tests::inventory_does_not_invent_gpu_or_tpu", unverified: "", gap: "" },
    Row { id: "S23", implemented: true, tested: "inventory::tests::inventory_does_not_invent_gpu_or_tpu", unverified: "", gap: "" },
    Row { id: "S24", implemented: true, tested: "inventory::tests::inventory_does_not_invent_gpu_or_tpu", unverified: "Hermes was not verified.", gap: "Unknown executables are not started." },
    Row { id: "S25", implemented: true, tested: "inventory::tests::inventory_does_not_invent_gpu_or_tpu", unverified: "", gap: "No global top-10 is shown." },
    Row { id: "S26", implemented: true, tested: "http::tests::pages_and_auth", unverified: "", gap: "Single local tenant. Admin is a separate token, not a URL." },
    Row { id: "S27", implemented: true, tested: "http::tests::pages_and_auth", unverified: "", gap: "" },
    Row { id: "S28", implemented: true, tested: "this branch", unverified: "", gap: "Synthetic fixtures only." },
    Row { id: "S29", implemented: true, tested: "ui copy", unverified: "No usability study.", gap: "" },
    Row { id: "S30", implemented: true, tested: "product branch still has no site/", unverified: "", gap: "Showcase and GEO stay on main. This product checkout does not contain site/." },
    Row { id: "S31", implemented: true, tested: "pay::tests::lifecycle_is_idempotent_and_partial_refund_keeps_entitlement", unverified: "No merchant sandbox and no production payment.", gap: "Sandbox is not a completed paid competition entry." },
    Row { id: "S32", implemented: true, tested: "pay::tests::bad_amount_bad_sig_and_stale_pending_do_not_move_state", unverified: "", gap: "Price and refund policy are not approved. Local files stay usable unpaid." },
    Row { id: "S33", implemented: true, tested: "third_party/t3code/NOTICE.md", unverified: "", gap: "GPL/AGPL panel code and OpenViking were not copied." },
    Row { id: "S34", implemented: true, tested: "decisions::tests::injection_and_low_confidence_do_not_write", unverified: "", gap: "NIM was not called. Decision text is local rules, not a model." },
    Row { id: "S35", implemented: true, tested: "this coding session", unverified: "", gap: "Owner merchant inputs remain blocked. Work continues on this branch." },
];

pub fn matrix() -> Value {
    let rows: Vec<Value> = ROWS
        .iter()
        .map(|r| {
            json!({
                "id": r.id,
                "implemented": r.implemented,
                "tested": r.tested,
                "unverified": r.unverified,
                "gap": r.gap,
                "parity": false,
            })
        })
        .collect();
    let gaps = rows
        .iter()
        .filter(|r| !r["gap"].as_str().unwrap_or("").is_empty())
        .count();
    json!({
        "product": "ymzz-vibe",
        "version": env!("CARGO_PKG_VERSION"),
        "t3_upstream": "https://github.com/pingdotgg/t3code",
        "t3_tag": "v0.1.8",
        "t3_commit": "bf469bb19669671d0df2efda74ed73867a7137c0",
        "parity": false,
        "note": "Statuses are per row. A gap means that part of the requirement is still open.",
        "rows": rows,
        "open_gaps": gaps,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn required_rows_exist_and_do_not_claim_parity() {
        let body = matrix();
        assert_eq!(body["parity"], false);
        let rows = body["rows"].as_array().unwrap();
        let mut ids = Vec::new();
        for row in rows {
            ids.push(row["id"].as_str().unwrap().to_string());
            assert_eq!(row["parity"], false);
        }
        for n in 1..=6 {
            assert!(ids.iter().any(|id| id == &format!("T0{n}")));
        }
        for n in [
            10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
            32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45,
        ] {
            assert!(ids.iter().any(|id| id == &format!("T{n}")), "missing T{n}");
        }
        for n in 1..=35 {
            assert!(
                ids.iter().any(|id| id == &format!("S{n:02}")),
                "missing S{n:02}"
            );
        }
        for must_gap in ["T03", "T23", "T34", "T37", "T40", "T41", "T44"] {
            let row = rows.iter().find(|r| r["id"] == must_gap).unwrap();
            assert!(!row["gap"].as_str().unwrap().is_empty(), "{must_gap}");
            assert_eq!(row["implemented"], false);
        }
        let t02 = rows.iter().find(|r| r["id"] == "T02").unwrap();
        assert_eq!(t02["implemented"], true);
        assert!(t02["gap"].as_str().unwrap().contains("Windows"));
        assert_eq!(t02["parity"], false);
    }
}
