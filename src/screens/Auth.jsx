// Auth.jsx: the log-in / sign-up gate. Renders BEFORE onboarding (§0).
// Echoes the Onboarding world: navy wash + crimson/gold radial, diagonal texture,
// the G lockup, and a wax-seal brand moment. Visual/prototype only, any creds accepted.
import React from 'react';
import { useAuth } from '../lib/useAuth.jsx';
import { lookupInviteCode } from '../lib/db.js';
const { useState: useStateAuth, useEffect: useEffectAuth } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf } = window;

/* shell, mirrors Onboarding's ObShell so the transition is seamless */
function AuthShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', position: 'relative', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 20px 48px' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: .5, background:
        'radial-gradient(900px 500px at 50% -10%, rgba(200,162,60,.16), transparent 70%), radial-gradient(700px 600px at 110% 120%, rgba(122,31,43,.22), transparent 60%)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: .05, background:
        'repeating-linear-gradient(45deg, transparent, transparent 13px, rgba(255,255,255,.6) 13px, rgba(255,255,255,.6) 14px)' }} />
      <div style={{ position: 'absolute', top: 26, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <window.Logo variant="full" tone="reversed" size={64} />
      </div>
      <div style={{ position: 'relative', width: '100%', maxWidth: 432, animation: 'gb-fade var(--motion-slow) var(--ease-out)' }}>{children}</div>
    </div>
  );
}

/* field shells, same translucent-on-navy language as Onboarding */
function AuthField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.7)', marginBottom: 7, letterSpacing: '.02em' }}>{label}</div>
      {children}
    </div>
  );
}
const authInput = { width: '100%', height: 46, borderRadius: 10, border: '1.5px solid rgba(255,255,255,.16)',
  background: 'rgba(255,255,255,.06)', color: '#fff', padding: '0 15px', fontSize: 14.5, outline: 'none', fontFamily: 'var(--font-ui)' };
function AuthInput(props) {
  return <input {...props} style={authInput}
    onFocus={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.background = 'rgba(255,255,255,.1)'; }}
    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.16)'; e.target.style.background = 'rgba(255,255,255,.06)'; }} />;
}

function GoogleButton() {
  const [h, setH] = useStateAuth(false);
  return (
    <button type="button" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      onClick={() => window.__notify && window.__notify('Social sign-in isn’t wired in this preview, use the form below')}
      style={{ width: '100%', height: 46, borderRadius: 10, cursor: 'pointer',
        border: '1.5px solid rgba(255,255,255,.16)', background: h ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.07)',
        color: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'background .15s' }}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#FFC107" d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/><path fill="#FF3D00" d="M9 18c2.4 0 4.5-.8 6-2.3l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.8v2.3A9 9 0 0 0 9 18z"/><path fill="#4CAF50" d="M3.9 10.6a5.4 5.4 0 0 1 0-3.4V4.9H.8a9 9 0 0 0 0 8.1l3.1-2.4z"/><path fill="#1976D2" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .8 4.9l3.1 2.3C4.6 5.1 6.6 3.6 9 3.6z"/></svg>
      Continue with Google
    </button>
  );
}

// Translates Supabase error text into the interface's voice, specific, plain,
// never vague or apologetic.
function authMessage(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('not confirmed') || (m.includes('confirm') && m.includes('email'))) return 'Please confirm your email first, check your inbox.';
  if (m.includes('invalid login')) return "That email or password didn't match.";
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists')) return 'That email already has an account. Log in instead.';
  if (m.includes('at least 6') || m.includes('password should be')) return 'Use a password with at least 6 characters.';
  return msg || 'Something went wrong. Try again.';
}

function Auth() {
  const { signUp, signIn, resend } = useAuth();
  const [mode, setMode] = useStateAuth('login'); // 'login' | 'signup'
  const [remember, setRemember] = useStateAuth(true);
  const [fullName, setFullName] = useStateAuth('');
  const [email, setEmail] = useStateAuth('');
  const [password, setPassword] = useStateAuth('');
  const [confirm, setConfirm] = useStateAuth('');
  const [inviteCode, setInviteCode] = useStateAuth('');
  const [inviteHint, setInviteHint] = useStateAuth('');
  const [error, setError] = useStateAuth('');
  const [busy, setBusy] = useStateAuth(false);
  const [sentTo, setSentTo] = useStateAuth(null); // email a confirmation link was sent to
  const [resent, setResent] = useStateAuth(false);
  const login = mode === 'login';

  useEffectAuth(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('invite') || params.get('code');
      if (code) {
        setInviteCode(code.toUpperCase().trim());
        setMode('signup');
      }
    } catch {}
  }, []);

  const checkInvite = async (code) => {
    const c = (code || '').trim();
    if (!c) { setInviteHint(''); return; }
    try {
      const row = await lookupInviteCode(c);
      if (row && row.valid) setInviteHint(`Valid code · joins ${row.chapter_name || 'your chapter'}`);
      else setInviteHint('Invalid or expired code');
    } catch (e) {
      setInviteHint((e && e.message) || 'Could not validate code');
    }
  };

  const swap = (m) => { setMode(m); setError(''); setInviteHint(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (login) {
      setBusy(true);
      const { error: err } = await signIn(email, password);
      setBusy(false);
      if (err) setError(authMessage(err.message));
      // on success the auth-state listener flips `authed` and the app advances
    } else {
      if (password !== confirm) { setError("Those passwords don't match."); return; }
      // Stash any chapter invite code so it survives the email-confirmation
      // round-trip. It's redeemed after sign-in by claimOrCreateProfile (db.js).
      try {
        const code = inviteCode.trim();
        if (code) localStorage.setItem('gb_invite_code', code.toUpperCase());
        else localStorage.removeItem('gb_invite_code');
      } catch {}
      setBusy(true);
      const { error: err } = await signUp(email, password, fullName);
      setBusy(false);
      if (err) { setError(authMessage(err.message)); return; }
      // email confirmation is required, do NOT log in, show the check-email state
      setSentTo(email);
    }
  };

  const doResend = async () => {
    if (!sentTo) return;
    setResent(false);
    const { error: err } = await resend(sentTo);
    if (err) { window.__notify && window.__notify(authMessage(err.message)); return; }
    setResent(true);
  };

  const backToLogin = () => { setSentTo(null); setMode('login'); setError(''); setPassword(''); setConfirm(''); };

  if (sentTo) return <CheckEmail email={sentTo} onResend={doResend} resent={resent} onBack={backToLogin} />;

  return (
    <AuthShell>
      {/* brand seal moment */}
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', position: 'relative',
            background: 'radial-gradient(120% 120% at 32% 24%, var(--gold), var(--gold-deep) 70%)', color: '#2c2207',
            display: 'grid', placeItems: 'center', boxShadow: '0 0 0 1px rgba(255,255,255,.25) inset, 0 8px 24px rgba(200,162,60,.28)' }}>
            <span style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '1px solid rgba(44,34,7,.32)' }} />
            <Icon name="bond" size={28} stroke={2.4} />
          </div>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.15, letterSpacing: '-.01em' }}>
          {login ? 'Welcome back to the house' : 'Join the bond you already share'}</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', marginTop: 9, lineHeight: 1.5 }}>
          {login ? 'Log in to your brothers, sisters, and the network behind your letters.'
                 : 'The professional network governed by the bond between brothers and sisters.'}</p>
      </div>

      <div style={{ background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 'var(--radius-lg)', padding: '8px 24px 26px' }}>
        {/* mode toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,.2)', borderRadius: 999, padding: 4, margin: '16px 0 22px' }}>
          {[['login', 'Log in'], ['signup', 'Sign up']].map(([m, lb]) => (
            <button key={m} type="button" onClick={() => swap(m)}
              style={{ flex: 1, border: 'none', borderRadius: 999, padding: '9px 0', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                fontFamily: 'var(--font-ui)', background: mode === m ? 'var(--gold)' : 'transparent', color: mode === m ? '#2c2207' : 'rgba(255,255,255,.7)' }}>{lb}</button>
          ))}
        </div>

        <form onSubmit={submit}>
          {!login && <AuthField label="Full name"><AuthInput type="text" placeholder="e.g. Marcus Vance" value={fullName} onChange={e => setFullName(e.target.value)} required /></AuthField>}
          <AuthField label="Email"><AuthInput type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required /></AuthField>
          <AuthField label="Password"><AuthInput type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required /></AuthField>
          {!login && <AuthField label="Confirm password"><AuthInput type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required /></AuthField>}
          {!login && (
            <AuthField label="Invite code (optional)">
              <AuthInput type="text" placeholder="From your chapter, e.g. ABCD2345" value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                onBlur={() => checkInvite(inviteCode)}
                autoCapitalize="characters" maxLength={12} />
              {inviteHint && <div style={{ fontSize: 12, marginTop: 6, fontWeight: 600, color: inviteHint.startsWith('Valid') ? 'var(--success)' : 'var(--alert)' }}>{inviteHint}</div>}
            </AuthField>
          )}

          {login ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                <Toggle on={remember} set={setRemember} gold />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.72)', fontWeight: 600 }}>Remember me</span>
              </label>
              <button type="button" onClick={() => window.__notify && window.__notify('Password reset isn’t available in this preview')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--gold)', fontFamily: 'var(--font-ui)' }}>Forgot password?</button>
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.55)', lineHeight: 1.5, margin: '6px 0 18px' }}>
              Join the network built on the bond you already share. Next, you’ll claim your letters and your chapter will verify them.</p>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '0 0 14px', padding: '10px 13px', borderRadius: 10,
              background: 'rgba(122,31,43,.22)', border: '1px solid rgba(200,162,60,.28)' }}>
              <span style={{ color: 'var(--gold)', flex: 'none', marginTop: 1, display: 'grid', placeItems: 'center' }}><Icon name="shield" size={15} /></span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.86)', lineHeight: 1.45, fontWeight: 600 }}>{error}</span>
            </div>
          )}

          <Btn variant="gold" size="lg" full iconR="chevR">{busy ? (login ? 'Logging in…' : 'Creating account…') : (login ? 'Log in' : 'Create account')}</Btn>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
          <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.12)' }} />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.4)', letterSpacing: '.04em' }}>OR</span>
          <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.12)' }} />
        </div>
        <GoogleButton />
      </div>

      <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,.55)' }}>
        {login ? 'New to GreekBond? ' : 'Already have an account? '}
        <button type="button" onClick={() => swap(login ? 'signup' : 'login')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-ui)' }}>
          {login ? 'Create an account' : 'Log in'}</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18, fontSize: 11.5, color: 'rgba(255,255,255,.4)' }}>
        <Icon name="shield" size={14} /> Verified by your chapter · Your letters, protected.
      </div>
    </AuthShell>
  );
}

/* check-your-email, shown after sign-up, since email confirmation is required.
   Same navy shell + wax-seal motif as the auth gate; the first brand moment. */
function CheckEmail({ email, onResend, resent, onBack }) {
  return (
    <AuthShell>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', position: 'relative',
            background: 'radial-gradient(120% 120% at 32% 24%, var(--gold), var(--gold-deep) 70%)', color: '#2c2207',
            display: 'grid', placeItems: 'center', boxShadow: '0 0 0 1px rgba(255,255,255,.25) inset, 0 8px 24px rgba(200,162,60,.28)' }}>
            <span style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '1px solid rgba(44,34,7,.32)' }} />
            <Icon name="send" size={26} stroke={2.2} />
          </div>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.15, letterSpacing: '-.01em' }}>
          Check your email</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', marginTop: 9, lineHeight: 1.5 }}>
          We sent a confirmation link to <span style={{ color: '#fff', fontWeight: 700 }}>{email}</span>. Click it to join the network.</p>
      </div>

      <div style={{ background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.55, margin: '0 0 18px' }}>
          The link confirms your letters are yours to claim. Didn’t get it? Check spam, or send it again.</p>
        <Btn variant="gold" size="lg" full onClick={onResend}>{resent ? 'Confirmation resent' : 'Resend email'}</Btn>
      </div>

      <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,.55)' }}>
        <button type="button" onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-ui)' }}>Back to log in</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18, fontSize: 11.5, color: 'rgba(255,255,255,.4)' }}>
        <Icon name="shield" size={14} /> Verified by your chapter · Your letters, protected.
      </div>
    </AuthShell>
  );
}

Object.assign(window, { Auth });
