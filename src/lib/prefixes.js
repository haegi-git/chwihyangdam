export const PREFIX_NAME_MAX = 20;

export function prefixOf(post) {
  const value = post?.board_prefixes;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export function prefixName(post) {
  return prefixOf(post)?.name?.trim() || "";
}

export function trimPrefixName(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function prefixNameError(value) {
  const name = trimPrefixName(value);
  if (!name) {
    return "말머리를 적어 주세요.";
  }
  if (name.length > PREFIX_NAME_MAX) {
    return `말머리는 ${PREFIX_NAME_MAX}자까지입니다.`;
  }
  return "";
}

export function selectedPrefixId(value, prefixes) {
  const id = Array.isArray(value) ? value[0] : value;
  if (typeof id !== "string" || !id) {
    return "";
  }

  const match = (Array.isArray(prefixes) ? prefixes : []).find(
    (prefix) => prefix?.id === id && prefix.is_active !== false,
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

export function nextSortOrder(prefixes) {
  const max = (Array.isArray(prefixes) ? prefixes : []).reduce(
    (highest, prefix) => Math.max(highest, Number(prefix?.sort_order) || 0),
    0,
  );
  return max + 1;
}
