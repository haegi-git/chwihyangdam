-- Optional search indexes for /hobbies ilike on title and body.
-- pg_trgm is created in the extensions schema. Not applied to the live database
-- by the change that added board search.

create extension if not exists pg_trgm with schema extensions;

create index if not exists hobby_posts_title_trgm_idx
  on public.hobby_posts using gin (title extensions.gin_trgm_ops);

create index if not exists hobby_posts_body_trgm_idx
  on public.hobby_posts using gin (body extensions.gin_trgm_ops);
