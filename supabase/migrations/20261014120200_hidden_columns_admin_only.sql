-- Authors can still edit their own text. They cannot change hidden_at or hide_reason.
-- auth.uid() null (SQL editor / service role) may change the columns.
-- Auto-hide runs as the reporting user inside a security definer trigger, so it
-- sets a transaction-local flag before it writes the columns.

create schema if not exists private;

create or replace function private.guard_hidden_columns()
returns trigger
language plpgsql
security definer
set search_path to private, public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if current_setting('private.allow_moderation_hide', true) = 'on' then
    return new;
  end if;

  if private.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.hidden_at := null;
    new.hide_reason := null;
    return new;
  end if;

  new.hidden_at := old.hidden_at;
  new.hide_reason := old.hide_reason;
  return new;
end;
$$;

revoke all on function private.guard_hidden_columns() from public, anon;
grant execute on function private.guard_hidden_columns() to authenticated, service_role;

drop trigger if exists guard_hobby_posts_hidden on public.hobby_posts;
create trigger guard_hobby_posts_hidden
  before insert or update of hidden_at, hide_reason
  on public.hobby_posts
  for each row
  execute function private.guard_hidden_columns();

drop trigger if exists guard_hobby_comments_hidden on public.hobby_comments;
create trigger guard_hobby_comments_hidden
  before insert or update of hidden_at, hide_reason
  on public.hobby_comments
  for each row
  execute function private.guard_hidden_columns();

create or replace function public.content_reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path to private, public
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
