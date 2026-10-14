-- 자유/정보/질문 become board sections (분류).
-- board_prefixes is renamed to board_categories and hobby_posts.prefix_id to category_id.
-- Existing posts with a null section are set to 자유. category_id is then required.
-- hobby_tags stays the hobby 말머리 (hobby_posts.hobby_tag_id). Optional on each post.
-- Notifications, blocks, and moderation tables are not changed.
--
-- Drop the PR #21 prefix trigger before renaming prefix_id. PostgreSQL stores
-- UPDATE OF columns by attribute number, so the rename would retarget the
-- trigger at category_id while private.hobby_posts_prefix_is_active() still
-- reads new.prefix_id. The backfill UPDATE then fails with 42703.

create schema if not exists private;

do $$
declare
  trg record;
  fn record;
begin
  for trg in
    select n.nspname, c.relname, t.tgname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    where not t.tgisinternal
      and (
        t.tgname = 'hobby_posts_prefix_is_active'
        or position('prefix_id' in p.prosrc) > 0
        or position('board_prefixes' in p.prosrc) > 0
      )
  loop
    execute format('drop trigger if exists %I on %I.%I', trg.tgname, trg.nspname, trg.relname);
  end loop;

  for fn in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and (
        p.proname = 'hobby_posts_prefix_is_active'
        or position('prefix_id' in p.prosrc) > 0
        or position('board_prefixes' in p.prosrc) > 0
      )
  loop
    execute format(
      'drop function if exists %I.%I(%s)',
      fn.nspname,
      fn.proname,
      fn.args
    );
  end loop;
end $$;

drop trigger if exists hobby_posts_prefix_is_active on public.hobby_posts;
drop function if exists private.hobby_posts_prefix_is_active();

do $$
begin
  if to_regclass('public.board_prefixes') is not null
     and to_regclass('public.board_categories') is not null then
    raise exception 'both board_prefixes and board_categories exist';
  end if;

  if to_regclass('public.board_prefixes') is null
     and to_regclass('public.board_categories') is null then
    raise exception 'board_prefixes is missing. Apply 20261014120500_board_prefixes.sql first.';
  end if;

  if to_regclass('public.board_prefixes') is not null then
    alter table public.board_prefixes rename to board_categories;
  end if;
end $$;

do $$
begin
  if to_regclass('public.board_prefixes_name_key') is not null
     and to_regclass('public.board_categories_name_key') is null then
    alter index public.board_prefixes_name_key rename to board_categories_name_key;
  end if;

  if to_regclass('public.board_prefixes_pkey') is not null
     and to_regclass('public.board_categories_pkey') is null then
    alter index public.board_prefixes_pkey rename to board_categories_pkey;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'board_prefixes_name_check'
      and conrelid = 'public.board_categories'::regclass
  ) then
    alter table public.board_categories
      rename constraint board_prefixes_name_check to board_categories_name_check;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'hobby_posts'
      and column_name = 'prefix_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'hobby_posts'
      and column_name = 'category_id'
  ) then
    alter table public.hobby_posts rename column prefix_id to category_id;
  end if;
end $$;

do $$
begin
  if to_regclass('public.hobby_posts_prefix_id_created_at_idx') is not null
     and to_regclass('public.hobby_posts_category_id_created_at_idx') is null then
    alter index public.hobby_posts_prefix_id_created_at_idx
      rename to hobby_posts_category_id_created_at_idx;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'hobby_posts'
      and column_name = 'category_id'
  ) then
    raise exception 'hobby_posts.category_id is missing';
  end if;
end $$;

insert into public.board_categories (name, sort_order, is_active)
select '자유', 1, true
where not exists (
  select 1
  from public.board_categories
  where btrim(name) = '자유'
);

update public.hobby_posts
set category_id = (
  select id
  from public.board_categories
  where btrim(name) = '자유'
  order by sort_order, name
  limit 1
)
where category_id is null;

alter table public.hobby_posts
  alter column category_id set not null;

alter table public.hobby_posts
  drop constraint if exists hobby_posts_prefix_id_fkey;

alter table public.hobby_posts
  drop constraint if exists hobby_posts_category_id_fkey;

alter table public.hobby_posts
  add constraint hobby_posts_category_id_fkey
  foreign key (category_id)
  references public.board_categories (id)
  on delete restrict;

create index if not exists hobby_posts_category_id_created_at_idx
  on public.hobby_posts (category_id, created_at desc);

comment on table public.board_categories is
  'Board sections (분류) such as 자유, 정보, 질문. Anyone can read active rows. Writes require private.is_admin().';

comment on column public.hobby_posts.category_id is
  'Required board section. Posts that had no prefix are backfilled to 자유.';

drop policy if exists "Active prefixes are readable" on public.board_categories;
drop policy if exists "Admins insert prefixes" on public.board_categories;
drop policy if exists "Admins update prefixes" on public.board_categories;
drop policy if exists "Admins delete prefixes" on public.board_categories;
drop policy if exists "Active categories are readable" on public.board_categories;
drop policy if exists "Admins insert categories" on public.board_categories;
drop policy if exists "Admins update categories" on public.board_categories;
drop policy if exists "Admins delete categories" on public.board_categories;

create policy "Active categories are readable"
  on public.board_categories
  for select
  to anon, authenticated
  using (
    is_active
    or (select private.is_admin())
    or exists (
      select 1
      from public.hobby_posts as post
      where post.category_id = board_categories.id
        and post.author_id = (select auth.uid())
    )
  );

create policy "Admins insert categories"
  on public.board_categories
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins update categories"
  on public.board_categories
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins delete categories"
  on public.board_categories
  for delete
  to authenticated
  using ((select private.is_admin()));

alter table public.board_categories enable row level security;

revoke all on table public.board_categories from public, anon, authenticated;
grant select on table public.board_categories to anon, authenticated;
grant insert, update, delete on table public.board_categories to authenticated;
grant all on table public.board_categories to service_role;

drop trigger if exists hobby_posts_prefix_is_active on public.hobby_posts;
drop trigger if exists hobby_posts_category_is_active on public.hobby_posts;
drop function if exists private.hobby_posts_prefix_is_active();

create or replace function private.hobby_posts_category_is_active()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.category_id is null then
    raise exception 'category is required'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and new.category_id is not distinct from old.category_id then
    return new;
  end if;

  if not exists (
    select 1
    from public.board_categories as category
    where category.id = new.category_id
      and category.is_active
  ) then
    raise exception 'category is not active'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.hobby_posts_category_is_active() from public, anon;
grant execute on function private.hobby_posts_category_is_active() to authenticated, service_role;

create trigger hobby_posts_category_is_active
  before insert or update of category_id
  on public.hobby_posts
  for each row
  execute function private.hobby_posts_category_is_active();

-- Hobby 말머리. Keep every existing hobby_tags row. Add the columns only when missing.
alter table public.hobby_tags
  add column if not exists is_active boolean;

alter table public.hobby_tags
  add column if not exists sort_order integer;

update public.hobby_tags
set is_active = true
where is_active is null;

update public.hobby_tags
set sort_order = 0
where sort_order is null;

alter table public.hobby_tags
  alter column is_active set default true,
  alter column is_active set not null,
  alter column sort_order set default 0,
  alter column sort_order set not null;

do $$
begin
  if not exists (
    select 1
    from public.hobby_tags
    where char_length(btrim(name)) < 1
       or char_length(btrim(name)) > 20
  ) then
    alter table public.hobby_tags
      drop constraint if exists hobby_tags_name_check;

    alter table public.hobby_tags
      add constraint hobby_tags_name_check
      check (char_length(btrim(name)) between 1 and 20);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from public.hobby_tags
    group by btrim(name)
    having count(*) > 1
  ) then
    create unique index if not exists hobby_tags_name_key
      on public.hobby_tags (btrim(name));
  end if;
end $$;

create index if not exists hobby_tags_sort_idx
  on public.hobby_tags (sort_order, name);

create or replace function private.hobby_tags_assign_slug()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  base text;
  candidate text;
  n integer := 0;
begin
  if new.slug is not null and btrim(new.slug) <> '' then
    new.slug := btrim(new.slug);
    return new;
  end if;

  base := trim(both '-' from regexp_replace(lower(btrim(new.name)), '[^a-z0-9]+', '-', 'g'));

  if base = '' then
    candidate := 'hobby-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    while exists (
      select 1
      from public.hobby_tags as tag
      where tag.slug = candidate
        and tag.id is distinct from new.id
    ) loop
      n := n + 1;
      exit when n > 5;
      candidate := 'hobby-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    end loop;
    new.slug := candidate;
    return new;
  end if;

  base := left(base, 40);
  candidate := base;

  while exists (
    select 1
    from public.hobby_tags as tag
    where tag.slug = candidate
      and tag.id is distinct from new.id
  ) loop
    n := n + 1;
    exit when n > 20;
    candidate := left(base, 32) || '-' || n::text;
  end loop;

  if exists (
    select 1
    from public.hobby_tags as tag
    where tag.slug = candidate
      and tag.id is distinct from new.id
  ) then
    candidate := left(base, 24) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;

  new.slug := candidate;
  return new;
end;
$$;

revoke all on function private.hobby_tags_assign_slug() from public, anon;
grant execute on function private.hobby_tags_assign_slug() to authenticated, service_role;

drop trigger if exists hobby_tags_assign_slug on public.hobby_tags;
create trigger hobby_tags_assign_slug
  before insert or update
  on public.hobby_tags
  for each row
  execute function private.hobby_tags_assign_slug();

drop policy if exists "Hobby tags are viewable by everyone" on public.hobby_tags;
drop policy if exists "Active hobby tags are readable" on public.hobby_tags;
drop policy if exists "Admins insert hobby tags" on public.hobby_tags;
drop policy if exists "Admins update hobby tags" on public.hobby_tags;
drop policy if exists "Admins delete hobby tags" on public.hobby_tags;

create policy "Active hobby tags are readable"
  on public.hobby_tags
  for select
  to anon, authenticated
  using (
    is_active
    or (select private.is_admin())
    or exists (
      select 1
      from public.hobby_posts as post
      where post.hobby_tag_id = hobby_tags.id
        and post.author_id = (select auth.uid())
    )
  );

create policy "Admins insert hobby tags"
  on public.hobby_tags
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins update hobby tags"
  on public.hobby_tags
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins delete hobby tags"
  on public.hobby_tags
  for delete
  to authenticated
  using ((select private.is_admin()));

alter table public.hobby_tags enable row level security;

revoke all on table public.hobby_tags from public, anon, authenticated;
grant select on table public.hobby_tags to anon, authenticated;
grant insert, update, delete on table public.hobby_tags to authenticated;
grant all on table public.hobby_tags to service_role;

comment on table public.hobby_tags is
  'Admin-managed hobby labels (말머리). Anyone can read active rows. Writes require private.is_admin().';

comment on column public.hobby_posts.hobby_tag_id is
  'Optional hobby 말머리. Null when the author does not choose one.';

do $$
declare
  seed record;
  next_order integer;
  next_slug text;
  tries integer;
begin
  for seed in
    select *
    from (
      values
        (1, 'climbing'::text, '클라이밍'::text),
        (2, 'dado', '다도'),
        (3, 'craft', '공예')
    ) as listed(sort_order, slug, name)
    order by sort_order
  loop
    if exists (
      select 1
      from public.hobby_tags
      where btrim(name) = seed.name
    ) then
      continue;
    end if;

    select coalesce(max(sort_order), 0) + 1
    into next_order
    from public.hobby_tags;

    next_slug := seed.slug;
    tries := 0;
    while exists (
      select 1
      from public.hobby_tags
      where slug = next_slug
    ) loop
      tries := tries + 1;
      exit when tries > 8;
      next_slug := seed.slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    end loop;

    insert into public.hobby_tags (slug, name, sort_order, is_active)
    values (next_slug, seed.name, next_order, true);
  end loop;
end $$;

drop trigger if exists hobby_posts_hobby_tag_is_active on public.hobby_posts;
drop function if exists private.hobby_posts_hobby_tag_is_active();

create or replace function private.hobby_posts_hobby_tag_is_active()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.hobby_tag_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.hobby_tag_id is not distinct from old.hobby_tag_id then
    return new;
  end if;

  if not exists (
    select 1
    from public.hobby_tags as tag
    where tag.id = new.hobby_tag_id
      and tag.is_active
  ) then
    raise exception 'hobby tag is not active'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.hobby_posts_hobby_tag_is_active() from public, anon;
grant execute on function private.hobby_posts_hobby_tag_is_active() to authenticated, service_role;

create trigger hobby_posts_hobby_tag_is_active
  before insert or update of hobby_tag_id
  on public.hobby_posts
  for each row
  execute function private.hobby_posts_hobby_tag_is_active();

create index if not exists hobby_posts_hobby_tag_id_created_at_idx
  on public.hobby_posts (hobby_tag_id, created_at desc)
  where hobby_tag_id is not null;

drop index if exists public.hobby_posts_hobby_tag_id_idx;

create index if not exists hobby_posts_category_hobby_created_at_idx
  on public.hobby_posts (category_id, hobby_tag_id, created_at desc);
