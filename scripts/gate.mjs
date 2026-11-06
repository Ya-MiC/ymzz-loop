// 每小時閘門（<1 秒，無依賴）/ hourly gate: proceed once per local day after REMIND_TIME
// 輸出 output: go=true|false, expired=true|false, today=, day=, max_days= to $GITHUB_OUTPUT.
// Dedupe: .ymzz/last-run holds the last local date that ran.
// Chapter length: from first successful run (.ymzz/started) at most MAX_DAYS (600) calendar days,
// then the daily loop pauses so the chapter can close with a 600-day summary. Redeploy = next chapter.
import fs from "node:fs";
import { TZ, REMIND_TIME, isoDate, hhmm, human } from "./time.mjs";

const STATE = ".ymzz/last-run";
const STARTED = ".ymzz/started";
const MAX_DAYS = Number(process.env.YMZZ_MAX_DAYS || 600);

const today = isoDate(), now = hhmm();
const last = fs.existsSync(STATE) ? fs.readFileSync(STATE, "utf8").trim() : "";
const started = fs.existsSync(STARTED) ? fs.readFileSync(STARTED, "utf8").trim() : "";
const manual = process.env.GITHUB_EVENT_NAME === "workflow_dispatch";

/** Inclusive calendar-day count from started → today (UTC date strings YYYY-MM-DD). */
function dayIndex(from, to) {
  if (!from || !to) return 0;
  const a = Date.parse(from + "T12:00:00Z"), b = Date.parse(to + "T12:00:00Z");
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.floor((b - a) / 864e5) + 1;
}

const day = started ? dayIndex(started, today) : 0;
const expired = Boolean(started && day > MAX_DAYS);

let go, why;
if (expired) {
  go = false;
  why = `chapter complete: day ${day} > ${MAX_DAYS} (started ${started}) — pause for summary`;
} else if (manual) {
  go = true;
  why = "manual run";
} else if (last === today) {
  go = false;
  why = `already ran today (${today})`;
} else if (now < REMIND_TIME) {
  go = false;
  why = `${now} < ${REMIND_TIME}`;
} else {
  go = true;
  why = `${now} ≥ ${REMIND_TIME}, first run today`;
}

console.log(`[gate] ${human()} · TZ=${TZ} · REMIND_TIME=${REMIND_TIME} · day=${day || "—"}/${MAX_DAYS} → ${go ? "GO" : "skip"} (${why})`);
if (expired) console.log(`[gate] chapter complete after ${MAX_DAYS} days — daily loop paused for 600-day summary. Deploy a newer release to start the next chapter.`);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `go=${go}\nexpired=${expired}\ntoday=${today}\nday=${day}\nmax_days=${MAX_DAYS}\nstarted=${started || ""}\n`,
  );
}

if (go && process.argv.includes("--mark")) {
  fs.mkdirSync(".ymzz", { recursive: true });
  fs.writeFileSync(STATE, today + "\n");
  if (!fs.existsSync(STARTED)) fs.writeFileSync(STARTED, today + "\n");
}
