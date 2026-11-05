import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/** Must stay in sync with site/app.js todo TTL */
const TTL_MS = 60 * 60 * 1000 * 60; // 60 hours

function purgeItems(items, t0 = Date.now()) {
  return (items || []).filter(it => it && typeof it.created === 'number' && (t0 - it.created) < TTL_MS);
}
function storeExpired(exp, t0 = Date.now()) {
  return typeof exp === 'number' && t0 >= exp;
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
    assert.equal(storeExpired(undefined, t0), false);
  });
  it('TTL_MS is exactly 60 hours', () => {
    assert.equal(TTL_MS, 216_000_000);
  });
});
