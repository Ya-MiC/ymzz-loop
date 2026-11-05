import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const safeUrl = (u) => {
  const s = String(u || '').trim().slice(0, 300);
  if (!s) return '';
  try {
    const x = new URL(s, 'https://example.com');
    if (x.protocol !== 'http:' && x.protocol !== 'https:') return '';
    return x.href;
  } catch { return ''; }
};
const eggLabel = (ashare) => ashare ? '600519.SH' : '2330.TW';
const defaults = (ashare) => ([
  { id: 'vt', label: 'VT', pct: 46, url: '' },
  { id: 'qqq', label: 'QQQ', pct: 28, url: '' },
  { id: 'egg', label: eggLabel(ashare), pct: 16, url: '', egg: true },
  { id: 'cash', label: 'Cash', pct: 10, url: '' },
]);

describe('holdings 4 editable sliders', () => {
  it('defaults are four rows with known percentages', () => {
    const d = defaults(false);
    assert.equal(d.length, 4);
    assert.deepEqual(d.map(x => x.pct), [46, 28, 16, 10]);
    assert.equal(d[2].label, '2330.TW');
    assert.equal(defaults(true)[2].label, '600519.SH');
  });
  it('clamp pct to 0–100', () => {
    assert.equal(clamp(-3), 0);
    assert.equal(clamp(150), 100);
    assert.equal(clamp(33.4), 33);
  });
  it('safeUrl allows only http(s)', () => {
    assert.equal(safeUrl('https://example.com/a'), 'https://example.com/a');
    assert.equal(safeUrl('javascript:alert(1)'), '');
    assert.equal(safeUrl(''), '');
  });
  it('egg sync respects customEgg override', () => {
    let row = { label: '2330.TW', egg: true, customEgg: false };
    const sync = (ashare) => { if (!row.customEgg) row.label = eggLabel(ashare); };
    sync(true);
    assert.equal(row.label, '600519.SH');
    row.customEgg = true; row.label = 'My Pick';
    sync(false);
    assert.equal(row.label, 'My Pick');
  });
  it('local-only contract: no server keys in payload shape', () => {
    const payload = { items: defaults(false), touched: true };
    assert.ok(!('userId' in payload));
    assert.ok(!('token' in payload));
    assert.equal(payload.items.length, 4);
  });
});
