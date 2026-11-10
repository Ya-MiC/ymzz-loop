use crate::engine::App;
use serde_json::{json, Value};

pub fn handle(app: &App, line: &str) -> Value {
    let req: Value = match serde_json::from_str(line) {
        Ok(v) => v,
        Err(e) => return rpc_err(Value::Null, -32700, &e.to_string()),
    };
    let id = req.get("id").cloned().unwrap_or(Value::Null);
    let method = req.get("method").and_then(|m| m.as_str()).unwrap_or("");
    let params = req.get("params").cloned().unwrap_or(json!({}));
    match method {
        "initialize" => rpc_ok(id, json!({
            "protocolVersion": "2025-06-18",
            "serverInfo": {"name": "ymzz-vibe", "version": env!("CARGO_PKG_VERSION")},
            "capabilities": {"tools": {}}
        })),
        "tools/list" => rpc_ok(id, json!({"tools": [
            {"name": "search_files", "description": "Metadata search after an explicit query. Two default filters only."},
            {"name": "system_info", "description": "Read-only inventory. Missing values stay unknown."},
            {"name": "plan_organize", "description": "Dry-run a move inside the selected root."}
        ]})),
        "tools/call" => {
            let name = params.get("name").and_then(|n| n.as_str()).unwrap_or("");
            let args = params.get("arguments").cloned().unwrap_or(json!({}));
            match call_tool(app, name, &args) {
                Ok(v) => rpc_ok(id, json!({"content": [{"type": "text", "text": v.to_string()}], "isError": false})),
                Err(e) => rpc_ok(id, json!({"content": [{"type": "text", "text": e}], "isError": true})),
            }
        }
        _ => rpc_err(id, -32601, "method not found"),
    }
}

fn call_tool(app: &App, name: &str, args: &Value) -> Result<Value, String> {
    match name {
        "search_files" => {
            if args.get("query_clicked").and_then(|v| v.as_bool()) != Some(true) {
                return Err("explicit query flag required; filter edits do not search".into());
            }
            app.query()
        }
        "system_info" => Ok(app.inventory()),
        "plan_organize" => {
            let from = args.get("from").and_then(|v| v.as_str()).unwrap_or("");
            let to = args.get("to").and_then(|v| v.as_str()).unwrap_or("");
            app.plan_move(from, to)
        }
        _ => Err("unknown tool".into()),
    }
}

fn rpc_ok(id: Value, result: Value) -> Value {
    json!({"jsonrpc": "2.0", "id": id, "result": result})
}

fn rpc_err(id: Value, code: i32, message: &str) -> Value {
    json!({"jsonrpc": "2.0", "id": id, "error": {"code": code, "message": message}})
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::util;

    #[test]
    fn search_files_tool() {
        let dir = std::env::temp_dir().join(format!("ymzz-mcp-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let app = App::open(&dir, &util::repo_root()).unwrap();
        app.load_synthetic().unwrap();
        app.set_draft(&serde_json::json!({"today":"2026-11-07","preset":3})).unwrap();
        let blocked = handle(&app, r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_files","arguments":{}}}"#);
        assert_eq!(blocked["result"]["isError"], true);
        let ok = handle(&app, r#"{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_files","arguments":{"query_clicked":true}}}"#);
        assert_eq!(ok["result"]["isError"], false);
        let info = handle(&app, r#"{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"system_info","arguments":{}}}"#);
        assert!(info["result"]["content"][0]["text"].as_str().unwrap().contains("invented"));
        let _ = std::fs::remove_dir_all(&dir);
    }
}
