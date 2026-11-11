use crate::dates::{fmt_ymd, inclusive_window, parse_ymd, preset_days, range_ok};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Serialize)]
pub struct Rec {
    pub id: String,
    pub drive: String,
    pub path: String,
    pub ext: String,
    pub modified: Option<String>,
    pub readable: bool,
    pub version: String,
    pub bytes: u64,
    pub skip_reason: Option<String>,
    pub escapes: bool,
    pub kind: String,
}

#[derive(Clone, Debug, Default)]
pub struct QuerySpec {
    pub start: String,
    pub end: String,
    pub drive: Option<String>,
    pub ext: Option<String>,
    pub group: Option<String>,
    pub more_enabled: bool,
    pub name_contains: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SnapItem {
    pub id: String,
    pub path: String,
    pub drive: String,
    pub ext: String,
    pub modified: String,
    pub group: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DayPoint {
    pub rel_day: i64,
    pub date: String,
    pub count: usize,
    pub ratio: Option<f64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QuerySnap {
    pub ids: Vec<String>,
    pub versions: BTreeMap<String, String>,
    pub skipped: usize,
    pub unknown_mtime: usize,
    pub groups: BTreeMap<String, usize>,
    pub per_day: BTreeMap<String, usize>,
    pub start: String,
    pub end: String,
    pub drive: Option<String>,
    pub ext: Option<String>,
    #[serde(default)]
    pub group: Option<String>,
    #[serde(default)]
    pub items: Vec<SnapItem>,
    pub formula: String,
}

pub fn group_key(drive: &str, ext: &str) -> String {
    let label = if ext.is_empty() {
        "（無副檔名）"
    } else {
        ext
    };
    if drive.ends_with(':') {
        format!("{drive}{label}")
    } else {
        format!("{drive} {label}")
    }
}

pub fn apply_query(records: &[Rec], spec: &QuerySpec) -> Result<QuerySnap, String> {
    let _ = range_ok(&spec.start, &spec.end)?;
    let grouped = spec.group.as_deref().is_some_and(|g| !g.is_empty());
    let split = spec.drive.as_deref().is_some_and(|d| !d.is_empty())
        || spec.ext.as_deref().is_some_and(|e| !e.is_empty());
    if grouped && split {
        return Err("type filter is one group; do not also send drive and extension".into());
    }
    let mut ids = Vec::new();
    let mut versions = BTreeMap::new();
    let mut skipped = 0usize;
    let mut unknown_mtime = 0usize;
    let mut groups = BTreeMap::new();
    let mut per_day = BTreeMap::new();
    let mut items = Vec::new();
    for rec in records {
        if !rec.readable || rec.escapes {
            skipped += 1;
            continue;
        }
        let Some(day) = rec.modified.as_deref() else {
            unknown_mtime += 1;
            continue;
        };
        if day < spec.start.as_str() || day > spec.end.as_str() {
            continue;
        }
        if let Some(drive) = spec.drive.as_deref() {
            if !drive.is_empty() && rec.drive != drive {
                continue;
            }
        }
        if let Some(ext) = spec.ext.as_deref() {
            if !ext.is_empty() && rec.ext != ext {
                continue;
            }
        }
        let key = group_key(&rec.drive, &rec.ext);
        if let Some(group) = spec.group.as_deref() {
            if !group.is_empty() && key != group {
                continue;
            }
        }
        if spec.more_enabled {
            if let Some(name) = spec.name_contains.as_deref() {
                if !name.is_empty() && !rec.path.contains(name) {
                    continue;
                }
            }
        }
        ids.push(rec.id.clone());
        versions.insert(rec.id.clone(), rec.version.clone());
        *groups.entry(key.clone()).or_insert(0) += 1;
        *per_day.entry(day.to_string()).or_insert(0) += 1;
        items.push(SnapItem {
            id: rec.id.clone(),
            path: rec.path.clone(),
            drive: rec.drive.clone(),
            ext: rec.ext.clone(),
            modified: day.to_string(),
            group: key,
        });
    }
    Ok(QuerySnap {
        ids,
        versions,
        skipped,
        unknown_mtime,
        groups,
        per_day,
        start: spec.start.clone(),
        end: spec.end.clone(),
        drive: spec.drive.clone(),
        ext: spec.ext.clone(),
        group: spec.group.clone(),
        items,
        formula: "y = day_count / period_total".into(),
    })
}

pub fn spec_from_preset(
    today: &str,
    preset: u32,
    drive: Option<String>,
    ext: Option<String>,
) -> Result<QuerySpec, String> {
    let days = preset_days(preset)?;
    let (s, e) = inclusive_window(parse_ymd(today)?, days)?;
    Ok(QuerySpec {
        start: fmt_ymd(s),
        end: fmt_ymd(e),
        drive,
        ext,
        group: None,
        more_enabled: false,
        name_contains: None,
    })
}

pub fn series(snap: &QuerySnap) -> Result<Vec<DayPoint>, String> {
    let (start, end) = range_ok(&snap.start, &snap.end)?;
    let total: usize = snap.per_day.values().sum();
    let mut points = Vec::new();
    let mut day = start;
    let mut rel = 0i64;
    loop {
        let key = fmt_ymd(day);
        let count = snap.per_day.get(&key).copied().unwrap_or(0);
        let ratio = if total == 0 {
            None
        } else {
            Some(count as f64 / total as f64)
        };
        points.push(DayPoint {
            rel_day: rel,
            date: key,
            count,
            ratio,
        });
        if day == end {
            break;
        }
        day = day.succ_opt().ok_or_else(|| "date overflow".to_string())?;
        rel += 1;
        if rel > 4000 {
            return Err("range too long".into());
        }
    }
    Ok(points)
}

pub fn compare(current: &QuerySnap, previous: Option<&QuerySnap>) -> Value {
    let cur = series(current).unwrap_or_default();
    let prev = previous.and_then(|p| series(p).ok());
    json!({
        "formula": "y = day_count / period_total",
        "note": "ratios are each period's own share, not absolute counts",
        "current": {
            "total": current.ids.len(),
            "start": current.start,
            "end": current.end,
            "empty": current.ids.is_empty(),
            "points": cur,
        },
        "previous": prev.as_ref().map(|points| json!({
            "total": previous.unwrap().ids.len(),
            "start": previous.unwrap().start,
            "end": previous.unwrap().end,
            "empty": previous.unwrap().ids.is_empty(),
            "points": points,
        })),
        "previous_scope": "session_only_until_opt_in",
    })
}

pub fn records_from_synthetic(v: &Value) -> Vec<Rec> {
    v.get("records")
        .and_then(|x| x.as_array())
        .map(|rows| {
            rows.iter()
                .filter_map(|r| {
                    Some(Rec {
                        id: r.get("id")?.as_str()?.to_string(),
                        drive: r.get("drive")?.as_str()?.to_string(),
                        path: r.get("path")?.as_str()?.to_string(),
                        ext: r.get("type")?.as_str()?.to_string(),
                        modified: r
                            .get("modified_local_date")
                            .and_then(|d| d.as_str())
                            .map(|s| s.to_string()),
                        readable: r.get("readable").and_then(|b| b.as_bool()).unwrap_or(false),
                        version: r
                            .get("version")
                            .and_then(|s| s.as_str())
                            .unwrap_or("")
                            .to_string(),
                        bytes: r.get("bytes").and_then(|n| n.as_u64()).unwrap_or(0),
                        skip_reason: if r.get("readable").and_then(|b| b.as_bool()) == Some(false) {
                            Some("not_readable".into())
                        } else {
                            None
                        },
                        escapes: false,
                        kind: "synthetic".into(),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn synthetic_fixture_matches_expected_ids() {
        let meta: Value =
            serde_json::from_str(include_str!("../fixtures/metadata.synthetic.json")).unwrap();
        let expected: Value =
            serde_json::from_str(include_str!("../fixtures/expected_queries.json")).unwrap();
        let records = records_from_synthetic(&meta);
        for q in expected["queries"].as_array().unwrap() {
            let spec = QuerySpec {
                start: q["start"].as_str().unwrap().into(),
                end: q["end"].as_str().unwrap().into(),
                drive: q
                    .get("drive")
                    .and_then(|d| d.as_str())
                    .map(|s| s.to_string()),
                ext: q
                    .get("type")
                    .and_then(|d| d.as_str())
                    .map(|s| s.to_string()),
                group: None,
                more_enabled: false,
                name_contains: None,
            };
            let snap = apply_query(&records, &spec).unwrap();
            let mut got = snap.ids.clone();
            got.sort();
            let mut exp: Vec<String> = q["expected_ids"]
                .as_array()
                .unwrap()
                .iter()
                .map(|x| x.as_str().unwrap().to_string())
                .collect();
            exp.sort();
            assert_eq!(got, exp, "{}", q["name"]);
        }
    }

    #[test]
    fn more_filter_is_not_a_third_default() {
        let meta: Value =
            serde_json::from_str(include_str!("../fixtures/metadata.synthetic.json")).unwrap();
        let records = records_from_synthetic(&meta);
        let mut spec = spec_from_preset("2026-11-07", 3, None, None).unwrap();
        spec.name_contains = Some("file-1".into());
        let ignored = apply_query(&records, &spec).unwrap();
        spec.more_enabled = true;
        let applied = apply_query(&records, &spec).unwrap();
        assert!(ignored.ids.len() > applied.ids.len());
        assert!(applied.ids.iter().all(|id| records
            .iter()
            .find(|r| &r.id == id)
            .unwrap()
            .path
            .contains("file-1")));
    }

    #[test]
    fn empty_period_has_no_ratio_divide() {
        let snap = QuerySnap {
            ids: vec![],
            versions: BTreeMap::new(),
            skipped: 0,
            unknown_mtime: 0,
            groups: BTreeMap::new(),
            per_day: BTreeMap::new(),
            start: "2026-11-05".into(),
            end: "2026-11-07".into(),
            drive: None,
            ext: None,
            group: None,
            items: vec![],
            formula: "y = day_count / period_total".into(),
        };
        let points = series(&snap).unwrap();
        assert!(points.iter().all(|p| p.ratio.is_none()));
        assert_eq!(points.len(), 3);
    }

    #[test]
    fn windows_group_uses_drive_letter_unix_group_does_not_invent_c() {
        assert_eq!(group_key("C:", ".py"), "C:.py");
        assert_eq!(group_key("/home", ".md"), "/home .md");
        assert!(!group_key("/Volumes/Notes", ".pdf").contains("C:"));
        assert_eq!(group_key("/Volumes/Notes", ".pdf"), "/Volumes/Notes .pdf");
    }

    #[test]
    fn one_group_selector_filters_and_rejects_a_split_type() {
        let meta: Value =
            serde_json::from_str(include_str!("../fixtures/metadata.synthetic.json")).unwrap();
        let records = records_from_synthetic(&meta);
        let mut spec = spec_from_preset("2026-11-07", 3, None, None).unwrap();
        spec.group = Some("D:.py".into());
        let snap = apply_query(&records, &spec).unwrap();
        assert!(snap.ids.contains(&"SYN-001".to_string()));
        assert!(snap.items.iter().all(|item| item.group == "D:.py"));
        spec.drive = Some("D:".into());
        assert!(apply_query(&records, &spec)
            .unwrap_err()
            .contains("one group"));
    }
}
