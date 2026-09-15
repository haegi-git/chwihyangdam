-- Peaceful community moderation (mirrors live project zindpeseivricksyzvyt).
-- profiles.is_admin, hidden_at on posts/comments, content_reports, moderation_reviews,
-- auto-hide at 5 distinct reports, public.is_admin() helper.
-- Safe to re-run: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Solo operator flag. Read via public.is_admin(); not granted from the profile form.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to anon, authenticated, service_role;

alter table public.hobby_posts
  add column if not exists hidden_at timestamptz,
  add column if not exists hide_reason text;

alter table public.hobby_comments
  add column if not exists hidden_at timestamptz,
  add column if not exists hide_reason text;

comment on column public.hobby_posts.hidden_at is
  'When set, RLS hides the row from everyone except the author and admins.';
comment on column public.hobby_comments.hidden_at is
  'When set, RLS hides the row from everyone except the author and admins.';

drop policy if exists "Hobby posts are viewable by everyone" on public.hobby_posts;
create policy "Hobby posts are viewable by everyone"
  on public.hobby_posts
  for select
  using (
    hidden_at is null
    or author_id = auth.uid()
    or is_admin()
  );

drop policy if exists "Hobby comments are viewable by everyone" on public.hobby_comments;
create policy "Hobby comments are viewable by everyone"
  on public.hobby_comments
  for select
  using (
    hidden_at is null
    or author_id = auth.uid()
    or is_admin()
  );

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.content_reports
  alter column id set default gen_random_uuid(),
  alter column reporter_id set not null,
  alter column target_type set not null,
  alter column target_id set not null,
  alter column reason set not null,
  alter column created_at set not null,
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_reports_reporter_id_fkey'
  ) then
    alter table public.content_reports
      add constraint content_reports_reporter_id_fkey
      foreign key (reporter_id) references auth.users(id) on delete cascade;
  end if;
end $$;

alter table public.content_reports
  drop constraint if exists content_reports_target_type_check;
alter table public.content_reports
  add constraint content_reports_target_type_check
  check (target_type = any (array['post'::text, 'comment'::text]));

alter table public.content_reports
  drop constraint if exists content_reports_reason_check;
alter table public.content_reports
  add constraint content_reports_reason_check
  check (
    reason = any (
      array[
        'hate_abuse'::text,
        'baseless_attack'::text,
        'conflict_bait'::text,
        'spam'::text,
        'other'::text
      ]
    )
  );

alter table public.content_reports
  drop constraint if exists content_reports_detail_check;
alter table public.content_reports
  add constraint content_reports_detail_check
  check (detail is null or char_length(detail) <= 500);

alter table public.content_reports
  drop constraint if exists content_reports_reporter_id_target_type_target_id_key;
alter table public.content_reports
  add constraint content_reports_reporter_id_target_type_target_id_key
  unique (reporter_id, target_type, target_id);

create index if not exists content_reports_target_idx
  on public.content_reports (target_type, target_id, created_at);

create index if not exists content_reports_reporter_created_idx
  on public.content_reports (reporter_id, created_at);

comment on table public.content_reports is
  'Authenticated users insert their own reports. Select own or admin. Unique per reporter and target.';

alter table public.content_reports enable row level security;

drop policy if exists "Users can create reports" on public.content_reports;
create policy "Users can create reports"
  on public.content_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can see own reports" on public.content_reports;
create policy "Users can see own reports"
  on public.content_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id or is_admin());

grant select, insert, update, delete on table public.content_reports to anon, authenticated;
grant all on table public.content_reports to service_role;

create table if not exists public.moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  status text not null default 'pending',
  distinct_report_count integer not null default 0,
  ai_label text,
  ai_summary text,
  ai_suggested_action text,
  ai_raw jsonb,
  ai_reviewed_at timestamptz,
  operator_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.moderation_reviews
  alter column id set default gen_random_uuid(),
  alter column target_type set not null,
  alter column target_id set not null,
  alter column status set not null,
  alter column status set default 'pending',
  alter column distinct_report_count set not null,
  alter column distinct_report_count set default 0,
  alter column created_at set not null,
  alter column created_at set default now(),
  alter column updated_at set not null,
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'moderation_reviews_decided_by_fkey'
  ) then
    alter table public.moderation_reviews
      add constraint moderation_reviews_decided_by_fkey
      foreign key (decided_by) references auth.users(id) on delete set null;
  end if;
end $$;

alter table public.moderation_reviews
  drop constraint if exists moderation_reviews_target_type_check;
alter table public.moderation_reviews
  add constraint moderation_reviews_target_type_check
  check (target_type = any (array['post'::text, 'comment'::text]));

alter table public.moderation_reviews
  drop constraint if exists moderation_reviews_status_check;
alter table public.moderation_reviews
  add constraint moderation_reviews_status_check
  check (
    status = any (
      array[
        'pending'::text,
        'cleared'::text,
        'keep_hidden'::text,
        'removed'::text
      ]
    )
  );

alter table public.moderation_reviews
  drop constraint if exists moderation_reviews_target_type_target_id_key;
alter table public.moderation_reviews
  add constraint moderation_reviews_target_type_target_id_key
  unique (target_type, target_id);

create index if not exists moderation_reviews_status_idx
  on public.moderation_reviews (status, updated_at desc);

comment on table public.moderation_reviews is
  'Operator inbox. Enqueued when distinct reports reach 5. Admin-only RLS. AI fields are advisory.';

alter table public.moderation_reviews enable row level security;

drop policy if exists "Admins manage moderation reviews" on public.moderation_reviews;
create policy "Admins manage moderation reviews"
  on public.moderation_reviews
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

grant select, insert, update, delete on table public.moderation_reviews to anon, authenticated;
grant all on table public.moderation_reviews to service_role;

create or replace function public.content_reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  report_count int;
begin
  select count(*) into report_count
  from public.content_reports
  where target_type = new.target_type
    and target_id = new.target_id;

  -- Only auto-hide + enqueue operator review at threshold
  if report_count < 5 then
    return new;
  end if;

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

drop trigger if exists content_reports_after_insert on public.content_reports;
create trigger content_reports_after_insert
  after insert on public.content_reports
  for each row
  execute function public.content_reports_after_insert();

revoke all on function public.content_reports_after_insert() from public, anon, authenticated;

-- Known solo operator on the live project. No-op if the profile is absent.
update public.profiles
set is_admin = true
where id = 'db87bca6-6c17-4fb2-b499-533a09a3a0be'
  and is_admin is distinct from true;
