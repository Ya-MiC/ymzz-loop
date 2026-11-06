// v0.20.1 · sticky-nav scroll clearance + visible #flow data-flow
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = rel => readFileSync(join(root, rel), "utf8");
const pkg = JSON.parse(read("package.json"));
const css = read("site/style.css");
const html = read("site/index.html");

describe("v0.20.1 showcase UI fixes", () => {
  it("0.20.1 changelog remains; site version tracks package.json", () => {
    assert.match(pkg.version, /^0\.20\.\d+$/);
    assert.ok(read("site/config.js").includes(`VERSION: "${pkg.version}"`));
    assert.match(html, new RegExp(`v${pkg.version.replaceAll(".", "\\.")}`));
    assert.match(read("CHANGELOG.md"), /## \[0\.20\.1\]/);
  });

  it("sections get sticky-nav scroll clearance", () => {
    assert.match(css, /--scroll-clear:\s*calc\(var\(--frame\)\s*\+\s*4\.75rem\)/);
    assert.match(css, /scroll-padding-block-start:\s*var\(--scroll-clear\)/);
    assert.match(css, /\.sec\[id\]\s*\{[\s\S]*?scroll-margin-block-start:\s*var\(--scroll-clear\)/);
  });

  it("How it flows markup is present and #flow is not display:none", () => {
    assert.match(html, /id="flow"[^>]*class="[^"]*flow-sec/);
    assert.match(html, /data-i18n="flow\.k">How it flows</);
    assert.match(html, /class="flow-steps"/);
    // Stale hide list must not target #flow anymore
    assert.doesNotMatch(css, /#flow,#flowList/);
    assert.doesNotMatch(css, /#flow\{display:none/);
    // Positive: restored visibility rule
    assert.match(css, /#flow\.flow-sec[\s\S]*?display:\s*block\s*!important/);
  });

  it("obsolete stage scaffolding still hidden", () => {
    assert.match(css, /\.stage,\.paper-stage,\.stage-glow,\.story,\.bign,\.sprog,#flowList,#bigN,#sprog\{display:none!important\}/);
  });
});
