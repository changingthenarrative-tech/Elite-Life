-- Elite Life OS — daily_reviews (Evening Review)
-- Mirrors daily_briefs: scoped by user_id, RLS enabled, granted to authenticated.

create table if not exists public.daily_reviews (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade default auth.uid(),
  review_date     date not null default current_date,
  -- The three-part review: { wins, lesson, tomorrow }
  content         jsonb not null,
  -- The user's own end-of-day reflection (optional):
  user_reflection text,
  ai_input        text,
  ai_output       text,
  model           text,
  generated_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists daily_reviews_user_date_idx
  on public.daily_reviews (user_id, review_date desc);

alter table public.daily_reviews enable row level security;

-- Base grant (the piece that was missing on daily_briefs and caused "permission denied").
grant select, insert, update, delete on public.daily_reviews to authenticated;

drop policy if exists "own reviews — select" on public.daily_reviews;
create policy "own reviews — select"
  on public.daily_reviews for select
  using (auth.uid() = user_id);

drop policy if exists "own reviews — insert" on public.daily_reviews;
create policy "own reviews — insert"
  on public.daily_reviews for insert
  with check (auth.uid() = user_id);

drop policy if exists "own reviews — update" on public.daily_reviews;
create policy "own reviews — update"
  on public.daily_reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own reviews — delete" on public.daily_reviews;
create policy "own reviews — delete"
  on public.daily_reviews for delete
  using (auth.uid() = user_id);
