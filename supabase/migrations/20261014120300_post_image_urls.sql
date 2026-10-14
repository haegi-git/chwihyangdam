-- Image blocks and image_urls may only point at this project's public post-images bucket.
-- Reads of older rows are unchanged. Writes that still carry another URL are rejected.
-- The app strips those URLs before it saves, so editing an old post still works.

create schema if not exists private;

alter table public.hobby_posts
  add column if not exists image_urls jsonb;

create or replace function private.post_image_url_allowed(url text)
returns boolean
language sql
immutable
as $$
  select coalesce(url, '') ~ '^https://zindpeseivricksyzvyt\.supabase\.co/storage/v1/object/public/post-images/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9._-]+$'
    and position('..' in coalesce(url, '')) = 0;
$$;

revoke all on function private.post_image_url_allowed(text) from public, anon, authenticated;

create or replace function private.guard_post_image_urls()
returns trigger
language plpgsql
security definer
set search_path to private, public
as $$
declare
  block jsonb;
  candidate text;
  url_json jsonb;
begin
  if new.content is not null
     and jsonb_typeof(new.content) = 'object'
     and jsonb_typeof(new.content -> 'blocks') = 'array' then
    for block in
      select value from jsonb_array_elements(new.content -> 'blocks')
    loop
      if coalesce(block ->> 'type', '') = 'image' then
        candidate := btrim(coalesce(block ->> 'url', ''));
        if candidate = '' or not private.post_image_url_allowed(candidate) then
          raise exception 'post image url must be a public post-images url for this project'
            using errcode = 'P0001';
        end if;
      end if;
    end loop;
  end if;

  if new.image_urls is not null then
    url_json := to_jsonb(new.image_urls);
    if jsonb_typeof(url_json) = 'array' then
      for candidate in
        select btrim(value) from jsonb_array_elements_text(url_json) as t(value)
      loop
        if candidate <> '' and not private.post_image_url_allowed(candidate) then
          raise exception 'post image url must be a public post-images url for this project'
            using errcode = 'P0001';
        end if;
      end loop;
    elsif jsonb_typeof(url_json) = 'string' then
      candidate := btrim(url_json #>> '{}');
      if candidate <> '' and not private.post_image_url_allowed(candidate) then
        raise exception 'post image url must be a public post-images url for this project'
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_post_image_urls() from public, anon;
grant execute on function private.guard_post_image_urls() to authenticated, service_role;

drop trigger if exists guard_post_image_urls on public.hobby_posts;
create trigger guard_post_image_urls
  before insert or update of content, image_urls
  on public.hobby_posts
  for each row
  execute function private.guard_post_image_urls();
