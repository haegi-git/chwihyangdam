-- Pin private.post_image_url_allowed to an empty search_path.
-- Body matches live chwihyangdam. Do not change the predicate.
-- private is not exposed on the Data API (see 20261014041156 private helpers).

create schema if not exists private;

create or replace function private.post_image_url_allowed(url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(url, '') ~ '^https://zindpeseivricksyzvyt\.supabase\.co/storage/v1/object/public/post-images/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9._-]+$'
    and position('..' in coalesce(url, '')) = 0;
$$;
