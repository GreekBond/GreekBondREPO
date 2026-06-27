-- ============================================================================
-- GreekBond: posts audience RLS (Chapter / Network / Alumni Only)
-- ----------------------------------------------------------------------------
-- Run AFTER 0003_posts.sql and 0009_post_composer.sql. Idempotent.
--
-- Replaces the wide-open posts_select policy (using true) with audience-aware
-- rules so the database refuses rows a viewer should not see.
-- ============================================================================

-- ── helper: confirmed bond between two profiles (pending does NOT count) ────
create or replace function public.are_bonded(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p_a is not null
    and p_b is not null
    and p_a <> p_b
    and exists (
      select 1
      from public.bonds b
      where b.status = 'bonded'
        and (
          (b.a_id = p_a and b.b_id = p_b)
          or (b.a_id = p_b and b.b_id = p_a)
        )
    );
$$;
grant execute on function public.are_bonded(uuid, uuid) to authenticated;

-- ── helper: author's chapter (for chapter-scoped posts) ─────────────────────
create or replace function public.profile_chapter_id(pid uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select chapter_id from public.profiles where id = pid limit 1;
$$;
grant execute on function public.profile_chapter_id(uuid) to authenticated;

-- ── posts_select: audience-aware read policy ────────────────────────────────
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts
  for select to authenticated
  using (
    -- author always sees their own posts
    author_id = (public.my_profile()).id

    -- chapter: viewer and author share a chapter
    or (
      audience = 'chapter'
      and (public.my_profile()).chapter_id is not null
      and (public.my_profile()).chapter_id = public.profile_chapter_id(author_id)
    )

    -- network: confirmed bond between viewer and author
    or (
      audience = 'network'
      and public.are_bonded((public.my_profile()).id, author_id)
    )

    -- alumni only: viewer is alumni or chapter admin
    or (
      audience = 'alumni'
      and (public.my_profile()).role in ('alumni', 'admin')
    )
  );

-- ============================================================================
-- Audience values enforced by posts_audience_check (0009):
--   'chapter' | 'network' | 'alumni'
-- No public/everyone value exists today.
--
-- After running: direct SELECT on posts respects audience. listFeedPosts() may
-- keep its client-side canViewerSeePost filter as defense-in-depth.
-- ============================================================================
