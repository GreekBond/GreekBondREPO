// AdminConsole.jsx: admin home (Console mode): analytics, post-as-chapter, verification, roster.
import React from 'react';
import { ManageEventsList, ManageFundraisersList, InviteMembersModal } from '../components/ChapterAdminTools.jsx';
const { useState: useStateAdm } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf, PostAsChapter, ChapterPost, VerifyQueueCard, Seg, GhostBtn } = window;

function AdminConsole({ meId, go, saveProfile }) {
  const me = P(meId) || {};
  // The admin's chapter is the ONLY chapter they can write to (events,
  // fundraisers, invites all RLS-check is_chapter_admin(chapter_id)). Never fall
  // back to a placeholder id: a chapter the admin doesn't govern fails the
  // policy with a cryptic "row-level security" error. If it's unset, send them
  // to link their chapter first.
  const chapterId = me.chapter || null;
  if (!chapterId) return <AdminNoChapter meId={meId} saveProfile={saveProfile} go={go} />;
  const c = CH(chapterId);
  const d = window.GB.CHAPTER_DETAIL;
  const a = d.analytics;
  const [, setTick] = useStateAdm(0);
  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px', '--chapter': c.color, '--chapter-ink': c.ink }}>
      {/* console header */}
      <Card pad={0} style={{ overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '22px 26px', background: `linear-gradient(120deg, var(--chapter), ${tint(c.color, .1)} 60%, var(--navy))`, color: '#fff', position: 'relative' }}>
          <div style={{ position: 'absolute', right: 18, bottom: -22, opacity: .22 }}><Crest chapterId={chapterId} size={150} ring={false} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
            <Crest chapterId={chapterId} size={66} ring={false} seal />
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)' }}>Chapter Console</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 600, margin: '3px 0 0' }}>{c.name} {c.letters}</h1>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 3 }}>Operated by {P(meId).name} · {P(meId).positions[0]}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
              <Btn variant="gold" icon="edit" onClick={() => go('chapter', { id: chapterId })}>Open chapter page</Btn>
            </div>
          </div>
        </div>
        {/* analytics strip, promoted to a real card */}
        <div className="gb-grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid var(--border)' }}>
          {[[a.views.toLocaleString(), 'Page views', `▲ ${a.viewsDelta}% this week`, 'chart'],
            [a.posts, 'Post engagements', 'across 6 posts', 'like'],
            [a.newFollowers, 'New followers', 'last 30 days', 'building'],
            [a.verifyPending, 'Pending verifications', 'needs your review', 'shield']].map(([n, l, sub, ic], i) => (
            <div key={l} style={{ padding: '18px 22px', borderLeft: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--ink-2)', fontSize: 12, fontWeight: 600 }}><Icon name={ic} size={15} />{l}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--chapter-ink)', margin: '6px 0 2px' }}>{n}</div>
              <div style={{ fontSize: 12, color: i === 0 ? 'var(--success)' : 'var(--ink-2)', fontWeight: i === 0 ? 600 : 400 }}>{sub}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="gb-shell-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PostAsChapter c={c} />
          {d.posts.map((post, i) => <ChapterPost key={i} c={c} post={post} manage />)}
          <ManageEventsList chapterId={chapterId} meId={meId} onChange={() => setTick(n => n + 1)} />
          <ManageFundraisersList chapterId={chapterId} meId={meId} onChange={() => setTick(n => n + 1)} />
        </div>
        <div style={{ position: 'sticky', top: 86, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <VerifyQueueCard d={d} go={go} />
          {/* intro requests: real brokered-access queue (DB-backed) */}
          <IntroQueueCard go={go} />
          <Card style={{ background: 'var(--gold-soft)', borderColor: 'var(--gold-line)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--navy)', marginBottom: 6 }}>Verified rosters are the value</div>
            <div style={{ fontSize: 13, color: '#6b5a2e', lineHeight: 1.5, marginBottom: 12 }}>Every member you verify makes GreekBond’s data more trustworthy, and your alumni more reachable.</div>
            <Btn variant="gold" size="sm" full icon="users" onClick={() => go('roster')}>Manage roster</Btn>
          </Card>
          {/* chapter plan & billing, entry to chapter pricing */}
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--navy)' }}><Icon name="building" size={17} /></span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Chapter plan</span>
              <Pill tone="gold" style={{ marginLeft: 'auto' }} icon="seal">Charter</Pill>
            </div>
            <div style={{ padding: '13px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--chapter-ink)' }}>$600</span>
                <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>/semester · 50+ members</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, margin: '7px 0 12px' }}>
                Flat-rate, not per-head. Renews at the start of the term. Compare tiers or change your plan anytime.</div>
              <Btn variant="primary" size="sm" full iconR="chevR" onClick={() => go('chapter-pricing')}>Plans &amp; billing</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Real brokered-access summary. The live pending count comes from the DB-backed
// intro badge (refreshed by the nav on entering the console); the button opens the
// full approve/decline queue. No faked approvals here.
function IntroQueueCard({ go }) {
  const pending = (window.useIntroBadge && window.useIntroBadge()) || 0;
  return (
    <Card pad={0} style={{ borderColor: '#e3d8ef' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#5b3b82' }}><Icon name="shield" size={17} /></span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Intro requests</span>
        {pending > 0 && <Pill tone="employer" style={{ marginLeft: 'auto' }}>{pending} pending</Pill>}
      </div>
      <div style={{ padding: '13px 16px' }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 11 }}>
          {pending > 0
            ? `${pending} brokered ${pending === 1 ? 'request is' : 'requests are'} waiting on you. You decide whether a recruiter reaches your members; approved intros record you as the broker.`
            : 'No pending intro requests right now. When a recruiter asks to reach one of your members, it lands here for your decision.'}</div>
        <Btn variant={pending > 0 ? 'gold' : 'subtle'} size="sm" full icon="shield" onClick={() => go('intro-requests')}>
          {pending > 0 ? 'Review intro requests' : 'Open intro requests'}</Btn>
      </div>
    </Card>
  );
}

/* ───────────────── No-chapter guard ─────────────────
   An admin whose profile has no chapter_id can't write to any chapter under
   RLS. This is the real cause of "new row violates row-level security policy"
   on event/fundraiser/invite creation. Let them pick (and persist) their
   chapter so the console works, instead of failing silently against a fake id. */
function AdminNoChapter({ meId, saveProfile, go }) {
  const chapters = Object.values(window.GB.CHAPTERS || {});
  const [pick, setPick] = useStateAdm('');
  const [busy, setBusy] = useStateAdm(false);
  const link = async () => {
    if (!pick || busy || !saveProfile) return;
    setBusy(true);
    try { await saveProfile(meId, { chapter: pick }); }
    catch { window.__notify && window.__notify('Could not link your chapter.'); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '64px 16px' }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--navy)' }}>
          <Icon name="shield" size={20} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0 }}>Link your chapter</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, margin: '12px 0 18px' }}>
          Your admin account isn’t linked to a chapter yet, so creating events, fundraisers, and invite codes is blocked. Choose the chapter you govern to activate the console.
        </p>
        {chapters.length === 0 ? (
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            No chapters are loaded yet. Your console will activate once your chapter joins GreekBond.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select value={pick} onChange={e => setPick(e.target.value)}
              style={{ flex: '1 1 220px', borderRadius: 12, border: '1px solid var(--border)', background: '#faf8f2', padding: '11px 13px', fontSize: 14.5, fontFamily: 'var(--font-ui)', color: 'var(--ink)' }}>
              <option value="">Select your chapter…</option>
              {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name} {ch.letters}</option>)}
            </select>
            <Btn variant="gold" onClick={link} style={{ opacity: pick && !busy ? 1 : .5, pointerEvents: pick && !busy ? 'auto' : 'none' }}>{busy ? 'Linking…' : 'Link chapter'}</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ───────────────── Roster manager ───────────────── */
function AdminRoster({ go }) {
  const meId = window.GB.ME && (window.GB.ME.admin || window.GB.ME.alumni || window.GB.ME.undergrad);
  const mine = meId ? P(meId) : null;
  const chapterId = (mine && mine.chapter) || null;
  if (!chapterId) return <AdminNoChapter meId={meId} saveProfile={window.__saveProfile} go={go} />;
  const c = CH(chapterId);
  const all = Object.keys(window.GB.PEOPLE).filter(k => P(k).chapter === chapterId);
  const [seg, setSeg] = useStateAdm('All');
  const [inviteOpen, setInviteOpen] = useStateAdm(false);
  const list = all.filter(id => seg === 'All' || (seg === 'Actives' ? P(id).role === 'undergrad' : P(id).role === 'alumni'));

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 16px 72px', '--chapter': c.color, '--chapter-ink': c.ink }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}><Icon name="users" size={15} /> Roster</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 600, margin: '5px 0 0' }}>{c.name} membership</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '5px 0 0' }}>Verify who is actually a {c.noun}. This is what gives GreekBond’s data its value.</p>
        </div>
        <Btn variant="chapter" icon="plus" onClick={() => setInviteOpen(true)}>Invite members</Btn>
      </div>
      <InviteMembersModal open={inviteOpen} onClose={() => setInviteOpen(false)} chapterId={chapterId} meId={meId} />
      <Card pad={0}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Seg value={seg} set={setSeg} options={['All', 'Actives', 'Alumni']} />
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{c.members} actives · {c.alumni.toLocaleString()} alumni on record</span>
        </div>
        {/* pending verifications first */}
        {window.GB.CHAPTER_DETAIL.verifyQueue.map((v, i) => (
          <RosterRow key={'q' + i} pending v={v} go={go} />
        ))}
        {list.map(id => <RosterRow key={id} id={id} go={go} />)}
        {window.GB.CHAPTER_DETAIL.verifyQueue.length === 0 && list.length === 0 && (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6, borderTop: '1px solid var(--border)' }}>
            No members on the roster yet. Invite your brothers and sisters to join, and verify them here.
          </div>
        )}
      </Card>
    </div>
  );
}

function RosterRow({ id, v, pending, go }) {
  const p = id ? P(id) : null;
  const [status, setStatus] = useStateAdm(pending ? 'pending' : 'verified');
  const name = p ? p.name : v.name;
  return (
    <div style={{ padding: '13px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14,
      background: pending && status === 'pending' ? 'color-mix(in srgb, var(--gold-soft) 40%, #fff)' : 'transparent' }}>
      <Avatar personId={id} name={name} chapterId="tds" size={44} showCrest={!(v && v.noProfile)} onClick={p ? () => go('profile', { id }) : undefined} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{name}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{p ? `${p.positions[0] || (p.role === 'undergrad' ? 'Active member' : 'Alumnus')} · ${p.role === 'undergrad' ? 'Class of' : 'Alum'} ’${String(p.classYear).slice(2)}` : v.claim}</div>
      </div>
      <div style={{ width: 150, flex: 'none', display: 'flex', justifyContent: 'flex-end' }}>
        {status === 'pending'
          ? <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="primary" size="sm" icon="check" onClick={() => setStatus('verified')}>Verify</Btn>
              <GhostBtn onClick={() => setStatus('declined')}>×</GhostBtn>
            </div>
          : status === 'declined' ? <Pill tone="gray">Declined</Pill>
          : <Pill tone="success" icon="seal">Verified {CH('tds').noun}</Pill>}
      </div>
    </div>
  );
}

Object.assign(window, { AdminConsole, AdminRoster });
