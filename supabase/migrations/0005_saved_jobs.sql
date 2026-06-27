-- ============================================================================
-- GreekBond: saved jobs (bookmarks)
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER 0001_schema.sql.
-- Idempotent: re-runnable.
-- ============================================================================

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, job_id)
);

alter table public.saved_jobs enable row level security;

-- A member can only see / save / unsave their own bookmarks.
drop policy if exists saved_jobs_select on public.saved_jobs;
create policy saved_jobs_select on public.saved_jobs for select to authenticated
  using (profile_id in (select id from public.profiles where user_id = auth.uid()));

drop policy if exists saved_jobs_insert on public.saved_jobs;
create policy saved_jobs_insert on public.saved_jobs for insert to authenticated
  with check (profile_id in (select id from public.profiles where user_id = auth.uid()));

drop policy if exists saved_jobs_delete on public.saved_jobs;
create policy saved_jobs_delete on public.saved_jobs for delete to authenticated
  using (profile_id in (select id from public.profiles where user_id = auth.uid()));

-- ============================================================================
-- After running: the bookmark button on job cards persists per-member.
-- ============================================================================
