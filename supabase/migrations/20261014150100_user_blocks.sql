-- User-level blocks.
-- blocker_id can select/insert/delete their own rows. The blocked person
-- cannot see who blocked them.
--
-- Content visibility is mutual. private.is_blocked_between(other) is
-- security definer and true when auth.uid() and other appear in user_blocks
-- in either direction. hobby_posts and hobby_comments SELECT use it, so the
-- blocked person cannot read the blocker's rows through the Data API even
-- though they cannot select user_blocks. A top-level comment by either
-- party, and the replies under it, are both omitted so the thread does not
-- dangle. A reply by either party under someone else's comment is omitted
-- by itself. private.is_admin() still sees every row. anon (auth.uid() is
-- null) is unchanged.
--
-- Inserting a block deletes the friendship either way. New friend requests
-- either direction fail the friendships insert check (and the update check,
-- because the app revives a request by updating the row). Shared diaries
-- close because diary SELECT still requires private.are_friends.
--
-- Helpers live in private with search_path = '' and are not on the Data API.

create schema if not exists private;

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.user_blocks
  alter column blocker_id set not null,
  alter column blocked_id set not null,
  alter column created_at set not null,
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_blocks_blocker_id_fkey'
  ) then
    alter table public.user_blocks
      add constraint user_blocks_blocker_id_fkey
      foreign key (blocker_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_blocks_blocked_id_fkey'
  ) then
    alter table public.user_blocks
      add constraint user_blocks_blocked_id_fkey
      foreign key (blocked_id) references auth.users(id) on delete cascade;
  end if;
end $$;

alter table public.user_blocks
  drop constraint if exists user_blocks_blocker_blocked_check;

alter table public.user_blocks
  add constraint user_blocks_blocker_blocked_check
  check (blocker_id <> blocked_id);

create index if not exists user_blocks_blocked_id_idx
  on public.user_blocks (blocked_id);

comment on table public.user_blocks is
  'Block row is readable only by blocker_id. Post and comment visibility is mutual via private.is_blocked_between. PK (blocker_id, blocked_id).';

create or replace function private.is_blocked_between(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select other is not null
    and auth.uid() is not null
    and other is distinct from auth.uid()
    and exists (
      select 1
      from public.user_blocks ub
      where (ub.blocker_id = auth.uid() and ub.blocked_id = other)
         or (ub.blocker_id = other and ub.blocked_id = auth.uid())
    );
$$;

create or replace function private.viewer_blocked_comment_author(comment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select comment_id is not null
    and exists (
      select 1
      from public.hobby_comments c
      where c.id = comment_id
        and private.is_blocked_between(c.author_id)
    );
$$;

create or replace function private.pair_has_block(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select a is not null
    and b is not null
    and a <> b
    and exists (
      select 1
      from public.user_blocks ub
      where (ub.blocker_id = a and ub.blocked_id = b)
         or (ub.blocker_id = b and ub.blocked_id = a)
    );
$$;

create or replace function private.remove_friendship_on_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.friendships
  where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
     or (requester_id = new.blocked_id and addressee_id = new.blocker_id);

  return new;
end;
$$;

drop function if exists private.viewer_has_blocked(uuid);

revoke all on function private.is_blocked_between(uuid) from public;
grant execute on function private.is_blocked_between(uuid) to anon, authenticated, service_role;

revoke all on function private.viewer_blocked_comment_author(uuid) from public;
grant execute on function private.viewer_blocked_comment_author(uuid) to anon, authenticated, service_role;

revoke all on function private.pair_has_block(uuid, uuid) from public;
grant execute on function private.pair_has_block(uuid, uuid) to authenticated, service_role;

revoke all on function private.remove_friendship_on_block() from public;
grant execute on function private.remove_friendship_on_block() to authenticated, service_role;

drop trigger if exists user_blocks_remove_friendship on public.user_blocks;
create trigger user_blocks_remove_friendship
  after insert on public.user_blocks
  for each row
  execute function private.remove_friendship_on_block();

alter table public.user_blocks enable row level security;

drop policy if exists "Blockers can view their own blocks" on public.user_blocks;
create policy "Blockers can view their own blocks"
  on public.user_blocks
  for select
  to authenticated
  using (blocker_id = (select auth.uid()));

drop policy if exists "Blockers can create their own blocks" on public.user_blocks;
create policy "Blockers can create their own blocks"
  on public.user_blocks
  for insert
  to authenticated
  with check (blocker_id = (select auth.uid()));

drop policy if exists "Blockers can delete their own blocks" on public.user_blocks;
create policy "Blockers can delete their own blocks"
  on public.user_blocks
  for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

grant select, insert, delete on table public.user_blocks to authenticated;
grant all on table public.user_blocks to service_role;

drop policy if exists "Hobby posts are viewable by everyone" on public.hobby_posts;
create policy "Hobby posts are viewable by everyone"
  on public.hobby_posts
  for select
  using (
    (
      hidden_at is null
      or author_id = (select auth.uid())
      or (select private.is_admin())
    )
    and (
      (select private.is_admin())
      or not private.is_blocked_between(author_id)
    )
  );

drop policy if exists "Hobby comments are viewable by everyone" on public.hobby_comments;
create policy "Hobby comments are viewable by everyone"
  on public.hobby_comments
  for select
  using (
    (
      hidden_at is null
      or author_id = (select auth.uid())
      or (select private.is_admin())
    )
    and (
      (select private.is_admin())
      or (
        not private.is_blocked_between(author_id)
        and (
          parent_id is null
          or not private.viewer_blocked_comment_author(parent_id)
        )
      )
    )
  );

drop policy if exists "Users can request friendships" on public.friendships;
create policy "Users can request friendships"
  on public.friendships
  for insert
  to authenticated
  with check (
    (select auth.uid()) = requester_id
    and status = 'pending'
    and not private.pair_has_block(requester_id, addressee_id)
  );

drop policy if exists "Users can update friendships they are in" on public.friendships;
create policy "Users can update friendships they are in"
  on public.friendships
  for update
  to authenticated
  using (
    (select auth.uid()) = requester_id
    or (select auth.uid()) = addressee_id
  )
  with check (
    (
      (select auth.uid()) = requester_id
      or (select auth.uid()) = addressee_id
    )
    and (
      status <> 'accepted'
      or (select auth.uid()) = addressee_id
    )
    and not private.pair_has_block(requester_id, addressee_id)
  );
