-- Public library security check (optional, for peace of mind).
-- How to run: Supabase → project "worship-sets" → SQL Editor → paste this file → Run.
--
-- It pretends to be (1) you, (2) a random signed-in stranger and (3) a signed-out visitor,
-- and tries to read and change things. It always ends with an error message that starts
-- with "RESULT (rolled back):". That message IS the result, and raising it makes Postgres
-- undo everything, so nothing is saved.
--
-- Expected result:
--   owner can share own roast; stranger update rows=0; stranger delete rows=0;
--   stranger can read it=1; stranger can read the private roast=0;
--   stranger sharing someone else's roast blocked; signed-out can read it=1;
--   signed-out sees private roasts=0; signed-out sharing blocked
--
-- Change the email below if you use a different login.
do $$
declare
  uid uuid;
  n int;
  msg text := '';
begin
  select id into uid from auth.users where lower(email) = 'hertzogv120@gmail.com';
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.roast_roasts (id) values ('11111111-1111-4111-8111-111111111111'), ('11111111-1111-4111-8111-111111111112');
  insert into public.roast_public (id, display_name, data) values ('11111111-1111-4111-8111-111111111111', 'Test', '{}');
  msg := msg || 'owner can share own roast; ';

  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
  update public.roast_public set display_name = 'hacked' where id = '11111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count; msg := msg || 'stranger update rows=' || n || '; ';
  delete from public.roast_public where id = '11111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count; msg := msg || 'stranger delete rows=' || n || '; ';
  select count(*) into n from public.roast_public where id = '11111111-1111-4111-8111-111111111111';
  msg := msg || 'stranger can read it=' || n || '; ';
  select count(*) into n from public.roast_roasts where id = '11111111-1111-4111-8111-111111111111';
  msg := msg || 'stranger can read the private roast=' || n || '; ';
  begin
    insert into public.roast_public (id, user_id, display_name, data) values ('11111111-1111-4111-8111-111111111112', '22222222-2222-4222-8222-222222222222', 'Thief', '{}');
    msg := msg || 'stranger shared someone else''s roast (BAD); ';
  exception when others then
    msg := msg || 'stranger sharing someone else''s roast blocked; ';
  end;

  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.roast_public where id = '11111111-1111-4111-8111-111111111111';
  msg := msg || 'signed-out can read it=' || n || '; ';
  select count(*) into n from public.roast_roasts;
  msg := msg || 'signed-out sees private roasts=' || n || '; ';
  begin
    insert into public.roast_public (id, display_name, data) values ('11111111-1111-4111-8111-111111111112', 'Anon', '{}');
    msg := msg || 'signed-out could share (BAD)';
  exception when others then
    msg := msg || 'signed-out sharing blocked';
  end;
  raise exception 'RESULT (rolled back): %', msg;
end $$;
