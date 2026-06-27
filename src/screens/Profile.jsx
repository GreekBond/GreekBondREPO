// Profile.jsx: member profile. Privacy tiers: bonded brother sees all; recruiter sees a restricted card.
import React from 'react';
const { useState: useStateProf } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf, VouchesSection } = window;

function Profile({ id, role, meId, self, go, bond, edits, openEditor, saveProfile, onAsk }) {
  // Always be able to render the logged-in user's own profile: if it isn't in
  // the window.GB.PEOPLE cache yet (empty DB / not hydrated), fall back to the
  // real Supabase profile resolved by useProfile (passed as `self`).
  const wantsSelf = !id || id === meId || (self && id === self.id);
  const base = P(id) || (meId && P(meId)) || (wantsSelf ? self : null);
  if (!base) {
    return (
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px' }}>
        <Card><EmptyState icon="users" title="Profile not found" body="This member isn’t on GreekBond yet. As more brothers and sisters join, their profiles will appear here." /></Card>
      </div>
    );
  }
  const p = { ...base, ...((edits && edits[base.id]) || {}) };
  const ch = CH(p.chapter);
  const isMe = !role || role === p.role ? p.id === meId : false;
  const me = meId ? P(meId) : null;
  const recruiter = role === 'recruiter';
  const sameChapter = me && me.chapter === p.chapter && !isMe;
  const open = p.open === 'work' || p.open === 'hiring';
  const setOpen = (v) => saveProfile && saveProfile(p.id, { open: v ? 'work' : null });

  // Recruiter sees the restricted render
  if (recruiter) return <RecruiterProfile p={p} ch={ch} go={go} onAsk={onAsk} />;

  return (
    <div className="gb-shell-stack" style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px', '--chapter': ch.color, '--chapter-ink': ch.ink,
      display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Bond Strength, how you're connected, strongest tie first (gold-tinted, proud) */}
        {!isMe && <HowConnected person={p} viewerId={meId} />}

        {/* Identity */}
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ height: 158, background: `linear-gradient(115deg, var(--navy) 0%, var(--navy-700) 42%, var(--chapter) 84%, ${tint(ch.color, .25)} 130%)`, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: .2, background: 'repeating-linear-gradient(45deg, transparent, transparent 13px, rgba(255,255,255,.5) 13px, rgba(255,255,255,.5) 14px)' }} />
            <div style={{ position: 'absolute', right: -14, bottom: -20, opacity: .2 }}><Crest chapterId={p.chapter} size={150} ring={false} /></div>
            {isMe && <button onClick={() => openEditor && openEditor(p.id)} style={{ position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: 999, border: 'none', background: 'rgba(255,255,255,.92)', color: 'var(--navy)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="edit" size={18} /></button>}
          </div>
          <div style={{ padding: '0 26px 24px' }}>
            <div style={{ marginTop: -54, marginBottom: 4 }}>
              <div style={{ display: 'inline-block', border: '4px solid var(--surface)', borderRadius: '50%', background: 'var(--surface)' }}>
                <Avatar personId={p.id} size={128} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.01em' }}>{p.name}</h1>
              {p.verified && <Pill tone="gold" icon="seal">Verified {ch.noun}</Pill>}
              {p.open && <Pill tone="success">{p.open === 'hiring' ? 'Hiring' : 'Open to work'}</Pill>}
            </div>
            <div style={{ fontSize: 16, color: 'var(--ink)', marginTop: 6, lineHeight: 1.45 }}>{p.headline}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13.5, color: 'var(--ink-2)', marginTop: 8, flexWrap: 'wrap' }}>
              <Icon name="pin" size={15} stroke={2} />{p.location}
              <span style={{ margin: '0 3px' }}>·</span>
              <button onClick={() => go('network')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--navy)', fontWeight: 700, fontSize: 13.5 }}>{p.bonds} bonds</button>
            </div>

            {/* lineage as co-headline */}
            <button onClick={() => go('chapter', { id: p.chapter })} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--chapter)',
              borderRadius: 'var(--radius-sm)', padding: '11px 14px', marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', width: '100%' }}>
              <Crest chapterId={p.chapter} size={42} seal />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16.5, fontWeight: 600, color: 'var(--chapter-ink)', lineHeight: 1.15 }}>{ch.name} · {ch.letters}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>{p.school} · {p.role === 'undergrad' ? `Active · Class of ’${String(p.classYear).slice(2)}` : `Alumnus · ’${String(p.classYear).slice(2)}`}</div>
              </div>
            </button>

            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              {isMe ? (
                <><Btn variant="outline" icon="edit" onClick={() => openEditor && openEditor(p.id)}>Edit profile</Btn>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 999 }}>
                    <Icon name="briefcase" size={17} style={{ color: open ? 'var(--success)' : 'var(--ink-2)' }} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Open to work</span>
                    <Toggle on={open} set={setOpen} />
                  </div></>
              ) : (
                <><BondProfileBtn person={p} sameChapter={sameChapter} bond={bond} meId={meId} />
                  <Btn variant="outline" icon="message" onClick={() => go('messages')}>Message</Btn>
                  <Btn variant="ghost" onClick={() => window.__notify && window.__notify('More options aren’t available in this preview')}>More</Btn></>
              )}
            </div>
          </div>
        </Card>

        {p.about && <SectionCard title="About"><p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: '#33363c', textWrap: 'pretty' }}>{p.about}</p></SectionCard>}

        <OfferSeekingCard p={p} isMe={isMe} openEditor={openEditor} />

        {/* Greek lineage, the letterman record, first-class */}
        <Card pad={0} style={{ borderColor: 'var(--gold-line)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '15px 24px', background: 'var(--gold-soft)', borderBottom: '1px solid var(--gold-line)' }}>
            <span style={{ color: 'var(--gold-deep)' }}><Icon name="seal" size={20} fill="var(--gold)" stroke={0} /></span>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, color: 'var(--navy)' }}>Greek Lineage</h2>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--chapter)' }}>{ch.motto}</span>
          </div>
          <div style={{ padding: '20px 24px' }}><LineageBlock person={p} go={go} /></div>
        </Card>

        <SectionCard title="Experience">
          {[[p.company, p.title, p.role === 'undergrad' ? 'Current' : '2021 to Present · 3 yrs'], ['Bridgewell Partners', 'Analyst', '2019 to 2021 · 2 yrs']].slice(0, p.role === 'undergrad' ? 1 : 2).map(([co, rol, time], i) => (
            <div key={i} style={{ display: 'flex', gap: 14, paddingTop: i ? 16 : 0, marginTop: i ? 16 : 0, borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 48, height: 48, borderRadius: 9, background: 'var(--navy-50)', display: 'grid', placeItems: 'center', color: 'var(--navy)', flex: 'none' }}><Icon name="briefcase" size={22} /></div>
              <div><div style={{ fontWeight: 700, fontSize: 15 }}>{rol}</div><div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{co}</div><div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 1 }}>{time}</div></div>
            </div>
          ))}
        </SectionCard>

        <SectionCard title="Skills & Interests">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{p.skills.map(s => <Pill key={s} tone="gray">{s}</Pill>)}</div>
        </SectionCard>

        {/* Vouches, brother/sister endorsements (member-only) */}
        <VouchesSection subject={p} viewerId={meId} isMe={isMe} canVouch={!isMe && (p.bonded || sameChapter)} go={go} />
      </div>

      {/* Right rail */}
      <div style={{ position: 'sticky', top: 86, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>{ch.letters} {ch.plural} also viewed</div>
          {Object.keys(window.GB.PEOPLE).filter(k => P(k).chapter === p.chapter && k !== p.id).slice(0, 3).map(sid => {
            const sp = P(sid);
            return (
              <div key={sid} style={{ padding: '10px 16px', display: 'flex', gap: 11, alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                <Avatar personId={sid} size={42} onClick={() => go('profile', { id: sid })} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button onClick={() => go('profile', { id: sid })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', textAlign: 'left' }}>{sp.name}</button>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.headline}</div>
                </div>
              </div>
            );
          })}
        </Card>
        {!isMe && (
          <Card style={{ background: 'linear-gradient(160deg, var(--navy), var(--navy-700))', color: '#fff' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 6 }}>The bond is an advantage</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.72)', lineHeight: 1.55, marginBottom: 14 }}>A warm intro from a {ch.noun} moves you to the top of the pile. Bond, then ask.</div>
            <Btn variant="gold" size="sm" full icon="intro" onClick={() => onAsk ? onAsk(p, 'intro') : go('messages')}>Ask {p.name.split(' ')[0]} for an intro</Btn>
          </Card>
        )}
      </div>
    </div>
  );
}

function OfferSeekingCard({ p, isMe, openEditor }) {
  const offers = p.offers || [];
  const seekingTags = p.seekingTags || [];
  const hasOffer = offers.length || p.offerNote;
  const hasSeeking = seekingTags.length || p.seeking || p.open;
  if (!hasOffer && !hasSeeking) {
    if (!isMe) return null;
    return (
      <Card style={{ border: '1px dashed var(--border)', textAlign: 'center', padding: '22px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--navy)' }}>Tell the network what you offer, and what you need</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', margin: '6px 0 14px', lineHeight: 1.5 }}>Warm intros, mentorship, hiring, the GreekBond fields that open doors.</div>
        <Btn variant="gold" size="sm" icon="intro" onClick={() => openEditor && openEditor(p.id)}>Add to my record</Btn>
      </Card>
    );
  }
  const undergrad = p.role === 'undergrad';
  const openLabel = p.open === 'work' ? 'Open to work' : p.open === 'hiring' ? 'Open to hire' : null;
  const OfferBlock = hasOffer ? (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--gold-soft)', color: 'var(--gold-deep)', display: 'grid', placeItems: 'center' }}><Icon name="intro" size={16} /></span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16.5, color: 'var(--ink)' }}>I can offer</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{offers.map(o => <Pill key={o} tone="gold">{o}</Pill>)}</div>
      {p.offerNote && <p style={{ fontSize: 13.5, color: '#33363c', lineHeight: 1.55, margin: '11px 0 0', fontStyle: 'italic' }}>“{p.offerNote}”</p>}
    </div>
  ) : null;
  const SeekBlock = hasSeeking ? (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--navy-50)', color: 'var(--navy)', display: 'grid', placeItems: 'center' }}><Icon name="target" size={16} /></span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16.5, color: 'var(--ink)' }}>Looking for</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {openLabel && <Pill tone="success">{openLabel}</Pill>}
        {seekingTags.map(s => <Pill key={s} tone="navy">{s}</Pill>)}
      </div>
      {p.seeking && <p style={{ fontSize: 13.5, color: '#33363c', lineHeight: 1.55, margin: '11px 0 0' }}>{p.seeking}</p>}
    </div>
  ) : null;
  return (
    <Card pad={0}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 0' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, color: 'var(--ink)' }}>In the network</h2>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#5b3b82' }}><Icon name="globe" size={13} /> Visible to recruiters</span>
      </div>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', padding: '16px 24px 22px' }}>
        {undergrad ? <>{SeekBlock}{OfferBlock}</> : <>{OfferBlock}{SeekBlock}</>}
      </div>
    </Card>
  );
}

function BondProfileBtn({ person, sameChapter, bond, meId }) {
  const me = meId || (window.GB.ME && (window.GB.ME.alumni || window.GB.ME.undergrad || window.GB.ME.admin));
  const { state } = window.bondState ? window.bondState(me, person.id) : { state: person.bonded ? 'bonded' : 'none' };
  const cfg = (window.BOND_BTN_CFG && window.BOND_BTN_CFG[state]) || { variant: 'primary', icon: 'bond', label: 'Bond' };
  // Keep the warmer same-chapter call-to-action, but only for the not-yet-bonded state.
  const label = state === 'none' && sameChapter ? `Bond with your ${CH(person.chapter).noun}` : cfg.label;
  const variant = state === 'none' ? 'primary' : cfg.variant;
  return <Btn variant={variant} icon={cfg.icon} onClick={() => bond && bond(person)}>{label}</Btn>;
}

/* ───────────────── Recruiter-restricted render (privacy tier) ───────────────── */
function RecruiterProfile({ p, ch, go, onAsk }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 72px', '--chapter': ch.color, '--chapter-ink': ch.ink }}>
      <button onClick={() => go('talent')} style={{ background: 'none', border: 'none', color: 'var(--navy)', fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, cursor: 'pointer' }}>
        <Icon name="arrowL" size={16} /> Back to Search Talent</button>

      <Card pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '24px 26px', display: 'flex', gap: 18, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <Avatar personId={p.id} size={84} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 600 }}>{p.name}</h1>
              {p.verified && <Pill tone="gold" icon="seal">Verified {ch.noun}</Pill>}
              {p.open && <Pill tone="success">{p.open === 'hiring' ? 'Hiring' : 'Open to work'}</Pill>}
            </div>
            <div style={{ fontSize: 15, color: 'var(--ink)', marginTop: 4 }}>{p.headline}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', marginTop: 6 }}>
              <Icon name="pin" size={14} />{p.location} · <Crest chapterId={p.chapter} size={16} ring={false} /> {ch.letters} · {p.industry}</div>
          </div>
        </div>

        {/* restriction notice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 26px', background: '#f6f3ee', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--ink-2)' }}><Icon name="lock" size={17} /></span>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>You’re viewing a <strong style={{ color: 'var(--ink)' }}>restricted profile</strong>. Lineage, bonds, and social details are visible only to bonded members. Request an intro through the chapter to reach {p.name.split(' ')[0]}.</div>
        </div>

        {/* vouch count, a trust signal recruiters can SEE but not give or read (verb law) */}
        {vouchesFor(p.id).length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 26px', background: 'var(--gold-soft)', borderBottom: '1px solid var(--gold-line)' }}>
            <span style={{ width: 32, height: 32, borderRadius: 999, flex: 'none', background: 'var(--gold)', color: '#3a2c08', display: 'grid', placeItems: 'center' }}><Icon name="bond" size={18} stroke={2.3} /></span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#7a5e12' }}>{vouchesFor(p.id).length} {ch.plural} have vouched for {p.name.split(' ')[0]}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>Written endorsements from people who know {p.name.split(' ')[0]}, readable by bonded members only.</div>
            </div>
          </div>
        )}

        <div style={{ padding: '22px 26px' }}>
          <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Detail label="Current role" value={`${p.title}, ${p.company}`} />
            <Detail label="Field" value={p.industry} />
            <Detail label="Education" value={p.school} />
            <Detail label="Open to" value={p.open === 'work' ? 'New roles' : p.open === 'hiring' ? 'Hiring / networking' : 'Not specified'} />
          </div>
          {((p.offers && p.offers.length) || (p.seekingTags && p.seekingTags.length)) && (
            <div className="gb-stack-mobile" style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {p.offers && p.offers.length > 0 && <div><Lbl>Can offer</Lbl><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>{p.offers.map(o => <Pill key={o} tone="gold">{o}</Pill>)}</div></div>}
              {p.seekingTags && p.seekingTags.length > 0 && <div><Lbl>Seeking</Lbl><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>{p.seekingTags.map(s => <Pill key={s} tone="navy">{s}</Pill>)}</div></div>}
            </div>
          )}
          <div style={{ marginTop: 20 }}>
            <Lbl>Skills</Lbl>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{p.skills.map(s => <Pill key={s} tone="navy">{s}</Pill>)}</div>
          </div>
        </div>
        <div style={{ padding: '0 26px 24px', display: 'flex', gap: 10 }}>
          <Btn variant="primary" icon="intro" onClick={() => onAsk ? onAsk(p, 'intro') : go('messages')}>Request intro via {ch.letters}</Btn>
          <Btn variant="ghost" icon="briefcase" onClick={() => go('candidates')}>Save to pipeline</Btn>
        </div>
      </Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 16, fontSize: 12.5, color: 'var(--ink-2)' }}>
        <Icon name="shield" size={15} /> Intros are brokered through the chapter admin, never sent directly.</div>
    </div>
  );
}

Object.assign(window, { Profile });
