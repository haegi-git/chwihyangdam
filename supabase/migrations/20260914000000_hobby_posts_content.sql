-- Ordered inline body for Tistory-style hobby posts.
-- Null/invalid content falls back to plain body + image_urls.
-- image_urls matches live chwihyangdam: text[] not null default '{}'.
-- ADD COLUMN IF NOT EXISTS only. Do not ALTER TYPE — the live column is already text[].

alter table public.hobby_posts
  add column if not exists image_urls text[] not null default '{}';

comment on column public.hobby_posts.image_urls is
  'Ordered public post-image URLs. text[] not null default empty array.';

alter table public.hobby_posts
  add column if not exists content jsonb;

comment on column public.hobby_posts.content is
  'Ordered write body: {"version":1,"blocks":[{"type":"paragraph","text"}|{"type":"image","url"}]}. Null means legacy body + image_urls.';
