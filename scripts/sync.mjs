// Notion -> Markdown (notion/) + Google Sheet. Secrets come from env only; nothing is logged.
import fs from "node:fs"; import path from "node:path";
import { Client } from "@notionhq/client"; import { NotionToMarkdown } from "notion-to-md";
import { google } from "googleapis";
const cfg = JSON.parse(fs.readFileSync("sync.config.json", "utf8"));
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });
const safe = s => s.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
const plain = p => {
  switch (p.type) {
    case "title": case "rich_text": return p[p.type].map(t => t.plain_text).join("");
    case "number": return p.number ?? ""; case "checkbox": return p.checkbox;
    case "select": case "status": return p[p.type]?.name ?? "";
    case "multi_select": return p.multi_select.map(o => o.name).join(", ");
    case "date": return p.date ? [p.date.start, p.date.end].filter(Boolean).join(" → ") : "";
    case "url": case "email": case "phone_number": return p[p.type] ?? "";
    case "people": return p.people.map(u => u.name ?? u.id).join(", ");
    case "relation": return p.relation.map(r => r.id).join(", ");
    case "formula": return p.formula[p.formula.type] ?? "";
    case "created_time": case "last_edited_time": return p[p.type];
    default: return "";
  }
};
const titleOf = pg => { const t = Object.values(pg.properties || {}).find(p => p.type === "title"); return t ? plain(t) : pg.id; };
async function pageToMd(id, dir) {
  const md = n2m.toMarkdownString(await n2m.pageToMarkdown(id)).parent || "";
  const pg = await notion.pages.retrieve({ page_id: id });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, safe(titleOf(pg)) + ".md"), `<!-- notion:${id} edited:${pg.last_edited_time} -->\n\n` + md);
}
async function queryAll(dbId) {
  const rows = []; let cursor;
  do { const r = await notion.databases.query({ database_id: dbId, start_cursor: cursor }); rows.push(...r.results); cursor = r.has_more ? r.next_cursor : undefined; } while (cursor);
  return rows;
}
// child databases inside a page
async function childDbs(pageId) {
  const ids = []; let cursor;
  do { const r = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor });
    for (const b of r.results) if (b.type === "child_database") ids.push(b.id);
    cursor = r.has_more ? r.next_cursor : undefined; } while (cursor);
  return ids;
}
const tables = {}; const sheetCounts = {};
for (const s0 of cfg.sources) {
  const s = { ...s0, id: s0.id.startsWith("$") ? cfg[s0.id.slice(1)] : s0.id };
  if (!s.id) { console.log(`skip (no id): ${s.name}`); continue; }
  const dir = path.join("notion", safe(s.name));
  const dbIds = s.type === "database" ? [s.id] : (await pageToMd(s.id, dir), await childDbs(s.id));
  for (const db of dbIds) {
    const rows = await queryAll(db);
    const cols = [...new Set(rows.flatMap(r => Object.keys(r.properties)))];
    const t = (tables[s.sheetTab || safe(s.name)] ||= [["notion_id", "last_edited", ...cols]]);
    for (const r of rows) {
      t.push([r.id, r.last_edited_time, ...cols.map(c => r.properties[c] ? String(plain(r.properties[c])) : "")]);
      await pageToMd(r.id, path.join(dir, "rows"));
    }
  }
  console.log(`ok: ${s.name}`);
}
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.SHEET_ID) {
  const auth = new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON), scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  const sheets = google.sheets({ version: "v4", auth }); const sid = process.env.SHEET_ID;
  const have = (await sheets.spreadsheets.get({ spreadsheetId: sid })).data.sheets.map(x => x.properties.title);
  for (const [tab, values] of Object.entries(tables)) {
    if (!have.includes(tab)) await sheets.spreadsheets.batchUpdate({ spreadsheetId: sid, requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] } });
    await sheets.spreadsheets.values.clear({ spreadsheetId: sid, range: `'${tab}'` });
    await sheets.spreadsheets.values.update({ spreadsheetId: sid, range: `'${tab}'!A1`, valueInputOption: "RAW", requestBody: { values } });
    console.log(`sheet: ${tab} (${values.length - 1} rows)`);
    sheetCounts[tab] = values.length - 1;
  }
} else console.log("skip sheet: GOOGLE_SERVICE_ACCOUNT_JSON / SHEET_ID not set");

fs.writeFileSync("/tmp/sync-stats.json", JSON.stringify({ sheetCounts, sheet: !!process.env.SHEET_ID }));
