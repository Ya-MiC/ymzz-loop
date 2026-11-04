// 建立今日空白復盤頁（已存在則略過）/ create today's blank review page (idempotent)
import fs from "node:fs";
import { notion, cfg, findReview, pageUrl } from "./notion-client.mjs";
import { dailyBody } from "./schema.mjs";
import { isoDate } from "./seoul-time.mjs";
const c = cfg(), date = isoDate();
let page = await findReview(c.review_db_id, date);
if (!page) page = await notion.pages.create({
  parent: { database_id: c.review_db_id }, icon: { emoji: "📓" },
  properties: { "標題 Title": { title: [{ text: { content: `${date} 復盤 Review` } }] }, "日期 Date": { date: { start: date } } },
  children: dailyBody(),
});
fs.writeFileSync("/tmp/today.json", JSON.stringify({ date, url: pageUrl(page.id) }));
console.log("today:", date);
