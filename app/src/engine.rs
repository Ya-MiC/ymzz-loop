use crate::capabilities::matrix;
use crate::connectors::{self, BuiltRequest};
use crate::decisions::{self, Evidence};
use crate::inventory::{self, which};
use crate::paths::{self, PlannedMove};
use crate::pay::{self, PayEvent};
use crate::pdf;
use crate::query::{self, QuerySnap, QuerySpec, Rec};
use crate::scan;
use crate::store;
use crate::t3bridge;
use crate::util::{self, mask_secret, random_id, redact};
use rusqlite::{params, Connection};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::fs;
use std::io::Write;
use std::os::unix::fs::OpenOptionsExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct Config {
    pub data_dir: PathBuf,
    pub repo_root: PathBuf,
    pub session_token: String,
    pub csrf: String,
    pub admin_token: String,
    pub port: u16,
}

struct Mem {
    root: Option<PathBuf>,
    records: Vec<Rec>,
    source: String,
    draft: QuerySpec,
    snapshot: Option<QuerySnap>,
    previous: Option<QuerySnap>,
    dynamic_select: bool,
    embed_opt_in: bool,
    telemetry: bool,
    permission: String,
    terminal_allowed: bool,
    plans: BTreeMap<String, PlannedMove>,
    orders: BTreeMap<String, pay::Order>,
    pay_secret: Vec<u8>,
}

pub struct App {
    pub cfg: Mutex<Config>,
    db: Mutex<Connection>,
    mem: Mutex<Mem>,
}

impl App {
    pub fn open(data_dir: &Path, repo_root: &Path) -> Result<Self, String> {
        fs::create_dir_all(data_dir).map_err(|e| e.to_string())?;
        let conn = store::open(&data_dir.join("v021.sqlite"))?;
        let session_token = load_or_create(&data_dir.join("session.token"))?;
        let csrf = load_or_create(&data_dir.join("csrf.token"))?;
        let admin_token = load_or_create(&data_dir.join("admin.token"))?;
        let pay_secret = load_or_create(&data_dir.join("pay.key"))?.into_bytes();
        let orders = load_orders(&conn)?;
        Ok(Self {
            cfg: Mutex::new(Config {
                data_dir: data_dir.to_path_buf(),
                repo_root: repo_root.to_path_buf(),
                session_token,
                csrf,
                admin_token,
                port: 0,
            }),
            db: Mutex::new(conn),
            mem: Mutex::new(Mem {
                root: None,
                records: Vec::new(),
                source: "none".into(),
                draft: QuerySpec::default(),
                snapshot: None,
                previous: None,
                dynamic_select: false,
                embed_opt_in: false,
                telemetry: false,
                permission: "workspace-write".into(),
                terminal_allowed: true,
                plans: BTreeMap::new(),
                orders,
                pay_secret,
            }),
        })
    }

    pub fn audit(&self, action: &str, detail: &str) {
        let id = random_id("aud");
        let at = util::now_rfc3339();
        if let Ok(db) = self.db.lock() {
            let _ = store::audit(&db, &id, action, detail, &at);
        }
    }

    pub fn health(&self) -> Value {
        let cfg = self.cfg.lock().expect("cfg").clone();
        json!({
            "ok": true,
            "version": env!("CARGO_PKG_VERSION"),
            "bind": "127.0.0.1",
            "port": cfg.port,
            "telemetry_sender": false,
            "auto_update": false,
        })
    }

    pub fn capabilities(&self) -> Value { matrix() }

    pub fn set_root(&self, path: &str) -> Result<Value, String> {
        let p = PathBuf::from(path);
        let canon = p.canonicalize().map_err(|e| format!("root not found: {e}"))?;
        if !canon.is_dir() { return Err("root is not a directory".into()); }
        if canon == Path::new("/") { return Err("refusing filesystem root".into()); }
        self.mem.lock().expect("mem").root = Some(canon.clone());
        self.audit("root", &canon.to_string_lossy());
        Ok(json!({"root": canon, "markdown_enabled": true}))
    }

    pub fn root(&self) -> Value {
        let mem = self.mem.lock().expect("mem");
        json!({"root": mem.root, "source": mem.source, "markdown_enabled": mem.root.is_some()})
    }

    pub fn scan(&self, tz: &str) -> Result<Value, String> {
        let root = self.mem.lock().expect("mem").root.clone().ok_or("select a root first")?;
        let records = scan::scan_root(&root, tz)?;
        let n = records.len();
        let skipped = records.iter().filter(|r| !r.readable).count();
        let mut mem = self.mem.lock().expect("mem");
        mem.records = records;
        mem.source = "filesystem".into();
        Ok(json!({"count": n, "skipped": skipped, "source": "filesystem", "time_basis": "mtime", "timezone": tz}))
    }

    pub fn load_synthetic(&self) -> Result<Value, String> {
        let v: Value = serde_json::from_str(include_str!("../fixtures/metadata.synthetic.json")).map_err(|e| e.to_string())?;
        let records = query::records_from_synthetic(&v);
        let n = records.len();
        let mut mem = self.mem.lock().expect("mem");
        mem.records = records;
        mem.source = "synthetic".into();
        Ok(json!({"count": n, "source": "synthetic", "banner": "合成樣本，不是這台電腦的檔案"}))
    }

    pub fn set_draft(&self, body: &Value) -> Result<Value, String> {
        let today = body.get("today").and_then(|v| v.as_str()).unwrap_or("");
        let preset = body.get("preset").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
        let mut spec = QuerySpec {
            start: body.get("start").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            end: body.get("end").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            drive: empty_to_none(body.get("drive").and_then(|v| v.as_str())),
            ext: empty_to_none(body.get("ext").and_then(|v| v.as_str())),
            more_enabled: body.get("more_enabled").and_then(|v| v.as_bool()).unwrap_or(false),
            name_contains: empty_to_none(body.get("name_contains").and_then(|v| v.as_str())),
        };
        if preset > 0 {
            if today.is_empty() { return Err("preset needs today".into()); }
            spec = query::spec_from_preset(today, preset, spec.drive, spec.ext)?;
            spec.more_enabled = body.get("more_enabled").and_then(|v| v.as_bool()).unwrap_or(false);
            spec.name_contains = empty_to_none(body.get("name_contains").and_then(|v| v.as_str()));
        }
        if !spec.start.is_empty() && !spec.end.is_empty() {
            crate::dates::range_ok(&spec.start, &spec.end)?;
        }
        let mut mem = self.mem.lock().expect("mem");
        let snapshot_id = mem.snapshot.as_ref().map(|s| s.start.clone());
        mem.draft = spec;
        Ok(json!({
            "draft_only": true,
            "queried": false,
            "snapshot_unchanged": snapshot_id,
            "defaults": ["calendar-day range", "drive x file type"],
        }))
    }

    pub fn draft(&self) -> Value {
        let mem = self.mem.lock().expect("mem");
        json!(draft_json(&mem.draft))
    }

    pub fn query(&self) -> Result<Value, String> {
        let mut mem = self.mem.lock().expect("mem");
        if mem.draft.start.is_empty() || mem.draft.end.is_empty() {
            return Err("set a date range, then query".into());
        }
        let snap = query::apply_query(&mem.records, &mem.draft)?;
        if mem.snapshot.is_some() {
            mem.previous = mem.snapshot.take();
        }
        let summary = json!({
            "count": snap.ids.len(),
            "start": snap.start,
            "end": snap.end,
            "drive": snap.drive,
            "ext": snap.ext,
            "skipped": snap.skipped,
            "unknown_mtime": snap.unknown_mtime,
            "groups": snap.groups,
            "time_basis": "mtime",
            "source": mem.source,
            "select_all_label": format!("本次結果 {} 份，不含以後新增", snap.ids.len()),
        });
        mem.snapshot = Some(snap);
        Ok(summary)
    }

    pub fn snapshot(&self) -> Value {
        let mem = self.mem.lock().expect("mem");
        match &mem.snapshot {
            None => json!({"snapshot": null}),
            Some(s) => json!({"ids": s.ids, "groups": s.groups, "per_day": s.per_day, "start": s.start, "end": s.end, "formula": s.formula, "source": mem.source}),
        }
    }

    pub fn compare(&self) -> Value {
        let mem = self.mem.lock().expect("mem");
        match &mem.snapshot {
            None => json!({"error": "no query yet"}),
            Some(cur) => query::compare(cur, mem.previous.as_ref()),
        }
    }

    pub fn select_all(&self, dynamic: bool) -> Result<Value, String> {
        let mut mem = self.mem.lock().expect("mem");
        if dynamic {
            let spec = mem.draft.clone();
            let snap = query::apply_query(&mem.records, &spec)?;
            return Ok(json!({"dynamic": true, "ids": snap.ids, "label": "動態規則，會包含之後符合的檔案"}));
        }
        let snap = mem.snapshot.as_ref().ok_or("query first")?;
        let ids = snap.ids.clone();
        mem.dynamic_select = false;
        Ok(json!({"dynamic": false, "ids": ids, "label": format!("本次結果 {} 份，不含以後新增", ids.len())}))
    }

    pub fn persist_snapshot(&self) -> Result<Value, String> {
        let mem = self.mem.lock().expect("mem");
        let snap = mem.snapshot.as_ref().ok_or("nothing to save")?;
        let payload = serde_json::to_string(snap).map_err(|e| e.to_string())?;
        let db = self.db.lock().expect("db");
        db.execute(
            "INSERT INTO snapshots(id,payload,created_at) VALUES(?1,?2,?3) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
            params!["current", payload, util::now_rfc3339()],
        ).map_err(|e| e.to_string())?;
        Ok(json!({"saved": true, "opt_in": true}))
    }

    pub fn restore_snapshot(&self) -> Result<Value, String> {
        let db = self.db.lock().expect("db");
        let mut stmt = db.prepare("SELECT payload FROM snapshots WHERE id='current'").map_err(|e| e.to_string())?;
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
        let payload: String = if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            row.get(0).map_err(|e| e.to_string())?
        } else {
            return Err("no opted-in snapshot".into());
        };
        drop(rows);
        drop(stmt);
        drop(db);
        let snap: QuerySnap = serde_json::from_str(&payload).map_err(|e| e.to_string())?;
        self.mem.lock().expect("mem").snapshot = Some(snap);
        Ok(json!({"restored": true}))
    }

    pub fn clear_persisted(&self) -> Result<Value, String> {
        self.db.lock().expect("db").execute("DELETE FROM snapshots", []).map_err(|e| e.to_string())?;
        Ok(json!({"cleared": true}))
    }

    pub fn semantic(&self, opt_in: bool) -> Value {
        self.mem.lock().expect("mem").embed_opt_in = opt_in;
        if !opt_in {
            json!({"status": "unavailable", "reason": "date heatmap is not a semantic contour; embeddings need an explicit opt-in", "uploaded": false})
        } else {
            json!({"status": "opted_in_no_model", "reason": "no local embedding model is bundled; file contents were not read and were not uploaded", "uploaded": false})
        }
    }

    pub fn write_md(&self, rel: &str, body: &str, dry: bool) -> Result<Value, String> {
        self.ensure_write()?;
        let root = self.mem.lock().expect("mem").root.clone().ok_or("select a root before writing markdown")?;
        if !rel.ends_with(".md") { return Err("markdown sidebar only writes .md files".into()); }
        let dest = paths::resolve_inside(&root, rel)?;
        let root_s = root.canonicalize().map_err(|e| e.to_string())?;
        let abs = dest.to_string_lossy().to_string();
        if t3bridge::relative_path(&abs, &root_s.to_string_lossy())?.is_none() {
            return Err("path rejected by vendored T3 workspace check".into());
        }
        if dest.exists() { return Err("refusing overwrite".into()); }
        if dry { return Ok(json!({"dry_run": true, "path": rel})); }
        if let Some(parent) = dest.parent() { fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
        fs::write(&dest, body).map_err(|e| e.to_string())?;
        self.audit("write_md", rel);
        Ok(json!({"wrote": rel}))
    }

    pub fn plan_move(&self, from_rel: &str, to_rel: &str) -> Result<Value, String> {
        self.ensure_write()?;
        let root = self.mem.lock().expect("mem").root.clone().ok_or("select a root first")?;
        let plan = paths::plan_move(&root, from_rel, to_rel)?;
        let id = random_id("plan");
        let body = json!({"id": id, "from": from_rel, "to": to_rel, "sha256": plan.sha256, "dry_run": true, "confirm": "CONFIRM"});
        self.mem.lock().expect("mem").plans.insert(id, plan);
        Ok(body)
    }

    pub fn confirm_move(&self, id: &str, phrase: &str) -> Result<Value, String> {
        self.ensure_write()?;
        if phrase != "CONFIRM" { return Err("confirmation phrase must be CONFIRM".into()); }
        let root = self.mem.lock().expect("mem").root.clone().ok_or("select a root first")?;
        let plan = self.mem.lock().expect("mem").plans.get(id).cloned().ok_or("unknown plan")?;
        let backup = self.cfg.lock().expect("cfg").data_dir.join("backups").join(id);
        paths::execute_move(&root, &plan, &backup)?;
        self.mem.lock().expect("mem").plans.remove(id);
        let db = self.db.lock().expect("db");
        let payload = serde_json::to_string(&json!({"from": plan.from_rel, "to": plan.to_rel, "sha256": plan.sha256})).unwrap_or_default();
        store::kv_put(&db, &format!("manifest:{id}"), &payload)?;
        drop(db);
        self.mem.lock().expect("mem").plans.insert(format!("done:{id}"), plan);
        self.audit("move", id);
        Ok(json!({"moved": id}))
    }

    pub fn undo_move(&self, id: &str) -> Result<Value, String> {
        self.ensure_write()?;
        let root = self.mem.lock().expect("mem").root.clone().ok_or("select a root first")?;
        let key = format!("done:{id}");
        let plan = self.mem.lock().expect("mem").plans.get(&key).cloned().ok_or("unknown manifest")?;
        paths::undo_move(&root, &plan)?;
        self.audit("undo", id);
        Ok(json!({"undone": id}))
    }

    fn ensure_write(&self) -> Result<(), String> {
        let mem = self.mem.lock().expect("mem");
        if mem.permission == "read-only" { return Err("forbidden by permission mode read-only".into()); }
        Ok(())
    }

    pub fn set_permission(&self, mode: &str) -> Result<Value, String> {
        if !matches!(mode, "read-only" | "workspace-write" | "danger-full") {
            return Err("unknown permission mode".into());
        }
        self.mem.lock().expect("mem").permission = mode.to_string();
        Ok(json!({"permission": mode, "confirm_still_required": true}))
    }

    pub fn threads_create(&self, title: &str) -> Result<Value, String> {
        let id = random_id("thr");
        let at = util::now_rfc3339();
        self.db.lock().expect("db").execute(
            "INSERT INTO threads(id,title,archived,created_at,updated_at) VALUES(?1,?2,0,?3,?3)",
            params![id, title, at],
        ).map_err(|e| e.to_string())?;
        self.audit("thread", &id);
        Ok(json!({"id": id, "title": title}))
    }

    pub fn threads_list(&self, archived: bool) -> Result<Value, String> {
        let db = self.db.lock().expect("db");
        let mut stmt = db.prepare("SELECT id,title,archived,updated_at FROM threads WHERE archived=?1 ORDER BY updated_at").map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![archived as i64], |row| {
            Ok(json!({"id": row.get::<_, String>(0)?, "title": row.get::<_, String>(1)?, "archived": row.get::<_, i64>(2)? == 1, "updated_at": row.get::<_, String>(3)?}))
        }).map_err(|e| e.to_string())?;
        let mut items = Vec::new();
        for row in rows { items.push(row.map_err(|e| e.to_string())?); }
        Ok(json!({"threads": items}))
    }

    pub fn message(&self, thread: &str, role: &str, content: &str) -> Result<Value, String> {
        let id = random_id("msg");
        let at = util::now_rfc3339();
        let db = self.db.lock().expect("db");
        db.execute(
            "INSERT INTO messages(id,thread_id,role,content,created_at) VALUES(?1,?2,?3,?4,?5)",
            params![id, thread, role, content, at],
        ).map_err(|e| e.to_string())?;
        db.execute("UPDATE threads SET updated_at=?1 WHERE id=?2", params![at, thread]).map_err(|e| e.to_string())?;
        Ok(json!({"id": id, "untrusted": true}))
    }

    pub fn attach(&self, thread: &str, name: &str, bytes: &[u8]) -> Result<Value, String> {
        if bytes.len() > 1_000_000 { return Err("attachment too large".into()); }
        let id = random_id("att");
        self.db.lock().expect("db").execute(
            "INSERT INTO attachments(id,thread_id,name,bytes) VALUES(?1,?2,?3,?4)",
            params![id, thread, name, bytes],
        ).map_err(|e| e.to_string())?;
        Ok(json!({"id": id, "name": name, "bytes": bytes.len()}))
    }

    pub fn archive_thread(&self, thread: &str, archived: bool) -> Result<Value, String> {
        self.db.lock().expect("db").execute("UPDATE threads SET archived=?1 WHERE id=?2", params![archived as i64, thread]).map_err(|e| e.to_string())?;
        Ok(json!({"id": thread, "archived": archived}))
    }

    pub fn delete_thread(&self, thread: &str) -> Result<Value, String> {
        {
            let db = self.db.lock().expect("db");
            db.execute("DELETE FROM messages WHERE thread_id=?1", params![thread]).map_err(|e| e.to_string())?;
            db.execute("DELETE FROM attachments WHERE thread_id=?1", params![thread]).map_err(|e| e.to_string())?;
            db.execute("DELETE FROM threads WHERE id=?1", params![thread]).map_err(|e| e.to_string())?;
        }
        self.audit("delete_thread", thread);
        Ok(json!({"deleted": thread}))
    }

    pub fn export_thread(&self, thread: &str) -> Result<Value, String> {
        let db = self.db.lock().expect("db");
        let title: String = db.query_row("SELECT title FROM threads WHERE id=?1", params![thread], |r| r.get(0)).map_err(|_| "thread not found".to_string())?;
        let mut stmt = db.prepare("SELECT id,role,content,created_at FROM messages WHERE thread_id=?1 ORDER BY created_at").map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![thread], |row| {
            Ok(json!({"id": row.get::<_, String>(0)?, "role": row.get::<_, String>(1)?, "content": row.get::<_, String>(2)?, "created_at": row.get::<_, String>(3)?}))
        }).map_err(|e| e.to_string())?;
        let mut messages = Vec::new();
        for row in rows { messages.push(row.map_err(|e| e.to_string())?); }
        Ok(json!({"synthetic_export": true, "id": thread, "title": title, "messages": messages}))
    }

    pub fn import_thread(&self, body: &Value) -> Result<Value, String> {
        let title = body.get("title").and_then(|v| v.as_str()).unwrap_or("imported");
        let created = self.threads_create(title)?;
        let id = created["id"].as_str().unwrap().to_string();
        if let Some(messages) = body.get("messages").and_then(|v| v.as_array()) {
            for msg in messages {
                let role = msg.get("role").and_then(|v| v.as_str()).unwrap_or("user");
                let content = msg.get("content").and_then(|v| v.as_str()).unwrap_or("");
                self.message(&id, role, content)?;
            }
        }
        Ok(json!({"id": id}))
    }

    pub fn search(&self, q: &str) -> Result<Value, String> {
        let chars = q.chars().count();
        if !(2..=200).contains(&chars) { return Err("query length must be 2..=200".into()); }
        let db = self.db.lock().expect("db");
        let mut stmt = db.prepare("SELECT id,thread_id,content,created_at FROM messages").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, String>(3)?))
        }).map_err(|e| e.to_string())?;
        let mut loaded = Vec::new();
        for row in rows { loaded.push(row.map_err(|e| e.to_string())?); }
        drop(stmt);
        drop(db);
        let mut hits = Vec::new();
        for (id, thread, content, at) in loaded.into_iter().take(200) {
            let offsets = t3bridge::thread_offsets(&content, q)?;
            if offsets.is_empty() { continue; }
            let score = t3bridge::rank(&content, q)?.unwrap_or(0.0);
            let snippet: String = content.chars().take(240).collect();
            hits.push(json!({"message_id": id, "thread_id": thread, "score": score, "offsets": offsets, "snippet": snippet, "created_at": at}));
        }
        Ok(json!({"query": q, "engine": "t3 shared/threadSearch.ts + searchRanking.ts", "hits": hits}))
    }

    pub fn checkpoint(&self, thread: &str) -> Result<Value, String> {
        let exported = self.export_thread(thread)?;
        let id = random_id("ck");
        self.db.lock().expect("db").execute(
            "INSERT INTO checkpoints(id,thread_id,payload,created_at) VALUES(?1,?2,?3,?4)",
            params![id, thread, exported.to_string(), util::now_rfc3339()],
        ).map_err(|e| e.to_string())?;
        Ok(json!({"id": id}))
    }

    pub fn restore_checkpoint(&self, id: &str) -> Result<Value, String> {
        let db = self.db.lock().expect("db");
        let (thread, payload): (String, String) = db.query_row(
            "SELECT thread_id,payload FROM checkpoints WHERE id=?1",
            params![id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).map_err(|_| "checkpoint not found".to_string())?;
        drop(db);
        let value: Value = serde_json::from_str(&payload).map_err(|e| e.to_string())?;
        self.db.lock().expect("db").execute("DELETE FROM messages WHERE thread_id=?1", params![thread]).map_err(|e| e.to_string())?;
        if let Some(messages) = value.get("messages").and_then(|v| v.as_array()) {
            for msg in messages {
                self.message(&thread, msg["role"].as_str().unwrap_or("user"), msg["content"].as_str().unwrap_or(""))?;
            }
        }
        Ok(json!({"restored": id, "thread": thread}))
    }

    pub fn retention(&self, days: i64) -> Result<Value, String> {
        if days < 0 { return Err("retention days must be >= 0".into()); }
        let cutoff = (chrono::Utc::now() - chrono::Duration::days(days)).format("%Y-%m-%dT%H:%M:%SZ").to_string();
        let n = self.db.lock().expect("db").execute("DELETE FROM messages WHERE created_at < ?1", params![cutoff]).map_err(|e| e.to_string())?;
        self.audit("retention", &format!("{n}"));
        Ok(json!({"deleted_messages": n, "older_than": cutoff}))
    }

    pub fn guest(&self, thread: &str) -> Result<Value, String> {
        let token = random_id("guest");
        let exp = (chrono::Utc::now() + chrono::Duration::hours(1)).format("%Y-%m-%dT%H:%M:%SZ").to_string();
        self.db.lock().expect("db").execute(
            "INSERT INTO guests(token,thread_id,exp) VALUES(?1,?2,?3)",
            params![token, thread, exp],
        ).map_err(|e| e.to_string())?;
        Ok(json!({"token": token, "exp": exp, "scope": "loopback"}))
    }

    pub fn guest_read(&self, token: &str) -> Result<Value, String> {
        let db = self.db.lock().expect("db");
        let (thread, exp): (String, String) = db.query_row(
            "SELECT thread_id,exp FROM guests WHERE token=?1",
            params![token],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).map_err(|_| "guest link not found".to_string())?;
        drop(db);
        if exp < util::now_rfc3339() { return Err("guest link expired".into()); }
        self.export_thread(&thread)
    }

    pub fn connector_save(&self, body: &Value) -> Result<Value, String> {
        if body.get("secret").is_some() || body.get("token").is_some() || body.get("password").is_some() {
            return Err("do not send secret values; send secret_ref only".into());
        }
        let id = body.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(|| random_id("con"));
        let mut stored = body.clone();
        stored["id"] = json!(id);
        stored["status"] = json!(body.get("status").and_then(|v| v.as_str()).unwrap_or("configured_unverified"));
        self.db.lock().expect("db").execute(
            "INSERT INTO connectors(id,payload) VALUES(?1,?2) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
            params![id, stored.to_string()],
        ).map_err(|e| e.to_string())?;
        Ok(json!({"id": id, "status": stored["status"], "live": false}))
    }

    pub fn connectors(&self) -> Result<Value, String> {
        Ok(json!({"connectors": self.connector_rows()?}))
    }

    fn connector_rows(&self) -> Result<Vec<Value>, String> {
        let db = self.db.lock().expect("db");
        let mut stmt = db.prepare("SELECT payload FROM connectors").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for row in rows {
            let text = row.map_err(|e| e.to_string())?;
            if let Ok(mut v) = serde_json::from_str::<Value>(&text) {
                if let Some(obj) = v.as_object_mut() {
                    obj.insert("secret_ref_masked".into(), json!(mask_secret(obj.get("secret_ref").and_then(|s| s.as_str()).unwrap_or(""))));
                }
                out.push(v);
            }
        }
        Ok(out)
    }

    pub fn connector_sync(&self, id: &str, body: &Value) -> Result<Value, String> {
        let rows = self.connector_rows()?;
        let connector = rows.into_iter().find(|c| c["id"] == id).ok_or("connector not found")?;
        let kind = connector.get("kind").and_then(|v| v.as_str()).unwrap_or("");
        let transport = body.get("transport").and_then(|v| v.as_str()).unwrap_or("inproc");
        let mapping = connector.get("mapping").cloned().unwrap_or(json!({"mapping": []}));
        let records = body.get("records").and_then(|v| v.as_array()).cloned().unwrap_or_default();
        let mut applied = 0;
        let mut duplicates = 0;
        let db = self.db.lock().expect("db");
        for rec in records {
            let doc = rec.get("record_id").and_then(|v| v.as_str()).or_else(|| rec.get("doc_id").and_then(|v| v.as_str())).unwrap_or("");
            let ver = rec.get("version").and_then(|v| v.as_str()).unwrap_or("1");
            if doc.is_empty() { return Err("record_id required".into()); }
            let checked = connectors::validate_record(&mapping, &rec)?;
            let key = format!("sync:{id}:{doc}:{ver}");
            if store::kv_get(&db, &key)?.is_some() {
                duplicates += 1;
                let detail = redact(&format!("duplicate {doc} {ver}"), &[]);
                db.execute("INSERT INTO sync_log(id,connector_id,ok,detail,created_at) VALUES(?1,?2,1,?3,?4)", params![random_id("log"), id, detail, util::now_rfc3339()]).map_err(|e| e.to_string())?;
                continue;
            }
            if transport == "live" {
                let built = preview_request(kind, &connector, &checked)?;
                drop(db);
                let result = connectors::exchange(&built);
                let db = self.db.lock().expect("db");
                let err = result.err().unwrap_or_else(|| "unexpected live success".into());
                let detail = redact(&err, &[]);
                db.execute("INSERT INTO sync_log(id,connector_id,ok,detail,created_at) VALUES(?1,?2,0,?3,?4)", params![random_id("log"), id, detail, util::now_rfc3339()]).map_err(|e| e.to_string())?;
                return Err(err);
            }
            store::kv_put(&db, &key, "1")?;
            applied += 1;
            db.execute(
                "INSERT INTO sync_log(id,connector_id,ok,detail,created_at) VALUES(?1,?2,1,?3,?4)",
                params![random_id("log"), id, format!("inproc {doc} {ver}"), util::now_rfc3339()],
            ).map_err(|e| e.to_string())?;
        }
        Ok(json!({"applied": applied, "duplicates": duplicates, "transport": transport, "live_called": false}))
    }

    pub fn connector_disconnect(&self, id: &str) -> Result<Value, String> {
        let rows = self.connector_rows()?;
        let mut connector = rows.into_iter().find(|c| c["id"] == id).ok_or("connector not found")?;
        if let Some(obj) = connector.as_object_mut() {
            obj.insert("secret_ref".into(), json!(""));
            obj.insert("team".into(), json!(""));
            obj.insert("oauth_issuer".into(), json!(""));
            obj.insert("status".into(), json!("disconnected"));
            obj.remove("session");
        }
        self.db.lock().expect("db").execute("UPDATE connectors SET payload=?1 WHERE id=?2", params![connector.to_string(), id]).map_err(|e| e.to_string())?;
        self.audit("disconnect", id);
        Ok(connector)
    }

    pub fn connector_export(&self, id: &str) -> Result<Value, String> {
        let rows = self.connector_rows()?;
        let mut connector = rows.into_iter().find(|c| c["id"] == id).ok_or("connector not found")?;
        if let Some(obj) = connector.as_object_mut() {
            obj.insert("secret_ref".into(), json!("«redacted»"));
            obj.remove("session");
        }
        Ok(connector)
    }

    pub fn connector_logs(&self, id: &str) -> Result<Value, String> {
        let db = self.db.lock().expect("db");
        let mut stmt = db.prepare("SELECT ok,detail,created_at FROM sync_log WHERE connector_id=?1 ORDER BY created_at").map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![id], |row| {
            Ok(json!({"ok": row.get::<_, i64>(0)? == 1, "detail": row.get::<_, String>(1)?, "created_at": row.get::<_, String>(2)?}))
        }).map_err(|e| e.to_string())?;
        let mut logs = Vec::new();
        for row in rows { logs.push(row.map_err(|e| e.to_string())?); }
        Ok(json!({"logs": logs}))
    }

    pub fn inventory(&self) -> Value { inventory::sample() }

    pub fn detectors(&self) -> Result<Value, String> {
        let mut rows = inventory::builtin_detectors();
        let db = self.db.lock().expect("db");
        let mut stmt = db.prepare("SELECT payload FROM detectors").map_err(|e| e.to_string())?;
        let extra = stmt.query_map([], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())?;
        for row in extra {
            if let Ok(v) = serde_json::from_str::<Value>(&row.map_err(|e| e.to_string())?) {
                rows.push(v);
            }
        }
        Ok(json!({"detectors": rows, "states": ["installed", "authorized", "operable"]}))
    }

    pub fn detector_save(&self, body: &Value) -> Result<Value, String> {
        let id = body.get("id").and_then(|v| v.as_str()).ok_or("id")?;
        if body.get("shell").is_some() { return Err("shell detectors are rejected".into()); }
        self.db.lock().expect("db").execute(
            "INSERT INTO detectors(id,payload) VALUES(?1,?2) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
            params![id, body.to_string()],
        ).map_err(|e| e.to_string())?;
        Ok(json!({"id": id, "autorun": false}))
    }

    pub fn detector_run(&self, id: &str, confirm: &str) -> Result<Value, String> {
        if confirm != "CONFIRM" { return Err("confirmation required".into()); }
        if id == "hermes" { return Err("hermes version command is not verified and was not started".into()); }
        let builtins = inventory::builtin_detectors();
        if let Some(row) = builtins.into_iter().find(|d| d["id"] == id) {
            if row["version_command_trusted"] != true { return Err("version command is not trusted".into()); }
            let argv0 = row["argv0"].as_str().unwrap_or("");
            let output = inventory::run_version(argv0)?;
            return Ok(json!({"id": id, "installed": true, "operable": true, "authorized": false, "output": output}));
        }
        Err("custom detectors are stored but this build only runs trusted builtin version commands".into())
    }

    pub fn ocr_bytes(&self, bytes: &[u8]) -> Result<Value, String> {
        let text = pdf::extract_text_layer(bytes);
        Ok(json!({
            "source": text.source,
            "text": text.text,
            "has_text_layer": text.has_text_layer,
            "needs_ocr": !text.has_text_layer,
            "ocr_untrusted": true,
            "paddle": paddle_probe()?,
        }))
    }

    pub fn ocr_sample(&self) -> Result<Value, String> {
        let bytes = pdf::digital_pdf("USD 123.45");
        let mut found = self.ocr_bytes(&bytes)?;
        found["synthetic"] = json!(true);
        found["label"] = json!("合成數位 PDF，不是單據");
        Ok(found)
    }

    pub fn ocr_catalog(&self) -> Value {
        let runtime = paddle_probe().unwrap_or(json!({"status": "probe_failed"}));
        json!({
            "downloadable": false,
            "tokens_json": false,
            "runtime": runtime,
            "api_called": false,
            "models": [{
                "id": "PP-OCRv5_mobile",
                "origin": "https://github.com/PaddlePaddle/PaddleOCR",
                "engine_license": "Apache-2.0",
                "model_license": "not pinned in this build; read the official artifact before download",
                "version": "PP-OCRv5",
                "size_bytes": null,
                "sha256": null,
                "downloadable": false,
                "reason": "checksum is not verified here, so download is refused"
            }]
        })
    }

    pub fn ocr_download(&self) -> Result<Value, String> {
        Err("checksum_not_pinned; download refused".into())
    }

    pub fn ocr_api(&self, body: &Value) -> Result<Value, String> {
        let opt_in = body.get("opt_in").and_then(|v| v.as_bool()).unwrap_or(false);
        if !opt_in { return Ok(json!({"opt_in": false, "stored": false, "called": false})); }
        if body.get("password").is_some() { return Err("do not send a password".into()); }
        let key = body.get("key").and_then(|v| v.as_str()).unwrap_or("");
        let secret_ref = body.get("secret_ref").and_then(|v| v.as_str()).unwrap_or("");
        let endpoint = body.get("endpoint").and_then(|v| v.as_str()).unwrap_or("");
        let loopback = endpoint.starts_with("http://127.0.0.1:") || endpoint.starts_with("http://localhost:");
        if !endpoint.starts_with("https://") && !loopback {
            return Err("api endpoint must be https, or an explicit loopback http url".into());
        }
        let masked = mask_secret(key);
        store::kv_put(&self.db.lock().expect("db"), "ocr_api", &json!({
            "endpoint": endpoint, "key": masked, "secret_ref": secret_ref, "opt_in": true
        }).to_string())?;
        self.audit("ocr_api", "masked");
        Ok(json!({"opt_in": true, "key": masked, "secret_ref": secret_ref, "called": false, "inference": "not_run"}))
    }

    pub fn ocr_remove(&self) -> Result<Value, String> {
        let dir = self.cfg.lock().expect("cfg").data_dir.join("ocr-cache");
        let _ = fs::remove_dir_all(&dir);
        store::kv_put(&self.db.lock().expect("db"), "ocr_api", "{}")?;
        Ok(json!({"removed": true}))
    }

    pub fn decide(&self, body: &Value) -> Result<Value, String> {
        let rows = body.get("evidence").and_then(|v| v.as_array()).ok_or("evidence array required")?;
        let evidence = rows.iter().map(|row| Evidence {
            id: row.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            kind: row.get("kind").and_then(|v| v.as_str()).unwrap_or("file").to_string(),
            quote: row.get("quote").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            confidence: row.get("confidence").and_then(|v| v.as_f64()),
        }).collect::<Vec<_>>();
        let decision = decisions::decide(&evidence)?;
        self.db.lock().expect("db").execute(
            "INSERT INTO decisions(id,payload,created_at) VALUES(?1,?2,?3)",
            params![random_id("dec"), decision.to_string(), util::now_rfc3339()],
        ).map_err(|e| e.to_string())?;
        Ok(decision)
    }

    pub fn pay_catalog(&self) -> Value { pay::catalog() }

    pub fn pay_order(&self, sku: &str) -> Result<Value, String> {
        let id = random_id("ord");
        let order = pay::new_order(&id, sku)?;
        self.store_order(&order)?;
        Ok(json!({"id": id, "status": "Pending", "sandbox": true, "amount_cents": order.amount_cents, "currency": order.currency}))
    }

    pub fn pay_settle(&self, id: &str) -> Result<Value, String> {
        let mut order = self.load_order(id)?;
        let secret = self.mem.lock().expect("mem").pay_secret.clone();
        let event_id = random_id("evt");
        let amount = order.amount_cents;
        let currency = order.currency.clone();
        let sig = pay::sign(&secret, &event_id, id, amount, &currency, "paid");
        let status = pay::apply_event(&mut order, &PayEvent {
            event_id, order_id: id.to_string(), amount_cents: amount,
            currency, status: "paid".into(), sig,
        }, &secret)?;
        self.store_order(&order)?;
        Ok(json!({"status": status, "sandbox": true}))
    }

    pub fn pay_event(&self, event: PayEvent) -> Result<Value, String> {
        let mut order = self.load_order(&event.order_id)?;
        let secret = self.mem.lock().expect("mem").pay_secret.clone();
        let status = pay::apply_event(&mut order, &event, &secret)?;
        self.store_order(&order)?;
        Ok(json!({"status": status}))
    }

    pub fn pay_deliver(&self, id: &str, fail_next: bool) -> Result<Value, String> {
        let mut order = self.load_order(id)?;
        if fail_next { order.fail_next_delivery = true; }
        let status = pay::deliver(&mut order);
        self.store_order(&order)?;
        let status = status?;
        Ok(json!({"status": status, "entitlement_qty": order.entitlement_qty}))
    }

    pub fn pay_refund(&self, id: &str, amount: i64) -> Result<Value, String> {
        let mut order = self.load_order(id)?;
        let status = pay::refund(&mut order, amount)?;
        self.store_order(&order)?;
        Ok(json!({"status": status, "entitlement_qty": order.entitlement_qty, "refunded_cents": order.refunded_cents}))
    }

    pub fn pay_reconcile(&self) -> Value {
        let orders = self.mem.lock().expect("mem").orders.clone();
        pay::reconcile(&orders)
    }

    pub fn pay_production(&self) -> Value { pay::production_blocked() }

    fn load_order(&self, id: &str) -> Result<pay::Order, String> {
        self.mem.lock().expect("mem").orders.get(id).cloned().ok_or_else(|| "order not found".into())
    }

    fn store_order(&self, order: &pay::Order) -> Result<(), String> {
        let payload = serde_json::to_string(order).map_err(|e| e.to_string())?;
        self.db.lock().expect("db").execute(
            "INSERT INTO orders(id,payload) VALUES(?1,?2) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
            params![order.id, payload],
        ).map_err(|e| e.to_string())?;
        self.mem.lock().expect("mem").orders.insert(order.id.clone(), order.clone());
        Ok(())
    }

    pub fn providers(&self) -> Value {
        let names = ["claude", "codex", "agent", "grok", "opencode", "fx", "kiro", "pi", "muse"];
        let found: Vec<Value> = names.iter().map(|n| json!({"argv0": n, "installed": which(n).is_some(), "path": which(n), "invoked": false})).collect();
        json!({"providers": found, "antigravity": "no_cli_in_this_build", "live_calls": 0})
    }

    pub fn provider_run(&self, argv: &[String], confirm: &str) -> Result<Value, String> {
        if confirm != "CONFIRM" { return Err("confirmation required".into()); }
        self.ensure_write()?;
        run_argv(argv, &self.cfg.lock().expect("cfg").data_dir, Duration::from_secs(3))
    }

    pub fn terminal(&self, argv: &[String], cwd: &str, confirm: &str) -> Result<Value, String> {
        if confirm != "CONFIRM" { return Err("confirmation required".into()); }
        let mem = self.mem.lock().expect("mem");
        if !mem.terminal_allowed { return Err("forbidden by admin policy".into()); }
        if mem.permission == "read-only" { return Err("forbidden by permission mode read-only".into()); }
        let root = mem.root.clone().ok_or("select a root first")?;
        drop(mem);
        let cwd_path = if cwd == "." || cwd.is_empty() {
            root.clone()
        } else {
            paths::resolve_inside(&root, cwd)?
        };
        if argv.iter().any(|a| a.contains('\n') || a.contains(';') || a.contains('|')) {
            return Err("shell metacharacters rejected".into());
        }
        let mut cmd = Command::new(&argv[0]);
        cmd.args(&argv[1..]).current_dir(&cwd_path).stdout(Stdio::piped()).stderr(Stdio::piped());
        let out = cmd.output().map_err(|e| e.to_string())?;
        Ok(json!({
            "code": out.status.code(),
            "stdout": String::from_utf8_lossy(&out.stdout).chars().take(4000).collect::<String>(),
            "stderr": String::from_utf8_lossy(&out.stderr).chars().take(1000).collect::<String>(),
            "shell": false,
        }))
    }

    pub fn set_policy(&self, terminal: bool) -> Value {
        self.mem.lock().expect("mem").terminal_allowed = terminal;
        json!({"terminal": terminal})
    }

    pub fn git_status(&self, repo: &Path) -> Result<Value, String> {
        let out = Command::new("git").arg("-C").arg(repo).arg("status").arg("--short").output().map_err(|e| e.to_string())?;
        Ok(json!({"status": String::from_utf8_lossy(&out.stdout).to_string(), "code": out.status.code()}))
    }

    pub fn git_worktree(&self, repo: &Path, name: &str) -> Result<Value, String> {
        if name.contains('/') || name.contains("..") { return Err("bad worktree name".into()); }
        let dest = self.cfg.lock().expect("cfg").data_dir.join("worktrees").join(name);
        fs::create_dir_all(dest.parent().unwrap()).map_err(|e| e.to_string())?;
        let add = Command::new("git").arg("-C").arg(repo).args(["worktree", "add", "--detach"]).arg(&dest).output().map_err(|e| e.to_string())?;
        if !add.status.success() {
            return Err(format!("worktree add failed: {}", String::from_utf8_lossy(&add.stderr)));
        }
        let list = Command::new("git").arg("-C").arg(repo).args(["worktree", "list", "--porcelain"]).output().map_err(|e| e.to_string())?;
        let remove = Command::new("git").arg("-C").arg(repo).args(["worktree", "remove", "--force"]).arg(&dest).output().map_err(|e| e.to_string())?;
        Ok(json!({
            "created": dest,
            "list": String::from_utf8_lossy(&list.stdout).to_string(),
            "removed": remove.status.success(),
        }))
    }

    pub fn textgen(&self, files: &[String]) -> Result<Value, String> {
        let draft = format!("ymzz: note {} local path(s)\n\nGenerated by Claude.\n", files.len());
        let cleaned = t3bridge::clean_commit_message(&draft)?;
        Ok(json!({"engine": "local_template_plus_t3_mergeMessage", "model": false, "message": cleaned}))
    }

    pub fn task_save(&self, body: &Value) -> Result<Value, String> {
        let id = body.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(|| random_id("task"));
        self.db.lock().expect("db").execute(
            "INSERT INTO tasks(id,payload) VALUES(?1,?2) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
            params![id, body.to_string()],
        ).map_err(|e| e.to_string())?;
        Ok(json!({"id": id}))
    }

    pub fn task_tick(&self) -> Result<Value, String> {
        let db = self.db.lock().expect("db");
        let mut stmt = db.prepare("SELECT id,payload FROM tasks").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))).map_err(|e| e.to_string())?;
        let mut n = 0;
        let mut ids = Vec::new();
        for row in rows {
            let (id, payload) = row.map_err(|e| e.to_string())?;
            let v: Value = serde_json::from_str(&payload).unwrap_or(json!({}));
            if v.get("kind").and_then(|k| k.as_str()) == Some("note") {
                ids.push(id);
                n += 1;
            }
        }
        drop(stmt);
        drop(db);
        for id in ids { self.audit("task", &id); }
        Ok(json!({"ran": n, "outbound": false}))
    }

    pub fn hook(&self, id: &str, secret: &str, event_id: &str) -> Result<Value, String> {
        let db = self.db.lock().expect("db");
        let payload: String = db.query_row("SELECT payload FROM tasks WHERE id=?1", params![id], |r| r.get(0)).map_err(|_| "hook not found".to_string())?;
        let v: Value = serde_json::from_str(&payload).map_err(|e| e.to_string())?;
        if v.get("secret").and_then(|s| s.as_str()) != Some(secret) { return Err("bad hook secret".into()); }
        let key = format!("hook:{id}:{event_id}");
        if store::kv_get(&db, &key)?.is_some() { return Ok(json!({"duplicate": true})); }
        store::kv_put(&db, &key, "1")?;
        drop(db);
        self.audit("hook", event_id);
        Ok(json!({"accepted": true, "duplicate": false}))
    }

    pub fn activity(&self) -> Result<Value, String> {
        let db = self.db.lock().expect("db");
        let mut stmt = db.prepare("SELECT action,detail,created_at FROM audit ORDER BY created_at DESC LIMIT 100").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| Ok(json!({"action": row.get::<_, String>(0)?, "detail": row.get::<_, String>(1)?, "created_at": row.get::<_, String>(2)?}))).map_err(|e| e.to_string())?;
        let mut items = Vec::new();
        for row in rows { items.push(row.map_err(|e| e.to_string())?); }
        Ok(json!({"events": items}))
    }

    pub fn v020(&self) -> Result<Value, String> {
        let repo = self.cfg.lock().expect("cfg").repo_root.clone();
        let cfg_path = repo.join("sync.config.json");
        let cfg: Value = fs::read_to_string(&cfg_path).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or(json!({}));
        let mut notes = Vec::new();
        if let Ok(rd) = fs::read_dir(repo.join("notion")) {
            for year in rd.flatten() {
                if year.path().is_dir() {
                    if let Ok(files) = fs::read_dir(year.path()) {
                        for f in files.flatten() {
                            if f.path().extension().and_then(|e| e.to_str()) == Some("md") {
                                notes.push(f.path().strip_prefix(&repo).unwrap_or(f.path().as_path()).to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
        let started = fs::read_to_string(repo.join(".ymzz/started")).ok().map(|s| s.trim().to_string());
        let last = fs::read_to_string(repo.join(".ymzz/last-run")).ok().map(|s| s.trim().to_string());
        Ok(json!({
            "package": "node automation remains the writer",
            "timezone": cfg.get("timezone").cloned().unwrap_or(json!("")),
            "remind_time": cfg.get("remind_time").cloned().unwrap_or(json!("")),
            "sinks": cfg.get("sinks").cloned().unwrap_or(json!([])),
            "markdown_files": notes,
            "chapter_started": started,
            "last_run": last,
            "max_days": 600,
            "hosted_inbox": false,
        }))
    }

    pub fn dashboard(&self) -> Result<Value, String> {
        let threads = self.threads_list(false)?;
        let v020 = self.v020()?;
        let mem = self.mem.lock().expect("mem");
        Ok(json!({
            "analogy": "local report to the owner",
            "files_indexed": mem.records.len(),
            "source": mem.source,
            "snapshot": mem.snapshot.as_ref().map(|s| s.ids.len()),
            "threads": threads["threads"].as_array().map(|a| a.len()).unwrap_or(0),
            "orders": mem.orders.len(),
            "telemetry": mem.telemetry,
            "v020": v020,
            "not": ["accounting firm software", "OpenViking", "a hosted mailbox"],
        }))
    }

    pub fn prompt_link(url: &str) -> Result<String, String> {
        let rest = url.strip_prefix("ymzz://thread/").ok_or("not an ymzz thread link")?;
        if rest.is_empty() || rest.contains('/') || rest.contains('?') { return Err("bad thread link".into()); }
        Ok(rest.to_string())
    }

    pub fn telemetry_upload(&self) -> Result<Value, String> {
        let _ = self.mem.lock().expect("mem").telemetry;
        Err("telemetry is off; no sender is compiled".into())
    }
}

fn draft_json(spec: &QuerySpec) -> Value {
    json!({
        "start": spec.start,
        "end": spec.end,
        "drive": spec.drive,
        "ext": spec.ext,
        "more_enabled": spec.more_enabled,
        "name_contains": spec.name_contains,
    })
}

fn empty_to_none(v: Option<&str>) -> Option<String> {
    v.filter(|s| !s.is_empty()).map(|s| s.to_string())
}

fn load_or_create(path: &Path) -> Result<String, String> {
    if let Ok(text) = fs::read_to_string(path) {
        let trimmed = text.trim().to_string();
        if !trimmed.is_empty() { return Ok(trimmed); }
    }
    let value = random_id("tok");
    let mut file = fs::OpenOptions::new().create(true).write(true).truncate(true).mode(0o600).open(path).map_err(|e| e.to_string())?;
    file.write_all(value.as_bytes()).map_err(|e| e.to_string())?;
    Ok(value)
}

fn load_orders(conn: &Connection) -> Result<BTreeMap<String, pay::Order>, String> {
    let mut stmt = conn.prepare("SELECT payload FROM orders").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())?;
    let mut map = BTreeMap::new();
    for row in rows {
        let text = row.map_err(|e| e.to_string())?;
        if let Ok(order) = serde_json::from_str::<pay::Order>(&text) {
            map.insert(order.id.clone(), order);
        }
    }
    Ok(map)
}

fn preview_request(kind: &str, connector: &Value, record: &Value) -> Result<BuiltRequest, String> {
    let token = "secret-from-env-not-logged";
    match kind {
        "notion" => Ok(connectors::notion_upsert(token, connector.get("resource_id").and_then(|v| v.as_str()).unwrap_or("db"), record)),
        "google_sheets" => Ok(connectors::sheets_append(token, connector.get("resource_id").and_then(|v| v.as_str()).unwrap_or("sheet"), "A1", &json!([[record]]))),
        "google_docs" => Ok(connectors::docs_batch(token, connector.get("resource_id").and_then(|v| v.as_str()).unwrap_or("doc"), &record.to_string())),
        "github" => Ok(connectors::github_comment(token, connector.get("resource_id").and_then(|v| v.as_str()).unwrap_or("owner/repo"), 1, "synthetic")),
        "feishu" => Ok(connectors::feishu_or_lark(false, token, "app", "tbl", record)),
        "lark" => Ok(connectors::feishu_or_lark(true, token, "app", "tbl", record)),
        "oomol_hosted" => Ok(connectors::oomol_hosted(token, connector.get("team").and_then(|v| v.as_str()).unwrap_or("team"), record)),
        other => Err(format!("unsupported connector {other}")),
    }
}

fn paddle_probe() -> Result<Value, String> {
    let script = util::repo_root().join("app/ocr/paddle_worker.py");
    let out = Command::new("python3").arg(&script).output().map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&out.stdout);
    let v: Value = serde_json::from_str(text.trim()).unwrap_or(json!({"status": "probe_failed", "raw": text.to_string()}));
    Ok(v)
}

fn run_argv(argv: &[String], cwd: &Path, timeout: Duration) -> Result<Value, String> {
    if argv.is_empty() { return Err("empty argv".into()); }
    if argv.iter().any(|a| a.contains('|') || a.contains(';') || a.contains('\n')) {
        return Err("shell metacharacters rejected".into());
    }
    let mut child = Command::new(&argv[0]).args(&argv[1..]).current_dir(cwd).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().map_err(|e| e.to_string())?;
    let start = Instant::now();
    loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => {
                let mut stdout = String::new();
                let mut stderr = String::new();
                if let Some(mut out) = child.stdout.take() { use std::io::Read; out.read_to_string(&mut stdout).ok(); }
                if let Some(mut err) = child.stderr.take() { use std::io::Read; err.read_to_string(&mut stderr).ok(); }
                return Ok(json!({"code": status.code(), "stdout": stdout, "stderr": stderr, "shell": false}));
            }
            None if start.elapsed() > timeout => {
                let _ = child.kill();
                return Err("timed out".into());
            }
            None => std::thread::sleep(Duration::from_millis(20)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dates::{parse_ymd, preset_days};
    use std::os::unix::fs::symlink;

    fn app() -> (App, PathBuf) {
        let dir = std::env::temp_dir().join(format!("ymzz-engine-{}-{}", std::process::id(), random_id("d")));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let app = App::open(&dir, &util::repo_root()).unwrap();
        (app, dir)
    }

    #[test]
    fn panel_query_selects_frozen_snapshot() {
        let (app, dir) = app();
        app.load_synthetic().unwrap();
        let before = app.set_draft(&json!({"today":"2026-11-07","preset":3,"drive":"","ext":""})).unwrap();
        assert_eq!(before["queried"], false);
        assert!(app.snapshot()["snapshot"].is_null() || app.snapshot().get("ids").is_none());
        let q = app.query().unwrap();
        assert_eq!(q["count"], 5);
        let ids = app.select_all(false).unwrap()["ids"].as_array().unwrap().clone();
        app.mem.lock().unwrap().records.push(Rec {
            id: "SYN-FUTURE".into(), drive: "C:".into(), path: "C:/new.py".into(), ext: ".py".into(),
            modified: Some("2026-11-07".into()), readable: true, version: "2".into(), bytes: 1,
            skip_reason: None, escapes: false, kind: "synthetic".into(),
        });
        let again = app.select_all(false).unwrap();
        assert_eq!(again["ids"].as_array().unwrap(), &ids);
        assert!(!again["ids"].to_string().contains("SYN-FUTURE"));
        assert!(again["label"].as_str().unwrap().contains("不含以後新增"));
        app.set_draft(&json!({"today":"2026-11-07","preset":7})).unwrap();
        app.query().unwrap();
        let cmp = app.compare();
        assert_eq!(cmp["formula"], "y = day_count / period_total");
        assert!(cmp["previous"].is_object());
        app.persist_snapshot().unwrap();
        let app2 = App::open(&dir, &util::repo_root()).unwrap();
        assert!(app2.snapshot().get("ids").is_none());
        app2.restore_snapshot().unwrap();
        assert!(app2.snapshot().get("ids").is_some());
        let sem = app.semantic(true);
        assert_eq!(sem["uploaded"], false);
        assert_eq!(sem["status"], "opted_in_no_model");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn scan_skips_secrets_and_symlinks() {
        let (app, dir) = app();
        let root = dir.join("root");
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("note.md"), b"hello synthetic").unwrap();
        fs::write(root.join(".env"), b"SUPER_SECRET_VALUE").unwrap();
        symlink("/etc/passwd", root.join("leak")).unwrap();
        app.set_root(&root.to_string_lossy()).unwrap();
        app.scan("Asia/Seoul").unwrap();
        let recs = app.mem.lock().unwrap().records.clone();
        let env = recs.iter().find(|r| r.path.ends_with(".env")).unwrap();
        assert!(!env.readable);
        assert_eq!(env.skip_reason.as_deref(), Some("secret_name_content_not_read"));
        let link = recs.iter().find(|r| r.path.ends_with("leak")).unwrap();
        assert!(link.escapes || link.skip_reason.as_deref() == Some("symlink_not_followed") || link.skip_reason.as_deref() == Some("symlink_escapes_root"));
        assert!(!link.readable);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn markdown_and_organize() {
        let (app, dir) = app();
        let err = app.write_md("a.md", "x", false).unwrap_err();
        assert!(err.contains("root"));
        let root = dir.join("root");
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("a.md"), b"one").unwrap();
        app.set_root(&root.to_string_lossy()).unwrap();
        assert!(app.write_md("../x.md", "no", false).is_err());
        app.write_md("nested/new.md", "# synthetic\n", false).unwrap();
        assert!(root.join("nested/new.md").is_file());
        assert!(app.write_md("nested/new.md", "again", false).is_err());
        let plan = app.plan_move("a.md", "b.md").unwrap();
        assert_eq!(plan["dry_run"], true);
        app.confirm_move(plan["id"].as_str().unwrap(), "NO").unwrap_err();
        app.confirm_move(plan["id"].as_str().unwrap(), "CONFIRM").unwrap();
        assert!(root.join("b.md").is_file());
        app.undo_move(plan["id"].as_str().unwrap()).unwrap();
        assert!(root.join("a.md").is_file());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn threads_roundtrip_and_search() {
        let (app, dir) = app();
        let id = app.threads_create("合成對話").unwrap()["id"].as_str().unwrap().to_string();
        app.message(&id, "user", "Deploy the Deployment").unwrap();
        app.attach(&id, "note.txt", b"synthetic").unwrap();
        let found = app.search("deploy").unwrap();
        assert_eq!(found["hits"].as_array().unwrap().len(), 1);
        let ck = app.checkpoint(&id).unwrap()["id"].as_str().unwrap().to_string();
        app.message(&id, "user", "later").unwrap();
        app.restore_checkpoint(&ck).unwrap();
        let exported = app.export_thread(&id).unwrap();
        assert_eq!(exported["messages"].as_array().unwrap().len(), 1);
        let guest = app.guest(&id).unwrap();
        assert!(app.guest_read(guest["token"].as_str().unwrap()).is_ok());
        app.archive_thread(&id, true).unwrap();
        assert_eq!(app.threads_list(true).unwrap()["threads"].as_array().unwrap().len(), 1);
        let imported = app.import_thread(&json!({"title":"in","messages":[{"role":"user","content":"keep"}]})).unwrap();
        assert!(imported["id"].is_string());
        app.retention(0).unwrap();
        let html_id = app.threads_create("html").unwrap()["id"].as_str().unwrap().to_string();
        app.message(&html_id, "assistant", "<script>alert(1)</script>").unwrap();
        app.delete_thread(&html_id).unwrap();
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn connector_sync_is_idempotent() {
        let (app, dir) = app();
        let mapping = json!({"mapping":[
            {"logical_field":"title","source_type":"title","required":true},
            {"logical_field":"date","source_type":"date","required":true},
            {"logical_field":"record_id","source_type":"rich_text","required":true}
        ]});
        let id = app.connector_save(&json!({
            "kind":"notion","label":"synthetic","resource_id":"db","secret_ref":"env:NOTION_TOKEN","mapping": mapping,
            "team":"should-clear","oauth_issuer":"https://example.invalid"
        })).unwrap()["id"].as_str().unwrap().to_string();
        assert!(app.connector_save(&json!({"secret":"super-secret-value"})).is_err());
        let rec = json!({"title":"t","date":"2026-11-07","record_id":"SYN-1","version":"1"});
        let first = app.connector_sync(&id, &json!({"transport":"inproc","records":[rec.clone()]})).unwrap();
        assert_eq!(first["applied"], 1);
        let second = app.connector_sync(&id, &json!({"transport":"inproc","records":[rec]})).unwrap();
        assert_eq!(second["duplicates"], 1);
        let logs = app.connector_logs(&id).unwrap().to_string();
        assert!(!logs.contains("super-secret-value"));
        let disconnected = app.connector_disconnect(&id).unwrap();
        assert_eq!(disconnected["status"], "disconnected");
        assert_eq!(disconnected["team"], "");
        assert!(disconnected.get("session").is_none());
        let _guard = crate::connectors::ENV_LOCK.lock().expect("env");
        std::env::remove_var("YMZZ_CONNECTOR_NET");
        let live = app.connector_sync(&id, &json!({"transport":"live","records":[{"title":"t","date":"2026-11-07","record_id":"SYN-2","version":"1"}]})).unwrap_err();
        assert!(live.contains("live_network_disabled") || live.contains("blocked") || live.contains("public"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn provider_fixture_runs() {
        let (app, dir) = app();
        let bin = dir.join("fixture-echo.sh");
        fs::write(&bin, "#!/bin/sh\necho synthetic-ok\n").unwrap();
        let mut perms = fs::metadata(&bin).unwrap().permissions();
        use std::os::unix::fs::PermissionsExt;
        perms.set_mode(0o755);
        fs::set_permissions(&bin, perms).unwrap();
        let ran = app.provider_run(&[bin.to_string_lossy().to_string()], "CONFIRM").unwrap();
        assert!(ran["stdout"].as_str().unwrap().contains("synthetic-ok"));
        assert!(app.provider_run(&[bin.to_string_lossy().to_string()], "no").is_err());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn permission_and_terminal() {
        let (app, dir) = app();
        let root = dir.join("root");
        fs::create_dir_all(&root).unwrap();
        app.set_root(&root.to_string_lossy()).unwrap();
        app.set_permission("read-only").unwrap();
        assert!(app.terminal(&["/bin/echo".into(), "hi".into()], ".", "CONFIRM").is_err());
        app.set_permission("workspace-write").unwrap();
        let out = app.terminal(&["/bin/echo".into(), "synthetic-ok".into()], ".", "CONFIRM").unwrap();
        assert!(out["stdout"].as_str().unwrap().contains("synthetic-ok"));
        app.set_policy(false);
        assert!(app.terminal(&["/bin/echo".into(), "x".into()], ".", "CONFIRM").unwrap_err().contains("policy"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn git_worktree() {
        let (app, dir) = app();
        let repo = dir.join("repo");
        fs::create_dir_all(&repo).unwrap();
        assert!(Command::new("git").arg("-C").arg(&repo).args(["init"]).status().unwrap().success());
        Command::new("git").arg("-C").arg(&repo).args(["config", "user.email", "synthetic@example.com"]).status().unwrap();
        Command::new("git").arg("-C").arg(&repo).args(["config", "user.name", "synthetic"]).status().unwrap();
        fs::write(repo.join("README"), b"synthetic\n").unwrap();
        Command::new("git").arg("-C").arg(&repo).args(["add", "README"]).status().unwrap();
        assert!(Command::new("git").arg("-C").arg(&repo).args(["commit", "-m", "init"]).status().unwrap().success());
        let wt = app.git_worktree(&repo, "slice").unwrap();
        assert_eq!(wt["removed"], true);
        assert!(wt["list"].as_str().unwrap().contains("worktrees"));
        let text = app.textgen(&["README".into()]).unwrap();
        assert!(!text["message"].as_str().unwrap().to_lowercase().contains("generated by claude"));
        assert_eq!(text["model"], false);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn telemetry_stays_off() {
        let (app, dir) = app();
        assert!(app.telemetry_upload().is_err());
        let dash = app.dashboard().unwrap();
        assert_eq!(dash["telemetry"], false);
        assert_eq!(dash["not"][2], "a hosted mailbox");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn prompt_link() {
        assert_eq!(App::prompt_link("ymzz://thread/thr_abc").unwrap(), "thr_abc");
        assert!(App::prompt_link("https://example.com/thr_abc").is_err());
        let _ = parse_ymd("2026-11-07").unwrap();
        let _ = preset_days(3).unwrap();
    }

    #[test]
    fn task_and_hook() {
        let (app, dir) = app();
        app.task_save(&json!({"id":"t1","kind":"note","secret":"hook-secret"})).unwrap();
        assert_eq!(app.task_tick().unwrap()["outbound"], false);
        let ok = app.hook("t1", "hook-secret", "evt").unwrap();
        assert_eq!(ok["duplicate"], false);
        assert_eq!(app.hook("t1", "hook-secret", "evt").unwrap()["duplicate"], true);
        assert!(app.hook("t1", "nope", "evt2").is_err());
        let ocr = app.ocr_bytes(&pdf::digital_pdf("USD 123.45 synthetic")).unwrap();
        assert!(ocr["text"].as_str().unwrap().contains("USD 123.45"));
        let scan = app.ocr_bytes(&pdf::scanned_pdf()).unwrap();
        assert_eq!(scan["needs_ocr"], true);
        assert!(scan["paddle"]["status"].as_str().unwrap().contains("not_bundled") || scan["paddle"]["inference"] == "not_run");
        assert!(app.ocr_download().is_err());
        let decision = app.decide(&json!({"evidence":[{"id":"e","kind":"ocr","quote":"USD 123.45","confidence":0.2}]})).unwrap();
        assert_eq!(decision["auto_apply"], false);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn payments_roundtrip() {
        let (app, dir) = app();
        let id = app.pay_order("connector-automation-sandbox").unwrap()["id"].as_str().unwrap().to_string();
        app.pay_settle(&id).unwrap();
        assert!(app.pay_deliver(&id, true).is_err());
        assert_eq!(app.pay_deliver(&id, false).unwrap()["entitlement_qty"], 1);
        assert_eq!(app.pay_refund(&id, 40).unwrap()["entitlement_qty"], 1);
        assert_eq!(app.pay_production()["error"], "blocked_owner_input");
        let _ = fs::remove_dir_all(&dir);
    }
}
