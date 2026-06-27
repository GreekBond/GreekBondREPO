-- ============================================================================
-- GreekBond: member invite codes
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER 0006_events.sql (needs is_chapter_admin /
-- my_profile). Idempotent: re-runnable.
--
-- A chapter admin generates a short, human-typable join code. A new user who
-- signs up with that code has their profile linked to the chapter and the
-- invite marked claimed. Codes are validated/redeemed through SECURITY DEFINER
-- functions, so the invites table itself stays private (admins only).
-- ============================================================================

create table if not exists public.chapter_invites (
  id          uuid primary key default gen_random_uuid(),
  chapter_id  text not null references public.chapters(id) on delete cascade,
  code        text not null unique,
  created_by  uuid references public.profiles(id) on delete set null,
  email       text,                         -- optional pre-assignment
  claimed_by  uuid references public.profiles(id) on delete set null,
  claimed_at  timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists chapter_invites_chapter_idx on public.chapter_invites (chapter_id);
create unique index if not exists chapter_invites_code_uidx on public.chapter_invites (upper(code));

alter table public.chapter_invites enable row level security;

-- The table is admin-only. Anon/auth users never read it directly, they go
-- through the lookup/redeem functions below (SECURITY DEFINER).
drop policy if exists invites_select on public.chapter_invites;
create policy invites_select on public.chapter_invites
  for select to authenticated
  using (public.is_chapter_admin(chapter_id));

drop policy if exists invites_update on public.chapter_invites;
create policy invites_update on public.chapter_invites
  for update to authenticated
  using (public.is_chapter_admin(chapter_id))
  with check (public.is_chapter_admin(chapter_id));

drop policy if exists invites_delete on public.chapter_invites;
create policy invites_delete on public.chapter_invites
  for delete to authenticated
  using (public.is_chapter_admin(chapter_id));

-- Direct inserts are blocked (no insert policy); generation goes through the
-- admin-only function below so codes are always unique and well-formed.

-- ── generate a unique join code (admin-only) ────────────────────────────────
create or replace function public.generate_chapter_invite(
  cid text,
  invite_email text default null,
  ttl_days integer default 30
)
returns public.chapter_invites
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me       public.profiles;
  v_code   text;
  rec      public.chapter_invites;
begin
  select * into me from public.profiles where user_id = auth.uid() limit 1;
  if me.id is null or me.role <> 'admin' or me.chapter_id is distinct from cid then
    raise exception 'only chapter admins can generate invites for their chapter';
  end if;

  -- 8 chars from an unambiguous alphabet (no I, O, 0, 1).
  loop
    v_code := (
      select string_agg(
        substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), ''
      )
      from generate_series(1, 8)
    );
    exit when not exists (select 1 from public.chapter_invites where upper(code) = upper(v_code));
  end loop;

  insert into public.chapter_invites (chapter_id, code, created_by, email, expires_at)
  values (
    cid, v_code, me.id, invite_email,
    case when ttl_days is null then null else now() + (ttl_days || ' days')::interval end
  )
  returning * into rec;

  return rec;
end;
$$;
grant execute on function public.generate_chapter_invite(text, text, integer) to authenticated;

-- ── validate a code without claiming it (signup hint) ───────────────────────
-- Safe to expose to anon: returns only whether the code is valid and which
-- chapter it joins, no other invite data.
create or replace function public.lookup_invite_code(invite_code text)
returns table (valid boolean, chapter_id text, chapter_name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    true,
    i.chapter_id,
    c.name
  from public.chapter_invites i
  join public.chapters c on c.id = i.chapter_id
  where upper(i.code) = upper(invite_code)
    and i.claimed_by is null
    and (i.expires_at is null or i.expires_at > now())
  limit 1;
$$;
grant execute on function public.lookup_invite_code(text) to anon, authenticated;

-- ── redeem a code: link the caller's profile to the chapter ─────────────────
create or replace function public.redeem_invite_code(invite_code text)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv public.chapter_invites;
  me  public.profiles;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated to redeem an invite';
  end if;

  select * into me from public.profiles where user_id = auth.uid() limit 1;
  if me.id is null then
    raise exception 'no profile to attach this invite to';
  end if;

  select * into inv from public.chapter_invites
  where upper(code) = upper(invite_code)
    and claimed_by is null
    and (expires_at is null or expires_at > now())
  limit 1;

  if inv.id is null then
    raise exception 'invalid or expired invite code';
  end if;

  update public.profiles set chapter_id = inv.chapter_id where id = me.id;
  update public.chapter_invites set claimed_by = me.id, claimed_at = now() where id = inv.id;

  select * into me from public.profiles where id = me.id;
  return me;
end;
$$;
grant execute on function public.redeem_invite_code(text) to authenticated;

-- ── verify (run after applying) ──────────────────────────────────────────────
-- As a chapter admin:
--   select * from public.generate_chapter_invite('tdx');   -- returns a row with a code
-- As any signed-up user (then check profiles.chapter_id changed):
--   select public.lookup_invite_code('<CODE>');            -- valid + chapter
--   select public.redeem_invite_code('<CODE>');            -- returns updated profile
