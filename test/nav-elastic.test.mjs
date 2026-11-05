// v1.17.3 · top capsule hero→content elastic + bottom spy has no % / progress
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "site/style.css"), "utf8");
const js = readFileSync(join(root, "site/app.js"), "utf8");
const html = readFileSync(join(root, "site/index.html"), "utf8");
const cfg = readFileSync(join(root, "site/config.js"), "utf8");

describe("v1.17.3 nav elastic + glass spy", () => {
  it("versions say 1.17.3", () => {
    assert.match(cfg, /VERSION:\s*"1.17.3"/);
    assert.match(html, /v1.17.3/);
  });

  it("editorial dial mid-size with breathing room", () => {
    assert.match(css, /inline-size:min\(100%,\s*17rem\)/);
    assert.match(css, /v1\.17\.3/);
  });

  it("nav width formula interpolates --nav-p between hero-w and content-w", () => {
    assert.match(css, /--nav-p/);
    assert.match(
      css,
      /width:\s*calc\(var\(--nav-hero-w/
    );
    assert.match(js, /frozenHeroW/);
    assert.match(js, /hb > 0\) np = 0/);
    assert.match(js, /\(-hb\) \/ 96/);
  });

  it("bottom spy: no numeric % bar; progress via glass on section items", () => {
    assert.match(css, /\.spy-meter.*display:none/s);
    assert.match(css, /\.spy-pct.*display:none/s);
    assert.doesNotMatch(html, /id="spyPct"|id="spyFill"|class="spy-track"/);
    assert.match(js, /--spy-glass/);
    assert.match(js, /paintGlassProgress|--spy-fill/);
    assert.match(css, /--spy-fill/);
    assert.match(css, /a\.is-on/);
  });

  it("product-only CTA preserved", () => {
    assert.match(html, /tree\/product/);
  });

  it("holdings default view is calm bars; edit behind toggle", () => {
    assert.match(js, /data-hold-mode|holdEditTog|is-view/);
    assert.match(css, /\.hold-row\.is-view/);
    assert.match(css, /hold-edit-tog/);
  });

  it("content-driven equal card edges (stretch, no 100svh min)", () => {
    const block = css.slice(css.indexOf("v1.17.3"));
    assert.match(block, /min-block-size:0!important/);
    assert.match(block, /0\.88fr.*1\.22fr.*1\.05fr/s);
  });
});
