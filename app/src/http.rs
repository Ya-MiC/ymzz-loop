use crate::engine::App;
use crate::net;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::Arc;
use std::time::Duration;

const MAX_BODY: usize = 1_048_576;

pub struct Request {
    pub method: String,
    pub path: String,
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
}

pub struct Response {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

pub fn serve(app: Arc<App>, listener: TcpListener) {
    for conn in listener.incoming() {
        let Ok(mut stream) = conn else { continue };
        let app = Arc::clone(&app);
        std::thread::spawn(move || {
            let _ = stream.set_read_timeout(Some(Duration::from_secs(8)));
            let res = match read_request(&mut stream) {
                Ok(req) => dispatch(&app, &req),
                Err(err) => json_response(400, &json!({"ok": false, "error": err})),
            };
            let _ = write_response(&mut stream, &res);
        });
    }
}

pub fn dispatch(app: &App, req: &Request) -> Response {
    let path = req.path.split('?').next().unwrap_or("/");
    if let Err(res) = authorize(
        app,
        req,
        req.method != "GET" && req.method != "HEAD",
        path.starts_with("/api/admin"),
    ) {
        return res;
    }
    if req.method == "GET" && (path == "/" || path == "/index.html") {
        return html(INDEX, Some(session_cookie(app)));
    }
    if req.method == "GET" && path == "/tokens.css" {
        return html_bytes(TOKENS.as_bytes(), "text/css; charset=utf-8", None);
    }
    if req.method == "GET" && path == "/app.css" {
        return html_bytes(CSS.as_bytes(), "text/css; charset=utf-8", None);
    }
    if req.method == "GET" && path == "/app.js" {
        return html_bytes(JS.as_bytes(), "text/javascript; charset=utf-8", None);
    }
    if req.method == "GET" && path == "/fonts.css" {
        return html_bytes(FONTS.as_bytes(), "text/css; charset=utf-8", None);
    }
    if req.method == "GET" && path.starts_with("/fonts/") {
        if let Some(bytes) = crate::fonts::bytes(path) {
            return html_bytes(bytes, "font/woff2", None);
        }
    }
    let body = if req.body.is_empty() {
        json!({})
    } else {
        match serde_json::from_slice::<Value>(&req.body) {
            Ok(value) if value.is_object() => value,
            Ok(_) => {
                return json_response(400, &json!({"ok": false, "error": "json object required"}))
            }
            Err(_) => return json_response(400, &json!({"ok": false, "error": "malformed json"})),
        }
    };
    let result = route(app, req.method.as_str(), path, &body);
    match result {
        Ok(value) => json_response(200, &value),
        Err(err) => {
            let status = if err.contains("forbidden") {
                403
            } else if err.contains("not found") {
                404
            } else if err.contains("conflict") {
                409
            } else {
                400
            };
            json_response(status, &json!({"ok": false, "error": err}))
        }
    }
}

fn route(app: &App, method: &str, path: &str, body: &Value) -> Result<Value, String> {
    match (method, path) {
        ("GET", "/api/health") => Ok(app.health()),
        ("GET", "/api/onboarding") => Ok(app.onboarding()),
        ("POST", "/api/onboarding") => app.save_onboarding(body),
        ("GET", "/api/session") => {
            let cfg = app.cfg.lock().expect("cfg").clone();
            Ok(json!({"role": "user", "csrf": cfg.csrf, "loopback": true}))
        }
        ("GET", "/api/capabilities") => Ok(app.capabilities()),
        ("GET", "/api/dashboard") => app.dashboard(),
        ("GET", "/api/v020") => app.v020(),
        ("GET", "/api/root") => Ok(app.root()),
        ("GET", "/api/places") => Ok(app.places()),
        ("POST", "/api/reveal") => {
            app.reveal(body.get("path").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/root") => {
            app.set_root(body.get("path").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/scan") => {
            let fallback = crate::dates::owner_clock_zone();
            let tz = body
                .get("timezone")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .unwrap_or(fallback.as_str());
            app.scan(tz)
        }
        ("POST", "/api/fixtures/synthetic") => app.load_synthetic(),
        ("POST", "/api/panel1/draft") => app.set_draft(body),
        ("GET", "/api/panel1/draft") => Ok(app.draft()),
        ("GET", "/api/panel1/groups") => Ok(app.file_groups()),
        ("POST", "/api/browse") => {
            app.browse(body.get("path").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/secrets") => {
            app.secret_put(body.get("value").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/panel1/query") => app.query(),
        ("GET", "/api/panel1/snapshot") => Ok(app.snapshot()),
        ("GET", "/api/panel1/compare") => Ok(app.compare()),
        ("POST", "/api/panel1/select-all") => app.select_all(
            body.get("dynamic")
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
        ),
        ("POST", "/api/panel1/persist") => app.persist_snapshot(),
        ("POST", "/api/panel1/restore") => app.restore_snapshot(),
        ("POST", "/api/panel1/semantic") => Ok(app.semantic(
            body.get("opt_in")
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
        )),
        ("POST", "/api/md") => app.write_md(
            body.get("path").and_then(|v| v.as_str()).unwrap_or(""),
            body.get("body").and_then(|v| v.as_str()).unwrap_or(""),
            body.get("dry_run")
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
        ),
        ("POST", "/api/organize/plan") => app.plan_move(
            body.get("from").and_then(|v| v.as_str()).unwrap_or(""),
            body.get("to").and_then(|v| v.as_str()).unwrap_or(""),
        ),
        ("POST", "/api/organize/confirm") => app.confirm_move(
            body.get("id").and_then(|v| v.as_str()).unwrap_or(""),
            body.get("confirm").and_then(|v| v.as_str()).unwrap_or(""),
        ),
        ("POST", "/api/organize/undo") => {
            app.undo_move(body.get("id").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("GET", "/api/threads") => app.threads_list(
            body.get("archived")
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
        ),
        ("POST", "/api/threads/retention") => app.retention(
            body.get("days")
                .and_then(|v| v.as_i64())
                .unwrap_or(30),
        ),
        ("GET", "/api/providers") => Ok(app.providers()),
        ("POST", "/api/v020/gate") => app.review_gate(),
        ("GET", "/api/ocr/last") => Ok(app.ocr_last()),
        ("POST", "/api/ocr/path") => {
            app.ingest_path(body.get("path").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/ocr/ingest") => {
            if let Some(text) = body.get("text").and_then(|v| v.as_str()) {
                if !text.is_empty() {
                    return app.archive_note(
                        body.get("name").and_then(|v| v.as_str()).unwrap_or("文件.txt"),
                        text,
                        "文字",
                    );
                }
            }
            let b64 = body
                .get("pdf_base64")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let bytes = base64_decode(b64)?;
            app.ingest_document(
                body.get("name").and_then(|v| v.as_str()).unwrap_or("document.pdf"),
                &bytes,
            )
        }
        ("POST", "/api/threads") => app.threads_create(
            body.get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("未命名"),
        ),
        ("POST", "/api/search") => app.search(body.get("q").and_then(|v| v.as_str()).unwrap_or("")),
        ("POST", "/api/threads/message") => app.message(
            body.get("thread").and_then(|v| v.as_str()).unwrap_or(""),
            body.get("role").and_then(|v| v.as_str()).unwrap_or("user"),
            body.get("content").and_then(|v| v.as_str()).unwrap_or(""),
        ),
        ("POST", "/api/threads/import") => app.import_thread(body),
        ("POST", "/api/threads/archive") => app.archive_thread(
            body.get("thread").and_then(|v| v.as_str()).unwrap_or(""),
            body.get("archived")
                .and_then(|v| v.as_bool())
                .unwrap_or(true),
        ),
        ("POST", "/api/threads/checkpoint") => {
            app.checkpoint(body.get("thread").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/threads/restore") => {
            app.restore_checkpoint(body.get("id").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/threads/export") => {
            app.export_thread(body.get("thread").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("GET", "/api/connectors") => app.connectors(),
        ("POST", "/api/connectors") => app.connector_save(body),
        ("POST", "/api/connectors/sync") => {
            app.connector_sync(body.get("id").and_then(|v| v.as_str()).unwrap_or(""), body)
        }
        ("POST", "/api/connectors/disconnect") => {
            app.connector_disconnect(body.get("id").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/connectors/preview") => {
            app.connector_preview(body.get("id").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/connectors/logs") => {
            app.connector_logs(body.get("id").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/connectors/export") => {
            app.connector_export(body.get("id").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("GET", "/api/inventory") => Ok(app.inventory()),
        ("GET", "/api/detectors") => app.detectors(),
        ("GET", "/api/ocr/catalog") => Ok(app.ocr_catalog()),
        ("POST", "/api/ocr/download") => app.ocr_download(),
        ("POST", "/api/ocr/recognize") => app.ocr_recognize_sample(),
        ("POST", "/api/ocr/cancel") => app.ocr_cancel(),
        ("POST", "/api/ocr/runtime") => app.ocr_runtime(),
        ("GET", "/api/ocr/runtime") => app.ocr_runtime_status(),
        ("POST", "/api/ocr/runtime/cancel") => app.ocr_runtime_cancel(),
        ("POST", "/api/ocr/sample") => app.ocr_sample(),
        ("POST", "/api/ocr/api") => app.ocr_api(body),
        ("POST", "/api/provider") => app.provider_chat(body),
        ("POST", "/api/ocr/remove") => app.ocr_remove(),
        ("GET", "/api/activity") => app.activity(),
        ("POST", "/api/ocr/extract") => {
            let b64 = body
                .get("pdf_base64")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let bytes = base64_decode(b64)?;
            app.ocr_bytes(&bytes)
        }
        ("POST", "/api/decisions") => app.decide(body),
        ("GET", "/api/pay/catalog") => Ok(app.pay_catalog()),
        ("POST", "/api/pay/orders") => {
            app.pay_order(body.get("sku").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/pay/settle") => {
            app.pay_settle(body.get("id").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/pay/page-return") => app.pay_page_return(
            body.get("id").and_then(|v| v.as_str()).unwrap_or(""),
            body.get("claimed").and_then(|v| v.as_str()).unwrap_or(""),
        ),
        ("POST", "/api/pay/query") => {
            app.pay_query(body.get("id").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/pay/notify") => app.pay_notify(
            body.get("id").and_then(|v| v.as_str()).unwrap_or(""),
            body.get("event_id").and_then(|v| v.as_str()).unwrap_or(""),
            body.get("status").and_then(|v| v.as_str()).unwrap_or(""),
        ),
        ("POST", "/api/pay/deliver") => app.pay_deliver(
            body.get("id").and_then(|v| v.as_str()).unwrap_or(""),
            body.get("fail_next")
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
        ),
        ("POST", "/api/pay/refund") => app.pay_refund(
            body.get("id").and_then(|v| v.as_str()).unwrap_or(""),
            body.get("amount_cents")
                .and_then(|v| v.as_i64())
                .unwrap_or(0),
        ),
        ("GET", "/api/pay/reconcile") => Ok(app.pay_reconcile()),
        ("POST", "/api/pay/production") => Ok(app.pay_production()),
        ("POST", "/api/permission") => {
            app.set_permission(body.get("mode").and_then(|v| v.as_str()).unwrap_or(""))
        }
        ("POST", "/api/admin/policy") => Ok(app.set_policy(
            body.get("terminal")
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
        )),
        ("POST", "/mcp") => Ok(crate::mcp::handle(app, &body.to_string())),
        _ => Err("not found".into()),
    }
}

fn authorize(app: &App, req: &Request, write: bool, admin: bool) -> Result<(), Response> {
    let cfg = app.cfg.lock().expect("cfg").clone();
    let host = req.headers.get("host").map(|s| s.as_str()).unwrap_or("");
    let expected = [
        format!("127.0.0.1:{}", cfg.port),
        format!("localhost:{}", cfg.port),
    ];
    if cfg.port != 0 && !expected.iter().any(|h| h == host) {
        return Err(json_response(
            403,
            &json!({"ok": false, "error": "forbidden host"}),
        ));
    }
    if let Some(origin) = req.headers.get("origin") {
        let allowed = [
            format!("http://127.0.0.1:{}", cfg.port),
            format!("http://localhost:{}", cfg.port),
        ];
        if !allowed.iter().any(|o| o == origin) {
            return Err(json_response(
                403,
                &json!({"ok": false, "error": "forbidden origin"}),
            ));
        }
    }
    let header_session = req.headers.get("x-ymzz-session").map(|s| s.as_str());
    let cookie = req.headers.get("cookie").and_then(|c| {
        c.split(';').find_map(|part| {
            let part = part.trim();
            part.strip_prefix("ymzz_session=").map(|v| v.trim())
        })
    });
    let session = header_session.or(cookie).unwrap_or("");
    let role = if session == cfg.admin_token {
        "admin"
    } else if session == cfg.session_token {
        "user"
    } else if path_is_public(req) {
        "public"
    } else {
        return Err(json_response(
            401,
            &json!({"ok": false, "error": "session required"}),
        ));
    };
    if admin && role != "admin" {
        return Err(json_response(
            403,
            &json!({"ok": false, "error": "forbidden role"}),
        ));
    }
    if write {
        let csrf = req
            .headers
            .get("x-ymzz-csrf")
            .map(|s| s.as_str())
            .unwrap_or("");
        if csrf != cfg.csrf {
            return Err(json_response(
                403,
                &json!({"ok": false, "error": "forbidden csrf"}),
            ));
        }
    }
    let _ = body_role_ignored(req);
    Ok(())
}

fn path_is_public(req: &Request) -> bool {
    if req.method != "GET" {
        return false;
    }
    let path = req.path.split('?').next().unwrap_or("");
    matches!(
        path,
        "/" | "/index.html" | "/tokens.css" | "/app.css" | "/app.js" | "/fonts.css" | "/api/health"
    ) || (path.starts_with("/fonts/n") && path.ends_with(".woff2") && !path.contains(".."))
}

fn body_role_ignored(req: &Request) -> bool {
    serde_json::from_slice::<Value>(&req.body)
        .ok()
        .and_then(|v| v.get("role").cloned())
        .is_some()
}

fn session_cookie(app: &App) -> String {
    let cfg = app.cfg.lock().expect("cfg").clone();
    format!(
        "ymzz_session={}; HttpOnly; SameSite=Strict; Path=/",
        cfg.session_token
    )
}

fn json_response(status: u16, value: &Value) -> Response {
    Response {
        status,
        headers: vec![
            (
                "content-type".into(),
                "application/json; charset=utf-8".into(),
            ),
            ("cache-control".into(), "no-store".into()),
            ("x-content-type-options".into(), "nosniff".into()),
        ],
        body: value.to_string().into_bytes(),
    }
}

fn html(text: &str, cookie: Option<String>) -> Response {
    html_bytes(text.as_bytes(), "text/html; charset=utf-8", cookie)
}

fn html_bytes(body: &[u8], content_type: &str, cookie: Option<String>) -> Response {
    let mut headers = vec![
        ("content-type".into(), content_type.into()),
        ("cache-control".into(), "no-store".into()),
        ("x-content-type-options".into(), "nosniff".into()),
    ];
    if let Some(cookie) = cookie {
        headers.push(("set-cookie".into(), cookie));
    }
    Response {
        status: 200,
        headers,
        body: body.to_vec(),
    }
}

fn read_request(stream: &mut impl Read) -> Result<Request, String> {
    let mut buf = Vec::new();
    let mut tmp = [0u8; 4096];
    let header_end;
    loop {
        let n = stream.read(&mut tmp).map_err(|e| e.to_string())?;
        if n == 0 {
            return Err("closed".into());
        }
        buf.extend_from_slice(&tmp[..n]);
        if let Some(pos) = find_header_end(&buf) {
            header_end = pos;
            break;
        }
        if buf.len() > 2_000_000 {
            return Err("too large".into());
        }
    }
    let head = String::from_utf8_lossy(&buf[..header_end]).to_string();
    let mut lines = head.split("\r\n");
    let request_line = lines.next().unwrap_or("");
    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or("GET").to_string();
    let path = parts.next().unwrap_or("/").to_string();
    let mut headers = HashMap::new();
    let mut seen_len = false;
    let mut len = 0usize;
    for line in lines {
        if let Some((k, v)) = line.split_once(':') {
            let key = k.trim().to_ascii_lowercase();
            if key == "content-length" {
                if seen_len {
                    return Err("duplicate content-length".into());
                }
                seen_len = true;
                len = v
                    .trim()
                    .parse::<usize>()
                    .map_err(|_| "bad content-length".to_string())?;
            }
            headers.insert(key, v.trim().to_string());
        }
    }
    if len > MAX_BODY {
        return Err("body too large".into());
    }
    let mut body = buf[header_end..].to_vec();
    while body.len() < len {
        let n = stream.read(&mut tmp).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        body.extend_from_slice(&tmp[..n]);
    }
    body.truncate(len);
    Ok(Request {
        method,
        path,
        headers,
        body,
    })
}

fn find_header_end(buf: &[u8]) -> Option<usize> {
    buf.windows(4).position(|w| w == b"\r\n\r\n").map(|p| p + 4)
}

fn write_response(stream: &mut impl Write, res: &Response) -> Result<(), String> {
    let reason = match res.status {
        200 => "OK",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        409 => "Conflict",
        _ => "Error",
    };
    let mut head = format!(
        "HTTP/1.1 {} {}\r\nContent-Length: {}\r\nConnection: close\r\n",
        res.status,
        reason,
        res.body.len()
    );
    for (k, v) in &res.headers {
        head.push_str(k);
        head.push_str(": ");
        head.push_str(v);
        head.push_str("\r\n");
    }
    head.push_str("\r\n");
    stream
        .write_all(head.as_bytes())
        .map_err(|e| e.to_string())?;
    stream.write_all(&res.body).map_err(|e| e.to_string())?;
    Ok(())
}

fn base64_decode(text: &str) -> Result<Vec<u8>, String> {
    fn val(c: u8) -> Result<u8, String> {
        match c {
            b'A'..=b'Z' => Ok(c - b'A'),
            b'a'..=b'z' => Ok(c - b'a' + 26),
            b'0'..=b'9' => Ok(c - b'0' + 52),
            b'+' => Ok(62),
            b'/' => Ok(63),
            _ => Err("bad base64".into()),
        }
    }
    let bytes = text
        .as_bytes()
        .iter()
        .copied()
        .filter(|c| !c.is_ascii_whitespace() && *c != b'=')
        .collect::<Vec<_>>();
    let mut out = Vec::new();
    let mut i = 0;
    while i + 4 <= bytes.len() {
        let n = ((val(bytes[i])? as u32) << 18)
            | ((val(bytes[i + 1])? as u32) << 12)
            | ((val(bytes[i + 2])? as u32) << 6)
            | (val(bytes[i + 3])? as u32);
        out.push((n >> 16) as u8);
        out.push((n >> 8) as u8);
        out.push(n as u8);
        i += 4;
    }
    if bytes.len() - i == 2 {
        let n = ((val(bytes[i])? as u32) << 18) | ((val(bytes[i + 1])? as u32) << 12);
        out.push((n >> 16) as u8);
    } else if bytes.len() - i == 3 {
        let n = ((val(bytes[i])? as u32) << 18)
            | ((val(bytes[i + 1])? as u32) << 12)
            | ((val(bytes[i + 2])? as u32) << 6);
        out.push((n >> 16) as u8);
        out.push((n >> 8) as u8);
    }
    Ok(out)
}

const INDEX: &str = include_str!("../ui/index.html");
const CSS: &str = include_str!("../ui/app.css");
const JS: &str = include_str!("../ui/app.js");
const TOKENS: &str = include_str!("../ui/tokens.css");
const FONTS: &str = include_str!("../ui/fonts.css");

pub fn bind_and_serve(app: Arc<App>, port: u16) -> Result<(), String> {
    let _ = net::parse_bind_host("127.0.0.1")?;
    let listener = net::bind_loopback(port)?;
    let actual = listener.local_addr().map_err(|e| e.to_string())?.port();
    app.cfg.lock().expect("cfg").port = actual;
    eprintln!("ymzz-vibe listening on http://127.0.0.1:{actual}");
    serve(app, listener);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::util;

    fn boot() -> App {
        let dir = std::env::temp_dir().join(format!(
            "ymzz-http-{}-{}",
            std::process::id(),
            util::random_id("h")
        ));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let app = App::open(&dir, &util::repo_root()).unwrap();
        app.cfg.lock().unwrap().port = 1413;
        app
    }

    #[allow(clippy::too_many_arguments)]
    fn call(
        app: &App,
        method: &str,
        path: &str,
        body: Value,
        session: &str,
        csrf: &str,
        host: &str,
        origin: Option<&str>,
    ) -> Response {
        let mut headers = HashMap::new();
        headers.insert("host".into(), host.into());
        headers.insert("x-ymzz-session".into(), session.into());
        headers.insert("x-ymzz-csrf".into(), csrf.into());
        if let Some(origin) = origin {
            headers.insert("origin".into(), origin.into());
        }
        dispatch(
            app,
            &Request {
                method: method.into(),
                path: path.into(),
                headers,
                body: body.to_string().into_bytes(),
            },
        )
    }

    #[test]
    fn pages_and_auth() {
        let app = boot();
        let cfg = app.cfg.lock().unwrap().clone();
        let page = dispatch(
            &app,
            &Request {
                method: "GET".into(),
                path: "/".into(),
                headers: HashMap::from([("host".into(), "127.0.0.1:1413".into())]),
                body: vec![],
            },
        );
        assert_eq!(page.status, 200);
        let html = String::from_utf8_lossy(&page.body);
        assert!(html.contains("雲箋"));
        assert!(html.contains("沙箱"));
        assert!(!html.contains("75589D"));
        assert!(!page.headers.iter().any(|(_, v)| v.contains('*')));
        assert!(page
            .headers
            .iter()
            .any(|(k, v)| k == "set-cookie" && v.contains("ymzz_session=")));
        let evil = dispatch(
            &app,
            &Request {
                method: "GET".into(),
                path: "/".into(),
                headers: HashMap::from([("host".into(), "evil.example".into())]),
                body: vec![],
            },
        );
        assert_eq!(evil.status, 403);
        assert!(!evil
            .headers
            .iter()
            .any(|(k, _)| k.eq_ignore_ascii_case("set-cookie")));
        let rebind = dispatch(
            &app,
            &Request {
                method: "GET".into(),
                path: "/".into(),
                headers: HashMap::from([("host".into(), "127.0.0.1.evil.com:1413".into())]),
                body: vec![],
            },
        );
        assert_eq!(rebind.status, 403);
        assert!(!rebind
            .headers
            .iter()
            .any(|(k, _)| k.eq_ignore_ascii_case("set-cookie")));
        let missing = dispatch(
            &app,
            &Request {
                method: "GET".into(),
                path: "/".into(),
                headers: HashMap::new(),
                body: vec![],
            },
        );
        assert_eq!(missing.status, 403);
        assert!(!missing
            .headers
            .iter()
            .any(|(k, _)| k.eq_ignore_ascii_case("set-cookie")));
        let bad = call(
            &app,
            "POST",
            "/api/panel1/draft",
            json!({"today":"2026-11-07","preset":3}),
            "nope",
            &cfg.csrf,
            "127.0.0.1:1413",
            None,
        );
        assert_eq!(bad.status, 401);
        let csrf = call(
            &app,
            "POST",
            "/api/fixtures/synthetic",
            json!({}),
            &cfg.session_token,
            "wrong",
            "127.0.0.1:1413",
            None,
        );
        assert_eq!(csrf.status, 403);
        let origin = call(
            &app,
            "POST",
            "/api/fixtures/synthetic",
            json!({}),
            &cfg.session_token,
            &cfg.csrf,
            "127.0.0.1:1413",
            Some("http://evil.example"),
        );
        assert_eq!(origin.status, 403);
        let host = call(
            &app,
            "GET",
            "/api/health",
            json!({}),
            &cfg.session_token,
            &cfg.csrf,
            "evil.example:1413",
            None,
        );
        assert_eq!(host.status, 403);
        let ok = call(
            &app,
            "POST",
            "/api/fixtures/synthetic",
            json!({"role":"admin"}),
            &cfg.session_token,
            &cfg.csrf,
            "127.0.0.1:1413",
            Some("http://127.0.0.1:1413"),
        );
        assert_eq!(ok.status, 200);
        let denied = call(
            &app,
            "POST",
            "/api/admin/policy",
            json!({"terminal": false, "role": "admin"}),
            &cfg.session_token,
            &cfg.csrf,
            "127.0.0.1:1413",
            None,
        );
        assert_eq!(denied.status, 403);
        let allowed = call(
            &app,
            "POST",
            "/api/admin/policy",
            json!({"terminal": false}),
            &cfg.admin_token,
            &cfg.csrf,
            "127.0.0.1:1413",
            None,
        );
        assert_eq!(allowed.status, 200);
        let sample = call(
            &app,
            "POST",
            "/api/ocr/sample",
            json!({}),
            &cfg.session_token,
            &cfg.csrf,
            "127.0.0.1:1413",
            None,
        );
        assert_eq!(sample.status, 200);
        let sample_body = String::from_utf8_lossy(&sample.body);
        assert!(sample_body.contains("USD 123.45"));
        assert!(sample_body.contains("內建"));
        let catalog = call(
            &app,
            "GET",
            "/api/ocr/catalog",
            json!({}),
            &cfg.session_token,
            &cfg.csrf,
            "127.0.0.1:1413",
            None,
        );
        assert_eq!(catalog.status, 200);
        let catalog_body = String::from_utf8_lossy(&catalog.body);
        assert!(catalog_body
            .contains("e740eb522521827cc83da3ba33e1c70ccfd9b3cf7d9a24a420ce4ca5ebb8794f"));
        assert!(!catalog_body.contains("checksum_not_pinned"));
        let malformed = dispatch(
            &app,
            &Request {
                method: "POST".into(),
                path: "/api/fixtures/synthetic".into(),
                headers: HashMap::from([
                    ("host".into(), "127.0.0.1:1413".into()),
                    ("x-ymzz-session".into(), cfg.session_token.clone()),
                    ("x-ymzz-csrf".into(), cfg.csrf.clone()),
                ]),
                body: b"{".to_vec(),
            },
        );
        assert_eq!(malformed.status, 400);
        assert!(String::from_utf8_lossy(&malformed.body).contains("malformed json"));
        let huge = format!("POST /api/fixtures/synthetic HTTP/1.1\r\nHost: 127.0.0.1:1413\r\nContent-Length: {}\r\n\r\n", MAX_BODY + 1);
        match read_request(&mut huge.as_bytes()) {
            Err(err) => assert!(err.contains("body too large"), "{err}"),
            Ok(_) => panic!("oversized body was accepted"),
        }
        let dup = "POST /api/fixtures/synthetic HTTP/1.1\r\nHost: 127.0.0.1:1413\r\nContent-Length: 2\r\nContent-Length: 2\r\n\r\n{}";
        match read_request(&mut dup.as_bytes()) {
            Err(err) => assert!(err.contains("duplicate content-length"), "{err}"),
            Ok(_) => panic!("duplicate content-length was accepted"),
        }
        let api = call(
            &app,
            "POST",
            "/api/ocr/api",
            json!({"opt_in": true, "endpoint": "https://ocr.example/v1", "secret_ref": "env:OCR_KEY", "key": "super-secret-ocr"}),
            &cfg.session_token,
            &cfg.csrf,
            "127.0.0.1:1413",
            None,
        );
        assert_eq!(api.status, 200);
        let api_body = String::from_utf8_lossy(&api.body);
        assert!(api_body.contains("\"called\":false"));
        assert!(!api_body.contains("super-secret-ocr"));
        let listener = net::bind_loopback(0).unwrap();
        let port = listener.local_addr().unwrap().port();
        assert_eq!(listener.local_addr().unwrap().ip().to_string(), "127.0.0.1");
        drop(listener);
        let _ = port;
    }
}
