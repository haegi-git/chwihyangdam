-- Friendships + per-entry diary sharing.
-- Mirrors live schema on chwihyangdam (zindpeseivricksyzvyt).
-- Safe to re-run: IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE.

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.friendships
  alter column id set default gen_random_uuid(),
  alter column requester_id set not null,
  alter column addressee_id set not null,
  alter column status set not null,
  alter column status set default 'pending',
  alter column created_at set not null,
  alter column created_at set default now(),
  alter column updated_at set not null,
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'friendships_requester_id_fkey'
  ) then
    alter table public.friendships
      add constraint friendships_requester_id_fkey
      foreign key (requester_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'friendships_addressee_id_fkey'
  ) then
    alter table public.friendships
      add constraint friendships_addressee_id_fkey
      foreign key (addressee_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'friendships_requester_id_addressee_id_key'
  ) then
    alter table public.friendships
      add constraint friendships_requester_id_addressee_id_key
      unique (requester_id, addressee_id);
  end if;
end $$;

alter table public.friendships
  drop constraint if exists friendships_check;

alter table public.friendships
  add constraint friendships_check
  check (requester_id <> addressee_id);

alter table public.friendships
  drop constraint if exists friendships_status_check;

alter table public.friendships
  add constraint friendships_status_check
  check (status = any (array['pending'::text, 'accepted'::text, 'declined'::text]));

create unique index if not exists friendships_pair_unique_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_requester_status_idx
  on public.friendships (requester_id, status);

create index if not exists friendships_addressee_status_idx
  on public.friendships (addressee_id, status);

comment on table public.friendships is
  'Directed friend requests. Unique on (requester, addressee) and on the unordered pair so A↔B cannot exist twice.';

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a)
      )
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to anon, authenticated, service_role;

alter table public.friendships enable row level security;

drop policy if exists "Users can view own friendships" on public.friendships;
create policy "Users can view own friendships"
  on public.friendships
  for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Users can request friendships" on public.friendships;
create policy "Users can request friendships"
  on public.friendships
  for insert
  to authenticated
  with check (auth.uid() = requester_id and status = 'pending');

drop policy if exists "Users can update friendships they are in" on public.friendships;
create policy "Users can update friendships they are in"
  on public.friendships
  for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Users can delete friendships they are in" on public.friendships;
create policy "Users can delete friendships they are in"
  on public.friendships
  for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

grant select, insert, update, delete on table public.friendships to anon, authenticated;
grant all on table public.friendships to service_role;

alter table public.diary_entries
  add column if not exists shared_with_friends boolean not null default false;

alter table public.diary_entries
  alter column shared_with_friends set default false,
  alter column shared_with_friends set not null;

comment on column public.diary_entries.shared_with_friends is
  'When true, accepted friends may read this entry. Default private.';

comment on table public.diary_entries is
  'Calendar diary. Authors manage their own rows. Accepted friends may select rows with shared_with_friends.';

drop policy if exists "Users can view own diary entries" on public.diary_entries;
create policy "Users can view own diary entries"
  on public.diary_entries
  for select
  to authenticated
  using (
    auth.uid() = author_id
    or (shared_with_friends = true and are_friends(auth.uid(), author_id))
  );
