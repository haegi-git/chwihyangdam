-- Requester cannot accept their own request, and neither party can retarget the row.
-- auth.uid() null (SQL editor / service role) may still repair a row.
-- App re-requests after a decline by updating status, or by delete + insert.
-- It no longer rewrites requester_id / addressee_id.

create schema if not exists private;

create or replace function private.friendships_guard_update()
returns trigger
language plpgsql
security definer
set search_path to private, public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id then
    raise exception 'friendship parties are immutable'
      using errcode = 'P0001';
  end if;

  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    if old.status is distinct from 'pending' or auth.uid() is distinct from old.addressee_id then
      raise exception 'only the addressee can accept a pending friend request'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.friendships_guard_update() from public, anon;
grant execute on function private.friendships_guard_update() to authenticated, service_role;

drop trigger if exists friendships_guard_update on public.friendships;
create trigger friendships_guard_update
  before update on public.friendships
  for each row
  execute function private.friendships_guard_update();

drop policy if exists "Users can update friendships they are in" on public.friendships;
create policy "Users can update friendships they are in"
  on public.friendships
  for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (
    (auth.uid() = requester_id or auth.uid() = addressee_id)
    and (
      status <> 'accepted'
      or auth.uid() = addressee_id
    )
  );
