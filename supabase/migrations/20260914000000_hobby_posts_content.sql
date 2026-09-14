-- Ordered inline body for Tistory-style hobby posts.
-- Null/invalid content falls back to plain body + image_urls.

alter table public.hobby_posts
  add column if not exists content jsonb;

comment on column public.hobby_posts.content is
  'Ordered write body: {"version":1,"blocks":[{"type":"paragraph","text"}|{"type":"image","url"}]}. Null means legacy body + image_urls.';
