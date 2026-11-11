use serde_json::{json, Value};
use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;

#[derive(Clone, Debug)]
pub struct BuiltRequest {
    pub method: String,
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: String,
}

fn auth_header(token: &str) -> (String, String) {
    ("Authorization".into(), format!("Bearer {token}"))
}

pub fn notion_upsert(token: &str, database_id: &str, body: &Value) -> BuiltRequest {
    BuiltRequest {
        method: "POST".into(),
        url: "https://api.notion.com/v1/pages".into(),
        headers: vec![
            auth_header(token),
            ("Notion-Version".into(), "2022-06-28".into()),
            ("Content-Type".into(), "application/json".into()),
            ("X-Database-Id".into(), database_id.into()),
        ],
        body: body.to_string(),
    }
}

pub fn sheets_append(token: &str, sheet_id: &str, range: &str, values: &Value) -> BuiltRequest {
    BuiltRequest {
        method: "POST".into(),
        url: format!(
            "https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{range}:append"
        ),
        headers: vec![
            auth_header(token),
            ("Content-Type".into(), "application/json".into()),
        ],
        body: json!({"values": values, "valueInputOption": "RAW"}).to_string(),
    }
}

pub fn docs_batch(token: &str, doc_id: &str, text: &str) -> BuiltRequest {
    BuiltRequest {
        method: "POST".into(),
        url: format!("https://docs.googleapis.com/v1/documents/{doc_id}:batchUpdate"),
        headers: vec![
            auth_header(token),
            ("Content-Type".into(), "application/json".into()),
        ],
        body: json!({"requests": [{"insertText": {"text": text, "location": {"index": 1}}}]})
            .to_string(),
    }
}

pub fn github_comment(token: &str, repo: &str, issue: u64, body: &str) -> BuiltRequest {
    BuiltRequest {
        method: "POST".into(),
        url: format!("https://api.github.com/repos/{repo}/issues/{issue}/comments"),
        headers: vec![
            auth_header(token),
            ("Accept".into(), "application/vnd.github+json".into()),
            ("User-Agent".into(), "ymzz-vibe/0.21".into()),
        ],
        body: json!({"body": body}).to_string(),
    }
}

pub fn feishu_or_lark(
    lark: bool,
    token: &str,
    app_token: &str,
    table: &str,
    fields: &Value,
) -> BuiltRequest {
    let host = if lark {
        "https://open.larksuite.com"
    } else {
        "https://open.feishu.cn"
    };
    BuiltRequest {
        method: "POST".into(),
        url: format!("{host}/open-apis/bitable/v1/apps/{app_token}/tables/{table}/records"),
        headers: vec![
            auth_header(token),
            ("Content-Type".into(), "application/json".into()),
        ],
        body: json!({"fields": fields}).to_string(),
    }
}

pub fn oomol_hosted(token: &str, team: &str, body: &Value) -> BuiltRequest {
    BuiltRequest {
        method: "POST".into(),
        url: "https://connector.oomol.com/v1/mcp".into(),
        headers: vec![
            auth_header(token),
            ("x-oo-team-name".into(), team.into()),
            ("Content-Type".into(), "application/json".into()),
        ],
        body: body.to_string(),
    }
}

pub fn redact_headers(headers: &[(String, String)]) -> Vec<(String, String)> {
    headers
        .iter()
        .map(|(k, v)| {
            let key = k.to_ascii_lowercase();
            if key.contains("authorization")
                || key.contains("token")
                || key.contains("secret")
                || key == "x-oo-team-name"
            {
                (k.clone(), "«redacted»".into())
            } else {
                (k.clone(), v.clone())
            }
        })
        .collect()
}

pub static ENV_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

#[derive(Clone, Copy)]
pub struct ExchangePolicy {
    pub allow_loopback: bool,
    pub allow_public: bool,
}

/// Real HTTP/1.1 exchange. Public hosts stay closed unless the owner sets
/// YMZZ_CONNECTOR_NET=1 and YMZZ_CONNECTOR_ALLOW_PUBLIC=1. Tests use 127.0.0.1.
pub fn exchange(req: &BuiltRequest) -> Result<String, String> {
    exchange_with(
        req,
        ExchangePolicy {
            allow_loopback: std::env::var("YMZZ_CONNECTOR_NET").ok().as_deref() == Some("1"),
            allow_public: std::env::var("YMZZ_CONNECTOR_ALLOW_PUBLIC").ok().as_deref() == Some("1"),
        },
        1,
    )
}

pub fn exchange_with(
    req: &BuiltRequest,
    policy: ExchangePolicy,
    attempts: u32,
) -> Result<String, String> {
    let mut last = String::from("connect failed");
    let tries = attempts.max(1);
    for attempt in 0..tries {
        match exchange_once(req, policy) {
            Ok(body) => return Ok(body),
            Err(err)
                if err.contains("live_network_disabled")
                    || err.contains("blocked")
                    || err.contains("tls_")
                    || err.contains("bad url")
                    || err.contains("bad port") =>
            {
                return Err(err);
            }
            Err(err) => {
                last = err;
                if attempt + 1 < tries {
                    std::thread::sleep(Duration::from_millis(30));
                }
            }
        }
    }
    Err(last)
}

fn exchange_once(req: &BuiltRequest, policy: ExchangePolicy) -> Result<String, String> {
    let rest = req
        .url
        .strip_prefix("https://")
        .or_else(|| req.url.strip_prefix("http://"))
        .ok_or("bad url")?;
    let (hostport, path) = rest
        .split_once('/')
        .map(|(h, p)| (h, format!("/{p}")))
        .unwrap_or((rest, "/".into()));
    let (host, port) = if let Some((h, p)) = hostport.split_once(':') {
        (h.to_string(), p.parse::<u16>().map_err(|_| "bad port")?)
    } else if req.url.starts_with("https://") {
        (hostport.to_string(), 443)
    } else {
        (hostport.to_string(), 80)
    };
    if !policy.allow_loopback {
        return Err("live_network_disabled".into());
    }
    if host != "127.0.0.1" && host != "localhost" && !policy.allow_public {
        return Err("public_connector_host_blocked_without_explicit_allow".into());
    }
    if port == 443 {
        return Err("tls_to_public_hosts_is_not_enabled_in_this_build".into());
    }
    let mut stream =
        TcpStream::connect((host.as_str(), port)).map_err(|e| format!("connect: {e}"))?;
    stream.set_read_timeout(Some(Duration::from_secs(3))).ok();
    stream.set_write_timeout(Some(Duration::from_secs(3))).ok();
    let mut header = format!(
        "{} {} HTTP/1.1\r\nHost: {host}:{port}\r\nConnection: close\r\nContent-Length: {}\r\n",
        req.method,
        path,
        req.body.len()
    );
    for (k, v) in &req.headers {
        if k.eq_ignore_ascii_case("host") {
            continue;
        }
        header.push_str(k);
        header.push_str(": ");
        header.push_str(v);
        header.push_str("\r\n");
    }
    header.push_str("\r\n");
    stream
        .write_all(header.as_bytes())
        .map_err(|e| e.to_string())?;
    stream
        .write_all(req.body.as_bytes())
        .map_err(|e| e.to_string())?;
    let mut buf = Vec::new();
    stream.read_to_end(&mut buf).map_err(|e| e.to_string())?;
    let text = String::from_utf8(buf).map_err(|e| e.to_string())?;
    if !text.starts_with("HTTP/") {
        return Err("empty http response".into());
    }
    Ok(text)
}

pub fn validate_record(mapping: &Value, record: &Value) -> Result<Value, String> {
    let rows = mapping
        .get("mapping")
        .and_then(|m| m.as_array())
        .ok_or("mapping.mapping array required")?;
    let mut out = serde_json::Map::new();
    for row in rows {
        let logical = row
            .get("logical_field")
            .and_then(|s| s.as_str())
            .ok_or("logical_field")?;
        let kind = row
            .get("source_type")
            .and_then(|s| s.as_str())
            .unwrap_or("rich_text");
        let required = row
            .get("required")
            .and_then(|b| b.as_bool())
            .unwrap_or(false);
        let value = record.get(logical).cloned();
        if value.is_none() || value.as_ref().unwrap().is_null() || value.as_ref().unwrap() == "" {
            if required {
                return Err(format!("missing {logical}"));
            }
            continue;
        }
        let value = value.unwrap();
        match kind {
            "number" => {
                if !value.is_number() {
                    return Err(format!("{logical} must be a number"));
                }
            }
            "date" => {
                let s = value.as_str().ok_or_else(|| format!("{logical} date"))?;
                if crate::dates::parse_ymd(s).is_err() {
                    return Err(format!("{logical} is not YYYY-MM-DD"));
                }
            }
            "multi_select" => {
                if !value.is_array() {
                    return Err(format!("{logical} must be an array"));
                }
            }
            _ => {
                if !value.is_string() {
                    return Err(format!("{logical} must be text"));
                }
            }
        }
        out.insert(logical.to_string(), value);
    }
    Ok(Value::Object(out))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::thread;

    #[test]
    fn hosts_stay_on_their_own_products() {
        let _guard = ENV_LOCK.lock().expect("env");
        let n = notion_upsert(
            "secret-token",
            "db",
            &json!({"parent": {"database_id": "db"}}),
        );
        assert!(n.url.contains("api.notion.com"));
        assert!(!n.url.contains("feishu"));
        let sheet = sheets_append("tok", "sheet", "A1", &json!([["a"]]));
        assert!(sheet.url.contains("sheets.googleapis.com"));
        let doc = docs_batch("tok", "doc", "hello");
        assert!(doc.url.contains("docs.googleapis.com"));
        let gh = github_comment("tok", "Ya-MiC/ymzz-loop", 1, "synthetic");
        assert!(gh.url.starts_with("https://api.github.com/"));
        let feishu = feishu_or_lark(false, "tok", "app", "tbl", &json!({}));
        let lark = feishu_or_lark(true, "tok", "app", "tbl", &json!({}));
        assert!(feishu.url.contains("open.feishu.cn"));
        assert!(lark.url.contains("open.larksuite.com"));
        assert_ne!(feishu.url, lark.url);
        let oo = oomol_hosted("tok", "team-a", &json!({"jsonrpc":"2.0"}));
        assert_eq!(oo.url, "https://connector.oomol.com/v1/mcp");
        assert!(oo
            .headers
            .iter()
            .any(|(k, v)| k == "x-oo-team-name" && v == "team-a"));
        let redacted = redact_headers(&oo.headers);
        assert!(redacted.iter().all(|(_, v)| v != "tok" && v != "team-a"));
        std::env::remove_var("YMZZ_CONNECTOR_NET");
        assert!(exchange(&n).unwrap_err().contains("live_network_disabled"));
    }

    #[test]
    fn loopback_exchange_and_mapping_types() {
        let _guard = ENV_LOCK.lock().expect("env");
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        thread::spawn(move || {
            let Ok((mut sock, _)) = listener.accept() else {
                return;
            };
            let _ = sock.set_read_timeout(Some(std::time::Duration::from_secs(2)));
            let mut buf = Vec::new();
            let mut tmp = [0u8; 1024];
            loop {
                match sock.read(&mut tmp) {
                    Ok(0) => break,
                    Ok(n) => {
                        buf.extend_from_slice(&tmp[..n]);
                        if let Some(pos) = buf.windows(4).position(|w| w == b"\r\n\r\n") {
                            let header = String::from_utf8_lossy(&buf[..pos]).to_ascii_lowercase();
                            let len = header
                                .lines()
                                .find_map(|line| line.strip_prefix("content-length:"))
                                .and_then(|v| v.trim().parse::<usize>().ok())
                                .unwrap_or(0);
                            if buf.len() >= pos + 4 + len {
                                break;
                            }
                        }
                    }
                    Err(_) => break,
                }
                if buf.len() > 65_536 {
                    break;
                }
            }
            let body = b"{\"ok\":true}";
            let resp = format!(
                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                body.len()
            );
            let _ = sock.write_all(resp.as_bytes());
            let _ = sock.write_all(body);
        });
        std::env::set_var("YMZZ_CONNECTOR_NET", "1");
        let req = BuiltRequest {
            method: "POST".into(),
            url: format!("http://127.0.0.1:{port}/sync"),
            headers: vec![
                ("Authorization".into(), "Bearer secret-token".into()),
                ("Content-Type".into(), "application/json".into()),
            ],
            body: "{\"doc_id\":\"SYN\"}".into(),
        };
        let raw = exchange(&req).unwrap();
        assert!(raw.contains("200"));
        assert!(raw.contains("\"ok\":true"));
        std::env::remove_var("YMZZ_CONNECTOR_NET");
        let mapping = json!({"mapping":[{"logical_field":"title","source_type":"title","required":true},{"logical_field":"mood","source_type":"number","required":false},{"logical_field":"date","source_type":"date","required":true}]});
        assert!(
            validate_record(&mapping, &json!({"title":"t","date":"2026-11-07","mood":3})).is_ok()
        );
        assert!(validate_record(
            &mapping,
            &json!({"title":"t","date":"2026-11-07","mood":"high"})
        )
        .is_err());
    }
}
