-- Private calendar diary: one entry per authenticated user per calendar date.
-- Own-row RLS only (friends sharing later).
-- Safe to re-run: IF NOT EXISTS / DROP POLICY IF EXISTS.

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.diary_entries
  alter column id set default gen_random_uuid(),
  alter column author_id set not null,
  alter column entry_date set not null,
  alter column title set not null,
  alter column title set default '',
  alter column body set not null,
  alter column body set default '',
  alter column created_at set not null,
  alter column created_at set default now(),
  alter column updated_at set not null,
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'diary_entries_author_id_fkey'
  ) then
    alter table public.diary_entries
      add constraint diary_entries_author_id_fkey
      foreign key (author_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'diary_entries_author_id_entry_date_key'
  ) then
    alter table public.diary_entries
      add constraint diary_entries_author_id_entry_date_key
      unique (author_id, entry_date);
  end if;
end $$;

alter table public.diary_entries
  drop constraint if exists diary_entries_title_check;

alter table public.diary_entries
  add constraint diary_entries_title_check
  check (char_length(title) <= 80);

alter table public.diary_entries
  drop constraint if exists diary_entries_body_check;

alter table public.diary_entries
  add constraint diary_entries_body_check
  check (char_length(body) <= 8000);

create index if not exists diary_entries_author_date_idx
  on public.diary_entries (author_id, entry_date);

comment on table public.diary_entries is
  'Private calendar diary. One row per author per entry_date. Authenticated users manage their own rows only.';

alter table public.diary_entries enable row level security;

drop policy if exists "Users can view own diary entries" on public.diary_entries;
create policy "Users can view own diary entries"
  on public.diary_entries
  for select
  to authenticated
  using (auth.uid() = author_id);

drop policy if exists "Users can create own diary entries" on public.diary_entries;
create policy "Users can create own diary entries"
  on public.diary_entries
  for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Users can update own diary entries" on public.diary_entries;
create policy "Users can update own diary entries"
  on public.diary_entries
  for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Users can delete own diary entries" on public.diary_entries;
create policy "Users can delete own diary entries"
  on public.diary_entries
  for delete
  to authenticated
  using (auth.uid() = author_id);

grant select, insert, update, delete on table public.diary_entries to anon, authenticated;
grant all on table public.diary_entries to service_role;
