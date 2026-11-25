-- "I want more on this": one row per press or un-press under an answer. Anonymous on purpose:
-- the topic and the choice, never who. Anyone may add a row; nobody reads them through the
-- site's key. The team reads the totals in the Supabase dashboard: per topic, the rows with
-- wants = true minus the rows with wants = false.

create table public.interest_signals (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  topic text not null check (char_length(topic) <= 120 and topic ~ '^[a-z]+:[a-z0-9-]+$'),
  wants boolean not null
);

alter table public.interest_signals enable row level security;

create policy "anyone can say they want more" on public.interest_signals
  for insert to anon, authenticated
  with check (true);

revoke all on public.interest_signals from anon, authenticated;
grant insert (topic, wants) on public.interest_signals to anon, authenticated;
