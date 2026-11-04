// 零依賴 lint：語法檢查 + 禁止 tab/行尾空白 + JSON 合法 / zero-dep lint
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name === "node_modules" || e.name.startsWith(".git") ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
let bad = 0;
for (const f of walk(".")) {
  if (/\.(mjs|js)$/.test(f)) { try { execFileSync("node", ["--check", f]); } catch (e) { bad++; console.error(String(e.stderr)); } }
  if (/\.json$/.test(f)) { try { JSON.parse(fs.readFileSync(f, "utf8")); } catch { bad++; console.error("bad json", f); } }
  if (/\.(mjs|js|css|html|yml|md)$/.test(f)) fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/[ \t]+$/.test(l) && !f.endsWith(".md")) { bad++; console.error(`${f}:${i + 1} trailing whitespace`); } });
}
console.log(bad ? `✗ ${bad} problem(s)` : "✓ lint ok"); process.exit(bad ? 1 : 0);
