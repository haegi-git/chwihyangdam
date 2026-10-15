import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOARD_PAGE_SIZE,
  boardFilterHref,
  boardListHref,
  boardLocationDrift,
  boardPageCount,
  escapeLike,
  hobbyQuery,
  isSearchableQuery,
  likeContains,
  normalizeBoardQuery,
  pageWindow,
  parseBoardPage,
  parseBoardScope,
  splitHighlight,
  titleBodyOrFilter,
} from "./board.js";

describe("hobby board pages and search", () => {
  it("builds a shareable list url and drops the default page and scope", () => {
    assert.equal(boardListHref(), "/hobbies");
    assert.equal(
      boardListHref({
        categoryId: "cat",
        hobbyId: "hob",
        q: "다도",
        scope: "title",
        page: 2,
      }),
      "/hobbies?category=cat&hobby=hob&q=%EB%8B%A4%EB%8F%84&scope=title&page=2",
    );
    assert.equal(boardListHref({ q: "기록", scope: "all", page: 1 }), "/hobbies?q=%EA%B8%B0%EB%A1%9D");
    assert.equal(
      boardFilterHref({ categoryId: "cat", q: "기록", scope: "author" }),
      "/hobbies?category=cat&q=%EA%B8%B0%EB%A1%9D&scope=author",
    );
  });

  it("reads the hobby alias and normalizes a search", () => {
    assert.equal(hobbyQuery({ tag: "hob" }), "hob");
    assert.equal(hobbyQuery({ hobby: "kept", tag: "other" }), "kept");
    assert.equal(normalizeBoardQuery("  다도   기록  "), "다도 기록");
    assert.equal(normalizeBoardQuery("가".repeat(80)).length, 50);
    assert.equal(isSearchableQuery("  ㄱ "), false);
    assert.equal(isSearchableQuery(" 다도 "), true);
    assert.equal(parseBoardScope("title"), "title");
    assert.equal(parseBoardScope("author"), "author");
    assert.equal(parseBoardScope("all"), "all");
    assert.equal(parseBoardScope("body"), "all");
    assert.equal(parseBoardPage("2"), 2);
    assert.equal(parseBoardPage("0"), 1);
    assert.equal(parseBoardPage("nope"), 1);
    assert.equal(parseBoardPage("4000"), 1000);
    assert.equal(boardPageCount(0), 1);
    assert.equal(boardPageCount(15), 1);
    assert.equal(boardPageCount(16), 2);
    assert.equal(BOARD_PAGE_SIZE, 15);
  });

  it("escapes like wildcards before the title and body filter", () => {
    assert.equal(escapeLike("100%_a*b\\c"), "100\\%\\_a\\*b\\\\c");
    assert.equal(likeContains(" 100% "), "%100\\%%");
    assert.equal(
      titleBodyOrFilter("100%"),
      'title.ilike."%100\\\\%%",body.ilike."%100\\\\%%"',
    );
    assert.equal(
      titleBodyOrFilter('say "hi"'),
      'title.ilike."%say \\"hi\\"%",body.ilike."%say \\"hi\\"%"',
    );
  });

  it("windows page numbers and marks a drifted location", () => {
    assert.deepEqual(pageWindow(1, 10), [1, 2, 3, 4, 5, "…", 10]);
    assert.deepEqual(pageWindow(2, 10), [1, 2, 3, 4, 5, "…", 10]);
    assert.deepEqual(pageWindow(5, 10), [1, "…", 3, 4, 5, 6, 7, "…", 10]);
    assert.deepEqual(pageWindow(10, 10), [1, "…", 6, 7, 8, 9, 10]);
    assert.deepEqual(pageWindow(1, 3), [1, 2, 3]);
    assert.deepEqual(pageWindow(1, 0), []);
    assert.equal(
      boardLocationDrift({
        pageRaw: "2",
        qRaw: "다도",
        scopeRaw: "title",
        page: 2,
        q: "다도",
        scope: "title",
      }),
      false,
    );
    assert.equal(
      boardLocationDrift({
        pageRaw: "9",
        qRaw: "  다도  ",
        scopeRaw: "all",
        page: 2,
        q: "다도",
        scope: "all",
      }),
      true,
    );
    assert.equal(
      boardLocationDrift({
        pageRaw: undefined,
        qRaw: undefined,
        scopeRaw: undefined,
        page: 1,
        q: "",
        scope: "all",
      }),
      false,
    );
  });

  it("splits a title around a case-insensitive match", () => {
    assert.deepEqual(splitHighlight("다도 노트", "ㄱ"), [{ text: "다도 노트", match: false }]);
    assert.deepEqual(splitHighlight("Climbing log", "climb"), [
      { text: "Climb", match: true },
      { text: "ing log", match: false },
    ]);
    assert.deepEqual(splitHighlight("다도, 그리고 다도", "다도"), [
      { text: "다도", match: true },
      { text: ", 그리고 ", match: false },
      { text: "다도", match: true },
    ]);
  });
});
