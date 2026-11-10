import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { skipShowcase } from './product-only-gate.mjs';

const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const siteSkip = skipShowcase() ? 'showcase lives on main; this checkout is product-only' : false;

describe('product branch excludes showcase site', () => {
  it('local product branch exists', () => {
    const branches = sh('git branch --list product');
    assert.match(branches, /product/);
  });
  it('product has no site/ tree', () => {
    const files = sh('git ls-tree -r --name-only product');
    assert.equal(files.split('\n').some(f => f === 'site' || f.startsWith('site/')), false);
  });
  it('product has no pages.yml', () => {
    const files = sh('git ls-tree -r --name-only product');
    assert.equal(files.includes('pages.yml'), false);
  });
  it('product keeps automation scripts + daily-review workflow', () => {
    const files = sh('git ls-tree -r --name-only product');
    assert.match(files, /scripts\/gate\.mjs/);
    assert.match(files, /\.github\/workflows\/daily-review\.yml/);
  });
  it('hero CTA points at product branch not /generate', { skip: siteSkip }, () => {
    const html = readFileSync('site/index.html', 'utf8');
    assert.match(html, /ymzz-loop\/tree\/product/);
    assert.equal(html.includes('/generate'), false);
  });
  it('docs explain product-only mechanism', () => {
    assert.equal(existsSync('docs/product-only.md'), true);
    const d = readFileSync('docs/product-only.md', 'utf8');
    assert.match(d, /no showcase site/i);
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
