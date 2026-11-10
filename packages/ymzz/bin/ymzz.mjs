#!/usr/bin/env node
import { suggestedNickname, chapterRemaining } from "../lib/steward.mjs";

const [cmd, arg] = process.argv.slice(2);
if (!cmd || cmd === "help" || cmd === "--help") {
  console.log("ymzz nick <電話>    預設稱呼");
  console.log("ymzz chapter <開始日> <今天>    這一章還剩幾日（最多 600）");
  console.log("這個指令不連外，也不會扣款。");
  process.exit(cmd ? 0 : 2);
}
if (cmd === "nick") {
  console.log(suggestedNickname(arg || ""));
  process.exit(0);
}
if (cmd === "chapter") {
  const [started, today] = process.argv.slice(3);
  if (!started || !today) {
    console.error("需要開始日和今天，例如 2026-01-01 2026-11-10");
    process.exit(2);
  }
  console.log(String(chapterRemaining(started, today)));
  process.exit(0);
}
console.error(`不認識 ${cmd}`);
process.exit(2);
