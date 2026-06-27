-- ============================================================================
-- GreekBond: Session C: posting composer (tags, audience, meta, new kinds)
-- ----------------------------------------------------------------------------
-- Run AFTER 0003_posts.sql. Idempotent.
--
-- Adds the columns the three-mode composer needs:
--   tags[]     hashtag pills on standard posts
--   audience   chapter | network | alumni
--   meta       structured JSON for seeking listings and event shares
--   link_url   optional outbound link on a post
--
-- Extends `kind` to include post | seeking | event_share alongside the
-- legacy values (update, looking, event, job, milestone).
-- ============================================================================

alter table public.posts add column if not exists tags text[] not null default '{}';
alter table public.posts add column if not exists audience text not null default 'network';
alter table public.posts add column if not exists meta jsonb not null default '{}'::jsonb;
alter table public.posts add column if not exists link_url text;

-- Widen the kind check (drop + recreate so re-runs are safe).
alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts add constraint posts_kind_check check (
  kind in ('update','job','milestone','event','looking','post','seeking','event_share')
);

alter table public.posts drop constraint if exists posts_audience_check;
alter table public.posts add constraint posts_audience_check check (
  audience in ('chapter','network','alumni')
);

create index if not exists posts_audience_idx on public.posts (audience);
create index if not exists posts_kind_idx on public.posts (kind);

-- ============================================================================
-- After running: composer inserts can set tags, audience, meta, link_url.
-- RLS is unchanged (posts_select still allows all authenticated reads).
-- Audience scoping is enforced in the client read query for now; tighten
-- posts_select RLS in a follow-up session when ready.
-- ============================================================================
