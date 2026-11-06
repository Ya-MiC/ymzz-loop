import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(".");
const gate = path.join(root, "scripts/gate.mjs");

function runGate(cwd, env = {}) {
  return execFileSync("node", [gate], {
    cwd,
    env: {
      ...process.env,
      YMZZ_TZ: "UTC",
      YMZZ_REMIND_TIME: "00:00",
      GITHUB_EVENT_NAME: "schedule",
      YMZZ_MAX_DAYS: "600",
      ...env,
    },
  }).toString();
}

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ymzz-gate-"));
  fs.mkdirSync(path.join(dir, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".ymzz"), { recursive: true });
  // symlink scripts so gate can import time.mjs
  for (const f of fs.readdirSync(path.join(root, "scripts"))) {
    fs.symlinkSync(path.join(root, "scripts", f), path.join(dir, "scripts", f));
  }
  return dir;
}

test("gate expires after MAX_DAYS from started", () => {
  const dir = scratch();
  // started 601 days ago
  const started = new Date();
  started.setUTCDate(started.getUTCDate() - 600); // day index = 601
  const iso = started.toISOString().slice(0, 10);
  fs.writeFileSync(path.join(dir, ".ymzz/started"), iso + "\n");
  const out = runGate(dir);
  assert.match(out, /lifespan ended|day \d+ > 600/);
  assert.match(out, /skip/);
});

test("gate allows day 600 inclusive", () => {
  const dir = scratch();
  const started = new Date();
  started.setUTCDate(started.getUTCDate() - 599); // day index = 600
  fs.writeFileSync(path.join(dir, ".ymzz/started"), started.toISOString().slice(0, 10) + "\n");
  const out = runGate(dir);
  assert.doesNotMatch(out, /lifespan ended/);
});

test("gate --mark writes started once", () => {
  const dir = scratch();
  execFileSync("node", [gate, "--mark"], {
    cwd: dir,
    env: { ...process.env, YMZZ_TZ: "UTC", YMZZ_REMIND_TIME: "00:00", GITHUB_EVENT_NAME: "workflow_dispatch" },
  });
  const started = fs.readFileSync(path.join(dir, ".ymzz/started"), "utf8").trim();
  assert.match(started, /^\d{4}-\d{2}-\d{2}$/);
  const last = fs.readFileSync(path.join(dir, ".ymzz/last-run"), "utf8").trim();
  assert.equal(last, started);
  // second mark must not change started
  execFileSync("node", [gate, "--mark"], {
    cwd: dir,
    env: { ...process.env, YMZZ_TZ: "UTC", YMZZ_REMIND_TIME: "00:00", GITHUB_EVENT_NAME: "workflow_dispatch" },
  });
  assert.equal(fs.readFileSync(path.join(dir, ".ymzz/started"), "utf8").trim(), started);
});
