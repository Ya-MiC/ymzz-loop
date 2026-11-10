use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpListener};

/// Decimal only. Leading zeros are decimal, so "0413" is port 413, not octal 267.
pub fn parse_port(raw: &str) -> Result<u16, String> {
    if raw.is_empty() || !raw.bytes().all(|b| b.is_ascii_digit()) {
        return Err(format!("port must be decimal digits, got {raw}"));
    }
    let value: u32 = raw.parse().map_err(|_| format!("bad port {raw}"))?;
    if value > 65535 {
        return Err("port out of range".into());
    }
    Ok(value as u16)
}

pub fn parse_bind_host(host: &str) -> Result<IpAddr, String> {
    if host != "127.0.0.1" {
        return Err(format!(
            "refusing bind host {host}; this app only listens on 127.0.0.1 and will not sudo"
        ));
    }
    Ok(IpAddr::V4(Ipv4Addr::LOCALHOST))
}

pub fn bind_loopback(port: u16) -> Result<TcpListener, String> {
    let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
    TcpListener::bind(addr).map_err(|e| explain_bind_error(port, &e))
}

pub fn explain_bind_error(port: u16, err: &std::io::Error) -> String {
    if port < 1024 && (err.kind() == std::io::ErrorKind::PermissionDenied || err.raw_os_error() == Some(13)) {
        format!(
            "Port {port} is decimal (0413 is not octal). Binding {port} failed: {err}. On Unix, ports below 1024 are privileged. This app will not use sudo or raise capabilities by itself. Choose an unprivileged loopback port explicitly, for example: ymzz-vibe serve --port 1413"
        )
    } else {
        format!("bind 127.0.0.1:{port} failed: {err}. Not switching ports unless you pass --port. This app will not sudo.")
    }
}

pub fn systemd_unit() -> String {
    "\
[Unit]\n\
Description=ymzz-vibe loopback\n\
[Service]\n\
Environment=YMZZ_BIND=127.0.0.1\n\
ExecStart=/usr/local/bin/ymzz-vibe serve --port 1413\n\
NoNewPrivileges=true\n\
PrivateNetwork=false\n\
# does not run as root and does not sudo\n\
".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn port_413_is_decimal_and_non_loopback_is_refused() {
        assert_eq!(parse_port("0413").unwrap(), 413);
        assert_eq!(parse_port("413").unwrap(), 413);
        assert_ne!(parse_port("0413").unwrap(), 0o413);
        assert!(parse_port("0o413").is_err());
        assert!(parse_bind_host("0.0.0.0").is_err());
        assert!(parse_bind_host("10.0.0.8").is_err());
        assert!(parse_bind_host("127.0.0.1").is_ok());
        let err = std::io::Error::from_raw_os_error(13);
        let msg = explain_bind_error(413, &err);
        assert!(msg.contains("will not use sudo"));
        assert!(msg.contains("1413"));
        assert!(msg.contains("decimal"));
        let unit = systemd_unit();
        assert!(unit.contains("127.0.0.1"));
        assert!(unit.contains("NoNewPrivileges"));
        assert!(!unit.contains("User=root"));
    }

    #[test]
    fn live_413_is_privileged_here_or_explained() {
        match bind_loopback(413) {
            Ok(listener) => {
                let addr = listener.local_addr().unwrap();
                assert_eq!(addr.ip().to_string(), "127.0.0.1");
                assert_eq!(addr.port(), 413);
            }
            Err(msg) => {
                assert!(msg.contains("sudo"), "{msg}");
                assert!(msg.contains("1413"), "{msg}");
            }
        }
    }
}
