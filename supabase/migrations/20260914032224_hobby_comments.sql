-- Flat comments on hobby posts.
-- Public read; authenticated users manage their own rows (author_id = auth.uid()).
-- Safe to re-run: IF NOT EXISTS / DROP POLICY IF EXISTS.

create table if not exists public.hobby_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.hobby_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hobby_comments
  alter column id set default gen_random_uuid(),
  alter column post_id set not null,
  alter column author_id set not null,
  alter column body set not null,
  alter column created_at set not null,
  alter column created_at set default now(),
  alter column updated_at set not null,
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'hobby_comments_post_id_fkey'
  ) then
    alter table public.hobby_comments
      add constraint hobby_comments_post_id_fkey
      foreign key (post_id) references public.hobby_posts(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'hobby_comments_author_id_fkey'
  ) then
    alter table public.hobby_comments
      add constraint hobby_comments_author_id_fkey
      foreign key (author_id) references auth.users(id) on delete cascade;
  end if;
end $$;

alter table public.hobby_comments
  drop constraint if exists hobby_comments_body_check;

alter table public.hobby_comments
  add constraint hobby_comments_body_check
  check (
    char_length(trim(both from body)) > 0
    and char_length(body) <= 1000
  );

create index if not exists hobby_comments_post_id_created_at_idx
  on public.hobby_comments (post_id, created_at);

create index if not exists hobby_comments_author_id_idx
  on public.hobby_comments (author_id);

comment on table public.hobby_comments is
  'Flat comments on hobby_posts. Public read; authors insert/update/delete their own rows.';

alter table public.hobby_comments enable row level security;

drop policy if exists "Hobby comments are viewable by everyone" on public.hobby_comments;
create policy "Hobby comments are viewable by everyone"
  on public.hobby_comments
  for select
  using (true);

drop policy if exists "Authenticated users can create hobby comments" on public.hobby_comments;
create policy "Authenticated users can create hobby comments"
  on public.hobby_comments
  for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Users can update their own hobby comments" on public.hobby_comments;
create policy "Users can update their own hobby comments"
  on public.hobby_comments
  for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Users can delete their own hobby comments" on public.hobby_comments;
create policy "Users can delete their own hobby comments"
  on public.hobby_comments
  for delete
  to authenticated
  using (auth.uid() = author_id);

grant select, insert, update, delete on table public.hobby_comments to anon, authenticated;
grant all on table public.hobby_comments to service_role;
