// IntroFlow.jsx: the warm-intro / mentorship request composer + pending beat. Exports to window.
import React from 'react';
import { createIntroRequest } from '../lib/db.js';
const { useState: useStateIntro } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf } = window;

/* the ask presets vary by intent + role */
function askPresets(intent, target) {
  if (intent === 'mentorship') return ['Career mentorship', 'A 15-minute coffee chat', 'Résumé review', 'Advice breaking into ' + (target.industry || 'my field')];
  return ['A warm introduction', 'A referral for a role', 'Advice in ' + (target.industry || 'your field'), 'A quick coffee chat'];
}

function IntroModal({ fromId, fromSelfId, fromRole, target, intent, onClose, go }) {
  const recruiter = fromRole === 'recruiter';
  const ch = CH(target.chapter);
  const sameChapter = !recruiter && fromId && P(fromId) && P(fromId).chapter === target.chapter;
  const presets = askPresets(intent, target);
  const [ask, setAsk] = useStateIntro(presets[0]);
  const [note, setNote] = useStateIntro('');
  const [sent, setSent] = useStateIntro(false);
  const [busy, setBusy] = useStateIntro(false);
  const [error, setError] = useStateIntro('');
  const mentorship = intent === 'mentorship';

  const submit = async () => {
    if (busy) return;
    setBusy(true); setError('');
    // The runtime store keeps the same prototype behaviour (admin queue alerts,
    // recipient alerts, threads) for instant in-app feedback.
    window.requestIntro({ fromId: recruiter ? '__recruiter' : fromId, fromRole, toId: target.id, ask, note, brokered: recruiter });
    // The DB intro_requests row is the real artifact a chapter admin can act on.
    // Recruiters always need a real requester profile (their own profile.id);
    // members and admins use their meId, which is already their profile.id.
    const requesterId = recruiter ? fromSelfId : fromId;
    if (requesterId && target.id) {
      try {
        await createIntroRequest({
          requesterId,
          targetId: target.id,
          brokerAdminId: null,
          intent: intent || (mentorship ? 'mentorship' : 'intro'),
          note: [ask, note].filter(Boolean).join(', ').slice(0, 600),
        });
      } catch (e) {
        console.error('[intro] persist failed:', e);
        setError((e && e.message) || 'Could not record the request. Try again.');
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    setSent(true);
  };

  if (sent) return <IntroSentBeat target={target} recruiter={recruiter} mentorship={mentorship} onClose={onClose} go={go} />;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2600, background: 'rgba(17,27,61,.55)', backdropFilter: 'blur(4px)',
      display: 'grid', placeItems: 'center', padding: '24px 16px', animation: 'gb-fade var(--motion-base) var(--ease-out)' }}>
      <div onClick={e => e.stopPropagation()} style={{ '--chapter': ch.color, '--chapter-ink': ch.ink, width: 520, maxWidth: '100%', maxHeight: '92vh',
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'gb-pop var(--motion-base) var(--ease-out)' }}>

        {/* header */}
        <div style={{ padding: '20px 24px', background: recruiter ? 'linear-gradient(120deg, #4a3168, #6b478f)' : `linear-gradient(120deg, var(--navy), var(--navy-700) 55%, var(--chapter))`, color: '#fff', position: 'relative', flex: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: .14, background: 'repeating-linear-gradient(45deg, transparent, transparent 11px, rgba(255,255,255,.6) 11px, rgba(255,255,255,.6) 12px)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(255,255,255,.16)', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>
              <Icon name={mentorship ? 'graduation' : 'intro'} size={22} /></span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,.72)' }}>{recruiter ? 'Brokered request' : mentorship ? 'Mentorship request' : 'Warm intro'}</div>
              <h2 style={{ margin: '2px 0 0', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{mentorship ? 'Ask ' + target.name.split(' ')[0] + ' to mentor you' : 'Ask ' + target.name.split(' ')[0] + ' for an intro'}</h2>
            </div>
            <button onClick={onClose} style={{ marginLeft: 'auto', width: 34, height: 34, borderRadius: 999, border: '1px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.12)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}>
              <Icon name="plus" size={18} style={{ transform: 'rotate(45deg)' }} /></button>
          </div>
        </div>

        {/* warm-framing strip */}
        <div style={{ padding: '12px 24px', background: recruiter ? '#f7f4fa' : 'var(--gold-soft)', borderBottom: `1px solid ${recruiter ? '#e3d8ef' : 'var(--gold-line)'}`, display: 'flex', alignItems: 'center', gap: 11 }}>
          {recruiter
            ? <><Icon name="shield" size={18} style={{ color: '#5b3b82', flex: 'none' }} /><span style={{ fontSize: 12.5, color: '#5b3b82', lineHeight: 1.45 }}>This request is <strong>brokered through {ch.letters}’s chapter admin</strong>. {target.name.split(' ')[0]} only hears from you if the chapter approves.</span></>
            : <><span style={{ color: 'var(--gold-deep)', flex: 'none' }}><Icon name="bond" size={18} stroke={2.2} /></span><span style={{ fontSize: 12.5, color: '#7a5e12', lineHeight: 1.45 }}>{sameChapter ? `You and ${target.name.split(' ')[0]} are both ${ch.letters}.` : `You’re both Greek.`} A note from a {sameChapter ? ch.noun : 'brother or sister'} gets read.</span></>}
        </div>

        {/* who + body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 18 }}>
            <Avatar personId={target.id} size={48} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{target.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.headline}</div>
              <div style={{ marginTop: 5 }}><WarmSignal person={target} viewerId={recruiter ? null : fromId} size={11} max={2} /></div>
            </div>
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>What are you asking for?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {presets.map(p => (
              <button key={p} onClick={() => setAsk(p)} style={{ padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: ask === p ? 'var(--navy)' : 'var(--surface)', color: ask === p ? '#fff' : 'var(--navy)', border: `1.5px solid ${ask === p ? 'var(--navy)' : 'var(--border)'}` }}>
                {ask === p && <Icon name="check" size={13} stroke={2.6} style={{ marginRight: 5, verticalAlign: '-1px' }} />}{p}</button>
            ))}
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Add a note <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>· optional, but it helps</span></div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
            placeholder={mentorship ? `Hi ${target.name.split(' ')[0]}, I’m an active in ${ch.letters} hoping to break into ${target.industry || 'your field'}. Could I get 15 minutes of your time?` : `Hi ${target.name.split(' ')[0]}, I’d love an introduction. Here’s a little about me and what I’m after…`}
            style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#faf8f2', padding: '11px 14px', fontSize: 14, lineHeight: 1.55, outline: 'none', resize: 'vertical', fontFamily: 'var(--font-ui)', color: 'var(--ink)' }}
            onFocus={e => { e.target.style.borderColor = 'var(--navy)'; e.target.style.background = '#fff'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = '#faf8f2'; }} />
        </div>

        {/* footer */}
        <div style={{ flex: 'none', padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {error && <span style={{ fontSize: 12.5, color: 'var(--alert)', fontWeight: 600 }}>{error}</span>}
          <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name={recruiter ? 'shield' : 'bond'} size={14} />{recruiter ? 'Awaits chapter approval' : 'Sent directly to ' + target.name.split(' ')[0]}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant={recruiter ? 'primary' : 'gold'} icon={mentorship ? 'graduation' : 'send'} onClick={submit} disabled={busy}>{busy ? 'Sending…' : recruiter ? 'Request via chapter' : mentorship ? 'Send request' : 'Send intro request'}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntroSentBeat({ target, recruiter, mentorship, onClose, go }) {
  const ch = CH(target.chapter);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2700, background: 'rgba(17,27,61,.6)', backdropFilter: 'blur(5px)', display: 'grid', placeItems: 'center', padding: 16, animation: 'gb-fade var(--motion-base) var(--ease-out)' }}>
      <div onClick={e => e.stopPropagation()} style={{ '--chapter': ch.color, width: 380, maxWidth: '92vw', background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        padding: '34px 30px 26px', textAlign: 'center', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--gold-line)', animation: 'gb-pop var(--motion-base) var(--ease-out)' }}>
        <div style={{ position: 'relative', width: 96, height: 78, margin: '0 auto 6px' }}>
          <div style={{ position: 'absolute', left: 6, top: 8, animation: 'gb-seal .5s ease both' }}><Avatar personId="me" size={58} showCrest={false} /></div>
          <div style={{ position: 'absolute', right: 6, top: 8, animation: 'gb-seal .5s .08s ease both' }}><Avatar personId={target.id} size={58} /></div>
          <div style={{ position: 'absolute', left: '50%', top: 24, transform: 'translateX(-50%)', zIndex: 2, width: 34, height: 34, borderRadius: 999,
            background: recruiter ? '#6b478f' : 'var(--gold)', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.2)', animation: 'gb-seal .5s .16s ease both' }}>
            <Icon name={recruiter ? 'shield' : 'intro'} size={19} stroke={2.4} /></div>
        </div>
        <div style={{ color: 'var(--gold-deep)', fontSize: 11.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', marginTop: 8 }}>Request sent · Pending</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--navy)', marginTop: 6 }}>{recruiter ? 'It’s with the chapter' : 'Your ask is on its way'}</div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.5 }}>
          {recruiter
            ? `${ch.letters}’s admin will review your request to reach ${target.name.split(' ')[0]}. You’ll be notified if it’s relayed.`
            : `${target.name.split(' ')[0]} will see your ${mentorship ? 'mentorship' : 'intro'} request in their alerts. We’ll let you know the moment they respond.`}</div>
        <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
          <Btn variant="ghost" full onClick={onClose}>Done</Btn>
          {!recruiter && <Btn variant="gold" full onClick={() => { onClose(); go && go('alerts'); }}>View status</Btn>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { IntroModal });
