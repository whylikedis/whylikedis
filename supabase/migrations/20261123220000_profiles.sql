-- Profiles: the name, photo and email a person shares when they sign in, one row per account.
-- Filled from the sign-in provider when the account is made, then theirs to edit.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text check (char_length(first_name) <= 100),
  last_name text check (char_length(last_name) <= 100),
  email text,
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each person sees and edits only their own row. Nobody else, signed in or not, can read it.
create policy "read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- The email column follows the account's email; people change it through Supabase Auth, which
-- checks the new address first. So clients may update the name columns only.
revoke update on public.profiles from authenticated, anon;
grant update (first_name, last_name) on public.profiles to authenticated;

-- Providers name things differently: Google gives given_name and family_name, Apple, X and
-- others give a full name, and photos come as avatar_url or picture.
create function public.profile_from_meta(meta jsonb, out first_name text, out last_name text, out avatar_url text)
language sql immutable set search_path = ''
as $$
  select
    nullif(coalesce(meta->>'given_name', meta->>'first_name', split_part(coalesce(meta->>'full_name', meta->>'name', ''), ' ', 1)), ''),
    nullif(coalesce(meta->>'family_name', meta->>'last_name',
      nullif(regexp_replace(coalesce(meta->>'full_name', meta->>'name', ''), '^\S+\s*', ''), '')), ''),
    case when coalesce(meta->>'avatar_url', meta->>'picture') ~ '^https://'
      then coalesce(meta->>'avatar_url', meta->>'picture') end
$$;

create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare m record;
begin
  select * into m from public.profile_from_meta(new.raw_user_meta_data);
  insert into public.profiles (id, first_name, last_name, email, avatar_url)
  values (new.id, m.first_name, m.last_name, new.email, m.avatar_url);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile's email and any missing name or photo in step with the account: a confirmed
-- email change, or a newly connected provider that brings a photo.
create function public.handle_user_updated()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare m record;
begin
  select * into m from public.profile_from_meta(new.raw_user_meta_data);
  update public.profiles p set
    email = new.email,
    first_name = coalesce(p.first_name, m.first_name),
    last_name = coalesce(p.last_name, m.last_name),
    avatar_url = coalesce(p.avatar_url, m.avatar_url),
    updated_at = now()
  where p.id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_user_updated();

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_updated() from public, anon, authenticated;
