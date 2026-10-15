import {
  BOARD_PAGE_SIZE,
  boardPageCount,
  isSearchableQuery,
  likeContains,
  normalizeBoardQuery,
  titleBodyOrFilter,
} from "./board.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const POST_SELECT =
  "id, title, body, content, image_urls, created_at, updated_at, author_id, hobby_tag_id, category_id, hidden_at, hide_reason, board_categories ( id, name ), hobby_tags ( id, name ), hobby_comments(count)";

const COMMENT_SELECT =
  "id, post_id, parent_id, author_id, body, created_at, updated_at, hidden_at, hide_reason";

export const COMMENT_BODY_MAX = 1000;

export function isPostId(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function authorLabel(author) {
  return author?.display_name?.trim() || "이름 없는 자리";
}

export function commentCountOf(post) {
  const row = Array.isArray(post?.hobby_comments) ? post.hobby_comments[0] : null;
  return Number(row?.count ?? 0);
}

export function trimCommentBody(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function commentWasEdited(comment) {
  if (!comment?.created_at || !comment?.updated_at) {
    return false;
  }

  return new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000;
}

export function isTopLevelComment(comment) {
  return !comment?.parent_id;
}

export function groupHobbyCommentThreads(comments) {
  const list = Array.isArray(comments) ? comments : [];
  const repliesByParent = new Map();
  const topLevel = [];

  for (const comment of list) {
    if (comment?.parent_id) {
      const replies = repliesByParent.get(comment.parent_id) ?? [];
      replies.push(comment);
      repliesByParent.set(comment.parent_id, replies);
    } else {
      topLevel.push(comment);
    }
  }

  const nestedUnder = new Set();
  const threads = topLevel.map((comment) => {
    nestedUnder.add(comment.id);
    return {
      comment,
      replies: repliesByParent.get(comment.id) ?? [],
    };
  });

  for (const [parentId, replies] of repliesByParent) {
    if (nestedUnder.has(parentId)) {
      continue;
    }

    for (const comment of replies) {
      threads.push({ comment, replies: [] });
    }
  }

  return threads;
}

async function fetchLabelRows(supabase, table, { activeOnly = false } = {}) {
  let query = supabase
    .from(table)
    .select("id, name, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error(table, error);
    return [];
  }

  return data ?? [];
}

export function fetchActiveCategories(supabase) {
  return fetchLabelRows(supabase, "board_categories", { activeOnly: true });
}

export function fetchBoardCategories(supabase) {
  return fetchLabelRows(supabase, "board_categories");
}

export function fetchActiveHobbyTags(supabase) {
  return fetchLabelRows(supabase, "hobby_tags", { activeOnly: true });
}

export function fetchHobbyTags(supabase) {
  return fetchLabelRows(supabase, "hobby_tags");
}

const AUTHOR_SEARCH_LIMIT = 80;

export async function fetchHobbyBoard(
  supabase,
  { categoryId = "", hobbyTagId = "", query = "", scope = "all", page = 1 } = {},
) {
  const q = normalizeBoardQuery(query);
  const searching = isSearchableQuery(q);
  const requested = Math.max(1, page);
  let authorIds = null;

  if (searching && scope === "author") {
    authorIds = await findAuthorIds(supabase, q);
    if (!authorIds) {
      return { posts: [], total: 0, page: 1, error: true };
    }
    if (!authorIds.length) {
      return { posts: [], total: 0, page: 1, error: false };
    }
  }

  function applyFilters(request) {
    if (categoryId) {
      request = request.eq("category_id", categoryId);
    }

    if (hobbyTagId) {
      request = request.eq("hobby_tag_id", hobbyTagId);
    }

    if (searching && scope === "title") {
      request = request.ilike("title", likeContains(q));
    } else if (searching && scope !== "author") {
      request = request.or(titleBodyOrFilter(q));
    }

    if (authorIds) {
      request = request.in("author_id", authorIds);
    }

    return request;
  }

  async function countMatching() {
    const { count, error } = await applyFilters(
      supabase.from("hobby_posts").select("id", { count: "exact", head: true }),
    );

    if (error) {
      console.error("hobby_posts", error);
      return null;
    }

    return count ?? 0;
  }

  async function loadPage(pageNumber) {
    const from = (pageNumber - 1) * BOARD_PAGE_SIZE;
    const to = from + BOARD_PAGE_SIZE - 1;
    const { data, error, count } = await applyFilters(
      supabase
        .from("hobby_posts")
        .select(POST_SELECT, { count: "exact" })
        .order("created_at", { ascending: false }),
    ).range(from, to);

    if (error?.code === "PGRST103") {
      const total = await countMatching();
      if (total == null) {
        return { rows: [], total: 0, error: true };
      }
      return { rows: [], total, error: false };
    }

    if (error) {
      console.error("hobby_posts", error);
      return { rows: [], total: 0, error: true };
    }

    return { rows: data ?? [], total: count ?? 0, error: false };
  }

  let result = await loadPage(requested);
  if (result.error) {
    return { posts: [], total: 0, page: 1, error: true };
  }

  const lastPage = boardPageCount(result.total);
  const resolved = result.total === 0 ? 1 : Math.min(requested, lastPage);
  if (resolved !== requested && result.total > 0) {
    result = await loadPage(resolved);
    if (result.error) {
      return { posts: [], total: 0, page: 1, error: true };
    }
  }

  return {
    posts: await attachAuthors(supabase, result.rows),
    total: result.total,
    page: resolved,
    error: false,
  };
}

export async function fetchHobbyPosts(supabase, { categoryId = "", hobbyTagId = "" } = {}) {
  let query = supabase
    .from("hobby_posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (hobbyTagId) {
    query = query.eq("hobby_tag_id", hobbyTagId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("hobby_posts", error);
    return [];
  }

  return attachAuthors(supabase, data ?? []);
}

export async function fetchRecentHobbyPosts(supabase, limit = 3) {
  const { data, error } = await supabase
    .from("hobby_posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("recent hobby_posts", error);
    return [];
  }

  return attachAuthors(supabase, data ?? []);
}

export async function fetchHobbyPostsByAuthor(supabase, authorId) {
  const { data, error } = await supabase
    .from("hobby_posts")
    .select(POST_SELECT)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("author hobby_posts", error);
    return [];
  }

  return attachAuthors(supabase, data ?? []);
}

export async function fetchHobbyPostById(supabase, id) {
  const { data, error } = await supabase
    .from("hobby_posts")
    .select(POST_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("hobby_post", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const [post] = await attachAuthors(supabase, [data]);
  return post ?? null;
}

export async function fetchHobbyCommentsForPost(supabase, postId) {
  const { data, error } = await supabase
    .from("hobby_comments")
    .select(COMMENT_SELECT)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("hobby_comments", error);
    return [];
  }

  return attachAuthors(supabase, data ?? []);
}

async function findAuthorIds(supabase, query) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("display_name", likeContains(query))
    .limit(AUTHOR_SEARCH_LIMIT);

  if (error) {
    console.error("profile search", error);
    return null;
  }

  return (data ?? []).map((row) => row.id).filter(Boolean);
}

async function attachAuthors(supabase, rows) {
  if (!rows.length) {
    return [];
  }

  const ids = [...new Set(rows.map((row) => row.author_id).filter(Boolean))];

  if (!ids.length) {
    return rows.map((row) => ({ ...row, author: null }));
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", ids);

  if (error) {
    console.error("hobby authors", error);
    return rows.map((row) => ({ ...row, author: null }));
  }

  const byId = new Map((data ?? []).map((profile) => [profile.id, profile]));

  return rows.map((row) => ({
    ...row,
    author: byId.get(row.author_id) ?? null,
  }));
}
