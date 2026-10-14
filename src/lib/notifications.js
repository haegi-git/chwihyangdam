import { isPostId } from "./hobbies.js";

export const NOTIFICATION_LIMIT = 80;

const PROFILE_FACE_SELECT = "id, display_name, avatar_url";

export function notificationHref(item) {
  if (item?.type === "friend_request" || item?.type === "friend_accepted") {
    return "/friends";
  }

  if (
    (item?.type === "post_comment" || item?.type === "comment_reply") &&
    isPostId(item.post_id)
  ) {
    return `/hobbies/post/${item.post_id}#comments`;
  }

  return "/notifications";
}

function actorDid(item) {
  const name = item?.actor?.display_name?.trim();
  return name ? `${name} 님이` : "누군가";
}

export function notificationText(item) {
  const actor = actorDid(item);

  switch (item?.type) {
    case "friend_request":
      return `${actor} 친구를 요청했습니다.`;
    case "friend_accepted":
      return `${actor} 친구 요청을 받아 주었습니다.`;
    case "post_comment":
      return `${actor} 내 글에 댓글을 남겼습니다.`;
    case "comment_reply":
      return `${actor} 내 댓글에 답글을 남겼습니다.`;
    default:
      return "새 소식이 있습니다.";
  }
}

export function formatNotificationTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function fetchNotifications(supabase, limit = NOTIFICATION_LIMIT) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, actor_id, type, post_id, comment_id, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("notifications", error);
    return [];
  }

  return attachActors(supabase, data ?? []);
}

export async function fetchUnreadNotificationCount(supabase) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) {
    console.error("notification count", error);
    return 0;
  }

  return count ?? 0;
}

async function attachActors(supabase, rows) {
  if (!rows.length) {
    return [];
  }

  const ids = [...new Set(rows.map((row) => row.actor_id).filter(Boolean))];
  if (!ids.length) {
    return rows.map((row) => ({ ...row, actor: null }));
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FACE_SELECT)
    .in("id", ids);

  if (error) {
    console.error("notification actors", error);
    return rows.map((row) => ({ ...row, actor: null }));
  }

  const byId = new Map((data ?? []).map((profile) => [profile.id, profile]));
  return rows.map((row) => ({
    ...row,
    actor: byId.get(row.actor_id) ?? null,
  }));
}
