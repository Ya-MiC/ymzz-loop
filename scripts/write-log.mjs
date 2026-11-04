// 在 Notion「同步紀錄」頁追加一行 / append one line to the Notion Sync Log page
import { notion, cfg } from "./notion-client.mjs";
import { human } from "./seoul-time.mjs";
const c = cfg(); if (!c.notion_log_page_id) process.exit(0);
const content = `${human()} ✅ ${process.env.COMMIT_URL || ""}`;
await notion.blocks.children.append({ block_id: c.notion_log_page_id, children: [{ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content, link: process.env.COMMIT_URL ? { url: process.env.COMMIT_URL } : null } }] } }] });
