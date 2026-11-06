import { test } from "node:test"; import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const run = (tz, code) => execFileSync("node", ["--input-type=module", "-e", `import * as t from "./scripts/time.mjs"; ${code}`], { env: { ...process.env, YMZZ_TZ: tz } }).toString().trim();
test("slug + filename", () => {
  assert.equal(run("America/New_York", "console.log(t.slug)"), "new_york");
  assert.match(run("Asia/Seoul", "console.log(t.stamp())"), /^\d{4}_\d{4}_seoul$/);
});
test("offset label", () => { assert.match(run("Asia/Seoul", "console.log(t.zoneLabel())"), /首爾時間 \(UTC\+9\)/); });
test("yesterday is one day before today", () => {
  const [a, b] = run("Pacific/Kiritimati", "console.log(t.isoDate(), t.yesterday())").split(" ");
  assert.equal((new Date(a) - new Date(b)) / 864e5, 1);
});
test("gate skips when already ran", () => {
  const out = execFileSync("node", ["scripts/gate.mjs"], { env: { ...process.env, YMZZ_TZ: "UTC", YMZZ_REMIND_TIME: "00:00", GITHUB_EVENT_NAME: "schedule" } }).toString();
  assert.match(out, /\[gate\]/);
});
test("default zone is UTC", () => {
  const out = execFileSync("node", ["--input-type=module", "-e", `import * as t from "./scripts/time.mjs"; console.log(t.TZ, t.slug, t.zoneLabel())`], { env: { ...process.env, YMZZ_TZ: "" } }).toString().trim();
  assert.equal(out, "Etc/UTC utc UTC (UTC+0)");
});
test("pacific zone", () => { assert.equal(run("America/Los_Angeles", "console.log(t.slug)"), "los_angeles"); });
