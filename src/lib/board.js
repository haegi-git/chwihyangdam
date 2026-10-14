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

export function boardFilterHref({ categoryId = "", hobbyId = "" } = {}) {
  const params = new URLSearchParams();
  if (categoryId) {
    params.set("category", categoryId);
  }
  if (hobbyId) {
    params.set("hobby", hobbyId);
  }
  const query = params.toString();
  return query ? `/hobbies?${query}` : "/hobbies";
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
  const value = params?.hobby;
  return Array.isArray(value) ? value[0] : value;
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
