import fs from "node:fs";
import { Client } from "@notionhq/client";
export const CONFIG = "sync.config.json";
export const cfg = () => JSON.parse(fs.readFileSync(CONFIG, "utf8"));
export const saveCfg = c => fs.writeFileSync(CONFIG, JSON.stringify(c, null, 2) + "\n");
if (!process.env.NOTION_TOKEN) { console.error("缺少 NOTION_TOKEN / missing NOTION_TOKEN"); process.exit(1); }
export const notion = new Client({ auth: process.env.NOTION_TOKEN });
export const pageUrl = id => `https://www.notion.so/${id.replace(/-/g, "")}`;
export const plain = p => {
  if (!p) return "";
  switch (p.type) {
    case "title": case "rich_text": return p[p.type].map(t => t.plain_text).join("");
    case "number": return p.number ?? ""; case "checkbox": return p.checkbox ? "✅" : "";
    case "select": return p.select?.name ?? "";
    case "multi_select": return p.multi_select.map(o => o.name).join(", ");
    case "date": return p.date?.start ?? "";
    default: return "";
  }
};
export async function findReview(dbId, date) {
  const r = await notion.databases.query({ database_id: dbId, filter: { property: "日期 Date", date: { equals: date } }, page_size: 1 });
  return r.results[0];
}
export async function queryAll(dbId) {
  const out = []; let cursor;
  do { const r = await notion.databases.query({ database_id: dbId, start_cursor: cursor }); out.push(...r.results); cursor = r.has_more ? r.next_cursor : undefined; } while (cursor);
  return out;
}
