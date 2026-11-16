import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { skipShowcase } from './product-only-gate.mjs';

const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const siteSkip = skipShowcase() ? 'showcase lives on main; this checkout is product-only' : false;

function resolveProductRef() {
  const exists = (ref) => {
    try {
      execSync(`git rev-parse --verify --quiet ${ref}^{commit}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };
  if (exists('product')) return 'product';
  if (exists('origin/product')) return 'origin/product';
  try {
    execSync('git fetch --depth=1 origin product:refs/remotes/origin/product', { stdio: 'ignore' });
  } catch {
    return null;
  }
  return exists('origin/product') ? 'origin/product' : null;
}

const productRef = resolveProductRef();
const productSkip = productRef ? false : 'product ref is not in this checkout';

describe('product branch is the source of truth for both official sites', () => {
  it('product ref is available', { skip: productSkip }, () => {
    assert.ok(productRef === 'product' || productRef === 'origin/product');
  });
  it('this checkout includes site/ and bingce-site/ plus pages.yml', () => {
    assert.equal(existsSync('site/index.html'), true);
    assert.equal(existsSync('bingce-site/public/index.html'), true);
    assert.equal(existsSync('.github/workflows/pages.yml'), true);
  });
  it('pages.yml deploys site/ from the product branch', () => {
    const yml = readFileSync('.github/workflows/pages.yml', 'utf8');
    assert.match(yml, /branches:\s*\[product\]/);
    assert.match(yml, /path:\s*site/);
    assert.match(yml, /actions\/deploy-pages/);
    assert.doesNotMatch(yml, /branches:\s*\[main\]/);
  });
  it('product keeps automation scripts + daily-review workflow', { skip: productSkip }, () => {
    const files = sh(`git ls-tree -r --name-only ${productRef}`);
    assert.match(files, /scripts\/gate\.mjs/);
    assert.match(files, /\.github\/workflows\/daily-review\.yml/);
  });
  it('hero CTA points at product branch not /generate', { skip: siteSkip }, () => {
    const html = readFileSync('site/index.html', 'utf8');
    assert.match(html, /ymzz-loop\/tree\/product/);
    assert.equal(html.includes('/generate'), false);
  });
  it('docs explain the two official site faces', () => {
    assert.equal(existsSync('docs/product-only.md'), true);
    const d = readFileSync('docs/product-only.md', 'utf8');
    assert.match(d, /bingce\.yanmingx0215\.filegear-sg\.me/);
    assert.match(d, /ya-mic\.github\.io\/ymzz-loop/);
    assert.match(d, /one product/i);
    assert.doesNotMatch(d, /excludes/);
  });
});

describe('spy has no numeric progress', () => {
  it('index has no spy-meter or spyPct', { skip: siteSkip }, () => {
    const html = readFileSync('site/index.html', 'utf8');
    assert.equal(html.includes('spy-meter'), false);
    assert.equal(html.includes('spyPct'), false);
    assert.equal(html.includes('id="spyFill"'), false);
  });
  it('app.js drives glass vars not percent text', { skip: siteSkip }, () => {
    const js = readFileSync('site/app.js', 'utf8');
    assert.match(js, /--spy-glass/);
    assert.equal(js.includes('spyPct'), false);
  });
});
