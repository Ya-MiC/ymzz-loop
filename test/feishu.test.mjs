import { test } from "node:test";
import assert from "node:assert/strict";
import { feishuEnabled, reviewFields, holdingsRows } from "../scripts/sinks/feishu.mjs";

test("feishuEnabled requires four secrets", () => {
  assert.equal(feishuEnabled({}), false);
  assert.equal(feishuEnabled({ FEISHU_APP_ID: "a", FEISHU_APP_SECRET: "b" }), false);
  assert.equal(feishuEnabled({
    FEISHU_APP_ID: "a", FEISHU_APP_SECRET: "b",
    FEISHU_BITABLE_APP_TOKEN: "bas", FEISHU_BITABLE_TABLE_ID: "tbl",
  }), true);
});

test("reviewFields maps cols + Notion url", () => {
  const ctx = {
    reviewCols: ["日期 Date", "評分 Score"],
    reviewRow: ["2026-11-04", "8", "https://notion.so/x"],
  };
  const f = reviewFields(ctx);
  assert.equal(f["日期 Date"], "2026-11-04");
  assert.equal(f["評分 Score"], "8");
  assert.deepEqual(f.Notion, { link: "https://notion.so/x", text: "Notion" });
  assert.equal(reviewFields({ reviewRow: null }), null);
});

test("holdingsRows attaches sync stamp", () => {
  const rows = holdingsRows({
    holdingCols: ["標的 Ticker"],
    holdings: [["VT"], ["QQQ"]],
    time: { human: "測試" },
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].fields["標的 Ticker"], "VT");
  assert.equal(rows[1].fields["同步 Sync"], "測試");
});
