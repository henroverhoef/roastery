-- Public library: roasts people chose to share. Each row is a snapshot of one roast (curve,
-- events, weights), its bean (without the price) and its tastings, made by the app when the
-- owner taps "Share". Anyone can read the library, even without signing in; only the owner
-- can add, update or remove their own entries. Deleting the original roast removes it here too.

create table public.roast_public (
  id uuid primary key references public.roast_roasts (id) on delete cascade, -- same id as the roast
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  bean_name text check (char_length(bean_name) <= 120),
  country text check (char_length(country) <= 60),
  process text check (char_length(process) <= 40),
  shares_notes boolean not null default false, -- were written notes included?
  summary jsonb not null default '{}' check (pg_column_size(summary) < 16384), -- for the list
  data jsonb not null check (pg_column_size(data) < 524288), -- roast + bean + tastings
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index roast_public_published_idx on public.roast_public (published_at desc);
create index roast_public_user_idx on public.roast_public (user_id);

alter table public.roast_public enable row level security;

create policy "anyone can read the public library" on public.roast_public
  for select to anon, authenticated using (true);

-- You can only share your own roasts.
create policy "share own roasts" on public.roast_public
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.roast_roasts r where r.id = roast_public.id and r.user_id = (select auth.uid()))
  );
create policy "update own shared roasts" on public.roast_public
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "remove own shared roasts" on public.roast_public
  for delete to authenticated using (user_id = (select auth.uid()));
