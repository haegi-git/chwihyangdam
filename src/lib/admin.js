export const ADMIN_TABS = [
  { id: "dashboard", label: "대시보드" },
  { id: "categories", label: "분류" },
  { id: "hobbies", label: "말머리" },
  { id: "reports", label: "신고함" },
  { id: "users", label: "사용자" },
];

const TAB_IDS = new Set(ADMIN_TABS.map((tab) => tab.id));

export function adminTabFrom(value) {
  return TAB_IDS.has(value) ? value : "dashboard";
}

export function adminHref(tab, params = {}) {
  const search = new URLSearchParams();

  if (tab && tab !== "dashboard") {
    search.set("tab", tab);
  }

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `/admin?${query}` : "/admin";
}

export function sanitizeUserQuery(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/[%_*]/g, "").slice(0, 40);
}

export async function fetchAdminDashboard(supabase) {
  const [users, posts, comments, reports, reviews] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("hobby_posts").select("id", { count: "exact", head: true }),
    supabase.from("hobby_comments").select("id", { count: "exact", head: true }),
    supabase.from("content_reports").select("target_type, target_id"),
    supabase.from("moderation_reviews").select("target_type, target_id, status"),
  ]);

  const decided = new Set(
    (reviews.data ?? [])
      .filter((row) => row.status && row.status !== "pending")
      .map((row) => `${row.target_type}:${row.target_id}`),
  );
  const pendingTargets = new Set();

  for (const report of reports.data ?? []) {
    const key = `${report.target_type}:${report.target_id}`;

    if (!decided.has(key)) {
      pendingTargets.add(key);
    }
  }

  return {
    users: Number(users.count ?? 0),
    posts: Number(posts.count ?? 0),
    comments: Number(comments.count ?? 0),
    pendingReports: pendingTargets.size,
  };
}

export async function fetchAdminUsers(supabase, rawQuery) {
  const query = sanitizeUserQuery(rawQuery);
  let request = supabase
    .from("profiles")
    .select("id, display_name, created_at, suspended")
    .order("created_at", { ascending: false })
    .limit(40);

  if (query) {
    request = request.ilike("display_name", `%${query}%`);
  }

  let { data, error } = await request;

  if (error) {
    let fallback = supabase
      .from("profiles")
      .select("id, display_name, created_at")
      .order("created_at", { ascending: false })
      .limit(40);

    if (query) {
      fallback = fallback.ilike("display_name", `%${query}%`);
    }

    const next = await fallback;
    data = (next.data ?? []).map((row) => ({ ...row, suspended: false }));
    error = next.error;
  }

  const rows = data ?? [];

  if (error || !rows.length) {
    return { query, rows: [] };
  }

  const ids = rows.map((row) => row.id);
  const [posts, comments, reports] = await Promise.all([
    supabase.from("hobby_posts").select("author_id").in("author_id", ids),
    supabase.from("hobby_comments").select("author_id").in("author_id", ids),
    supabase
      .from("content_reports")
      .select("target_id")
      .eq("target_type", "user")
      .in("target_id", ids),
  ]);

  const postCounts = countBy(posts.data, "author_id");
  const commentCounts = countBy(comments.data, "author_id");
  const reportCounts = countBy(reports.data, "target_id");

  return {
    query,
    rows: rows.map((row) => ({
      ...row,
      suspended: Boolean(row.suspended),
      postCount: postCounts.get(row.id) || 0,
      commentCount: commentCounts.get(row.id) || 0,
      reportCount: reportCounts.get(row.id) || 0,
    })),
  };
}

function countBy(rows, key) {
  const counts = new Map();

  for (const row of rows ?? []) {
    const id = row?.[key];

    if (id) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }

  return counts;
}
