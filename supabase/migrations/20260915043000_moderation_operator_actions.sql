-- Operator actions + AI draft helpers for 취향담 moderation.
-- Additive on top of 20260915040736_moderation_reports_auto_hide.
-- Safe to re-run: CREATE OR REPLACE / DROP POLICY IF EXISTS / DROP TRIGGER IF EXISTS.

-- Authors cannot flip is_admin via the profile form. SQL editor (auth.uid() null) still can.
create or replace function public.protect_profile_is_admin()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.is_admin and not public.is_admin() then
      new.is_admin := false;
    end if;
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    new.is_admin := old.is_admin;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_is_admin on public.profiles;
create trigger protect_profile_is_admin
  before insert or update of is_admin
  on public.profiles
  for each row
  execute function public.protect_profile_is_admin();

-- Do not let people report their own post or comment.
create or replace function public.content_reports_reject_own()
returns trigger
language plpgsql
set search_path to 'public'
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
  end if;

  return new;
end;
$$;

drop trigger if exists content_reports_reject_own on public.content_reports;
create trigger content_reports_reject_own
  before insert on public.content_reports
  for each row
  execute function public.content_reports_reject_own();

-- Admin needs to unhide, keep hidden, or delete other people's content.
drop policy if exists "Admins can update hobby posts" on public.hobby_posts;
create policy "Admins can update hobby posts"
  on public.hobby_posts
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "Admins can delete hobby posts" on public.hobby_posts;
create policy "Admins can delete hobby posts"
  on public.hobby_posts
  for delete
  to authenticated
  using (is_admin());

drop policy if exists "Admins can update hobby comments" on public.hobby_comments;
create policy "Admins can update hobby comments"
  on public.hobby_comments
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "Admins can delete hobby comments" on public.hobby_comments;
create policy "Admins can delete hobby comments"
  on public.hobby_comments
  for delete
  to authenticated
  using (is_admin());

-- Snapshot for the advisory AI draft. Admin, or a reporter of a pending review.
create or replace function public.moderation_ai_context(
  p_target_type text,
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  review public.moderation_reviews%rowtype;
  allowed boolean;
  target_title text;
  target_body text;
  reports jsonb;
begin
  if p_target_type is null or p_target_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if p_target_type not in ('post', 'comment') then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into review
  from public.moderation_reviews
  where target_type = p_target_type
    and target_id = p_target_id;

  if not found or review.status is distinct from 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;

  allowed := public.is_admin() or exists (
    select 1
    from public.content_reports
    where target_type = p_target_type
      and target_id = p_target_id
      and reporter_id = auth.uid()
  );

  if not allowed then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_target_type = 'post' then
    select title, body into target_title, target_body
    from public.hobby_posts
    where id = p_target_id;
  else
    select null, body into target_title, target_body
    from public.hobby_comments
    where id = p_target_id;
  end if;

  if target_body is null and target_title is null then
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

revoke all on function public.moderation_ai_context(text, uuid) from public;
grant execute on function public.moderation_ai_context(text, uuid) to authenticated, service_role;

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
set search_path to 'public'
as $$
declare
  allowed boolean;
  updated_id uuid;
begin
  if p_target_type not in ('post', 'comment') then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  allowed := public.is_admin() or exists (
    select 1
    from public.content_reports
    where target_type = p_target_type
      and target_id = p_target_id
      and reporter_id = auth.uid()
  );

  if not allowed then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
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

revoke all on function public.save_moderation_ai_draft(text, uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.save_moderation_ai_draft(text, uuid, text, text, text, jsonb) to authenticated, service_role;

revoke all on function public.moderation_ai_context(text, uuid) from public, anon;
grant execute on function public.moderation_ai_context(text, uuid) to authenticated, service_role;

-- Trigger functions are not meant to be called over PostgREST.
revoke all on function public.protect_profile_is_admin() from public, anon, authenticated;
revoke all on function public.content_reports_reject_own() from public, anon, authenticated;
revoke all on function public.content_reports_after_insert() from public, anon, authenticated;
