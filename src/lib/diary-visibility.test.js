import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diaryVisibilityAria, diaryVisibilityLabel } from "./diary.js";

describe("diary visibility labels", () => {
  it("names the two writing modes", () => {
    assert.equal(diaryVisibilityLabel(false), "나만 보기");
    assert.equal(diaryVisibilityLabel(true), "친구 공개");
    assert.equal(diaryVisibilityLabel(false, { compact: true }), "비공개");
    assert.equal(diaryVisibilityLabel(true, { compact: true }), "공개");
    assert.equal(diaryVisibilityAria(false), "나만 보기 (비공개)");
    assert.equal(diaryVisibilityAria(true), "친구 공개");
  });
});
