// v0.20.3 · Pricing ($0) + 4-step Quick start + Use cases (Startup QA gaps)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = rel => readFileSync(join(root, rel), "utf8");
const pkg = JSON.parse(read("package.json"));

function ldBlocks(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(JSON.parse(m[1]));
  return out;
}

describe("v0.20.3 pricing + quickstart + use cases", () => {
  it("versions say 0.20.3", () => {
    assert.equal(pkg.version, "0.20.3");
    assert.match(read("site/config.js"), /VERSION:\s*"0\.20\.3"/);
    assert.match(read("site/index.html"), /v0\.20\.3/);
    assert.match(read("site/start.html"), /v0\.20\.3/);
    assert.match(read("site/support.html"), /v0\.20\.3/);
    assert.match(read("site/humans.txt"), /0\.20\.3/);
    assert.match(read("CHANGELOG.md"), /## \[0\.20\.3\]/);
  });

  it("homepage has #quickstart 4-step strip linking to start.html", () => {
    const html = read("site/index.html");
    assert.match(html, /id="quickstart"/);
    assert.match(html, /data-spy="Start"/);
    assert.match(html, /class="qs-steps"/);
    assert.equal((html.match(/class="qs-step"/g) || []).length, 4);
    assert.match(html, /href="start\.html"/);
    assert.match(html, /data-i18n="qs\.1k"/);
    assert.match(html, /data-i18n="qs\.4k"/);
    // product-branch rule still visible in strip copy
    assert.match(html, /product/);
    assert.match(html, /site\//);
  });

  it("homepage has honest #pricing ($0 forever, tips not a plan)", () => {
    const html = read("site/index.html");
    assert.match(html, /id="pricing"/);
    assert.match(html, /data-spy="Pricing"/);
    assert.match(html, /data-i18n="price\.h"/);
    assert.match(html, /\$0 self-host forever|price\.h/);
    assert.match(html, /data-i18n="price\.plan\.amt"/);
    assert.match(html, /support\.html/);
    assert.match(html, /not a plan|price\.tip/);
    // no Free→Max invented ladder for ourselves
    assert.doesNotMatch(html, /Starter \$15|Pro \$49|Max \$99/);
    // USDC still off homepage
    assert.doesNotMatch(html, /USDC|0x[a-fA-F0-9]{40}/);
  });

  it("homepage has #usecases strip with 4 grounded cards", () => {
    const html = read("site/index.html");
    assert.match(html, /id="usecases"/);
    assert.match(html, /data-spy="Uses"/);
    assert.equal((html.match(/class="use-card/g) || []).length, 4);
    assert.match(html, /data-i18n="uses\.1h"/);
    assert.match(html, /data-i18n="uses\.4h"/);
    assert.doesNotMatch(html, /users love us|10,?000\+ users|★★★★★/i);
    assert.match(html, /no fake testimonials/);
  });

  it("nav exposes Quick start + Pricing; i18n keys exist", () => {
    const html = read("site/index.html");
    assert.match(html, /href="#quickstart"[^>]*data-i18n="nav\.quickstart"/);
    assert.match(html, /href="#pricing"[^>]*data-i18n="nav\.pricing"/);
    const en = JSON.parse(read("site/i18n/en.json"));
    for (const k of [
      "nav.quickstart", "nav.pricing", "nav.usecases",
      "qs.h", "qs.1k", "qs.4k", "qs.cta",
      "price.h", "price.plan.amt", "price.tip",
      "uses.h", "uses.1h", "uses.4p"
    ]) {
      assert.equal(typeof en[k], "string", `missing en key ${k}`);
      assert.ok(en[k].length > 0, k);
    }
    for (const lang of ["zh-Hant", "zh-CN", "ko", "ar"]) {
      const d = JSON.parse(read(`site/i18n/${lang}.json`));
      assert.equal(typeof d["price.h"], "string", `${lang} price.h`);
      assert.equal(typeof d["qs.h"], "string", `${lang} qs.h`);
    }
  });

  it("JSON-LD Offer has $0 PriceSpecification pointing at #pricing", () => {
    const blocks = ldBlocks(read("site/index.html"));
    const flat = JSON.stringify(blocks);
    assert.match(flat, /"@type"\s*:\s*"Offer"/);
    assert.match(flat, /"price"\s*:\s*"0"/);
    assert.match(flat, /UnitPriceSpecification/);
    assert.match(flat, /#pricing/);
    assert.match(flat, /Self-host forever/);
    assert.match(flat, new RegExp(`"softwareVersion"\\s*:\\s*"${pkg.version.replaceAll(".", "\\.")}"`));
  });

  it("start.html repeats 4-step strip and keeps secrets checklist", () => {
    const start = read("site/start.html");
    assert.match(start, /class="qs-steps start-qs"/);
    assert.equal((start.match(/class="qs-step"/g) || []).length, 4);
    assert.match(start, /id="secrets"/);
    assert.match(start, /NOTION_TOKEN/);
    assert.match(start, /GOOGLE_SERVICE_ACCOUNT_JSON/);
    assert.match(start, /SMTP_PASS/);
    assert.match(start, /product/);
    assert.match(start, /site\//);
  });

  it("sitemap + llms.txt cite pricing and quickstart", () => {
    const sm = read("site/sitemap.xml");
    assert.match(sm, /#quickstart/);
    assert.match(sm, /#pricing/);
    assert.match(sm, /#usecases/);
    const llms = read("site/llms.txt");
    assert.match(llms, /#quickstart/);
    assert.match(llms, /#pricing/);
    assert.match(llms, /Self-host forever|\$0 self-host forever/i);
    assert.match(llms, /not a plan|not\*\* a plan/i);
  });

  it("contest-safe: homepage still gates tips; no USDC on index", () => {
    const html = read("site/index.html");
    assert.match(html, /href="support\.html"/);
    assert.doesNotMatch(html, /donate-usdc|QR|Arbitrum One USDC receive/i);
  });
});
