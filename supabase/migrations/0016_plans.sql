-- ============================================================================
-- GreekBond V2.3: subscription plans + god-mode (Stripe-ready, Stripe-deferred)
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER 0001..0015. Idempotent: re-runnable.
--
-- Adds the alumni subscription tier to profiles, a founder god-mode flag, the
-- effective_plan() helper both RLS and the app call, and the first real DB-layer
-- gate: free-tier alumni cannot INSERT intro_requests (warm intros start at
-- Bond), and the priority flag can only be set by Bond Pro and above.
--
-- The gating shipped here will NOT change when Stripe lands in V2.4. Only the
-- upgrade path changes: today plans are admin-set via SQL (see the note at the
-- bottom); in V2.4 a webhook will set profiles.plan after checkout.
-- ============================================================================

-- ── 1. plan + god-mode columns ──────────────────────────────────────────────
-- A NOT NULL column with a default backfills every existing row to 'free'
-- automatically, so no separate UPDATE is needed.
alter table public.profiles
  add column if not exists plan text not null default 'free';
alter table public.profiles
  add column if not exists is_god boolean not null default false;

-- Constrain plan to the four Pricing tiers (column ids).
do $$ begin
  alter table public.profiles
    add constraint profiles_plan_check
    check (plan in ('free','bond','bond_pro','bond_elite'));
exception when duplicate_object then null; end $$;

-- Belt-and-suspenders backfill for any pre-existing NULLs (none expected).
update public.profiles set plan = 'free' where plan is null;

-- ── 2. plan rank + effective_plan() ─────────────────────────────────────────
-- Numeric rank so policies and code can compare tiers with >=.
create or replace function public.plan_rank(p text)
returns int
language sql
immutable
as $$
  select case p
    when 'bond_elite' then 3
    when 'bond_pro'   then 2
    when 'bond'       then 1
    else 0                       -- 'free' or anything unknown
  end;
$$;
grant execute on function public.plan_rank(text) to authenticated;

-- A profile's EFFECTIVE tier: god-mode reads as bond_elite, otherwise the stored
-- plan. SECURITY DEFINER so it can read the profile row regardless of the caller
-- (used inside RLS WITH CHECK and by the app). stable: same answer within a stmt.
create or replace function public.effective_plan(pid uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when p.is_god then 'bond_elite' else p.plan end
  from public.profiles p
  where p.id = pid;
$$;
grant execute on function public.effective_plan(uuid) to authenticated;

-- ── 3. intro_requests: priority flag + plan-gated INSERT ────────────────────
-- priority is the "Priority intro requests" feature (Bond Pro+). Default false,
-- so ordinary inserts always satisfy the priority clause below.
alter table public.intro_requests
  add column if not exists priority boolean not null default false;

-- Replace intro_insert (was: requester_id = my id only) with the same ownership
-- check PLUS the plan gate. Only the ALUMNI role is gated: undergrads have free
-- full access while enrolled, admins access via the chapter plan, and recruiters
-- run on the brokered-access model, so all three bypass. god-mode bypasses via
-- effective_plan() returning bond_elite.
drop policy if exists intro_insert on public.intro_requests;
create policy intro_insert on public.intro_requests
  for insert to authenticated
  with check (
    requester_id = (public.my_profile()).id
    -- warm intros require Bond (rank 1) for alumni:
    and (
      coalesce((public.my_profile()).role, '') <> 'alumni'
      or public.plan_rank(public.effective_plan((public.my_profile()).id)) >= public.plan_rank('bond')
    )
    -- priority requires Bond Pro (rank 2) for alumni:
    and (
      priority is not true
      or coalesce((public.my_profile()).role, '') <> 'alumni'
      or public.plan_rank(public.effective_plan((public.my_profile()).id)) >= public.plan_rank('bond_pro')
    )
  );

-- ── 4. founder god-mode (run manually, edit the email if needed) ────────────
-- After applying this migration, switch your own account to god-mode:
--   update public.profiles set is_god = true where email = 'forkabusiness@gmail.com';
-- Verify the effective tier resolves to bond_elite:
--   select id, email, plan, is_god, public.effective_plan(id) from public.profiles where is_god;

-- ── 5. test scenarios (run later to confirm the DB gate is real) ────────────
-- A) Free alumni blocked from warm intros:
--    As a profile with role='alumni', plan='free', is_god=false, attempting
--      insert into public.intro_requests (requester_id, target_id, intent)
--      values ('<self>', '<any target>', 'intro');
--    must FAIL with "violates row-level security policy". Then
--      update public.profiles set plan='bond' where id='<self>';
--    and the same insert must SUCCEED.
-- B) Priority gate: as plan='bond' alumni, an insert with priority=true must
--    FAIL; as plan='bond_pro' (or is_god) it must SUCCEED.
-- C) God-mode: update is_god=true on a free alumni, then
--      select public.effective_plan('<self>');  -- returns 'bond_elite'
--    and the intro insert from (A) must SUCCEED.
