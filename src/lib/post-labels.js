import { categoryName, defaultCategoryId } from "./categories.js";
import { hobbyName } from "./hobby-tags.js";

export function categoryChoices(post, categories) {
  const list = (Array.isArray(categories) ? categories : []).filter((row) => row?.id);
  const currentId = post?.category_id;
  if (currentId && !list.some((row) => row.id === currentId)) {
    return [
      {
        id: currentId,
        name: categoryName(post) || "현재 분류",
        is_active: false,
        preserved: true,
      },
      ...list,
    ];
  }
  return list;
}

export function initialCategoryId(post, categories) {
  const choices = categoryChoices(post, categories);
  if (post?.category_id && choices.some((row) => row.id === post.category_id)) {
    return post.category_id;
  }
  return defaultCategoryId(categories);
}

export function hobbyChoices(post, hobbies) {
  const list = (Array.isArray(hobbies) ? hobbies : []).filter((row) => row?.id);
  const currentId = post?.hobby_tag_id;
  if (currentId && !list.some((row) => row.id === currentId)) {
    return [
      {
        id: currentId,
        name: hobbyName(post) || "현재 말머리",
        is_active: false,
        preserved: true,
      },
      ...list,
    ];
  }
  return list;
}

export function initialHobbyId(post, hobbies) {
  const choices = hobbyChoices(post, hobbies);
  if (post?.hobby_tag_id && choices.some((row) => row.id === post.hobby_tag_id)) {
    return post.hobby_tag_id;
  }
  return "";
}

export const HOBBY_TITLE_MAX = 20;

export function hobbyTitleLength(value) {
  return Array.from(String(value ?? "").trim()).length;
}

export function hobbyTitleError(value) {
  if (hobbyTitleLength(value) > HOBBY_TITLE_MAX) {
    return `제목은 ${HOBBY_TITLE_MAX}자까지 적을 수 있습니다.`;
  }
  return "";
}

export function postLabelWriteError(error, fallback) {
  const text = String(error?.message ?? "").toLowerCase();
  if (text.includes("hobby_posts_title_length")) {
    return `제목은 ${HOBBY_TITLE_MAX}자까지 적을 수 있습니다.`;
  }
  if (
    text.includes("category is required") ||
    (text.includes("category_id") && text.includes("null"))
  ) {
    return "분류를 골라 주세요.";
  }
  if (text.includes("category is not active")) {
    return "고른 분류는 지금 쓸 수 없습니다. 다른 분류를 골라 주세요.";
  }
  if (text.includes("hobby tag is not active")) {
    return "고른 말머리는 지금 쓸 수 없습니다.";
  }
  return fallback;
}
