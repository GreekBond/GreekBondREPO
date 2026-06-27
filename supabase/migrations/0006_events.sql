-- ============================================================================
-- GreekBond: chapter events
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER 0001_schema.sql and 0002_rls.sql.
-- Idempotent: re-runnable.
--
-- Replaces the in-memory CHAPTER_DETAIL.events placeholder with a real table.
-- RLS: a member can READ events for any chapter they belong to OR follow;
--      only that chapter's ADMINS can insert/update/delete.
-- ============================================================================

-- ── shared helpers (used by events, fundraisers) ────────────────────────────
-- Is the caller an admin of chapter `cid`?  SECURITY DEFINER so it can read the
-- caller's profile row regardless of the profiles RLS policy.
create or replace function public.is_chapter_admin(cid text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin' and chapter_id = cid
  );
$$;
grant execute on function public.is_chapter_admin(text) to authenticated;

-- Can the caller VIEW chapter `cid`?  True if they belong to it (their profile's
-- chapter) or follow it. SECURITY DEFINER for the same reason.
create or replace function public.can_view_chapter(cid text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and chapter_id = cid
  ) or exists (
    select 1 from public.follows f
    join public.profiles p on p.id = f.profile_id
    where p.user_id = auth.uid() and f.chapter_id = cid
  );
$$;
grant execute on function public.can_view_chapter(text) to authenticated;

-- ── events table ─────────────────────────────────────────────────────────────
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  chapter_id  text not null references public.chapters(id) on delete cascade,
  created_by  uuid references public.profiles(id) on delete set null,
  title       text not null,
  description text,
  location    text,
  start_at    timestamptz,
  end_at      timestamptz,
  cover_url   text,
  created_at  timestamptz not null default now()
);
create index if not exists events_chapter_idx on public.events (chapter_id, start_at);

alter table public.events enable row level security;

-- READ: members of, or followers of, the chapter.
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to authenticated
  using (public.can_view_chapter(chapter_id));

-- INSERT: chapter admins only, authoring as themselves.
drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert to authenticated
  with check (
    public.is_chapter_admin(chapter_id)
    and (created_by is null or created_by = (public.my_profile()).id)
  );

-- UPDATE / DELETE: chapter admins only.
drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update to authenticated
  using (public.is_chapter_admin(chapter_id))
  with check (public.is_chapter_admin(chapter_id));

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete to authenticated
  using (public.is_chapter_admin(chapter_id));

-- ── verify (run after applying) ──────────────────────────────────────────────
-- select * from public.events;        -- should return [] (RLS-scoped) without error
-- As a chapter admin, this should succeed:
--   insert into public.events (chapter_id, created_by, title, start_at)
--   values ('tdx', (select id from public.profiles where user_id = auth.uid()),
--           'Founders Day Dinner', now() + interval '14 days');
