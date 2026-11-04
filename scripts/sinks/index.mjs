/**
 * Sink 介面 / Sink interface (see docs/architecture.md)
 * @typedef {Object} SyncContext
 * @property {string} date         昨日本地日期 YYYY-MM-DD
 * @property {string[]} reviewCols 復盤欄位
 * @property {string[]|null} reviewRow 復盤一列（最後一欄為 Notion 連結）或 null
 * @property {string[]} holdingCols 持倉欄位
 * @property {string[][]} holdings 持倉快照
 * @property {string} bodyMarkdown 復盤頁內文 markdown
 * @property {{tz:string, stamp:string, year:string, human:string}} time
 *
 * @typedef {Object} Sink
 * @property {string} name
 * @property {(env: NodeJS.ProcessEnv) => boolean} enabled   缺設定時回 false 即略過 / return false to skip
 * @property {(ctx: SyncContext) => Promise<void>} write
 */
import markdown from "./markdown.mjs";
import sheets from "./sheets.mjs";
export const registry = { markdown, sheets };
export async function runSinks(names, ctx) {
  for (const n of names) {
    const s = registry[n];
    if (!s) { console.warn(`[sink] 未知 unknown: ${n}`); continue; }
    if (!s.enabled(process.env)) { console.log(`[sink] ${n}: 未設定，略過 / not configured, skip`); continue; }
    await s.write(ctx); console.log(`[sink] ${n}: ✓`);
  }
}
