-- ============================================================================
-- Manual RLS proof for 0010_posts_audience_rls.sql
-- Run in Supabase SQL editor. Requires real profile UUIDs from your project.
--
-- Replace the placeholders below with actual ids from:
--   select id, user_id, role, chapter_id, name from public.profiles;
--   select id, user_id from auth.users;
-- ============================================================================

-- ── 0. Placeholders (edit before running) ───────────────────────────────────
-- undergrad in chapter A, NOT bonded with alumni_author
-- \set undergrad_auth_uid  '00000000-0000-0000-0000-000000000001'
-- \set undergrad_profile_id '...'

-- alumni in chapter A, bonded with network_author
-- \set alumni_auth_uid     '...'
-- \set alumni_profile_id   '...'

-- member in chapter B (different chapter)
-- \set other_chapter_auth_uid     '...'
-- \set other_chapter_profile_id   '...'

-- For psql-style variables, use plain substitution in your editor.
-- In Supabase SQL editor, paste literal UUIDs into the queries below.

-- ── 1. Setup test posts (run as service role / postgres, NOT impersonating) ─
-- Pick one author profile id you control; create three posts with distinct audiences.
/*
insert into public.posts (author_id, kind, text, audience) values
  ('<AUTHOR_PROFILE_ID>', 'post', 'RLS test, alumni audience',  'alumni'),
  ('<AUTHOR_PROFILE_ID>', 'post', 'RLS test, network audience', 'network'),
  ('<AUTHOR_PROFILE_ID>', 'post', 'RLS test, chapter audience', 'chapter')
returning id, audience, text;
*/

-- Ensure a bonded row exists for network test (status must be 'bonded', not 'pending'):
/*
insert into public.bonds (a_id, b_id, status) values
  ('<VIEWER_PROFILE_ID>', '<AUTHOR_PROFILE_ID>', 'bonded')
on conflict (a_id, b_id) do update set status = 'bonded';
*/

-- ── 2. Impersonation helper (Supabase JWT simulation) ───────────────────────
-- Repeat block 2a-2c for each test user, substituting auth user UUIDs.

-- 2a. Impersonate UNDERGRAD (should NOT see alumni post)
begin;
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '<UNDERGRAD_AUTH_USER_UUID>', true);

select id, audience, left(text, 40) as preview
from public.posts
where text like 'RLS test%'
order by audience;
-- EXPECT: chapter + network rows IF bonded/same chapter; NO alumni row

rollback;

-- 2b. Impersonate NON-BONDED user (should NOT see network post)
begin;
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '<NON_BONDED_AUTH_USER_UUID>', true);

select id, audience, left(text, 40) as preview
from public.posts
where text like 'RLS test%'
order by audience;
-- EXPECT: no network row unless are_bonded(viewer, author) is true

rollback;

-- 2c. Impersonate DIFFERENT-CHAPTER member (should NOT see chapter post)
begin;
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '<OTHER_CHAPTER_AUTH_USER_UUID>', true);

select id, audience, left(text, 40) as preview
from public.posts
where text like 'RLS test%'
order by audience;
-- EXPECT: no chapter row when profile_chapter_id(viewer) <> profile_chapter_id(author)

rollback;

-- ── 3. Direct helper checks (service role) ──────────────────────────────────
/*
select public.are_bonded('<PROFILE_A>'::uuid, '<PROFILE_B>'::uuid) as bonded;
select public.profile_chapter_id('<PROFILE_ID>'::uuid) as chapter;
select (public.my_profile()).id;  -- only non-null when impersonating
*/

-- ── 4. Cleanup (service role) ───────────────────────────────────────────────
/*
delete from public.posts where text like 'RLS test%';
*/
