use crate::util;
use serde_json::{json, Value};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

pub static OCR_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

const PINS: &str = include_str!("../ocr/pins.json");
const MAX_ARCHIVE: u64 = 32 * 1024 * 1024;

pub fn pins() -> Value {
    serde_json::from_str(PINS).unwrap_or(json!({}))
}

pub fn cache_dir(data_dir: &Path) -> PathBuf {
    if let Ok(p) = std::env::var("YMZZ_OCR_CACHE") {
        if !p.is_empty() {
            return PathBuf::from(p);
        }
    }
    data_dir.join("ocr-cache")
}

pub fn python_for(data_dir: &Path) -> PathBuf {
    if let Ok(p) = std::env::var("YMZZ_OCR_PYTHON") {
        if !p.is_empty() {
            return PathBuf::from(p);
        }
    }
    let local = data_dir.join("ocr-runtime/bin/python");
    if local.is_file() {
        return local;
    }
    PathBuf::from("python3")
}

static RUNTIME_RUNNING: AtomicBool = AtomicBool::new(false);

pub fn start_runtime(data_dir: &Path) -> Result<Value, String> {
    if RUNTIME_RUNNING.swap(true, Ordering::AcqRel) {
        return runtime_status(data_dir);
    }
    let data = data_dir.to_path_buf();
    write_runtime_status(&data, "running", "preparing the isolated runtime");
    thread::spawn(move || {
        let result = install_blocking(&data);
        match result {
            Ok(()) => write_runtime_status(&data, "ready", "hashed wheels installed"),
            Err(err) if err == "cancelled" => write_runtime_status(&data, "cancelled", "cancelled"),
            Err(err) => write_runtime_status(&data, "failed", &err),
        }
        let _ = fs::remove_file(data.join("ocr-runtime.pid"));
        RUNTIME_RUNNING.store(false, Ordering::Release);
    });
    Ok(json!({"state": "running", "background": true, "bundled": false}))
}

pub fn runtime_status(data_dir: &Path) -> Result<Value, String> {
    let path = data_dir.join("ocr-runtime.status");
    if let Ok(text) = fs::read_to_string(&path) {
        if let Ok(v) = serde_json::from_str::<Value>(&text) {
            return Ok(v);
        }
    }
    let python = data_dir.join("ocr-runtime/bin/python");
    Ok(json!({"state": if python.is_file() { "ready" } else { "absent" }, "background": false}))
}

pub fn cancel_runtime(data_dir: &Path) -> Result<Value, String> {
    let _ = fs::write(data_dir.join("ocr-runtime.cancel"), "1");
    if let Ok(pid) = fs::read_to_string(data_dir.join("ocr-runtime.pid")) {
        let pid = pid.trim();
        if !pid.is_empty() && pid.chars().all(|c| c.is_ascii_digit()) {
            #[cfg(unix)]
            {
                let _ = Command::new("kill").args(["-TERM", pid]).status();
            }
        }
    }
    write_runtime_status(data_dir, "cancelled", "cancel requested");
    Ok(json!({"state": "cancelled"}))
}

fn install_blocking(data_dir: &Path) -> Result<(), String> {
    let _ = fs::remove_file(data_dir.join("ocr-runtime.cancel"));
    let dest = data_dir.join("ocr-runtime");
    let python = dest.join("bin/python");
    if !python.is_file() {
        let status = Command::new("python3")
            .args(["-m", "venv"])
            .arg(&dest)
            .status()
            .map_err(|e| format!("python3 -m venv: {e}"))?;
        if !status.success() {
            return Err("could not create the OCR virtualenv; python3-venv is required".into());
        }
    }
    if data_dir.join("ocr-runtime.cancel").is_file() {
        return Err("cancelled".into());
    }
    let req = util::repo_root().join("app/ocr/requirements-ocr-hashed.txt");
    if !req.is_file() {
        return Err("hashed requirements file is missing".into());
    }
    let mut child = Command::new(&python)
        .args([
            "-m",
            "pip",
            "install",
            "--require-hashes",
            "--only-binary=:all:",
            "-r",
        ])
        .arg(&req)
        .spawn()
        .map_err(|e| e.to_string())?;
    let _ = fs::write(data_dir.join("ocr-runtime.pid"), child.id().to_string());
    let status = child.wait().map_err(|e| e.to_string())?;
    if data_dir.join("ocr-runtime.cancel").is_file() {
        return Err("cancelled".into());
    }
    if !status.success() {
        return Err("pip install of the hash-pinned OCR runtime failed".into());
    }
    Ok(())
}

fn write_runtime_status(data_dir: &Path, state: &str, detail: &str) {
    let _ = fs::write(
        data_dir.join("ocr-runtime.status"),
        json!({"state": state, "detail": detail, "bundled": false}).to_string(),
    );
}

pub fn ensure(data_dir: &Path) -> Result<Value, String> {
    let cache = cache_dir(data_dir);
    fs::create_dir_all(&cache).map_err(|e| e.to_string())?;
    let _ = fs::remove_file(cache.join("cancel"));
    let spec = pins();
    let files = spec
        .get("files")
        .and_then(|v| v.as_array())
        .ok_or("pins missing")?;
    let mut ready = Vec::new();
    for file in files {
        let id = file.get("id").and_then(|v| v.as_str()).ok_or("pin id")?;
        let url = file.get("url").and_then(|v| v.as_str()).ok_or("pin url")?;
        let sha = file
            .get("sha256")
            .and_then(|v| v.as_str())
            .ok_or("pin sha256")?;
        if sha.len() != 64 || !url.starts_with("https://") {
            return Err("refusing an unpinned or non-https model url".into());
        }
        let name = url.rsplit('/').next().unwrap_or(id);
        let dest = cache.join(name);
        write_status(&cache, &format!("checking {id}"));
        if !digest_matches(&dest, sha)? {
            if cancel_requested(&cache) {
                return Err("下載已取消".into());
            }
            write_status(&cache, &format!("downloading {id}"));
            download_https(url, &dest, &cache)?;
            if !digest_matches(&dest, sha)? {
                let _ = fs::remove_file(&dest);
                return Err(format!("{id} digest does not match the pin; file removed"));
            }
        }
        if name.ends_with(".tar") {
            let extracted = cache.join("extracted").join(id);
            if !extracted.join("inference.pdmodel").exists()
                && !model_dir(&extracted).join("inference.pdmodel").exists()
            {
                write_status(&cache, &format!("extracting {id}"));
                extract_archive(&dest, &extracted)?;
            }
        }
        ready.push(json!({"id": id, "sha256": sha, "bytes": file.get("bytes").cloned().unwrap_or(Value::Null)}));
    }
    write_status(&cache, "ready");
    Ok(json!({
        "downloadable": true,
        "cached": true,
        "provenance": spec.get("provenance").cloned().unwrap_or(Value::Null),
        "files": ready,
    }))
}

pub fn recognize_image(data_dir: &Path, image: &Path) -> Result<Value, String> {
    let ready = ensure(data_dir)?;
    let cache = cache_dir(data_dir);
    let det = model_dir(&cache.join("extracted").join("en_PP-OCRv3_det"));
    let rec = model_dir(&cache.join("extracted").join("en_PP-OCRv3_rec"));
    let cls = model_dir(&cache.join("extracted").join("ch_ppocr_mobile_v2.0_cls"));
    let dict = cache.join("en_dict.txt");
    if image.symlink_metadata().map(|m| m.file_type().is_symlink()).unwrap_or(true) {
        return Err("不讀取連結檔".into());
    }
    let python = python_for(data_dir);
    let worker = util::repo_root().join("app/ocr/paddle_worker.py");
    let mut child = Command::new(&python)
        .arg(&worker)
        .arg("recognize")
        .arg(image)
        .arg(&det)
        .arg(&rec)
        .arg(&cls)
        .arg(&dict)
        .env("HOME", &cache)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("ocr python: {e}"))?;
    let started = std::time::Instant::now();
    loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => {
                let mut out = String::new();
                let mut err = String::new();
                if let Some(mut o) = child.stdout.take() {
                    o.read_to_string(&mut out).ok();
                }
                if let Some(mut e) = child.stderr.take() {
                    e.read_to_string(&mut err).ok();
                }
                if !status.success() {
                    return Err(format!("辨識沒有完成: {out} {err}"));
                }
                let mut value: Value =
                    serde_json::from_str(out.trim()).map_err(|e| format!("ocr json: {e} {out}"))?;
                if let Some(obj) = value.as_object_mut() {
                    obj.insert("pins".into(), ready);
                    obj.insert("untrusted".into(), json!(true));
                }
                return Ok(value);
            }
            None if started.elapsed() > Duration::from_secs(120) => {
                let _ = child.kill();
                return Err("辨識等太久了".into());
            }
            None => std::thread::sleep(Duration::from_millis(50)),
        }
    }
}

pub fn recognize_sample(data_dir: &Path) -> Result<Value, String> {
    let ready = ensure(data_dir)?;
    let cache = cache_dir(data_dir);
    let det = model_dir(&cache.join("extracted").join("en_PP-OCRv3_det"));
    let rec = model_dir(&cache.join("extracted").join("en_PP-OCRv3_rec"));
    let cls = model_dir(&cache.join("extracted").join("ch_ppocr_mobile_v2.0_cls"));
    let dict = cache.join("en_dict.txt");
    let image = cache.join("synthetic-hello.png");
    let python = python_for(data_dir);
    let worker = util::repo_root().join("app/ocr/paddle_worker.py");
    let mut child = Command::new(&python)
        .arg(&worker)
        .arg("sample")
        .arg(&image)
        .arg(&det)
        .arg(&rec)
        .arg(&cls)
        .arg(&dict)
        .env("HOME", &cache)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("ocr python: {e}"))?;
    let started = std::time::Instant::now();
    loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => {
                let mut out = String::new();
                let mut err = String::new();
                if let Some(mut o) = child.stdout.take() {
                    o.read_to_string(&mut out).ok();
                }
                if let Some(mut e) = child.stderr.take() {
                    e.read_to_string(&mut err).ok();
                }
                if !status.success() {
                    return Err(format!("ocr failed: {out} {err}"));
                }
                let mut value: Value =
                    serde_json::from_str(out.trim()).map_err(|e| format!("ocr json: {e} {out}"))?;
                if let Some(obj) = value.as_object_mut() {
                    obj.insert("pins".into(), ready);
                    obj.insert("untrusted".into(), json!(true));
                }
                return Ok(value);
            }
            None if started.elapsed() > Duration::from_secs(120) => {
                let _ = child.kill();
                return Err("ocr timed out".into());
            }
            None => std::thread::sleep(Duration::from_millis(50)),
        }
    }
}

pub fn cancel(data_dir: &Path) -> Result<Value, String> {
    let cache = cache_dir(data_dir);
    fs::create_dir_all(&cache).map_err(|e| e.to_string())?;
    fs::write(cache.join("cancel"), b"1").map_err(|e| e.to_string())?;
    Ok(json!({"cancel_requested": true}))
}

fn model_dir(extracted: &Path) -> PathBuf {
    if extracted.join("inference.pdmodel").exists() {
        return extracted.to_path_buf();
    }
    if let Ok(rd) = fs::read_dir(extracted) {
        for entry in rd.flatten() {
            let path = entry.path();
            if path.is_dir() && path.join("inference.pdmodel").exists() {
                return path;
            }
        }
    }
    extracted.to_path_buf()
}

fn digest_matches(path: &Path, expect: &str) -> Result<bool, String> {
    if !path.is_file() {
        return Ok(false);
    }
    if path
        .symlink_metadata()
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(true)
    {
        return Err("refusing to hash a symlink".into());
    }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    if bytes.len() as u64 > MAX_ARCHIVE {
        return Err("archive larger than the pinned cap".into());
    }
    Ok(hex_sha256(&bytes) == expect)
}

fn hex_sha256(bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    hex::encode(Sha256::digest(bytes))
}

fn download_https(url: &str, dest: &Path, cache: &Path) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = dest.with_extension("partial");
    let mut child = Command::new("curl")
        .args([
            "--fail",
            "--location",
            "--retry",
            "3",
            "--retry-delay",
            "1",
            "--proto",
            "=https",
            "--tlsv1.2",
            "--max-filesize",
            "33554432",
            "-o",
        ])
        .arg(&tmp)
        .arg(url)
        .spawn()
        .map_err(|e| format!("curl: {e}"))?;
    let started = std::time::Instant::now();
    loop {
        if cancel_requested(cache) {
            let _ = child.kill();
            let _ = fs::remove_file(&tmp);
            return Err("下載已取消".into());
        }
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) if status.success() => break,
            Some(_) => {
                let _ = fs::remove_file(&tmp);
                return Err("辨識模型沒有下載完成".into());
            }
            None if started.elapsed() > Duration::from_secs(180) => {
                let _ = child.kill();
                let _ = fs::remove_file(&tmp);
                return Err("辨識模型下載逾時".into());
            }
            None => std::thread::sleep(Duration::from_millis(200)),
        }
    }
    fs::rename(&tmp, dest).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn line_is_unsafe(line: &str) -> bool {
    let line = line.trim();
    if line.is_empty() {
        return false;
    }
    if line.starts_with('l') || line.contains(" -> ") {
        return true;
    }
    let name = line.split_whitespace().last().unwrap_or("");
    name.starts_with('/') || name.split('/').any(|p| p == "..") || name.contains('\0')
}

pub fn extract_archive(tar_path: &Path, dest: &Path) -> Result<(), String> {
    if dest.exists() {
        fs::remove_dir_all(dest).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    let listing = Command::new("tar")
        .args(["-tvf"])
        .arg(tar_path)
        .output()
        .map_err(|e| e.to_string())?;
    if !listing.status.success() {
        return Err("cannot list archive".into());
    }
    let text = String::from_utf8_lossy(&listing.stdout);
    for line in text.lines() {
        if line_is_unsafe(line) {
            let _ = fs::remove_dir_all(dest);
            return Err(format!("archive entry rejected: {line}"));
        }
    }
    let status = Command::new("tar")
        .args(["-xf"])
        .arg(tar_path)
        .arg("-C")
        .arg(dest)
        .status()
        .map_err(|e| e.to_string())?;
    if !status.success() {
        let _ = fs::remove_dir_all(dest);
        return Err("extract failed".into());
    }
    reject_symlinks(dest)?;
    Ok(())
}

fn reject_symlinks(root: &Path) -> Result<(), String> {
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            let meta = fs::symlink_metadata(&path).map_err(|e| e.to_string())?;
            if meta.file_type().is_symlink() {
                let _ = fs::remove_dir_all(root);
                return Err(format!("symlink in archive: {}", path.display()));
            }
            if meta.is_dir() {
                stack.push(path);
            }
        }
    }
    Ok(())
}

fn cancel_requested(cache: &Path) -> bool {
    cache.join("cancel").is_file()
}

fn write_status(cache: &Path, text: &str) {
    let _ = fs::write(cache.join("status"), text);
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(unix)]
    use std::os::unix::fs::symlink;

    #[test]
    fn listing_rejects_symlink_and_parent() {
        assert!(line_is_unsafe("lrwxrwxrwx 0 u 0 date evil -> /etc/passwd"));
        assert!(line_is_unsafe("-rw-r--r-- 0 u 0 date ../escape"));
        assert!(!line_is_unsafe(
            "-rw-r--r-- 0 u 0 date en_PP-OCRv3_det_infer/inference.pdmodel"
        ));
    }

    #[cfg(unix)]
    #[test]
    fn extract_refuses_a_symlink_member() {
        let dir = std::env::temp_dir().join(format!("ymzz-tar-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(dir.join("in")).unwrap();
        symlink("/etc/passwd", dir.join("in/evil")).unwrap();
        let tar_path = dir.join("bad.tar");
        let made = Command::new("tar")
            .args(["-cf"])
            .arg(&tar_path)
            .arg("-C")
            .arg(dir.join("in"))
            .arg("evil")
            .status()
            .unwrap();
        assert!(made.success());
        let dest = dir.join("out");
        let err = extract_archive(&tar_path, &dest).unwrap_err();
        assert!(err.contains("rejected") || err.contains("symlink"));
        assert!(!dest.join("evil").exists());
        let _ = fs::remove_dir_all(&dir);
    }
}
