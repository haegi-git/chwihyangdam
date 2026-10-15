import { isPostId } from "./hobbies.js";

export const REPORT_DAILY_CAP = 10;
export const REPORT_DETAIL_MAX = 500;

export const REPORT_TARGET_TYPES = ["post", "comment", "user"];

export const REPORT_REASONS = [
  { value: "hate_abuse", label: "혐오·욕설" },
  { value: "baseless_attack", label: "근거 없는 비난" },
  { value: "conflict_bait", label: "싸움 걸기" },
  { value: "spam", label: "스팸" },
  { value: "other", label: "그 밖의 이유" },
];

export const MODERATION_ACTIONS = [
  { value: "cleared", label: "유지", hint: "가림을 풀고 신고를 접습니다." },
  { value: "keep_hidden", label: "숨김 확정", hint: "가린 채로 둡니다." },
  { value: "removed", label: "삭제", hint: "글이나 댓글을 거둡니다. 계정은 막지 않습니다." },
];

export const REPORT_TYPE_FILTERS = [
  { value: "all", label: "전체" },
  { value: "post", label: "게시글" },
  { value: "comment", label: "댓글" },
  { value: "user", label: "사용자" },
];

export const REPORT_STATUS_FILTERS = [
  { value: "pending", label: "대기" },
  { value: "done", label: "처리됨" },
  { value: "all", label: "모두" },
];

export const REPORT_SORT_FILTERS = [
  { value: "newest", label: "최신" },
  { value: "count", label: "신고 많은 순" },
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
    return "이미 살펴 달라고 해 주셨어요.";
  }

  if (code === "P0001" || text.includes("cannot report own")) {
    return "내가 남긴 것은 신고하지 않아도 됩니다.";
  }

  if (code === "23514") {
    return "신고 내용을 다시 살펴 주세요.";
  }

  return "지금은 담지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}

export function reportInboxStatus(reviewStatus) {
  if (!reviewStatus || reviewStatus === "pending") {
    return "pending";
  }

  return "done";
}

export function reportFiltersFrom(params = {}) {
  const type = REPORT_TYPE_FILTERS.some((item) => item.value === params.type) ? params.type : "all";
  const status = REPORT_STATUS_FILTERS.some((item) => item.value === params.status)
    ? params.status
    : "pending";
  const sort = params.sort === "count" ? "count" : "newest";

  return { type, status, sort };
}

export function groupReportedTargets(reports = [], reviews = []) {
  const reviewByKey = new Map(
    (Array.isArray(reviews) ? reviews : []).map((review) => [
      `${review.target_type}:${review.target_id}`,
      review,
    ]),
  );
  const groups = new Map();

  for (const report of Array.isArray(reports) ? reports : []) {
    if (!isReportTargetType(report?.target_type) || !report?.target_id) {
      continue;
    }

    const key = `${report.target_type}:${report.target_id}`;
    let group = groups.get(key);

    if (!group) {
      const review = reviewByKey.get(key) ?? null;
      group = {
        key,
        id: review?.id || key,
        reviewId: review?.id || "",
        target_type: report.target_type,
        target_id: report.target_id,
        status: review?.status || "pending",
        inboxStatus: reportInboxStatus(review?.status),
        reports: [],
        reporterIds: new Set(),
        latest_at: report.created_at || "",
        ai_label: review?.ai_label || "",
        ai_summary: review?.ai_summary || "",
        ai_suggested_action: review?.ai_suggested_action || "",
      };
      groups.set(key, group);
    }

    group.reports.push(report);

    if (report.reporter_id) {
      group.reporterIds.add(report.reporter_id);
    }

    if (report.created_at && report.created_at > group.latest_at) {
      group.latest_at = report.created_at;
    }
  }

  return [...groups.values()].map((group) => ({
    key: group.key,
    id: group.id,
    reviewId: group.reviewId,
    target_type: group.target_type,
    target_id: group.target_id,
    status: group.status,
    inboxStatus: group.inboxStatus,
    reports: group.reports,
    reportCount: group.reports.length,
    reporterCount: group.reporterIds.size,
    latest_at: group.latest_at,
    reasons: reasonBreakdown(group.reports),
    ai_label: group.ai_label,
    ai_summary: group.ai_summary,
    ai_suggested_action: group.ai_suggested_action,
  }));
}

export function filterReportGroups(groups, { type = "all", status = "pending", sort = "newest" } = {}) {
  const next = (Array.isArray(groups) ? groups : []).filter((group) => {
    if (type !== "all" && group.target_type !== type) {
      return false;
    }

    if (status === "pending") {
      return group.inboxStatus === "pending";
    }

    if (status === "done") {
      return group.inboxStatus === "done";
    }

    return true;
  });

  next.sort((left, right) => {
    if (sort === "count") {
      return right.reportCount - left.reportCount || String(right.latest_at).localeCompare(String(left.latest_at));
    }

    return String(right.latest_at).localeCompare(String(left.latest_at));
  });

  return next;
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

export async function fetchReportInbox(supabase, filters = {}) {
  const [reportsResult, reviewsResult] = await Promise.all([
    supabase
      .from("content_reports")
      .select("id, reporter_id, target_type, target_id, reason, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("moderation_reviews")
      .select(
        "id, target_type, target_id, status, distinct_report_count, ai_label, ai_summary, ai_suggested_action, ai_reviewed_at, updated_at",
      ),
  ]);

  if (reportsResult.error) {
    console.error("content_reports", reportsResult.error);
    return [];
  }

  if (reviewsResult.error) {
    console.error("moderation_reviews", reviewsResult.error);
  }

  const grouped = filterReportGroups(
    groupReportedTargets(reportsResult.data ?? [], reviewsResult.data ?? []),
    filters,
  );

  if (!grouped.length) {
    return [];
  }

  const postIds = grouped.filter((row) => row.target_type === "post").map((row) => row.target_id);
  const commentIds = grouped.filter((row) => row.target_type === "comment").map((row) => row.target_id);
  const userIds = grouped.filter((row) => row.target_type === "user").map((row) => row.target_id);

  const [postsResult, commentsResult, usersResult] = await Promise.all([
    postIds.length
      ? supabase
          .from("hobby_posts")
          .select("id, title, body, author_id, hidden_at, image_urls")
          .in("id", postIds)
      : Promise.resolve({ data: [], error: null }),
    commentIds.length
      ? supabase
          .from("hobby_comments")
          .select("id, body, author_id, post_id, hidden_at, parent_id")
          .in("id", commentIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase.from("profiles").select("id, display_name, bio, avatar_url, suspended").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (postsResult.error) {
    console.error("moderation posts", postsResult.error);
  }
  if (commentsResult.error) {
    console.error("moderation comments", commentsResult.error);
  }

  let userRows = usersResult.data ?? [];

  if (usersResult.error) {
    const fallback = userIds.length
      ? await supabase.from("profiles").select("id, display_name, bio, avatar_url").in("id", userIds)
      : { data: [], error: null };
    userRows = (fallback.data ?? []).map((row) => ({ ...row, suspended: false }));
  }

  const posts = new Map((postsResult.data ?? []).map((row) => [row.id, row]));
  const comments = new Map((commentsResult.data ?? []).map((row) => [row.id, row]));
  const users = new Map(userRows.map((row) => [row.id, row]));
  const authorIds = [
    ...new Set(
      [...posts.values(), ...comments.values()].map((row) => row.author_id).filter(Boolean),
    ),
  ].filter((id) => !users.has(id));

  if (authorIds.length) {
    const { data: authors } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", authorIds);

    for (const author of authors ?? []) {
      users.set(author.id, author);
    }
  }

  return grouped.map((group) => {
    const post = group.target_type === "post" ? posts.get(group.target_id) ?? null : null;
    const comment = group.target_type === "comment" ? comments.get(group.target_id) ?? null : null;
    const profile = group.target_type === "user" ? users.get(group.target_id) ?? null : null;
    const authorId = post?.author_id || comment?.author_id || "";
    const author = authorId ? users.get(authorId) ?? null : profile;

    return {
      ...group,
      distinct_report_count: group.reporterCount,
      post,
      comment,
      profile,
      author,
      hidden: Boolean(post?.hidden_at || comment?.hidden_at),
    };
  });
}
