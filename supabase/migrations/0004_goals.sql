-- Elite Life OS — goals (Goals & Projects)
-- The context that makes every other feature personal.
-- Scoped by user_id, RLS enabled, granted to authenticated.

create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title       text not null,
  detail      text,
  kind        text not null default 'goal',   -- 'goal' | 'project'
  status      text not null default 'active', -- 'active' | 'stalled' | 'done'
  target_date date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists goals_user_status_idx
  on public.goals (user_id, status, created_at desc);

alter table public.goals enable row level security;

grant select, insert, update, delete on public.goals to authenticated;

drop policy if exists "own goals — select" on public.goals;
create policy "own goals — select"
  on public.goals for select
  using (auth.uid() = user_id);

drop policy if exists "own goals — insert" on public.goals;
create policy "own goals — insert"
  on public.goals for insert
  with check (auth.uid() = user_id);

drop policy if exists "own goals — update" on public.goals;
create policy "own goals — update"
  on public.goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own goals — delete" on public.goals;
create policy "own goals — delete"
  on public.goals for delete
  using (auth.uid() = user_id);
