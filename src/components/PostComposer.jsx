// PostComposer.jsx: Session C three-mode posting composer.
// Modes: Post · Looking for Work · Event. Persists to Supabase posts/events.
import React from 'react'
import { createPostFull, createEventWithShare, countAudienceBonds } from '../lib/db.js'
import { prefersReducedMotion } from '../lib/motion.js'

const { useState, useEffect, useRef, useMemo, useCallback } = React
const { Icon, Crest, Avatar, Btn, Pill, Lbl, CH, P, AutocompleteInput } = window

const MODES = [
  ['post', 'Post'],
  ['seeking', 'Looking for Work'],
  ['event', 'Create an Event'],
]

const AUDIENCES = [
  ['chapter', 'Chapter'],
  ['network', 'Network'],
  ['alumni', 'Alumni Only'],
]

const HASHTAGS = ['Recruitment', 'Alumni', 'Career', 'Chapter News']

const WORK_TYPES = [
  ['full-time', 'Full-time'],
  ['internship', 'Internship'],
  ['part-time', 'Part-time'],
  ['contract', 'Contract'],
]

function siblingWord(ch) {
  if (!ch || !ch.kind) return null
  if (ch.kind === 'Sorority') return 'sister'
  if (ch.kind === 'Fraternity') return 'brother'
  return null
}

function footerTagline(ch) {
  if (ch && ch.kind === 'Sorority') return 'Built on sisterhood. Driven by trust.'
  return 'Built on brotherhood. Driven by trust.'
}

/* ── disabled toolbar button with native tooltip (no fake toast) ── */
function ToolBtn({ icon, label, onClick, disabled, title }) {
  const [tip, setTip] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => disabled && setTip(true)} onMouseLeave={() => setTip(false)}>
      <button type="button" disabled={disabled} title={disabled ? title : label}
        onClick={disabled ? undefined : onClick}
        style={{
          background: 'none', border: 'none', color: disabled ? 'var(--ink-3)' : 'var(--ink-2)',
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .55 : 1,
          width: 38, height: 38, borderRadius: 999, display: 'grid', placeItems: 'center',
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#f1efe9' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
        <Icon name={icon} size={19} />
      </button>
      {disabled && tip && title && (
        <span style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '5px 9px',
          borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10 }}>
          {title}
        </span>
      )}
    </span>
  )
}

/* ── audience dropdown ── */
function AudiencePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const label = AUDIENCES.find(([v]) => v === value)?.[1] || 'Network'
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--gold-line)',
          background: 'var(--gold-soft)', borderRadius: 999, padding: '6px 12px', fontSize: 12.5,
          fontWeight: 700, color: 'var(--navy)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
        <Icon name="globe" size={14} />
        <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>Post to:</span> {label}
        <Icon name="chevron" size={12} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 91, minWidth: 160,
            background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            {AUDIENCES.map(([v, lb]) => (
              <button key={v} type="button" onClick={() => { onChange(v); setOpen(false) }}
                style={{ width: '100%', textAlign: 'left', border: 'none', background: value === v ? 'var(--gold-soft)' : 'none',
                  padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--navy)' }}>
                {lb}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function bondsInAudience(meId, audience, people) {
  const me = people[meId]
  if (!me) return []
  const bondedIds = Object.keys(people).filter(id => id !== meId && people[id]?.bonded)
  if (audience === 'network') return bondedIds
  if (audience === 'chapter') return bondedIds.filter(id => people[id]?.chapter === me.chapter)
  if (audience === 'alumni') {
    return bondedIds.filter(id => {
      const p = people[id]
      return p && (p.role === 'alumni' || p.role === 'admin')
    })
  }
  return bondedIds
}

/* ── bond strength row ── */
function BondStrength({ meId, audience }) {
  const people = window.GB.PEOPLE || {}
  const n = countAudienceBonds(meId, audience, people)
  const scopedIds = bondsInAudience(meId, audience, people)
  const shown = scopedIds.slice(0, 5)
  const overflow = Math.max(0, n - shown.length)
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-2)', letterSpacing: '.02em' }}>Bond strength</span>
        <span title="How many of your bonds can see this post based on the audience you chose." style={{ color: 'var(--ink-3)', cursor: 'help', display: 'grid', placeItems: 'center' }}>
          <Icon name="pin" size={13} />
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {shown.map((id, i) => (
            <span key={id} style={{ marginLeft: i ? -8 : 0, border: '2px solid var(--surface)', borderRadius: '50%' }}>
              <Avatar personId={id} size={28} showCrest={false} />
            </span>
          ))}
          {overflow > 0 && (
            <span style={{ marginLeft: shown.length ? -4 : 0, width: 28, height: 28, borderRadius: '50%',
              background: 'var(--navy-50)', border: '2px solid var(--surface)', display: 'grid', placeItems: 'center',
              fontSize: 10, fontWeight: 800, color: 'var(--navy)' }}>+{overflow}</span>
          )}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>
          {n} {n === 1 ? 'bond' : 'bonds'} will see this
        </span>
      </div>
    </div>
  )
}

/* ── collapsed trigger ── */
export function Composer({ meId, role, onPosted }) {
  const [open, setOpen] = useState(false)
  const [startMode, setStartMode] = useState('post')
  const me = P(meId) || {}
  const ch = me.chapter ? CH(me.chapter) : null
  const sib = siblingWord(ch)
  const launch = (m) => { setStartMode(m); setOpen(true) }

  const placeholder = sib
    ? `Share an update with your ${sib === 'sister' ? 'sisters' : 'brothers'}…`
    : 'Share an update with your network…'

  return (
    <>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '16px 18px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ borderRadius: '50%', boxShadow: '0 0 0 2px var(--gold)' }}>
            <Avatar personId={meId} size={46} showCrest={false} />
          </span>
          <button type="button" onClick={() => launch('post')}
            style={{ flex: 1, textAlign: 'left', height: 46, borderRadius: 999, border: '1px solid var(--border)',
              background: '#faf8f2', color: 'var(--ink-2)', padding: '0 20px', fontSize: 14.5, fontWeight: 500, cursor: 'pointer' }}>
            {placeholder}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 13, flexWrap: 'wrap' }}>
          {[['post', 'Write a post', 'edit'], ['seeking', 'Looking for work', 'star'], ['event', 'Create an event', 'calendar']].map(([m, lb, ic]) => (
            <button key={m} type="button" onClick={() => launch(m)}
              style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                background: 'none', border: 'none', padding: '8px', borderRadius: 'var(--radius-sm)',
                color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <span style={{ color: 'var(--navy)' }}><Icon name={ic} size={18} /></span>{lb}
            </button>
          ))}
        </div>
      </div>
      {open && (
        <ComposerModal meId={meId} role={role} startMode={startMode}
          onClose={() => setOpen(false)} onPosted={onPosted} />
      )}
    </>
  )
}

/* ── full composer modal ── */
function ComposerModal({ meId, role, startMode, onClose, onPosted }) {
  const me = P(meId) || {}
  const ch = me.chapter ? CH(me.chapter) : null
  const sib = siblingWord(ch)
  const isAdmin = me.role === 'admin'
  const reduced = useMemo(prefersReducedMotion, [])

  const [mode, setMode] = useState(startMode || 'post')
  const [audience, setAudience] = useState('network')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Per-mode drafts remembered while modal is open.
  const [postDraft, setPostDraft] = useState({ text: '', tags: [], imageLabel: null, linkUrl: '' })
  const [seekDraft, setSeekDraft] = useState({ role: '', industry: '', location: '', workType: 'full-time', note: '' })
  const [evDraft, setEvDraft] = useState({ title: '', description: '', location: '', startDate: '', startTime: '', endDate: '', endTime: '', coverLabel: '' })

  const taRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const grow = (el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(320, Math.max(120, el.scrollHeight)) + 'px'
  }
  useEffect(() => { grow(taRef.current) }, [postDraft.text, mode])

  const toggleTag = (tag) => {
    setPostDraft(d => {
      const has = d.tags.includes(tag)
      return { ...d, tags: has ? d.tags.filter(t => t !== tag) : [...d.tags, tag] }
    })
  }

  const addLink = () => {
    const url = window.prompt('Paste a link URL')
    if (url && url.trim()) setPostDraft(d => ({ ...d, linkUrl: url.trim() }))
  }

  const onPhoto = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setPostDraft(d => ({ ...d, imageLabel: file.name }))
    e.target.value = ''
  }

  const canSubmit = useMemo(() => {
    if (busy) return false
    if (mode === 'post') return !!postDraft.text.trim()
    if (mode === 'seeking') return !!(seekDraft.role.trim() && seekDraft.note.trim())
    if (mode === 'event') {
      if (!isAdmin) return false
      if (!evDraft.title.trim() || !evDraft.startDate) return false
      if (evDraft.endDate && evDraft.startDate) {
        const s = new Date(`${evDraft.startDate}T${evDraft.startTime || '00:00'}`)
        const en = new Date(`${evDraft.endDate}T${evDraft.endTime || '23:59'}`)
        if (en < s) return false
      }
      return true
    }
    return false
  }, [mode, busy, postDraft, seekDraft, evDraft, isAdmin])

  const submitLabel = mode === 'post' ? 'Post to network'
    : mode === 'seeking' ? 'Post listing'
    : 'Create event'

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      let newPost = null
      if (mode === 'post') {
        newPost = await createPostFull({
          kind: 'post',
          text: postDraft.text.trim(),
          tags: postDraft.tags,
          audience,
          imageLabel: postDraft.imageLabel,
          linkUrl: postDraft.linkUrl || null,
        })
      } else if (mode === 'seeking') {
        const text = [
          `Looking for ${seekDraft.workType.replace('-', ' ')}: ${seekDraft.role.trim()}`,
          seekDraft.industry.trim() ? `Industry: ${seekDraft.industry.trim()}` : null,
          seekDraft.location.trim() ? `Location: ${seekDraft.location.trim()}` : null,
          seekDraft.note.trim(),
        ].filter(Boolean).join('\n')
        newPost = await createPostFull({
          kind: 'seeking',
          text,
          audience,
          meta: { seeking: { ...seekDraft } },
        })
      } else if (mode === 'event') {
        const startAt = evDraft.startDate
          ? new Date(`${evDraft.startDate}T${evDraft.startTime || '00:00'}`).toISOString()
          : null
        const endAt = evDraft.endDate
          ? new Date(`${evDraft.endDate}T${evDraft.endTime || '23:59'}`).toISOString()
          : null
        const { post } = await createEventWithShare({
          chapterId: me.chapter,
          createdBy: meId,
          audience,
          event: {
            title: evDraft.title.trim(),
            description: evDraft.description.trim() || null,
            location: evDraft.location.trim() || null,
            startAt,
            endAt,
            coverUrl: evDraft.coverLabel || null,
          },
        })
        newPost = post
      }
      if (newPost) {
        window.GB.POSTS = [newPost, ...(window.GB.POSTS || [])]
      }
      onPosted && onPosted()
      window.__notify && window.__notify(mode === 'event' ? 'Your event is live.' : 'Your post is live.')
      onClose()
    } catch (e) {
      console.error('[composer]', e)
      const msg = (e && e.message) || 'Something went wrong.'
      setError(msg)
      window.__notify && window.__notify(msg)
    } finally {
      setBusy(false)
    }
  }

  const field = {
    width: '100%', borderRadius: 10, border: '1px solid var(--border)', background: '#faf8f2',
    padding: '11px 13px', fontSize: 14.5, fontFamily: 'var(--font-ui)', color: 'var(--ink)', outline: 'none',
  }

  const chapterBadge = ch
    ? `${ch.letters}${ch.school ? ` · ${ch.school.split(',')[0].split(' ').slice(-1)[0] || ch.name}` : ''}`
    : 'Your chapter'

  const bodyTransition = reduced ? 'none' : 'opacity .18s ease, transform .18s ease'

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Create a post"
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(20, 31, 71, .62)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        animation: reduced ? 'none' : 'gb-fade var(--motion-base) var(--ease-out)',
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          '--composer-navy': '#141F47', '--composer-gold': '#D1AB33',
          width: 'min(640px, 100%)', maxHeight: '94vh', display: 'flex', flexDirection: 'column',
          background: 'var(--surface)', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(20, 31, 71, .28)',
          animation: reduced ? 'none' : 'gb-pop var(--motion-base) var(--ease-out)',
          fontFamily: 'var(--font-ui)',
        }}>

        {/* navy header bar */}
        <div style={{ background: 'var(--composer-navy)', color: '#fff', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(145deg, var(--composer-gold), #b8942a)',
            display: 'grid', placeItems: 'center', color: '#141F47', flexShrink: 0 }}>
            {ch ? <Crest chapterId={me.chapter} size={24} ring={false} /> : <Icon name="bond" size={20} />}
          </span>
          <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Create a post</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', width: 36, height: 36,
              borderRadius: 999, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* identity + audience */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex',
          alignItems: 'center', gap: 12, flexWrap: 'wrap', flexShrink: 0 }}>
          <span style={{ borderRadius: '50%', boxShadow: '0 0 0 2px var(--composer-gold)', flexShrink: 0 }}>
            <Avatar personId={meId} size={48} showCrest={false} />
          </span>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--composer-navy)' }}>{me.name || 'You'}</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4,
              border: '1px solid var(--composer-gold)', borderRadius: 999, padding: '3px 10px',
              fontSize: 12, fontWeight: 700, color: 'var(--composer-navy)', background: 'var(--gold-soft)' }}>
              {ch && <Crest chapterId={me.chapter} size={16} ring={false} />}{chapterBadge}
            </span>
          </div>
          <AudiencePicker value={audience} onChange={setAudience} />
        </div>

        {/* mode switcher */}
        <div style={{ padding: '12px 20px 0', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
          {MODES.map(([m, lb]) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              style={{
                border: mode === m ? '2px solid var(--composer-gold)' : '1px solid var(--border)',
                background: mode === m ? 'var(--gold-soft)' : 'var(--surface)',
                color: mode === m ? 'var(--composer-navy)' : 'var(--ink-2)',
                borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: bodyTransition,
              }}>{lb}</button>
          ))}
        </div>

        {/* body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, transition: bodyTransition }}>

          {mode === 'post' && (
            <div key="post-body">
              <textarea ref={taRef} value={postDraft.text}
                onChange={e => setPostDraft(d => ({ ...d, text: e.target.value }))}
                placeholder={sib ? `What's on your mind, ${sib}?` : "What's on your mind?"}
                style={{ width: '100%', resize: 'none', minHeight: 120, maxHeight: 320, border: 'none', outline: 'none',
                  fontSize: 16, lineHeight: 1.6, fontFamily: 'var(--font-ui)', color: 'var(--ink)', background: 'transparent' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {HASHTAGS.map(tag => {
                  const on = postDraft.tags.includes(tag)
                  return (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)}
                      style={{ border: 'none', borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                        background: on ? 'var(--composer-navy)' : 'var(--navy-50)',
                        color: on ? 'var(--composer-gold)' : 'var(--composer-navy)' }}>
                      #{tag.replace(' ', '')}
                    </button>
                  )
                })}
              </div>
              {(postDraft.linkUrl || postDraft.imageLabel) && (
                <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {postDraft.imageLabel && <span>Photo: {postDraft.imageLabel}</span>}
                  {postDraft.linkUrl && <span>Link: {postDraft.linkUrl}</span>}
                </div>
              )}
              <div style={{ display: 'flex', gap: 2, marginTop: 14, flexWrap: 'wrap' }}>
                <ToolBtn icon="image" label="Photo" onClick={() => fileRef.current && fileRef.current.click()} />
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhoto} />
                <ToolBtn icon="bond" label="Tag a brother" disabled title="Coming soon" />
                <ToolBtn icon="seal" label="Vouch" disabled title="Coming soon" />
                <ToolBtn icon="globe" label="Link" onClick={addLink} />
              </div>
            </div>
          )}

          {mode === 'seeking' && (
            <div key="seek-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <Lbl>Role or title sought</Lbl>
                <div style={{ marginTop: 6 }}>
                  <AutocompleteInput field="title" value={seekDraft.role}
                    onChange={v => setSeekDraft(d => ({ ...d, role: v }))} placeholder="e.g. Product Manager" />
                </div>
              </div>
              <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <Lbl>Industry</Lbl>
                  <div style={{ marginTop: 6 }}>
                    <AutocompleteInput field="industry" value={seekDraft.industry}
                      onChange={v => setSeekDraft(d => ({ ...d, industry: v }))} placeholder="e.g. Technology" />
                  </div>
                </div>
                <div>
                  <Lbl>Location</Lbl>
                  <div style={{ marginTop: 6 }}>
                    <AutocompleteInput field="location" value={seekDraft.location}
                      onChange={v => setSeekDraft(d => ({ ...d, location: v }))} placeholder="e.g. Chicago, IL" />
                  </div>
                </div>
              </div>
              <div>
                <Lbl>Work type</Lbl>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {WORK_TYPES.map(([v, lb]) => (
                    <button key={v} type="button" onClick={() => setSeekDraft(d => ({ ...d, workType: v }))}
                      style={{ border: seekDraft.workType === v ? '2px solid var(--composer-navy)' : '1px solid var(--border)',
                        background: seekDraft.workType === v ? 'var(--composer-navy)' : 'var(--surface)',
                        color: seekDraft.workType === v ? 'var(--composer-gold)' : 'var(--ink-2)',
                        borderRadius: 999, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                      {lb}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Lbl>What I'm looking for</Lbl>
                <textarea value={seekDraft.note} onChange={e => setSeekDraft(d => ({ ...d, note: e.target.value }))}
                  placeholder="Describe the role, company type, or opportunity you want."
                  style={{ ...field, marginTop: 6, minHeight: 80, resize: 'vertical', lineHeight: 1.55, width: '100%' }} />
              </div>
            </div>
          )}

          {mode === 'event' && (
            <div key="ev-body">
              {!isAdmin ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--navy-50)',
                  borderRadius: 12, border: '1px solid var(--border)' }}>
                  <Icon name="lock" size={28} style={{ color: 'var(--composer-navy)', marginBottom: 10 }} />
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--composer-navy)', marginBottom: 6 }}>
                    Only chapter admins can create events
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                    Event creation is managed by your chapter console. Ask your chapter admin to post upcoming events.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <Lbl>Title</Lbl>
                    <input value={evDraft.title} onChange={e => setEvDraft(d => ({ ...d, title: e.target.value }))}
                      placeholder="Founders Day Dinner" style={{ ...field, marginTop: 6 }} />
                  </div>
                  <div>
                    <Lbl>Description</Lbl>
                    <textarea value={evDraft.description} onChange={e => setEvDraft(d => ({ ...d, description: e.target.value }))}
                      style={{ ...field, marginTop: 6, minHeight: 70, resize: 'vertical', lineHeight: 1.55, width: '100%' }} />
                  </div>
                  <div>
                    <Lbl>Location</Lbl>
                    <div style={{ marginTop: 6 }}>
                      <AutocompleteInput field="location" value={evDraft.location}
                        onChange={v => setEvDraft(d => ({ ...d, location: v }))} placeholder="Online or a physical address" />
                    </div>
                  </div>
                  <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <Lbl>Start date</Lbl>
                      <input type="date" value={evDraft.startDate} onChange={e => setEvDraft(d => ({ ...d, startDate: e.target.value }))}
                        style={{ ...field, marginTop: 6 }} />
                    </div>
                    <div>
                      <Lbl>Start time</Lbl>
                      <input type="time" value={evDraft.startTime} onChange={e => setEvDraft(d => ({ ...d, startTime: e.target.value }))}
                        style={{ ...field, marginTop: 6 }} />
                    </div>
                    <div>
                      <Lbl>End date (optional)</Lbl>
                      <input type="date" value={evDraft.endDate} onChange={e => setEvDraft(d => ({ ...d, endDate: e.target.value }))}
                        style={{ ...field, marginTop: 6 }} />
                    </div>
                    <div>
                      <Lbl>End time (optional)</Lbl>
                      <input type="time" value={evDraft.endTime} onChange={e => setEvDraft(d => ({ ...d, endTime: e.target.value }))}
                        style={{ ...field, marginTop: 6 }} />
                    </div>
                  </div>
                  <div>
                    <Lbl>Cover image (optional)</Lbl>
                    <input type="file" accept="image/*" onChange={e => {
                      const f = e.target.files && e.target.files[0]
                      if (f) setEvDraft(d => ({ ...d, coverLabel: f.name }))
                    }} style={{ marginTop: 6, fontSize: 13 }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: '#f7e7e4',
              border: '1px solid #e8c4bf', fontSize: 13, fontWeight: 600, color: 'var(--alert)' }}>
              {error}
            </div>
          )}
        </div>

        {/* bond strength + submit */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex',
          alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', flexShrink: 0 }}>
          <BondStrength meId={meId} audience={audience} />
          <button type="button" onClick={submit} disabled={!canSubmit}
            style={{
              border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : .5,
              background: 'var(--composer-gold)', color: 'var(--composer-navy)',
              boxShadow: canSubmit ? '0 4px 14px rgba(209, 171, 51, .35)' : 'none',
              fontFamily: 'var(--font-ui)', flexShrink: 0,
            }}>
            {busy ? 'Posting…' : submitLabel}
          </button>
        </div>

        {/* footer flourish */}
        <div style={{ padding: '10px 20px 14px', borderTop: '1px solid var(--border)', textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
          {ch && <Crest chapterId={me.chapter} size={16} ring={false} />}
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '.02em' }}>
            {footerTagline(ch)}
          </span>
        </div>
      </div>
    </div>
  )
}

Object.assign(window, { Composer, PostComposerModal: ComposerModal })
