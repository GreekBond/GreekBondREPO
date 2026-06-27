// ChapterPage.jsx: the house. Chapter-color theming live; member vs admin (manage) fork.
import React from 'react';
import { ManageEventsList, ManageFundraisersList } from '../components/ChapterAdminTools.jsx';
const { useState: useStateCh } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf, ChapterTimeline, BondBtn } = window;

function ChapterPage({ id = 'tds', role, meId, go, bond }) {
  // No real chapter loaded for this id (empty DB / not yet onboarded a house).
  if (!window.GB.CHAPTERS[id]) {
    return (
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '64px 16px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 600, margin: 0 }}>No chapter to show yet</h1>
        <p style={{ fontSize: 14.5, color: 'var(--ink-2)', marginTop: 10 }}>Chapters appear here once they join GreekBond.</p>
      </div>
    );
  }
  const c = CH(id);
  const d = window.GB.CHAPTER_DETAIL;
  const [tab, setTab] = useStateCh('Home');
  const [manage, setManage] = useStateCh(role === 'admin');
  const [following, setFollowing] = useStateCh(false);
  const me = meId ? P(meId) : null;
  const isMember = me && me.chapter === id;
  const tabs = ['Home', 'About', 'Members', 'Events', 'Give'];
  const canManage = role === 'admin'; // only admin of this house can flip to manage

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px', '--chapter': c.color, '--chapter-ink': c.ink }}>
      {/* Banner, chapter colors + crest watermark + motto */}
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ height: 180, background: `linear-gradient(120deg, var(--chapter) 0%, ${tint(c.color, .14)} 52%, var(--navy) 124%)`, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: .16, background: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,.6) 15px, rgba(255,255,255,.6) 16px)' }} />
          <div style={{ position: 'absolute', right: 24, bottom: -26, opacity: .22 }}><Crest chapterId={id} size={186} ring={false} /></div>
          {canManage && (
            <div style={{ position: 'absolute', right: 20, top: 16, display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(17,27,61,.5)', backdropFilter: 'blur(4px)', padding: '6px 12px 6px 13px', borderRadius: 999 }}>
              <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 12.5, fontWeight: 600 }}>Manage mode</span>
              <Toggle on={manage} set={setManage} gold />
            </div>
          )}
        </div>
        <div style={{ padding: '0 28px 22px', display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ marginTop: -58, border: '5px solid var(--surface)', borderRadius: '50%', background: 'var(--surface)' }}>
            <Crest chapterId={id} size={120} ring={false} seal />
          </div>
          <div style={{ flex: '1 1 360px', minWidth: 0, paddingBottom: 4 }}>
            <h1 style={{ margin: '14px 0 0', fontFamily: 'var(--font-display)', fontSize: 29, fontWeight: 600, color: 'var(--chapter-ink)', letterSpacing: '-.01em', lineHeight: 1.16 }}>
              {c.name}<span style={{ fontSize: 23, color: 'var(--chapter)', fontWeight: 600, marginLeft: 12 }}>{c.letters}</span></h1>
            <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 7 }}>{c.kind} · {c.council} · {c.school} · Founded {c.founded}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--chapter)', fontSize: 16, marginTop: 7 }}>{c.motto}</div>
            <div style={{ display: 'flex', gap: 26, marginTop: 14 }}>
              <Stat n={c.members} label="Active members" />
              <Stat n={c.alumni.toLocaleString()} label="Alumni" />
              <Stat n={c.gpa} label="Chapter GPA" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>
            {manage ? <Btn variant="chapter" icon="edit" onClick={() => window.__notify && window.__notify('Posting as the chapter isn’t available in this preview')}>Post as chapter</Btn>
              : isMember ? <Pill tone="chapter" icon="seal" style={{ padding: '9px 16px', fontSize: 13.5 }}>You’re a {c.noun}</Pill>
              : <Btn variant={following ? 'subtle' : 'chapter'} icon={following ? 'check' : 'plus'} onClick={() => setFollowing(v => !v)}>{following ? 'Following' : 'Follow'}</Btn>}
            <Btn variant="outline" icon="message" onClick={() => go('messages')}>Message</Btn>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', display: 'flex', padding: '0 20px', gap: 4, overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ position: 'relative', background: 'none', border: 'none', padding: '14px 16px',
              fontSize: 14.5, fontWeight: 600, color: tab === t ? 'var(--chapter-ink)' : 'var(--ink-2)', whiteSpace: 'nowrap' }}>
              {t}
              <span style={{ position: 'absolute', bottom: -1, left: 12, right: 12, height: 3, borderRadius: 3, background: 'var(--chapter)', opacity: tab === t ? 1 : 0 }} />
            </button>
          ))}
        </div>
      </Card>

      {manage && (
        <div style={{ margin: '16px 0', padding: '13px 18px', background: 'var(--navy)', color: '#fff', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13.5, flexWrap: 'wrap' }}>
          <Icon name="shield" size={18} /> <strong>Manage mode</strong>, edit content, verify your roster, and view engagement.
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 18, fontWeight: 600 }}>
            <span style={{ color: 'var(--gold)' }}>{d.analytics.views.toLocaleString()} views ▲{d.analytics.viewsDelta}%</span>
            <span>{d.analytics.verifyPending} pending verifications</span></span>
        </div>
      )}

      <div className="gb-shell-stack" style={{ marginTop: 16, display: 'grid', gridTemplateColumns: tab === 'Give' ? '1fr' : 'minmax(0,1fr) 320px', gap: 24, alignItems: 'start' }}>
        {tab === 'Home' && <ChapterHome d={d} c={c} manage={manage} go={go} />}
        {tab === 'About' && <ChapterAbout d={d} c={c} go={go} manage={manage} />}
        {tab === 'Members' && <ChapterMembers c={c} go={go} bond={bond} meId={meId} manage={manage} />}
        {tab === 'Events' && <ChapterEvents d={d} c={c} manage={manage} chapterId={id} meId={meId} />}
        {tab === 'Give' && <ChapterGive d={d} c={c} manage={manage} chapterId={id} meId={meId} />}
      </div>
    </div>
  );
}

function ChapterPost({ c, post, manage }) {
  return (
    <Card pad={0}>
      <div style={{ padding: '16px 20px 0', display: 'flex', gap: 12, alignItems: 'center' }}>
        <Crest chapterId={c.id} size={48} seal />
        <div><div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{(c.members + c.alumni).toLocaleString()} followers · {post.time}</div></div>
        {manage && <Pill tone="navy" style={{ marginLeft: 'auto' }}>Posted as chapter</Pill>}
      </div>
      <p style={{ padding: '0 20px', margin: '12px 0 0', fontSize: 14.5, lineHeight: 1.6, color: '#272a31', textWrap: 'pretty' }}>{post.text}</p>
      {post.image && <div style={{ padding: '12px 20px 0' }}><ImgPlaceholder label={post.image} h={220} watermark={c.id} /></div>}
      <div style={{ padding: '12px 20px', fontSize: 12.5, color: 'var(--ink-2)' }}>{post.likes} reactions · {post.comments} comments</div>
      <div style={{ borderTop: '1px solid var(--border)', display: 'flex', padding: '4px 8px' }}>
        {[['like', 'Like'], ['comment', 'Comment'], ['share', 'Share']].map(([ic, lb]) => (
          <button key={lb} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'none', border: 'none', padding: '10px', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', borderRadius: 'var(--radius-sm)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1efe9'} onMouseLeave={e => e.currentTarget.style.background = 'none'}><Icon name={ic} size={18} />{lb}</button>
        ))}
      </div>
    </Card>
  );
}

function ChapterHome({ d, c, manage, go }) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {manage && <PostAsChapter c={c} />}
        {manage && <VerifyQueueCard d={d} compact go={go} />}
        {d.posts.map((post, i) => <ChapterPost key={i} c={c} post={post} manage={manage} />)}
      </div>
      <div style={{ position: 'sticky', top: 86, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <GiveMini d={d} c={c} />
        <Card pad={0}>
          <div style={{ padding: '14px 16px 8px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Upcoming events</div>
          {d.events.slice(0, 2).map(e => <EventRow key={e.id} e={e} compact />)}
        </Card>
      </div>
    </>
  );
}

function PostAsChapter({ c }) {
  return (
    <Card>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Crest chapterId={c.id} size={46} seal />
        <button onClick={() => window.__notify && window.__notify('Posting as the chapter isn’t available in this preview')} style={{ flex: 1, textAlign: 'left', height: 46, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink-2)', padding: '0 20px', fontSize: 14.5, fontWeight: 500 }}>
          Post an announcement as {c.letters}…</button>
        <Btn variant="chapter" icon="send" onClick={() => window.__notify && window.__notify('Posting as the chapter isn’t available in this preview')}>Post</Btn>
      </div>
    </Card>
  );
}

function ChapterAbout({ d, c, go, manage }) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ChapterTimeline c={c} manage={manage} go={go} />
        <SectionCard title="Current leadership">
          <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {d.officers.map((o, i) => {
              const nm = o.person ? P(o.person).name : o.name;
              return (
                <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                  <Avatar personId={o.person} name={nm} chapterId={c.id} size={46} onClick={o.person ? () => go('profile', { id: o.person }) : undefined} />
                  <div><div style={{ fontWeight: 700, fontSize: 14 }}>{nm}</div><div style={{ fontSize: 12.5, color: 'var(--chapter)', fontWeight: 600 }}>{o.role}</div></div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
      <div style={{ position: 'sticky', top: 86 }}><GiveMini d={d} c={c} /></div>
    </>
  );
}

function ChapterMembers({ c, go, bond, meId, manage }) {
  const ids = Object.keys(window.GB.PEOPLE).filter(k => P(k).chapter === c.id);
  const [seg, setSeg] = useStateCh('All');
  const filtered = ids.filter(id => seg === 'All' || (seg === 'Actives' ? P(id).role === 'undergrad' : P(id).role === 'alumni'));
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Seg value={seg} set={setSeg} options={['All', 'Actives', 'Alumni']} />
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{c.members} actives · {c.alumni.toLocaleString()} alumni</span>
          </div>
        </Card>
        <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {filtered.map(id => <MemberCard key={id} id={id} go={go} bond={bond} meId={meId} manage={manage} />)}
        </div>
        {filtered.length === 0 && <Card style={{ textAlign: 'center', color: 'var(--ink-2)', padding: 36, fontSize: 14, lineHeight: 1.6 }}>No members yet. Invite your brothers and sisters to join, and they’ll appear here.</Card>}
      </div>
      <div style={{ position: 'sticky', top: 86 }}>{manage ? <VerifyQueueCard d={window.GB.CHAPTER_DETAIL} go={go} /> : <GiveMini d={window.GB.CHAPTER_DETAIL} c={c} />}</div>
    </>
  );
}

function MemberCard({ id, go, bond, meId, manage }) {
  const p = P(id);
  const isMe = id === meId;
  return (
    <Card hover style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer' }} onClick={() => go('profile', { id })}><Avatar personId={id} size={62} /></div>
      <button onClick={() => go('profile', { id })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, fontSize: 15, marginTop: 10, color: 'var(--ink)' }}>{p.name}</button>
      <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2, lineHeight: 1.4, height: 34, overflow: 'hidden' }}>{p.headline}</div>
      <div style={{ marginTop: 9, display: 'flex', justifyContent: 'center', gap: 6 }}>
        <Pill tone={p.role === 'undergrad' ? 'chapter' : 'gray'}>{p.role === 'undergrad' ? `Active · ’${String(p.classYear).slice(2)}` : `Alum · ’${String(p.classYear).slice(2)}`}</Pill>
        {p.verified && <Pill tone="gold" icon="seal">Verified</Pill>}
      </div>
      {!isMe && <div style={{ marginTop: 12 }}>{manage ? <Btn variant="ghost" size="sm" full icon="edit">Manage</Btn> : <BondBtn person={p} bond={bond} full />}</div>}
      {isMe && <div style={{ marginTop: 12 }}><Pill tone="navy">This is you</Pill></div>}
    </Card>
  );
}

function ChapterEvents({ d, c, manage, chapterId, meId }) {
  const [tick, setTick] = useStateCh(0);
  const events = d.events || [];

  if (manage) {
    return (
      <div className="gb-shell-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 24, alignItems: 'start' }}>
        <ManageEventsList chapterId={chapterId} meId={meId} events={events} onChange={() => setTick(n => n + 1)} />
        <div style={{ position: 'sticky', top: 86 }}><GiveMini d={d} c={c} /></div>
        <span style={{ display: 'none' }}>{tick}</span>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card pad={0}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>Upcoming events</span>
          </div>
          {events.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>No upcoming events.</div>
          ) : events.map(e => <EventRow key={e.id || e.title} e={e} />)}
        </Card>
      </div>
      <div style={{ position: 'sticky', top: 86 }}><GiveMini d={d} c={c} /></div>
    </>
  );
}

function EventRow({ e, compact, manage, onEdit }) {
  const [m, day] = (e.date || ' ').split(' ');
  return (
    <div style={{ display: 'flex', gap: 14, padding: compact ? '11px 16px' : '16px 20px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
      <div style={{ width: 52, flex: 'none', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        <div style={{ background: 'var(--chapter)', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '2px 0', letterSpacing: '.08em' }}>{m || 'TBD'}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--chapter-ink)', padding: '2px 0' }}>{day || '·'}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: compact ? 13.5 : 15 }}>{e.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{e.when}{e.where ? ` · ${e.where}` : ''}</div>
      </div>
      {!compact && <RsvpBtn manage={manage} onEdit={onEdit} event={e} />}
    </div>
  );
}

function openGiveUrl(url) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
  else window.__notify && window.__notify('No donate link set for this campaign.');
}

/* Giving, DISPLAY / LINK-OUT ONLY. No money moves through GreekBond. */
function ChapterGive({ d, c, manage, chapterId, meId }) {
  const g = d.give;
  const hasCampaign = g && g.id && (g.title || g.campaign);
  const title = (g && (g.title || g.campaign)) || '';
  const goal = g && (g.goalAmount ?? g.goal);
  const url = g && g.externalUrl;

  if (manage) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
        <ManageFundraisersList chapterId={chapterId} meId={meId} />
        {hasCampaign && (
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px', background: 'linear-gradient(150deg, #141F47, var(--navy-700))', color: '#fff' }}>
              <Pill tone="gold">Active preview</Pill>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '12px 0 6px' }}>{title}</h2>
              {g.description && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,.82)', maxWidth: 520 }}>{g.description}</p>}
              {goal > 0 && <div style={{ marginTop: 14, fontSize: 14, color: 'rgba(255,255,255,.75)' }}>Goal: ${Number(goal).toLocaleString()} (display only)</div>}
            </div>
          </Card>
        )}
      </div>
    );
  }

  if (!hasCampaign) {
    return (
      <Card style={{ textAlign: 'center', padding: 48, color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6 }}>
        No active giving campaign right now. Check back soon.
      </Card>
    );
  }

  return (
    <div className="gb-shell-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24, alignItems: 'start', maxWidth: 900 }}>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '28px 28px 24px', background: 'linear-gradient(150deg, #141F47, var(--navy-700))', color: '#fff', position: 'relative' }}>
          <div style={{ position: 'absolute', right: -10, bottom: -16, opacity: .16 }}><Crest chapterId={c.id} size={150} ring={false} /></div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 600, margin: '0 0 8px' }}>{title}</h2>
          {g.description && (
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.8)', maxWidth: 520 }}>{g.description}</p>
          )}
          {goal > 0 && (
            <div style={{ marginTop: 18, fontSize: 15, fontWeight: 600, color: '#D1AB33' }}>
              Goal: ${Number(goal).toLocaleString()}
            </div>
          )}
        </div>
      </Card>
      <Card style={{ position: 'sticky', top: 86 }}>
        <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600 }}>Support your chapter</h3>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          Giving is handled on your chapter's official site. GreekBond just shines a light on the campaign.</p>
        <Btn variant="gold" full size="lg" iconR="globe" onClick={() => openGiveUrl(url)}>Give</Btn>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, fontSize: 12, color: 'var(--ink-2)' }}>
          <Icon name="globe" size={14} /> Opens in a new tab · No money moves through GreekBond</div>
      </Card>
    </div>
  );
}

function GiveMini({ d, c }) {
  const g = d.give;
  const hasCampaign = g && g.id && (g.title || g.campaign);
  if (!hasCampaign) return null;
  const title = g.title || g.campaign;
  const goal = g.goalAmount ?? g.goal;
  const url = g.externalUrl;
  return (
    <Card style={{ borderColor: 'var(--gold-line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: 'var(--gold-deep)' }}><Icon name="seal" size={17} fill="var(--gold)" stroke={0} /></span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15.5, color: 'var(--navy)' }}>{title}</span>
      </div>
      {goal > 0 && <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 10 }}>Goal: ${Number(goal).toLocaleString()}</div>}
      <Btn variant="gold" full size="sm" iconR="globe" onClick={() => openGiveUrl(url)}>Give</Btn>
    </Card>
  );
}

/* admin: verification queue, the data-value engine */
function VerifyQueueCard({ d, go, compact }) {
  return (
    <Card pad={0} style={{ borderColor: 'var(--navy-100)' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--navy)' }}><Icon name="shield" size={18} /></span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Verification queue</span>
        <Pill tone="gold" style={{ marginLeft: 'auto' }}>{d.verifyQueue.length}</Pill>
      </div>
      {d.verifyQueue.slice(0, compact ? 2 : 3).map((v, i) => (
        <VerifyRow key={i} v={v} go={go} />
      ))}
      <div style={{ padding: '6px 12px 12px' }}><Btn variant="ghost" size="sm" full onClick={() => go ? go('roster') : (window.__notify && window.__notify('Opening verification queue'))}>Review all</Btn></div>
    </Card>
  );
}
function VerifyRow({ v, go }) {
  const [done, setDone] = useStateCh(null);
  const p = v.who ? P(v.who) : null;
  return (
    <div style={{ padding: '11px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
      <Avatar personId={v.who} name={v.name || (p && p.name)} chapterId="tds" size={40} showCrest={!v.noProfile} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{v.name || (p && p.name)}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 8 }}>{v.claim} · {v.time}</div>
        {done === null ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="primary" size="sm" icon="check" onClick={() => setDone('ok')}>Verify</Btn>
            <button onClick={() => setDone('no')} style={{ border: '1px solid var(--border)', background: 'none', borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>Decline</button>
          </div>
        ) : <Pill tone={done === 'ok' ? 'success' : 'gray'} icon={done === 'ok' ? 'seal' : undefined}>{done === 'ok' ? 'Verified' : 'Declined'}</Pill>}
      </div>
    </div>
  );
}

function RsvpBtn({ manage, onEdit, event }) {
  if (manage) return <Btn variant="ghost" size="sm" icon="edit" onClick={() => onEdit && onEdit(event)}>Edit</Btn>;
  return (
    <button type="button" disabled title="Coming soon"
      style={{ border: '1px solid var(--border)', borderRadius: 999, padding: '7px 16px', fontSize: 12.5,
        fontWeight: 700, color: 'var(--ink-3)', background: 'var(--surface)', cursor: 'not-allowed', opacity: .65 }}>
      Interested
    </button>
  );
}

function Stat({ n, label }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--chapter-ink)', lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>{label}</div>
    </div>
  );
}
function Seg({ value, set, options }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: '#efece5', padding: 4, borderRadius: 999 }}>
      {options.map(s => (
        <button key={s} onClick={() => set(s)} style={{ border: 'none', borderRadius: 999, padding: '7px 16px', fontSize: 13.5, fontWeight: 600,
          background: value === s ? 'var(--surface)' : 'transparent', color: value === s ? 'var(--navy)' : 'var(--ink-2)', boxShadow: value === s ? 'var(--shadow-sm)' : 'none' }}>{s}</button>
      ))}
    </div>
  );
}

Object.assign(window, { ChapterPage, GiveMini, VerifyQueueCard, EventRow, Stat, Seg, PostAsChapter, ChapterPost });
