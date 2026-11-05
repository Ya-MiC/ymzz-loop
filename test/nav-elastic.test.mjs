// v1.18.0 · top capsule hero→content elastic + bottom spy has no % / progress
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

describe("v1.18.0 nav elastic + glass spy", () => {
  it("versions say 1.18.0", () => {
    assert.match(cfg, /VERSION:\s*"1.18.0"/);
    assert.match(html, /v1.18.0/);
  });

  it("clock tabular lining + mid dial (v1.18 skill polish)", () => {
    assert.match(css, /16\.25rem/);
    assert.match(css, /font-feature-settings:\s*"tnum" 1,\s*"lnum" 1/);
    assert.match(css, /v1\.18\.0/);
    assert.match(html, /clock-h/);
    assert.match(js, /clock-h/);
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
    assert.match(block, /0\.88fr[\s\S]*1\.22fr[\s\S]*1\.05fr/);
  });
});
