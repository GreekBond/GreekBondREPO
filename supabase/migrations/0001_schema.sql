-- ============================================================================
-- GreekBond: Session 3 schema (clean + empty, NO fake data seeded)
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Review before running. This creates the tables only, it does NOT seed any
-- people or chapters. Real users (and the bulk-loaded rosters) populate them.
--
-- Row-Level Security is intentionally NOT enabled here (Session 4). Tables are
-- open for development. The columns are, however, structured for RLS: every
-- ownership edge runs through profiles.user_id → auth.users(id), so the policies
-- in Session 4 can be written without reshaping the schema.
--
-- Growth model supported: a profile can exist with an `email` and a NULL
-- `user_id` (pre-loaded by the GreekBond team). When that person signs up with
-- the same email, the app "claims" the row by setting user_id = auth uid.
-- ============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- updated_at maintenance ------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── chapters ────────────────────────────────────────────────────────────────
-- Mirrors the prototype CHAPTERS objects. Text id (e.g. 'tds') so existing
-- chapter references and routes keep working.
create table if not exists public.chapters (
  id          text primary key,
  letters     text,
  name        text,
  kind        text,            -- 'Fraternity' | 'Sorority'
  council     text,            -- 'IFC' | 'Panhellenic' | ...
  color       text,
  ink         text,
  school      text,
  founded     integer,
  members     integer,
  alumni      integer,
  gpa         text,
  motto       text,
  city        text,
  noun        text,            -- 'brother' | 'sister'
  plural      text,            -- 'brothers' | 'sisters'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── profiles ────────────────────────────────────────────────────────────────
-- Mirrors the prototype PEOPLE objects. `user_id` links to auth (NULL until a
-- pre-loaded row is claimed). Lineage is normalized: a profile points at its
-- `big_id`; "littles" are DERIVED by querying profiles where big_id = this id
-- (so the family tree can never drift out of sync).
create table if not exists public.profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users(id) on delete set null,
  email        text,
  name         text,
  role         text check (role in ('alumni','undergrad','admin','recruiter')),
  chapter_id   text references public.chapters(id) on delete set null,
  headline     text,
  company      text,
  title        text,
  location     text,
  school       text,
  class_year   integer,
  grad_year    integer,
  pledge_class text,
  industry     text,
  about        text,
  open         text,            -- 'work' | 'hiring' | NULL
  offer_note   text,
  verified     boolean not null default false,
  positions    text[] not null default '{}',
  honors       text[] not null default '{}',
  skills       text[] not null default '{}',
  offers       text[] not null default '{}',
  seeking_tags text[] not null default '{}',
  seeking      text,
  big_id       uuid references public.profiles(id) on delete set null,
  line_name    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- claim lookup is case-insensitive on email
create unique index if not exists profiles_email_lower_uidx
  on public.profiles (lower(email)) where email is not null;
create index if not exists profiles_user_id_idx   on public.profiles (user_id);
create index if not exists profiles_chapter_id_idx on public.profiles (chapter_id);
create index if not exists profiles_big_id_idx     on public.profiles (big_id);
create index if not exists profiles_role_idx       on public.profiles (role);

-- ── bonds (member ↔ member) ─────────────────────────────────────────────────
-- A bond is mutual; we store it ONCE and query both directions. "Bonded" on a
-- profile is derived from this table relative to the viewer.
create table if not exists public.bonds (
  id         uuid primary key default gen_random_uuid(),
  a_id       uuid not null references public.profiles(id) on delete cascade,
  b_id       uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','bonded')),
  created_at timestamptz not null default now(),
  check (a_id <> b_id),
  unique (a_id, b_id)
);
create index if not exists bonds_a_idx on public.bonds (a_id);
create index if not exists bonds_b_idx on public.bonds (b_id);

-- ── follows (member → chapter) ──────────────────────────────────────────────
create table if not exists public.follows (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id text not null references public.chapters(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, chapter_id)
);
create index if not exists follows_profile_idx on public.follows (profile_id);
create index if not exists follows_chapter_idx on public.follows (chapter_id);

-- ── vouches (member → member endorsement) ───────────────────────────────────
-- Member-only authorship (recruiters can't vouch), enforced in the app now,
-- in RLS in Session 4.
create table if not exists public.vouches (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists vouches_subject_idx on public.vouches (subject_id);
create index if not exists vouches_author_idx  on public.vouches (author_id);

-- ── jobs ────────────────────────────────────────────────────────────────────
create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  via         text check (via in ('bond','employer')),  -- warm referral vs employer post
  poster_id   uuid references public.profiles(id) on delete set null,
  title       text,
  company     text,
  location    text,
  type        text,
  pay         text,
  tags        text[] not null default '{}',
  refer       boolean not null default false,
  description text,
  created_at  timestamptz not null default now()
);
create index if not exists jobs_poster_idx on public.jobs (poster_id);

-- ── intro_requests (warm-intro / recruiter-brokered flow) ───────────────────
-- broker_admin_id is set when a recruiter's request is relayed through a
-- chapter admin (the verb law: recruiters "Request intro" brokered by admins).
create table if not exists public.intro_requests (
  id              uuid primary key default gen_random_uuid(),
  requester_id    uuid not null references public.profiles(id) on delete cascade,
  target_id       uuid not null references public.profiles(id) on delete cascade,
  broker_admin_id uuid references public.profiles(id) on delete set null,
  intent          text,
  note            text,
  status          text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at      timestamptz not null default now()
);
create index if not exists intro_requester_idx on public.intro_requests (requester_id);
create index if not exists intro_target_idx    on public.intro_requests (target_id);

-- ── triggers (updated_at on mutable tables) ─────────────────────────────────
drop trigger if exists chapters_set_updated_at on public.chapters;
create trigger chapters_set_updated_at before update on public.chapters
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- NOTE: RLS is OFF (Session 4 turns it on, required before real users).
-- NOTE: messages & alerts remain on the app's in-memory store this session
--       (they're tied to the runtime intro/bond loop; they move to the DB
--       alongside RLS later). No tables for them yet, by design.
-- NOTE: the bulk-CSV roster import UI is a future feature; the schema already
--       supports pre-loaded unclaimed rows (profiles with email, NULL user_id).
-- ============================================================================
