// Sink: notion/YYYY/MMDD_HHMM_<tz>.md
import fs from "node:fs"; import path from "node:path";
const esc = s => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const table = (cols, rows) => [`| ${cols.join(" | ")} |`, `|${cols.map(() => "---").join("|")}|`, ...rows.map(r => `| ${r.map(esc).join(" | ")} |`)].join("\n");
export default {
  name: "markdown",
  enabled: () => true,
  async write(ctx) {
    const md = `# ${ctx.date} 每日復盤 Daily Review\n\n${ctx.time.human} 同步 synced\n\n## 欄位 Properties\n\n${ctx.reviewRow ? table([...ctx.reviewCols, "Notion"], [ctx.reviewRow]) : "—"}\n\n## 內容 Body\n\n${ctx.bodyMarkdown}\n\n## 持倉 Holdings\n\n${ctx.holdings.length ? table(ctx.holdingCols, ctx.holdings) : "—"}\n`;
    const dir = path.join("notion", ctx.time.year); fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${ctx.time.stamp}.md`); fs.writeFileSync(file, md); console.log("md:", file);
  },
};
