import { embeddedRow } from "./board.js";

export const CATEGORY_NAME_MAX = 20;

export function categoryOf(post) {
  return embeddedRow(post?.board_categories);
}

export function categoryName(post) {
  return categoryOf(post)?.name?.trim() || "";
}

export function trimCategoryName(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function categoryNameError(value) {
  const name = trimCategoryName(value);
  if (!name) {
    return "분류를 적어 주세요.";
  }
  if (name.length > CATEGORY_NAME_MAX) {
    return `분류는 ${CATEGORY_NAME_MAX}자까지입니다.`;
  }
  return "";
}

export function defaultCategoryId(categories) {
  const list = (Array.isArray(categories) ? categories : []).filter(
    (row) => row?.id && row.is_active !== false,
  );
  const free = list.find((row) => row.name?.trim() === "자유");
  return free?.id || list[0]?.id || "";
}
