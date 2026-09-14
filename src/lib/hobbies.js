const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const POST_SELECT =
  "id, title, body, content, image_urls, created_at, updated_at, author_id, hobby_tag_id, hobby_tags ( id, slug, name )";

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

async function attachAuthors(supabase, posts) {
  if (!posts.length) {
    return [];
  }

  const ids = [...new Set(posts.map((post) => post.author_id).filter(Boolean))];

  if (!ids.length) {
    return posts.map((post) => ({ ...post, author: null }));
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", ids);

  if (error) {
    console.error("hobby post authors", error);
    return posts.map((post) => ({ ...post, author: null }));
  }

  const byId = new Map((data ?? []).map((profile) => [profile.id, profile]));

  return posts.map((post) => ({
    ...post,
    author: byId.get(post.author_id) ?? null,
  }));
}
