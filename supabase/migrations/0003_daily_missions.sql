-- Elite Life OS — daily_missions (Daily Mission + streak)
-- One mission per user per day. Scoped by user_id, RLS enabled, granted to authenticated.

create table if not exists public.daily_missions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade default auth.uid(),
  mission_date  date not null default current_date,
  mission       text not null,
  completed     boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (user_id, mission_date)
);

create index if not exists daily_missions_user_date_idx
  on public.daily_missions (user_id, mission_date desc);

alter table public.daily_missions enable row level security;

grant select, insert, update, delete on public.daily_missions to authenticated;

drop policy if exists "own missions — select" on public.daily_missions;
create policy "own missions — select"
  on public.daily_missions for select
  using (auth.uid() = user_id);

drop policy if exists "own missions — insert" on public.daily_missions;
create policy "own missions — insert"
  on public.daily_missions for insert
  with check (auth.uid() = user_id);

drop policy if exists "own missions — update" on public.daily_missions;
create policy "own missions — update"
  on public.daily_missions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own missions — delete" on public.daily_missions;
create policy "own missions — delete"
  on public.daily_missions for delete
  using (auth.uid() = user_id);
