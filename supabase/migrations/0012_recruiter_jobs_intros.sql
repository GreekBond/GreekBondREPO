-- ============================================================================
-- GreekBond: Session E: recruiter jobs + brokered intros
-- ----------------------------------------------------------------------------
-- Run AFTER 0001-0011 in the Supabase SQL editor. Idempotent.
--
-- Three changes:
--   1. Extend the jobs table with structured posting fields (salary, apply URL,
--      experience level) used by the recruiter Post a job composer.
--   2. Replace jobs_insert so recruiters can list their own employer postings
--      (poster_id = self, via = 'employer'). Members/admins keep posting too.
--      Brokering still applies to contact and intros, never to listings.
--   3. Extend the recruiter view and intro_requests policies so chapter admins
--      see pending recruiter requests for their chapter members. Recruiters
--      still have no direct-message path to a member.
-- ============================================================================

-- ── 1. jobs columns ─────────────────────────────────────────────────────────
alter table public.jobs add column if not exists salary_min numeric;
alter table public.jobs add column if not exists salary_max numeric;
alter table public.jobs add column if not exists salary_currency text default 'USD';
alter table public.jobs add column if not exists apply_url text;
alter table public.jobs add column if not exists apply_email text;
alter table public.jobs add column if not exists experience text;

create index if not exists jobs_created_idx on public.jobs (created_at desc);

-- ── 2. jobs_insert: allow recruiters to post employer jobs as themselves ─────
-- Decision: option (a). A recruiter job board where recruiters cannot post is
-- broken; brokering belongs on contact, not on listings. Recruiters are limited
-- to via = 'employer' so they cannot impersonate the warm-referral path.
drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs
  for insert to authenticated
  with check (
    poster_id = (public.my_profile()).id
    and (
      (public.my_profile()).role in ('alumni','undergrad','admin')
      or ((public.my_profile()).role = 'recruiter' and via = 'employer')
    )
  );

-- jobs_update and jobs_delete already restrict to poster_id = self in 0002_rls.

-- ── 3. recruiter view: add school + class_year + grad_year ──────────────────
-- These are career-adjacent fields (where they studied, when they graduated),
-- not lineage or heritage. Adding them lets the talent search filter by school
-- and grad year while still hiding pledge class, big_id, honors, line name,
-- about, email, positions.
create or replace view public.profiles_recruiter_view as
  select
    id, name, headline, company, title,
    location, industry, skills, offers,
    open, seeking_tags, seeking, chapter_id,
    school, class_year, grad_year,
    verified, created_at
  from public.profiles;
grant select on public.profiles_recruiter_view to authenticated;

-- ── 4. intro_requests: chapter admins of the target can see + decide ────────
-- The recruiter does not know the chapter admin's profile id at insert time, so
-- broker_admin_id is null. The admin sees pending requests for their chapter
-- members via this extended policy. They can approve or decline; the recruiter
-- can still only see their own requests (no fishing for other recruiters).
drop policy if exists intro_select on public.intro_requests;
create policy intro_select on public.intro_requests
  for select to authenticated
  using (
    requester_id   = (public.my_profile()).id
    or target_id    = (public.my_profile()).id
    or broker_admin_id = (public.my_profile()).id
    or (
      (public.my_profile()).role = 'admin'
      and exists (
        select 1 from public.profiles tp
        where tp.id = intro_requests.target_id
          and tp.chapter_id is not null
          and tp.chapter_id = (public.my_profile()).chapter_id
      )
    )
  );

drop policy if exists intro_update on public.intro_requests;
create policy intro_update on public.intro_requests
  for update to authenticated
  using (
    target_id = (public.my_profile()).id
    or broker_admin_id = (public.my_profile()).id
    or (
      (public.my_profile()).role = 'admin'
      and exists (
        select 1 from public.profiles tp
        where tp.id = intro_requests.target_id
          and tp.chapter_id is not null
          and tp.chapter_id = (public.my_profile()).chapter_id
      )
    )
  )
  with check (
    target_id = (public.my_profile()).id
    or broker_admin_id = (public.my_profile()).id
    or (
      (public.my_profile()).role = 'admin'
      and exists (
        select 1 from public.profiles tp
        where tp.id = intro_requests.target_id
          and tp.chapter_id is not null
          and tp.chapter_id = (public.my_profile()).chapter_id
      )
    )
  );

-- ============================================================================
-- After running:
--   Recruiters can INSERT into jobs with via='employer' and poster_id = self;
--   they still cannot UPDATE or DELETE another poster's job (poster-only).
--   The recruiter view exposes school + class_year + grad_year for talent
--   search. Members and admins read the full profiles table as before.
--   Chapter admins see pending intro_requests for their chapter members and
--   can approve/decline. Recruiter-to-member direct messaging remains absent
--   by design; messaging routes only through approved intro requests.
-- ============================================================================
