-- ============================================================================
-- GreekBond: Session F saved searches
-- ----------------------------------------------------------------------------
-- Run AFTER 0001-0012. Idempotent.
--
-- Members and recruiters can save a query plus its active filter state from
-- the directory or talent search, see them on their Bond page (members) or
-- talent search (recruiters), and re-run them later. Per-user scoped, RLS in
-- the same style as saved_jobs (0005).
-- ============================================================================

create table if not exists public.saved_searches (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  name         text,
  query        text,
  filters      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  last_run_at  timestamptz
);

create index if not exists saved_searches_profile_idx
  on public.saved_searches (profile_id, created_at desc);

alter table public.saved_searches enable row level security;

-- A user can only see, create, rename, or delete their own saved searches.
-- Resolution mirrors the saved_jobs policy: profile_id must belong to the
-- profile whose user_id is auth.uid().
drop policy if exists saved_searches_select on public.saved_searches;
create policy saved_searches_select on public.saved_searches for select to authenticated
  using (profile_id in (select id from public.profiles where user_id = auth.uid()));

drop policy if exists saved_searches_insert on public.saved_searches;
create policy saved_searches_insert on public.saved_searches for insert to authenticated
  with check (profile_id in (select id from public.profiles where user_id = auth.uid()));

drop policy if exists saved_searches_update on public.saved_searches;
create policy saved_searches_update on public.saved_searches for update to authenticated
  using (profile_id in (select id from public.profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.profiles where user_id = auth.uid()));

drop policy if exists saved_searches_delete on public.saved_searches;
create policy saved_searches_delete on public.saved_searches for delete to authenticated
  using (profile_id in (select id from public.profiles where user_id = auth.uid()));

-- ============================================================================
-- After running: every signed-in user can save the query + filters from the
-- directory or recruiter talent search, list their saved searches on the Bond
-- page, and re-run them with the filter state restored.
-- ============================================================================
