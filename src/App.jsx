// App.jsx: role system, routing, onboarding persistence.
import React from 'react';
import { useAuth } from './lib/useAuth.jsx';
import { useProfile } from './lib/useProfile.jsx';
import { createBond, deleteBond, setBondStatus, bondState, updateProfile } from './lib/db.js';
import { canAccess, requiredTierLabel } from './lib/plan.js';
import { MOTION } from './lib/motion.js';
const { useState: useStateApp, useEffect: useEffectApp } = React;
const { Auth, Onboarding, MemberHome, NetworkDirectory, ChaptersDirectory, SearchTalent, SearchResults, RecruiterJobs, Jobs, SavedJobs, RecruiterCandidates, Messages, Alerts, Mentorship, FamilyTree, Profile, ChapterPage, RecruiterPipeline, AdminConsole, AdminRoster, AdminIntroRequests, AlumniPricing, ChapterPricing, TopNav, RoleSwitcher, BondCelebration, ProfileEditor, IntroModal, Icon, P } = window;

const DEFAULT_SCREEN = { alumni: 'feed', undergrad: 'feed', admin: 'console', recruiter: 'pipeline' };

function loadState() {
  try { return JSON.parse(localStorage.getItem('gb_v2') || '{}'); } catch { return {}; }
}

// Shown while Supabase restores the session on first load, avoids a flash of
// the login screen for already-signed-in users. Navy wash + gold G lockup.
function AuthLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', position: 'relative', overflow: 'hidden',
      display: 'grid', placeItems: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: .5, background:
        'radial-gradient(900px 500px at 50% -10%, rgba(200,162,60,.16), transparent 70%), radial-gradient(700px 600px at 110% 120%, rgba(122,31,43,.22), transparent 60%)' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, animation: 'gb-fade var(--motion-slow) var(--ease-out)' }}>
        <window.Logo variant="mark" tone="reversed" size={64} />
      </div>
    </div>
  );
}

// Shown if the profile can't be loaded, almost always means the Session 3
// migration hasn't been run yet. Same navy/gold language as AuthLoading.
function ProfileError({ onRetry, onLogout }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', position: 'relative', overflow: 'hidden', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ position: 'absolute', inset: 0, opacity: .5, background:
        'radial-gradient(900px 500px at 50% -10%, rgba(200,162,60,.16), transparent 70%), radial-gradient(700px 600px at 110% 120%, rgba(122,31,43,.22), transparent 60%)' }} />
      <div style={{ position: 'relative', textAlign: 'center', maxWidth: 420, animation: 'gb-fade var(--motion-slow) var(--ease-out)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><window.Logo variant="mark" tone="reversed" size={56} /></div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: '#fff', margin: 0 }}>We couldn’t load your profile</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,.62)', marginTop: 10, lineHeight: 1.55 }}>
          The database may not be set up yet. Run the Session 3 migration in Supabase, then try again.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 22 }}>
          <button onClick={onRetry} style={{ background: 'var(--gold)', color: '#2c2207', border: 'none', borderRadius: 999, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>Try again</button>
          <button onClick={onLogout} style={{ background: 'rgba(255,255,255,.08)', color: '#fff', border: '1px solid rgba(255,255,255,.18)', borderRadius: 999, padding: '11px 22px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>Log out</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const saved = loadState();
  // authed is now sourced from the real Supabase session, not localStorage.
  const { session, loading, signOut } = useAuth();
  const { profile, profileLoading, ready, error: profileErr, refreshProfile } = useProfile();
  const authed = !!session;
  const [onboarded, setOnboarded] = useStateApp(!!saved.onboarded);
  const [role, setRole] = useStateApp(saved.role || 'alumni');
  const [mode, setMode] = useStateApp(saved.mode || (saved.role === 'admin' ? 'console' : 'you'));
  const [screen, setScreen] = useStateApp(saved.screen || DEFAULT_SCREEN[saved.role || 'alumni']);
  const [params, setParams] = useStateApp({});
  const [celebrate, setCelebrate] = useStateApp(null);
  const [profileEdits, setProfileEdits] = useStateApp(saved.profileEdits || {});
  const [editingId, setEditingId] = useStateApp(null);
  const [introTarget, setIntroTarget] = useStateApp(null); // { target, intent }
  const [toast, setToast] = useStateApp(null);
  const [toastLeaving, setToastLeaving] = useStateApp(false);
  useEffectApp(() => { window.__notify = (msg) => { setToastLeaving(false); setToast({ msg, t: Date.now() }); }; }, []);
  // window.__askIntro is kept in sync with the gated askIntro below (assigned
  // each render so it always sees the current plan), for window-global call sites.
  // Auto-dismiss: hold, then play the fade-out, then unmount.
  useEffectApp(() => {
    if (!toast) return;
    const leave = setTimeout(() => setToastLeaving(true), 2600);
    const drop = setTimeout(() => { setToast(null); setToastLeaving(false); }, 2600 + MOTION.base);
    return () => { clearTimeout(leave); clearTimeout(drop); };
  }, [toast]);

  const persist = (patch) => { const cur = loadState(); localStorage.setItem('gb_v2', JSON.stringify({ ...cur, ...patch })); };
  const go = (s, p = {}) => { setScreen(s); setParams(p); persist({ screen: s }); window.scrollTo({ top: 0 }); };
  useEffectApp(() => { window.__go = go; }, []);

  // The resolved role is the database's source of truth. When the profile loads
  // (or changes) with a role, sync the local role/mode/screen to it.
  useEffectApp(() => {
    if (profile && profile.role && profile.role !== role) {
      const m = profile.role === 'admin' ? 'console' : 'you';
      const sc = DEFAULT_SCREEN[profile.role];
      setRole(profile.role); setMode(m); setScreen(sc);
      persist({ role: profile.role, mode: m, screen: sc });
    }
  }, [profile]);

  // Onboarding now writes the chosen role (and chapter) to the user's profile row.
  const finishOnboarding = async (newRole, chapterId) => {
    if (profile) {
      // Only write a chapter_id that actually exists (FK to chapters); on an
      // empty DB this resolves to null so onboarding still completes cleanly.
      const validChapter = newRole !== 'recruiter' && chapterId && window.GB.CHAPTERS[chapterId] ? chapterId : null;
      try {
        await updateProfile(profile.id, { role: newRole, chapter_id: validChapter });
        await refreshProfile();
      } catch (e) {
        console.error('[onboarding] failed to save profile:', e);
        window.__notify && window.__notify('Couldn’t save your profile, try again.');
        return;
      }
    }
    const m = newRole === 'admin' ? 'console' : 'you';
    setRole(newRole); setMode(m); setOnboarded(true);
    const sc = DEFAULT_SCREEN[newRole]; setScreen(sc); setParams({});
    persist({ onboarded: true, role: newRole, mode: m, screen: sc });
    window.scrollTo({ top: 0 });
  };
  const switchRole = (newRole) => {
    const m = newRole === 'admin' ? 'console' : 'you';
    setRole(newRole); setMode(m);
    const sc = DEFAULT_SCREEN[newRole]; setScreen(sc); setParams({});
    persist({ role: newRole, mode: m, screen: sc });
    window.scrollTo({ top: 0 });
  };
  const replay = () => { setOnboarded(false); persist({ onboarded: false }); };

  // ── auth ──
  // Login/sign-up now happen inside Auth.jsx against Supabase; the session
  // listener in useAuth flips `authed`. Logout clears the real session, then
  // the local app state as before.
  const logOut = () => { signOut(); window.scrollTo({ top: 0 }); };
  const changeMode = (m) => { setMode(m); persist({ mode: m }); };
  // The Bond button is a real toggle over the `bonds` table. The transition
  // depends on the current viewer-relative state (read from the hydrated cache):
  //   none         → create a 'bonded' row (+ celebration)
  //   pending-in   → accept (set the row to 'bonded')
  //   pending-out  → cancel the request (delete the row), with a confirm
  //   bonded       → un-bond (delete the row), with a confirm
  // Every branch re-hydrates so the button label reflects the new reality.
  const bond = async (person) => {
    const meId = profile ? profile.id : null;
    if (!meId || !person || !person.id || person.id === meId) return;
    const { state } = bondState(meId, person.id);
    try {
      if (state === 'none') {
        setCelebrate(person);
        await createBond(meId, person.id, 'bonded');
      } else if (state === 'pending-in') {
        await setBondStatus(meId, person.id, 'bonded');
      } else if (state === 'pending-out') {
        if (!window.confirm(`Cancel your bond request to ${person.name}?`)) return;
        await deleteBond(meId, person.id);
      } else { // bonded
        if (!window.confirm(`Remove your bond with ${person.name}?`)) return;
        await deleteBond(meId, person.id);
      }
      await refreshProfile();
    } catch (e) {
      console.error('[bond] failed:', e);
      window.__notify && window.__notify('Could not update bond.');
    }
  };
  // Warm intros are a Bond feature. Free-tier alumni get an upgrade nudge to
  // Pricing instead of the intro modal. Non-alumni (undergrad/admin/recruiter)
  // and god-mode pass canAccess() and proceed. This is the UI half; the
  // intro_requests INSERT policy (migration 0016) enforces the same in the DB.
  const askIntro = (target, intent) => {
    if (!canAccess('intros', profile)) {
      window.__notify && window.__notify(`Warm intros are a ${requiredTierLabel('intros')} feature. Upgrade to unlock.`);
      go('pricing');
      return;
    }
    setIntroTarget({ target, intent: intent || 'intro' });
  };
  useEffectApp(() => { window.__askIntro = askIntro; });
  const personWith = (id) => ({ ...(P(id) || {}), ...(profileEdits[id] || {}) });
  const openEditor = (id) => setEditingId(id);
  // Saving a profile persists to the DB, then clears the in-progress local edit.
  const saveProfile = async (id, patch) => {
    try { await updateProfile(id, patch); await refreshProfile(); }
    catch (e) { console.error('[saveProfile] failed:', e); window.__notify && window.__notify('Couldn’t save changes, try again.'); return; }
    setProfileEdits(prev => { const next = { ...prev }; delete next[id]; persist({ profileEdits: next }); return next; });
  };
  // AdminRoster renders from a window-global and can't take saveProfile as a
  // prop; expose it so its no-chapter guard can link the admin's chapter.
  useEffectApp(() => { window.__saveProfile = saveProfile; });

  if (loading) return <AuthLoading />;
  if (!authed) return <Auth />;
  if (profileLoading || !ready) return <AuthLoading />;
  if (profileErr || !profile) return <ProfileError onRetry={refreshProfile} onLogout={logOut} />;
  if (!onboarded) return <Onboarding onDone={finishOnboarding} />;

  const recruiter = role === 'recruiter';
  const meId = recruiter ? null : profile.id;
  const me = meId ? P(meId) : null;
  const memberRole = recruiter ? 'recruiter' : ((me && me.role) || role);
  const chapterRole = role === 'admin' ? (mode === 'console' ? 'admin' : 'member') : role;

  const screenEl = (() => {
    switch (screen) {
      case 'feed': return <MemberHome role={memberRole} meId={meId} go={go} bond={bond} />;
      case 'network': return <NetworkDirectory meId={meId} go={go} bond={bond} params={params} />;
      case 'chapters': return <ChaptersDirectory go={go} meId={meId} />;
      case 'search': return <SearchResults params={params} go={go} meId={meId} selfId={profile.id} role={role} bond={bond} />;
      case 'talent': return <SearchTalent go={go} meId={meId} selfId={profile.id} bond={bond} params={params} />;
      case 'jobs': return recruiter
        ? <RecruiterJobs go={go} selfId={profile.id} recruiterCompany={profile.company || (window.GB.RECRUITER && window.GB.RECRUITER.company) || ''} recruiterLocation={profile.location || ''} />
        : <Jobs role={memberRole} meId={meId} go={go} bond={bond} />;
      case 'saved-jobs': return <SavedJobs go={go} meId={meId} role={memberRole} />;
      case 'candidates': return <RecruiterCandidates go={go} />;
      case 'messages': return <Messages role={role} meId={meId} go={go} />;
      case 'alerts': return <Alerts role={role} mode={mode} meId={meId} go={go} />;
      case 'mentorship': return <Mentorship role={memberRole} meId={meId} go={go} onAsk={askIntro} />;
      case 'tree': return <FamilyTree id={params?.id || meId} meId={meId} role={memberRole} go={go} onAsk={(p) => askIntro(p, 'intro')} />;
      case 'profile': return <Profile id={params?.id || meId} role={recruiter ? 'recruiter' : null} meId={meId} self={profile} go={go} bond={bond} edits={profileEdits} openEditor={openEditor} saveProfile={saveProfile} onAsk={askIntro} />;
      case 'chapter': return <ChapterPage id={params?.id || profile.chapter || Object.keys(window.GB.CHAPTERS)[0]} role={chapterRole} meId={meId} go={go} bond={bond} />;
      case 'pipeline': return <RecruiterPipeline go={go} onAsk={askIntro} selfId={profile.id} />;
      case 'console': return <AdminConsole meId={meId} go={go} saveProfile={saveProfile} />;
      case 'roster': return <AdminRoster go={go} />;
      case 'intro-requests': return <AdminIntroRequests meId={meId} go={go} />;
      case 'pricing': return <AlumniPricing role={memberRole} meId={meId} go={go} />;
      case 'chapter-pricing': return <ChapterPricing go={go} />;
      default: return <MemberHome role={memberRole} meId={meId} go={go} bond={bond} />;
    }
  })();

  return (
    <div>
      <TopNav role={role} screen={screen} mode={mode} setMode={changeMode} self={profile} go={go} logout={logOut} />
      <div key={role + screen + (params?.id || '') + (params?.tab || '')} style={{ animation: 'gb-fade var(--motion-base) var(--ease-out)' }}>{screenEl}</div>

      {celebrate && <BondCelebration person={celebrate} onClose={() => setCelebrate(null)} />}
      {editingId && <ProfileEditor person={personWith(editingId)} onSave={(patch) => saveProfile(editingId, patch)} onClose={() => setEditingId(null)} />}
      {introTarget && <IntroModal target={introTarget.target} intent={introTarget.intent} fromId={meId} fromSelfId={profile.id} fromRole={recruiter ? 'recruiter' : memberRole} go={go} onClose={() => setIntroTarget(null)} />}
      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', zIndex: 3200,
          background: 'var(--navy)', color: '#fff', padding: '12px 20px', borderRadius: 999, boxShadow: 'var(--shadow-lg)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 600, maxWidth: '90vw',
          animation: toastLeaving ? 'gb-toast-out var(--motion-base) var(--ease-in) forwards' : 'gb-toast-in var(--motion-base) var(--ease-out)' }}>
          <span style={{ color: 'var(--gold)', display: 'grid', placeItems: 'center' }}><Icon name="seal" size={17} fill="var(--gold)" stroke={0} /></span>{toast.msg}</div>
      )}
      <RoleSwitcher role={role} setRole={switchRole} replay={replay} />
    </div>
  );
}

export default App;
