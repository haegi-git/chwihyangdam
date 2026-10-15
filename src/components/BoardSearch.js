"use client";

import { BOARD_SEARCH_MAX } from "@/lib/board";

export default function BoardSearch({ categoryId = "", hobbyId = "", q = "", scope = "all" }) {
  function onSubmit(event) {
    const select = event.currentTarget.elements.namedItem("scope");
    if (select && select.value === "all") {
      select.disabled = true;
    }
  }

  function onScopeChange(event) {
    const form = event.currentTarget.form;
    const value = new FormData(form).get("q");
    if (typeof value === "string" && value.trim().length >= 2) {
      form.requestSubmit();
    }
  }

  return (
    <form
      key={`${q}:${scope}`}
      action="/hobbies"
      method="get"
      className="board-search"
      onSubmit={onSubmit}
    >
      {categoryId ? <input type="hidden" name="category" value={categoryId} /> : null}
      {hobbyId ? <input type="hidden" name="hobby" value={hobbyId} /> : null}
      <div className="board-search-line">
        <label className="sr-only" htmlFor="board-q">
          검색
        </label>
        <button type="submit" className="board-search-icon" aria-label="검색">
          <SearchIcon />
        </button>
        <input
          id="board-q"
          name="q"
          defaultValue={q}
          maxLength={BOARD_SEARCH_MAX}
          className="lined-strip board-search-input"
          placeholder="두 글자 이상"
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>
      <label className="sr-only" htmlFor="board-scope">
        검색 범위
      </label>
      <select
        id="board-scope"
        name="scope"
        defaultValue={scope}
        className="board-scope cursor-pointer"
        onChange={onScopeChange}
      >
        <option value="all">제목+본문</option>
        <option value="title">제목</option>
        <option value="author">작성자</option>
      </select>
    </form>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
