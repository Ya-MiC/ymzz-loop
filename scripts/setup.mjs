// 一次性：在你指定的 Notion 頁面下建立兩個空白資料庫 / one-time: create the 2 blank databases
import fs from "node:fs"; import { Client } from "@notionhq/client"; import { REVIEW, HOLDINGS } from "./templates.mjs";
const parent = (process.argv[2] || "").replace(/.*?([0-9a-f]{32})(\?.*)?$/i, "$1");
if (!process.env.NOTION_TOKEN || !/^[0-9a-f]{32}$/i.test(parent)) { console.error("用法 usage: NOTION_TOKEN=... ./setup.sh <Notion 頁面網址或 ID / page URL or id>"); process.exit(1); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const cfg = JSON.parse(fs.readFileSync("sync.config.json", "utf8")); cfg.parent_page_id = parent;
const mk = async (key, t) => {
  if (cfg[key]) return console.log(`已存在 exists: ${t.title}`);
  const db = await notion.databases.create({ parent: { type: "page_id", page_id: parent }, title: [{ type: "text", text: { content: t.title } }], properties: t.properties });
  cfg[key] = db.id; console.log(`建立 created: ${t.title} → ${db.url}`);
};
await mk("review_db_id", REVIEW); await mk("holdings_db_id", HOLDINGS);
fs.writeFileSync("sync.config.json", JSON.stringify(cfg, null, 2));
console.log("✅ sync.config.json 已更新，請 commit & push / updated — commit & push it");
