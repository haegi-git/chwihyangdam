-- Move security definer helpers out of the exposed public schema.
-- Do not add `private` to the Data API exposed schemas.
-- Diary SELECT and moderation policies call private.*; PostgREST cannot.
-- moderation_ai_context / save_moderation_ai_draft stay in public because the
-- app calls them over PostgREST. They now require private.is_admin().

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path to private, public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;

-- True only for an accepted pair that includes the signed-in user.
-- Stops anon (and other users) from using the helper as a friendship oracle.
create or replace function private.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path to private, public
as $$
  select a is not null
    and b is not null
    and auth.uid() is not null
    and (a = auth.uid() or b = auth.uid())
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = a and f.addressee_id = b)
          or (f.requester_id = b and f.addressee_id = a)
        )
    );
$$;

revoke all on function private.are_friends(uuid, uuid) from public, anon;
grant execute on function private.are_friends(uuid, uuid) to authenticated, service_role;

create or replace function public.protect_profile_is_admin()
returns trigger
language plpgsql
security definer
set search_path to private, public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.is_admin and not private.is_admin() then
      new.is_admin := false;
    end if;
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin and not private.is_admin() then
    new.is_admin := old.is_admin;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_is_admin() from public, anon, authenticated;

create or replace function public.moderation_ai_context(
  p_target_type text,
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to private, public
as $$
declare
  review public.moderation_reviews%rowtype;
  target_title text;
  target_body text;
  reports jsonb;
begin
  if auth.uid() is null or not private.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_target_type is null or p_target_id is null or p_target_type not in ('post', 'comment') then
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
set search_path to private, public
as $$
declare
  updated_id uuid;
begin
  if auth.uid() is null or not private.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_target_type not in ('post', 'comment') then
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

drop policy if exists "Hobby posts are viewable by everyone" on public.hobby_posts;
create policy "Hobby posts are viewable by everyone"
  on public.hobby_posts
  for select
  using (
    hidden_at is null
    or author_id = auth.uid()
    or private.is_admin()
  );

drop policy if exists "Hobby comments are viewable by everyone" on public.hobby_comments;
create policy "Hobby comments are viewable by everyone"
  on public.hobby_comments
  for select
  using (
    hidden_at is null
    or author_id = auth.uid()
    or private.is_admin()
  );

drop policy if exists "Users can see own reports" on public.content_reports;
create policy "Users can see own reports"
  on public.content_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id or private.is_admin());

drop policy if exists "Admins manage moderation reviews" on public.moderation_reviews;
create policy "Admins manage moderation reviews"
  on public.moderation_reviews
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Admins can update hobby posts" on public.hobby_posts;
create policy "Admins can update hobby posts"
  on public.hobby_posts
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Admins can delete hobby posts" on public.hobby_posts;
create policy "Admins can delete hobby posts"
  on public.hobby_posts
  for delete
  to authenticated
  using (private.is_admin());

drop policy if exists "Admins can update hobby comments" on public.hobby_comments;
create policy "Admins can update hobby comments"
  on public.hobby_comments
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Admins can delete hobby comments" on public.hobby_comments;
create policy "Admins can delete hobby comments"
  on public.hobby_comments
  for delete
  to authenticated
  using (private.is_admin());

drop policy if exists "Users can view own diary entries" on public.diary_entries;
create policy "Users can view own diary entries"
  on public.diary_entries
  for select
  to authenticated
  using (
    auth.uid() = author_id
    or (
      shared_with_friends = true
      and private.are_friends(auth.uid(), author_id)
    )
  );

drop function if exists public.are_friends(uuid, uuid);
drop function if exists public.is_admin();
