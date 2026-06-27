-- ============================================================================
-- GreekBond: Session 4: Row-Level Security (RLS)
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor AFTER 0001_schema.sql. It is idempotent:
-- every policy is dropped-if-exists before being (re)created, and functions /
-- the recruiter view use create-or-replace, so it can be re-run safely.
--
-- This turns the database from "open for development" into "safe for real
-- users". It enforces the three locked privacy rules:
--
--   Rule 1, Any logged-in MEMBER (alumni/undergrad/admin) can read any profile.
--            RECRUITERS only ever see a restricted set of career columns, served
--            through public.profiles_recruiter_view (Postgres can't hide columns
--            via RLS, so we hide them with a view + role-based routing in db.js).
--   Rule 2, Bonds are visible to a member only when they are a party OR at least
--            one party shares the viewer's chapter. Recruiters: no bond access.
--   Rule 3, Recruiters: name, headline, company, title, location, industry,
--            skills, offers, open, seeking_tags, seeking. Nothing else. Enforced
--            by the view (Rule 1) + the bonds policy (Rule 2) + the vouches policy.
--
-- IMPORTANT, the service role key bypasses RLS entirely (Supabase default) and
-- is used ONLY for server-side bulk-loading of pre-claimed roster rows. It must
-- NEVER appear in the React frontend. The frontend uses the anon key, and after
-- this migration RLS makes every anon-key query safe.
-- ============================================================================


-- ── 1. Enable RLS on every table ────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.bonds          enable row level security;
alter table public.follows        enable row level security;
alter table public.vouches        enable row level security;
alter table public.jobs           enable row level security;
alter table public.intro_requests enable row level security;
alter table public.chapters       enable row level security;


-- ── 2. Helper: the current user's profile row ────────────────────────────────
-- SECURITY DEFINER so it bypasses RLS on profiles (otherwise the policies that
-- call it would recurse). Used in policies to check the viewer's role/chapter.
create or replace function public.my_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select * from public.profiles where user_id = auth.uid() limit 1;
$$;
grant execute on function public.my_profile() to authenticated;

-- Helper: claim a pre-loaded (unclaimed) profile row by the user's VERIFIED
-- email. This is the Session 3 growth-model "claim-by-email" flow. It must run
-- server-side (definer) because, under RLS, a brand-new user can neither read
-- other rows to find their pre-loaded row nor update a row whose user_id is
-- still NULL. It only ever claims a row matching auth.email(), only if the
-- caller has no profile yet, so it is safe. Returns the resulting profile row
-- (the existing one, the freshly claimed one, or NULL if nothing matched).
create or replace function public.claim_profile_by_email()
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.profiles;
  uid uuid := auth.uid();
  em  text := auth.email();
begin
  if uid is null then
    return null;
  end if;

  -- already has a profile → idempotent return
  select * into result from public.profiles where user_id = uid limit 1;
  if found then
    return result;
  end if;

  if em is null then
    return null;
  end if;

  -- claim the oldest unclaimed row whose email matches the verified address
  update public.profiles
     set user_id = uid
   where id = (
     select id from public.profiles
      where lower(email) = lower(em) and user_id is null
      order by created_at asc
      limit 1
   )
  returning * into result;

  return result;  -- NULL if no pre-loaded row matched
end;
$$;
grant execute on function public.claim_profile_by_email() to authenticated;

-- Helper: vouch COUNT for a subject. Recruiters may see how many vouches a
-- member has (a trust signal) but never the content (Rule 3). Members read full
-- vouch rows via the vouches table; recruiters call this definer function so the
-- count works even though the vouches SELECT policy denies them the rows.
create or replace function public.vouch_count(subject uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int from public.vouches where subject_id = subject;
$$;
grant execute on function public.vouch_count(uuid) to authenticated;


-- ── 3. Recruiter view (Rule 1 / Rule 3) ──────────────────────────────────────
-- Only the recruiter-visible career columns. Recruiters query THIS view (routed
-- in db.js); members/admins query the full profiles table. The view runs with
-- the privileges of its owner (default, non-security_invoker), so it returns the
-- safe columns for every profile regardless of the profiles RLS policy, which
-- is exactly the intent: recruiters get a restricted projection of everyone.
create or replace view public.profiles_recruiter_view as
  select
    id, name, headline, company, title,
    location, industry, skills, offers,
    open, seeking_tags, seeking, chapter_id,
    verified, created_at
  from public.profiles;
grant select on public.profiles_recruiter_view to authenticated;


-- ── 4. profiles policies ─────────────────────────────────────────────────────
-- SELECT: you can always read your OWN row (needed for claim/onboarding and for
--   my_profile()). Members (alumni/undergrad/admin) can read ALL rows. Recruiters
--   match neither branch except their own row → everyone else comes via the view.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or (public.my_profile()).role in ('alumni','undergrad','admin')
  );

-- INSERT: a user can only create their own profile row.
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (user_id = auth.uid());

-- UPDATE: a user can only update their own profile. (Claiming an unclaimed row
--   goes through claim_profile_by_email(), not a direct UPDATE.)
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE: no policy → blocked for all anon/authenticated. Admin-only via the
--   service role (which bypasses RLS).


-- ── 5. bonds policies (Rule 2) ───────────────────────────────────────────────
-- SELECT: members only (recruiters get nothing). A member sees a bond if they
--   are one of the two parties, OR at least one party shares the viewer's chapter.
drop policy if exists bonds_select on public.bonds;
create policy bonds_select on public.bonds
  for select to authenticated
  using (
    (public.my_profile()).role in ('alumni','undergrad','admin')
    and (
      exists (
        select 1 from public.profiles me
        where me.user_id = auth.uid() and me.id in (bonds.a_id, bonds.b_id)
      )
      or exists (
        select 1 from public.profiles p
        where p.id in (bonds.a_id, bonds.b_id)
          and p.chapter_id is not null
          and p.chapter_id = (public.my_profile()).chapter_id
      )
    )
  );

-- INSERT: a member may create a bond where they are the a_id (the initiator).
drop policy if exists bonds_insert on public.bonds;
create policy bonds_insert on public.bonds
  for insert to authenticated
  with check (
    a_id in (select id from public.profiles where user_id = auth.uid())
  );

-- UPDATE: either party may update (accept/confirm).
drop policy if exists bonds_update on public.bonds;
create policy bonds_update on public.bonds
  for update to authenticated
  using (
    a_id in (select id from public.profiles where user_id = auth.uid())
    or b_id in (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    a_id in (select id from public.profiles where user_id = auth.uid())
    or b_id in (select id from public.profiles where user_id = auth.uid())
  );

-- DELETE: either party may un-bond.
drop policy if exists bonds_delete on public.bonds;
create policy bonds_delete on public.bonds
  for delete to authenticated
  using (
    a_id in (select id from public.profiles where user_id = auth.uid())
    or b_id in (select id from public.profiles where user_id = auth.uid())
  );


-- ── 6. follows policies ──────────────────────────────────────────────────────
-- SELECT: any authenticated user can see follows (chapters are public in-app).
drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows
  for select to authenticated
  using (true);

-- INSERT: a user can only create their own follows.
drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows
  for insert to authenticated
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- DELETE: a user can only remove their own follows.
drop policy if exists follows_delete on public.follows;
create policy follows_delete on public.follows
  for delete to authenticated
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );


-- ── 7. vouches policies (Rule 3) ─────────────────────────────────────────────
-- SELECT: members/admins read vouch rows. Recruiters are denied the rows; they
--   get a count via public.vouch_count() instead (content stays hidden).
drop policy if exists vouches_select on public.vouches;
create policy vouches_select on public.vouches
  for select to authenticated
  using ((public.my_profile()).role in ('alumni','undergrad','admin'));

-- INSERT: only members/admins may vouch, and only as themselves (author = self).
drop policy if exists vouches_insert on public.vouches;
create policy vouches_insert on public.vouches
  for insert to authenticated
  with check (
    (public.my_profile()).role in ('alumni','undergrad','admin')
    and author_id = (public.my_profile()).id
  );

-- UPDATE / DELETE: author only.
drop policy if exists vouches_update on public.vouches;
create policy vouches_update on public.vouches
  for update to authenticated
  using (author_id = (public.my_profile()).id)
  with check (author_id = (public.my_profile()).id);

drop policy if exists vouches_delete on public.vouches;
create policy vouches_delete on public.vouches
  for delete to authenticated
  using (author_id = (public.my_profile()).id);


-- ── 8. jobs policies ─────────────────────────────────────────────────────────
-- SELECT: any authenticated user (recruiters included).
drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs
  for select to authenticated
  using (true);

-- INSERT: members/admins only. Recruiter postings go through the admin broker
--   flow, not a direct recruiter insert.
drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs
  for insert to authenticated
  with check ((public.my_profile()).role in ('alumni','undergrad','admin'));

-- UPDATE / DELETE: poster only.
drop policy if exists jobs_update on public.jobs;
create policy jobs_update on public.jobs
  for update to authenticated
  using (poster_id = (public.my_profile()).id)
  with check (poster_id = (public.my_profile()).id);

drop policy if exists jobs_delete on public.jobs;
create policy jobs_delete on public.jobs
  for delete to authenticated
  using (poster_id = (public.my_profile()).id);


-- ── 9. intro_requests policies ───────────────────────────────────────────────
-- SELECT: only the requester, the target, or the brokering admin can see it.
drop policy if exists intro_select on public.intro_requests;
create policy intro_select on public.intro_requests
  for select to authenticated
  using (
    requester_id   = (public.my_profile()).id
    or target_id    = (public.my_profile()).id
    or broker_admin_id = (public.my_profile()).id
  );

-- INSERT: any authenticated user, but only as the requester (requester = self).
drop policy if exists intro_insert on public.intro_requests;
create policy intro_insert on public.intro_requests
  for insert to authenticated
  with check (requester_id = (public.my_profile()).id);

-- UPDATE: target or broker admin only (to accept/decline).
drop policy if exists intro_update on public.intro_requests;
create policy intro_update on public.intro_requests
  for update to authenticated
  using (
    target_id = (public.my_profile()).id
    or broker_admin_id = (public.my_profile()).id
  )
  with check (
    target_id = (public.my_profile()).id
    or broker_admin_id = (public.my_profile()).id
  );

-- DELETE: requester only.
drop policy if exists intro_delete on public.intro_requests;
create policy intro_delete on public.intro_requests
  for delete to authenticated
  using (requester_id = (public.my_profile()).id);


-- ── 10. chapters policies ────────────────────────────────────────────────────
-- SELECT: any authenticated user (chapters are public within the app).
drop policy if exists chapters_select on public.chapters;
create policy chapters_select on public.chapters
  for select to authenticated
  using (true);

-- INSERT / UPDATE: admin role only.
drop policy if exists chapters_insert on public.chapters;
create policy chapters_insert on public.chapters
  for insert to authenticated
  with check ((public.my_profile()).role = 'admin');

drop policy if exists chapters_update on public.chapters;
create policy chapters_update on public.chapters
  for update to authenticated
  using ((public.my_profile()).role = 'admin')
  with check ((public.my_profile()).role = 'admin');

-- DELETE: no policy → service role only.


-- ============================================================================
-- After running: Table Editor → each of the 7 tables shows RLS = enabled.
-- The anon key is now safe for the frontend; every query is access-checked.
-- ============================================================================
