-- ============================================================================
-- GreekBond Session H: cross-chapter isolation proof for intro_requests
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Read-only: the whole thing is wrapped in begin/rollback, and the one UPDATE
-- it issues is a probe that is expected to affect 0 rows and is rolled back.
--
-- What it proves, live, against real data (not just by reading the policy):
--   Under the 0012 RLS, a chapter admin can SEE only intro_requests whose target
--   is a member of their OWN chapter, and cannot UPDATE another chapter's row.
--
-- How: it impersonates each admin by setting role = authenticated and the JWT
-- `sub` claim to that admin's user_id, exactly as a real request would, so
-- my_profile() (which keys off auth.uid()) resolves to that admin.
--
-- SETUP: edit the two user_ids below to two admins in DIFFERENT chapters. Find
-- candidates with:
--   select user_id, chapter_id, name from public.profiles
--   where role = 'admin' and user_id is not null and chapter_id is not null
--   order by chapter_id;
-- The DB must also contain at least one intro_request whose target is in the
-- OTHER admin's chapter for the test to be meaningful (otherwise there is simply
-- nothing that could leak). Create one through the app's "Request intro" flow.
-- ============================================================================

begin;

do $$
declare
  admin_a_user uuid := '00000000-0000-0000-0000-000000000000';  -- EDIT: chapter A admin user_id
  admin_b_user uuid := '11111111-1111-1111-1111-111111111111';  -- EDIT: chapter B admin user_id

  a_profile uuid; b_profile uuid;
  a_chapter text;  b_chapter text;
  a_visible int;   a_foreign int;  a_upd int;
  b_foreign int;
  orig text := current_user;
begin
  select id, chapter_id into a_profile, a_chapter from public.profiles where user_id = admin_a_user;
  select id, chapter_id into b_profile, b_chapter from public.profiles where user_id = admin_b_user;

  assert a_profile is not null, 'admin A user_id not found in profiles';
  assert b_profile is not null, 'admin B user_id not found in profiles';
  assert a_chapter is not null and b_chapter is not null, 'both admins need a chapter_id';
  assert a_chapter <> b_chapter, 'pick two admins from DIFFERENT chapters';

  -- ── Impersonate admin A ──────────────────────────────────────────────────
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', admin_a_user)::text, true);

  -- total rows RLS exposes to admin A
  select count(*) into a_visible from public.intro_requests;

  -- rows admin A can see whose target is NOT in A's chapter, EXCLUDING rows where
  -- A is legitimately a party (requester/target/broker). Anything left is a leak
  -- through the chapter-admin clause specifically. Expected: 0.
  select count(*) into a_foreign
    from public.intro_requests ir
    join public.profiles t on t.id = ir.target_id
    where t.chapter_id <> a_chapter
      and ir.requester_id <> a_profile
      and ir.target_id   <> a_profile
      and coalesce(ir.broker_admin_id, '00000000-0000-0000-0000-000000000000'::uuid) <> a_profile;

  -- update isolation: try to touch a row whose target is in the OTHER chapter.
  -- RLS should make this affect 0 rows (and it is rolled back regardless).
  update public.intro_requests ir
     set status = ir.status
    from public.profiles t
   where t.id = ir.target_id
     and t.chapter_id <> a_chapter
     and ir.requester_id <> a_profile
     and ir.target_id   <> a_profile;
  get diagnostics a_upd = row_count;

  perform set_config('role', orig, true);

  -- ── Impersonate admin B (mirror check) ───────────────────────────────────
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', admin_b_user)::text, true);

  select count(*) into b_foreign
    from public.intro_requests ir
    join public.profiles t on t.id = ir.target_id
    where t.chapter_id <> b_chapter
      and ir.requester_id <> b_profile
      and ir.target_id   <> b_profile
      and coalesce(ir.broker_admin_id, '00000000-0000-0000-0000-000000000000'::uuid) <> b_profile;

  perform set_config('role', orig, true);

  raise notice 'admin A (chapter %): % total visible, % cross-chapter visible, % cross-chapter updates',
    a_chapter, a_visible, a_foreign, a_upd;
  raise notice 'admin B (chapter %): % cross-chapter visible', b_chapter, b_foreign;

  assert a_foreign = 0, 'LEAK: admin A can SEE another chapter''s intro_requests';
  assert b_foreign = 0, 'LEAK: admin B can SEE another chapter''s intro_requests';
  assert a_upd = 0,     'LEAK: admin A can UPDATE another chapter''s intro_requests';

  raise notice 'PASS: cross-chapter isolation holds for intro_requests (read + update).';
end $$;

rollback;
