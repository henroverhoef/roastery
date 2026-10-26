-- Roastery: roast log tables. They live in the "worship-sets" Supabase project alongside
-- that app's tables (free plan = two projects), so everything here is prefixed roast_ and
-- touches nothing else. Every row belongs to one signed-in person; Row Level Security
-- makes sure nobody (including other worship-sets users) can see or change anyone else's.

create table public.roast_beans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  country text,
  region text,
  town text,
  producer text,
  altitude_min integer,
  altitude_max integer,
  variety text,
  process text,
  grade text,
  harvest text,
  supplier text,
  price_per_kg numeric,
  seller_notes text,
  target_flavours text[] not null default '{}',
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index roast_beans_user_idx on public.roast_beans (user_id);

create table public.roast_roasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bean_id uuid references public.roast_beans (id) on delete set null,
  roasted_at timestamptz not null default now(),
  batch_g numeric,
  roasted_g numeric,
  ambient_c numeric,
  preheat_c numeric,
  brew text,
  target_level text,
  plan_id text,
  reference_id uuid references public.roast_roasts (id) on delete set null,
  -- [{t, c}] seconds since charge, Gene display (exhaust) °C
  readings jsonb not null default '[]',
  -- [{t, c}] set temperature changes
  setpoints jsonb not null default '[]',
  -- [{t, type, value?, note?}] yellow, fc_start, fc_end, sc_start, drop, colour, smell, note
  events jsonb not null default '[]',
  level text,
  appearance text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index roast_roasts_user_idx on public.roast_roasts (user_id, roasted_at desc);
create index roast_roasts_bean_idx on public.roast_roasts (bean_id);
create index roast_roasts_reference_idx on public.roast_roasts (reference_id);

create table public.roast_tastings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  roast_id uuid not null references public.roast_roasts (id) on delete cascade,
  tasted_on date not null default current_date,
  brew text,
  rating smallint check (rating between 1 and 5),
  -- -2 far too little … 0 just right … +2 far too much
  acidity smallint check (acidity between -2 and 2),
  sweetness smallint check (sweetness between -2 and 2),
  body smallint check (body between -2 and 2),
  bitterness smallint check (bitterness between -2 and 2),
  tags text[] not null default '{}',
  wants text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index roast_tastings_user_idx on public.roast_tastings (user_id);
create index roast_tastings_roast_idx on public.roast_tastings (roast_id);

-- One row per person: unit (°C/°F), default batch size, reminder interval, …
create table public.roast_settings (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.roast_beans enable row level security;
alter table public.roast_roasts enable row level security;
alter table public.roast_tastings enable row level security;
alter table public.roast_settings enable row level security;

create policy "own beans" on public.roast_beans
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own roasts" on public.roast_roasts
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own tastings" on public.roast_tastings
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own settings" on public.roast_settings
  for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
