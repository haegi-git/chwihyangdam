import { isPostId } from "@/lib/hobbies";

export const REPORT_DAILY_CAP = 10;
export const REPORT_DETAIL_MAX = 500;

export const REPORT_TARGET_TYPES = ["post", "comment"];

export const REPORT_REASONS = [
  { value: "hate_abuse", label: "혐오·욕설" },
  { value: "baseless_attack", label: "근거 없는 비난" },
  { value: "conflict_bait", label: "싸움 걸기" },
  { value: "spam", label: "스팸" },
  { value: "other", label: "그 밖의 이유" },
];

export const MODERATION_ACTIONS = [
  { value: "cleared", label: "문제없음", hint: "가림을 풀고 다시 보여 줍니다." },
  { value: "keep_hidden", label: "가리기 유지", hint: "이 자리에선 보이지 않게 둡니다." },
  { value: "removed", label: "삭제", hint: "글이나 댓글을 거둡니다. 계정은 막지 않습니다." },
];

const REASON_BY_VALUE = new Map(REPORT_REASONS.map((reason) => [reason.value, reason.label]));
const ACTION_BY_VALUE = new Map(MODERATION_ACTIONS.map((action) => [action.value, action.label]));

export function reportReasonLabel(value) {
  return REASON_BY_VALUE.get(value) || value || "";
}

export function moderationActionLabel(value) {
  return ACTION_BY_VALUE.get(value) || value || "";
}

export function isReportTargetType(value) {
  return REPORT_TARGET_TYPES.includes(value);
}

export function isReportReason(value) {
  return REASON_BY_VALUE.has(value);
}

export function startOfSeoulDayIso(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return `${date}T00:00:00+09:00`;
}

export function trimReportDetail(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, REPORT_DETAIL_MAX);
}

export function reportErrorMessage(error) {
  const code = String(error?.code ?? "");
  const text = String(error?.message ?? "").toLowerCase();

  if (code === "23505" || text.includes("duplicate") || text.includes("unique")) {
    return "이미 이 글을 살펴 달라고 해 주셨어요.";
  }

  if (code === "P0001" || text.includes("cannot report own")) {
    return "내가 남긴 글은 신고하지 않아도 됩니다.";
  }

  if (code === "23514") {
    return "신고 내용을 다시 살펴 주세요.";
  }

  return "지금은 담지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}

export function reasonBreakdown(reports = []) {
  const counts = new Map();

  for (const report of reports) {
    const key = report?.reason;
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return REPORT_REASONS.map((reason) => ({
    ...reason,
    count: counts.get(reason.value) || 0,
  })).filter((reason) => reason.count > 0);
}

export async function countReportsToday(supabase, reporterId) {
  if (!reporterId) {
    return 0;
  }

  const { count, error } = await supabase
    .from("content_reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", reporterId)
    .gte("created_at", startOfSeoulDayIso());

  if (error) {
    console.error("content_reports count", error);
    return 0;
  }

  return Number(count ?? 0);
}

export async function requestModerationAiDraft({ targetType, targetId, force = false }) {
  if (!isReportTargetType(targetType) || !isPostId(targetId)) {
    return { ok: false };
  }

  try {
    const response = await fetch("/api/moderation/ai-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, force }),
    });

    if (!response.ok) {
      return { ok: false };
    }

    return response.json();
  } catch (error) {
    console.error("moderation ai draft", error);
    return { ok: false };
  }
}

export async function fetchPendingModerationInbox(supabase) {
  const { data: reviews, error } = await supabase
    .from("moderation_reviews")
    .select(
      "id, target_type, target_id, status, distinct_report_count, ai_label, ai_summary, ai_suggested_action, ai_reviewed_at, created_at, updated_at",
    )
    .eq("status", "pending")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("moderation_reviews", error);
    return [];
  }

  const list = reviews ?? [];

  if (!list.length) {
    return [];
  }

  const postIds = list.filter((row) => row.target_type === "post").map((row) => row.target_id);
  const commentIds = list.filter((row) => row.target_type === "comment").map((row) => row.target_id);
  const targetIds = list.map((row) => row.target_id);

  const [postsResult, commentsResult, reportsResult] = await Promise.all([
    postIds.length
      ? supabase
          .from("hobby_posts")
          .select("id, title, body, author_id, hidden_at, image_urls, hobby_tags ( slug, name )")
          .in("id", postIds)
      : Promise.resolve({ data: [], error: null }),
    commentIds.length
      ? supabase
          .from("hobby_comments")
          .select("id, body, author_id, post_id, hidden_at, parent_id")
          .in("id", commentIds)
      : Promise.resolve({ data: [], error: null }),
    targetIds.length
      ? supabase
          .from("content_reports")
          .select("id, target_type, target_id, reason, detail, created_at")
          .in("target_id", targetIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (postsResult.error) {
    console.error("moderation posts", postsResult.error);
  }
  if (commentsResult.error) {
    console.error("moderation comments", commentsResult.error);
  }
  if (reportsResult.error) {
    console.error("moderation reports", reportsResult.error);
  }

  const posts = new Map((postsResult.data ?? []).map((row) => [row.id, row]));
  const comments = new Map((commentsResult.data ?? []).map((row) => [row.id, row]));
  const reportsByTarget = new Map();

  for (const report of reportsResult.data ?? []) {
    const key = `${report.target_type}:${report.target_id}`;
    const bucket = reportsByTarget.get(key) ?? [];
    bucket.push(report);
    reportsByTarget.set(key, bucket);
  }

  const authorIds = [
    ...new Set(
      [...posts.values(), ...comments.values()]
        .map((row) => row.author_id)
        .filter(Boolean),
    ),
  ];

  let authors = new Map();

  if (authorIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", authorIds);

    if (profileError) {
      console.error("moderation authors", profileError);
    } else {
      authors = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    }
  }

  return list.map((review) => {
    const key = `${review.target_type}:${review.target_id}`;
    const reports = (reportsByTarget.get(key) ?? []).filter(
      (report) => report.target_type === review.target_type,
    );
    const post = review.target_type === "post" ? posts.get(review.target_id) ?? null : null;
    const comment = review.target_type === "comment" ? comments.get(review.target_id) ?? null : null;
    const target = post || comment;
    const author = target ? authors.get(target.author_id) ?? null : null;

    return {
      ...review,
      post,
      comment,
      author,
      reports,
      reasons: reasonBreakdown(reports),
    };
  });
}
