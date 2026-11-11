use crate::dates::local_dates_for_unix;
use crate::paths::{is_secret_name, mount_label};
use crate::query::Rec;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

pub fn extension_of(name: &str) -> String {
    let base = name.rsplit(['/', '\\']).next().unwrap_or(name);
    if let Some((stem, ext)) = base.rsplit_once('.') {
        if stem.is_empty() || ext.is_empty() {
            return String::new();
        }
        format!(".{ext}")
    } else {
        String::new()
    }
}

pub fn scan_root(root: &Path, tz: &str) -> Result<Vec<Rec>, String> {
    let canon = root.canonicalize().map_err(|e| format!("root: {e}"))?;
    if canon == Path::new("/") && std::env::var("YMZZ_ALLOW_ROOT_FS").ok().as_deref() != Some("1") {
        return Err("refusing to scan filesystem root".into());
    }
    let mut found: Vec<Found> = Vec::new();
    walk(&canon, &canon, &mut found)?;
    let stamps: Vec<i64> = found.iter().map(|f| f.mtime.unwrap_or(0)).collect();
    let dates = if found.is_empty() {
        Vec::new()
    } else {
        local_dates_for_unix(tz, &stamps)?
    };
    let mut out = Vec::new();
    for (idx, item) in found.into_iter().enumerate() {
        let modified = if item.mtime.is_none() {
            None
        } else {
            dates.get(idx).cloned().flatten()
        };
        out.push(Rec {
            id: item.id,
            drive: item.drive,
            path: item.rel,
            ext: item.ext,
            modified,
            readable: item.readable,
            version: item.version,
            bytes: item.bytes,
            skip_reason: item.skip,
            escapes: item.escapes,
            kind: item.kind,
        });
    }
    Ok(out)
}

struct Found {
    id: String,
    drive: String,
    rel: String,
    ext: String,
    mtime: Option<i64>,
    readable: bool,
    version: String,
    bytes: u64,
    skip: Option<String>,
    escapes: bool,
    kind: String,
}

fn walk(root: &Path, dir: &Path, out: &mut Vec<Found>) -> Result<(), String> {
    if out.len() > 5000 {
        return Err("scan cap 5000".into());
    }
    let rd = match fs::read_dir(dir) {
        Ok(rd) => rd,
        Err(e) => {
            out.push(skip_dir(root, dir, &e.to_string()));
            return Ok(());
        }
    };
    for ent in rd.flatten() {
        if out.len() > 5000 {
            break;
        }
        let path = ent.path();
        let meta = match fs::symlink_metadata(&path) {
            Ok(m) => m,
            Err(e) => {
                out.push(skip_file(root, &path, &e.to_string(), true));
                continue;
            }
        };
        if meta.file_type().is_symlink() {
            let escapes = fs::canonicalize(&path)
                .map(|c| !c.starts_with(root))
                .unwrap_or(true);
            let mut rec = skip_file(
                root,
                &path,
                if escapes {
                    "symlink_escapes_root"
                } else {
                    "symlink_not_followed"
                },
                false,
            );
            rec.escapes = escapes;
            rec.kind = "symlink".into();
            out.push(rec);
            continue;
        }
        if meta.file_type().is_dir() {
            walk(root, &path, out)?;
            continue;
        }
        if !meta.file_type().is_file() {
            out.push(skip_file(root, &path, "special_file", false));
            continue;
        }
        let name = ent.file_name().to_string_lossy().to_string();
        if is_secret_name(&name) {
            let mut rec = skip_file(root, &path, "secret_name_content_not_read", false);
            rec.bytes = meta.len();
            out.push(rec);
            continue;
        }
        let mtime = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64);
        let rel = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");
        let version = format!("{}:{}", meta.len(), mtime.unwrap_or(0));
        out.push(Found {
            id: format!("fs_{}", &crate::util::sha256_bytes(rel.as_bytes())[..16]),
            drive: mount_label(&path),
            rel,
            ext: extension_of(&name),
            mtime,
            readable: true,
            version,
            bytes: meta.len(),
            skip: None,
            escapes: false,
            kind: "file".into(),
        });
    }
    Ok(())
}

fn skip_file(root: &Path, path: &Path, reason: &str, readable_error: bool) -> Found {
    let rel = path
        .strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/");
    let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
    Found {
        id: format!("skip_{}", &crate::util::sha256_bytes(rel.as_bytes())[..12]),
        drive: mount_label(path),
        rel,
        ext: extension_of(name),
        mtime: None,
        readable: false,
        version: "unread".into(),
        bytes: 0,
        skip: Some(if readable_error {
            format!("unreadable:{reason}")
        } else {
            reason.into()
        }),
        escapes: false,
        kind: "skipped".into(),
    }
}

fn skip_dir(root: &Path, path: &Path, reason: &str) -> Found {
    skip_file(root, path, reason, true)
}

pub fn rel_of(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

pub fn ensure_dir(path: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|e| e.to_string())
}
