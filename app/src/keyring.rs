//! Linux secret service via `secret-tool`. A missing daemon falls back to a
//! mode 0600 file. The secret is never returned to the window.

use std::io::Write;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

fn tool() -> Option<std::path::PathBuf> {
    crate::inventory::which("secret-tool")
}

fn id_ok(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 80
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

fn wait(child: &mut std::process::Child) -> Result<std::process::ExitStatus, String> {
    let started = Instant::now();
    loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => return Ok(status),
            None if started.elapsed() > Duration::from_secs(2) => {
                let _ = child.kill();
                return Err("keyring timed out".into());
            }
            None => std::thread::sleep(Duration::from_millis(20)),
        }
    }
}

pub fn store(id: &str, secret: &str) -> Result<(), String> {
    if !id_ok(id) {
        return Err("bad key id".into());
    }
    let tool = tool().ok_or("secret-tool is not installed")?;
    let mut child = Command::new(tool)
        .args([
            "store",
            "--label=ymzz-loop",
            "service",
            "ymzz-loop",
            "account",
            id,
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
    {
        let stdin = child.stdin.as_mut().ok_or("keyring stdin")?;
        stdin.write_all(secret.as_bytes()).map_err(|e| e.to_string())?;
    }
    child.stdin.take();
    let status = wait(&mut child)?;
    if status.success() {
        Ok(())
    } else {
        Err("keyring refused the secret".into())
    }
}

pub fn load(id: &str) -> Result<String, String> {
    if !id_ok(id) {
        return Err("bad key id".into());
    }
    let tool = tool().ok_or("secret-tool is not installed")?;
    let mut child = Command::new(tool)
        .args(["lookup", "service", "ymzz-loop", "account", id])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;
    let status = wait(&mut child)?;
    let mut out = String::new();
    if let Some(mut stdout) = child.stdout.take() {
        use std::io::Read;
        stdout.read_to_string(&mut out).ok();
    }
    if !status.success() {
        return Err("keyring item not found".into());
    }
    let text = out.trim().to_string();
    if text.is_empty() {
        return Err("keyring item empty".into());
    }
    Ok(text)
}

pub fn clear(id: &str) -> Result<(), String> {
    if !id_ok(id) {
        return Err("bad key id".into());
    }
    let Some(tool) = tool() else {
        return Ok(());
    };
    let mut child = Command::new(tool)
        .args(["clear", "service", "ymzz-loop", "account", id])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;
    let _ = wait(&mut child);
    Ok(())
}
