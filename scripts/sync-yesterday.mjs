// 昨日復盤 + 目前持倉 → sinks (markdown, sheets, …) — source: Notion
import { NotionToMarkdown } from "notion-to-md";
import { notion, cfg, findReview, queryAll, plain, pageUrl } from "./notion-client.mjs";
import { reviewProps, holdingsProps } from "./schema.mjs";
import { TZ, yesterday, stamp, year, human } from "./time.mjs";
import { runSinks } from "./sinks/index.mjs";
const c = cfg(), date = yesterday();
const reviewCols = Object.keys(reviewProps), holdingCols = Object.keys(holdingsProps);
const page = await findReview(c.review_db_id, date);
const reviewRow = page ? [...reviewCols.map(k => String(plain(page.properties[k]))), pageUrl(page.id)] : null;
const holdings = (await queryAll(c.holdings_db_id)).map(p => holdingCols.map(k => String(plain(p.properties[k]))));
let bodyMarkdown = "_（昨天沒有復盤頁 / no review page yesterday）_";
if (page) { const n2m = new NotionToMarkdown({ notionClient: notion }); bodyMarkdown = n2m.toMarkdownString(await n2m.pageToMarkdown(page.id)).parent || ""; }
await runSinks(c.sinks || ["markdown", "sheets"], { date, reviewCols, reviewRow, holdingCols, holdings, bodyMarkdown, time: { tz: TZ, stamp: stamp(), year: year(), human: human() } });
