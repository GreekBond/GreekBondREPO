-- ============================================================================
-- GreekBond: invite code generation: retry on unique_violation
-- ----------------------------------------------------------------------------
-- Run AFTER 0008_invites.sql. Idempotent.
--
-- Replaces check-then-insert loop with insert + retry on the code unique
-- constraint, closing the race window under concurrent admin clicks.
-- ============================================================================

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
  me           public.profiles;
  v_code       text;
  rec          public.chapter_invites;
  attempts     int := 0;
  max_attempts int := 12;
begin
  select * into me from public.profiles where user_id = auth.uid() limit 1;
  if me.id is null or me.role <> 'admin' or me.chapter_id is distinct from cid then
    raise exception 'only chapter admins can generate invites for their chapter';
  end if;

  loop
    attempts := attempts + 1;
    if attempts > max_attempts then
      raise exception 'could not generate a unique invite code';
    end if;

    v_code := (
      select string_agg(
        substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), ''
      )
      from generate_series(1, 8)
    );

    begin
      insert into public.chapter_invites (chapter_id, code, created_by, email, expires_at)
      values (
        cid, v_code, me.id, invite_email,
        case when ttl_days is null then null else now() + (ttl_days || ' days')::interval end
      )
      returning * into rec;
      return rec;
    exception
      when unique_violation then
        continue;
    end;
  end loop;
end;
$$;
grant execute on function public.generate_chapter_invite(text, text, integer) to authenticated;
