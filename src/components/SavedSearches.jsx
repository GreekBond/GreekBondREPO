// SavedSearches.jsx: Session F saved searches list + Save this search button.
// Lives on the Bond page (members) and the talent search (recruiters). Persists
// to public.saved_searches, RLS-scoped per user.
import React from 'react'
import {
  listSavedSearches, createSavedSearch, renameSavedSearch, deleteSavedSearch, touchSavedSearch,
} from '../lib/db.js'

const { useState, useEffect, useCallback, useMemo } = React
const { Icon, Card, Btn, Pill, EmptyState } = window

/* Build a readable, human label for a saved search if the user did not name it.
   Sentence case, no em dashes, no en dashes (year ranges use "to"). */
export function describeSavedFilters(filters, query) {
  const f = filters || {}
  const parts = []
  if (query && query.trim()) parts.push(`"${query.trim()}"`)
  if (f.scope === 'bonds') {
    if (f.tab === 'bonds') parts.push('Your bonds')
    if (f.org && f.org !== 'All') parts.push(`Chapter ${f.org}`)
    if (f.open && f.open === 'work') parts.push('Open to work')
    if (f.open && f.open === 'hiring') parts.push('Hiring')
    if (f.year && f.year !== 'All') parts.push(f.year)
  } else if (f.scope === 'talent') {
    if (f.industry && f.industry !== 'Any') parts.push(f.industry)
    if (f.location && f.location !== 'Any') parts.push(f.location)
    if (f.school && f.school !== 'Any') parts.push(f.school)
    if (Array.isArray(f.skills) && f.skills.length) parts.push(f.skills.join(', '))
    if (f.gradFrom || f.gradTo) {
      if (f.gradFrom && f.gradTo) parts.push(`Grad ${f.gradFrom} to ${f.gradTo}`)
      else if (f.gradFrom) parts.push(`Grad ${f.gradFrom} and later`)
      else parts.push(`Grad up to ${f.gradTo}`)
    }
    if (f.openOnly) parts.push('Open to work')
  } else if (f.scope === 'keyword') {
    if (f.field) parts.push(prettyField(f.field))
  }
  return parts.join(' · ') || 'Saved search'
}

function prettyField(field) {
  return ({ company: 'Company', title: 'Job title', school: 'School', keyword: 'Search' })[field] || 'Search'
}

function relativeTime(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

/* The list surface. Renders the user's saved searches and re-runs them on click
   by navigating to the search screen with the full filter state in params. */
export function SavedSearchesList({ profileId, go, scopeHint }) {
  const [items, setItems] = useState(null)
  const [err, setErr] = useState('')
  const [renaming, setRenaming] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const reload = useCallback(async () => {
    if (!profileId) { setItems([]); return }
    try {
      const rows = await listSavedSearches(profileId)
      setItems(rows)
      setErr('')
    } catch (e) {
      console.error('[saved-searches] load', e)
      setItems([])
      setErr((e && e.message) || 'Could not load your saved searches.')
    }
  }, [profileId])

  useEffect(() => { reload() }, [reload])

  const onRun = async (item) => {
    setBusyId(item.id)
    const filters = item.filters || {}
    const scope = filters.scope || scopeHint || 'bonds'
    const target = scope === 'talent' ? 'talent' : scope === 'keyword' ? 'search' : 'network'
    const params = scope === 'keyword'
      ? { field: filters.field || 'keyword', value: item.query || '', q: item.query || '', savedSearchId: item.id }
      : { savedSearch: { id: item.id, query: item.query || '', filters }, savedSearchId: item.id }
    try {
      touchSavedSearch(item.id).catch(() => null)
      go(target, params)
    } finally { setBusyId(null) }
  }

  const onRename = async (item, name) => {
    try {
      const updated = await renameSavedSearch(item.id, name)
      setItems(prev => (prev || []).map(p => p.id === item.id ? updated : p))
      window.__notify && window.__notify('Saved search renamed.')
      setRenaming(null)
    } catch (e) {
      console.error('[saved-searches] rename', e)
      window.__notify && window.__notify((e && e.message) || 'Could not rename the saved search.')
    }
  }

  const onDelete = async (item) => {
    setBusyId(item.id)
    try {
      await deleteSavedSearch(item.id)
      setItems(prev => (prev || []).filter(p => p.id !== item.id))
      window.__notify && window.__notify('Saved search removed.')
      setConfirmDelete(null)
    } catch (e) {
      console.error('[saved-searches] delete', e)
      window.__notify && window.__notify((e && e.message) || 'Could not delete the saved search.')
    } finally { setBusyId(null) }
  }

  if (!profileId) return null

  return (
    <Card pad={0}>
      <div style={{ padding: '14px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Saved searches</span>
        {items && items.length > 0 && <Pill tone="gray">{items.length}</Pill>}
      </div>
      {err && <div style={{ padding: '8px 16px 12px', fontSize: 12.5, color: 'var(--alert)' }}>{err}</div>}
      {items === null ? (
        <div style={{ padding: '14px 16px 16px', fontSize: 13, color: 'var(--ink-2)' }}>Loading.</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '8px 16px 16px' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            You haven\u2019t saved any searches yet. Tap Save this search after filtering the directory and they\u2019ll collect here.
          </div>
        </div>
      ) : (
        <div>
          {items.map(item => {
            const label = (item.name && item.name.trim()) || describeSavedFilters(item.filters, item.query)
            const time = item.last_run_at ? `Last run ${relativeTime(item.last_run_at)}` : `Saved ${relativeTime(item.created_at)}`
            const isRenaming = renaming && renaming.id === item.id
            return (
              <div key={item.id} style={{ padding: '11px 16px', borderTop: '1px solid var(--border)' }}>
                {isRenaming ? (
                  <RenameForm initial={item.name || ''} onCancel={() => setRenaming(null)} onSave={(n) => onRename(item, n)} />
                ) : (
                  <>
                    <button onClick={() => onRun(item)} disabled={busyId === item.id}
                      style={{ width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left',
                        cursor: busyId === item.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Icon name="filter" size={15} stroke={2.2} style={{ color: 'var(--navy)' }} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--navy)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                    </button>
                    {item.query && (
                      <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4, paddingLeft: 24, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Search text: {item.query}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingLeft: 24 }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{time}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setRenaming(item)} title="Rename"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--ink-2)', borderRadius: 6 }}>
                          <Icon name="edit" size={13} />
                        </button>
                        <button onClick={() => setConfirmDelete(item)} title="Delete"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--ink-2)', borderRadius: 6 }}>
                          <Icon name="x" size={13} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {confirmDelete && (
        <div role="dialog" aria-modal="true" onClick={() => setConfirmDelete(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 4100, background: 'rgba(20, 31, 71, .55)',
            display: 'grid', placeItems: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 'min(420px, 100%)', background: 'var(--surface)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600 }}>Delete this saved search?</h3>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: '8px 0 16px', lineHeight: 1.5 }}>
              {(confirmDelete.name && confirmDelete.name.trim()) || describeSavedFilters(confirmDelete.filters, confirmDelete.query)} will be removed. This cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
              <button onClick={() => onDelete(confirmDelete)}
                style={{ border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 13.5, fontWeight: 700,
                  cursor: 'pointer', background: 'var(--alert)', color: '#fff' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function RenameForm({ initial, onCancel, onSave }) {
  const [v, setV] = useState(initial)
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input autoFocus value={v} onChange={e => setV(e.target.value)}
        placeholder="Name this search"
        style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none' }} />
      <button onClick={() => onSave(v)} style={{ border: 'none', borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, background: 'var(--navy)', color: '#fff', cursor: 'pointer' }}>Save</button>
      <button onClick={onCancel} style={{ border: '1px solid var(--border)', borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, background: 'var(--surface)', color: 'var(--ink-2)', cursor: 'pointer' }}>Cancel</button>
    </div>
  )
}

/* Save this search button. Captures the current query plus active filters. */
export function SaveSearchButton({ profileId, query, filters, onSaved, size = 'sm' }) {
  const [openForm, setOpenForm] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const suggested = useMemo(() => describeSavedFilters(filters, query), [filters, query])
  const hasAnything = (query && query.trim()) || hasAnyFilter(filters)

  if (!profileId) return null
  if (!hasAnything) return null

  const submit = async () => {
    if (busy) return
    setBusy(true)
    try {
      const saved = await createSavedSearch({ profileId, name: name || suggested, query, filters })
      window.__notify && window.__notify('Search saved.')
      onSaved && onSaved(saved)
      setOpenForm(false); setName('')
    } catch (e) {
      console.error('[saved-searches] create', e)
      window.__notify && window.__notify((e && e.message) || 'Could not save the search.')
    } finally { setBusy(false) }
  }

  if (!openForm) {
    return (
      <Btn variant="outline" size={size} icon="bookmark" onClick={() => { setName(''); setOpenForm(true) }}>
        Save this search
      </Btn>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder={suggested}
        style={{ width: 220, border: '1px solid var(--border)', borderRadius: 999, padding: '8px 14px', fontSize: 13, background: 'var(--surface)', outline: 'none' }} />
      <Btn variant="primary" size={size} onClick={submit} disabled={busy}>{busy ? 'Saving.' : 'Save'}</Btn>
      <Btn variant="ghost" size={size} onClick={() => setOpenForm(false)}>Cancel</Btn>
    </div>
  )
}

function hasAnyFilter(filters) {
  if (!filters) return false
  const f = filters
  if (f.scope === 'bonds') {
    return (f.tab && f.tab !== 'all')
      || (f.org && f.org !== 'All')
      || (f.open && f.open !== 'any')
      || (f.year && f.year !== 'All')
  }
  if (f.scope === 'talent') {
    return (f.industry && f.industry !== 'Any')
      || (f.location && f.location !== 'Any')
      || (f.school && f.school !== 'Any')
      || (Array.isArray(f.skills) && f.skills.length > 0)
      || f.gradFrom || f.gradTo || f.openOnly
  }
  if (f.scope === 'keyword') return !!f.field
  return false
}

Object.assign(window, { SavedSearchesList, SaveSearchButton, describeSavedFilters })
