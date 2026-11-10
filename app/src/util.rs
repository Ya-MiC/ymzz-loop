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
    let mut f = File::open("/dev/urandom").expect("urandom");
    let mut buf = [0u8; 8];
    f.read_exact(&mut buf).expect("urandom read");
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
        return Path::new(&p).to_path_buf();
    }
    Path::new(env!("CARGO_MANIFEST_DIR")).join("..")
}

pub fn mask_secret(value: &str) -> String {
    if value.is_empty() {
        return String::new();
    }
    let tail: String = value.chars().rev().take(2).collect::<String>().chars().rev().collect();
    format!("••••{tail}")
}
