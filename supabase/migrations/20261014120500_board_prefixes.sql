-- 말머리 for the single hobby board.
-- hobby_tags and hobby_posts.hobby_tag_id stay. Existing tag ids are not rewritten.
-- New posts may omit a tag. prefix_id is not backfilled from tags.

create schema if not exists private;

create table if not exists public.board_prefixes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

alter table public.board_prefixes
  alter column id set default gen_random_uuid(),
  alter column name set not null,
  alter column sort_order set not null,
  alter column sort_order set default 0,
  alter column is_active set not null,
  alter column is_active set default true;

alter table public.board_prefixes
  drop constraint if exists board_prefixes_name_check;

alter table public.board_prefixes
  add constraint board_prefixes_name_check
  check (char_length(btrim(name)) between 1 and 20);

create unique index if not exists board_prefixes_name_key
  on public.board_prefixes (btrim(name));

comment on table public.board_prefixes is
  'Admin-managed prefixes (말머리) for the single hobby board. Anyone can read active rows. Writes require private.is_admin().';

alter table public.board_prefixes enable row level security;

drop policy if exists "Active prefixes are readable" on public.board_prefixes;
create policy "Active prefixes are readable"
  on public.board_prefixes
  for select
  to anon, authenticated
  using (
    is_active
    or (select private.is_admin())
  );

drop policy if exists "Admins insert prefixes" on public.board_prefixes;
create policy "Admins insert prefixes"
  on public.board_prefixes
  for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Admins update prefixes" on public.board_prefixes;
create policy "Admins update prefixes"
  on public.board_prefixes
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins delete prefixes" on public.board_prefixes;
create policy "Admins delete prefixes"
  on public.board_prefixes
  for delete
  to authenticated
  using ((select private.is_admin()));

revoke all on table public.board_prefixes from public, anon, authenticated;
grant select on table public.board_prefixes to anon, authenticated;
grant insert, update, delete on table public.board_prefixes to authenticated;
grant all on table public.board_prefixes to service_role;

insert into public.board_prefixes (name, sort_order, is_active)
select seed.name, seed.sort_order, true
from (
  values
    ('자유'::text, 1),
    ('정보', 2),
    ('질문', 3)
) as seed(name, sort_order)
where not exists (
  select 1
  from public.board_prefixes existing
  where btrim(existing.name) = seed.name
);

alter table public.hobby_posts
  add column if not exists prefix_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'hobby_posts_prefix_id_fkey'
  ) then
    alter table public.hobby_posts
      add constraint hobby_posts_prefix_id_fkey
      foreign key (prefix_id)
      references public.board_prefixes(id)
      on delete set null;
  end if;
end $$;

-- Category columns stay. The board no longer requires one on new posts.
alter table public.hobby_posts
  alter column hobby_tag_id drop not null;

create index if not exists hobby_posts_prefix_id_created_at_idx
  on public.hobby_posts (prefix_id, created_at desc);

comment on column public.hobby_posts.prefix_id is
  'Optional 말머리. Null on posts written before prefixes. Does not replace hobby_tag_id.';

create or replace function private.hobby_posts_prefix_is_active()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.prefix_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.prefix_id is not distinct from old.prefix_id then
    return new;
  end if;

  if not exists (
    select 1
    from public.board_prefixes p
    where p.id = new.prefix_id
      and p.is_active
  ) then
    raise exception 'prefix is not active'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.hobby_posts_prefix_is_active() from public, anon;
grant execute on function private.hobby_posts_prefix_is_active() to authenticated, service_role;

drop trigger if exists hobby_posts_prefix_is_active on public.hobby_posts;
create trigger hobby_posts_prefix_is_active
  before insert or update of prefix_id
  on public.hobby_posts
  for each row
  execute function private.hobby_posts_prefix_is_active();
