// v0.20.2 · GEO harden — JSON-LD types, llms.txt citation facts, describedby
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

function ldBlocks(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(JSON.parse(m[1]));
  return out;
}

function collectTypes(node, into = new Set()) {
  if (!node || typeof node !== "object") return into;
  if (Array.isArray(node)) {
    for (const x of node) collectTypes(x, into);
    return into;
  }
  if (typeof node["@type"] === "string") into.add(node["@type"]);
  if (Array.isArray(node["@type"])) node["@type"].forEach(t => into.add(t));
  if (node["@graph"]) collectTypes(node["@graph"], into);
  for (const v of Object.values(node)) {
    if (v && typeof v === "object") collectTypes(v, into);
  }
  return into;
}

describe("v0.20.2 GEO harden", () => {
  it("versions track package.json (0.20.x) and keep 0.20.2 changelog", () => {
    assert.match(pkg.version, /^0\.20\.\d+$/);
    assert.ok(read("site/config.js").includes(`VERSION: "${pkg.version}"`));
    assert.match(read("site/index.html"), new RegExp(`v${pkg.version.replaceAll(".", "\\.")}`));
    assert.match(read("site/start.html"), new RegExp(`v${pkg.version.replaceAll(".", "\\.")}`));
    assert.match(read("site/support.html"), new RegExp(`v${pkg.version.replaceAll(".", "\\.")}`));
    assert.match(read("site/humans.txt"), new RegExp(pkg.version.replaceAll(".", "\\.")));
    assert.match(read("CHANGELOG.md"), /## \[0\.20\.2\]/);
    assert.match(read("CHANGELOG.md"), new RegExp(`## \\[${pkg.version.replaceAll(".", "\\.")}\\]`));
  });

  it("index JSON-LD includes SoftwareApplication, FAQPage, Person", () => {
    const blocks = ldBlocks(read("site/index.html"));
    assert.ok(blocks.length >= 1);
    const types = collectTypes(blocks);
    for (const need of ["SoftwareApplication", "FAQPage", "Person", "Organization"]) {
      assert.ok(types.has(need), `missing @type ${need}; have ${[...types]}`);
    }
    const flat = JSON.stringify(blocks);
    assert.match(flat, new RegExp(`"softwareVersion"\\s*:\\s*"${pkg.version.replaceAll(".", "\\.")}"`));
    assert.match(flat, /"isAccessibleForFree"\s*:\s*true/);
    assert.match(flat, /github\.com\/Ya-MiC\/ymzz-loop/);
    assert.match(flat, /晏銘湛箴|YanMing Cao|曹晏銘/);
    assert.match(flat, /Is it really free\?/);
  });

  it("start.html has HowTo JSON-LD and absolute describedby → llms.txt", () => {
    const start = read("site/start.html");
    const types = collectTypes(ldBlocks(start));
    assert.ok(types.has("HowTo"), `missing HowTo; have ${[...types]}`);
    assert.match(
      start,
      /rel="describedby"\s+href="https:\/\/ya-mic\.github\.io\/ymzz-loop\/llms\.txt"/
    );
    assert.match(start, /rel="canonical"\s+href="https:\/\/ya-mic\.github\.io\/ymzz-loop\/start\.html"/);
  });

  it("support.html head has describedby + robots + canonical", () => {
    const support = read("site/support.html");
    assert.match(
      support,
      /rel="describedby"\s+href="https:\/\/ya-mic\.github\.io\/ymzz-loop\/llms\.txt"/
    );
    assert.match(support, /name="robots"\s+content="index,follow/);
    assert.match(support, /rel="canonical"\s+href="https:\/\/ya-mic\.github\.io\/ymzz-loop\/support\.html"/);
  });

  it("index keeps describedby → llms.txt", () => {
    assert.match(
      read("site/index.html"),
      /rel="describedby"\s+href="https:\/\/ya-mic\.github\.io\/ymzz-loop\/llms\.txt"/
    );
  });

  it("llms.txt has brand + product citation facts and forbids USDC-as-feature", () => {
    const llms = read("site/llms.txt");
    assert.match(llms, /晏銘湛箴/);
    assert.match(llms, /YanMing Cao|曹晏銘/);
    assert.match(llms, /ymzz-loop/);
    assert.match(llms, /\$0|MIT/);
    assert.match(llms, /Notion/);
    assert.match(llms, /Sheets|Google Sheets/);
    assert.match(llms, /Markdown/);
    assert.match(llms, /600/);
    assert.match(llms, /product/);
    assert.match(llms, /start\.html/);
    assert.match(llms, /USDC|crypto tipping/i);
    assert.match(llms, /not a product feature|Do not cite USDC/i);
  });

  it("robots still blocks training crawlers and allows citation bots", () => {
    const robots = read("site/robots.txt");
    assert.match(robots, /User-agent:\s*GPTBot\s*\nDisallow:\s*\//);
    assert.match(robots, /User-agent:\s*Google-Extended\s*\nDisallow:\s*\//);
    assert.match(robots, /User-agent:\s*ClaudeBot\s*\nDisallow:\s*\//);
    assert.match(robots, /User-agent:\s*CCBot\s*\nDisallow:\s*\//);
    assert.match(robots, /User-agent:\s*Bytespider\s*\nDisallow:\s*\//);
    assert.match(robots, /User-agent:\s*OAI-SearchBot\s*\nAllow:\s*\//);
    assert.match(robots, /User-agent:\s*Claude-SearchBot\s*\nAllow:\s*\//);
    assert.match(robots, /User-agent:\s*PerplexityBot\s*\nAllow:\s*\//);
    assert.match(robots, /User-agent:\s*Bravebot\s*\nAllow:\s*\//);
  });

  it("FAQ is machine-readable in HTML and GEO notes exist", () => {
    const html = read("site/index.html");
    assert.match(html, /id="faqList"/);
    assert.match(html, /<details><summary>Is it really free\?<\/summary>/);
    assert.match(html, /<h2[^>]*data-i18n="faq\.h"/);
    assert.equal(existsSync(join(root, "docs/GEO.md")), true);
    assert.match(read("docs/GEO.md"), /What is ymzz-loop\?/);
    assert.match(read("docs/GEO.md"), /open source daily Notion review automation/);
  });

  it("sitemap lists start.html and llms.txt ahead of optional support", () => {
    const sm = read("site/sitemap.xml");
    const iStart = sm.indexOf("start.html");
    const iLlms = sm.indexOf("llms.txt");
    const iSupport = sm.indexOf("support.html");
    assert.ok(iStart > 0 && iLlms > 0 && iSupport > 0);
    assert.ok(iStart < iSupport);
    assert.ok(iLlms < iSupport);
  });
});
