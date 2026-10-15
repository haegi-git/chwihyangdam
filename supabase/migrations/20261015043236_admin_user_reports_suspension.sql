-- User reports and a simple suspend flag.
-- profiles.suspended is not writable through the profile form. The app flips
-- it only through public.set_profile_suspended, which stays in public because
-- the browser client calls it over PostgREST. The guard trigger lives in
-- private. SQL editor (auth.uid() is null) can still set the column directly.
--
-- content_reports and moderation_reviews accept target_type 'user'. Five
-- distinct user reports enqueue a review. They do not suspend the account.
-- Posts and comments still auto-hide at the same threshold of 5.
-- Suspended users cannot insert hobby_posts or hobby_comments. Updates and
-- deletes of their existing rows stay allowed.
-- Do not apply this file from the agent. Review and apply it separately.

alter table public.profiles
  add column if not exists suspended boolean not null default false;

comment on column public.profiles.suspended is
  'When true, the user cannot insert hobby posts or comments. Changed only by public.set_profile_suspended.';

create or replace function private.protect_profile_suspended()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.suspended is true
       and current_setting('private.allow_profile_suspend', true) is distinct from 'on' then
      new.suspended := false;
    end if;
    return new;
  end if;

  if new.suspended is distinct from old.suspended
     and current_setting('private.allow_profile_suspend', true) is distinct from 'on' then
    new.suspended := old.suspended;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_profile_suspended() from public, anon;
grant execute on function private.protect_profile_suspended() to authenticated, service_role;

drop trigger if exists protect_profile_suspended on public.profiles;
create trigger protect_profile_suspended
  before insert or update of suspended
  on public.profiles
  for each row
  execute function private.protect_profile_suspended();

create or replace function public.set_profile_suspended(target uuid, next_suspended boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'forbidden'
      using errcode = '42501';
  end if;

  if target is null or next_suspended is null then
    raise exception 'invalid suspend target'
      using errcode = '22023';
  end if;

  perform set_config('private.allow_profile_suspend', 'on', true);

  update public.profiles
  set suspended = next_suspended,
      updated_at = now()
  where id = target;

  if not found then
    raise exception 'missing profile'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_profile_suspended(uuid, boolean) from public, anon;
grant execute on function public.set_profile_suspended(uuid, boolean) to authenticated, service_role;

alter table public.content_reports
  drop constraint if exists content_reports_target_type_check;

alter table public.content_reports
  add constraint content_reports_target_type_check
  check (target_type = any (array['post'::text, 'comment'::text, 'user'::text]));

alter table public.moderation_reviews
  drop constraint if exists moderation_reviews_target_type_check;

alter table public.moderation_reviews
  add constraint moderation_reviews_target_type_check
  check (target_type = any (array['post'::text, 'comment'::text, 'user'::text]));

create or replace function public.content_reports_reject_own()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.target_type = 'post' then
    if exists (
      select 1
      from public.hobby_posts
      where id = new.target_id
        and author_id = new.reporter_id
    ) then
      raise exception 'cannot report own content'
        using errcode = 'P0001';
    end if;
  elsif new.target_type = 'comment' then
    if exists (
      select 1
      from public.hobby_comments
      where id = new.target_id
        and author_id = new.reporter_id
    ) then
      raise exception 'cannot report own content'
        using errcode = 'P0001';
    end if;
  elsif new.target_type = 'user' then
    if new.target_id = new.reporter_id then
      raise exception 'cannot report own content'
        using errcode = 'P0001';
    end if;

    if not exists (
      select 1
      from public.profiles
      where id = new.target_id
    ) then
      raise exception 'report target missing'
        using errcode = 'P0002';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.content_reports_reject_own() from public, anon, authenticated;

create or replace function public.content_reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_count int;
begin
  select count(*) into report_count
  from public.content_reports
  where target_type = new.target_type
    and target_id = new.target_id;

  if report_count < 5 then
    return new;
  end if;

  -- Lets the hide-column guard accept this write from the reporting user.
  -- User reports enqueue a review and do not suspend the account.
  perform set_config('private.allow_moderation_hide', 'on', true);

  if new.target_type = 'post' then
    update public.hobby_posts
    set hidden_at = coalesce(hidden_at, now()),
        hide_reason = coalesce(hide_reason, 'auto_report_threshold')
    where id = new.target_id
      and hidden_at is null;
  elsif new.target_type = 'comment' then
    update public.hobby_comments
    set hidden_at = coalesce(hidden_at, now()),
        hide_reason = coalesce(hide_reason, 'auto_report_threshold')
    where id = new.target_id
      and hidden_at is null;
  end if;

  insert into public.moderation_reviews as mr (
    target_type, target_id, status, distinct_report_count, updated_at
  ) values (
    new.target_type, new.target_id, 'pending', report_count, now()
  )
  on conflict (target_type, target_id) do update
    set distinct_report_count = excluded.distinct_report_count,
        status = case
          when mr.status in ('cleared', 'removed') then mr.status
          else 'pending'
        end,
        updated_at = now();

  return new;
end;
$$;

revoke all on function public.content_reports_after_insert() from public, anon, authenticated;

create or replace function public.moderation_ai_context(
  p_target_type text,
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  review public.moderation_reviews%rowtype;
  target_title text;
  target_body text;
  reports jsonb;
  found_target boolean := false;
begin
  if auth.uid() is null or not private.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_target_type is null
     or p_target_id is null
     or p_target_type not in ('post', 'comment', 'user') then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into review
  from public.moderation_reviews
  where target_type = p_target_type
    and target_id = p_target_id;

  if not found or review.status is distinct from 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;

  if p_target_type = 'post' then
    select title, body into target_title, target_body
    from public.hobby_posts
    where id = p_target_id;
    found_target := found;
  elsif p_target_type = 'comment' then
    select null, body into target_title, target_body
    from public.hobby_comments
    where id = p_target_id;
    found_target := found;
  else
    select display_name, coalesce(bio, '') into target_title, target_body
    from public.profiles
    where id = p_target_id;
    found_target := found;
  end if;

  if not found_target then
    return jsonb_build_object('ok', false, 'reason', 'missing_target');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'reason', r.reason,
        'detail', r.detail
      )
      order by r.created_at
    ),
    '[]'::jsonb
  )
  into reports
  from public.content_reports r
  where r.target_type = p_target_type
    and r.target_id = p_target_id;

  return jsonb_build_object(
    'ok', true,
    'target_type', p_target_type,
    'target_id', p_target_id,
    'title', target_title,
    'body', target_body,
    'reports', reports,
    'distinct_report_count', review.distinct_report_count,
    'has_ai', review.ai_reviewed_at is not null
  );
end;
$$;

create or replace function public.save_moderation_ai_draft(
  p_target_type text,
  p_target_id uuid,
  p_ai_label text,
  p_ai_summary text,
  p_ai_suggested_action text,
  p_ai_raw jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_id uuid;
begin
  if auth.uid() is null or not private.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_target_type not in ('post', 'comment', 'user') then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  update public.moderation_reviews
  set ai_label = p_ai_label,
      ai_summary = p_ai_summary,
      ai_suggested_action = p_ai_suggested_action,
      ai_raw = p_ai_raw,
      ai_reviewed_at = now(),
      updated_at = now()
  where target_type = p_target_type
    and target_id = p_target_id
    and status = 'pending'
  returning id into updated_id;

  if updated_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;

  return jsonb_build_object('ok', true, 'id', updated_id);
end;
$$;

revoke all on function public.moderation_ai_context(text, uuid) from public, anon;
revoke all on function public.save_moderation_ai_draft(text, uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.moderation_ai_context(text, uuid) to authenticated, service_role;
grant execute on function public.save_moderation_ai_draft(text, uuid, text, text, text, jsonb) to authenticated, service_role;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'hobby_posts'
      and cmd = 'INSERT'
  loop
    execute format('drop policy %I on public.hobby_posts', pol.policyname);
  end loop;

  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'hobby_comments'
      and cmd = 'INSERT'
  loop
    execute format('drop policy %I on public.hobby_comments', pol.policyname);
  end loop;
end $$;

create policy "Authenticated users can create hobby posts"
  on public.hobby_posts
  for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and not coalesce(
      (
        select profiles.suspended
        from public.profiles
        where profiles.id = (select auth.uid())
      ),
      false
    )
  );

create policy "Authenticated users can create hobby comments"
  on public.hobby_comments
  for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and not coalesce(
      (
        select profiles.suspended
        from public.profiles
        where profiles.id = (select auth.uid())
      ),
      false
    )
  );
