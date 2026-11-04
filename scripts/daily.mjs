// 每天建立今天的空白復盤列（已存在就跳過）/ create today's blank review row (skip if exists)
import fs from "node:fs"; import { Client } from "@notionhq/client"; import { REVIEW_BODY } from "./templates.mjs";
const cfg = JSON.parse(fs.readFileSync("sync.config.json", "utf8"));
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
const hit = await notion.databases.query({ database_id: cfg.review_db_id, filter: { property: "日期 Date", date: { equals: today } } });
let url = hit.results[0]?.url;
if (!url) {
  const t = s => [{ type: "text", text: { content: s } }];
  const children = REVIEW_BODY.flatMap(h => [{ object: "block", type: "heading_3", heading_3: { rich_text: t(h) } }, { object: "block", type: "paragraph", paragraph: { rich_text: [] } }]);
  url = (await notion.pages.create({ parent: { database_id: cfg.review_db_id }, properties: { "標題 Title": { title: t(`${today} 復盤`) }, "日期 Date": { date: { start: today } } }, children })).url;
  console.log("created", today);
} else console.log("exists", today);
fs.writeFileSync("/tmp/today.json", JSON.stringify({ today, url }));
