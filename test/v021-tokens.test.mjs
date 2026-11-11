import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tokens = readFileSync("app/ui/tokens.css", "utf8");
const css = readFileSync("app/ui/app.css", "utf8");
const fonts = readFileSync("app/ui/fonts.css", "utf8");
const html = readFileSync("app/ui/index.html", "utf8");
const js = readFileSync("app/ui/app.js", "utf8");

describe("v0.21 wenrun surface", () => {
  it("keeps the locked light hexes and the specified body face", () => {
    assert.match(tokens, /#F8F6EF/);
    assert.match(tokens, /#B9DDF1/);
    assert.match(tokens, /#F4DDE7/);
    assert.match(tokens, /#CDBFE0/);
    assert.match(tokens, /#E8E3CC/);
    assert.match(tokens, /#3D3833/);
    assert.match(tokens, /Noto Sans SC Variable/);
    assert.match(fonts, /Noto Sans SC Variable/);
    assert.match(fonts, /\/fonts\/n00\.woff2/);
    assert.match(tokens, /#75589D/);
  });

  it("does not restyle the body with Inter, Fraunces, or the proposal violet", () => {
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(rules, /Inter|Fraunces|#75589D/);
    assert.doesNotMatch(html, /#75589D|fonts\.googleapis|深藤紫|JetBrains|不是會計|runtime_ready|hashed/);
    assert.match(js, /data-preset/);
    assert.match(js, /keydown/);
    assert.match(html, /沙箱/);
    assert.match(html, /查詢/);
    assert.match(html, /稟冊/);
    assert.match(html, /怎麼稱呼你/);
    assert.match(html, /先跳過/);
    assert.doesNotMatch(css, /var\(--paper\)/);
    assert.match(html, /id="menuBtn"/);
    assert.match(css, /data-drawer/);
  });
});
