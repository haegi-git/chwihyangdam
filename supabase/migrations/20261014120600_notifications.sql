-- In-app notices. Rows store ids only — never post titles or comment text.
-- Clients cannot insert. Security definer triggers create rows.
-- Recipients may read, delete, and change read_at on their own rows.

create schema if not exists private;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  post_id uuid references public.hobby_posts(id) on delete cascade,
  comment_id uuid references public.hobby_comments(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications
  alter column id set default gen_random_uuid(),
  alter column recipient_id set not null,
  alter column type set not null,
  alter column created_at set not null,
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_recipient_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_recipient_id_fkey
      foreign key (recipient_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'notifications_actor_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_actor_id_fkey
      foreign key (actor_id) references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'notifications_post_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_post_id_fkey
      foreign key (post_id) references public.hobby_posts(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'notifications_comment_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_comment_id_fkey
      foreign key (comment_id) references public.hobby_comments(id) on delete cascade;
  end if;
end $$;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('friend_request', 'friend_accepted', 'post_comment', 'comment_reply'));

alter table public.notifications
  drop constraint if exists notifications_target_check;

alter table public.notifications
  add constraint notifications_target_check
  check (
    (
      type in ('friend_request', 'friend_accepted')
      and post_id is null
      and comment_id is null
    )
    or (
      type in ('post_comment', 'comment_reply')
      and post_id is not null
      and comment_id is not null
    )
  );

create index if not exists notifications_recipient_created_at_idx
  on public.notifications (recipient_id, created_at desc);

comment on table public.notifications is
  'Recipient notices. Ids only, no post or comment text. Inserts come from private notify triggers.';

alter table public.notifications enable row level security;

drop policy if exists "Recipients read own notifications" on public.notifications;
create policy "Recipients read own notifications"
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = recipient_id);

drop policy if exists "Recipients update own notification read state" on public.notifications;
create policy "Recipients update own notification read state"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

drop policy if exists "Recipients delete own notifications" on public.notifications;
create policy "Recipients delete own notifications"
  on public.notifications
  for delete
  to authenticated
  using ((select auth.uid()) = recipient_id);

revoke all on table public.notifications from public, anon, authenticated;
grant select, delete on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

-- Either-way block check for triggers, where auth.uid() may not be one of the pair.
-- Uses private.pair_has_block when that helper exists, otherwise public.user_blocks.
create or replace function private.users_blocked_either_way(a uuid, b uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  blocked boolean;
begin
  if a is null or b is null or a = b then
    return false;
  end if;

  if to_regprocedure('private.pair_has_block(uuid,uuid)') is not null then
    execute 'select private.pair_has_block($1, $2)'
      into blocked
      using a, b;
    return coalesce(blocked, false);
  end if;

  if to_regclass('public.user_blocks') is null then
    return false;
  end if;

  return exists (
    select 1
    from public.user_blocks ub
    where (ub.blocker_id = a and ub.blocked_id = b)
       or (ub.blocker_id = b and ub.blocked_id = a)
  );
end;
$$;

revoke all on function private.users_blocked_either_way(uuid, uuid) from public, anon, authenticated;
grant execute on function private.users_blocked_either_way(uuid, uuid) to service_role;

create or replace function private.notifications_guard_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.recipient_id is distinct from old.recipient_id
     or new.actor_id is distinct from old.actor_id
     or new.type is distinct from old.type
     or new.post_id is distinct from old.post_id
     or new.comment_id is distinct from old.comment_id
     or new.created_at is distinct from old.created_at
  then
    raise exception 'notifications only allow read_at changes'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.notifications_guard_update() from public, anon;
grant execute on function private.notifications_guard_update() to authenticated, service_role;

drop trigger if exists notifications_guard_update on public.notifications;
create trigger notifications_guard_update
  before update on public.notifications
  for each row
  execute function private.notifications_guard_update();

create or replace function private.notify_on_friendship()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  recipient uuid;
  actor uuid;
  kind text;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      recipient := new.addressee_id;
      actor := new.requester_id;
      kind := 'friend_request';
    elsif new.status = 'accepted' then
      recipient := new.requester_id;
      actor := new.addressee_id;
      kind := 'friend_accepted';
    else
      return new;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status = 'accepted' and old.status is distinct from 'accepted' then
      recipient := new.requester_id;
      actor := new.addressee_id;
      kind := 'friend_accepted';
    elsif new.status = 'pending' and old.status is distinct from 'pending' then
      -- Re-requests after a decline update the same row instead of inserting.
      recipient := new.addressee_id;
      actor := new.requester_id;
      kind := 'friend_request';
    else
      return new;
    end if;
  else
    return new;
  end if;

  if recipient is null or actor is null or recipient = actor then
    return new;
  end if;

  if private.users_blocked_either_way(actor, recipient) then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type)
  values (recipient, actor, kind);

  return new;
end;
$$;

revoke all on function private.notify_on_friendship() from public, anon;
grant execute on function private.notify_on_friendship() to authenticated, service_role;

drop trigger if exists friendships_notify on public.friendships;
create trigger friendships_notify
  after insert or update of status
  on public.friendships
  for each row
  execute function private.notify_on_friendship();

create or replace function private.notify_on_hobby_comment()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  recipient uuid;
  kind text;
begin
  if new.parent_id is null then
    select p.author_id
      into recipient
    from public.hobby_posts p
    where p.id = new.post_id;
    kind := 'post_comment';
  else
    select c.author_id
      into recipient
    from public.hobby_comments c
    where c.id = new.parent_id;
    kind := 'comment_reply';
  end if;

  if recipient is null or recipient = new.author_id then
    return new;
  end if;

  if private.users_blocked_either_way(new.author_id, recipient) then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
  values (recipient, new.author_id, kind, new.post_id, new.id);

  return new;
end;
$$;

revoke all on function private.notify_on_hobby_comment() from public, anon;
grant execute on function private.notify_on_hobby_comment() to authenticated, service_role;

drop trigger if exists hobby_comments_notify on public.hobby_comments;
create trigger hobby_comments_notify
  after insert on public.hobby_comments
  for each row
  execute function private.notify_on_hobby_comment();
