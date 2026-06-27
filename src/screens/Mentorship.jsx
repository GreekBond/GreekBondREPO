// Mentorship.jsx: undergrad finds mentors (ranked w/ reasons); alumni see mentees seeking them. Exports to window.
import React from 'react';
import { viewerCanAccess, requiredTierLabel } from '../lib/plan.js';
const { useState: useStateMen } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf, Seg } = window;

/* score an alumni mentor against an undergrad seeker → {score, reasons[]} */
function matchScore(seeker, mentor) {
  let score = 0; const reasons = [];
  if (mentor.chapter === seeker.chapter) { score += 40; reasons.push(`Your ${CH(mentor.chapter).noun} in ${CH(mentor.chapter).letters}`); }
  else if (CH(mentor.chapter).kind === CH(seeker.chapter).kind) { score += 12; reasons.push(`Fellow ${CH(mentor.chapter).council} member`); }
  const offers = mentor.offers || [];
  if (offers.some(o => /mentor/i.test(o))) { score += 25; reasons.push('Offers mentorship'); }
  if (offers.some(o => /intro|referral/i.test(o))) { score += 10; reasons.push('Makes warm intros'); }
  // field affinity: mentor industry matches seeker's seeking/skills
  const want = (seeker.seeking || '') + ' ' + (seeker.skills || []).join(' ');
  if (mentor.industry && new RegExp(mentor.industry.split(' ')[0], 'i').test(want)) { score += 18; reasons.push(`Works in ${mentor.industry}`); }
  if (mentor.open === 'hiring') { score += 14; reasons.push('Currently hiring'); }
  if (mentor.mutuals > 6) { score += 8; reasons.push(`${mentor.mutuals} mutual bonds`); }
  if (reasons.length === 0) reasons.push(`Verified ${CH(mentor.chapter).letters} alum`);
  return { score, reasons };
}

function Mentorship({ role, meId, go, onAsk }) {
  const me = P(meId);
  const undergrad = me.role === 'undergrad';
  const [seg, setSeg] = useStateMen(undergrad ? 'find' : 'requests');

  // Mentorship is a Bond feature. Undergrads bypass (free full access), so only
  // free-tier alumni hit this wall.
  if (!viewerCanAccess('mentorship', meId)) {
    return (
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '40px 16px' }}>
        <window.UpgradeLock icon="graduation" feature="Mentorship" tier={requiredTierLabel('mentorship')} go={go}
          body={`Mentorship across the network is a ${requiredTierLabel('mentorship')} feature. Upgrade to find mentors and answer mentees.`} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            <Icon name="graduation" size={15} /> Mentorship</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '5px 0 0' }}>
            {undergrad ? 'Find a mentor in the brotherhood' : 'Mentor the next generation'}</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '5px 0 0', maxWidth: 600 }}>
            {undergrad ? 'Matched from alumni who’ve opted to mentor, ranked by how closely they fit your path. The bond means they’ll actually answer.'
              : 'Actives across the network are looking for guidance. These are the ones who fit what you offer.'}</p>
        </div>
        {!undergrad && <Seg value={seg} set={setSeg} options={['requests', 'mentees']} />}
      </div>

      {undergrad ? <FindMentors seeker={me} meId={meId} go={go} onAsk={onAsk} />
        : seg === 'requests' ? <MenteeRequests meId={meId} go={go} />
        : <SuggestedMentees mentor={me} go={go} onAsk={onAsk} />}
    </div>
  );
}

/* UNDERGRAD: ranked mentor matches */
function FindMentors({ seeker, meId, go, onAsk }) {
  const mentors = Object.keys(window.GB.PEOPLE)
    .map(id => P(id))
    .filter(p => p.role === 'alumni' && p.id !== meId)
    .map(p => ({ p, ...matchScore(seeker, p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const top = mentors[0];

  return (
    <div className="gb-shell-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {mentors.length === 0
          ? <Card><EmptyState icon="graduation" title="No mentors yet" body="No alumni have joined to mentor yet. As your network grows, matched mentors will appear here, ranked by how closely they fit your path." /></Card>
          : <>
            {/* featured top match */}
            {top && <MentorCard m={top} featured go={go} onAsk={onAsk} viewerId={meId} />}
            {mentors.slice(1).map(m => <MentorCard key={m.p.id} m={m} go={go} onAsk={onAsk} viewerId={meId} />)}
          </>}
      </div>
      <div style={{ position: 'sticky', top: 86, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card style={{ background: 'linear-gradient(160deg, var(--navy), var(--navy-700))', color: '#fff' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 7 }}>How matches work</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.74)', lineHeight: 1.55 }}>
            We rank alumni who’ve opted to mentor by shared house, field, and what they offer. A request from a {CH(seeker.chapter).noun} is never cold.</div>
        </Card>
        <Card>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16.5, fontWeight: 600, marginBottom: 4 }}>Make yourself easy to mentor</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 12 }}>Mentors respond faster when they know what you’re after. Add it to your record.</div>
          <Btn variant="outline" size="sm" full icon="edit" onClick={() => go('profile', { id: meId })}>Update what I’m seeking</Btn>
        </Card>
      </div>
    </div>
  );
}

function ScoreRing({ score }) {
  const pct = Math.min(100, Math.round(score / 110 * 100));
  return (
    <div style={{ position: 'relative', width: 48, height: 48, flex: 'none' }}>
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle cx="24" cy="24" r="20" fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${pct / 100 * 125.6} 125.6`} transform="rotate(-90 24 24)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12.5, fontWeight: 700, color: 'var(--gold-deep)' }}>{pct}</div>
    </div>
  );
}

function MentorCard({ m, featured, go, onAsk, viewerId }) {
  const p = m.p; const ch = CH(p.chapter);
  return (
    <Card pad={0} hover style={{ '--chapter': ch.color, '--chapter-ink': ch.ink, overflow: 'hidden',
      border: featured ? '1.5px solid var(--gold)' : '1px solid var(--border)' }}>
      {featured && <div style={{ padding: '7px 18px', background: 'var(--gold-soft)', borderBottom: '1px solid var(--gold-line)', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#7a5e12' }}>
        <Icon name="star" size={14} fill="var(--gold)" stroke={0} />Your strongest match</div>}
      <div style={{ padding: '16px 18px', display: 'flex', gap: 14 }}>
        <Avatar personId={p.id} size={featured ? 64 : 54} onClick={() => go('profile', { id: p.id })} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button onClick={() => go('profile', { id: p.id })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, fontSize: 16, color: 'var(--ink)', textAlign: 'left' }}>{p.name}</button>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4, marginTop: 1 }}>{p.headline}</div>
            </div>
            <ScoreRing score={m.score} />
          </div>
          {/* why matched */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {m.reasons.slice(0, featured ? 4 : 3).map((r, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                background: i === 0 ? 'var(--gold-soft)' : 'var(--navy-50)', color: i === 0 ? '#7a5e12' : 'var(--navy-600)', border: `1px solid ${i === 0 ? 'var(--gold-line)' : 'var(--navy-100)'}` }}>
                <Icon name={i === 0 ? 'bond' : 'check'} size={11} stroke={2.4} />{r}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Btn variant="gold" size="sm" icon="graduation" onClick={() => onAsk(p, 'mentorship')}>Ask to mentor me</Btn>
            <Btn variant="ghost" size="sm" icon="message" onClick={() => go('profile', { id: p.id })}>View profile</Btn>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ALUMNI: incoming mentee requests (live from store) + suggested mentees */
function MenteeRequests({ meId, go }) {
  const store = window.useGBStore();
  const reqs = store.introRequests.filter(r => r.toId === meId && /mentor/i.test(r.ask || ''));
  if (reqs.length === 0) {
    return <EmptyState icon="graduation" title="No mentee requests yet" body="When an active asks you to mentor them, it’ll appear here, and in your alerts. Suggested mentees are under the next tab." />;
  }
  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {reqs.map(r => {
        const p = P(r.fromId); const ch = CH(p.chapter);
        return (
          <Card key={r.id} style={{ '--chapter': ch.color }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <Avatar personId={p.id} size={54} onClick={() => go('profile', { id: p.id })} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => go('profile', { id: p.id })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{p.name}</button>
                  <Pill tone="gold">{r.ask}</Pill>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>{p.headline}</div>
                {r.note && <p style={{ fontSize: 13.5, color: '#33363c', fontStyle: 'italic', lineHeight: 1.5, margin: '10px 0 0', padding: '10px 14px', background: 'var(--gold-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gold-line)' }}>“{r.note}”</p>}
                <MenteeActions req={r} go={go} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
function MenteeActions({ req, go }) {
  const [done, setDone] = useStateMen(req.status !== 'pending' ? req.status : null);
  if (done === 'approved') return <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}><Pill tone="success" icon="check">You’re mentoring them</Pill><Btn variant="ghost" size="sm" icon="message" onClick={() => go('messages')}>Open thread</Btn></div>;
  if (done === 'declined') return <div style={{ marginTop: 12 }}><Pill tone="gray">Declined</Pill></div>;
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
      <Btn variant="gold" size="sm" icon="graduation" onClick={() => { window.resolveIntro(req.id, 'approved', 'Glad to take you on.'); setDone('approved'); window.__notify && window.__notify('You’re now mentoring ' + P(req.fromId).name.split(' ')[0]); }}>Accept & open thread</Btn>
      <Btn variant="ghost" size="sm" onClick={() => { window.resolveIntro(req.id, 'declined'); setDone('declined'); }}>Decline</Btn>
    </div>
  );
}

function SuggestedMentees({ mentor, go, onAsk }) {
  const mentees = Object.keys(window.GB.PEOPLE).map(id => P(id))
    .filter(p => p.role === 'undergrad').map(p => ({ p, ...matchScore(p, mentor) }))
    .sort((a, b) => b.score - a.score).slice(0, 5);
  if (mentees.length === 0) {
    return <EmptyState icon="graduation" title="No mentees yet" body="When actives join and start looking for guidance, the ones who fit what you offer will appear here." />;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
      {mentees.map(({ p, reasons }) => {
        const ch = CH(p.chapter);
        return (
          <Card key={p.id} pad={0} hover style={{ '--chapter': ch.color, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar personId={p.id} size={50} onClick={() => go('profile', { id: p.id })} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button onClick={() => go('profile', { id: p.id })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, fontSize: 15.5, color: 'var(--ink)', textAlign: 'left' }}>{p.name}</button>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.35, marginTop: 1 }}>{p.headline}</div>
                </div>
              </div>
              {p.seeking && <div style={{ fontSize: 12.5, color: '#33363c', marginTop: 10, padding: '8px 11px', background: '#faf8f2', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, color: 'var(--ink-2)' }}>Seeking: </span>{p.seeking}</div>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {reasons.slice(0, 2).map((r, i) => <Pill key={i} tone={i === 0 ? 'gold' : 'navy'}>{r}</Pill>)}
              </div>
              <div style={{ marginTop: 14 }}><Btn variant="primary" size="sm" full icon="intro" onClick={() => onAsk(p, 'intro')}>Offer to mentor</Btn></div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

Object.assign(window, { Mentorship, matchScore });
