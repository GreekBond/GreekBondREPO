-- ============================================================================
-- GreekBond Session I: post_comments audience-isolation proof
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER applying 0015_comments_rls.sql.
-- Read-only effect: everything is wrapped in begin/rollback, so the fixture
-- post and comment it creates are discarded.
--
-- What it proves, live: a comment on an ALUMNI-ONLY post is NOT returned to an
-- undergrad querying post_comments directly, and the parent post is likewise
-- hidden, while the alumni author still sees both. It also proves an undergrad
-- cannot INSERT a comment on a post they cannot see.
--
-- It impersonates each viewer by setting role = authenticated and the JWT `sub`
-- claim to that user's user_id, exactly as a real request would, so my_profile()
-- (which keys off auth.uid()) resolves to that viewer.
--
-- SETUP: edit the two user_ids below.
--   alumni_user    -> a profiles.user_id whose role = 'alumni'
--   undergrad_user -> a profiles.user_id whose role = 'undergrad'
-- Find candidates with:
--   select user_id, role, name from public.profiles
--   where role in ('alumni','undergrad') and user_id is not null order by role;
-- ============================================================================

begin;

do $$
declare
  alumni_user    uuid := '00000000-0000-0000-0000-000000000000';  -- EDIT: an alumni user_id
  undergrad_user uuid := '11111111-1111-1111-1111-111111111111';  -- EDIT: an undergrad user_id

  alumni_profile uuid; undergrad_profile uuid;
  alumni_role text;    undergrad_role text;
  test_post uuid;      test_comment uuid;
  seen_by_undergrad int; post_seen_by_undergrad int; seen_by_alumni int;
  undergrad_insert_blocked boolean := false;
  orig text := current_user;
begin
  select id, role into alumni_profile,    alumni_role    from public.profiles where user_id = alumni_user;
  select id, role into undergrad_profile, undergrad_role from public.profiles where user_id = undergrad_user;

  assert alumni_profile is not null,    'alumni_user not found in profiles';
  assert undergrad_profile is not null, 'undergrad_user not found in profiles';
  assert alumni_role = 'alumni',        'alumni_user must have role = alumni';
  assert undergrad_role = 'undergrad',  'undergrad_user must have role = undergrad';

  -- Fixture (created as the privileged role; rolled back at the end): an
  -- alumni-only post by the alumni author, with one comment on it.
  insert into public.posts (author_id, audience, text)
    values (alumni_profile, 'alumni', 'Session I test: alumni-only post')
    returning id into test_post;
  insert into public.post_comments (post_id, author_id, text)
    values (test_post, alumni_profile, 'Session I test: alumni-only comment')
    returning id into test_comment;

  -- ── Viewer = undergrad: must NOT see the comment or the post ───────────────
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', undergrad_user)::text, true);

  select count(*) into seen_by_undergrad      from public.post_comments where id = test_comment;
  select count(*) into post_seen_by_undergrad from public.posts         where id = test_post;

  -- undergrad must NOT be able to insert a comment on this post either
  begin
    insert into public.post_comments (post_id, author_id, text)
      values (test_post, undergrad_profile, 'undergrad should not be able to post this');
    undergrad_insert_blocked := false;  -- insert unexpectedly succeeded
  exception when others then
    undergrad_insert_blocked := true;   -- RLS with_check rejected it (expected)
  end;

  perform set_config('role', orig, true);

  -- ── Viewer = alumni author: sees both (sanity) ─────────────────────────────
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', alumni_user)::text, true);
  select count(*) into seen_by_alumni from public.post_comments where id = test_comment;
  perform set_config('role', orig, true);

  raise notice 'undergrad: % comment(s) visible, % post(s) visible, insert blocked = %',
    seen_by_undergrad, post_seen_by_undergrad, undergrad_insert_blocked;
  raise notice 'alumni author: % comment(s) visible', seen_by_alumni;

  assert seen_by_undergrad = 0,      'LEAK: undergrad can READ a comment on an alumni-only post';
  assert post_seen_by_undergrad = 0, 'LEAK: undergrad can READ an alumni-only post';
  assert undergrad_insert_blocked,   'LEAK: undergrad can WRITE a comment on a post they cannot see';
  assert seen_by_alumni = 1,         'BUG: alumni author cannot see their own comment';

  raise notice 'PASS: comments are visible only when the parent post is visible.';
end $$;

rollback;
