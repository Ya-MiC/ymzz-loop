import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { suggestedNickname, validatePhone, chapterDay, chapterRemaining } from "./lib/steward.mjs";

describe("ymzz steward sdk", () => {
  it("builds a nickname from the last four digits and skips an empty phone", () => {
    assert.equal(suggestedNickname("+82 10-1234-5678"), "用戶5678");
    assert.equal(suggestedNickname(""), "用戶");
    assert.equal(validatePhone("12ab345678").ok, false);
    assert.equal(validatePhone("123").ok, false);
    assert.equal(validatePhone("").skipped, true);
  });

  it("counts a 600-day chapter without calling the network", () => {
    assert.equal(chapterDay("2026-01-01", "2026-01-01"), 1);
    assert.equal(chapterRemaining("2026-01-01", "2026-01-01"), 600);
    assert.equal(chapterRemaining("2024-01-01", "2026-11-10"), 0);
  });
});
