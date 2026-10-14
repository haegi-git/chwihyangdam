import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blockErrorMessage, canBlock } from "./blocks.js";

const me = "11111111-1111-4111-8111-111111111111";
const them = "22222222-2222-4222-8222-222222222222";

describe("block helpers", () => {
  it("refuses a missing id and a self block", () => {
    assert.equal(canBlock(me, them), true);
    assert.equal(canBlock(me, me), false);
    assert.equal(canBlock("", them), false);
    assert.equal(canBlock(me, ""), false);
    assert.equal(canBlock(null, them), false);
  });

  it("maps database errors without naming the other person", () => {
    assert.equal(blockErrorMessage({ code: "23514" }), "나를 차단할 수는 없습니다.");
    assert.equal(blockErrorMessage({ code: "23505" }), "");
    assert.equal(blockErrorMessage({ code: "42501" }), "지금은 차단하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    assert.equal(blockErrorMessage(null), "지금은 차단하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  });
});
