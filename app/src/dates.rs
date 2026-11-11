use chrono::{Duration, NaiveDate};

/// Inclusive civil window. Day 1 is `today`. N days is `[today-(N-1), today]`.
/// This is calendar arithmetic, not N * 86400 seconds, so a DST day still counts as one date.
pub fn inclusive_window(today: NaiveDate, days: i64) -> Result<(NaiveDate, NaiveDate), String> {
    if days < 1 {
        return Err("day count must be >= 1".into());
    }
    let start = today
        .checked_sub_signed(Duration::days(days - 1))
        .ok_or_else(|| "date underflow".to_string())?;
    if start > today {
        return Err("start after end".into());
    }
    Ok((start, today))
}

pub fn parse_ymd(s: &str) -> Result<NaiveDate, String> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").map_err(|e| format!("bad date {s}: {e}"))
}

pub fn fmt_ymd(d: NaiveDate) -> String {
    d.format("%Y-%m-%d").to_string()
}

pub fn preset_days(preset: u32) -> Result<i64, String> {
    match preset {
        3 | 7 | 30 | 90 | 365 => Ok(preset as i64),
        _ => Err("presets are only 3, 7, 30, 90, 365".into()),
    }
}

pub fn range_ok(start: &str, end: &str) -> Result<(NaiveDate, NaiveDate), String> {
    let s = parse_ymd(start)?;
    let e = parse_ymd(end)?;
    if s > e {
        return Err("start after end".into());
    }
    Ok((s, e))
}

pub fn zone_name_ok(tz: &str) -> bool {
    !tz.is_empty()
        && tz.len() <= 80
        && tz
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '/' || c == '_' || c == '-' || c == '+')
}

/// Owner clock. `YMZZ_TZ` wins. A real system zone wins over UTC.
/// UTC and a missing zone use Asia/Seoul, which is the owner's zone, not a secret.
pub fn prefer_zone(detected: Option<&str>, override_tz: Option<&str>) -> String {
    if let Some(tz) = override_tz {
        if zone_name_ok(tz) {
            return tz.to_string();
        }
    }
    if let Some(tz) = detected {
        if zone_name_ok(tz) && tz != "UTC" && tz != "Etc/UTC" {
            return tz.to_string();
        }
    }
    "Asia/Seoul".to_string()
}

pub fn detect_system_zone() -> Option<String> {
    let path = std::fs::read_link("/etc/localtime").ok()?;
    let text = path.to_string_lossy();
    let zone = text.split("zoneinfo/").nth(1)?.trim_start_matches('/').to_string();
    if zone_name_ok(&zone) {
        Some(zone)
    } else {
        None
    }
}

pub fn owner_clock_zone() -> String {
    let override_tz = std::env::var("YMZZ_TZ").ok();
    prefer_zone(detect_system_zone().as_deref(), override_tz.as_deref())
}

pub fn zone_label(tz: &str) -> &'static str {
    match tz {
        "Asia/Seoul" => "首爾",
        "Asia/Taipei" => "台北",
        "Asia/Shanghai" => "上海",
        "Asia/Hong_Kong" => "香港",
        "Asia/Tokyo" => "東京",
        "Etc/UTC" | "UTC" => "世界協調時",
        _ => "本機",
    }
}

fn python_bin() -> String {
    use std::sync::OnceLock;
    static BIN: OnceLock<String> = OnceLock::new();
    BIN.get_or_init(|| {
        for name in ["python3", "python"] {
            let ok = std::process::Command::new(name)
                .arg("--version")
                .output()
                .map(|out| out.status.success())
                .unwrap_or(false);
            if ok {
                return name.to_string();
            }
        }
        "python3".to_string()
    })
    .clone()
}

/// Hours east of UTC for zones that do not observe daylight saving.
/// Windows Python has no IANA data until `tzdata` is installed, so these
/// zones still resolve.
fn fixed_offset_secs(tz: &str) -> Option<i32> {
    match tz {
        "Asia/Seoul" | "Asia/Tokyo" => Some(9 * 3600),
        "Asia/Taipei" | "Asia/Shanghai" | "Asia/Hong_Kong" => Some(8 * 3600),
        "UTC" | "Etc/UTC" => Some(0),
        _ => None,
    }
}

fn civil_date_at(stamp: i64, offset_secs: i32) -> String {
    let shifted = stamp + offset_secs as i64;
    chrono::DateTime::from_timestamp(shifted, 0)
        .map(|dt| dt.format("%Y-%m-%d").to_string())
        .unwrap_or_else(|| "1970-01-01".to_string())
}

pub fn today_in_zone(tz: &str) -> Result<String, String> {
    if !zone_name_ok(tz) {
        return Err("rejected timezone name".into());
    }
    let script = "import datetime,sys,zoneinfo\nprint(datetime.datetime.now(zoneinfo.ZoneInfo(sys.argv[1])).date().isoformat())\n";
    let out = std::process::Command::new(python_bin())
        .arg("-c")
        .arg(script)
        .arg(tz)
        .output();
    if let Ok(out) = out {
        if out.status.success() {
            let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
            parse_ymd(&s)?;
            return Ok(s);
        }
        if let Some(offset) = fixed_offset_secs(tz) {
            return Ok(civil_date_at(chrono::Utc::now().timestamp(), offset));
        }
        return Err(format!(
            "unknown timezone {tz}: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        ));
    }
    if let Some(offset) = fixed_offset_secs(tz) {
        return Ok(civil_date_at(chrono::Utc::now().timestamp(), offset));
    }
    Err(format!("zoneinfo helper unavailable: {}", out.err().unwrap()))
}

pub fn local_dates_for_unix(tz: &str, stamps: &[i64]) -> Result<Vec<Option<String>>, String> {
    if !zone_name_ok(tz) {
        return Err("rejected timezone name".into());
    }
    let payload = serde_json::to_string(stamps).map_err(|e| e.to_string())?;
    let script = r#"import datetime,json,sys,zoneinfo
tz=zoneinfo.ZoneInfo(sys.argv[1])
stamps=json.load(sys.stdin)
out=[]
for s in stamps:
    if s is None:
        out.append(None)
    else:
        out.append(datetime.datetime.fromtimestamp(s, tz).date().isoformat())
print(json.dumps(out))
"#;
    let mut child = match std::process::Command::new(python_bin())
        .arg("-c")
        .arg(script)
        .arg(tz)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(err) => {
            if let Some(offset) = fixed_offset_secs(tz) {
                return Ok(stamps
                    .iter()
                    .map(|stamp| Some(civil_date_at(*stamp, offset)))
                    .collect());
            }
            return Err(err.to_string());
        }
    };
    {
        use std::io::Write;
        let stdin = child.stdin.as_mut().ok_or("stdin")?;
        stdin
            .write_all(payload.as_bytes())
            .map_err(|e| e.to_string())?;
    }
    let out = child.wait_with_output().map_err(|e| e.to_string())?;
    if !out.status.success() {
        if let Some(offset) = fixed_offset_secs(tz) {
            return Ok(stamps
                .iter()
                .map(|stamp| Some(civil_date_at(*stamp, offset)))
                .collect());
        }
        return Err(format!(
            "zone conversion failed: {}",
            String::from_utf8_lossy(&out.stderr)
        ));
    }
    let v: Vec<Option<String>> = serde_json::from_slice(&out.stdout).map_err(|e| e.to_string())?;
    if v.len() != stamps.len() {
        return Err("zone conversion length mismatch".into());
    }
    Ok(v)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seoul_fixture_windows() {
        let today = parse_ymd("2026-11-07").unwrap();
        let cases = [
            (3, "2026-11-05"),
            (7, "2026-11-01"),
            (30, "2026-10-09"),
            (90, "2026-08-10"),
            (365, "2025-11-08"),
        ];
        for (n, start) in cases {
            let (s, e) = inclusive_window(today, n).unwrap();
            assert_eq!(fmt_ymd(s), start, "preset {n}");
            assert_eq!(fmt_ymd(e), "2026-11-07");
        }
    }

    #[test]
    fn leap_day_and_dst_are_civil_dates() {
        let mar = parse_ymd("2024-03-01").unwrap();
        let (s, _) = inclusive_window(mar, 2).unwrap();
        assert_eq!(fmt_ymd(s), "2024-02-29");
        // US fall-back weekend is still three civil dates, not 3*24h.
        let today = parse_ymd("2026-11-02").unwrap();
        let (s, e) = inclusive_window(today, 3).unwrap();
        assert_eq!(fmt_ymd(s), "2026-10-31");
        assert_eq!(fmt_ymd(e), "2026-11-02");
    }

    #[test]
    fn rejects_inverted_range_and_unknown_preset() {
        assert!(range_ok("2026-11-08", "2026-11-07").is_err());
        assert!(preset_days(14).is_err());
        assert_eq!(preset_days(90).unwrap(), 90);
    }

    #[test]
    fn utc_falls_back_to_the_owner_zone() {
        assert_eq!(prefer_zone(Some("Etc/UTC"), None), "Asia/Seoul");
        assert_eq!(prefer_zone(Some("UTC"), None), "Asia/Seoul");
        assert_eq!(prefer_zone(None, None), "Asia/Seoul");
        assert_eq!(prefer_zone(Some("Asia/Taipei"), None), "Asia/Taipei");
        assert_eq!(prefer_zone(Some("Etc/UTC"), Some("Asia/Tokyo")), "Asia/Tokyo");
        assert_eq!(zone_label("Asia/Seoul"), "首爾");
    }

    #[test]
    fn seoul_today_runs_zoneinfo() {
        let t = today_in_zone("Asia/Seoul").unwrap();
        assert_eq!(t.len(), 10);
        assert!(today_in_zone("Not/AZone").is_err());
        assert!(today_in_zone("Asia/Seoul;rm").is_err());
    }
}
