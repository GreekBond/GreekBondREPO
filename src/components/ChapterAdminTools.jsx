// ChapterAdminTools.jsx: Session D: admin events, fundraisers, invite codes.
import React from 'react'
import {
  createEvent, updateEvent, deleteEvent, createEventWithShare,
  createFundraiser, updateFundraiser, deleteFundraiser,
  refreshChapterContent, generateChapterInvite, listChapterInvites, revokeChapterInvite,
} from '../lib/db.js'

const { useState, useEffect, useCallback } = React
const { Icon, Crest, Avatar, Btn, Pill, Card, Lbl, CH, P, AutocompleteInput } = window

const ADMIN_NAVY = '#141F47'
const ADMIN_GOLD = '#D1AB33'

const fieldStyle = {
  width: '100%', borderRadius: 12, border: '1px solid var(--border)', background: '#faf8f2',
  padding: '11px 13px', fontSize: 14.5, fontFamily: 'var(--font-ui)', color: 'var(--ink)', outline: 'none',
}

function errMsg(e) {
  return (e && e.message) || 'Something went wrong.'
}

function inviteLink(code) {
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
  return `${base}?invite=${encodeURIComponent(code)}`
}

function copyText(text, label) {
  try {
    navigator.clipboard && navigator.clipboard.writeText(text)
    window.__notify && window.__notify(label || 'Copied.')
  } catch {
    window.__notify && window.__notify('Could not copy.')
  }
}

/* ── Event create / edit modal ── */
export function EventAdminModal({ open, onClose, chapterId, meId, event, onSaved }) {
  const editing = event && event.id
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [coverLabel, setCoverLabel] = useState('')
  const [shareFeed, setShareFeed] = useState(!editing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (editing) {
      setTitle(event.title || '')
      setDescription(event.description || '')
      setLocation(event.location || '')
      if (event.startAt) {
        const s = new Date(event.startAt)
        setStartDate(s.toISOString().slice(0, 10))
        setStartTime(s.toTimeString().slice(0, 5))
      } else { setStartDate(''); setStartTime('') }
      if (event.endAt) {
        const en = new Date(event.endAt)
        setEndDate(en.toISOString().slice(0, 10))
        setEndTime(en.toTimeString().slice(0, 5))
      } else { setEndDate(''); setEndTime('') }
      setCoverLabel(event.coverUrl || '')
      setShareFeed(false)
    } else {
      setTitle(''); setDescription(''); setLocation('')
      setStartDate(''); setStartTime(''); setEndDate(''); setEndTime('')
      setCoverLabel(''); setShareFeed(true)
    }
  }, [open, event, editing])

  if (!open) return null

  const startAt = startDate ? new Date(`${startDate}T${startTime || '00:00'}`).toISOString() : null
  const endAt = endDate ? new Date(`${endDate}T${endTime || '23:59'}`).toISOString() : null
  const endBeforeStart = startAt && endAt && new Date(endAt) < new Date(startAt)
  const canSave = !!title.trim() && !!startDate && !!startTime && !endBeforeStart && !busy

  const save = async () => {
    if (!canSave) return
    setBusy(true); setError('')
    try {
      if (editing) {
        await updateEvent(event.id, { title: title.trim(), description: description.trim(), location: location.trim(), startAt, endAt, coverUrl: coverLabel || null })
      } else {
        const payload = { title: title.trim(), description: description.trim() || null, location: location.trim() || null, startAt, endAt, coverUrl: coverLabel || null }
        if (shareFeed) {
          await createEventWithShare({ chapterId, createdBy: meId, event: payload, audience: 'chapter' })
        } else {
          await createEvent({ chapterId, createdBy: meId, ...payload })
        }
      }
      await refreshChapterContent(chapterId)
      onSaved && onSaved()
      window.__notify && window.__notify(editing ? 'Event updated.' : 'Event created.')
      onClose()
    } catch (e) {
      console.error('[event]', e)
      setError(errMsg(e))
    } finally { setBusy(false) }
  }

  return (
    <AdminModalShell title={editing ? 'Edit event' : 'Create event'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><Lbl>Title</Lbl><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Founders Day Dinner" style={{ ...fieldStyle, marginTop: 6 }} /></div>
        <div><Lbl>Description</Lbl><textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...fieldStyle, marginTop: 6, minHeight: 70, resize: 'vertical', lineHeight: 1.55 }} /></div>
        <div><Lbl>Location</Lbl><div style={{ marginTop: 6 }}><AutocompleteInput field="location" value={location} onChange={setLocation} placeholder="Online or a physical address" /></div></div>
        <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><Lbl>Start date</Lbl><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} /></div>
          <div><Lbl>Start time</Lbl><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} /></div>
          <div><Lbl>End date (optional)</Lbl><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} /></div>
          <div><Lbl>End time (optional)</Lbl><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} /></div>
        </div>
        {endBeforeStart && <div style={{ fontSize: 13, color: 'var(--alert)', fontWeight: 600 }}>End must be on or after start.</div>}
        <div><Lbl>Cover image (optional)</Lbl><input type="file" accept="image/*" onChange={e => { const f = e.target.files && e.target.files[0]; if (f) setCoverLabel(f.name) }} style={{ marginTop: 6, fontSize: 13 }} /></div>
        {!editing && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={shareFeed} onChange={e => setShareFeed(e.target.checked)} />
            Also share to the home feed
          </label>
        )}
        {error && <ErrorBox msg={error} />}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="gold" onClick={save} style={{ opacity: canSave ? 1 : .5, pointerEvents: canSave ? 'auto' : 'none' }}>{busy ? 'Saving…' : (editing ? 'Save changes' : 'Create event')}</Btn>
        </div>
      </div>
    </AdminModalShell>
  )
}

/* ── Fundraiser create / edit modal ── */
export function FundraiserAdminModal({ open, onClose, chapterId, meId, fundraiser, onSaved }) {
  const editing = fundraiser && fundraiser.id
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [coverLabel, setCoverLabel] = useState('')
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (editing) {
      setTitle(fundraiser.title || '')
      setDescription(fundraiser.description || '')
      setGoalAmount(fundraiser.goalAmount != null ? String(fundraiser.goalAmount) : '')
      setExternalUrl(fundraiser.externalUrl || '')
      setCoverLabel(fundraiser.coverUrl || '')
      setActive(fundraiser.active !== false)
    } else {
      setTitle(''); setDescription(''); setGoalAmount(''); setExternalUrl(''); setCoverLabel(''); setActive(true)
    }
  }, [open, fundraiser, editing])

  if (!open) return null

  const goal = goalAmount.trim() ? Number(goalAmount.replace(/,/g, '')) : null
  const canSave = !!title.trim() && !!externalUrl.trim() && !busy && (goalAmount.trim() === '' || !Number.isNaN(goal))

  const save = async () => {
    if (!canSave) return
    setBusy(true); setError('')
    try {
      const payload = {
        title: title.trim(), description: description.trim() || null,
        goalAmount: goal, externalUrl: externalUrl.trim(),
        coverUrl: coverLabel || null, active,
      }
      if (editing) await updateFundraiser(fundraiser.id, payload)
      else await createFundraiser({ chapterId, createdBy: meId, ...payload })
      await refreshChapterContent(chapterId)
      onSaved && onSaved()
      window.__notify && window.__notify(editing ? 'Fundraiser updated.' : 'Fundraiser created.')
      onClose()
    } catch (e) {
      console.error('[fundraiser]', e)
      setError(errMsg(e))
    } finally { setBusy(false) }
  }

  return (
    <AdminModalShell title={editing ? 'Edit fundraiser' : 'Create fundraiser'} onClose={onClose}>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        Display card with an outbound donate link only. No money moves through GreekBond.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><Lbl>Title</Lbl><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Scholarship endowment" style={{ ...fieldStyle, marginTop: 6 }} /></div>
        <div><Lbl>Description</Lbl><textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...fieldStyle, marginTop: 6, minHeight: 70, resize: 'vertical', lineHeight: 1.55 }} /></div>
        <div><Lbl>Goal amount (optional, display only)</Lbl><input value={goalAmount} onChange={e => setGoalAmount(e.target.value)} placeholder="50000" style={{ ...fieldStyle, marginTop: 6 }} /></div>
        <div><Lbl>Donate link (required)</Lbl><input type="url" value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://yourschool.edu/give" style={{ ...fieldStyle, marginTop: 6 }} /></div>
        <div><Lbl>Cover image (optional)</Lbl><input type="file" accept="image/*" onChange={e => { const f = e.target.files && e.target.files[0]; if (f) setCoverLabel(f.name) }} style={{ marginTop: 6, fontSize: 13 }} /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          Active (shown on chapter page)
        </label>
        {error && <ErrorBox msg={error} />}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="gold" onClick={save} style={{ opacity: canSave ? 1 : .5, pointerEvents: canSave ? 'auto' : 'none' }}>{busy ? 'Saving…' : (editing ? 'Save changes' : 'Create fundraiser')}</Btn>
        </div>
      </div>
    </AdminModalShell>
  )
}

/* ── Manage events list (admin console + chapter page) ── */
export function ManageEventsList({ chapterId, meId, events, onChange, compact }) {
  const [modal, setModal] = useState(null)
  const [tick, setTick] = useState(0)
  const list = events || (window.GB.CHAPTER_DETAIL && window.GB.CHAPTER_DETAIL.events) || []

  const reload = useCallback(async () => {
    await refreshChapterContent(chapterId)
    setTick(n => n + 1)
    onChange && onChange()
  }, [chapterId, onChange])

  const remove = async (ev) => {
    if (!window.confirm(`Delete "${ev.title}"? This cannot be undone.`)) return
    try {
      await deleteEvent(ev.id)
      await reload()
      window.__notify && window.__notify('Event deleted.')
    } catch (e) {
      window.__notify && window.__notify(errMsg(e))
    }
  }

  return (
    <>
      <Card pad={0}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: compact ? 16 : 17, color: ADMIN_NAVY }}>Manage events</span>
          <Btn variant="chapter" size="sm" icon="plus" onClick={() => setModal({})}>New event</Btn>
        </div>
        {list.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>No events yet. Create your first chapter event.</div>
        ) : list.map(ev => (
          <div key={ev.id || ev.title} style={{ display: 'flex', gap: 14, padding: '14px 20px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: ADMIN_NAVY }}>{ev.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{ev.when || ev.date}{ev.location ? ` · ${ev.location}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <Btn variant="ghost" size="sm" icon="edit" onClick={() => setModal(ev)}>Edit</Btn>
              <Btn variant="ghost" size="sm" onClick={() => remove(ev)}>Delete</Btn>
            </div>
          </div>
        ))}
      </Card>
      {modal && (
        <EventAdminModal open chapterId={chapterId} meId={meId} event={modal.id ? modal : null}
          onClose={() => setModal(null)} onSaved={reload} />
      )}
      <span style={{ display: 'none' }}>{tick}</span>
    </>
  )
}

/* ── Manage fundraisers list ── */
export function ManageFundraisersList({ chapterId, meId, onChange }) {
  const [modal, setModal] = useState(null)
  const [tick, setTick] = useState(0)
  const list = (window.GB.FUNDRAISERS || []).filter(f => f.chapter === chapterId)

  const reload = useCallback(async () => {
    await refreshChapterContent(chapterId)
    setTick(n => n + 1)
    onChange && onChange()
  }, [chapterId, onChange])

  const remove = async (f) => {
    if (!window.confirm(`Delete "${f.title}"? This cannot be undone.`)) return
    try {
      await deleteFundraiser(f.id)
      await reload()
      window.__notify && window.__notify('Fundraiser deleted.')
    } catch (e) {
      window.__notify && window.__notify(errMsg(e))
    }
  }

  return (
    <>
      <Card pad={0}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: ADMIN_NAVY }}>Manage fundraisers</span>
          <Btn variant="chapter" size="sm" icon="plus" onClick={() => setModal({})}>New fundraiser</Btn>
        </div>
        {list.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>No fundraisers yet. Add a campaign with an outbound donate link.</div>
        ) : list.map(f => (
          <div key={f.id} style={{ display: 'flex', gap: 14, padding: '14px 20px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: ADMIN_NAVY }}>{f.title}</span>
                <Pill tone={f.active ? 'success' : 'gray'}>{f.active ? 'Active' : 'Inactive'}</Pill>
              </div>
              {f.externalUrl && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.externalUrl}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <Btn variant="ghost" size="sm" icon="edit" onClick={() => setModal(f)}>Edit</Btn>
              <Btn variant="ghost" size="sm" onClick={() => remove(f)}>Delete</Btn>
            </div>
          </div>
        ))}
      </Card>
      {modal && (
        <FundraiserAdminModal open chapterId={chapterId} meId={meId} fundraiser={modal.id ? modal : null}
          onClose={() => setModal(null)} onSaved={reload} />
      )}
      <span style={{ display: 'none' }}>{tick}</span>
    </>
  )
}

/* ── Invite members modal ── */
export function InviteMembersModal({ open, onClose, chapterId, meId }) {
  const c = CH(chapterId)
  const [email, setEmail] = useState('')
  const [latest, setLatest] = useState(null)
  const [invites, setInvites] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const rows = await listChapterInvites(chapterId)
      setInvites(rows)
    } catch (e) {
      console.error('[invites]', e)
    }
  }, [chapterId])

  useEffect(() => {
    if (open) { load(); setError(''); setLatest(null) }
  }, [open, load])

  if (!open) return null

  const generate = async () => {
    if (busy) return
    setBusy(true); setError('')
    try {
      const row = await generateChapterInvite(chapterId, email.trim() || null)
      setLatest(row)
      setEmail('')
      await load()
    } catch (e) {
      console.error('[invite]', e)
      setError(errMsg(e))
    } finally { setBusy(false) }
  }

  const revoke = async (inv) => {
    if (inv.status !== 'unclaimed') return
    if (!window.confirm(`Revoke code ${inv.code}?`)) return
    try {
      await revokeChapterInvite(inv.id)
      await load()
      window.__notify && window.__notify('Invite revoked.')
    } catch (e) {
      window.__notify && window.__notify(errMsg(e))
    }
  }

  const statusPill = (s) => ({ unclaimed: ['gold', 'Unclaimed'], claimed: ['success', 'Claimed'], expired: ['gray', 'Expired'] }[s] || ['gray', s])

  return (
    <AdminModalShell title="Invite members" onClose={onClose} wide>
      <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
        Generate a join code for new {c.plural || 'members'}. They enter it at sign-up to join {c.letters}.</p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Pre-assign email (optional)" style={{ ...fieldStyle, flex: '1 1 200px' }} />
        <Btn variant="gold" icon="plus" onClick={generate} style={{ opacity: busy ? .6 : 1 }}>{busy ? 'Generating…' : 'Generate code'}</Btn>
      </div>

      {(latest && latest.code) && (
        <div style={{ marginBottom: 22, padding: '24px 22px', borderRadius: 16, background: `linear-gradient(145deg, ${ADMIN_NAVY}, #1e2d5c)`,
          boxShadow: '0 16px 40px rgba(20, 31, 71, .25)', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', opacity: .75, marginBottom: 10 }}>New join code</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 700, letterSpacing: '.22em', color: ADMIN_GOLD, lineHeight: 1.1 }}>{latest.code}</div>
          <div style={{ fontSize: 13, opacity: .8, marginTop: 10 }}>
            {latest.expires_at ? `Expires ${new Date(latest.expires_at).toLocaleDateString()}` : 'No expiry set'}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
            <Btn variant="gold" onClick={() => copyText(latest.code, 'Code copied.')}>Copy code</Btn>
            <Btn variant="outline" onClick={() => copyText(inviteLink(latest.code), 'Invite link copied.')} style={{ borderColor: 'rgba(255,255,255,.35)', color: '#fff' }}>Copy invite link</Btn>
          </div>
        </div>
      )}

      {error && <ErrorBox msg={error} />}

      <Lbl>Chapter invite codes</Lbl>
      <Card pad={0} style={{ marginTop: 8 }}>
        {invites.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 13.5 }}>No invite codes yet.</div>
        ) : invites.map((inv, i) => {
          const [tone, label] = statusPill(inv.status)
          const claimer = inv.claimedBy && P(inv.claimedBy)
          return (
            <div key={inv.id} style={{ padding: '12px 16px', borderTop: i ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '.12em', color: ADMIN_NAVY, minWidth: 100 }}>{inv.code}</span>
              <Pill tone={tone}>{label}</Pill>
              {inv.email && <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{inv.email}</span>}
              {claimer && <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Claimed by {claimer.name}{inv.claimedAt ? ` · ${new Date(inv.claimedAt).toLocaleDateString()}` : ''}</span>}
              {inv.status === 'expired' && inv.expiresAt && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Expired {new Date(inv.expiresAt).toLocaleDateString()}</span>}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                {inv.status === 'unclaimed' && (
                  <>
                    <Btn variant="ghost" size="sm" onClick={() => copyText(inv.code, 'Code copied.')}>Copy</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => revoke(inv)}>Revoke</Btn>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </Card>
    </AdminModalShell>
  )
}

function AdminModalShell({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div onClick={onClose} role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(20, 31, 71, .62)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: wide ? 'min(640px, 100%)' : 'min(560px, 100%)', maxHeight: '92vh', overflowY: 'auto',
          background: 'var(--surface)', borderRadius: 16, boxShadow: '0 24px 64px rgba(20, 31, 71, .28)' }}>
        <div style={{ background: ADMIN_NAVY, color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 999, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div style={{ padding: '20px 22px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: '#f7e7e4', border: '1px solid #e8c4bf', fontSize: 13, fontWeight: 600, color: 'var(--alert)' }}>
      {msg}
    </div>
  )
}

Object.assign(window, {
  EventAdminModal, FundraiserAdminModal, ManageEventsList, ManageFundraisersList, InviteMembersModal,
})
