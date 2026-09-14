const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const POST_SELECT =
  "id, title, body, content, image_urls, created_at, updated_at, author_id, hobby_tag_id, hobby_tags ( id, slug, name ), hobby_comments(count)";

const COMMENT_SELECT = "id, post_id, parent_id, author_id, body, created_at, updated_at";

export const COMMENT_BODY_MAX = 1000;

export function isPostId(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function authorLabel(author) {
  return author?.display_name?.trim() || "이름 없는 자리";
}

export function postCountOf(tag) {
  const row = Array.isArray(tag?.hobby_posts) ? tag.hobby_posts[0] : null;
  return Number(row?.count ?? 0);
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

export async function fetchHobbyTags(supabase) {
  const { data, error } = await supabase
    .from("hobby_tags")
    .select("id, slug, name, description, created_at, hobby_posts(count)")
    .order("name", { ascending: true });

  if (error) {
    console.error("hobby_tags", error);
    return [];
  }

  return data ?? [];
}

export async function fetchHobbyTagBySlug(supabase, slug) {
  const { data, error } = await supabase
    .from("hobby_tags")
    .select("id, slug, name, description, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("hobby_tag", error);
    return null;
  }

  return data;
}

export async function fetchHobbyPostsForTag(supabase, tagId) {
  const { data, error } = await supabase
    .from("hobby_posts")
    .select(POST_SELECT)
    .eq("hobby_tag_id", tagId)
    .order("created_at", { ascending: false });

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
