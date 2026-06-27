// Vouches.jsx: brother/sister endorsements. A vouch is someone putting their name and
// their bond behind you, trust LinkedIn can't replicate because their endorsers are strangers.
// Member-only (verb law): recruiters may see the COUNT as a trust signal, never give or read one.
import React from 'react';
const { useState: useStateV } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf } = window;

/* who the voucher is to the subject, the tie that gives the vouch its weight.
   weight: 'lineage' (Big/Little) > 'pledge' (same class) > 'leader' (held office) > 'chapter' */
function vouchTie(voucherId, subjectId) {
  const v = P(voucherId), s = P(subjectId);
  if (!v || !s) return { label: '', weight: 'chapter', wlabel: null };
  const ch = CH(v.chapter);
  const yr = `’${String(v.classYear).slice(2)}`;
  if (s.line && s.line.big === voucherId) return { label: `${s.name.split(' ')[0]}’s Big · ${ch.letters} ${yr}`, weight: 'lineage', wlabel: 'Their Big' };
  if (window.littlesOf(s).includes(voucherId)) return { label: `${s.name.split(' ')[0]}’s Little · ${ch.letters} ${yr}`, weight: 'lineage', wlabel: 'Their Little' };
  if (v.pledgeClass && v.pledgeClass === s.pledgeClass) return { label: `Pledge ${ch.plural} · ${v.pledgeClass}`, weight: 'pledge', wlabel: 'Pledge class' };
  const leaderPos = (v.positions || []).find(p => /President|Vice|VP|Treasurer|Chair|Advisor|Educator/.test(p));
  if (leaderPos) return { label: `${leaderPos} · ${ch.letters} ${yr}`, weight: 'leader', wlabel: 'Held office' };
  return { label: `${ch.letters} · ${ch.school.split(' ')[0]} ${yr}`, weight: 'chapter', wlabel: null };
}

function WeightBadge({ tie }) {
  if (!tie.wlabel) return null;
  const lineage = tie.weight === 'lineage';
  const leader = tie.weight === 'leader';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2.5px 9px 2.5px 7px', borderRadius: 999,
      background: lineage ? 'var(--gold-soft)' : leader ? 'var(--navy-50)' : 'var(--bg-2)',
      border: `1px solid ${lineage ? 'var(--gold-line)' : leader ? 'var(--navy-100)' : 'var(--border)'}`,
      fontSize: 11, fontWeight: 700, color: lineage ? '#7a5e12' : leader ? 'var(--navy)' : 'var(--ink-2)', letterSpacing: '.01em' }}>
      <Icon name={lineage ? 'bond' : leader ? 'shield' : 'seal'} size={12} stroke={2.3} fill={tie.weight === 'chapter' ? 'var(--gold)' : 'none'} />{tie.wlabel}
    </span>
  );
}

function VouchCard({ v, subjectId, go }) {
  const voucher = P(v.from);
  if (!voucher) return null;
  const tie = vouchTie(v.from, subjectId);
  return (
    <div style={{ display: 'flex', gap: 13, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
      <Avatar personId={v.from} size={48} onClick={() => go && go('profile', { id: v.from })} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => go && go('profile', { id: v.from })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>{voucher.name}</button>
          <WeightBadge tie={tie} />
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-3)' }}>{v.time}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{tie.label}</div>
        <p style={{ margin: '9px 0 0', fontSize: 14, lineHeight: 1.6, color: '#33363c', textWrap: 'pretty', position: 'relative', paddingLeft: 15 }}>
          <span style={{ position: 'absolute', left: 0, top: -4, fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1, color: 'var(--gold-line)' }}>“</span>
          {v.text}</p>
      </div>
    </div>
  );
}

/* Composer, a vouch is a small ceremony, not a thumbs-up. Sincere, warm, deliberate. */
function VouchComposer({ subject, fromId, onClose }) {
  const [text, setText] = useStateV('');
  const ch = CH(subject.chapter);
  const tie = vouchTie(fromId, subject.id);
  const min = 24;
  const ok = text.trim().length >= min;
  const submit = () => {
    if (!ok) return;
    addVouch(subject.id, fromId, text);
    onClose();
    window.__notify && window.__notify(`Your vouch for ${subject.name.split(' ')[0]} is live`);
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(17,27,61,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', animation: 'gb-fade var(--motion-base) var(--ease-out)', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ '--chapter': ch.color, width: 480, maxWidth: '94vw', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--gold-line)', overflow: 'hidden', animation: 'gb-pop var(--motion-base) var(--ease-out)' }}>
        <div style={{ padding: '20px 24px 16px', background: 'var(--gold-soft)', borderBottom: '1px solid var(--gold-line)', display: 'flex', gap: 13, alignItems: 'center' }}>
          <Avatar personId={subject.id} size={50} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.1 }}>Vouch for {subject.name.split(' ')[0]}</div>
            <div style={{ fontSize: 12.5, color: '#7a5e12', fontWeight: 600, marginTop: 3 }}>Put your name and your bond behind {ch.plural === 'brothers' ? 'him' : 'her'}.</div>
          </div>
        </div>
        <div style={{ padding: '18px 24px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 12.5, color: 'var(--ink-2)' }}>
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>You’re vouching as</span><WeightBadge tie={tie} /><span style={{ color: 'var(--ink-3)' }}>{tie.label}</span>
          </div>
          <textarea autoFocus value={text} onChange={e => setText(e.target.value)} maxLength={320}
            placeholder={`What makes ${subject.name.split(' ')[0]} someone you’d stake your name on? Speak from what you’ve actually seen.`}
            style={{ width: '100%', minHeight: 116, resize: 'vertical', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: '12px 14px', fontSize: 14, lineHeight: 1.55, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }}>
            <span style={{ fontSize: 11.5, color: ok ? 'var(--success)' : 'var(--ink-3)' }}>{ok ? 'Ready to vouch' : `A sentence or two, at least ${min} characters`}</span>
            <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{text.length}/320</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="gold" icon="seal" onClick={submit} style={{ opacity: ok ? 1 : .5, pointerEvents: ok ? 'auto' : 'none' }}>Post vouch</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* The Vouches section on a member profile. Member-only. */
function VouchesSection({ subject, viewerId, isMe, canVouch, go }) {
  useGBStore();
  const [composing, setComposing] = useStateV(false);
  const vouches = vouchesFor(subject.id);
  const already = viewerId && hasVouched(subject.id, viewerId);
  const first = subject.name.split(' ')[0];
  return (
    <Card pad={0}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px 0', flexWrap: 'wrap' }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--gold-soft)', color: 'var(--gold-deep)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="bond" size={18} stroke={2.3} /></span>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, color: 'var(--ink)' }}>Vouches</h2>
        {vouches.length > 0 && <Pill tone="gold">{vouches.length}</Pill>}
        {canVouch && !already && <Btn variant="gold" size="sm" icon="seal" style={{ marginLeft: 'auto' }} onClick={() => setComposing(true)}>Vouch for {first}</Btn>}
        {canVouch && already && <Pill tone="success" icon="check" style={{ marginLeft: 'auto' }}>You vouched</Pill>}
      </div>
      <div style={{ padding: '4px 24px 8px' }}>
        <p style={{ margin: '8px 0 2px', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          Not endorsements from strangers, {vouches.length > 0 ? `${vouches.length} ${vouches.length === 1 ? 'member who has' : 'members who have'}` : 'brothers and sisters who'} put their name behind {isMe ? 'you' : first}.</p>
        {vouches.length === 0 ? (
          <div style={{ padding: '18px 0 22px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>{isMe ? 'No vouches yet. They come from the people who know you, your Big, your pledge class, the brothers you served beside.' : `Be the first to vouch for ${first}.`}</div>
            {canVouch && !already && <div style={{ marginTop: 14 }}><Btn variant="gold" size="sm" icon="seal" onClick={() => setComposing(true)}>Vouch for {first}</Btn></div>}
          </div>
        ) : vouches.map((v, i) => <VouchCard key={(v.from) + i} v={v} subjectId={subject.id} go={go} />)}
      </div>
      {composing && <VouchComposer subject={subject} fromId={viewerId} onClose={() => setComposing(false)} />}
    </Card>
  );
}

Object.assign(window, { VouchesSection, VouchComposer, VouchCard, vouchTie });
