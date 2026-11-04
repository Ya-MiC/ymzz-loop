// 昨日復盤 + 目前持倉 → Google Sheet + notion/YYYY/MMDD_HHMM_seoul.md
import fs from "node:fs"; import path from "node:path";
import { NotionToMarkdown } from "notion-to-md"; import { google } from "googleapis";
import { notion, cfg, findReview, queryAll, plain, pageUrl } from "./notion-client.mjs";
import { reviewProps, holdingsProps } from "./schema.mjs";
import { yesterday, stamp, year, human } from "./seoul-time.mjs";
const c = cfg(), date = yesterday();
const rCols = Object.keys(reviewProps), hCols = Object.keys(holdingsProps);
const page = await findReview(c.review_db_id, date);
const reviewRow = page ? [...rCols.map(k => String(plain(page.properties[k]))), pageUrl(page.id)] : null;
const holdings = (await queryAll(c.holdings_db_id)).map(p => hCols.map(k => String(plain(p.properties[k]))));

// md snapshot
let body = "_（昨天沒有復盤頁 / no review page yesterday）_";
if (page) { const n2m = new NotionToMarkdown({ notionClient: notion }); body = n2m.toMarkdownString(await n2m.pageToMarkdown(page.id)).parent || ""; }
const esc = s => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const table = (cols, rows) => [`| ${cols.join(" | ")} |`, `|${cols.map(() => "---").join("|")}|`, ...rows.map(r => `| ${r.map(esc).join(" | ")} |`)].join("\n");
const md = `# ${date} 每日復盤 Daily Review\n\n首爾時間 (UTC+9)：${human()} 同步 synced\n\n## 欄位 Properties\n\n${reviewRow ? table([...rCols, "Notion"], [reviewRow]) : "—"}\n\n## 內容 Body\n\n${body}\n\n## 持倉 Holdings\n\n${holdings.length ? table(hCols, holdings) : "—"}\n`;
const dir = path.join("notion", year()); fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${stamp()}.md`); fs.writeFileSync(file, md); console.log("md:", file);

// Google Sheet
if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.SHEET_ID) { console.log("未設 Sheet，略過 / sheet not set, skip"); process.exit(0); }
const auth = new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON), scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
const sheets = google.sheets({ version: "v4", auth }), id = process.env.SHEET_ID;
const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
const have = new Set(meta.data.sheets.map(s => s.properties.title));
const need = ["每日復盤", "持倉"].filter(t => !have.has(t));
if (need.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: need.map(title => ({ addSheet: { properties: { title } } })) } });
// 每日復盤: header row + one row per date (update if exists)
const header = [...rCols, "Notion"];
await sheets.spreadsheets.values.update({ spreadsheetId: id, range: "每日復盤!A1", valueInputOption: "RAW", requestBody: { values: [header] } });
if (reviewRow) {
  const dateIdx = rCols.indexOf("日期 Date"), colL = String.fromCharCode(65 + dateIdx);
  const col = (await sheets.spreadsheets.values.get({ spreadsheetId: id, range: `每日復盤!${colL}:${colL}` })).data.values || [];
  const at = col.findIndex(r => r[0] === date);
  if (at > 0) await sheets.spreadsheets.values.update({ spreadsheetId: id, range: `每日復盤!A${at + 1}`, valueInputOption: "RAW", requestBody: { values: [reviewRow] } });
  else await sheets.spreadsheets.values.append({ spreadsheetId: id, range: "每日復盤!A1", valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values: [reviewRow] } });
}
// 持倉: full snapshot
await sheets.spreadsheets.values.clear({ spreadsheetId: id, range: "持倉" });
await sheets.spreadsheets.values.update({ spreadsheetId: id, range: "持倉!A1", valueInputOption: "RAW", requestBody: { values: [[...hCols, `同步 ${human()}`], ...holdings] } });
console.log("sheet synced");
