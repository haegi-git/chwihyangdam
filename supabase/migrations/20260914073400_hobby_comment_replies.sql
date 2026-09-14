-- One-level replies on hobby comments.
-- parent_id is nullable; replies must point at a top-level comment on the same post.
-- Safe to re-run: IF NOT EXISTS / CREATE OR REPLACE / DROP TRIGGER IF EXISTS.

alter table public.hobby_comments
  add column if not exists parent_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'hobby_comments_parent_id_fkey'
  ) then
    alter table public.hobby_comments
      add constraint hobby_comments_parent_id_fkey
      foreign key (parent_id)
      references public.hobby_comments(id)
      on delete cascade;
  end if;
end $$;

create index if not exists hobby_comments_parent_id_created_at_idx
  on public.hobby_comments (parent_id, created_at);

create or replace function public.hobby_comments_parent_is_top_level()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.hobby_comments c
    where c.id = new.parent_id
      and c.parent_id is null
      and c.post_id = new.post_id
  ) then
    raise exception 'Replies are only allowed one level deep on the same post';
  end if;

  return new;
end;
$$;

drop trigger if exists hobby_comments_parent_is_top_level on public.hobby_comments;

create trigger hobby_comments_parent_is_top_level
  before insert or update of parent_id, post_id
  on public.hobby_comments
  for each row
  execute function public.hobby_comments_parent_is_top_level();

comment on table public.hobby_comments is
  'Comments on hobby_posts. One-level replies via parent_id (null = top-level). Public read; authors insert/update/delete their own rows.';

comment on column public.hobby_comments.parent_id is
  'Null for top-level comments. Replies must reference a top-level comment on the same post. Deleting a parent cascades its replies.';
