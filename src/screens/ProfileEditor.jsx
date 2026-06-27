// ProfileEditor.jsx: ceremonial, GreekBond-native profile editor. Exports to window.
import React from 'react';
import { uploadAvatar } from '../lib/db.js';
const { useState: useStateEd, useRef: useRefEd } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf, AutocompleteInput, AutocompleteTags } = window;

/* ───────── form primitives (warm, not corporate) ───────── */
const edInput = {
  width: '100%', minHeight: 44, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
  background: '#faf8f2', padding: '11px 14px', fontSize: 14.5, outline: 'none', fontFamily: 'var(--font-ui)', color: 'var(--ink)',
};
function EdInput({ value, onChange, placeholder, area }) {
  const common = {
    style: { ...edInput, resize: area ? 'vertical' : 'none', lineHeight: area ? 1.55 : 1.2 },
    value: value || '', placeholder, onChange: e => onChange(e.target.value),
    onFocus: e => { e.target.style.borderColor = 'var(--navy)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px var(--navy-50)'; },
    onBlur: e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = '#faf8f2'; e.target.style.boxShadow = 'none'; },
  };
  return area ? <textarea rows={3} {...common} /> : <input {...common} />;
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 15 }}>
      {label && <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', letterSpacing: '.01em' }}>{label}</span>
        {hint && <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{hint}</span>}
      </div>}
      {children}
    </div>
  );
}

function PrivacyBadge({ kind }) {
  const recruiterVisible = kind === 'recruiter';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: recruiterVisible ? '#f1eef7' : 'var(--gold-soft)', color: recruiterVisible ? '#5b3b82' : '#7a5e12',
      border: `1px solid ${recruiterVisible ? '#e0d6ee' : 'var(--gold-line)'}` }}>
      <Icon name={recruiterVisible ? 'globe' : 'lock'} size={12} stroke={2.2} />
      {recruiterVisible ? 'Visible to recruiters' : 'Members only'}
    </span>
  );
}

function SectionHead({ n, title, sub, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, marginBottom: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--navy)', color: 'var(--gold)', display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, flex: 'none', marginTop: 2 }}>{n}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.01em' }}>{title}</h3>
          {badge && <PrivacyBadge kind={badge} />}
        </div>
        {sub && <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{sub}</p>}
      </div>
    </div>
  );
}

/* chip multi-select */
function ChipMulti({ options, value, onChange, tone = 'navy' }) {
  const set = new Set(value || []);
  const toggle = (o) => { const n = new Set(set); n.has(o) ? n.delete(o) : n.add(o); onChange([...n]); };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => {
        const on = set.has(o);
        return (
          <button key={o} onClick={() => toggle(o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all .12s',
            background: on ? 'var(--navy)' : 'var(--surface)', color: on ? '#fff' : 'var(--navy)',
            border: `1.5px solid ${on ? 'var(--navy)' : 'var(--border)'}` }}>
            {on && <Icon name="check" size={13} stroke={2.6} />}{o}
          </button>
        );
      })}
    </div>
  );
}

/* editable tag list (skills) */
function TagEditor({ value, onChange, suggestions }) {
  const [draft, setDraft] = useStateEd('');
  const tags = value || [];
  const add = (t) => { const v = t.trim(); if (v && !tags.includes(v)) onChange([...tags, v]); setDraft(''); };
  const remove = (t) => onChange(tags.filter(x => x !== t));
  const unused = (suggestions || []).filter(s => !tags.includes(s)).slice(0, 6);
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {tags.map(t => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 8px 6px 13px', borderRadius: 999,
            background: 'var(--gold-soft)', border: '1px solid var(--gold-line)', color: '#7a5e12', fontSize: 13, fontWeight: 600 }}>
            {t}<button onClick={() => remove(t)} style={{ border: 'none', background: 'rgba(0,0,0,.06)', borderRadius: 999, width: 18, height: 18, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#7a5e12' }}><Icon name="plus" size={13} stroke={2.4} style={{ transform: 'rotate(45deg)' }} /></button>
          </span>
        ))}
        {tags.length === 0 && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>No skills yet, add a few.</span>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && add(draft)} placeholder="Add a skill and press Enter"
          style={{ ...edInput, minHeight: 40 }} onFocus={e => { e.target.style.borderColor = 'var(--navy)'; e.target.style.background = '#fff'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = '#faf8f2'; }} />
        <Btn variant="subtle" icon="plus" onClick={() => add(draft)}>Add</Btn>
      </div>
      {unused.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>Suggested:</span>
          {unused.map(s => <button key={s} onClick={() => add(s)} style={{ border: '1px dashed var(--border)', background: 'none', borderRadius: 999, padding: '5px 11px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}>+ {s}</button>)}
        </div>
      )}
    </div>
  );
}

/* repeatable list of strings (positions / honors) */
function RepeatList({ value, onChange, placeholder, icon }) {
  const items = value || [];
  const update = (i, v) => onChange(items.map((x, j) => j === i ? v : x));
  const add = () => onChange([...items, '']);
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--gold-deep)', flex: 'none' }}><Icon name={icon || 'seal'} size={16} fill="var(--gold)" stroke={0} /></span>
          <input value={it} onChange={e => update(i, e.target.value)} placeholder={placeholder}
            style={{ ...edInput, minHeight: 40 }} onFocus={e => { e.target.style.borderColor = 'var(--navy)'; e.target.style.background = '#fff'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = '#faf8f2'; }} />
          <button onClick={() => remove(i)} style={{ border: '1px solid var(--border)', background: 'none', borderRadius: 8, width: 40, height: 40, flex: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-2)' }}>
            <Icon name="plus" size={16} stroke={2.2} style={{ transform: 'rotate(45deg)' }} /></button>
        </div>
      ))}
      <button onClick={add} style={{ alignSelf: 'flex-start', border: '1px dashed var(--border)', background: 'none', borderRadius: 999, padding: '8px 15px', fontSize: 13, fontWeight: 600, color: 'var(--navy)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Icon name="plus" size={15} stroke={2.4} /> Add another</button>
    </div>
  );
}

/* person picker (Big / Little from chapter members) */
function PersonPick({ value, onChange, chapterId, excludeId, multi }) {
  const ids = Object.keys(window.GB.PEOPLE).filter(k => P(k).chapter === chapterId && k !== excludeId);
  if (multi) {
    const set = new Set(value || []);
    const toggle = (id) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); onChange([...n]); };
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ids.map(id => {
          const on = set.has(id); const p = P(id);
          return (
            <button key={id} onClick={() => toggle(id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 13px 5px 5px', borderRadius: 999, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, background: on ? 'var(--gold-soft)' : 'var(--surface)', color: on ? '#7a5e12' : 'var(--navy)', border: `1.5px solid ${on ? 'var(--gold-line)' : 'var(--border)'}` }}>
              <Avatar personId={id} size={26} showCrest={false} />{p.name}{on && <Icon name="check" size={13} stroke={2.6} />}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <button onClick={() => onChange(null)} style={{ padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
        background: !value ? 'var(--navy)' : 'var(--surface)', color: !value ? '#fff' : 'var(--ink-2)', border: `1.5px solid ${!value ? 'var(--navy)' : 'var(--border)'}` }}>None</button>
      {ids.map(id => {
        const on = value === id; const p = P(id);
        return (
          <button key={id} onClick={() => onChange(id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 13px 5px 5px', borderRadius: 999, cursor: 'pointer',
            fontSize: 13, fontWeight: 600, background: on ? 'var(--gold-soft)' : 'var(--surface)', color: on ? '#7a5e12' : 'var(--navy)', border: `1.5px solid ${on ? 'var(--gold-line)' : 'var(--border)'}` }}>
            <Avatar personId={id} size={26} showCrest={false} />{p.name}{on && <Icon name="check" size={13} stroke={2.6} />}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── the editor ───────── */
const ED_SECTIONS = ['Identity', 'Lineage', 'Career', 'Offer', 'Seeking', 'Skills'];

function ProfileEditor({ person, onSave, onClose }) {
  const ch = CH(person.chapter);
  const [d, setD] = useStateEd(() => ({
    name: person.name, headline: person.headline, location: person.location, bannerStyle: person.bannerStyle || 'stripes',
    pledgeClass: person.pledgeClass, classYear: person.classYear,
    line: { big: (person.line && person.line.big) || null, littles: (person.line && person.line.littles) || (person.line && person.line.little ? [person.line.little] : []), name: (person.line && person.line.name) || '' },
    positions: [...(person.positions || [])], honors: [...(person.honors || [])],
    title: person.title, company: person.company, industry: person.industry, school: person.school,
    offers: [...(person.offers || [])], offerNote: person.offerNote || '',
    open: person.open || null, seekingTags: [...(person.seekingTags || [])], seeking: person.seeking || '',
    skills: [...(person.skills || [])], avatarUrl: person.avatarUrl || null,
  }));
  const [active, setActive] = useStateEd('Identity');
  const [saved, setSaved] = useStateEd(false);
  const [uploading, setUploading] = useStateEd(false);
  const [photoErr, setPhotoErr] = useStateEd('');
  const fileRef = useRefEd(null);

  // Real avatar upload: pick -> validate + upload to the avatars bucket under the
  // user's own path -> store the public URL in the form draft (persisted on Save).
  const onPickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (e.target) e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setPhotoErr(''); setUploading(true);
    try {
      const url = await uploadAvatar(person.userId, file);
      set('avatarUrl', url);
    } catch (err) {
      setPhotoErr((err && err.message) || 'Could not upload that image. Try again.');
    } finally {
      setUploading(false);
    }
  };
  const set = (k, v) => setD(s => ({ ...s, [k]: v }));
  const setLine = (k, v) => setD(s => ({ ...s, line: { ...s.line, [k]: v } }));
  const undergrad = person.role === 'undergrad';

  const doSave = () => {
    const patch = { ...d };
    // keep legacy single-little in sync for any old renderer
    patch.line = { ...d.line, little: d.line.littles[0] || null };
    onSave(patch);
    setSaved(true);
  };

  if (saved) return <SaveBeat name={person.name} chapterId={person.chapter} onClose={onClose} />;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2600, background: 'rgba(17,27,61,.55)', backdropFilter: 'blur(4px)',
      display: 'grid', placeItems: 'center', padding: '24px 16px', animation: 'gb-fade var(--motion-base) var(--ease-out)' }}>
      <div onClick={e => e.stopPropagation()} style={{ '--chapter': ch.color, '--chapter-ink': ch.ink, width: 760, maxWidth: '100%', maxHeight: '92vh',
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'gb-pop var(--motion-base) var(--ease-out)' }}>

        {/* ceremonial header */}
        <div style={{ padding: '20px 26px', background: `linear-gradient(120deg, var(--navy), var(--navy-700) 55%, var(--chapter))`, color: '#fff', position: 'relative', flex: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: .16, background: 'repeating-linear-gradient(45deg, transparent, transparent 11px, rgba(255,255,255,.6) 11px, rgba(255,255,255,.6) 12px)' }} />
          <div style={{ position: 'absolute', right: 18, bottom: -18, opacity: .25 }}><Crest chapterId={person.chapter} size={104} ring={false} /></div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
            <Crest chapterId={person.chapter} size={48} ring={false} seal />
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)' }}>Build your standing</div>
              <h2 style={{ margin: '2px 0 0', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>Edit your house record</h2>
            </div>
            <button onClick={onClose} style={{ marginLeft: 'auto', position: 'relative', width: 38, height: 38, borderRadius: 999, border: '1px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.12)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <Icon name="plus" size={20} style={{ transform: 'rotate(45deg)' }} /></button>
          </div>
        </div>

        {/* section nav */}
        <div style={{ display: 'flex', gap: 4, padding: '10px 18px', borderBottom: '1px solid var(--border)', overflowX: 'auto', flex: 'none', background: '#faf8f2' }}>
          {ED_SECTIONS.map(s => (
            <button key={s} onClick={() => { setActive(s); }} style={{ border: 'none', borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
              background: active === s ? 'var(--navy)' : 'transparent', color: active === s ? '#fff' : 'var(--ink-2)' }}>
              {s === 'Offer' ? 'What I offer' : s === 'Seeking' ? 'Looking for' : s}
            </button>
          ))}
        </div>

        {/* body */}
        <div style={{ overflowY: 'auto', padding: '24px 26px', flex: 1 }}>
          {active === 'Identity' && (
            <div>
              <SectionHead n="1" title="Identity & basics" sub="How you show up across the network." badge="recruiter" />
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
                <div style={{ position: 'relative' }}>
                  <Avatar personId={person.id} avatarUrl={d.avatarUrl} size={76} />
                  {uploading && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(17,27,61,.55)', display: 'grid', placeItems: 'center' }}>
                      <span style={{ width: 22, height: 22, border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'block', animation: 'gb-spin .7s linear infinite' }} />
                    </div>
                  )}
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickPhoto} style={{ display: 'none' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="outline" size="sm" icon="edit" onClick={() => !uploading && fileRef.current && fileRef.current.click()}>{uploading ? 'Uploading…' : d.avatarUrl ? 'Change photo' : 'Add photo'}</Btn>
                    {d.avatarUrl && !uploading && <Btn variant="ghost" size="sm" onClick={() => set('avatarUrl', null)}>Remove</Btn>}
                  </div>
                  {photoErr
                    ? <div style={{ fontSize: 12, color: 'var(--alert)', fontWeight: 600, marginTop: 6 }}>{photoErr}</div>
                    : <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>JPG, PNG, or WebP, up to 5 MB. Your crest stays paired automatically.</div>}
                </div>
              </div>
              <Field label="Full name"><EdInput value={d.name} onChange={v => set('name', v)} /></Field>
              <Field label="Headline" hint="Your one-line story"><AutocompleteInput field="headline" value={d.headline} onChange={v => set('headline', v)} placeholder="e.g. Software Engineer at Stripe" area /></Field>
              <Field label="Location"><AutocompleteInput field="location" value={d.location} onChange={v => set('location', v)} placeholder="City, ST" /></Field>
              <Field label="Banner style" hint="Chapter color is applied automatically">
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['stripes', 'Regalia stripes'], ['solid', 'Solid gradient'], ['crest', 'Crest watermark']].map(([v, lb]) => (
                    <button key={v} onClick={() => set('bannerStyle', v)} style={{ flex: 1, cursor: 'pointer', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                      border: `2px solid ${d.bannerStyle === v ? 'var(--navy)' : 'var(--border)'}`, padding: 0, background: 'none' }}>
                      <div style={{ height: 40, background: `linear-gradient(115deg, var(--navy), var(--chapter))`, position: 'relative' }}>
                        {v === 'stripes' && <div style={{ position: 'absolute', inset: 0, opacity: .25, background: 'repeating-linear-gradient(45deg, transparent, transparent 7px, rgba(255,255,255,.7) 7px, rgba(255,255,255,.7) 8px)' }} />}
                        {v === 'crest' && <div style={{ position: 'absolute', right: 4, bottom: -8, opacity: .35 }}><Crest chapterId={person.chapter} size={40} ring={false} /></div>}
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, padding: '6px', color: d.bannerStyle === v ? 'var(--navy)' : 'var(--ink-2)' }}>{lb}</div>
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {active === 'Lineage' && (
            <div>
              <SectionHead n="2" title="Greek Lineage" sub="The heart of your record, the bonds and standing LinkedIn has no field for." badge="members" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--gold-soft)', border: '1px solid var(--gold-line)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                <Crest chapterId={person.chapter} size={40} seal />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--chapter-ink)' }}>{ch.name} · {ch.letters}</div>
                  <div style={{ fontSize: 12, color: '#8a6d1e', fontWeight: 600 }}>{ch.school}</div>
                </div>
                <Pill tone="gold" icon="seal">Verified · locked</Pill>
              </div>
              <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Field label="Pledge class"><AutocompleteInput field="pledgeClass" value={d.pledgeClass} onChange={v => set('pledgeClass', v)} placeholder="e.g. Fall 2023" /></Field>
                <Field label={undergrad ? 'Expected grad year' : 'Class year'}><EdInput value={String(d.classYear || '')} onChange={v => set('classYear', v)} /></Field>
              </div>
              <Field label="Line name" hint="Your pledge line"><EdInput value={d.line.name} onChange={v => setLine('name', v)} placeholder="e.g. The founders' line" /></Field>
              <Field label="Big" hint="Selectable from your chapter"><PersonPick value={d.line.big} onChange={v => setLine('big', v)} chapterId={person.chapter} excludeId={person.id} /></Field>
              <Field label="Little(s)" hint="One or more"><PersonPick value={d.line.littles} onChange={v => setLine('littles', v)} chapterId={person.chapter} excludeId={person.id} multi /></Field>
              <Field label="Positions held" hint="Type to search, press enter to add"><AutocompleteTags field="positions" value={d.positions} onChange={v => set('positions', v)} placeholder="e.g. Treasurer" /></Field>
              <Field label="Honors & awards" hint="Type to search, press enter to add"><AutocompleteTags field="honors" value={d.honors} onChange={v => set('honors', v)} placeholder="e.g. Order of Omega" /></Field>
            </div>
          )}

          {active === 'Career' && (
            <div>
              <SectionHead n="3" title="Career" sub="What you do now and where you’ve been." badge="recruiter" />
              <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Field label="Current title"><AutocompleteInput field="title" value={d.title} onChange={v => set('title', v)} placeholder="e.g. Product Manager" /></Field>
                <Field label="Company"><AutocompleteInput field="company" value={d.company} onChange={v => set('company', v)} placeholder="e.g. Stripe" /></Field>
                <Field label="Industry"><AutocompleteInput field="industry" value={d.industry} onChange={v => set('industry', v)} placeholder="e.g. Technology" /></Field>
                <Field label="Education"><AutocompleteInput field="school" value={d.school} onChange={v => set('school', v)} placeholder="e.g. University of Wisconsin-Madison" /></Field>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#f6f3ee', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                <Icon name="briefcase" size={16} /> Past experience entries appear on your profile’s Experience block.
              </div>
            </div>
          )}

          {active === 'Offer' && (
            <div>
              <SectionHead n="4" title="What I can offer the network" sub="The GreekBond-native field that powers warm-network hiring and mentorship." badge="recruiter" />
              <Field label="I can offer" hint="Type to search, press enter to add"><AutocompleteTags field="offers" value={d.offers} onChange={v => set('offers', v)} placeholder="e.g. Warm intros" /></Field>
              <Field label="A note to the network" hint="Optional"><EdInput value={d.offerNote} onChange={v => set('offerNote', v)} area placeholder="e.g. I answer every brother. Send me your résumé and three dream companies." /></Field>
            </div>
          )}

          {active === 'Seeking' && (
            <div>
              <SectionHead n="5" title="What I’m looking for" sub={undergrad ? 'Tell alumni exactly how to open a door for you.' : 'Even alumni are looking for something, say so.'} badge="recruiter" />
              <Field label="Availability">
                <div style={{ display: 'flex', gap: 8 }}>
                  {[[null, 'Not looking'], ['work', 'Open to work'], ['hiring', 'Open to hire']].map(([v, lb]) => (
                    <button key={lb} onClick={() => set('open', v)} style={{ flex: 1, padding: '11px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                      background: d.open === v ? (v === 'work' ? '#e6f1ea' : v === 'hiring' ? 'var(--gold-soft)' : 'var(--navy-50)') : 'var(--surface)',
                      color: d.open === v ? (v === 'work' ? 'var(--success)' : v === 'hiring' ? '#7a5e12' : 'var(--navy)') : 'var(--ink-2)',
                      border: `1.5px solid ${d.open === v ? (v === 'work' ? '#c2dccb' : v === 'hiring' ? 'var(--gold-line)' : 'var(--navy-100)') : 'var(--border)'}` }}>{lb}</button>
                  ))}
                </div>
              </Field>
              <Field label="I'm seeking" hint="Type to search, press enter to add"><AutocompleteTags field="seekingTags" value={d.seekingTags} onChange={v => set('seekingTags', v)} placeholder="e.g. Mentor" /></Field>
              <Field label="In your words" hint="Optional"><EdInput value={d.seeking} onChange={v => set('seeking', v)} area placeholder="e.g. Summer internship in product or manufacturing" /></Field>
            </div>
          )}

          {active === 'Skills' && (
            <div>
              <SectionHead n="6" title="Skills & interests" sub="What you’re known for." badge="recruiter" />
              <AutocompleteTags field="skills" value={d.skills} onChange={v => set('skills', v)} placeholder="e.g. Financial Modeling" />
            </div>
          )}
        </div>

        {/* footer */}
        <div style={{ flex: 'none', padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {ED_SECTIONS.map(s => <span key={s} style={{ width: active === s ? 18 : 6, height: 6, borderRadius: 999, background: active === s ? 'var(--gold)' : 'var(--border)', transition: 'all .2s' }} />)}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="gold" icon="seal" onClick={doSave}>Save house record</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* affirming save beat */
function SaveBeat({ name, chapterId, onClose }) {
  const ch = CH(chapterId);
  React.useEffect(() => { const t = setTimeout(onClose, 1900); return () => clearTimeout(t); }, []);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2700, background: 'rgba(17,27,61,.6)', backdropFilter: 'blur(5px)', display: 'grid', placeItems: 'center', animation: 'gb-fade var(--motion-base) var(--ease-out)' }}>
      <div onClick={e => e.stopPropagation()} style={{ '--chapter': ch.color, width: 360, maxWidth: '90vw', background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        padding: '34px 30px', textAlign: 'center', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--gold-line)', animation: 'gb-pop var(--motion-base) var(--ease-out)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, animation: 'gb-seal .55s ease both' }}><Crest chapterId={chapterId} size={84} seal /></div>
        <div style={{ color: 'var(--gold-deep)', fontSize: 11.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 10 }}>Recorded</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 600, color: 'var(--navy)', marginTop: 6 }}>Your house record is updated</div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.5 }}>{name.split(' ')[0]}, your standing in {ch.letters} reflects your changes.</div>
        <div style={{ marginTop: 20 }}><Btn variant="gold" full onClick={onClose}>View my profile</Btn></div>
      </div>
    </div>
  );
}

Object.assign(window, { ProfileEditor });
