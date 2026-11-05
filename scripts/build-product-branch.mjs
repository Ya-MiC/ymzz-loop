#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Build orphan-ish `product` branch: automation only — NO site/, NO pages.yml.
// Showcase site stays on main. CTA → https://github.com/Ya-MiC/ymzz-loop/tree/product
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, cpSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sh = (cmd, opts = {}) => execSync(cmd, { cwd: root, stdio: "pipe", encoding: "utf8", ...opts });

const INCLUDE = [
  "scripts",
  "integrations",
  "notion",
  "test",
  "docs",
  "assets",
  "package.json",
  "package-lock.json",
  "setup.sh",
  "sync.config.json",
  "LICENSE",
  "CHANGELOG.md",
  "CREDITS.md",
  "THIRD_PARTY.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "TRADEMARK.md",
  "README.md",
  "README.zh-Hant.md",
  "README.zh-CN.md",
  "README.ko.md",
  ".gitignore",
];

const GITHUB_INCLUDE = [
  ".github/workflows/ci.yml",
  ".github/workflows/daily-review.yml",
  ".github/workflows/sync-product.yml", // self — keep sync on main only ideally; skip on product
  ".github/ISSUE_TEMPLATE",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/FUNDING.yml",
  ".github/dependabot.yml",
];

function copyPath(srcRel, destRoot) {
  const src = join(root, srcRel);
  if (!existsSync(src)) return;
  const dest = join(destRoot, srcRel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
}

const tmp = mkdtempSync(join(tmpdir(), "ymzz-product-"));
try {
  for (const p of INCLUDE) copyPath(p, tmp);
  for (const p of GITHUB_INCLUDE) {
    if (p.includes("sync-product")) continue; // only on main
    copyPath(p, tmp);
  }
  // Explicitly ensure pages.yml is absent
  // Product README banner
  const banner = `# ymzz-loop · product-only branch

> **This branch has no showcase website** (\`site/\` and Pages deploy are excluded).
> It is the **automation product** only: Notion daily review → Sheets + Markdown (+ optional Feishu).

## Get this into your own repo (no website)

**Option A — Download ZIP**
GitHub → green **Code** → **Download ZIP** (or open
https://github.com/Ya-MiC/ymzz-loop/archive/refs/heads/product.zip ).
Create an empty repo, unpack the ZIP into it, push.

**Option B — clone this branch only**

\`\`\`bash
git clone --depth 1 --branch product --single-branch https://github.com/Ya-MiC/ymzz-loop.git my-ymzz-loop
cd my-ymzz-loop
# point at YOUR empty repo, then push
git remote set-url origin https://github.com/YOU/my-ymzz-loop.git
git push -u origin product:main
\`\`\`

Do **not** use “Use this template” / fork of \`main\` if you want to avoid the marketing site — \`main\` includes \`site/\`.

Showcase site (read-only demo): https://ya-mic.github.io/ymzz-loop/

---

`;
  const readme = readFileSync(join(tmp, "README.md"), "utf8");
  writeFileSync(join(tmp, "README.md"), banner + readme);
  writeFileSync(join(tmp, "PRODUCT_BRANCH"), "ymzz-loop product-only · no site/\n");

  const head = sh("git rev-parse HEAD").trim();
  const msg = `product-only tree from ${head.slice(0, 7)} (no site, no pages)`;

  // Create orphan commit without switching workspace (git hash-object / commit-tree)
  // Simpler: use worktree
  const wt = join(tmpdir(), "ymzz-product-wt-" + process.pid);
  try { sh(`git worktree remove -f "${wt}"`); } catch { /* */ }
  try {
    sh("git branch -D product");
  } catch { /* */ }
  sh(`git worktree add --orphan -b product "${wt}"`);
  // orphan starts empty — just copy built tree into worktree
  for (const name of readdirSync(tmp)) {
    cpSync(join(tmp, name), join(wt, name), { recursive: true });
  }
  sh("git add -A", { cwd: wt });
  sh(`git -c user.name=Tully -c user.email=tully@yamic.de5.net commit -m "${msg}"`, { cwd: wt });
  sh(`git worktree remove -f "${wt}"`);
  console.log("OK: local branch `product` updated —", msg);
  console.log("Verify no site:", sh("git ls-tree -d --name-only product").trim());
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
