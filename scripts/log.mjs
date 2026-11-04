// Appends ONE dated entry to the 「同步紀錄 Sync Log」 page. Only appends; never edits/deletes existing blocks.
import fs from "node:fs"; import { Client } from "@notionhq/client";
const cfg = JSON.parse(fs.readFileSync("sync.config.json", "utf8"));
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const TITLE = "同步紀錄 Sync Log";
let logId = cfg.notion_log_page_id;
if (!logId) { // find or create under first source page (adds a new child page; existing content untouched)
  const parent = cfg.parent_page_id; let cursor;
  do { const r = await notion.blocks.children.list({ block_id: parent, start_cursor: cursor });
    const hit = r.results.find(b => b.type === "child_page" && b.child_page.title === TITLE); if (hit) logId = hit.id;
    cursor = !logId && r.has_more ? r.next_cursor : undefined; } while (cursor);
  if (!logId) logId = (await notion.pages.create({ parent: { page_id: parent }, properties: { title: { title: [{ text: { content: TITLE } }] } } })).id;
  console.log(`log page: ${logId} (put into notion_log_page_id)`);
}
const lines = fs.existsSync("/tmp/changes.txt") ? fs.readFileSync("/tmp/changes.txt", "utf8").trim().split("\n").filter(Boolean) : [];
const added = lines.filter(l => l.startsWith("A")).map(l => l.split("\t").pop());
const modified = lines.filter(l => /^[MR]/.test(l)).map(l => l.split("\t").pop());
const removed = lines.filter(l => l.startsWith("D")).map(l => l.split("\t").pop());
const stats = fs.existsSync("/tmp/sync-stats.json") ? JSON.parse(fs.readFileSync("/tmp/sync-stats.json", "utf8")) : { sheetCounts: {} };
const now = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(new Date());
const short = a => a.length ? a.slice(0, 15).map(p => p.replace(/^notion\//, "")).join("、") + (a.length > 15 ? ` …(+${a.length - 15})` : "") : "—";
const t = s => ({ type: "text", text: { content: String(s).slice(0, 1900) } });
const bullet = s => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [t(s)] } });
const sheet = Object.entries(stats.sheetCounts).map(([k, v]) => `${k}: ${v}`).join("、") || (stats.sheet ? "—" : "未設定 not set");
const children = [
  { object: "block", type: "heading_3", heading_3: { rich_text: [t(`${now} 首爾時間 (UTC+9)`)] } },
  bullet(`新增 Added (${added.length}): ${short(added)}`),
  bullet(`修改 Modified (${modified.length}): ${short(modified)}`),
  bullet(`移除 Removed (${removed.length}): ${short(removed)}`),
  bullet(`表格列數 Sheet rows: ${sheet}`),
  { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ type: "text", text: { content: lines.length ? "Commit" : "無變更 No changes", link: lines.length ? { url: process.env.COMMIT_URL } : null } }] } },
];
await notion.blocks.children.append({ block_id: logId, children });
console.log("notion log appended");
