-- ============================================================================
-- GreekBond: post comments + like/comment counter helpers
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER 0003_posts.sql.
-- Idempotent: re-runnable.
-- ============================================================================

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

drop policy if exists comments_select on public.post_comments;
create policy comments_select on public.post_comments for select to authenticated using (true);

drop policy if exists comments_insert on public.post_comments;
create policy comments_insert on public.post_comments for insert to authenticated
  with check (author_id in (select id from public.profiles where user_id = auth.uid()));

drop policy if exists comments_delete on public.post_comments;
create policy comments_delete on public.post_comments for delete to authenticated
  using (author_id in (select id from public.profiles where user_id = auth.uid()));

-- The denormalized posts.likes / posts.comments counters must be writable by any
-- member (not just the post author, who is the only one the posts_update policy
-- allows). These SECURITY DEFINER helpers bump the counters and return the new
-- value. They add functions only, they do not change the posts RLS policies.
create or replace function public.increment_post_comments(post uuid)
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.posts set comments = comments + 1 where id = post returning comments;
$$;
grant execute on function public.increment_post_comments(uuid) to authenticated;

create or replace function public.decrement_post_likes(post uuid)
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.posts set likes = greatest(likes - 1, 0) where id = post returning likes;
$$;
grant execute on function public.decrement_post_likes(uuid) to authenticated;

-- ============================================================================
-- After running: comments persist and bump the post's comment count; the like
-- button can toggle both directions.
-- ============================================================================
