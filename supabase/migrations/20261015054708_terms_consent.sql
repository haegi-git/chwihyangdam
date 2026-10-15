-- First-login consent for the current terms version.
-- profiles.terms_agreed_at and profiles.terms_version are written by the
-- signed-in user on their own row. The existing update policy is recreated
-- here so that rule stays in the migration history. A private trigger also
-- refuses consent changes on any other row.
-- Do not apply this file from the agent. Review and apply it separately.

alter table public.profiles
  add column if not exists terms_agreed_at timestamptz,
  add column if not exists terms_version text;

comment on column public.profiles.terms_agreed_at is
  'When the user agreed to the terms version in terms_version. Null until they agree.';

comment on column public.profiles.terms_version is
  'Terms version the user agreed to, for example 2026-10-15.';

alter table public.profiles
  drop constraint if exists profiles_terms_version_length;

alter table public.profiles
  add constraint profiles_terms_version_length
  check (terms_version is null or char_length(terms_version) between 1 and 32);

drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function private.protect_profile_terms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or auth.uid() = new.id then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.terms_agreed_at := null;
    new.terms_version := null;
    return new;
  end if;

  new.terms_agreed_at := old.terms_agreed_at;
  new.terms_version := old.terms_version;
  return new;
end;
$$;

revoke all on function private.protect_profile_terms() from public, anon;
grant execute on function private.protect_profile_terms() to authenticated, service_role;

drop trigger if exists protect_profile_terms on public.profiles;
create trigger protect_profile_terms
  before insert or update of terms_agreed_at, terms_version
  on public.profiles
  for each row
  execute function private.protect_profile_terms();
