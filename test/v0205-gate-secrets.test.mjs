// v0.20.5 · gate skips without NOTION_TOKEN; failure-email soft skip
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const gate = path.resolve("scripts/gate.mjs");
const wf = fs.readFileSync(".github/workflows/daily-review.yml", "utf8");
const cl = fs.readFileSync("CHANGELOG.md", "utf8");

describe("v0.20.5 gate secrets guard", () => {
  it("versions track package.json (0.20.x) and keep 0.20.5 changelog", () => {
    assert.match(pkg.version, /^0\.20\.\d+$/);
    assert.match(cl, /## \[0\.20\.5\]/);
  });

  it("gate skips when NOTION_TOKEN is empty", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ymzz-gate5-"));
    fs.mkdirSync(path.join(dir, "scripts"), { recursive: true });
    for (const f of fs.readdirSync("scripts")) {
      fs.symlinkSync(path.resolve("scripts", f), path.join(dir, "scripts", f));
    }
    const out = execFileSync("node", [gate], {
      cwd: dir,
      env: {
        ...process.env,
        YMZZ_TZ: "UTC",
        YMZZ_REMIND_TIME: "00:00",
        GITHUB_EVENT_NAME: "schedule",
        NOTION_TOKEN: "",
      },
    }).toString();
    assert.match(out, /missing NOTION_TOKEN/);
    assert.match(out, /skip/);
  });

  it("failure email step soft-skips without SMTP", () => {
    assert.match(wf, /continue-on-error:\s*true/);
    assert.match(wf, /SMTP_USER\/SMTP_PASS\/MAIL_TO not set|skip failure email/);
  });
});
