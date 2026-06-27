-- ============================================================================
-- GreekBond: chapter fundraisers (DISPLAY / LINK-OUT ONLY)
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER 0006_events.sql (needs the helper
-- functions is_chapter_admin / can_view_chapter / my_profile).
-- Idempotent: re-runnable.
--
-- IMPORTANT: no money moves through GreekBond. A fundraiser is a display card
-- with an outbound `external_url` to the chapter's official giving site. There
-- are intentionally NO payment, balance, or transaction fields.
-- ============================================================================

create table if not exists public.fundraisers (
  id           uuid primary key default gen_random_uuid(),
  chapter_id   text not null references public.chapters(id) on delete cascade,
  created_by   uuid references public.profiles(id) on delete set null,
  title        text not null,
  description  text,
  goal_amount  numeric,            -- display target only; not a tracked balance
  external_url text,               -- the outbound donate link (official site)
  cover_url    text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists fundraisers_chapter_idx on public.fundraisers (chapter_id, active);

alter table public.fundraisers enable row level security;

-- READ: members of, or followers of, the chapter.
drop policy if exists fundraisers_select on public.fundraisers;
create policy fundraisers_select on public.fundraisers
  for select to authenticated
  using (public.can_view_chapter(chapter_id));

-- INSERT: chapter admins only, authoring as themselves.
drop policy if exists fundraisers_insert on public.fundraisers;
create policy fundraisers_insert on public.fundraisers
  for insert to authenticated
  with check (
    public.is_chapter_admin(chapter_id)
    and (created_by is null or created_by = (public.my_profile()).id)
  );

-- UPDATE / DELETE: chapter admins only.
drop policy if exists fundraisers_update on public.fundraisers;
create policy fundraisers_update on public.fundraisers
  for update to authenticated
  using (public.is_chapter_admin(chapter_id))
  with check (public.is_chapter_admin(chapter_id));

drop policy if exists fundraisers_delete on public.fundraisers;
create policy fundraisers_delete on public.fundraisers
  for delete to authenticated
  using (public.is_chapter_admin(chapter_id));

-- ── verify (run after applying) ──────────────────────────────────────────────
-- select * from public.fundraisers;   -- should return [] (RLS-scoped) without error
-- As a chapter admin, this should succeed:
--   insert into public.fundraisers (chapter_id, created_by, title, goal_amount, external_url)
--   values ('tdx', (select id from public.profiles where user_id = auth.uid()),
--           'Scholarship Endowment', 50000, 'https://westbrook.edu/give');
