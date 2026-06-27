-- ============================================================================
-- GreekBond Session I: post_comments audience RLS (close the last privacy hole)
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER 0004_comments.sql and 0010_posts_audience_rls.sql.
-- Idempotent.
--
-- Problem: comments_select was `using (true)`, so any authenticated user could
-- read comments on ANY post directly from the DB, including comments on posts
-- they cannot see (alumni-only, chapter-only, network-only). That partly defeats
-- the 0010 posts audience RLS.
--
-- Fix: a comment is readable only when its parent post is readable by the viewer.
-- We do NOT re-implement the audience logic here. We reference public.posts in a
-- subquery; because posts has RLS (posts_select from 0010), that subquery returns
-- the post only if the viewer is allowed to see it. So posts_select stays the one
-- source of truth for visibility, and comments inherit it exactly.
-- ============================================================================

-- ── comments_select: visible only if the parent post is visible ──────────────
drop policy if exists comments_select on public.post_comments;
create policy comments_select on public.post_comments
  for select to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_comments.post_id
    )
  );

-- ── comments_insert: comment only on a post you can see, as yourself ─────────
drop policy if exists comments_insert on public.post_comments;
create policy comments_insert on public.post_comments
  for insert to authenticated
  with check (
    author_id in (select id from public.profiles where user_id = auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = post_comments.post_id
    )
  );

-- comments_delete is unchanged (author-only) from 0004.

-- ============================================================================
-- After running: a viewer who cannot read a post can neither read nor write its
-- comments. The single visibility source of truth remains posts_select (0010).
-- ============================================================================
