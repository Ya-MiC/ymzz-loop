//! 稟冊 window. Desktop builds start the Rust core as a sidecar on 127.0.0.1.
//! Phone builds link that same core and answer the page through one command,
//! because a phone package cannot launch the desktop binary.

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::path::{Path, PathBuf};
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::process::{Child, Command};
#[cfg(any(target_os = "android", target_os = "ios"))]
use std::sync::Arc;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::sync::Mutex;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::time::Duration;
use tauri::Manager;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::Url;
#[cfg_attr(any(target_os = "android", target_os = "ios"), allow(unused_imports))]
use tauri::RunEvent;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
const PORT: u16 = 1413;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
static CORE: Mutex<Option<Child>> = Mutex::new(None);

#[cfg(any(target_os = "android", target_os = "ios"))]
struct PhoneCore(Arc<ymzz_vibe::engine::App>);

#[derive(serde::Serialize)]
struct CoreHttp {
    status: u16,
    body: String,
}

#[tauri::command]
fn core_http(app: tauri::AppHandle, method: String, path: String, body: String) -> Result<CoreHttp, String> {
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let state = app
            .try_state::<PhoneCore>()
            .ok_or_else(|| "本機核心還沒準備好。".to_string())?;
        let (status, text) = ymzz_vibe::http::bridge(&state.0, &method, &path, &body);
        return Ok(CoreHttp { status, body: text });
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let _ = (app, method, path, body);
        Err("這台電腦直接連本機服務。".into())
    }
}

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

#[cfg(any(target_os = "android", target_os = "ios"))]
fn open_phone_core(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let data = app.path().app_data_dir()?;
    std::fs::create_dir_all(&data)?;
    // Bundled scripts live next to the resources, not in the writable data folder.
    let resources = app.path().resource_dir().unwrap_or_else(|_| data.clone());
    let core = ymzz_vibe::engine::App::open(&data, &resources)
        .map_err(|err| std::io::Error::new(std::io::ErrorKind::Other, err))?;
    eprintln!("YMZZ_SMOKE core-ready");
    app.manage(PhoneCore(Arc::new(core)));
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![core_http])
        .on_page_load(|webview, payload| {
            #[cfg(any(target_os = "android", target_os = "ios"))]
            if payload.url().as_str().contains("recovery") {
                let _ = webview.eval("window.location.replace('index.html')");
            }
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                let _ = (webview, payload);
            }
        })
        .setup(|app| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                let resources = app.path().resource_dir().ok();
                let started = start_core(resources.as_deref());
                if let Some(window) = app.get_webview_window("main") {
                    if started.is_ok() {
                        let _ = window.navigate(Url::parse("http://127.0.0.1:1413/").expect("url"));
                    }
                }
            }
            #[cfg(any(target_os = "android", target_os = "ios"))]
            {
                open_phone_core(app)?;
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
