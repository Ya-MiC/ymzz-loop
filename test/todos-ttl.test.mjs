import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/** Must stay in sync with site/app.js todo TTL + max slots */
const TTL_MS = 60 * 60 * 1000 * 60; // 60 hours
const MAX = 6;
const SLOT0 = 3;

function purgeItems(items, t0 = Date.now()) {
  return (items || []).filter(it => it && typeof it.created === 'number' && (t0 - it.created) < TTL_MS).slice(0, MAX);
}
function storeExpired(exp, t0 = Date.now()) {
  return typeof exp === 'number' && t0 >= exp;
}
function canAdd(items) {
  return purgeItems(items).length < MAX;
}
function nextPn(items) {
  return String(SLOT0 + purgeItems(items).length).padStart(2, '0');
}

describe('todo 60h cookie/localStorage TTL', () => {
  it('keeps items younger than 60h', () => {
    const t0 = 1_000_000_000_000;
    const items = [
      { id: 'a', text: 'fresh', created: t0 - 1000 },
      { id: 'b', text: 'ok', created: t0 - (TTL_MS - 1) },
    ];
    assert.equal(purgeItems(items, t0).length, 2);
  });
  it('drops items at or past 60h', () => {
    const t0 = 1_000_000_000_000;
    const items = [
      { id: 'a', text: 'old', created: t0 - TTL_MS },
      { id: 'b', text: 'older', created: t0 - TTL_MS - 1 },
      { id: 'c', text: 'fresh', created: t0 - 10 },
    ];
    const kept = purgeItems(items, t0);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].id, 'c');
  });
  it('store exp gate wipes when now >= exp', () => {
    const t0 = 5_000;
    assert.equal(storeExpired(t0, t0), true);
    assert.equal(storeExpired(t0 + 1, t0), false);
  });
  it('TTL_MS is exactly 60 hours', () => {
    assert.equal(TTL_MS, 216_000_000);
  });
});

describe('todo max 6 slots (03–08)', () => {
  it('numbers first six as 03..08', () => {
    const t0 = Date.now();
    const items = Array.from({ length: 6 }, (_, i) => ({ id: String(i), text: 'x', created: t0 }));
    assert.equal(nextPn([]), '03');
    assert.equal(nextPn(items.slice(0, 1)), '04');
    assert.equal(nextPn(items.slice(0, 5)), '08');
    assert.equal(canAdd(items), false);
    assert.equal(canAdd(items.slice(0, 5)), true);
  });
  it('purge caps at 6 even if more stored', () => {
    const t0 = Date.now();
    const items = Array.from({ length: 9 }, (_, i) => ({ id: String(i), text: 'x', created: t0 }));
    assert.equal(purgeItems(items, t0).length, 6);
  });
  it('zh-Hant limit copy is exact', async () => {
    const { readFileSync } = await import('node:fs');
    const d = JSON.parse(readFileSync(new URL('../site/i18n/zh-Hant.json', import.meta.url), 'utf8'));
    assert.equal(d['todo.limit'], '如果 6 個代辦不能滿足您的期待，那您剛才一定輸入了一個偽需求。');
  });
});
