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

pub fn today_in_zone(tz: &str) -> Result<String, String> {
    if tz.len() > 80
        || tz
            .chars()
            .any(|c| !(c.is_ascii_alphanumeric() || c == '/' || c == '_' || c == '-' || c == '+'))
    {
        return Err("rejected timezone name".into());
    }
    let script = "import datetime,sys,zoneinfo\nprint(datetime.datetime.now(zoneinfo.ZoneInfo(sys.argv[1])).date().isoformat())\n";
    let out = std::process::Command::new("python3")
        .arg("-c")
        .arg(script)
        .arg(tz)
        .output()
        .map_err(|e| format!("zoneinfo helper unavailable: {e}"))?;
    if !out.status.success() {
        return Err(format!(
            "unknown timezone {tz}: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        ));
    }
    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
    parse_ymd(&s)?;
    Ok(s)
}

pub fn local_dates_for_unix(tz: &str, stamps: &[i64]) -> Result<Vec<Option<String>>, String> {
    if tz.len() > 80
        || tz
            .chars()
            .any(|c| !(c.is_ascii_alphanumeric() || c == '/' || c == '_' || c == '-' || c == '+'))
    {
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
    let mut child = std::process::Command::new("python3")
        .arg("-c")
        .arg(script)
        .arg(tz)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
    {
        use std::io::Write;
        let stdin = child.stdin.as_mut().ok_or("stdin")?;
        stdin
            .write_all(payload.as_bytes())
            .map_err(|e| e.to_string())?;
    }
    let out = child.wait_with_output().map_err(|e| e.to_string())?;
    if !out.status.success() {
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
    fn seoul_today_runs_zoneinfo() {
        let t = today_in_zone("Asia/Seoul").unwrap();
        assert_eq!(t.len(), 10);
        assert!(today_in_zone("Not/AZone").is_err());
        assert!(today_in_zone("Asia/Seoul;rm").is_err());
    }
}
