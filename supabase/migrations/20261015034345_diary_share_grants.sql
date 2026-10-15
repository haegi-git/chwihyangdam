-- Per-friend diary access.
-- Friendship alone does not open a diary. The owner inserts a row in
-- diary_share_grants for each friend who may read friend-visible entries.
-- Existing friendships are not backfilled, so they stay closed.
--
-- A friend can select a diary_entries row only when all of these hold:
--   shared_with_friends is true (친구 공개),
--   private.are_friends(auth.uid(), author_id),
--   not private.is_blocked_between(author_id),
--   private.has_diary_share(author_id).
-- The owner can always read their own rows.
--
-- Grants disappear when the accepted friendship is deleted or leaves
-- 'accepted', including when a block deletes the friendship. A later
-- friendship starts without a grant.
--
-- Helpers live in private with search_path = '' and are not on the Data API.

create table public.diary_share_grants (
  owner_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, friend_id),
  constraint diary_share_grants_owner_friend_check check (owner_id <> friend_id)
);

create index diary_share_grants_friend_id_idx
  on public.diary_share_grants (friend_id);

comment on table public.diary_share_grants is
  'Owner allows one friend to read friend-visible diary entries. Empty for existing friendships. PK (owner_id, friend_id).';

comment on column public.diary_entries.shared_with_friends is
  'false = 나만 보기. true = 친구 공개, readable only by a granted friend who is still friends and not blocked.';

create or replace function private.has_diary_share(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select owner is not null
    and auth.uid() is not null
    and exists (
      select 1
      from public.diary_share_grants g
      where g.owner_id = owner
        and g.friend_id = auth.uid()
    );
$$;

revoke all on function private.has_diary_share(uuid) from public, anon;
grant execute on function private.has_diary_share(uuid) to authenticated, service_role;

create or replace function private.clear_diary_share_on_friendship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or (
      old.status = 'accepted'
      and (
        new.status is distinct from 'accepted'
        or new.requester_id is distinct from old.requester_id
        or new.addressee_id is distinct from old.addressee_id
      )
    )
  then
    delete from public.diary_share_grants
    where (owner_id = old.requester_id and friend_id = old.addressee_id)
       or (owner_id = old.addressee_id and friend_id = old.requester_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.clear_diary_share_on_friendship() from public;
grant execute on function private.clear_diary_share_on_friendship() to authenticated, service_role;

drop trigger if exists friendships_clear_diary_share on public.friendships;
create trigger friendships_clear_diary_share
  after update or delete on public.friendships
  for each row
  execute function private.clear_diary_share_on_friendship();

alter table public.diary_share_grants enable row level security;

drop policy if exists "Owners and friends can view diary share grants" on public.diary_share_grants;
create policy "Owners and friends can view diary share grants"
  on public.diary_share_grants
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or friend_id = (select auth.uid())
  );

drop policy if exists "Owners can grant diary share to friends" on public.diary_share_grants;
create policy "Owners can grant diary share to friends"
  on public.diary_share_grants
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select private.are_friends(owner_id, friend_id))
    and not (select private.is_blocked_between(friend_id))
  );

drop policy if exists "Owners can revoke diary share" on public.diary_share_grants;
create policy "Owners can revoke diary share"
  on public.diary_share_grants
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

revoke all on table public.diary_share_grants from public, anon;
grant select, insert, delete on table public.diary_share_grants to authenticated;
grant all on table public.diary_share_grants to service_role;

drop policy if exists "Users can view own diary entries" on public.diary_entries;
create policy "Users can view own diary entries"
  on public.diary_entries
  for select
  to authenticated
  using (
    (select auth.uid()) = author_id
    or (
      shared_with_friends = true
      and (select private.are_friends((select auth.uid()), author_id))
      and not (select private.is_blocked_between(author_id))
      and (select private.has_diary_share(author_id))
    )
  );
