// 在指定頁面下建立：首頁說明 + 每日復盤 + 持倉 + 同步紀錄 / creates home guide + 2 databases + sync log
import { notion, cfg, saveCfg } from "./notion-client.mjs";
import { REVIEW_DB, reviewProps, HOLDINGS_DB, holdingsProps, homeGuide } from "./schema.mjs";
const url = process.argv[2] || "";
const m = url.replace(/-/g, "").match(/[0-9a-f]{32}/i);
if (!m) { console.error("用法 usage: NOTION_TOKEN=xxx ./setup.sh <Notion 頁面網址 page URL>"); process.exit(1); }
const parent = m[0];
const c = cfg();
if (c.review_db_id) { console.log("已設定過，略過 / already set up:", c.review_db_id); process.exit(0); }
await notion.blocks.children.append({ block_id: parent, children: homeGuide() });
const mk = (title, properties, emoji) => notion.databases.create({ parent: { page_id: parent }, icon: { emoji }, title: [{ text: { content: title } }], properties });
const review = await mk(REVIEW_DB, reviewProps, "📓");
const holdings = await mk(HOLDINGS_DB, holdingsProps, "💼");
const log = await notion.pages.create({ parent: { page_id: parent }, icon: { emoji: "🔁" }, properties: { title: [{ text: { content: "同步紀錄 Sync Log" } }] } });
Object.assign(c, { parent_page_id: parent, review_db_id: review.id, holdings_db_id: holdings.id, notion_log_page_id: log.id });
saveCfg(c);
console.log("✅ 完成 done. 請 commit 並 push sync.config.json / commit & push sync.config.json");
