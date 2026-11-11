//! Opt-in HTTP. Local mode dials only an explicit loopback port. Remote mode
//! dials HTTPS and refuses private, loopback, link-local, and metadata
//! addresses, including after a redirect. A recording fixture is a local TLS
//! server with a certificate the caller supplies. It is not a cloud account.

use rustls::pki_types::{CertificateDer, ServerName};
use rustls::{ClientConfig, ClientConnection, RootCertStore, StreamOwned};
use std::io::{Read, Write};
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr, TcpStream, ToSocketAddrs};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Once};
use std::time::{Duration, Instant};
use url::Url;

pub enum Policy {
    Local,
    Remote,
    /// HTTPS to loopback, trusting only `roots`. Tests use this. The GUI does not.
    RecordingFixture {
        roots: Vec<CertificateDer<'static>>,
    },
}

pub struct Request {
    pub method: String,
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
    pub policy: Policy,
    pub timeout: Duration,
    pub max_bytes: usize,
    pub cancel: Option<Arc<AtomicBool>>,
}

type RawReply = (u16, Vec<(String, String)>, Vec<u8>);

#[derive(Debug)]
pub struct Response {
    pub status: u16,
    pub body: String,
    pub final_url: String,
    pub redirects: Vec<String>,
}

pub fn send(req: Request) -> Result<Response, String> {
    install_crypto();
    send_hop(req, 0, Vec::new())
}

fn send_hop(req: Request, hop: u8, redirects: Vec<String>) -> Result<Response, String> {
    if req.cancel.as_ref().map(|c| c.load(Ordering::Relaxed)) == Some(true) {
        return Err("cancelled".into());
    }
    if hop > 3 {
        return Err("too many redirects".into());
    }
    let parsed = Url::parse(&req.url).map_err(|e| format!("bad url: {e}"))?;
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("urls with userinfo are rejected".into());
    }
    let host = parsed
        .host_str()
        .ok_or("url has no host")?
        .trim_end_matches('.')
        .to_string();
    if blocked_hostname(&host) {
        return Err(format!("blocked metadata host {host}"));
    }
    let port = parsed.port_or_known_default().ok_or("url has no port")?;
    let addrs = resolve_checked(&parsed, &host, port, &req.policy)?;
    let addr = *addrs.first().ok_or("no address")?;
    let timeout = req.timeout;
    let mut tcp = TcpStream::connect_timeout(&addr, timeout).map_err(|e| e.to_string())?;
    tcp.set_read_timeout(Some(timeout))
        .map_err(|e| e.to_string())?;
    tcp.set_write_timeout(Some(timeout))
        .map_err(|e| e.to_string())?;
    let deadline = Instant::now() + timeout;
    let (status, headers, body) = match &req.policy {
        Policy::Local => exchange_plain(&mut tcp, &req, &host, port, deadline)?,
        Policy::Remote | Policy::RecordingFixture { .. } => {
            let config = tls_config(&req.policy)?;
            let name = ServerName::try_from(host.clone()).map_err(|e| e.to_string())?;
            let conn = ClientConnection::new(Arc::new(config), name).map_err(|e| e.to_string())?;
            let mut tls = StreamOwned::new(conn, tcp);
            exchange_plain(&mut tls, &req, &host, port, deadline)?
        }
    };
    if matches!(status, 301 | 302 | 303 | 307 | 308) {
        let location = headers
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("location"))
            .map(|(_, v)| v.clone())
            .ok_or("redirect missing location")?;
        let next = parsed
            .join(&location)
            .map_err(|e| format!("bad redirect: {e}"))?;
        let mut headers = if same_authority(&parsed, &next) {
            req.headers.clone()
        } else {
            req.headers
                .iter()
                .filter(|(k, _)| {
                    !k.eq_ignore_ascii_case("authorization") && !k.eq_ignore_ascii_case("cookie")
                })
                .cloned()
                .collect()
        };
        let (method, body) = if matches!(status, 307 | 308) {
            (req.method.clone(), req.body.clone())
        } else {
            headers.retain(|(k, _)| !k.eq_ignore_ascii_case("content-type"));
            ("GET".into(), Vec::new())
        };
        let mut followed = redirects;
        followed.push(next.to_string());
        return send_hop(
            Request {
                method,
                url: next.to_string(),
                headers,
                body,
                policy: req.policy,
                timeout: req.timeout,
                max_bytes: req.max_bytes,
                cancel: req.cancel,
            },
            hop + 1,
            followed,
        );
    }
    Ok(Response {
        status,
        body: String::from_utf8_lossy(&body).to_string(),
        final_url: req.url,
        redirects,
    })
}

fn exchange_plain(
    stream: &mut impl ReadWrite,
    req: &Request,
    host: &str,
    port: u16,
    deadline: Instant,
) -> Result<RawReply, String> {
    let path = Url::parse(&req.url)
        .ok()
        .map(|u| {
            let mut p = u.path().to_string();
            if let Some(q) = u.query() {
                p.push('?');
                p.push_str(q);
            }
            if p.is_empty() {
                p = "/".into();
            }
            p
        })
        .unwrap_or_else(|| "/".into());
    let mut head = format!(
        "{} {} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\nContent-Length: {}\r\n",
        req.method,
        path,
        host_header(host, port),
        req.body.len()
    );
    for (k, v) in &req.headers {
        if k.eq_ignore_ascii_case("host")
            || k.eq_ignore_ascii_case("content-length")
            || k.eq_ignore_ascii_case("connection")
        {
            continue;
        }
        if v.contains('\r') || v.contains('\n') || k.contains('\r') || k.contains('\n') {
            return Err("header contains a newline".into());
        }
        head.push_str(k);
        head.push_str(": ");
        head.push_str(v);
        head.push_str("\r\n");
    }
    head.push_str("\r\n");
    stream
        .write_all(head.as_bytes())
        .map_err(|e| e.to_string())?;
    stream.write_all(&req.body).map_err(|e| e.to_string())?;
    stream.flush().map_err(|e| e.to_string())?;
    read_response(stream, req.max_bytes, deadline)
}

fn host_header(host: &str, port: u16) -> String {
    if host.contains(':') {
        format!("[{host}]:{port}")
    } else if port == 80 || port == 443 {
        host.to_string()
    } else {
        format!("{host}:{port}")
    }
}

fn read_response(
    stream: &mut impl Read,
    max_bytes: usize,
    deadline: Instant,
) -> Result<RawReply, String> {
    let mut buf = Vec::new();
    let mut tmp = [0u8; 4096];
    let header_end = loop {
        if Instant::now() > deadline {
            return Err("timed out".into());
        }
        let n = stream.read(&mut tmp).map_err(|e| e.to_string())?;
        if n == 0 {
            return Err("connection closed before a response".into());
        }
        buf.extend_from_slice(&tmp[..n]);
        if buf.len() > 65_536 {
            return Err("response header is too large".into());
        }
        if let Some(i) = buf.windows(4).position(|w| w == b"\r\n\r\n") {
            break i;
        }
    };
    let header_bytes = buf[..header_end].to_vec();
    let mut rest = buf[header_end + 4..].to_vec();
    let text = String::from_utf8_lossy(&header_bytes);
    let mut lines = text.split("\r\n");
    let status_line = lines.next().unwrap_or("");
    let status: u16 = status_line
        .split_whitespace()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .ok_or("bad status line")?;
    let mut headers = Vec::new();
    for line in lines {
        if let Some((k, v)) = line.split_once(':') {
            headers.push((k.trim().to_string(), v.trim().to_string()));
        }
    }
    let chunked = headers.iter().any(|(k, v)| {
        k.eq_ignore_ascii_case("transfer-encoding") && v.to_ascii_lowercase().contains("chunked")
    });
    let length = headers
        .iter()
        .find(|(k, _)| k.eq_ignore_ascii_case("content-length"))
        .and_then(|(_, v)| v.parse::<usize>().ok());
    let body = if chunked {
        read_chunked(stream, &mut rest, max_bytes, deadline)?
    } else if let Some(len) = length {
        if len > max_bytes {
            return Err("response is larger than the cap".into());
        }
        while rest.len() < len {
            if Instant::now() > deadline {
                return Err("timed out".into());
            }
            let n = stream.read(&mut tmp).map_err(|e| e.to_string())?;
            if n == 0 {
                break;
            }
            rest.extend_from_slice(&tmp[..n]);
            if rest.len() > max_bytes {
                return Err("response is larger than the cap".into());
            }
        }
        rest.truncate(len);
        rest
    } else {
        while rest.len() < max_bytes {
            if Instant::now() > deadline {
                break;
            }
            let n = stream.read(&mut tmp).map_err(|e| e.to_string())?;
            if n == 0 {
                break;
            }
            rest.extend_from_slice(&tmp[..n]);
        }
        if rest.len() > max_bytes {
            return Err("response is larger than the cap".into());
        }
        rest
    };
    Ok((status, headers, body))
}

fn read_chunked(
    stream: &mut impl Read,
    pending: &mut Vec<u8>,
    max_bytes: usize,
    deadline: Instant,
) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();
    let mut tmp = [0u8; 4096];
    loop {
        let line = read_line(stream, pending, &mut tmp, deadline)?;
        let size = usize::from_str_radix(line.split(';').next().unwrap_or("").trim(), 16)
            .map_err(|_| "bad chunk size")?;
        if size == 0 {
            break;
        }
        if out.len() + size > max_bytes {
            return Err("response is larger than the cap".into());
        }
        while pending.len() < size + 2 {
            if Instant::now() > deadline {
                return Err("timed out".into());
            }
            let n = stream.read(&mut tmp).map_err(|e| e.to_string())?;
            if n == 0 {
                return Err("truncated chunk".into());
            }
            pending.extend_from_slice(&tmp[..n]);
        }
        out.extend_from_slice(&pending[..size]);
        pending.drain(..size + 2);
    }
    Ok(out)
}

fn read_line(
    stream: &mut impl Read,
    pending: &mut Vec<u8>,
    tmp: &mut [u8],
    deadline: Instant,
) -> Result<String, String> {
    loop {
        if let Some(i) = pending.windows(2).position(|w| w == b"\r\n") {
            let line = String::from_utf8_lossy(&pending[..i]).to_string();
            pending.drain(..i + 2);
            return Ok(line);
        }
        if Instant::now() > deadline {
            return Err("timed out".into());
        }
        let n = stream.read(tmp).map_err(|e| e.to_string())?;
        if n == 0 {
            return Err("truncated chunk header".into());
        }
        pending.extend_from_slice(&tmp[..n]);
        if pending.len() > 65_536 {
            return Err("chunk header is too large".into());
        }
    }
}

trait ReadWrite: Read + Write {}
impl<T: Read + Write> ReadWrite for T {}

fn tls_config(policy: &Policy) -> Result<ClientConfig, String> {
    let mut roots = RootCertStore::empty();
    match policy {
        Policy::RecordingFixture { roots: extra } => {
            if extra.is_empty() {
                return Err("recording fixture needs a certificate".into());
            }
            for cert in extra {
                roots.add(cert.clone()).map_err(|e| e.to_string())?;
            }
        }
        Policy::Remote => {
            roots.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
        }
        Policy::Local => return Err("local mode does not use tls".into()),
    }
    Ok(ClientConfig::builder()
        .with_root_certificates(roots)
        .with_no_client_auth())
}

fn resolve_checked(
    url: &Url,
    host: &str,
    port: u16,
    policy: &Policy,
) -> Result<Vec<SocketAddr>, String> {
    match policy {
        Policy::Local => {
            let raw = url.as_str();
            if !(raw.starts_with("http://127.0.0.1:") || raw.starts_with("http://localhost:")) {
                return Err(
                    "local mode only dials http://127.0.0.1 or http://localhost with a port".into(),
                );
            }
            if url.scheme() != "http" {
                return Err("local mode is plaintext loopback only".into());
            }
        }
        Policy::Remote | Policy::RecordingFixture { .. } => {
            if url.scheme() != "https" {
                return Err("remote mode requires https".into());
            }
        }
    }
    let addrs = (host, port)
        .to_socket_addrs()
        .map_err(|e| format!("dns: {e}"))?
        .collect::<Vec<_>>();
    if addrs.is_empty() {
        return Err("dns returned no addresses".into());
    }
    for addr in &addrs {
        match policy {
            Policy::Local | Policy::RecordingFixture { .. } => {
                if !addr.ip().is_loopback() {
                    return Err(format!("{} resolved to a non-loopback address", host));
                }
            }
            Policy::Remote => {
                if !public_unicast(addr.ip()) {
                    return Err(format!(
                        "{} resolved to {} which is not a public address",
                        host,
                        addr.ip()
                    ));
                }
            }
        }
    }
    Ok(addrs)
}

fn blocked_hostname(host: &str) -> bool {
    let host = host.to_ascii_lowercase();
    host == "metadata.google.internal"
        || host == "metadata.google.com"
        || host == "metadata"
        || host.ends_with(".metadata.google.internal")
}

fn public_unicast(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            !v4.is_private()
                && !v4.is_loopback()
                && !v4.is_link_local()
                && !v4.is_broadcast()
                && !v4.is_multicast()
                && !v4.is_unspecified()
                && !v4.is_documentation()
                && !cgnat(v4)
                && v4.octets()[0] != 0
                && v4.octets()[0] < 224
        }
        IpAddr::V6(v6) => {
            !v6.is_loopback()
                && !v6.is_unspecified()
                && !v6.is_multicast()
                && !ula(v6)
                && !v6_link_local(v6)
                && mapped_v4_is_public(v6)
        }
    }
}

fn cgnat(v4: Ipv4Addr) -> bool {
    let o = v4.octets();
    o[0] == 100 && (o[1] & 0b1100_0000) == 64
}

fn ula(v6: Ipv6Addr) -> bool {
    (v6.octets()[0] & 0xfe) == 0xfc
}

fn v6_link_local(v6: Ipv6Addr) -> bool {
    (v6.octets()[0] == 0xfe) && ((v6.octets()[1] & 0xc0) == 0x80)
}

fn mapped_v4_is_public(v6: Ipv6Addr) -> bool {
    match v6.to_ipv4_mapped() {
        Some(v4) => public_unicast(IpAddr::V4(v4)),
        None => true,
    }
}

fn same_authority(a: &Url, b: &Url) -> bool {
    a.host_str() == b.host_str() && a.port_or_known_default() == b.port_or_known_default()
}

fn install_crypto() {
    static ONCE: Once = Once::new();
    ONCE.call_once(|| {
        let _ = rustls::crypto::ring::default_provider().install_default();
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use rustls::pki_types::{PrivateKeyDer, PrivatePkcs8KeyDer};
    use rustls::ServerConfig;
    use std::io::{Read, Write};
    use std::sync::Mutex;
    use std::thread;

    fn request_complete(buf: &[u8]) -> bool {
        let Some(end) = buf.windows(4).position(|w| w == b"\r\n\r\n") else {
            return false;
        };
        let header = String::from_utf8_lossy(&buf[..end]);
        let need = header
            .lines()
            .find_map(|line| {
                line.to_ascii_lowercase()
                    .strip_prefix("content-length:")
                    .and_then(|v| v.trim().parse::<usize>().ok())
            })
            .unwrap_or(0);
        buf.len() >= end + 4 + need
    }

    fn fixture() -> (u16, CertificateDer<'static>, Arc<Mutex<Vec<String>>>) {
        install_crypto();
        let certified =
            rcgen::generate_simple_self_signed(vec!["127.0.0.1".into(), "localhost".into()])
                .expect("cert");
        let cert = certified.cert.der().clone();
        let key =
            PrivateKeyDer::Pkcs8(PrivatePkcs8KeyDer::from(certified.key_pair.serialize_der()));
        let server = ServerConfig::builder()
            .with_no_client_auth()
            .with_single_cert(vec![cert.clone()], key)
            .expect("server config");
        let server = Arc::new(server);
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        let seen = Arc::new(Mutex::new(Vec::new()));
        let seen2 = Arc::clone(&seen);
        thread::spawn(move || {
            for _ in 0..2 {
                let Ok((sock, _)) = listener.accept() else {
                    break;
                };
                let _ = sock.set_read_timeout(Some(Duration::from_secs(2)));
                let _ = sock.set_write_timeout(Some(Duration::from_secs(2)));
                let conn = rustls::ServerConnection::new(Arc::clone(&server)).unwrap();
                let mut tls = StreamOwned::new(conn, sock);
                let mut buf = Vec::new();
                let mut tmp = [0u8; 2048];
                loop {
                    match tls.read(&mut tmp) {
                        Ok(0) => break,
                        Ok(n) => {
                            buf.extend_from_slice(&tmp[..n]);
                            if request_complete(&buf) {
                                break;
                            }
                        }
                        Err(err)
                            if err.kind() == std::io::ErrorKind::WouldBlock
                                || err.kind() == std::io::ErrorKind::TimedOut =>
                        {
                            break;
                        }
                        Err(_) => break,
                    }
                    if buf.len() > 65_536 {
                        break;
                    }
                }
                let text = String::from_utf8_lossy(&buf).to_string();
                seen2.lock().unwrap().push(text.clone());
                let (status, extra, resp_body) = if text.contains("POST /redirect ") {
                    (
                        "307 Temporary Redirect",
                        format!("Location: https://127.0.0.1:{port}/v1/chat/completions\r\n"),
                        Vec::new(),
                    )
                } else if text.contains("POST /steal ") {
                    (
                        "302 Found",
                        "Location: https://169.254.169.254/latest/meta-data\r\n".into(),
                        Vec::new(),
                    )
                } else {
                    let body = b"{\"choices\":[{\"message\":{\"content\":\"fixture-reply\"}}]}";
                    ("200 OK", String::new(), body.to_vec())
                };
                let resp = format!(
                    "HTTP/1.1 {status}\r\n{extra}Content-Length: {}\r\nConnection: close\r\n\r\n",
                    resp_body.len()
                );
                let _ = tls.write_all(resp.as_bytes());
                let _ = tls.write_all(&resp_body);
            }
        });
        (port, cert, seen)
    }

    fn fixture_request(port: u16, path: &str, cert: CertificateDer<'static>) -> Request {
        Request {
            method: "POST".into(),
            url: format!("https://127.0.0.1:{port}{path}"),
            headers: vec![
                ("Authorization".into(), "Bearer fixture-key".into()),
                ("Content-Type".into(), "application/json".into()),
                ("Notion-Version".into(), "2022-06-28".into()),
            ],
            body: b"{\"model\":\"local\",\"messages\":[{\"role\":\"user\",\"content\":\"hello\"}]}"
                .to_vec(),
            policy: Policy::RecordingFixture { roots: vec![cert] },
            timeout: Duration::from_secs(3),
            max_bytes: 65_536,
            cancel: None,
        }
    }

    #[test]
    fn recording_fixture_receives_the_documented_post() {
        let (port, cert, seen) = fixture();
        let resp = send(fixture_request(port, "/v1/chat/completions", cert)).unwrap();
        assert_eq!(resp.status, 200);
        assert!(resp.body.contains("fixture-reply"));
        let got = seen.lock().unwrap();
        let first = &got[0];
        assert!(first.starts_with("POST /v1/chat/completions HTTP/1.1"));
        assert!(first.contains("Bearer fixture-key"));
        assert!(first.contains("\"content\":\"hello\""));
        assert!(first.contains("Notion-Version: 2022-06-28"));
    }

    #[test]
    fn redirect_to_metadata_is_refused_and_remote_policy_refuses_loopback() {
        let (port, cert, seen) = fixture();
        let err = send(fixture_request(port, "/steal", cert.clone())).unwrap_err();
        assert!(
            err.contains("169.254.169.254") || err.contains("not a public") || err.contains("link")
        );
        let remote = Request {
            method: "POST".into(),
            url: format!("https://127.0.0.1:{port}/v1/chat/completions"),
            headers: vec![],
            body: b"{}".to_vec(),
            policy: Policy::Remote,
            timeout: Duration::from_secs(2),
            max_bytes: 1024,
            cancel: None,
        };
        let err = send(remote).unwrap_err();
        assert!(err.contains("not a public"));
        assert!(seen
            .lock()
            .unwrap()
            .iter()
            .all(|s| !s.contains("POST /v1/chat/completions")));
    }

    #[test]
    fn same_host_redirect_is_followed_and_cancel_dials_nothing() {
        let (port, cert, seen) = fixture();
        let mut req = fixture_request(port, "/redirect", cert);
        let resp = send(Request {
            method: req.method.clone(),
            url: req.url.clone(),
            headers: req.headers.clone(),
            body: req.body.clone(),
            policy: Policy::RecordingFixture {
                roots: match &req.policy {
                    Policy::RecordingFixture { roots } => roots.clone(),
                    _ => vec![],
                },
            },
            timeout: req.timeout,
            max_bytes: req.max_bytes,
            cancel: None,
        })
        .unwrap();
        assert!(resp.body.contains("fixture-reply"));
        assert_eq!(resp.redirects.len(), 1);
        let got = seen.lock().unwrap();
        assert!(got[0].contains("POST /redirect "));
        assert!(got[1].contains("POST /v1/chat/completions "));
        req.cancel = Some(Arc::new(AtomicBool::new(true)));
        assert_eq!(send(req).unwrap_err(), "cancelled");
    }

    #[test]
    fn private_and_metadata_names_are_rejected_without_a_dial() {
        for url in [
            "https://10.1.2.3/v1/chat/completions",
            "https://169.254.169.254/latest/meta-data",
            "https://metadata.google.internal/computeMetadata/v1/",
            "https://100.64.0.1/",
            "http://127.0.0.1.evil.com/",
        ] {
            let err = send(Request {
                method: "GET".into(),
                url: url.into(),
                headers: vec![],
                body: vec![],
                policy: Policy::Remote,
                timeout: Duration::from_secs(2),
                max_bytes: 1024,
                cancel: None,
            })
            .unwrap_err();
            assert!(
                err.contains("not a public")
                    || err.contains("blocked metadata")
                    || err.contains("https")
                    || err.contains("dns"),
                "{url} -> {err}"
            );
        }
    }
}
