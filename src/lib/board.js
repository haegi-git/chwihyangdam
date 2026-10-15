export function embeddedRow(value) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function selectedActiveId(value, rows) {
  const id = Array.isArray(value) ? value[0] : value;
  if (typeof id !== "string" || !id) {
    return "";
  }

  const match = (Array.isArray(rows) ? rows : []).find(
    (row) => row?.id === id && row.is_active !== false,
  );
  return match ? match.id : "";
}

export function parseSortOrder(value, fallback = 0) {
  const number = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(Math.max(number, -1000), 10000);
}

export function nextSortOrder(rows) {
  const max = (Array.isArray(rows) ? rows : []).reduce(
    (highest, row) => Math.max(highest, Number(row?.sort_order) || 0),
    0,
  );
  return max + 1;
}

export const BOARD_PAGE_SIZE = 15;
export const BOARD_SEARCH_MIN = 2;
export const BOARD_SEARCH_MAX = 50;

export function firstParam(value) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function boardListHref({
  categoryId = "",
  hobbyId = "",
  q = "",
  scope = "all",
  page = 1,
} = {}) {
  const params = new URLSearchParams();
  if (categoryId) {
    params.set("category", categoryId);
  }
  if (hobbyId) {
    params.set("hobby", hobbyId);
  }
  if (q) {
    params.set("q", q);
  }
  if (scope === "title" || scope === "author") {
    params.set("scope", scope);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `/hobbies?${query}` : "/hobbies";
}

export function boardFilterHref({ categoryId = "", hobbyId = "", q = "", scope = "all" } = {}) {
  return boardListHref({ categoryId, hobbyId, q, scope, page: 1 });
}

export function composeHref({ categoryId = "", hobbyId = "" } = {}) {
  const params = new URLSearchParams();
  if (categoryId) {
    params.set("category", categoryId);
  }
  if (hobbyId) {
    params.set("hobby", hobbyId);
  }
  const query = params.toString();
  return query ? `/hobbies/new?${query}` : "/hobbies/new";
}

export function categoryQuery(params) {
  const value = params?.category || params?.prefix;
  return Array.isArray(value) ? value[0] : value;
}

export function hobbyQuery(params) {
  const value = firstParam(params?.hobby) || firstParam(params?.tag);
  return value;
}

export function searchQuery(params) {
  return normalizeBoardQuery(firstParam(params?.q));
}

export function normalizeBoardQuery(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, BOARD_SEARCH_MAX);
}

export function isSearchableQuery(value) {
  return normalizeBoardQuery(value).length >= BOARD_SEARCH_MIN;
}

export function parseBoardScope(value) {
  const scope = firstParam(value);
  return scope === "title" || scope === "author" ? scope : "all";
}

export function parseBoardPage(value) {
  const raw = firstParam(value);
  const number = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(number) || number < 1) {
    return 1;
  }
  return Math.min(number, 1000);
}

export function boardPageCount(total, size = BOARD_PAGE_SIZE) {
  const count = Number(total) || 0;
  if (count <= 0) {
    return 1;
  }
  return Math.ceil(count / size);
}

export function boardLocationDrift({ pageRaw, qRaw, scopeRaw, page, q, scope }) {
  const nextPage = page > 1 ? String(page) : "";
  const nextScope = scope === "title" || scope === "author" ? scope : "";
  const rawPage = pageRaw == null ? "" : String(pageRaw);
  const rawQ = qRaw == null ? "" : String(qRaw);
  const rawScope = scopeRaw == null || scopeRaw === "" ? "" : String(scopeRaw);
  const scopeToken = rawScope === "title" || rawScope === "author" ? rawScope : rawScope ? "__drop__" : "";
  return rawPage !== nextPage || rawQ !== q || scopeToken !== nextScope;
}

export function escapeLike(value) {
  return String(value).replace(/[\\%_*]/g, (char) => `\\${char}`);
}

export function likeContains(value) {
  return `%${escapeLike(normalizeBoardQuery(value))}%`;
}

export function quoteFilterValue(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function titleBodyOrFilter(value) {
  const quoted = quoteFilterValue(likeContains(value));
  return `title.ilike.${quoted},body.ilike.${quoted}`;
}

export function pageWindow(current, total, size = 5) {
  const pages = Math.max(0, Number(total) || 0);
  if (pages <= 0) {
    return [];
  }

  const width = Math.max(1, size);
  const currentPage = Math.min(Math.max(Number(current) || 1, 1), pages);
  if (pages <= width) {
    return Array.from({ length: pages }, (_, index) => index + 1);
  }

  let start = Math.max(1, currentPage - Math.floor((width - 1) / 2));
  let end = Math.min(pages, start + width - 1);
  start = Math.max(1, end - width + 1);
  end = Math.min(pages, start + width - 1);

  const items = [];
  if (start > 1) {
    items.push(1);
    if (start > 2) {
      items.push("…");
    }
  }
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < pages) {
    if (end < pages - 1) {
      items.push("…");
    }
    items.push(pages);
  }
  return items;
}

export function splitHighlight(text, term) {
  const source = String(text ?? "");
  const needle = normalizeBoardQuery(term);
  if (needle.length < BOARD_SEARCH_MIN || !source) {
    return [{ text: source, match: false }];
  }

  const lower = source.toLocaleLowerCase("ko-KR");
  const query = needle.toLocaleLowerCase("ko-KR");
  const parts = [];
  let cursor = 0;

  while (cursor < source.length) {
    const index = lower.indexOf(query, cursor);
    if (index === -1) {
      parts.push({ text: source.slice(cursor), match: false });
      break;
    }
    if (index > cursor) {
      parts.push({ text: source.slice(cursor, index), match: false });
    }
    parts.push({ text: source.slice(index, index + needle.length), match: true });
    cursor = index + needle.length;
  }

  return parts.filter((part) => part.text);
}

export function emptySearchCopy(q) {
  return {
    title: "찾지 못했습니다",
    body: `“${q}”에 맞는 글이 아직 없습니다.`,
  };
}

export function emptyBoardCopy({ category, hobby, configured = true } = {}) {
  if (category && hobby) {
    return {
      title: "이 자리에는 아직 글이 없습니다",
      body: `${category.name}의 [${hobby.name}] 말머리로 짧은 기록을 남겨도 좋습니다.`,
    };
  }

  if (category) {
    return {
      title: "이 분류에는 아직 글이 없습니다",
      body: `${category.name}에 짧은 기록을 남겨도 좋습니다.`,
    };
  }

  if (hobby) {
    return {
      title: "이 말머리에는 아직 글이 없습니다",
      body: `[${hobby.name}] 말머리로 짧은 기록을 남겨도 좋습니다.`,
    };
  }

  return {
    title: "아직 글이 없습니다",
    body: configured
      ? "이 게시판의 첫 기록을 남겨 두어도 좋습니다. 짧게라도 충분합니다."
      : "로컬에서는 .env.local에 Supabase 주소를 적어 주세요.",
  };
}
