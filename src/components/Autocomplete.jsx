// Autocomplete.jsx: value-completion components for form fields.
//
// Two exports:
//   <AutocompleteInput>  single-value text input with completion dropdown
//   <AutocompleteTags>   multi-value chip input with the same suggestion logic
//
// These are NOT the global typeahead from chrome.jsx: that one finds entities
// and navigates. These fill the field a user is editing.
//
// Both components:
//   • Load the merged seed-+-db suggestion list for `field` once on mount and
//     filter the cached list client-side on every keystroke.
//   • Debounce dropdown updates ~120ms after the most recent keystroke.
//   • Show nothing on focus-only, only after a keystroke.
//   • Prefix-match, case-insensitive, with the typed prefix boldfaced.
//   • Cap visible options at 8; the panel scrolls if more are available.
//   • Full keyboard support: Arrow up/down (wraps), Enter selects, Tab also
//     selects, Escape closes, click outside closes.
//   • Respect prefers-reduced-motion (no pop animation).
//   • Match the Session A dropdown look: white surface, soft shadow, rounded
//     corners, navy text, gold-soft highlight on the active row.
import React from 'react'
import { suggestionsFor, seedsFor } from '../data/suggestions.js'
import { prefersReducedMotion } from '../lib/motion.js'

const { useState, useEffect, useRef, useMemo, useCallback } = React

const VISIBLE_CAP = 8
const TAG_MAX = 20
const DEBOUNCE_MS = 120

/* ───────────────────────── shared utilities ───────────────────────── */

// Filter a cached suggestion list down to prefix matches. Case-insensitive,
// excludes anything already chosen, dedupes the typed query (handled upstream).
function filterSuggestions(list, query, excludeLowerSet) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return []
  const out = []
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    if (!item) continue
    const lower = item.toLowerCase()
    if (excludeLowerSet && excludeLowerSet.has(lower)) continue
    if (lower.startsWith(q)) out.push(item)
  }
  return out
}

// Bolds the matched prefix of an option.
function Highlighted({ text, query }) {
  const q = (query || '').trim()
  if (!q || !text) return <>{text}</>
  if (text.toLowerCase().startsWith(q.toLowerCase())) {
    return (
      <>
        <strong style={{ color: 'var(--navy)', fontWeight: 800 }}>{text.slice(0, q.length)}</strong>
        {text.slice(q.length)}
      </>
    )
  }
  return <>{text}</>
}

/* ───────────────────────── dropdown panel ─────────────────────────
   Visually identical to Session A's typeahead panel: white surface, soft
   shadow, rounded corners, navy text, gold-soft active row. */

function DropdownPanel({ children, reducedMotion }) {
  return (
    <div role="listbox" style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 80,
      background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-lg)', overflow: 'hidden auto',
      maxHeight: 320, fontFamily: 'var(--font-ui)', color: 'var(--navy)',
      animation: reducedMotion ? 'none' : 'gb-pop var(--motion-fast) var(--ease-out)',
    }}>
      {children}
    </div>
  )
}

function SuggestionRow({ text, query, active, onSelect, onHover, custom }) {
  return (
    <button
      type="button"
      role="option" aria-selected={active}
      onMouseDown={(e) => { e.preventDefault(); onSelect(text) }}
      onMouseEnter={onHover}
      style={{
        width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
        padding: '9px 14px', fontSize: 13.5, fontWeight: 600,
        color: active ? 'var(--navy)' : 'var(--ink)',
        background: active ? 'var(--gold-soft)' : 'transparent',
        boxShadow: active ? 'inset 3px 0 0 var(--gold)' : 'none',
        display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-ui)',
      }}>
      {custom && (
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)',
          letterSpacing: '.04em', textTransform: 'uppercase' }}>Use</span>
      )}
      <span style={{ minWidth: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {custom ? <>“{text}”</> : <Highlighted text={text} query={query} />}
      </span>
    </button>
  )
}

/* ───────────────────────── shared suggestion-state hook ───────────────────────── */

function useFieldSuggestions(field) {
  // Start with the seed-only list so the first keystroke has something to filter
  // immediately, even before the DB roundtrip resolves.
  const [list, setList] = useState(() => seedsFor(field))
  useEffect(() => {
    let live = true
    suggestionsFor(field).then((merged) => { if (live) setList(merged) })
    return () => { live = false }
  }, [field])
  return list
}

/* ───────────────────────── AutocompleteInput (single-value) ───────────────────────── */

export function AutocompleteInput({
  value,
  onChange,
  field,
  placeholder,
  allowCustom = true,
  area = false,
  inputStyle,
}) {
  const list = useFieldSuggestions(field)
  const [query, setQuery] = useState(value || '')
  const [debounced, setDebounced] = useState(query)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const dirtyRef = useRef(false)   // a keystroke has happened since open/focus
  const blurTimer = useRef(0)
  const wrapRef = useRef(null)
  const reduced = useMemo(prefersReducedMotion, [])

  // Keep local mirror in sync if the controlled value is changed from outside.
  useEffect(() => { setQuery(value || '') }, [value])

  // Debounce the query → debounced.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  const matches = useMemo(() => {
    if (!dirtyRef.current) return []
    return filterSuggestions(list, debounced)
  }, [list, debounced])

  const trimmed = (debounced || '').trim()
  const exactInList = trimmed && list.some(s => s.toLowerCase() === trimmed.toLowerCase())
  const showCustom = allowCustom && trimmed && !exactInList
  const flatLen = Math.min(matches.length, VISIBLE_CAP) + (showCustom ? 1 : 0)

  // Reset highlight when the candidate set shifts.
  useEffect(() => { setActive(flatLen ? 0 : -1) }, [debounced, list, flatLen])

  const commit = (next) => {
    setQuery(next)
    onChange && onChange(next)
    setOpen(false)
    dirtyRef.current = false
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (!open) return
    if (e.key === 'ArrowDown') {
      if (!flatLen) return
      e.preventDefault()
      setActive(a => (a + 1) % flatLen)
      return
    }
    if (e.key === 'ArrowUp') {
      if (!flatLen) return
      e.preventDefault()
      setActive(a => (a <= 0 ? flatLen - 1 : a - 1))
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      // Tab without anything to commit: don't intercept, let normal tab move focus.
      if (!flatLen) {
        if (e.key === 'Enter' && allowCustom && trimmed) { e.preventDefault(); commit(trimmed) }
        return
      }
      e.preventDefault()
      if (active >= 0 && active < matches.length) commit(matches[active])
      else if (showCustom) commit(trimmed)
      else commit(matches[0])
    }
  }

  // Click-outside / focus-outside closes the dropdown.
  const onBlur = () => {
    clearTimeout(blurTimer.current)
    blurTimer.current = window.setTimeout(() => setOpen(false), 120)
  }
  const onFocus = () => { clearTimeout(blurTimer.current) }
  useEffect(() => () => clearTimeout(blurTimer.current), [])

  const base = {
    width: '100%', minHeight: 44, borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: '#faf8f2',
    padding: '11px 14px', fontSize: 14.5, outline: 'none',
    fontFamily: 'var(--font-ui)', color: 'var(--ink)',
    transition: reduced ? 'none' : 'box-shadow .12s, border-color .12s, background .12s',
  }
  const merged = { ...base, ...(area ? { resize: 'vertical', lineHeight: 1.55, minHeight: 80 } : { lineHeight: 1.2 }), ...(inputStyle || {}) }

  const InputTag = area ? 'textarea' : 'input'
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <InputTag
        {...(area ? { rows: 3 } : {})}
        value={query}
        placeholder={placeholder}
        role="combobox" aria-expanded={open} aria-autocomplete="list"
        onChange={(e) => {
          const next = e.target.value
          dirtyRef.current = true
          setQuery(next)
          setOpen(true)
          onChange && onChange(next)
        }}
        onKeyDown={onKeyDown}
        onFocus={(ev) => {
          onFocus()
          ev.target.style.borderColor = 'var(--gold)'
          ev.target.style.background = '#fff'
          ev.target.style.boxShadow = '0 0 0 3px var(--gold-soft)'
        }}
        onBlur={(ev) => {
          onBlur()
          ev.target.style.borderColor = 'var(--border)'
          ev.target.style.background = '#faf8f2'
          ev.target.style.boxShadow = 'none'
        }}
        style={merged}
      />
      {open && flatLen > 0 && (
        <DropdownPanel reducedMotion={reduced}>
          {matches.slice(0, VISIBLE_CAP).map((s, i) => (
            <SuggestionRow
              key={s + i}
              text={s}
              query={trimmed}
              active={i === active}
              onSelect={commit}
              onHover={() => setActive(i)}
            />
          ))}
          {showCustom && (
            <SuggestionRow
              custom
              text={trimmed}
              query={trimmed}
              active={active === Math.min(matches.length, VISIBLE_CAP)}
              onSelect={commit}
              onHover={() => setActive(Math.min(matches.length, VISIBLE_CAP))}
            />
          )}
        </DropdownPanel>
      )}
    </div>
  )
}

/* ───────────────────────── AutocompleteTags (multi-value) ───────────────────────── */

export function AutocompleteTags({
  value,
  onChange,
  field,
  placeholder,
  allowCustom = true,
  max = TAG_MAX,
}) {
  const list = useFieldSuggestions(field)
  const tags = Array.isArray(value) ? value : []
  const lowerSet = useMemo(() => new Set(tags.map(t => String(t).toLowerCase())), [tags])

  const [draft, setDraft] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [tooMany, setTooMany] = useState(false)
  const dirtyRef = useRef(false)
  const inputRef = useRef(null)
  const blurTimer = useRef(0)
  const reduced = useMemo(prefersReducedMotion, [])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(draft), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [draft])

  const matches = useMemo(() => {
    if (!dirtyRef.current) return []
    return filterSuggestions(list, debounced, lowerSet)
  }, [list, debounced, lowerSet])

  const trimmed = (debounced || '').trim()
  const exactInList = trimmed && matches.some(s => s.toLowerCase() === trimmed.toLowerCase())
  const showCustom = allowCustom && trimmed && !exactInList && !lowerSet.has(trimmed.toLowerCase())
  const flatLen = Math.min(matches.length, VISIBLE_CAP) + (showCustom ? 1 : 0)

  useEffect(() => { setActive(flatLen ? 0 : -1) }, [debounced, list, flatLen])

  const addTag = (raw) => {
    const v = String(raw || '').trim()
    if (!v) return
    if (lowerSet.has(v.toLowerCase())) { setDraft(''); return }
    if (tags.length >= max) { setTooMany(true); return }
    onChange && onChange([...tags, v])
    setDraft('')
    dirtyRef.current = false
    setTooMany(false)
  }

  const removeTag = (idx) => {
    if (idx < 0 || idx >= tags.length) return
    const next = tags.filter((_, i) => i !== idx)
    onChange && onChange(next)
    setTooMany(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'Backspace' && !draft && tags.length) {
      e.preventDefault()
      removeTag(tags.length - 1)
      return
    }
    // Comma commits the current entry.
    if (e.key === ',' ) {
      e.preventDefault()
      const v = draft.trim()
      if (v) addTag(v)
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      if (!flatLen) return
      e.preventDefault()
      setActive(a => (a + 1) % flatLen)
      return
    }
    if (e.key === 'ArrowUp') {
      if (!flatLen) return
      e.preventDefault()
      setActive(a => (a <= 0 ? flatLen - 1 : a - 1))
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (!flatLen) {
        if (e.key === 'Enter' && allowCustom && draft.trim()) {
          e.preventDefault()
          addTag(draft.trim())
        }
        return
      }
      e.preventDefault()
      if (active >= 0 && active < matches.length) addTag(matches[active])
      else if (showCustom) addTag(trimmed)
      else addTag(matches[0])
    }
  }

  const onBlur = () => {
    clearTimeout(blurTimer.current)
    blurTimer.current = window.setTimeout(() => setOpen(false), 120)
  }
  const onFocus = () => { clearTimeout(blurTimer.current) }
  useEffect(() => () => clearTimeout(blurTimer.current), [])

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => inputRef.current && inputRef.current.focus()}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
          minHeight: 46, padding: '6px 8px',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          background: '#faf8f2',
          cursor: 'text',
          transition: reduced ? 'none' : 'border-color .12s, background .12s, box-shadow .12s',
        }}
      >
        {tags.map((t, i) => (
          <Pill key={t + i} text={t} onRemove={() => removeTag(i)} />
        ))}
        <input
          ref={inputRef}
          value={draft}
          placeholder={tags.length === 0 ? placeholder : ''}
          role="combobox" aria-expanded={open} aria-autocomplete="list"
          onChange={(e) => {
            dirtyRef.current = true
            setDraft(e.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            onFocus()
            const wrap = e.target.parentElement
            if (wrap) {
              wrap.style.borderColor = 'var(--gold)'
              wrap.style.background = '#fff'
              wrap.style.boxShadow = '0 0 0 3px var(--gold-soft)'
            }
          }}
          onBlur={(e) => {
            onBlur()
            const wrap = e.target.parentElement
            if (wrap) {
              wrap.style.borderColor = 'var(--border)'
              wrap.style.background = '#faf8f2'
              wrap.style.boxShadow = 'none'
            }
          }}
          style={{
            flex: 1, minWidth: 140, border: 'none', outline: 'none',
            background: 'transparent', padding: '8px 6px',
            fontSize: 14.5, fontFamily: 'var(--font-ui)', color: 'var(--ink)',
          }}
        />
      </div>
      {tooMany && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
          You can add up to {max}. Remove one to add another.
        </div>
      )}
      {open && flatLen > 0 && (
        <DropdownPanel reducedMotion={reduced}>
          {matches.slice(0, VISIBLE_CAP).map((s, i) => (
            <SuggestionRow
              key={s + i}
              text={s}
              query={trimmed}
              active={i === active}
              onSelect={addTag}
              onHover={() => setActive(i)}
            />
          ))}
          {showCustom && (
            <SuggestionRow
              custom
              text={trimmed}
              query={trimmed}
              active={active === Math.min(matches.length, VISIBLE_CAP)}
              onSelect={addTag}
              onHover={() => setActive(Math.min(matches.length, VISIBLE_CAP))}
            />
          )}
        </DropdownPanel>
      )}
    </div>
  )
}

function Pill({ text, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 6px 6px 12px', borderRadius: 999,
      background: 'var(--navy)', color: 'var(--gold)',
      fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)',
      lineHeight: 1, maxWidth: '100%',
    }}>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>{text}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        aria-label={`Remove ${text}`}
        style={{
          width: 18, height: 18, borderRadius: 999, border: 'none',
          background: 'rgba(255,255,255,.16)', color: 'var(--gold)',
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          fontSize: 12, fontWeight: 800, lineHeight: 1, padding: 0,
        }}
      >×</button>
    </span>
  )
}

// Expose to the legacy window namespace so screens that read from window can
// use them without importing, matches the rest of the codebase pattern.
Object.assign(window, { AutocompleteInput, AutocompleteTags })
