// RecruiterConsole.jsx: recruiter home = pipeline dashboard (NOT a feed) + candidates manager.
import React from 'react';
import { listJobsByPoster, listMyIntroRequests, countOpenToWork } from '../lib/db.js';
const { useState: useStateRec, useEffect: useEffectRec } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf } = window;

function RecruiterPipeline({ go, onAsk, selfId }) {
  const MyIntroRequests = window.MyIntroRequests;
  const r = window.GB.RECRUITER;
  const pl = window.GB.PIPELINE;
  const openCands = pl.candidates.filter(id => P(id).open === 'work');

  // Real tile counts, loaded from the DB. null = loading, 'err' = query failed
  // (RLS/network), shown as a quiet "-" instead of a fake zero. Re-runs when the
  // recruiter changes; navigating away to post a role and back remounts this
  // screen, so the numbers refresh without a stale cache.
  const [tiles, setTiles] = useStateRec({ openRoles: null, pending: null, openToWork: null });
  const [myJobs, setMyJobs] = useStateRec(null); // real rows for the "Your open roles" list
  useEffectRec(() => {
    if (!selfId) return;
    let alive = true;
    (async () => {
      const next = {};
      let jobs = [];
      try { jobs = await listJobsByPoster(selfId); next.openRoles = jobs.length; } catch { next.openRoles = 'err'; }
      try { next.pending = (await listMyIntroRequests(selfId)).filter(x => x.status === 'pending').length; } catch { next.pending = 'err'; }
      try { next.openToWork = await countOpenToWork(); } catch { next.openToWork = 'err'; }
      if (alive) { setTiles(next); setMyJobs(jobs); }
    })();
    return () => { alive = false; };
  }, [selfId]);
  const tileVal = (v) => v === null ? '…' : v === 'err' ? '-' : String(v);

  // Three honest tiles. The mock "Applicants" tile is gone: GreekBond has no
  // application-tracking flow (Apply routes to an external URL/email and records
  // nothing), so any number there would be invented. "Open to work" is no longer
  // scoped to "target chapters" because the schema models no such concept; it
  // counts everyone the recruiter is allowed to see who is open to work.
  const TILES = [
    { key: 'openRoles', label: 'Open roles', icon: 'briefcase',
      sub: tiles.openRoles === 'err' ? 'could not load' : tiles.openRoles > 0 ? 'live now' : tiles.openRoles === 0 ? 'no roles posted yet, tap to post' : ' ',
      hot: false, onClick: () => go('jobs') },
    { key: 'openToWork', label: 'Open to work', icon: 'star',
      sub: tiles.openToWork === 'err' ? 'could not load' : tiles.openToWork > 0 ? 'open to work now' : tiles.openToWork === 0 ? 'none open to work right now' : ' ',
      hot: false, onClick: () => go('talent') },
    { key: 'pending', label: 'Intros awaiting admin', icon: 'shield',
      sub: tiles.pending === 'err' ? 'could not load' : tiles.pending > 0 ? 'pending approval' : tiles.pending === 0 ? 'no pending intros' : ' ',
      hot: tiles.pending > 0, onClick: null },
  ];
  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            <Icon name="target" size={15} /> Pipeline · {r.company}</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '5px 0 0' }}>Good morning, {r.name.split(' ')[0]}</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '5px 0 0' }}>{r.plan} · hiring {r.hiringFor.slice(0, 2).join(' & ').toLowerCase()}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="outline" icon="search" onClick={() => go('talent')}>Search talent</Btn>
          <Btn variant="primary" icon="plus" onClick={() => go('jobs')}>Post a role</Btn>
        </div>
      </div>

      {/* metric tiles: three real DB-backed counts (the mock "Applicants" tile was removed) */}
      <div className="gb-grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {TILES.map(t => (
          <Card key={t.key} hover={!!t.onClick}
            onClick={t.onClick || undefined}
            style={t.onClick ? { cursor: 'pointer' } : undefined}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--ink-2)', fontSize: 12, fontWeight: 600 }}><Icon name={t.icon} size={15} />{t.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--navy)', margin: '7px 0 2px' }}>{tileVal(tiles[t.key])}</div>
            <div style={{ fontSize: 12, color: t.hot ? 'var(--gold-deep)' : 'var(--ink-2)', fontWeight: t.hot ? 600 : 400 }}>{t.sub}</div>
          </Card>
        ))}
      </div>

      <div className="gb-shell-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* open roles */}
          <Card pad={0}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Your open roles</span>
              <Btn variant="ghost" size="sm" onClick={() => go('jobs')} iconR="chevR">Manage</Btn>
            </div>
            {myJobs === null ? (
              <div style={{ padding: '18px 20px', fontSize: 13, color: 'var(--ink-2)' }}>Loading…</div>
            ) : myJobs.length === 0 ? (
              <div style={{ padding: '22px 20px', borderTop: '1px solid var(--border)', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                No roles posted yet. <button onClick={() => go('jobs')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--navy)', fontWeight: 700, cursor: 'pointer' }}>Post your first role.</button>
              </div>
            ) : myJobs.map(j => (
              <div key={j.id} style={{ padding: '15px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 9, background: '#efe9f5', color: '#5b3b82', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="briefcase" size={20} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{j.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{[j.location, j.type].filter(Boolean).join(' · ')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 600 }}>{j.posted}</div>
                </div>
              </div>
            ))}
          </Card>

          {/* new open-to-work candidates */}
          <Card pad={0}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Open to work</span>
              <Btn variant="ghost" size="sm" onClick={() => go('talent')} iconR="chevR">Search all</Btn>
            </div>
            {openCands.map(id => {
              const p = P(id); const ch = CH(p.chapter);
              return (
                <div key={id} style={{ padding: '13px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 13, '--chapter': ch.color }}>
                  <Avatar personId={id} size={46} onClick={() => go('profile', { id })} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button onClick={() => go('profile', { id })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>{p.name}</button>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{p.title} · <span style={{ color: 'var(--chapter)', fontWeight: 600 }}>{ch.letters}</span> · {p.location}</div>
                  </div>
                  <Btn variant="primary" size="sm" icon="intro" onClick={() => onAsk ? onAsk(P(id), 'intro') : go('profile', { id })}>Request intro</Btn>
                </div>
              );
            })}
          </Card>
        </div>

        {/* right rail: this recruiter's own intro requests, real DB-backed status */}
        <div style={{ position: 'sticky', top: 86, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selfId && MyIntroRequests ? <MyIntroRequests selfId={selfId} /> : null}
          <Card style={{ background: 'linear-gradient(160deg, var(--navy), var(--navy-700))', color: '#fff' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Access is brokered</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.72)', lineHeight: 1.55 }}>
              You reach the brotherhood through the chapters that trust you, never raw, never cold. Build relationships with admins and your intros get approved faster.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Candidates manager ───────────────── */
function RecruiterCandidates({ go }) {
  const pl = window.GB.PIPELINE;
  const cols = [
    ['Sourced', pl.candidates.slice(0, 2)],
    ['Intro requested', pl.candidates.slice(2, 4)],
    ['In conversation', pl.candidates.slice(4, 5)],
  ];
  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}><Icon name="users" size={15} /> Candidates</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '5px 0 0' }}>Your pipeline</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '5px 0 0' }}>Move candidates through stages. Reaching them requires an intro approved by their chapter.</p>
      </div>
      <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>
        {cols.map(([title, ids]) => (
          <div key={title}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 10px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>{title}</span>
              <Pill tone="gray">{ids.length}</Pill>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ids.map(id => {
                const p = P(id); const ch = CH(p.chapter);
                return (
                  <Card key={id} pad={0} style={{ '--chapter': ch.color, overflow: 'hidden' }}>
                    <div style={{ height: 3, background: 'var(--chapter)' }} />
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                        <Avatar personId={id} size={44} onClick={() => go('profile', { id })} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <button onClick={() => go('profile', { id })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, fontSize: 14, color: 'var(--ink)', textAlign: 'left' }}>{p.name}</button>
                          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{p.title}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ink-3)', marginTop: 10 }}>
                        <Crest chapterId={p.chapter} size={15} ring={false} /> {ch.letters} · {p.location}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 9 }}>{p.skills.slice(0, 3).map(s => <Pill key={s} tone="navy">{s}</Pill>)}</div>
                      <div style={{ marginTop: 12 }}>
                        {title === 'Sourced' && <Btn variant="primary" size="sm" full icon="intro" onClick={() => window.__askIntro && window.__askIntro(p, 'intro')}>Request intro via {ch.letters}</Btn>}
                        {title === 'Intro requested' && <Btn variant="subtle" size="sm" full icon="shield">Awaiting {ch.letters} admin</Btn>}
                        {title === 'In conversation' && <Btn variant="primary" size="sm" full icon="message" onClick={() => go('messages')}>Open thread</Btn>}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { RecruiterPipeline, RecruiterCandidates });
