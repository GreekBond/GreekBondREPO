// MessagesAlerts.jsx: Messages (functional threads) + Alerts (role-aware, admin governance).
import React from 'react';
import { viewerCanAccess, requiredTierLabel } from '../lib/plan.js';
const { useState: useStateMsg, useRef: useRefMsg, useEffect: useEffectMsg } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf, Seg } = window;

function threadName(t) {
  if (t.withId === '__recruiter') return window.GB.RECRUITER.name;
  return P(t.withId).name;
}

function MessagesDesktop({ role, meId, go }) {
  const store = window.useGBStore();
  const recruiter = role === 'recruiter';
  const threads = window.allThreads();
  const [activeId, setActiveId] = useStateMsg(threads[0] ? threads[0].id : null);
  const active = threads.find(t => t.id === activeId) || threads[0] || null;
  if (!threads.length || !active) {
    return (
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 40px' }}>
        <Card><div style={{ padding: '56px 24px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0 }}>No messages yet</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>When you bond and request intros, your conversations land here.</p>
        </div></Card>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 40px' }}>
      <Card pad={0} style={{ overflow: 'hidden', display: 'grid', gridTemplateColumns: '320px minmax(0,1fr)', height: 'calc(100vh - 150px)', minHeight: 520 }}>
        {/* thread list */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, margin: 0 }}>Messages</h1>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {threads.map(t => <ThreadRow key={t.id} t={t} active={t.id === activeId} onClick={() => setActiveId(t.id)} />)}
          </div>
        </div>
        {/* conversation */}
        <Conversation key={active.id} t={active} meId={meId} recruiter={recruiter} go={go} />
      </Card>
    </div>
  );
}

function ThreadRow({ t, active, onClick }) {
  const recruiterThread = t.kind === 'recruiter';
  const name = threadName(t);
  const ch = t.withId !== '__recruiter' ? CH(P(t.withId).chapter) : null;
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
      background: active ? 'var(--navy-50)' : 'none', padding: '13px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
      {recruiterThread
        ? <div style={{ width: 46, height: 46, borderRadius: 10, background: '#efe9f5', color: '#5b3b82', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="building" size={22} /></div>
        : <Avatar personId={t.withId} size={46} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{name}</span>
          {recruiterThread ? <Pill tone="employer">Employer</Pill> : <Crest chapterId={P(t.withId).chapter} size={16} ring={false} />}
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-3)' }}>{t.time}</span>
        </div>
        <div style={{ fontSize: 12.5, color: t.unread ? 'var(--ink)' : 'var(--ink-2)', fontWeight: t.unread ? 600 : 400, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.preview}</div>
      </div>
      {t.unread > 0 && <span style={{ background: 'var(--gold)', color: '#fff', minWidth: 18, height: 18, borderRadius: 999, fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', padding: '0 5px' }}>{t.unread}</span>}
    </button>
  );
}

function Conversation({ t, meId, recruiter, go }) {
  const recruiterThread = t.kind === 'recruiter';
  const name = threadName(t);
  const [msgs, setMsgs] = useStateMsg(t.msgs);
  const [draft, setDraft] = useStateMsg('');
  const scrollRef = useRefMsg(null);
  useEffectMsg(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs]);
  const send = () => { if (!draft.trim()) return; setMsgs(m => [...m, { from: 'me', text: draft, time: 'now' }]); setDraft(''); };
  const ch = t.withId !== '__recruiter' ? CH(P(t.withId).chapter) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, '--chapter': ch ? ch.color : 'var(--navy)' }}>
      {/* header */}
      <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        {recruiterThread
          ? <div style={{ width: 40, height: 40, borderRadius: 9, background: '#efe9f5', color: '#5b3b82', display: 'grid', placeItems: 'center' }}><Icon name="building" size={20} /></div>
          : <Avatar personId={t.withId} size={40} onClick={() => go('profile', { id: t.withId })} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{name}</span>
            {recruiterThread ? <Pill tone="employer" icon="building">Outside employer</Pill> : <WarmSignal person={P(t.withId)} viewerId={meId} size={11} max={1} />}
          </div>
          {!recruiterThread && <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{P(t.withId).headline}</div>}
        </div>
      </div>

      {/* brokered banner for recruiter↔member */}
      {recruiterThread && (
        <div style={{ padding: '10px 20px', background: '#f7f4fa', borderBottom: '1px solid #e3d8ef', display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: '#5b3b82' }}>
          <Icon name="shield" size={16} /> This conversation was brokered through the chapter admin, it’s not a peer bond.
        </div>
      )}

      {/* messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, background: '#faf8f2' }}>
        {msgs.map((m, i) => {
          const mine = m.from === 'me';
          return (
            <div key={i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '74%' }}>
              {m.broker && <div style={{ fontSize: 11, color: '#8a6db5', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="shield" size={12} /> Relayed by your ΘΔΣ admin</div>}
              <div style={{ padding: '10px 14px', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: mine ? 'var(--navy)' : 'var(--surface)', color: mine ? '#fff' : 'var(--ink)',
                border: mine ? 'none' : '1px solid var(--border)', fontSize: 14, lineHeight: 1.5, boxShadow: 'var(--shadow-sm)' }}>{m.text}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 3, textAlign: mine ? 'right' : 'left' }}>{m.time}</div>
            </div>
          );
        })}
      </div>

      {/* composer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={recruiterThread ? 'Reply to this employer…' : `Message ${name.split(' ')[0]}…`}
          style={{ flex: 1, height: 44, borderRadius: 999, border: '1px solid var(--border)', background: '#faf8f2', padding: '0 18px', fontSize: 14, outline: 'none' }}
          onFocus={e => { e.target.style.borderColor = 'var(--navy)'; e.target.style.background = '#fff'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = '#faf8f2'; }} />
        <Btn variant="primary" icon="send" onClick={send}>Send</Btn>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Session M3: mobile Messages (≤640px) as a list/detail swap. One pane at a time:
   the conversation list by default, the thread when one is selected, and a back
   button that returns to the list. The swap is a real conditional render (the
   list is unmounted while the thread shows, and vice versa), not a CSS hide, so
   there is never an off-screen pane holding stale scroll/state. Desktop/mobile
   split is by component type (M1/M2 pattern) so hook counts stay stable on resize.
   Messaging stays in-memory exactly as on desktop: no persistence, no fake
   delivered/read states, no invented typing indicator. The mobile UI only changes
   layout, not data.
   ════════════════════════════════════════════════════════════════════════════ */

// Shared empty state (same copy as desktop), used by the mobile list.
function MessagesEmpty() {
  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 40px' }}>
      <Card><div style={{ padding: '56px 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0 }}>No messages yet</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>When you bond and request intros, your conversations land here.</p>
      </div></Card>
    </div>
  );
}

// Full-width conversation list. Tapping a row opens that thread.
function MobileThreadList({ threads, onOpen }) {
  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '16px 14px 24px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '0 0 14px' }}>Messages</h1>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        {threads.map(t => <ThreadRow key={t.id} t={t} active={false} onClick={() => onOpen(t.id)} />)}
      </Card>
    </div>
  );
}

// Full-screen thread: sticky header (back + recipient), scrollable messages, and
// an input pinned at the bottom of the available area, clear of the M1 bottom bar
// (members) or the safe-area inset (recruiter/admin, who have no bottom bar).
function MobileThreadView({ t, meId, recruiter, go, onBack, hasBottomBar }) {
  const recruiterThread = t.kind === 'recruiter';
  const name = threadName(t);
  const [msgs, setMsgs] = useStateMsg(t.msgs);
  const [draft, setDraft] = useStateMsg('');
  const scrollRef = useRefMsg(null);
  useEffectMsg(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs]);
  const send = () => { if (!draft.trim()) return; setMsgs(m => [...m, { from: 'me', text: draft, time: 'now' }]); setDraft(''); };
  const ch = t.withId !== '__recruiter' ? CH(P(t.withId).chapter) : null;
  // Mobile top bar is 56px (sticky). Reserve the bottom tab bar (58px, members)
  // or just the safe-area inset (drawer roles) so the input is never covered.
  const colHeight = hasBottomBar
    ? 'calc(100dvh - 56px - 58px - env(safe-area-inset-bottom))'
    : 'calc(100dvh - 56px - env(safe-area-inset-bottom))';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: colHeight, background: 'var(--surface)', '--chapter': ch ? ch.color : 'var(--navy)' }}>
      {/* sticky header with back */}
      <div style={{ flex: 'none', padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)' }}>
        <button onClick={onBack} aria-label="Back to messages" style={{ flex: 'none', width: 40, height: 40, borderRadius: 999,
          background: 'var(--navy-50)', border: 'none', color: 'var(--navy)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <Icon name="arrowL" size={20} stroke={2.2} /></button>
        {recruiterThread
          ? <div style={{ width: 38, height: 38, borderRadius: 9, background: '#efe9f5', color: '#5b3b82', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="building" size={19} /></div>
          : <Avatar personId={t.withId} size={38} onClick={() => go('profile', { id: t.withId })} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
            {recruiterThread ? <Pill tone="employer">Employer</Pill> : <WarmSignal person={P(t.withId)} viewerId={meId} size={11} max={1} />}
          </div>
          {!recruiterThread && <div style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{P(t.withId).headline}</div>}
        </div>
      </div>

      {recruiterThread && (
        <div style={{ flex: 'none', padding: '10px 16px', background: '#f7f4fa', borderBottom: '1px solid #e3d8ef', display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: '#5b3b82' }}>
          <Icon name="shield" size={16} /> This conversation was brokered through the chapter admin, it’s not a peer bond.
        </div>
      )}

      {/* messages scroll */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, background: '#faf8f2' }}>
        {msgs.map((m, i) => {
          const mine = m.from === 'me';
          return (
            <div key={i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
              {m.broker && <div style={{ fontSize: 11, color: '#8a6db5', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="shield" size={12} /> Relayed by your ΘΔΣ admin</div>}
              <div style={{ padding: '10px 14px', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: mine ? 'var(--navy)' : 'var(--surface)', color: mine ? '#fff' : 'var(--ink)',
                border: mine ? 'none' : '1px solid var(--border)', fontSize: 14, lineHeight: 1.5, boxShadow: 'var(--shadow-sm)', overflowWrap: 'anywhere' }}>{m.text}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 3, textAlign: mine ? 'right' : 'left' }}>{m.time}</div>
            </div>
          );
        })}
      </div>

      {/* composer, pinned at the bottom of the available area */}
      <div style={{ flex: 'none', padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)' }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={recruiterThread ? 'Reply to this employer…' : `Message ${name.split(' ')[0]}…`}
          style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 999, border: '1px solid var(--border)', background: '#faf8f2', padding: '0 18px', fontSize: 14, outline: 'none' }}
          onFocus={e => { e.target.style.borderColor = 'var(--navy)'; e.target.style.background = '#fff'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = '#faf8f2'; }} />
        <button onClick={send} aria-label="Send" style={{ flex: 'none', width: 44, height: 44, borderRadius: 999, border: 'none',
          background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <Icon name="send" size={20} /></button>
      </div>
    </div>
  );
}

function MessagesMobile({ role, meId, go }) {
  const store = window.useGBStore();
  const recruiter = role === 'recruiter';
  const threads = window.allThreads();
  const [activeId, setActiveId] = useStateMsg(null); // null = show the list
  const active = activeId ? threads.find(t => t.id === activeId) : null;
  // Members get the M1 bottom tab bar; recruiter/admin get a drawer (no bar).
  const hasBottomBar = role !== 'recruiter' && role !== 'admin';

  if (!threads.length) return <MessagesEmpty />;
  if (active) {
    return <MobileThreadView key={active.id} t={active} meId={meId} recruiter={recruiter} go={go}
      onBack={() => setActiveId(null)} hasBottomBar={hasBottomBar} />;
  }
  return <MobileThreadList threads={threads} onOpen={setActiveId} />;
}

// Thin dispatcher: mobile list/detail vs desktop two-pane (M1/M2 pattern).
function Messages(props) {
  const isMobile = window.useIsMobile();
  // Messaging is a Bond feature. Free-tier alumni see the upgrade wall instead.
  // (Messages are in-memory today, so this UI gate carries the full weight; a
  // future messages table + RLS will back it. Noted in the V2.3 report.)
  if (!viewerCanAccess('messaging', props.meId)) {
    return (
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '40px 16px' }}>
        <window.UpgradeLock icon="message" feature="Messaging" tier={requiredTierLabel('messaging')} go={props.go} />
      </div>
    );
  }
  return isMobile ? <MessagesMobile {...props} /> : <MessagesDesktop {...props} />;
}

/* ───────────────── Alerts ───────────────── */
function alertIcon(type) {
  return { bond: 'bond', intro: 'intro', chapter: 'building', milestone: 'star', verify: 'shield', access: 'lock' }[type] || 'bell';
}
function Alerts({ role, mode, meId, go }) {
  const store = window.useGBStore();
  const admin = role === 'admin';
  const showGov = admin; // governance items members never see
  const [tab, setTab] = useStateMsg(showGov ? 'governance' : 'all');
  const memberAlerts = window.memberAlerts();
  const govAlerts = window.govAlerts();
  const list = (admin && tab === 'governance') ? govAlerts : memberAlerts;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: 0 }}>Alerts</h1>
        {admin && <Seg value={tab} set={setTab} options={['governance', 'all'].map(x => x)} />}
      </div>
      {admin && tab === 'governance' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--navy)', color: '#fff', borderRadius: 'var(--radius)', marginBottom: 14, fontSize: 13.5 }}>
          <Icon name="shield" size={18} /> <strong>Governance</strong>, verification and recruiter-access items only you, as admin, can act on.</div>
      )}
      <Card pad={0}>
        {list.map((a, i) => <AlertRow key={a.id} a={a} meId={meId} go={go} last={i === list.length - 1} />)}
        {list.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>No alerts right now.</div>}
      </Card>
    </div>
  );
}

function AlertRow({ a, meId, go, last }) {
  const [done, setDone] = useStateMsg(null);
  const recruiterActor = a.who === '__recruiter';
  const person = recruiterActor ? null : (CH(a.who) ? null : P(a.who));
  const chapter = CH(a.who) ? a.who : null;
  const name = recruiterActor ? window.GB.RECRUITER.company : person ? person.name : chapter ? CH(chapter).name : '';
  const actionable = ['bond', 'verify', 'access', 'intro'].includes(a.type) && !done;
  const resolveAndGo = (status, label, navTo) => {
    if (a.introId) {
      const threadId = window.resolveIntro(a.introId, status);
      if (status === 'approved' && threadId) { setDone(label); window.__notify && window.__notify(navTo === 'messages' ? 'Intro approved, thread opened' : label); return; }
    }
    setDone(label);
  };

  return (
    <div style={{ padding: '14px 18px', borderBottom: last ? 'none' : '1px solid var(--border)', display: 'flex', gap: 13, alignItems: 'flex-start',
      background: a.unread ? 'color-mix(in srgb, var(--gold-soft) 45%, #fff)' : 'transparent' }}>
      <div style={{ position: 'relative' }}>
        {recruiterActor ? <div style={{ width: 46, height: 46, borderRadius: 10, background: '#efe9f5', color: '#5b3b82', display: 'grid', placeItems: 'center' }}><Icon name="building" size={22} /></div>
          : chapter ? <Crest chapterId={chapter} size={46} seal />
          : <Avatar personId={a.who} size={46} />}
        <span style={{ position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: 999, background: 'var(--navy)', color: 'var(--gold)', display: 'grid', placeItems: 'center', border: '2px solid var(--surface)' }}>
          <Icon name={alertIcon(a.type)} size={12} stroke={2.4} /></span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.45 }}>
          <button onClick={() => person && go('profile', { id: a.who })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, color: 'var(--ink)', cursor: person ? 'pointer' : 'default' }}>{name}</button> {a.text}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{a.sub} · {a.time}</div>
        {actionable && (
          <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
            {a.type === 'bond' && <><Btn variant="primary" size="sm" icon="bond" onClick={() => setDone('Bonded')}>Bond back</Btn><GhostBtn onClick={() => setDone('Ignored')}>Ignore</GhostBtn></>}
            {a.type === 'verify' && <><Btn variant="primary" size="sm" icon="check" onClick={() => setDone('Verified')}>Verify</Btn><GhostBtn onClick={() => setDone('Declined')}>Decline</GhostBtn></>}
            {a.type === 'access' && <><Btn variant="primary" size="sm" icon="check" onClick={() => resolveAndGo('approved', 'Access granted · intro relayed', 'messages')}>Approve & relay</Btn><GhostBtn onClick={() => resolveAndGo('declined', 'Declined')}>Decline</GhostBtn></>}
            {a.type === 'intro' && (a.introId
              ? <><Btn variant="primary" size="sm" icon="check" onClick={() => resolveAndGo('approved', 'Accepted', 'messages')}>Accept & reply</Btn><GhostBtn onClick={() => resolveAndGo('declined', 'Declined')}>Decline</GhostBtn></>
              : <><Btn variant="primary" size="sm" icon="intro" onClick={() => setDone('Relayed')}>Review intro</Btn><GhostBtn onClick={() => setDone('Dismissed')}>Dismiss</GhostBtn></>)}
          </div>
        )}
        {done && <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 10 }}><Pill tone="success" icon="check">{done}</Pill>
          {/approved|granted|accepted|relayed/i.test(done) && <button onClick={() => go('messages')} style={{ background: 'none', border: 'none', color: 'var(--navy)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Open thread <Icon name="chevR" size={13} stroke={2.4} /></button>}</div>}
      </div>
    </div>
  );
}
function GhostBtn({ onClick, children }) {
  return <button onClick={onClick} style={{ border: '1px solid var(--border)', background: 'none', borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}>{children}</button>;
}

Object.assign(window, { Messages, Alerts, GhostBtn });
