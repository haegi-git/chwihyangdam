import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  nextSortOrder,
  parseSortOrder,
  prefixName,
  prefixNameError,
  selectedPrefixId,
} from "./prefixes.js";

const prefixes = [
  { id: "11111111-1111-4111-8111-111111111111", name: "정보", is_active: true, sort_order: 2 },
  { id: "22222222-2222-4222-8222-222222222222", name: "자유", is_active: false, sort_order: 1 },
];

describe("board prefixes", () => {
  it("accepts only an active prefix id from the list", () => {
    assert.equal(selectedPrefixId(prefixes[0].id, prefixes), prefixes[0].id);
    assert.equal(selectedPrefixId(prefixes[1].id, prefixes), "");
    assert.equal(selectedPrefixId(["not-a-prefix"], prefixes), "");
    assert.equal(selectedPrefixId(undefined, prefixes), "");
  });

  it("reads the prefix name without using tag text", () => {
    assert.equal(prefixName({ board_prefixes: { name: " 질문 " } }), "질문");
    assert.equal(prefixName({ board_prefixes: [{ name: "정보" }] }), "정보");
    assert.equal(prefixName({ hobby_tags: { name: "우표" }, title: "비밀 제목" }), "");
  });

  it("rejects an empty or long prefix name", () => {
    assert.equal(prefixNameError("  "), "말머리를 적어 주세요.");
    assert.equal(prefixNameError("질문"), "");
    assert.equal(prefixNameError("가".repeat(21)).length > 0, true);
  });

  it("keeps sort order inside a small range", () => {
    assert.equal(parseSortOrder("4", 1), 4);
    assert.equal(parseSortOrder("", 3), 3);
    assert.equal(parseSortOrder("99999", 0), 10000);
    assert.equal(nextSortOrder(prefixes), 3);
  });
});
