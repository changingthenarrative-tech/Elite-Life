-- Elite Life OS — daily_briefs
-- Scoped by user_id, RLS enabled. Logs the AI input, output, model, and timing.

create table if not exists public.daily_briefs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  brief_date   date not null default current_date,
  -- The three-part brief: { whatsAhead, oneThing, intention }
  content      jsonb not null,
  -- Observability / future pattern-recognition fuel:
  ai_input     text,
  ai_output    text,
  model        text,
  generated_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists daily_briefs_user_date_idx
  on public.daily_briefs (user_id, brief_date desc);

-- Row-level security: a user can only ever see or write their own rows.
alter table public.daily_briefs enable row level security;

drop policy if exists "own briefs — select" on public.daily_briefs;
create policy "own briefs — select"
  on public.daily_briefs for select
  using (auth.uid() = user_id);

drop policy if exists "own briefs — insert" on public.daily_briefs;
create policy "own briefs — insert"
  on public.daily_briefs for insert
  with check (auth.uid() = user_id);

drop policy if exists "own briefs — update" on public.daily_briefs;
create policy "own briefs — update"
  on public.daily_briefs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own briefs — delete" on public.daily_briefs;
create policy "own briefs — delete"
  on public.daily_briefs for delete
  using (auth.uid() = user_id);
