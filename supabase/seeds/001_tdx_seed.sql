-- ============================================================================
-- GreekBond: development seed: Theta Delta Chi (TDX) + 5 sample members
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER 0001_schema.sql (and 0002_rls.sql).
-- These are TEST records to make the app non-empty during development. The five
-- profiles are PRE-LOADED and UNCLAIMED (user_id = NULL): when a real person
-- signs up with the matching @greekbond.test email, claim_profile_by_email()
-- attaches their auth user to the row. Real TDX Wisconsin members get real
-- profiles, these just give the UI something to render while testing.
--
-- Idempotent: re-running updates the chapter and leaves existing profile rows
-- untouched (on conflict do nothing), then re-applies the Big/Little links.
-- ============================================================================

-- ── chapter ──────────────────────────────────────────────────────────────────
insert into public.chapters
  (id,   letters, name,              kind,         council, color,     ink,       school,                          founded, members, alumni, gpa,   motto,                  city,      noun,      plural)
values
  ('tdx', 'ΘΔΧ',  'Theta Delta Chi', 'Fraternity', 'IFC',   '#8B0000', '#5c0000', 'University of Wisconsin-Madison', 1847,    48,      1200,  '3.41', 'In hoc signo vinces', 'Madison', 'brother', 'brothers')
on conflict (id) do update set
  letters = excluded.letters, name = excluded.name, kind = excluded.kind,
  council = excluded.council, color = excluded.color, ink = excluded.ink,
  school = excluded.school, founded = excluded.founded, members = excluded.members,
  alumni = excluded.alumni, gpa = excluded.gpa, motto = excluded.motto,
  city = excluded.city, noun = excluded.noun, plural = excluded.plural;

-- ── 5 pre-loaded members (3 alumni, 2 undergrads), user_id NULL ──────────────
-- Fixed UUIDs so the Big/Little links below are deterministic and re-runnable.
insert into public.profiles
  (id, user_id, email, name, role, chapter_id, headline, company, title, location, school,
   class_year, grad_year, pledge_class, industry, about, open, verified, skills, offers, seeking_tags, line_name)
values
  ('11111111-1111-1111-1111-111111111111', null, 'marcus.vance@greekbond.test',  'Marcus Vance',  'alumni',    'tdx',
   'Senior Product Manager at Stripe', 'Stripe', 'Senior Product Manager', 'San Francisco, CA', 'University of Wisconsin-Madison',
   2018, null, 'Fall 2014', 'Technology', 'Building payments products. Always happy to help a brother break into tech.', null, true,
   array['Product','Leadership','Strategy','Mentorship'], array['Mentorship','Warm intros','Mock interviews'], array['Mentees'], 'The Vance Line'),

  ('22222222-2222-2222-2222-222222222222', null, 'nathan.cole@greekbond.test',   'Nathan Cole',   'alumni',    'tdx',
   'Investment Analyst at Bridgewell Partners', 'Bridgewell Partners', 'Investment Analyst', 'Chicago, IL', 'University of Wisconsin-Madison',
   2019, null, 'Fall 2015', 'Finance', 'Finance alum, Chicago-based. Hiring analysts this cycle.', 'hiring', true,
   array['Finance','Modeling','Recruiting'], array['Hiring','Referrals','Résumé reviews'], array['New role'], null),

  ('33333333-3333-3333-3333-333333333333', null, 'caleb.brooks@greekbond.test',  'Caleb Brooks',  'alumni',    'tdx',
   'Technical Recruiter at Lattice', 'Lattice', 'Technical Recruiter', 'Austin, TX', 'University of Wisconsin-Madison',
   2020, null, 'Spring 2016', 'Recruiting', 'Connecting people with great teams. Reach out for intros.', null, true,
   array['Recruiting','Sourcing','Coaching'], array['Warm intros','Referrals','Coffee chats'], array['Mentees'], null),

  ('44444444-4444-4444-4444-444444444444', null, 'devin.tran@greekbond.test',    'Devin Tran',    'undergrad', 'tdx',
   'Junior · Computer Science', null, null, 'Madison, WI', 'University of Wisconsin-Madison',
   2026, 2026, 'Fall 2022', 'Student', 'Active brother looking for a summer SWE internship.', 'work', true,
   array['JavaScript','React','Data Structures'], array['Coffee chats'], array['Internship','Mentor'], null),

  ('55555555-5555-5555-5555-555555555555', null, 'owen.hughes@greekbond.test',   'Owen Hughes',   'undergrad', 'tdx',
   'Sophomore · Mechanical Engineering', null, null, 'Madison, WI', 'University of Wisconsin-Madison',
   2027, 2027, 'Fall 2023', 'Student', 'Sophomore in MechE, open to internships and mentorship.', 'work', true,
   array['CAD','SolidWorks','Manufacturing'], array['Coffee chats'], array['Internship','Mentor'], null)
on conflict (id) do nothing;

-- ── Big/Little lineage (set after insert so self-FKs always resolve) ─────────
-- Marcus (m1) founds the line; Nathan & Caleb are his Littles; Devin is
-- Nathan's Little; Owen is Caleb's Little.
update public.profiles set big_id = '11111111-1111-1111-1111-111111111111'
  where id in ('22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');
update public.profiles set big_id = '22222222-2222-2222-2222-222222222222'
  where id = '44444444-4444-4444-4444-444444444444';
update public.profiles set big_id = '33333333-3333-3333-3333-333333333333'
  where id = '55555555-5555-5555-5555-555555555555';

-- ============================================================================
-- After running: window.GB hydrates with TDX + 5 members on next login, the
-- directory / family tree / search / feed all have real data to show.
-- ============================================================================
