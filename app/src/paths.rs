use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

const RESERVED: &[&str] = &[
    "con", "prn", "aux", "nul", "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8",
    "com9", "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9",
];

pub fn sha256_bytes(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    hex::encode(h.finalize())
}

pub fn file_fingerprint(path: &Path) -> Result<(u64, u64, String), String> {
    let meta = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    if meta.file_type().is_symlink() {
        return Err("symlink is not a regular file".into());
    }
    if !meta.file_type().is_file() {
        return Err("not a regular file".into());
    }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let mtime = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    Ok((meta.len(), mtime, sha256_bytes(&bytes)))
}

pub fn is_secret_name(name: &str) -> bool {
    let n = name.to_ascii_lowercase();
    n == ".env"
        || n.starts_with(".env.")
        || n == "id_rsa"
        || n == "id_ed25519"
        || n == "credentials.json"
        || n.ends_with(".pem")
        || n.ends_with(".key")
        || n.contains("service-account")
        || n == "cookies.sqlite"
}

fn reserved(seg: &str) -> bool {
    let stem = seg.split('.').next().unwrap_or(seg).to_ascii_lowercase();
    RESERVED.contains(&stem.as_str())
}

/// Lexical containment. Rejects absolute paths, `..`, newlines, bidi overrides,
/// Windows reserved names, and symlink escapes when the path already exists.
pub fn resolve_inside(root: &Path, rel: &str) -> Result<PathBuf, String> {
    if rel.is_empty() || rel.len() > 240 {
        return Err("path length rejected".into());
    }
    if rel
        .chars()
        .any(|c| c == '\0' || c == '\n' || c == '\r' || c == '\u{202e}')
    {
        return Err("path contains a forbidden character".into());
    }
    if rel.starts_with('/') || rel.starts_with('\\') || rel.starts_with('~') {
        return Err("absolute path rejected".into());
    }
    if rel.chars().nth(1) == Some(':') {
        return Err("drive path rejected inside a root".into());
    }
    let canon_root = root.canonicalize().map_err(|e| format!("root: {e}"))?;
    if canon_root == Path::new("/")
        && std::env::var("YMZZ_ALLOW_ROOT_FS").ok().as_deref() != Some("1")
    {
        return Err("refusing filesystem root; pick a folder".into());
    }
    let mut acc = canon_root.clone();
    for seg in rel.split(['/', '\\']) {
        if seg.is_empty() || seg == "." {
            continue;
        }
        if seg == ".." {
            return Err("path traversal rejected".into());
        }
        if reserved(seg) {
            return Err(format!("reserved name rejected: {seg}"));
        }
        acc.push(seg);
    }
    if acc == canon_root {
        return Err("empty relative path".into());
    }
    if acc.exists() {
        let meta = fs::symlink_metadata(&acc).map_err(|e| e.to_string())?;
        if meta.file_type().is_symlink() {
            return Err("symlink write rejected".into());
        }
        let canon = acc.canonicalize().map_err(|e| e.to_string())?;
        if !canon.starts_with(&canon_root) {
            return Err("symlink or path escaped the root".into());
        }
    } else if let Some(parent) = acc.parent() {
        if parent.exists() {
            let canon_parent = parent.canonicalize().map_err(|e| e.to_string())?;
            if !canon_parent.starts_with(&canon_root) {
                return Err("parent escaped the root".into());
            }
        }
    }
    Ok(acc)
}

pub fn mount_label(path: &Path) -> String {
    let Ok(text) = fs::read_to_string("/proc/mounts") else {
        return "unknown-mount".into();
    };
    let canon = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    let mut best = "/".to_string();
    let mut best_len = 1usize;
    for line in text.lines() {
        let mut parts = line.split_whitespace();
        let _dev = parts.next();
        let Some(mnt) = parts.next() else { continue };
        let mnt = mnt.replace("\\040", " ");
        if canon.starts_with(&mnt) && mnt.len() >= best_len {
            best = mnt;
            best_len = best.len();
        }
    }
    best
}

#[derive(Clone, Debug)]
pub struct PlannedMove {
    pub from_rel: String,
    pub to_rel: String,
    pub from_abs: PathBuf,
    pub to_abs: PathBuf,
    pub len: u64,
    pub mtime: u64,
    pub sha256: String,
}

pub fn plan_move(root: &Path, from_rel: &str, to_rel: &str) -> Result<PlannedMove, String> {
    let from_abs = resolve_inside(root, from_rel)?;
    let to_abs = resolve_inside(root, to_rel)?;
    if to_abs.exists() {
        return Err("destination exists; overwrite is not allowed".into());
    }
    let (len, mtime, sha256) = file_fingerprint(&from_abs)?;
    Ok(PlannedMove {
        from_rel: from_rel.to_string(),
        to_rel: to_rel.to_string(),
        from_abs,
        to_abs,
        len,
        mtime,
        sha256,
    })
}

pub fn execute_move(root: &Path, plan: &PlannedMove, backup_dir: &Path) -> Result<(), String> {
    let again = plan_move(root, &plan.from_rel, &plan.to_rel)?;
    if again.sha256 != plan.sha256 || again.len != plan.len || again.mtime != plan.mtime {
        return Err("conflict: file changed after the plan; nothing moved".into());
    }
    fs::create_dir_all(backup_dir).map_err(|e| e.to_string())?;
    let backup = backup_dir.join(plan.from_rel.replace('/', "__"));
    fs::copy(&plan.from_abs, &backup).map_err(|e| format!("backup failed: {e}"))?;
    if let Some(parent) = plan.to_abs.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    if plan.to_abs.exists() {
        return Err("destination appeared; stopped".into());
    }
    fs::rename(&plan.from_abs, &plan.to_abs).map_err(|e| format!("rename failed: {e}"))?;
    Ok(())
}

pub fn undo_move(root: &Path, plan: &PlannedMove) -> Result<(), String> {
    let (len, mtime, sha) = file_fingerprint(&plan.to_abs)?;
    if sha != plan.sha256 || len != plan.len || mtime != plan.mtime {
        return Err("undo stopped: destination was modified after the move".into());
    }
    if plan.from_abs.exists() {
        return Err("undo stopped: original path is occupied".into());
    }
    // Re-check both paths are still inside the root.
    let _ = resolve_inside(root, &plan.to_rel)?;
    let _ = resolve_inside(root, &plan.from_rel)?;
    fs::rename(&plan.to_abs, &plan.from_abs).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::symlink;

    fn tmp() -> PathBuf {
        let p = std::env::temp_dir().join(format!("ymzz-paths-{}", std::process::id()));
        let _ = fs::remove_dir_all(&p);
        fs::create_dir_all(&p).unwrap();
        p
    }

    #[test]
    fn rejects_traversal_reserved_and_escape_symlink() {
        let root = tmp();
        assert!(resolve_inside(&root, "../outside.md").is_err());
        assert!(resolve_inside(&root, "a/../../etc/passwd").is_err());
        assert!(resolve_inside(&root, "CON.md").is_err());
        assert!(resolve_inside(&root, "nested/\u{202e}md").is_err());
        fs::write(root.join("note.md"), b"synthetic").unwrap();
        symlink("/etc/passwd", root.join("leak")).unwrap();
        let err = resolve_inside(&root, "leak").unwrap_err();
        assert!(err.contains("symlink"), "{err}");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn move_conflict_and_undo() {
        let root = tmp();
        fs::write(root.join("a.md"), b"one").unwrap();
        let plan = plan_move(&root, "a.md", "b.md").unwrap();
        fs::write(root.join("a.md"), b"changed").unwrap();
        let backup = root.join(".backup");
        let err = execute_move(&root, &plan, &backup).unwrap_err();
        assert!(err.contains("conflict"), "{err}");
        assert!(root.join("a.md").exists());
        assert!(!root.join("b.md").exists());

        let plan = plan_move(&root, "a.md", "b.md").unwrap();
        execute_move(&root, &plan, &backup).unwrap();
        assert_eq!(fs::read(root.join("b.md")).unwrap(), b"changed");
        fs::write(root.join("b.md"), b"edited-after").unwrap();
        assert!(undo_move(&root, &plan).is_err());
        assert_eq!(fs::read(root.join("b.md")).unwrap(), b"edited-after");
        fs::write(root.join("b.md"), b"changed").unwrap();
        // mtime may differ after rewrite of same bytes; fingerprint includes mtime.
        let now = file_fingerprint(&root.join("b.md")).unwrap();
        let mut plan2 = plan.clone();
        plan2.sha256 = now.2;
        plan2.len = now.0;
        plan2.mtime = now.1;
        undo_move(&root, &plan2).unwrap();
        assert!(root.join("a.md").exists());
        assert!(!root.join("b.md").exists());
        let _ = fs::remove_dir_all(&root);
    }
}
