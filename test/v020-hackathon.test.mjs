// v0.20.0 · version reset, start guide, USDC off the landing surface
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = rel => readFileSync(join(root, rel), "utf8");
const pkg = JSON.parse(read("package.json"));
const ADDR = "0x9C4345b0a652D063a79321fe099C65a7Dc5a9C3A";

describe("v0.20 hackathon start surface", () => {
  it("package version is 0.20.x and config/footer/CHANGELOG agree", () => {
    assert.match(pkg.version, /^0\.20\.\d+$/);
    assert.ok(read("site/config.js").includes(`VERSION: "${pkg.version}"`));
    assert.ok(read("site/index.html").includes(`v${pkg.version}`));
    assert.ok(read("site/start.html").includes(`v${pkg.version}`));
    assert.match(read("CHANGELOG.md"), /## \[0\.20\.0\]/);
    assert.match(read("CHANGELOG.md"), new RegExp(`## \\[${pkg.version.replaceAll(".", "\\.")}\\]`));
  });

  it("start guide exists, points at product branch, and never the USDC address", () => {
    assert.equal(existsSync(join(root, "site/start.html")), true);
    const start = read("site/start.html");
    assert.match(start, /tree\/product|branch product|--branch product/);
    assert.match(start, /start\.html|data-page="start"/);
    assert.doesNotMatch(start, new RegExp(ADDR));
    assert.doesNotMatch(start, /donate-usdc-arb\.svg/);
    assert.match(read("site/index.html"), /href="start\.html"/);
  });

  it("landing page does not put USDC donation front and center", () => {
    const html = read("site/index.html");
    assert.doesNotMatch(html, new RegExp(ADDR));
    assert.doesNotMatch(html, /donate-usdc-arb\.svg/);
    assert.doesNotMatch(html, /data-spy="Donate"/);
    assert.match(html, /support\.html/);
    const support = read("site/support.html");
    assert.match(support, new RegExp(ADDR));
    assert.match(support, /donate-usdc-arb\.svg/);
  });

  it("retention notes file lists real email hooks without inventing a hosted inbox", () => {
    const notes = read("PRODUCT_NOTES.md");
    assert.match(notes, /send-reminder/);
    assert.match(notes, /SMTP_USER/);
    assert.match(notes, /MAIL_TO/);
    assert.doesNotMatch(notes, /we host your mailbox|hosted inbox operated by ymzz/i);
  });
});
