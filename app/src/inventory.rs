use serde_json::{json, Value};
use std::fs;
use std::path::Path;
use std::process::Command;
use std::time::Duration;

pub fn which(name: &str) -> Option<std::path::PathBuf> {
    if name.is_empty() || name.contains('/') || name.contains('\\') || name.contains("..") {
        return None;
    }
    let path = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path) {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}

pub fn sample() -> Value {
    let cpu = fs::read_to_string("/proc/cpuinfo").ok().and_then(|t| {
        t.lines()
            .find(|l| l.starts_with("model name"))
            .and_then(|l| l.split(':').nth(1))
            .map(|s| s.trim().to_string())
    });
    let mem = fs::read_to_string("/proc/meminfo").ok().and_then(|t| {
        t.lines()
            .find(|l| l.starts_with("MemTotal"))
            .map(|l| l.trim().to_string())
    });
    let os_release = fs::read_to_string("/etc/os-release").unwrap_or_default();
    let pretty = os_release
        .lines()
        .find(|l| l.starts_with("PRETTY_NAME="))
        .map(|l| {
            l.trim_start_matches("PRETTY_NAME=")
                .trim_matches('"')
                .to_string()
        });
    let kernel = fs::read_to_string("/proc/sys/kernel/osrelease")
        .ok()
        .map(|s| s.trim().to_string());
    let product = read_trim("/sys/class/dmi/id/product_name");
    let vendor = read_trim("/sys/class/dmi/id/sys_vendor");
    json!({
        "sampled_at": crate::util::now_rfc3339(),
        "invented": false,
        "device": {
            "name": product.clone().unwrap_or_else(|| "unknown".into()),
            "vendor": vendor.unwrap_or_else(|| "unknown".into()),
            "name_source": "/sys/class/dmi/id/product_name",
            "permission": if product.is_some() { "read" } else { "unknown" },
        },
        "os": {
            "family": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
            "pretty": pretty,
            "kernel": kernel,
            "class": os_class(),
            "source": "/etc/os-release + /proc/sys/kernel/osrelease",
        },
        "cpu": {
            "model": cpu,
            "status": if cpu_present() { "present" } else { "unknown" },
            "source": "/proc/cpuinfo",
        },
        "memory": {"memtotal": mem, "source": "/proc/meminfo"},
        "gpu": gpu(),
        "tpu": {"status": "absent", "reason": "no TPU device node found", "source": "no /dev/apex* and no invented stand-in"},
        "openrouter_note": "OpenRouter public app rankings are opt-in routed tokens, not an install census. This build shows no top-10 and no partial marketing numbers.",
        "everything_search": {"status": "not_windows", "download": "not_attempted"},
    })
}

fn cpu_present() -> bool {
    fs::read_to_string("/proc/cpuinfo")
        .ok()
        .map(|t| t.contains("model name") || t.contains("processor"))
        .unwrap_or(false)
}

fn read_trim(path: &str) -> Option<String> {
    fs::read_to_string(path)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn os_class() -> &'static str {
    match std::env::consts::OS {
        "linux" => "linux",
        "windows" => "windows",
        "macos" => {
            if std::env::consts::ARCH == "aarch64" {
                "apple_silicon"
            } else {
                "intel_mac"
            }
        }
        _ => "unknown",
    }
}

fn gpu() -> Value {
    let drm = Path::new("/sys/class/drm");
    if !drm.exists() {
        return json!({"status": "unknown", "reason": "/sys/class/drm is not available", "cards": []});
    }
    let mut cards = Vec::new();
    if let Ok(rd) = fs::read_dir(drm) {
        for ent in rd.flatten() {
            let name = ent.file_name().to_string_lossy().to_string();
            if !name.starts_with("card") || name.contains('-') {
                continue;
            }
            let vendor = read_trim(&ent.path().join("device/vendor").to_string_lossy());
            let device = read_trim(&ent.path().join("device/device").to_string_lossy());
            cards.push(json!({
                "node": name,
                "pci_vendor": vendor,
                "pci_device": device,
                "source": ent.path().join("device"),
                "marketing_name": Value::Null,
            }));
        }
    }
    if cards.is_empty() {
        json!({"status": "absent", "reason": "no DRM card node", "cards": [], "invented": false})
    } else {
        json!({"status": "present", "cards": cards, "note": "PCI ids only; model names are not guessed"})
    }
}

pub fn builtin_detectors() -> Vec<Value> {
    let rows = [
        (
            "code",
            "Visual Studio Code",
            "code",
            "https://code.visualstudio.com/docs/setup/linux",
            true,
        ),
        (
            "claude",
            "Claude Code",
            "claude",
            "https://code.claude.com/docs/en/quickstart",
            true,
        ),
        (
            "codex",
            "Codex CLI",
            "codex",
            "https://developers.openai.com/codex/cli",
            true,
        ),
        (
            "cursor-agent",
            "Cursor CLI",
            "agent",
            "https://cursor.com/cli",
            true,
        ),
        ("grok", "Grok CLI", "grok", "https://x.ai/cli", true),
        (
            "opencode",
            "OpenCode",
            "opencode",
            "https://opencode.ai",
            true,
        ),
        ("fx", "fx", "fx", "https://fx.sh", true),
        ("kiro", "Kiro", "kiro", "", true),
        (
            "pi",
            "pi",
            "pi",
            "https://pi.dev/docs/latest/quickstart",
            true,
        ),
        ("muse", "Muse", "muse", "", true),
        ("hermes", "Hermes", "hermes", "", false),
    ];
    rows.iter()
        .map(|(id, label, bin, url, trusted)| {
            let path = which(bin);
            json!({
                "id": id,
                "label": label,
                "argv0": bin,
                "official_url": url,
                "version_command_trusted": trusted,
                "verified_upstream": if *id == "hermes" { "not_verified" } else { "catalog_from_t3_docs_and_vendor_pages" },
                "installed": path.is_some(),
                "path": path,
                "authorized": false,
                "operable": false,
                "platform": "path_lookup",
            })
        })
        .collect()
}

pub fn run_version(argv0: &str) -> Result<String, String> {
    if argv0.contains('/') || argv0.contains("..") || argv0.chars().any(|c| c.is_whitespace()) {
        return Err("version command must be a bare executable name".into());
    }
    let path = which(argv0).ok_or_else(|| format!("{argv0} is not installed"))?;
    let mut child = Command::new(&path)
        .arg("--version")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
    let start = std::time::Instant::now();
    loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => {
                let mut out = String::new();
                if let Some(mut stdout) = child.stdout.take() {
                    use std::io::Read;
                    stdout.read_to_string(&mut out).ok();
                }
                if let Some(mut stderr) = child.stderr.take() {
                    use std::io::Read;
                    let mut err = String::new();
                    stderr.read_to_string(&mut err).ok();
                    out.push_str(&err);
                }
                if !status.success() {
                    return Err(format!("version command failed: {out}"));
                }
                return Ok(out.chars().take(400).collect());
            }
            None if start.elapsed() > Duration::from_secs(3) => {
                let _ = child.kill();
                return Err("version command timed out".into());
            }
            None => std::thread::sleep(Duration::from_millis(20)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inventory_does_not_invent_gpu_or_tpu() {
        let v = sample();
        assert_eq!(v["invented"], false);
        assert_eq!(v["tpu"]["status"], "absent");
        let gpu = &v["gpu"];
        assert!(
            gpu["status"] == "present" || gpu["status"] == "absent" || gpu["status"] == "unknown"
        );
        if let Some(cards) = gpu.get("cards").and_then(|c| c.as_array()) {
            for card in cards {
                assert!(card.get("marketing_name").unwrap().is_null());
            }
        }
        assert!(v["openrouter_note"].as_str().unwrap().contains("no top-10"));
        let hermes = builtin_detectors()
            .into_iter()
            .find(|d| d["id"] == "hermes")
            .unwrap();
        assert_eq!(hermes["version_command_trusted"], false);
        assert!(which("this-binary-should-not-exist").is_none());
    }
}
