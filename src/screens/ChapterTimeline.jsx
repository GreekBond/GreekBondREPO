// ChapterTimeline.jsx: a chapter's heritage made visual. A vertical, chapter-colored spine
// from the founding year to today, with a wax-seal origin. Heritage, passed down, not a company page.
import React from 'react';
const { useState: useStateTL } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf } = window;

/* generic builder for houses without an authored timeline (seeds the store) */
function buildTimeline(c) {
  if (window.GB.TIMELINES[c.id]) return window.GB.TIMELINES[c.id].slice();
  const now = 2026;
  const list = [
    { year: c.founded, tag: 'founding', title: `${c.name} is founded`, body: `${c.letters} is chartered at ${c.school} on the principles of ${c.motto.toLowerCase()}.` },
    { year: c.founded + 3, tag: 'charter', title: 'National charter granted', body: `The chapter receives its national charter and initiates its first full class of ${c.plural}.` },
  ];
  if (c.founded + 50 <= now) list.push({ year: c.founded + 50, tag: 'milestone', title: 'The golden anniversary', body: `Fifty years of ${c.plural}. Alumni endow the chapter’s first scholarship.` });
  if (c.founded + 100 <= now) list.push({ year: c.founded + 100, tag: 'award', title: 'The Centennial', body: `One hundred years carrying the letters of ${c.name}.` });
  list.push({ year: now - 2, tag: 'award', title: `Top of the ${c.council} council`, body: `The chapter posts a ${c.gpa} GPA, among the highest on campus.` });
  return list.filter(m => m.year <= now);
}
window.GB.buildTimeline = buildTimeline;

function notableAlumni(c) {
  const seed = (window.GB.NOTABLE || {})[c.id];
  let ids = seed && seed.filter(id => P(id));
  if (!ids || !ids.length) {
    ids = Object.keys(window.GB.PEOPLE).filter(k => P(k).chapter === c.id && P(k).role === 'alumni')
      .sort((a, b) => ((P(b).honors || []).length - (P(a).honors || []).length) || (P(b).bonds - P(a).bonds)).slice(0, 3);
  }
  return ids;
}

const TAG_META = {
  founding: { label: 'Founding', tone: 'gold' },
  charter: { label: 'Charter', tone: 'navy' },
  milestone: { label: 'Milestone', tone: 'chapter' },
  award: { label: 'Honor', tone: 'gold' },
  alumni: { label: 'Notable alum', tone: 'navy' },
  today: { label: 'Today', tone: 'success' },
};

/* a node on the spine, wax seal at the origin, gold marker for today, chapter dot otherwise */
function TimelineNode({ tag, chapterId }) {
  if (tag === 'founding') {
    return (
      <div style={{ position: 'absolute', left: 5, top: 8, animation: 'gb-seal .5s ease both' }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'radial-gradient(120% 120% at 32% 24%, var(--chapter), var(--chapter-ink))', display: 'grid', placeItems: 'center', color: '#fff',
          boxShadow: '0 0 0 4px var(--surface), 0 2px 10px rgba(0,0,0,.22), inset 0 0 0 2px rgba(255,255,255,.34)' }}>
          <Icon name="seal" size={26} fill="rgba(255,255,255,.18)" stroke={1.6} />
        </div>
      </div>
    );
  }
  if (tag === 'today') {
    return <div style={{ position: 'absolute', left: 12, top: 16, width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', color: '#3a2c08', display: 'grid', placeItems: 'center', boxShadow: '0 0 0 4px var(--surface), 0 0 0 6px var(--gold-line)' }}><Icon name="seal" size={18} stroke={2.2} /></div>;
  }
  return <div style={{ position: 'absolute', left: 18, top: 22, width: 20, height: 20, borderRadius: '50%', background: 'var(--surface)', border: '4px solid var(--chapter)', boxShadow: '0 0 0 4px var(--surface)' }} />;
}

function MilestoneRow({ m, c, manage, go, onEdit }) {
  const meta = TAG_META[m.tag] || TAG_META.milestone;
  const founding = m.tag === 'founding';
  const today = m.tag === 'today';
  const person = m.person && P(m.person) ? P(m.person) : null;
  return (
    <div style={{ position: 'relative', paddingLeft: 70, paddingBottom: 26 }}>
      <TimelineNode tag={m.tag} chapterId={c.id} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: founding || today ? 26 : 23, fontWeight: 700, color: 'var(--chapter-ink)', lineHeight: 1, letterSpacing: '-.01em' }}>{m.year}</span>
        <Pill tone={meta.tone}>{meta.label}</Pill>
        {manage && !today && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button onClick={() => onEdit(m)} title="Edit" style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, width: 30, height: 30, display: 'grid', placeItems: 'center', color: 'var(--ink-2)', cursor: 'pointer' }}><Icon name="edit" size={15} /></button>
            <button onClick={() => removeMilestone(c.id, m._id)} title="Delete" style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, width: 30, height: 30, display: 'grid', placeItems: 'center', color: 'var(--alert)', cursor: 'pointer', fontSize: 17, lineHeight: 1 }}>×</button>
          </span>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17.5, fontWeight: 600, color: 'var(--ink)', marginTop: 5, lineHeight: 1.2 }}>{m.title}</div>
      {m.body && <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.6, color: '#42454c', textWrap: 'pretty', maxWidth: 600 }}>{m.body}</p>}
      {person && (
        <button onClick={() => go('profile', { id: person.id })} style={{ marginTop: 11, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '7px 14px 7px 8px', borderRadius: 999, background: 'var(--gold-soft)', border: '1px solid var(--gold-line)', cursor: 'pointer' }}>
          <Avatar personId={person.id} size={30} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#7a5e12' }}>{person.name}</span>
          <Icon name="chevR" size={15} stroke={2.3} style={{ color: 'var(--gold-deep)' }} />
        </button>
      )}
    </div>
  );
}

function MilestoneEditor({ chapterId, milestone, onDone }) {
  const [year, setYear] = useStateTL(milestone ? String(milestone.year) : '');
  const [title, setTitle] = useStateTL(milestone ? milestone.title : '');
  const [body, setBody] = useStateTL(milestone ? milestone.body : '');
  const [tag, setTag] = useStateTL(milestone ? milestone.tag : 'milestone');
  const valid = /^\d{4}$/.test(year) && title.trim().length > 1;
  const inp = { width: '100%', height: 40, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' };
  const save = () => {
    if (!valid) return;
    const data = { year: parseInt(year, 10), title: title.trim(), body: body.trim(), tag };
    if (milestone) updateMilestone(chapterId, milestone._id, data); else addMilestone(chapterId, data);
    onDone();
  };
  return (
    <div style={{ border: '1px solid var(--chapter)', borderRadius: 'var(--radius)', padding: '16px 18px', background: 'var(--bg-2)', marginBottom: 22 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--chapter-ink)', marginBottom: 12 }}>{milestone ? 'Edit milestone' : 'Add a milestone'}</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <input value={year} onChange={e => setYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))} placeholder="Year" style={{ ...inp, width: 96, flex: 'none' }} />
        <select value={tag} onChange={e => setTag(e.target.value)} style={{ ...inp, width: 160, flex: 'none', cursor: 'pointer' }}>
          {['founding', 'charter', 'milestone', 'award', 'alumni'].map(t => <option key={t} value={t}>{TAG_META[t].label}</option>)}
        </select>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Milestone title" style={{ ...inp, flex: 1, minWidth: 180 }} />
      </div>
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="What happened, in a sentence or two." style={{ ...inp, height: 70, padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
      <div style={{ display: 'flex', gap: 9, marginTop: 12, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" size="sm" onClick={onDone}>Cancel</Btn>
        <Btn variant="chapter" size="sm" icon="check" onClick={save} style={{ opacity: valid ? 1 : .5, pointerEvents: valid ? 'auto' : 'none' }}>{milestone ? 'Save' : 'Add milestone'}</Btn>
      </div>
    </div>
  );
}

/* The timeline, folds the existing "Our history" prose in as its intro (don't delete it). */
function ChapterTimeline({ c, manage, go }) {
  useGBStore();
  const [adding, setAdding] = useStateTL(false);
  const [editing, setEditing] = useStateTL(null);
  const milestones = chapterTimeline(c.id);
  const today = { year: 2026, tag: 'today', title: 'Carried forward', body: `Today ${c.members} actives and more than ${c.alumni.toLocaleString()} alumni carry the letters of ${c.name}. The line keeps growing.`, _id: '__today' };
  const all = [...milestones, today];
  const notable = notableAlumni(c);

  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '18px 24px 0' }}>
        <span style={{ color: 'var(--gold-deep)' }}><Icon name="seal" size={20} fill="var(--gold)" stroke={0} /></span>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.01em' }}>Since {c.founded}</h2>
        <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>· {2026 - c.founded} years</span>
        {manage && <Btn variant="chapter" size="sm" icon="plus" style={{ marginLeft: 'auto' }} onClick={() => { setEditing(null); setAdding(a => !a); }}>Add milestone</Btn>}
      </div>

      {/* "Our history" prose, folded in as the timeline's intro */}
      <p style={{ margin: '12px 24px 0', fontSize: 14.5, lineHeight: 1.65, color: '#33363c', textWrap: 'pretty' }}>
        Founded in {c.founded} at {c.school}, {c.name} ({c.letters}) was established on the principles of {c.motto.toLowerCase()}. For generations our chapter has produced leaders in business, law, medicine, and public service, while staying rooted in the bonds formed during undergraduate years.
      </p>

      <div style={{ padding: '22px 24px 8px', position: 'relative' }}>
        {manage && adding && <MilestoneEditor chapterId={c.id} onDone={() => setAdding(false)} />}
        <div style={{ position: 'relative' }}>
          {/* the spine */}
          <div style={{ position: 'absolute', left: 27, top: 30, bottom: 44, width: 3, borderRadius: 3,
            background: 'linear-gradient(var(--chapter), color-mix(in srgb, var(--chapter) 40%, var(--gold)))' }} />
          {all.map(m => (
            manage && editing && editing._id === m._id
              ? <div key={m._id} style={{ paddingLeft: 0 }}><MilestoneEditor chapterId={c.id} milestone={m} onDone={() => setEditing(null)} /></div>
              : <MilestoneRow key={m._id} m={m} c={c} manage={manage} go={go} onEdit={(ms) => { setAdding(false); setEditing(ms); }} />
          ))}
        </div>
      </div>

      {/* Notable alumni strip */}
      {notable.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-2)', padding: '18px 24px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}>
            <span style={{ color: 'var(--gold-deep)' }}><Icon name="star" size={17} fill="var(--gold)" stroke={0} /></span>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17.5, fontWeight: 600, color: 'var(--ink)' }}>Notable {c.plural}</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
            {notable.map(id => {
              const p = P(id);
              return (
                <button key={id} onClick={() => go('profile', { id })} style={{ display: 'flex', gap: 11, alignItems: 'center', textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '11px 13px', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                  <Avatar personId={id} size={44} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.35, marginTop: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}{p.company ? ` · ${p.company}` : ''}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

Object.assign(window, { ChapterTimeline, buildTimeline, notableAlumni });
