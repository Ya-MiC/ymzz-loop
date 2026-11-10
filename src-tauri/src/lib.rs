//! 稟冊 window. Tauri 2 shows the local Rust core, which stays a separate process
//! so the core can keep compiling on Rust 1.83. Phone builds compile this
//! library, but they do not contain that desktop core.

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::path::{Path, PathBuf};
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::process::{Child, Command};
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::sync::Mutex;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::time::Duration;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::{Manager, Url};
#[cfg_attr(any(target_os = "android", target_os = "ios"), allow(unused_imports))]
use tauri::RunEvent;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
const PORT: u16 = 1413;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
static CORE: Mutex<Option<Child>> = Mutex::new(None);

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn data_dir() -> PathBuf {
    if let Ok(path) = std::env::var("YMZZ_DATA") {
        if !path.is_empty() {
            return PathBuf::from(path);
        }
    }
    #[cfg(target_os = "windows")]
    {
        let base = std::env::var("APPDATA").unwrap_or_else(|_| ".".into());
        return PathBuf::from(base).join("ymzz-bingce");
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
        return PathBuf::from(home).join("Library/Application Support/ymzz-bingce");
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
        PathBuf::from(home).join(".local/share/ymzz-bingce")
    }
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn core_binary(resource_dir: Option<&Path>) -> Option<PathBuf> {
    let name = if cfg!(windows) {
        "ymzz-vibe.exe"
    } else {
        "ymzz-vibe"
    };
    let mut candidates = Vec::new();
    if let Some(dir) = resource_dir {
        candidates.push(dir.join("core").join(name));
        candidates.push(dir.join(name));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join(name));
            candidates.push(parent.join("core").join(name));
        }
    }
    candidates.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../app/target/release")
            .join(name),
    );
    candidates.into_iter().find(|path| path.is_file())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn wait_for_port(port: u16) -> bool {
    for _ in 0..100 {
        if std::net::TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    false
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn start_core(resource_dir: Option<&Path>) -> Result<(), String> {
    let bin = core_binary(resource_dir).ok_or_else(|| {
        "找不到本機核心 ymzz-vibe。請先編譯 app，再放到安裝包的 core 目錄。".to_string()
    })?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&bin, std::fs::Permissions::from_mode(0o755));
    }
    let data = data_dir();
    let port = PORT.to_string();
    let data_arg = data.display().to_string();
    let mut cmd = Command::new(&bin);
    cmd.args(["serve", "--port", &port, "--data", &data_arg]);
    if let Some(dir) = resource_dir {
        if dir.join("scripts/gate.mjs").is_file() {
            cmd.env("YMZZ_REPO", dir);
        }
    }
    let child = cmd.spawn().map_err(|err| format!("本機核心沒有啟動：{err}"))?;
    *CORE.lock().expect("core lock") = Some(child);
    if !wait_for_port(PORT) {
        return Err("本機核心沒有在這台電腦上打開".into());
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                let resources = app.path().resource_dir().ok();
                start_core(resources.as_deref())?;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.navigate(Url::parse("http://127.0.0.1:1413/").expect("url"));
                }
            }
            #[cfg(any(target_os = "android", target_os = "ios"))]
            {
                let _ = app;
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("the window could not open")
        .run(|_app, event| {
            #[cfg(any(target_os = "android", target_os = "ios"))]
            {
                let _ = event;
            }
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            if matches!(event, RunEvent::Exit) {
                if let Some(mut child) = CORE.lock().expect("core lock").take() {
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }
        });
}
