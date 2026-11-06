-- My plans: roast plans people design themselves (set-temperature changes, target times for
-- yellow / first crack / cool, and an optional target curve). Private to their owner, like roasts.

create table public.roast_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  bean_id uuid references public.roast_beans (id) on delete set null,
  -- {batch_g, preheat_c, target_level, note, steps[], curve[], targets{yellow_s, fc_s}, drop{mode, value}}
  data jsonb not null default '{}' check (pg_column_size(data) < 262144),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index roast_plans_user_idx on public.roast_plans (user_id);
create index roast_plans_bean_idx on public.roast_plans (bean_id);

alter table public.roast_plans enable row level security;

create policy "own plans" on public.roast_plans
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
