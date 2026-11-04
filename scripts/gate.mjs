// 每小時閘門（<1 秒，無依賴）/ hourly gate: proceed once per local day after REMIND_TIME
// 輸出 output: go=true|false to $GITHUB_OUTPUT. Dedupe: .ymzz/last-run holds the last local date that ran.
import fs from "node:fs";
import { TZ, REMIND_TIME, isoDate, hhmm, human } from "./time.mjs";
const STATE = ".ymzz/last-run";
const today = isoDate(), now = hhmm();
const last = fs.existsSync(STATE) ? fs.readFileSync(STATE, "utf8").trim() : "";
const manual = process.env.GITHUB_EVENT_NAME === "workflow_dispatch";
let go, why;
if (manual) { go = true; why = "manual run"; }
else if (last === today) { go = false; why = `already ran today (${today})`; }
else if (now < REMIND_TIME) { go = false; why = `${now} < ${REMIND_TIME}`; }
else { go = true; why = `${now} ≥ ${REMIND_TIME}, first run today`; }
console.log(`[gate] ${human()} · TZ=${TZ} · REMIND_TIME=${REMIND_TIME} → ${go ? "GO" : "skip"} (${why})`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `go=${go}\ntoday=${today}\n`);
if (go && process.argv.includes("--mark")) { fs.mkdirSync(".ymzz", { recursive: true }); fs.writeFileSync(STATE, today + "\n"); }
