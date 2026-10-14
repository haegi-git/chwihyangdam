import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boardFilterHref,
  categoryQuery,
  composeHref,
  emptyBoardCopy,
  nextSortOrder,
  parseSortOrder,
  selectedActiveId,
} from "./board.js";
import { categoryName, categoryNameError, defaultCategoryId } from "./categories.js";
import { hobbyName, hobbyNameError } from "./hobby-tags.js";
import {
  categoryChoices,
  hobbyChoices,
  initialCategoryId,
  initialHobbyId,
  postLabelWriteError,
} from "./post-labels.js";

const categories = [
  { id: "11111111-1111-4111-8111-111111111111", name: "자유", is_active: true, sort_order: 1 },
  { id: "22222222-2222-4222-8222-222222222222", name: "정보", is_active: true, sort_order: 2 },
  { id: "33333333-3333-4333-8333-333333333333", name: "질문", is_active: false, sort_order: 3 },
];

const hobbies = [
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "클라이밍", is_active: true, sort_order: 1 },
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "다도", is_active: false, sort_order: 2 },
];

describe("board categories and hobby labels", () => {
  it("accepts only an active id from the list", () => {
    assert.equal(selectedActiveId(categories[0].id, categories), categories[0].id);
    assert.equal(selectedActiveId(categories[2].id, categories), "");
    assert.equal(selectedActiveId(["not-a-row"], categories), "");
    assert.equal(selectedActiveId(undefined, categories), "");
  });

  it("reads category and hobby names from their own embeds", () => {
    assert.equal(categoryName({ board_categories: { name: " 질문 " } }), "질문");
    assert.equal(categoryName({ board_categories: [{ name: "정보" }] }), "정보");
    assert.equal(categoryName({ hobby_tags: { name: "다도" } }), "");
    assert.equal(hobbyName({ hobby_tags: { name: " 클라이밍 " } }), "클라이밍");
    assert.equal(hobbyName({ hobby_tags: [{ name: "공예" }] }), "공예");
    assert.equal(hobbyName({ board_categories: { name: "자유" }, title: "비밀 제목" }), "");
  });

  it("rejects an empty or long label", () => {
    assert.equal(categoryNameError("  "), "분류를 적어 주세요.");
    assert.equal(categoryNameError("질문"), "");
    assert.equal(categoryNameError("가".repeat(21)).includes("20"), true);
    assert.equal(hobbyNameError("  "), "말머리를 적어 주세요.");
    assert.equal(hobbyNameError("클라이밍"), "");
    assert.equal(hobbyNameError("가".repeat(21)).includes("20"), true);
  });

  it("keeps sort order inside a small range", () => {
    assert.equal(parseSortOrder("4", 1), 4);
    assert.equal(parseSortOrder("", 3), 3);
    assert.equal(parseSortOrder("99999", 0), 10000);
    assert.equal(nextSortOrder(categories), 4);
  });

  it("builds filter and compose links without dropping the other label", () => {
    assert.equal(boardFilterHref(), "/hobbies");
    assert.equal(
      boardFilterHref({ categoryId: categories[1].id, hobbyId: hobbies[0].id }),
      `/hobbies?category=${categories[1].id}&hobby=${hobbies[0].id}`,
    );
    assert.equal(composeHref({ categoryId: categories[0].id }), `/hobbies/new?category=${categories[0].id}`);
    assert.equal(categoryQuery({ prefix: categories[0].id }), categories[0].id);
    assert.equal(categoryQuery({ category: categories[1].id, prefix: "older" }), categories[1].id);
  });

  it("defaults new posts to 자유 and keeps an inactive label on edit", () => {
    assert.equal(defaultCategoryId(categories), categories[0].id);
    assert.equal(initialCategoryId(null, categories), categories[0].id);
    assert.equal(
      initialCategoryId({ category_id: categories[1].id }, categories),
      categories[1].id,
    );

    const hiddenId = "44444444-4444-4444-8444-444444444444";
    const post = {
      category_id: hiddenId,
      hobby_tag_id: hobbies[1].id,
      board_categories: { name: "기록" },
      hobby_tags: { name: "다도" },
    };
    assert.equal(categoryChoices(post, [categories[0]]).at(0)?.name, "기록");
    assert.equal(initialCategoryId(post, [categories[0]]), hiddenId);
    assert.equal(hobbyChoices(post, [hobbies[0]]).at(0)?.name, "다도");
    assert.equal(initialHobbyId(post, [hobbies[0]]), hobbies[1].id);
    assert.equal(initialHobbyId({ hobby_tag_id: null }, hobbies), "");
  });

  it("describes an empty filtered board and maps database checks", () => {
    assert.equal(emptyBoardCopy({ category: categories[1] }).title, "이 분류에는 아직 글이 없습니다");
    assert.equal(
      emptyBoardCopy({ hobby: hobbies[0] }).body,
      "[클라이밍] 말머리로 짧은 기록을 남겨도 좋습니다.",
    );
    assert.equal(
      postLabelWriteError({ message: "category is not active" }, "실패"),
      "고른 분류는 지금 쓸 수 없습니다. 다른 분류를 골라 주세요.",
    );
    assert.equal(
      postLabelWriteError({ message: "hobby tag is not active" }, "실패"),
      "고른 말머리는 지금 쓸 수 없습니다.",
    );
    assert.equal(
      postLabelWriteError({ message: 'null value in column "category_id"' }, "실패"),
      "분류를 골라 주세요.",
    );
    assert.equal(postLabelWriteError({ message: "network" }, "실패"), "실패");
  });
});
