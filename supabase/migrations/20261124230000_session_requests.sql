-- Session requests: what a visitor sends from /sessions/. Anyone may send one; nobody reads them
-- through the site's key. The team reads them in the Supabase dashboard, and each new one is
-- emailed by the notify-session-request function.

create table public.session_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  for_whom text not null check (for_whom in ('family', 'group')),
  topic text check (char_length(topic) <= 200),
  day date not null,
  time text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  time_zone text not null default 'America/New_York' check (char_length(time_zone) <= 60),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  notes text check (char_length(notes) <= 2000),
  -- The signed-in account that sent it, if any.
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'confirmed', 'declined'))
);

alter table public.session_requests enable row level security;

-- Insert only. A day in the past or more than six months out is refused.
create policy "anyone can send a request" on public.session_requests
  for insert to anon, authenticated
  with check (
    status = 'new'
    and day > current_date
    and day <= current_date + 183
    and (user_id is null or user_id = (select auth.uid()))
  );

revoke all on public.session_requests from anon, authenticated;
grant insert (for_whom, topic, day, time, time_zone, name, email, notes)
  on public.session_requests to anon, authenticated;
