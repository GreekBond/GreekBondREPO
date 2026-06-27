// IntroRequests.jsx: the admin intro-approval queue + a requester's own status list.
// This is the admin-side surface that closes GreekBond's brokering loop: a recruiter
// cannot reach a member except through their chapter admin's approval. Reads/writes are
// real intro_requests rows; the 0012 RLS scopes an admin to their own chapter members.
//
// Status note: the DB check constraint allows only pending/accepted/declined, so an
// approval persists status = 'accepted'. The UI labels 'accepted' as "Approved".
// Messaging is NOT persisted (no messages table exists yet); approval flips the real
// status and surfaces the outcome. A DB-backed thread is a separate, later session.
import React from 'react';
import { listChapterIntroRequests, resolveIntroRequest, listMyIntroRequests } from '../lib/db.js';
const { useState: useStateIR, useEffect: useEffectIR, useCallback: useCallbackIR } = React;
const { Icon, Avatar, Btn, Pill, Card, EmptyState, CH, P, AnimateIn } = window;

/* ── shared status vocabulary (DB value → UI label/tone) ── */
const STATUS_LABEL = { pending: 'Pending', accepted: 'Approved', declined: 'Declined' };
const STATUS_TONE = { pending: 'gold', accepted: 'success', declined: 'gray' };

// Relative time from an ISO timestamp ("just now", "3h ago", "Apr 2"). No deps.
function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60); if (h < 24) return h + 'h ago';
  const d = Math.round(h / 24); if (d < 7) return d + 'd ago';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── live pending-count badge holder (DB-backed, shared with the nav) ──
   The nav can't read the DB inline, so this small store carries the admin's
   pending count. The queue screen and refreshIntroBadge() keep it current. */
const INTRO_BADGE = { count: 0, ls: new Set() };
function setIntroBadge(n) { INTRO_BADGE.count = n; INTRO_BADGE.ls.forEach(l => l()); }
function useIntroBadge() {
  const [, force] = useStateIR(0);
  useEffectIR(() => { const l = () => force(n => n + 1); INTRO_BADGE.ls.add(l); return () => INTRO_BADGE.ls.delete(l); }, []);
  return INTRO_BADGE.count;
}
// Count this admin's pending requests scoped to their chapter members and publish it.
async function refreshIntroBadge(adminProfileId, chapterId) {
  if (!adminProfileId) return;
  try {
    const rows = await listChapterIntroRequests(adminProfileId);
    const n = rows.filter(r => r.status === 'pending' && r.target && r.target.chapter_id === chapterId).length;
    setIntroBadge(n);
  } catch (e) { /* leave the last known count; the screen surfaces errors */ }
}

/* ───────────────────────── Admin: intro-approval queue ───────────────────────── */
function AdminIntroRequests({ meId, go }) {
  const me = P(meId) || {};
  const chapterId = me.chapter;
  const c = CH(chapterId);
  const [rows, setRows] = useStateIR(null); // null = loading
  const [error, setError] = useStateIR('');
  const [tab, setTab] = useStateIR('pending'); // 'pending' | 'resolved'

  const load = useCallbackIR(async () => {
    setError('');
    try {
      const data = await listChapterIntroRequests(meId);
      // Defense in depth: even though RLS scopes to our chapter, keep only rows
      // whose target is actually a member of this admin's chapter.
      const mine = data.filter(r => r.target && r.target.chapter_id === chapterId);
      setRows(mine);
      setIntroBadge(mine.filter(r => r.status === 'pending').length);
    } catch (e) {
      setError((e && e.message) || 'Could not load intro requests.');
      setRows([]);
    }
  }, [meId, chapterId]);

  useEffectIR(() => { load(); }, [load]);

  // Optimistic resolve: flip the row locally, write to the DB, revert on error.
  const onResolve = async (id, status, reason) => {
    const prev = rows;
    const next = rows.map(r => r.id === id ? { ...r, status, broker_admin_id: status === 'accepted' ? meId : r.broker_admin_id } : r);
    setRows(next);
    setIntroBadge(next.filter(r => r.status === 'pending').length);
    try {
      await resolveIntroRequest(id, status, status === 'accepted' ? meId : null);
      // Optional, in-session only: surface the approved intro the way the prototype
      // store does. This is NOT persisted and disappears on refresh.
      if (status === 'accepted') {
        const r = prev.find(x => x.id === id);
        window.__notify && window.__notify('Intro approved' + (r && r.target ? ' for ' + r.target.name.split(' ')[0] : '') + ' · status saved');
      } else {
        window.__notify && window.__notify('Request declined' + (reason ? ' · reason recorded in-session' : ''));
      }
    } catch (e) {
      setRows(prev);
      setIntroBadge(prev.filter(r => r.status === 'pending').length);
      setError((e && e.message) || 'Could not update the request. Your change was not saved.');
    }
  };

  const pending = (rows || []).filter(r => r.status === 'pending');
  const resolved = (rows || []).filter(r => r.status !== 'pending');
  const shown = tab === 'pending' ? pending : resolved;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 72px', '--chapter': c.color, '--chapter-ink': c.ink }}>
      {/* header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          <Icon name="shield" size={15} /> Brokered access · {c.letters}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 600, margin: '5px 0 0' }}>Intro requests</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '5px 0 0', lineHeight: 1.55 }}>
          You are the gatekeeper. A recruiter reaches one of your {c.noun ? c.noun + 's' : 'members'} only if you approve. Approved requests record you as the broker.</p>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['pending', 'Pending', pending.length], ['resolved', 'History', resolved.length]].map(([k, lb, n]) => (
          <button key={k} onClick={() => setTab(k)} style={{ border: '1.5px solid', cursor: 'pointer', borderRadius: 999, padding: '7px 16px', fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--font-ui)',
            background: tab === k ? 'var(--navy)' : 'transparent', color: tab === k ? '#fff' : 'var(--ink-2)', borderColor: tab === k ? 'var(--navy)' : 'var(--border)' }}>
            {lb}{n ? ` · ${n}` : ''}</button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#f7e7e4', border: '1px solid #e8c4bd', color: 'var(--alert)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
          {error}</div>
      )}

      {rows === null ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>Loading requests…</div>
      ) : shown.length === 0 ? (
        <EmptyState icon={tab === 'pending' ? 'shield' : 'seal'}
          title={tab === 'pending' ? 'No pending intro requests right now.' : 'No resolved requests yet.'}
          body={tab === 'pending' ? 'When a recruiter or member asks to reach one of your chapter members, it lands here for your decision.' : 'Approved and declined requests will show here as you act on them.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {shown.map((r, i) => <AnimateIn key={r.id} index={i}><RequestCard r={r} onResolve={onResolve} go={go} /></AnimateIn>)}
        </div>
      )}
    </div>
  );
}

// One request: recruiter → wants to reach → member, with the ask, note, time,
// and (when pending) a weighty Approve / quieter Decline with a confirm step.
function RequestCard({ r, onResolve, go }) {
  const [stage, setStage] = useStateIR(null); // null | 'approve' | 'decline'
  const [reason, setReason] = useStateIR('');
  const [busy, setBusy] = useStateIR(false);
  const req = r.requester || {};
  const tgt = r.target || {};
  const isRecruiter = req.role === 'recruiter';
  const pending = r.status === 'pending';

  const act = async (status) => {
    if (busy) return;
    setBusy(true);
    await onResolve(r.id, status, status === 'declined' ? reason.trim() : '');
    setBusy(false); setStage(null); setReason('');
  };

  return (
    <Card pad={0} style={{ overflow: 'hidden', borderColor: pending ? 'var(--gold-line)' : 'var(--border)' }}>
      {/* requester (who is asking) */}
      <div style={{ padding: '15px 18px 13px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, flex: 'none', display: 'grid', placeItems: 'center',
          background: isRecruiter ? '#efe9f5' : 'var(--navy-50)', color: isRecruiter ? '#5b3b82' : 'var(--navy)' }}>
          <Icon name={isRecruiter ? 'building' : 'bond'} size={21} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{req.name || 'A requester'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
            {[req.company, req.title].filter(Boolean).join(' · ') || (isRecruiter ? 'Recruiter' : req.headline || 'Member')}</div>
        </div>
        <Pill tone={STATUS_TONE[r.status]} icon={r.status === 'accepted' ? 'check' : undefined} style={{ flex: 'none' }}>{STATUS_LABEL[r.status]}</Pill>
      </div>

      {/* connector → wants to reach → member */}
      <div style={{ padding: '0 18px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
        <span style={{ height: 1, flex: 'none', width: 14, background: 'var(--border)' }} /> wants to reach <span style={{ height: 1, flex: 1, background: 'var(--border)' }} /></div>

      <div style={{ padding: '11px 18px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar personId={tgt.id} name={tgt.name} size={42} onClick={tgt.id ? () => go && go('profile', { id: tgt.id }) : undefined} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>{tgt.name || 'A member'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tgt.headline || 'Chapter member'}</div>
        </div>
      </div>

      {/* the ask + note + time */}
      <div style={{ margin: '0 18px', padding: '12px 14px', background: '#faf8f2', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        {r.intent && <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 5 }}>{r.intent}</div>}
        <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{r.note || 'No message included.'}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name="calendar" size={12.5} /> Requested {timeAgo(r.created_at)}</div>
      </div>

      {/* actions (pending only) */}
      {pending && (
        <div style={{ padding: '14px 18px 16px' }}>
          {stage === null && (
            <div style={{ display: 'flex', gap: 9 }}>
              <Btn variant="gold" icon="check" onClick={() => setStage('approve')}>Approve intro</Btn>
              <Btn variant="ghost" onClick={() => setStage('decline')}>Decline</Btn>
            </div>
          )}
          {stage === 'approve' && (
            <div style={{ background: 'var(--gold-soft)', border: '1px solid var(--gold-line)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', animation: 'gb-pop var(--motion-fast) var(--ease-out)' }}>
              <div style={{ fontSize: 13, color: '#7a5e12', fontWeight: 600, marginBottom: 10, lineHeight: 1.5 }}>
                Approve and relay this intro to {tgt.name ? tgt.name.split(' ')[0] : 'the member'}? You will be recorded as the broker.</div>
              <div style={{ display: 'flex', gap: 9 }}>
                <Btn variant="gold" icon="check" onClick={() => act('accepted')}>{busy ? 'Saving…' : 'Confirm approve'}</Btn>
                <Btn variant="ghost" onClick={() => setStage(null)}>Cancel</Btn>
              </div>
            </div>
          )}
          {stage === 'decline' && (
            <div style={{ background: '#f8f6f1', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', animation: 'gb-pop var(--motion-fast) var(--ease-out)' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 8 }}>Decline this request?</div>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Optional reason (kept in this session)"
                style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#fff', padding: '9px 11px', fontSize: 13, lineHeight: 1.5, outline: 'none', resize: 'vertical', fontFamily: 'var(--font-ui)', color: 'var(--ink)', marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 9 }}>
                <Btn variant="outline" onClick={() => act('declined')}>{busy ? 'Saving…' : 'Confirm decline'}</Btn>
                <Btn variant="ghost" onClick={() => { setStage(null); setReason(''); }}>Cancel</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ───────────────── Requester's own intro requests (recruiter / member) ───────────────── */
// A compact, real-data list of the requests this profile has sent, with live status.
// Used in the recruiter pipeline right rail; safe for members too.
function MyIntroRequests({ selfId, compact }) {
  const [rows, setRows] = useStateIR(null);
  const [error, setError] = useStateIR('');

  useEffectIR(() => {
    let alive = true;
    (async () => {
      try { const data = await listMyIntroRequests(selfId); if (alive) setRows(data); }
      catch (e) { if (alive) { setError((e && e.message) || 'Could not load your requests.'); setRows([]); } }
    })();
    return () => { alive = false; };
  }, [selfId]);

  return (
    <Card pad={0}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--navy)' }}><Icon name="shield" size={17} /></span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>My intro requests</span>
      </div>
      {error && <div style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--alert)', fontWeight: 600 }}>{error}</div>}
      {rows === null ? (
        <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--ink-2)' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          No intro requests yet. When you request an intro, its status shows here.</div>
      ) : (
        rows.map(r => {
          const t = r.target || {};
          const ch = t.chapter_id ? CH(t.chapter_id) : null;
          return (
            <div key={r.id} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar personId={t.id} name={t.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name || 'A member'}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{ch ? `via ${ch.letters} admin · ` : ''}{timeAgo(r.created_at)}</div>
                </div>
                <Pill tone={STATUS_TONE[r.status]} icon={r.status === 'accepted' ? 'check' : undefined}>{STATUS_LABEL[r.status]}</Pill>
              </div>
              {r.status === 'pending' && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="shield" size={13} /> Awaiting the chapter admin’s approval</div>
              )}
              {r.status === 'declined' && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>The chapter admin declined this request.</div>
              )}
            </div>
          );
        })
      )}
    </Card>
  );
}

window.refreshIntroBadge = refreshIntroBadge;
window.useIntroBadge = useIntroBadge;
window.setIntroBadge = setIntroBadge;
Object.assign(window, { AdminIntroRequests, MyIntroRequests });
