import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
const ids = (html) => new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const hrefs = (html) => [...html.matchAll(/\bhref="([^"]+)"/g)].map((m) => m[1]);

const BINGCE = "https://bingce.yanmingx0215.filegear-sg.me";
const PAGES = "https://ya-mic.github.io/ymzz-loop";
const REPO = "https://github.com/Ya-MiC/ymzz-loop";

const pagesHashes = [
  "quickstart", "pricing", "usecases", "flow", "intro", "diff", "setup", "faq", "join",
];
const bingceHashes = ["what", "download", "onboarding", "status", "main"];

describe("mutual navigation between the two official site faces", () => {
  it("Pages index keeps its existing section hashes and has no local onboarding/download ids", () => {
    const html = read("site/index.html");
    const got = ids(html);
    for (const id of pagesHashes) assert.equal(got.has(id), true, "missing #" + id);
    assert.equal(got.has("onboarding"), false);
    assert.equal(got.has("download"), false);
  });

  it("Bingce page keeps nickname onboarding hashes", () => {
    const html = read("bingce-site/public/index.html");
    const got = ids(html);
    for (const id of bingceHashes) assert.equal(got.has(id), true, "missing #" + id);
    assert.match(html, /用戶/);
    assert.match(html, /末四碼/);
    assert.match(html, /不用打路徑/);
  });

  it("Pages header and footer on index, start, and support link to Bingce, download, and onboarding", () => {
    for (const rel of ["site/index.html", "site/start.html", "site/support.html"]) {
      const html = read(rel);
      const header = html.match(/<header class="nav">[\s\S]*?<\/header>/)[0];
      const footer = html.match(/<footer class="foot">[\s\S]*?<\/footer>/)[0];
      assert.match(header, new RegExp(`${BINGCE}/"`));
      assert.match(footer, new RegExp(`${BINGCE}/"`));
      assert.match(footer, new RegExp(`${BINGCE}/#download"`));
      assert.match(footer, new RegExp(`${BINGCE}/#onboarding"`));
    }
  });

  it("Bingce nav and footer link to the Pages daily-review face, not a deprecated early version", () => {
    const html = read("bingce-site/public/index.html");
    const header = html.match(/<header class="top">[\s\S]*?<\/header>/)[0];
    const footer = html.match(/<footer>[\s\S]*?<\/footer>/)[0];
    assert.match(header, new RegExp(`${PAGES}/"`));
    assert.match(header, new RegExp(`${PAGES}/start\\.html"`));
    assert.match(header, new RegExp(`${PAGES}/#quickstart"`));
    assert.match(footer, new RegExp(`${PAGES}/"`));
    assert.match(footer, new RegExp(`${PAGES}/start\\.html"`));
    assert.doesNotMatch(html, /早期版本/);
  });

  it("Bingce source CTA points at the repository, not PR16, and does not treat empty Releases as a download", () => {
    const html = read("bingce-site/public/index.html");
    assert.equal(hrefs(html).some((h) => h === REPO || h === REPO + "/"), true);
    assert.equal(hrefs(html).some((h) => /\/pull\/16\b/.test(h)), false);
    assert.equal(hrefs(html).some((h) => /\/releases(\/|$|\?)/.test(h)), false);
    assert.match(html, /尚未公開|not publicly available/);
    assert.match(html, /v0\.21\.1-preview/);
    assert.match(html, /blob\/product\/README\.md/);
  });

  it("README presents both live faces as one product", () => {
    const md = read("README.md");
    assert.match(md, new RegExp(BINGCE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(md, /#onboarding/);
    assert.match(md, /ya-mic\.github\.io\/ymzz-loop/);
    assert.match(md, /start\.html/);
    assert.match(md, /同一個產品的兩面|two faces of the same product/);
  });

  it("keeps the approved palette byte-identical", () => {
    const a = readFileSync(join(root, "app/ui/tokens.css"));
    const b = readFileSync(join(root, "bingce-site/public/tokens.css"));
    assert.equal(createHash("sha256").update(a).digest("hex"), createHash("sha256").update(b).digest("hex"));
    assert.equal(existsSync(join(root, "site/style.css")), true);
  });

  it("pages workflow on product still deploys the imported site/ tree", () => {
    const yml = read(".github/workflows/pages.yml");
    assert.match(yml, /branches:\s*\[product\]/);
    assert.match(yml, /path:\s*site/);
    assert.match(yml, /github-pages/);
  });
});

describe("Bingce static bundle stays deployable without secrets", () => {
  it("gen2.mjs rebuilds an inlined worker from public/ and names the existing Worker", () => {
    const src = read("bingce-site/gen2.mjs");
    assert.match(src, /ymzz-bingce-site/);
    assert.match(src, /compatibility_date:'2026-11-01'/);
    const wr = read("bingce-site/wrangler.jsonc");
    assert.match(wr, /"name":\s*"ymzz-bingce-site"/);
    assert.match(wr, /"directory":\s*"\.\/public"/);
    execFileSync("node", ["gen2.mjs"], { cwd: join(root, "bingce-site") });
    assert.equal(existsSync(join(root, "bingce-site/worker.js")), true);
    const worker = read("bingce-site/worker.js");
    assert.match(worker, /\/index\.html/);
    const b64 = worker.match(/"\/index\.html":\["text\/html; charset=utf-8","([^"]+)"\]/)[1];
    const html = Buffer.from(b64, "base64").toString("utf8");
    assert.match(html, /id="onboarding"/);
    assert.match(html, /ya-mic\.github\.io\/ymzz-loop/);
    assert.doesNotMatch(html, /早期版本|pull\/16/);
    for (const generated of ["worker.js", "deploy.js", "deploy2.js"]) {
      const g = join(root, "bingce-site", generated);
      if (existsSync(g)) unlinkSync(g);
    }
  });
});
