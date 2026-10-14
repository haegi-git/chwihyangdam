import { embeddedRow } from "./board.js";

export const HOBBY_NAME_MAX = 20;

export function hobbyOf(post) {
  return embeddedRow(post?.hobby_tags);
}

export function hobbyName(post) {
  return hobbyOf(post)?.name?.trim() || "";
}

export function trimHobbyName(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function hobbyNameError(value) {
  const name = trimHobbyName(value);
  if (!name) {
    return "말머리를 적어 주세요.";
  }
  if (name.length > HOBBY_NAME_MAX) {
    return `말머리는 ${HOBBY_NAME_MAX}자까지입니다.`;
  }
  return "";
}
