// v0.20.4 · i18n: spy labels + ar parity + critical zh-Hant pricing/quickstart/usecases
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
if (!existsSync(join(root, "site/index.html"))) {
  const note = existsSync(join(root, "PRODUCT_BRANCH")) ? readFileSync(join(root, "PRODUCT_BRANCH"), "utf8") : "";
  if (/no site/i.test(note)) process.exit(0);
}
const read = rel => readFileSync(join(root, rel), "utf8");
const pkg = JSON.parse(read("package.json"));

const FOCUS = [
  "nav.pricing", "nav.quickstart", "nav.usecases",
  "price.k", "price.h", "price.p", "price.plan.amt", "price.plan.cta", "price.tip",
  "qs.k", "qs.h", "qs.1k", "qs.4k", "qs.cta",
  "uses.k", "uses.h", "uses.1h", "uses.4p",
];

describe("v0.20.4 i18n polish", () => {
  it("versions say 0.20.4", () => {
    assert.equal(pkg.version, "0.20.4");
    assert.match(read("site/config.js"), /VERSION:\s*"0\.20\.4"/);
    assert.match(read("site/index.html"), /v0\.20\.4/);
    assert.match(read("site/start.html"), /v0\.20\.4/);
    assert.match(read("site/support.html"), /v0\.20\.4/);
    assert.match(read("site/humans.txt"), /0\.20\.4/);
    assert.match(read("CHANGELOG.md"), /## \[0\.20\.4\]/);
  });

  it("critical zh-Hant keys exist for pricing/quickstart/usecases", () => {
    const zh = JSON.parse(read("site/i18n/zh-Hant.json"));
    const en = JSON.parse(read("site/i18n/en.json"));
    for (const k of FOCUS) {
      assert.equal(typeof zh[k], "string", "missing zh-Hant " + k);
      assert.ok(zh[k].length > 0, "empty zh-Hant " + k);
      if (k !== "price.plan.amt") {
        assert.notEqual(zh[k], en[k], "zh-Hant still English for " + k);
      }
    }
    assert.match(zh["nav.pricing"], /定價/);
    assert.match(zh["nav.quickstart"], /快速上手/);
    assert.match(zh["nav.usecases"], /使用情境/);
    assert.match(zh["price.h"], /\$0|自架/);
    assert.match(zh["qs.h"], /四步|復盤|复盘/);
    assert.match(zh["uses.h"], /迴圈|谁|誰|給/);
  });

  it("zh-CN and ko also cover focus keys (non-English)", () => {
    const en = JSON.parse(read("site/i18n/en.json"));
    for (const loc of ["zh-CN", "ko"]) {
      const d = JSON.parse(read(`site/i18n/${loc}.json`));
      for (const k of FOCUS) {
        assert.equal(typeof d[k], "string", loc + " missing " + k);
        if (k !== "price.plan.amt") assert.notEqual(d[k], en[k], loc + " English " + k);
      }
    }
  });

  it("ar has every en key (no English-key flash / fallthrough gaps)", () => {
    const en = JSON.parse(read("site/i18n/en.json"));
    const ar = JSON.parse(read("site/i18n/ar.json"));
    const missing = Object.keys(en).filter(k => !(k in ar));
    assert.equal(missing.length, 0, "ar missing: " + missing.slice(0, 20).join(","));
    for (const k of FOCUS) {
      assert.equal(typeof ar[k], "string");
      assert.ok(ar[k].length > 0);
    }
  });

  it("new sections wire data-i18n + data-spy-i18n", () => {
    const html = read("site/index.html");
    assert.match(html, /id="pricing"[^>]*data-spy-i18n="nav\.pricing"/);
    assert.match(html, /id="quickstart"[^>]*data-spy-i18n="nav\.quickstart"/);
    assert.match(html, /id="usecases"[^>]*data-spy-i18n="nav\.usecases"/);
    assert.match(html, /data-i18n="price\.h"/);
    assert.match(html, /data-i18n="qs\.1k"/);
    assert.match(html, /data-i18n="uses\.1h"/);
    assert.match(html, /data-i18n="nav\.pricing"/);
    assert.match(html, /data-i18n="nav\.quickstart"/);
    assert.match(html, /data-i18n="nav\.usecases"/);
    const app = read("site/app.js");
    assert.match(app, /data-spy-i18n/);
    assert.match(app, /data-spy-link/);
    assert.match(app, /span\.textContent = t\(key\)/);
  });

  it("start.html nav includes Quick start; homepage still has no USDC", () => {
    const start = read("site/start.html");
    assert.match(start, /index\.html#quickstart[^>]*data-i18n="nav\.quickstart"/);
    const html = read("site/index.html");
    assert.doesNotMatch(html, /USDC|0x[a-fA-F0-9]{40}/);
  });
});
