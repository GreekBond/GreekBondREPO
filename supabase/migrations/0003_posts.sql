-- ============================================================================
-- GreekBond: Session: posts (home feed) + RLS
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER 0001_schema.sql and 0002_rls.sql.
-- Idempotent: re-runnable (create table if not exists, drop policy if exists).
-- ============================================================================

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'update' check (kind in ('update','job','milestone','event','looking')),
  text text not null,
  image_label text,
  likes integer not null default 0,
  comments integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists posts_author_idx on public.posts (author_id);
create index if not exists posts_created_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

-- SELECT: any authenticated user can read the feed.
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated using (true);

-- INSERT: a user can only post as themselves.
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id in (select id from public.profiles where user_id = auth.uid()));

-- UPDATE: author only (edit their own post).
drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update to authenticated
  using (author_id in (select id from public.profiles where user_id = auth.uid()));

-- DELETE: author only.
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated
  using (author_id in (select id from public.profiles where user_id = auth.uid()));

-- Likes, any authenticated member can like ANY post, but the posts_update
-- policy above restricts direct updates to the author. So liking goes through a
-- SECURITY DEFINER function that bumps the counter and returns the new total.
-- (This adds a function only; it does not change the RLS policies above.)
create or replace function public.increment_post_likes(post uuid)
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.posts set likes = likes + 1 where id = post returning likes;
$$;
grant execute on function public.increment_post_likes(uuid) to authenticated;

-- ============================================================================
-- After running: the home feed reads/writes real posts; the composer is live.
-- ============================================================================
