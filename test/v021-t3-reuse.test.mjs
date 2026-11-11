import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

describe("vendored T3 modules execute", () => {
  it("keeps the MIT notice and runs the search bridge", () => {
    assert.equal(existsSync("third_party/t3code/LICENSE"), true);
    assert.match(readFileSync("third_party/t3code/NOTICE.md", "utf8"), /bf469bb19669671d0df2efda74ed73867a7137c0/);
    assert.match(readFileSync("third_party/t3code/LICENSE", "utf8"), /MIT/);
    const run = spawnSync(process.execPath, [
      "--experimental-strip-types",
      "third_party/t3code/bridge.mjs",
      "thread-search",
    ], { input: JSON.stringify({ text: "Deploy the Deployment", query: "deploy" }), encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    const body = JSON.parse(run.stdout);
    assert.deepEqual(body.offsets, [0, 11]);
  });
});
