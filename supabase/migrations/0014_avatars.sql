-- ============================================================================
-- GreekBond Session I: profile avatars (column + storage bucket + storage RLS)
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER 0001-0013. Idempotent.
--
-- Adds a place to store a real profile photo and a public bucket to hold the
-- image file, with storage RLS that lets a user upload/overwrite ONLY their own
-- avatar while keeping avatars publicly readable so they render across the app.
-- ============================================================================

-- ── 1. profiles.avatar_url ──────────────────────────────────────────────────
alter table public.profiles add column if not exists avatar_url text;

-- ── 2. recruiter view: expose avatar_url so talent cards show photos ─────────
-- A profile photo is public (the bucket is public); surfacing it to recruiters
-- is consistent with the other recruiter-visible identity fields. Lineage,
-- heritage, email, etc. remain hidden as before.
create or replace view public.profiles_recruiter_view as
  select
    id, name, headline, company, title,
    location, industry, skills, offers,
    open, seeking_tags, seeking, chapter_id,
    school, class_year, grad_year, avatar_url,
    verified, created_at
  from public.profiles;
grant select on public.profiles_recruiter_view to authenticated;

-- ── 3. storage bucket for avatars (public, image-only, 5 MB cap) ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- ── 4. storage RLS on storage.objects for the avatars bucket ─────────────────
-- Path convention: '<auth.uid()>/avatar.<ext>'. The first path segment is the
-- owner's auth uid, so a user can only write within their own folder. Reads are
-- public so <img> tags resolve everywhere without a signed URL.
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- After running: the app can upload to avatars/<uid>/avatar.<ext>, store the
-- public URL on profiles.avatar_url, and render it everywhere avatars show.
-- A user cannot write to another user's folder; anyone can read the images.
-- ============================================================================
