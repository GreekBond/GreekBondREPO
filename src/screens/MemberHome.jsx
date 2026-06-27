// MemberHome.jsx: alumni & undergrad home feed. Same screen, emphasis varies by role.
import React from 'react';
import { likePost, unlikePost, createComment, listComments } from '../lib/db.js';
import { Composer } from '../components/PostComposer.jsx';
const { useState: useStateHome, useEffect: useEffectHome } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf } = window;
const { AnimateIn } = window;

/* shared three-column layout */
function ThreeCol({ left, center, right }) {
  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px',
      display: 'grid', gridTemplateColumns: '248px minmax(0,1fr) 320px', gap: 24, alignItems: 'start' }}>
      <div style={{ position: 'sticky', top: 86, display: 'flex', flexDirection: 'column', gap: 16 }}>{left}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{center}</div>
      <div style={{ position: 'sticky', top: 86, display: 'flex', flexDirection: 'column', gap: 16 }}>{right}</div>
    </div>
  );
}

function IdentityCard({ meId, go }) {
  const me = P(meId);
  const ch = CH(me.chapter);
  return (
    <Card pad={0} style={{ overflow: 'hidden', '--chapter': ch.color, '--chapter-ink': ch.ink }}>
      <div style={{ height: 66, background: `linear-gradient(115deg, var(--navy), var(--navy-700) 60%, var(--chapter))`, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .2, background: 'repeating-linear-gradient(45deg, transparent, transparent 9px, rgba(255,255,255,.5) 9px, rgba(255,255,255,.5) 10px)' }} />
      </div>
      <div style={{ padding: '0 16px 16px', marginTop: -34, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><Avatar personId={meId} size={72} /></div>
        <button onClick={() => go('profile', { id: meId })} style={{ background: 'none', border: 'none', padding: 0, marginTop: 9 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, color: 'var(--ink)' }}>{me.name}</div>
        </button>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 3, lineHeight: 1.4 }}>{me.headline}</div>
        <button onClick={() => go('chapter', { id: me.chapter })} style={{ width: '100%', marginTop: 12, background: 'var(--gold-soft)', border: '1px solid var(--gold-line)',
          borderRadius: 'var(--radius-sm)', padding: '9px 10px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
          <Crest chapterId={me.chapter} size={30} />
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600, color: 'var(--chapter-ink)', lineHeight: 1.15 }}>{ch.name}</div>
            <div style={{ fontSize: 11, color: '#8a6d1e', fontWeight: 600 }}>{me.role === 'undergrad' ? `Active · Class of ’${String(me.classYear).slice(2)}` : `Alumnus · ’${String(me.classYear).slice(2)}`}</div>
          </div>
        </button>
      </div>
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {[
          ['network', 'My Bonds', window.GB.BOND_COUNT ? String(window.GB.BOND_COUNT) : null, { tab: 'bonds' }],
          ['saved-jobs', 'Saved Jobs', (window.GB.SAVED_JOB_IDS && window.GB.SAVED_JOB_IDS.length) ? String(window.GB.SAVED_JOB_IDS.length) : null, undefined],
          ['chapter', 'My Chapter', null, { id: me.chapter }],
          ['chapters', 'Chapters', null, undefined],
        ].map(([dest, label, n, prm], i) => (
          <button key={label} onClick={() => go(dest, prm)}
            style={{ width: '100%', background: 'none', border: 'none', padding: '11px 16px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', fontSize: 13.5, fontWeight: 600, color: 'var(--navy)', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#faf8f2'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <span>{label}</span>{n && <span style={{ color: 'var(--gold-deep)', fontWeight: 700 }}>{n}</span>}
          </button>
        ))}
      </div>
    </Card>
  );
}


/* warm-intro nudge, the undergrad hook (also useful to alumni as "offer intros") */
function IntroNudge({ role, meId, go }) {
  const ug = role === 'undergrad';
  const ids = ['marcus', 'nathan', 'caleb'].filter(i => i !== meId && P(i));
  if (ids.length === 0) return null;
  return (
    <Card style={{ background: 'linear-gradient(160deg, #fffdf6, #f6edd6)', borderColor: 'var(--gold-line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--gold)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="intro" size={17} /></span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--navy)' }}>
          {ug ? '3 brothers at companies you’d love' : 'Open a door for an active'}</span>
      </div>
      <div style={{ fontSize: 13, color: '#6b5a2e', lineHeight: 1.5, marginBottom: 12 }}>
        {ug ? 'Alumni in product, finance, and recruiting are open to a warm intro. Want one?' : 'Three actives in your chapter are seeking roles in your field. A warm intro from you changes everything.'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 13 }}>
        {ids.map((id, i) => <div key={id} style={{ marginLeft: i ? -10 : 0, border: '2px solid #fffdf6', borderRadius: '50%' }}><Avatar personId={id} size={34} showCrest={false} /></div>)}
        <span style={{ fontSize: 12.5, color: '#7a5e12', fontWeight: 600, marginLeft: 4 }}>{ug ? 'Marcus, Nathan +1' : 'Devin, Eli +1'}</span>
      </div>
      <Btn variant="gold" size="sm" full icon="intro" onClick={() => go('network')}>{ug ? 'Request a warm intro' : 'Offer an intro'}</Btn>
    </Card>
  );
}

/* upgrade nudge, routes to the alumni pricing page (undergrads see free reassurance) */
function PlusNudge({ role, go }) {
  if (role === 'undergrad') {
    return (
      <Card style={{ background: 'linear-gradient(160deg, #fffdf6, var(--gold-soft))', borderColor: 'var(--gold-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--gold)', color: '#3a2c08', display: 'grid', placeItems: 'center' }}><Icon name="star" size={17} /></span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16.5, color: 'var(--navy)' }}>Free while you’re enrolled</span>
        </div>
        <div style={{ fontSize: 13, color: '#6b5a2e', lineHeight: 1.5, marginBottom: 12 }}>
          Every premium feature is already yours as an active: messaging, warm intros, mentorship, the alumni map. No paywall, ever, while you’re in school.</div>
        <Btn variant="outline" size="sm" full iconR="chevR" onClick={() => go('pricing')}>See what alumni get</Btn>
      </Card>
    );
  }
  return (
    <Card style={{ background: 'linear-gradient(160deg, #fffdf6, var(--gold-soft))', borderColor: 'var(--gold-line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--gold)', color: '#3a2c08', display: 'grid', placeItems: 'center' }}><Icon name="seal" size={17} fill="#3a2c08" stroke={0} /></span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16.5, color: 'var(--navy)' }}>Try Bond Pro</span>
      </div>
      <div style={{ fontSize: 13, color: '#6b5a2e', lineHeight: 1.5, marginBottom: 12 }}>
        See who viewed you, send priority intro requests, and control your recruiter visibility. Put the network to work.</div>
      <Btn variant="gold" size="sm" full onClick={() => go('pricing')}>See plans, from $10/mo</Btn>
    </Card>
  );
}

function PostCard({ post, meId, go, mobile }) {
  // mobile: harden long unbroken tokens (URLs, titles) against horizontal
  // overflow at 375px. Undefined on desktop → spread is null → desktop unchanged.
  const wrap = mobile ? { overflowWrap: 'anywhere', wordBreak: 'break-word' } : null;
  const a = P(post.author);
  const [liked, setLiked] = useStateHome(false);
  const [likes, setLikes] = useStateHome(post.likes);
  const [showComments, setShowComments] = useStateHome(false);
  const [comments, setComments] = useStateHome(null); // null = not loaded yet
  const [cCount, setCCount] = useStateHome(post.comments || 0);
  const [draft, setDraft] = useStateHome('');
  const [sending, setSending] = useStateHome(false);
  if (!a) return null;
  const ch = CH(a.chapter);
  const toggle = () => {
    setLiked(l => {
      const next = !l;
      setLikes(n => next ? n + 1 : Math.max(0, n - 1));
      (next ? likePost(post.id) : unlikePost(post.id)).catch(e => console.error('[like] failed:', e));
      return next;
    });
  };
  const openComments = () => {
    setShowComments(s => {
      const next = !s;
      if (next && comments === null) {
        listComments(post.id).then(setComments).catch(e => { console.error('[comments] load failed:', e); setComments([]); });
      }
      return next;
    });
  };
  const submitComment = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const c = await createComment(post.id, meId, body);
      setComments(list => [...(list || []), c]);
      setCCount(n => n + 1);
      post.comments = (post.comments || 0) + 1;
      setDraft('');
    } catch (e) {
      console.error('[comments] post failed:', e);
      window.__notify && window.__notify('Couldn’t add comment, try again.');
    } finally {
      setSending(false);
    }
  };
  const share = () => window.__notify && window.__notify('Copied link to post.');
  const fromChapter = post.sourceType === 'follow';
  const isSeeking = post.kind === 'seeking' || post.kind === 'looking';
  const isEventShare = post.kind === 'event_share' || (post.kind === 'event' && post.eventShare);
  const seeking = post.seeking || {};
  const ev = post.eventShare || {};
  const typePill = {
    post: null, update: null,
    seeking: ['gold', 'Looking for work'], looking: ['gold', 'Looking for work'],
    event_share: ['chapter', 'Event'], event: ['chapter', 'Event'],
    milestone: ['gold', 'Milestone'], job: ['navy', 'Hiring'], chapter: ['chapter', 'Chapter'],
  }[post.kind];

  const workTypeLabel = (wt) => {
    if (!wt) return null;
    return wt.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
  };

  const eventDate = ev.startAt ? new Date(ev.startAt) : null;
  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999, padding: '5px 11px',
    fontSize: 12, fontWeight: 700, background: 'var(--navy-50)', color: 'var(--navy)', border: '1px solid var(--navy-100)',
  };

  return (
    <Card pad={0} style={{ '--chapter': ch.color, '--chapter-ink': ch.ink, overflow: 'hidden',
      borderColor: isSeeking ? 'var(--gold-line)' : fromChapter ? 'var(--navy-100)' : 'var(--border)' }}>
      {/* source ribbon, bonded vs followed-chapter read differently */}
      <div style={{ padding: '8px 20px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7,
        background: fromChapter ? 'var(--navy-50)' : 'var(--gold-soft)', color: fromChapter ? 'var(--navy-600)' : '#7a5e12',
        borderBottom: `1px solid ${fromChapter ? 'var(--navy-100)' : 'var(--gold-line)'}` }}>
        <Icon name={fromChapter ? 'building' : 'bond'} size={14} stroke={2.2} />
        {fromChapter ? `From a chapter you follow · ${ch.letters}`
          : a.chapter === (P(meId) && P(meId).chapter) ? `Your ${ch.noun} · ${ch.letters}` : `Bonded through ${ch.letters}`}
      </div>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Avatar personId={post.author} size={50} onClick={() => go('profile', { id: a.id })} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => go('profile', { id: a.id })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, fontSize: 15.5, color: 'var(--ink)' }}>{a.name}</button>
              {a.verified && <span style={{ color: 'var(--gold)' }} title="Verified by chapter"><Icon name="seal" size={15} fill="var(--gold)" stroke={0} /></span>}
              {typePill && <Pill tone={typePill[0]}>{typePill[1]}</Pill>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 1 }}>{a.headline}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{post.time}</div>
          </div>
        </div>

        {isSeeking && (
          <div style={{ marginTop: 13, padding: '14px 16px', borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #fffdf6, var(--gold-soft))', borderLeft: '3px solid var(--gold)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: seeking.note || post.text ? 10 : 0 }}>
              {seeking.role && <span style={chipStyle}><Icon name="briefcase" size={13} />{seeking.role}</span>}
              {seeking.industry && <span style={chipStyle}><Icon name="building" size={13} />{seeking.industry}</span>}
              {seeking.location && <span style={chipStyle}><Icon name="pin" size={13} />{seeking.location}</span>}
              {seeking.workType && <span style={{ ...chipStyle, background: 'var(--gold-soft)', borderColor: 'var(--gold-line)', color: '#7a5e12' }}>{workTypeLabel(seeking.workType)}</span>}
            </div>
            {(seeking.note || post.text) && (
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.62, color: '#272a31', textWrap: 'pretty', ...wrap }}>
                {seeking.note || post.text}
              </p>
            )}
          </div>
        )}

        {isEventShare && (
          <div style={{ marginTop: 13, display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--navy-50)', border: '1px solid var(--navy-100)' }}>
            {eventDate && (
              <div style={{ flexShrink: 0, width: 56, textAlign: 'center', background: 'var(--navy)', color: '#fff',
                borderRadius: 10, padding: '8px 6px', lineHeight: 1.15 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', opacity: .85 }}>
                  {eventDate.toLocaleString('en-US', { month: 'short' })}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{eventDate.getDate()}</div>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16.5, color: 'var(--navy)', marginBottom: 4, ...wrap }}>
                {ev.title || post.text}
              </div>
              {ev.location && (
                <div style={{ fontSize: 13, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <Icon name="pin" size={14} />{ev.location}
                </div>
              )}
              {ev.description && (
                <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.55, color: '#33363c' }}>{ev.description}</p>
              )}
              <button type="button" disabled title="Coming soon"
                style={{ border: '1px solid var(--border)', borderRadius: 999, padding: '7px 16px', fontSize: 12.5,
                  fontWeight: 700, color: 'var(--ink-3)', background: 'var(--surface)', cursor: 'not-allowed', opacity: .65 }}>
                Interested
              </button>
            </div>
          </div>
        )}

        {!isSeeking && !isEventShare && (
          <>
            <p style={{ margin: '13px 0 0', fontSize: 14.5, lineHeight: 1.62, color: '#272a31', textWrap: 'pretty', ...wrap }}>{post.text}</p>
            {post.tags && post.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {post.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', background: 'var(--navy-50)',
                    borderRadius: 999, padding: '4px 10px' }}>#{String(tag).replace(/\s/g, '')}</span>
                ))}
              </div>
            )}
            {post.linkUrl && (
              <a href={post.linkUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: 10, fontSize: 13, fontWeight: 600, color: 'var(--navy)', ...(mobile ? { maxWidth: '100%' } : null), ...wrap }}>
                {post.linkUrl}
              </a>
            )}
          </>
        )}
      </div>
      {post.image && <div style={{ padding: '14px 20px 0' }}><ImgPlaceholder label={post.image} h={224} watermark={a.chapter} /></div>}
      <div style={{ padding: '12px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: 'var(--ink-2)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ background: 'var(--gold)', color: '#fff', width: 17, height: 17, borderRadius: 999, display: 'grid', placeItems: 'center' }}><Icon name="like" size={10} fill="#fff" stroke={0} /></span>{likes}</span>
        <button onClick={openComments} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--ink-2)', cursor: 'pointer' }}>{cCount} comments</button>
      </div>
      <div style={{ borderTop: '1px solid var(--border)', display: 'flex', padding: '4px 8px' }}>
        {[['like', liked ? 'Liked' : 'Like', toggle, liked], ['comment', 'Comment', openComments, showComments], ['share', 'Share', share]].map(([ic, lb, fn, on]) => (
          <button key={lb} onClick={fn} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: 'none', border: 'none', padding: '11px', borderRadius: 'var(--radius-sm)', fontSize: 13.5, fontWeight: 600, color: on ? 'var(--gold-deep)' : 'var(--ink-2)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1efe9'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <Icon name={ic} size={18} fill={ic === 'like' && on ? 'var(--gold)' : 'none'} stroke={ic === 'like' && on ? 0 : 2} />{lb}
          </button>
        ))}
      </div>
      {showComments && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px 16px', background: '#faf8f2' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Avatar personId={meId} size={34} showCrest={false} />
            <div style={{ flex: 1, display: 'flex', gap: 8 }}>
              <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
                placeholder="Add a comment…" style={{ flex: 1, height: 38, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)',
                  padding: '0 15px', fontSize: 13.5, fontFamily: 'var(--font-ui)', color: 'var(--ink)', outline: 'none' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--navy)'; }} onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
              <Btn variant="gold" size="sm" onClick={submitComment} style={{ opacity: draft.trim() && !sending ? 1 : .5, pointerEvents: draft.trim() && !sending ? 'auto' : 'none' }}>{sending ? '…' : 'Reply'}</Btn>
            </div>
          </div>
          {comments === null
            ? <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 12, paddingLeft: 44 }}>Loading comments…</div>
            : comments.length === 0
              ? <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 12, paddingLeft: 44 }}>No comments yet. Be the first to reply.</div>
              : <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {comments.map(c => {
                    const cp = P(c.author);
                    return (
                      <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <Avatar personId={c.author} size={34} showCrest={false} onClick={() => cp && go('profile', { id: c.author })} />
                        <div style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '9px 13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{(cp && cp.name) || 'Member'}</span>
                            <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{c.time}</span>
                          </div>
                          <div style={{ fontSize: 13.5, color: '#33363c', lineHeight: 1.5, marginTop: 2, textWrap: 'pretty' }}>{c.text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>}
        </div>
      )}
    </Card>
  );
}

function BondSuggestions({ meId, go, bond }) {
  const me = P(meId);
  const suggested = window.GB.SUGGESTED.filter(i => i !== meId && P(i));
  return (
    <Card pad={0}>
      <div style={{ padding: '15px 16px 6px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--ink)' }}>{me.role === 'undergrad' ? 'Brothers & sisters to bond with' : 'Bonds you should make'}</div>
      </div>
      {suggested.length === 0 && <div style={{ padding: '6px 16px 16px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>No suggestions yet, as more brothers and sisters join, you’ll see people to bond with here.</div>}
      {suggested.map(id => {
        const p = P(id);
        return (
          <div key={id} style={{ padding: '11px 16px', display: 'flex', gap: 11, alignItems: 'flex-start', borderTop: '1px solid var(--border)' }}>
            <Avatar personId={id} size={46} onClick={() => go('profile', { id })} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <button onClick={() => go('profile', { id })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, fontSize: 14, color: 'var(--ink)', textAlign: 'left' }}>{p.name}</button>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.35, margin: '1px 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.headline}</div>
              <div style={{ marginBottom: 8 }}><WarmSignal person={p} viewerId={meId} size={11.5} max={2} /></div>
              <BondBtn person={p} bond={bond} meId={meId} />
            </div>
          </div>
        );
      })}
    </Card>
  );
}

// One source of truth for how each bond state looks. Shared (via window) by
// every bond button so the label/action stay consistent everywhere.
const BOND_BTN_CFG = {
  none: { variant: 'outline', icon: 'bond', label: 'Bond' },
  bonded: { variant: 'bonded', icon: 'check', label: 'Bonded' },
  'pending-out': { variant: 'subtle', icon: 'bond', label: 'Requested' },
  'pending-in': { variant: 'primary', icon: 'bond', label: 'Accept' },
};
window.BOND_BTN_CFG = BOND_BTN_CFG;

// State-aware toggle. Reads the viewer-relative bond state from the hydrated
// cache and calls bond() (App's toggle handler) which create/accept/cancel/
// un-bonds and re-hydrates. No local "sent" state: the cache is the truth.
function BondBtn({ person, bond, meId, size = 'sm', full }) {
  const me = meId || (window.GB.ME && (window.GB.ME.alumni || window.GB.ME.undergrad || window.GB.ME.admin));
  const { state } = window.bondState ? window.bondState(me, person.id) : { state: person.bonded ? 'bonded' : 'none' };
  const cfg = BOND_BTN_CFG[state] || BOND_BTN_CFG.none;
  return <Btn variant={cfg.variant} size={size} full={full} icon={cfg.icon} onClick={() => bond && bond(person)}>{cfg.label}</Btn>;
}

function FollowChapters({ go }) {
  return (
    <Card pad={0}>
      <div style={{ padding: '15px 16px 6px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--ink)' }}>Chapters to follow</div>
      {window.GB.FOLLOW_CHAPTERS.length === 0 && <div style={{ padding: '6px 16px 16px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>No chapters to follow yet. They’ll appear here as houses join GreekBond.</div>}
      {window.GB.FOLLOW_CHAPTERS.map(id => {
        const c = CH(id);
        return (
          <FollowRow key={id} id={id} go={go} />
        );
      })}
    </Card>
  );
}
function FollowRow({ id, go }) {
  const c = CH(id);
  const [f, setF] = useStateHome(false);
  return (
    <div style={{ padding: '11px 16px', display: 'flex', gap: 11, alignItems: 'center', borderTop: '1px solid var(--border)' }}>
      <Crest chapterId={id} size={42} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <button onClick={() => go('chapter', { id })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', textAlign: 'left' }}>{c.name}</button>
        <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{c.school}</div>
      </div>
      <Btn variant={f ? 'subtle' : 'ghost'} size="sm" icon={f ? 'check' : 'plus'} onClick={() => setF(v => !v)}>{f ? 'Following' : 'Follow'}</Btn>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Desktop layout (≥1025px / above the mobile breakpoint). This is the original
   MemberHome body, unchanged byte-for-byte: the 248 / 1fr / 320 ThreeCol with
   both rails intact. PostCard is rendered without the `mobile` prop so its
   desktop style objects are identical to before.
   ════════════════════════════════════════════════════════════════════════════ */
function MemberHomeDesktop({ role, meId, go, bond }) {
  const undergrad = role === 'undergrad';
  const [, forceFeed] = useStateHome(0);
  const posts = window.GB.POSTS || [];
  return (
    <ThreeCol
      left={<>
        <IdentityCard meId={meId} go={go} />
        <IntroNudge role={role} meId={meId} go={go} />
        <PlusNudge role={role} go={go} />
      </>}
      center={<>
        <Composer meId={meId} role={role} onPosted={() => forceFeed(n => n + 1)} />
        {posts.length === 0
          ? <Card><EmptyState icon="bond" title="Your feed is quiet" body="No updates yet. Invite your brothers and sisters to join, and when they post and you make bonds, it’ll all show up here." /></Card>
          : posts.map((p, i) => <AnimateIn key={p.id} index={i}><PostCard post={p} meId={meId} go={go} /></AnimateIn>)}
      </>}
      right={undergrad
        ? <><BondSuggestions meId={meId} go={go} bond={bond} /><FollowChapters go={go} /></>
        : <><BondSuggestions meId={meId} go={go} bond={bond} /><FollowChapters go={go} /></>}
    />
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Session M2: mobile feed (≤640px). Single column with the feed as the spine.
   Rail content lands per the M2 plan:
     • above the feed: composer (prime), then ONE high-value strip (bond suggestions)
     • the feed
     • below the feed: warm-intro nudge, chapters-to-follow strip, identity/links
   PlusNudge is intentionally NOT on the mobile feed — pricing lives in the M1
   More sheet ("GreekBond Plus") and the account menu, so it does not earn a slot.

   Horizontal strips snap-scroll, hide their scrollbar (.gb-hscroll, mobile-only
   CSS), and let the next card peek ~20% to hint more content to the right. Each
   strip returns null when its data is empty so it never pushes the feed down for
   nothing. The desktop/mobile split is by component type (not a branch inside one
   component), keeping hook counts stable across a resize, same as the M1 nav.
   ════════════════════════════════════════════════════════════════════════════ */

// Horizontal padding of the mobile column; strips bleed past it with -PAD margins.
const M_PAD = 14;
const stripScrollerStyle = {
  display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory',
  WebkitOverflowScrolling: 'touch', margin: `0 -${M_PAD}px`, padding: `2px ${M_PAD}px 6px`,
};

function MobileStripHeader({ title }) {
  return <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--ink)', marginBottom: 10 }}>{title}</div>;
}

// Bond suggestions as swipeable people cards (the one strip above the feed).
function BondSuggestionsStrip({ meId, go, bond }) {
  const me = P(meId);
  const suggested = (window.GB.SUGGESTED || []).filter(i => i !== meId && P(i));
  if (suggested.length === 0) return null;
  const title = me && me.role === 'undergrad' ? 'Brothers & sisters to bond with' : 'Bonds you should make';
  return (
    <section>
      <MobileStripHeader title={title} />
      <div className="gb-hscroll" style={stripScrollerStyle}>
        {suggested.map(id => {
          const p = P(id);
          return (
            <div key={id} style={{ scrollSnapAlign: 'start', flex: '0 0 auto', width: 'min(80%, 280px)',
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              padding: 14, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <Avatar personId={id} size={46} onClick={() => go('profile', { id })} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button onClick={() => go('profile', { id })} style={{ background: 'none', border: 'none', padding: 0,
                    fontWeight: 700, fontSize: 14, color: 'var(--ink)', textAlign: 'left' }}>{p.name}</button>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.35, margin: '1px 0 0', overflow: 'hidden',
                    textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.headline}</div>
                </div>
              </div>
              <div style={{ margin: '10px 0' }}><WarmSignal person={p} viewerId={meId} size={11.5} max={2} /></div>
              <div style={{ marginTop: 'auto' }}><BondBtn person={p} bond={bond} meId={meId} full /></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// One chapter card in the follow strip; owns its own follow toggle (separate
// component → stable hook count, same as FollowRow on desktop).
function FollowStripCard({ id, go }) {
  const c = CH(id);
  const [f, setF] = useStateHome(false);
  return (
    <div style={{ scrollSnapAlign: 'start', flex: '0 0 auto', width: 'min(72%, 240px)',
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
      <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
        <Crest chapterId={id} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <button onClick={() => go('chapter', { id })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700,
            fontSize: 13.5, color: 'var(--ink)', textAlign: 'left', display: 'block', maxWidth: '100%', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</button>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.school}</div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Btn variant={f ? 'subtle' : 'ghost'} size="sm" full icon={f ? 'check' : 'plus'} onClick={() => setF(v => !v)}>{f ? 'Following' : 'Follow'}</Btn>
      </div>
    </div>
  );
}

function FollowChaptersStrip({ go }) {
  const ids = (window.GB.FOLLOW_CHAPTERS || []).filter(id => CH(id));
  if (ids.length === 0) return null;
  return (
    <section>
      <MobileStripHeader title="Chapters to follow" />
      <div className="gb-hscroll" style={stripScrollerStyle}>
        {ids.map(id => <FollowStripCard key={id} id={id} go={go} />)}
      </div>
    </section>
  );
}

function MemberHomeMobile({ role, meId, go, bond }) {
  const [, forceFeed] = useStateHome(0);
  const posts = window.GB.POSTS || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: `16px ${M_PAD}px 24px`, maxWidth: 'var(--maxw)', margin: '0 auto' }}>
      {/* composer — primary action, prime real estate at the very top */}
      <Composer meId={meId} role={role} onPosted={() => forceFeed(n => n + 1)} />

      {/* the one high-value strip above the feed */}
      <BondSuggestionsStrip meId={meId} go={go} bond={bond} />

      {/* the feed — the spine */}
      {posts.length === 0
        ? <Card><EmptyState icon="bond" title="Your feed is quiet" body="No updates yet. Invite your brothers and sisters to join, and when they post and you make bonds, it’ll all show up here." /></Card>
        : posts.map((p, i) => <AnimateIn key={p.id} index={i}><PostCard post={p} meId={meId} go={go} mobile /></AnimateIn>)}

      {/* quieter rail content, below the feed where it doesn't compete */}
      <IntroNudge role={role} meId={meId} go={go} />
      <FollowChaptersStrip go={go} />
      <IdentityCard meId={meId} go={go} />
    </div>
  );
}

// Thin dispatcher: mobile or desktop layout by component type (M1 pattern).
function MemberHome(props) {
  const isMobile = window.useIsMobile();
  return isMobile ? <MemberHomeMobile {...props} /> : <MemberHomeDesktop {...props} />;
}

Object.assign(window, { MemberHome, ThreeCol, Composer, BondBtn, IntroNudge, PlusNudge });
