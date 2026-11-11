use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::Path;

pub fn sha256_bytes(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    hex::encode(h.finalize())
}

pub fn random_id(prefix: &str) -> String {
    let mut buf = [0u8; 8];
    #[cfg(unix)]
    {
        let mut f = File::open("/dev/urandom").expect("urandom");
        f.read_exact(&mut buf).expect("urandom read");
    }
    #[cfg(not(unix))]
    {
        use std::sync::atomic::{AtomicU64, Ordering};
        static N: AtomicU64 = AtomicU64::new(1);
        let n = N.fetch_add(1, Ordering::Relaxed);
        let tick = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64)
            .unwrap_or(0);
        let mixed = tick ^ n.wrapping_mul(0x9E37_79B9_7F4A_7C15) ^ (std::process::id() as u64);
        buf = mixed.to_le_bytes();
    }
    format!("{prefix}_{}", hex::encode(buf))
}

pub fn now_rfc3339() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

pub fn redact(text: &str, secrets: &[&str]) -> String {
    let mut out = text.to_string();
    for secret in secrets {
        if secret.len() >= 4 {
            out = out.replace(secret, "«redacted»");
        }
    }
    out
}

pub fn repo_root() -> std::path::PathBuf {
    if let Ok(p) = std::env::var("YMZZ_REPO") {
        if !p.is_empty() {
            return Path::new(&p).to_path_buf();
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            for candidate in [dir.join("resources"), dir.join("../Resources")] {
                if candidate.join("scripts/gate.mjs").is_file() {
                    return candidate;
                }
            }
        }
    }
    Path::new(env!("CARGO_MANIFEST_DIR")).join("..")
}

pub fn mask_secret(value: &str) -> String {
    if value.is_empty() {
        return String::new();
    }
    let tail: String = value
        .chars()
        .rev()
        .take(2)
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    format!("••••{tail}")
}
