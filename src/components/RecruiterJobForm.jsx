// RecruiterJobForm.jsx: Session E: recruiter Post a job composer.
// Premium modal, navy/gold styling, persists to the jobs table.
import React from 'react'
import { createJob, updateJob, refreshJobs } from '../lib/db.js'
import { prefersReducedMotion } from '../lib/motion.js'

const { useState, useEffect, useMemo } = React
const { Icon, Btn, Lbl, AutocompleteInput, AutocompleteTags } = window

const RECRUIT_NAVY = '#141F47'
const RECRUIT_GOLD = '#D1AB33'

const WORK_TYPES = [
  ['Full-time', 'Full-time'],
  ['Internship', 'Internship'],
  ['Part-time', 'Part-time'],
  ['Contract', 'Contract'],
]

const EXPERIENCE = [
  ['intern', 'Internship'],
  ['entry', 'Entry'],
  ['mid', 'Mid'],
  ['senior', 'Senior'],
  ['lead', 'Lead'],
]

const reducedMotion = prefersReducedMotion

const inputStyle = {
  width: '100%', borderRadius: 12, border: '1px solid var(--border)', background: '#faf8f2',
  padding: '11px 13px', fontSize: 14.5, fontFamily: 'var(--font-ui)', color: 'var(--ink)', outline: 'none',
}

function ErrorBox({ msg }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: '#f7e7e4',
      border: '1px solid #e8c4bf', fontSize: 13, fontWeight: 600, color: 'var(--alert)' }}>
      {msg}
    </div>
  )
}

export function RecruiterJobForm({ open, onClose, posterId, defaults, onSaved, editing }) {
  const reduced = useMemo(reducedMotion, [])
  const job = editing || null

  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('Full-time')
  const [experience, setExperience] = useState('mid')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [salaryCurrency, setSalaryCurrency] = useState('USD')
  const [description, setDescription] = useState('')
  const [applyUrl, setApplyUrl] = useState('')
  const [applyEmail, setApplyEmail] = useState('')
  const [tags, setTags] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (job) {
      setTitle(job.title || '')
      setCompany(job.company || '')
      setLocation(job.location || '')
      setType(job.type || 'Full-time')
      setExperience(job.experience || 'mid')
      setSalaryMin(job.salaryMin != null ? String(job.salaryMin) : '')
      setSalaryMax(job.salaryMax != null ? String(job.salaryMax) : '')
      setSalaryCurrency(job.salaryCurrency || 'USD')
      setDescription(job.description || job.desc || '')
      setApplyUrl(job.applyUrl || '')
      setApplyEmail(job.applyEmail || '')
      setTags(job.tags || [])
    } else {
      setTitle('')
      setCompany((defaults && defaults.company) || '')
      setLocation((defaults && defaults.location) || '')
      setType('Full-time')
      setExperience('mid')
      setSalaryMin('')
      setSalaryMax('')
      setSalaryCurrency('USD')
      setDescription('')
      setApplyUrl('')
      setApplyEmail('')
      setTags([])
    }
  }, [open, job, defaults])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const hasApply = !!(applyUrl.trim() || applyEmail.trim())
  const salaryMinNum = salaryMin.trim() ? Number(salaryMin.replace(/,/g, '')) : null
  const salaryMaxNum = salaryMax.trim() ? Number(salaryMax.replace(/,/g, '')) : null
  const salaryValid =
    (salaryMin.trim() === '' || !Number.isNaN(salaryMinNum)) &&
    (salaryMax.trim() === '' || !Number.isNaN(salaryMaxNum)) &&
    (salaryMinNum == null || salaryMaxNum == null || salaryMaxNum >= salaryMinNum)

  const canSave = !busy && !!title.trim() && !!company.trim() && !!location.trim()
    && !!description.trim() && hasApply && salaryValid

  const submit = async () => {
    if (!canSave) return
    setBusy(true); setError('')
    try {
      const payload = {
        via: 'employer',
        posterId,
        title: title.trim(),
        company: company.trim(),
        location: location.trim(),
        type,
        experience,
        salaryMin: salaryMinNum,
        salaryMax: salaryMaxNum,
        salaryCurrency,
        description: description.trim(),
        applyUrl: applyUrl.trim() || null,
        applyEmail: applyEmail.trim() || null,
        tags,
      }
      let saved
      if (job) saved = await updateJob(job.id, payload)
      else saved = await createJob(payload)
      await refreshJobs()
      onSaved && onSaved(saved)
      window.__notify && window.__notify(job ? 'Job updated.' : 'Job posted.')
      onClose()
    } catch (e) {
      console.error('[job-post]', e)
      setError((e && e.message) || 'Could not save the job. Try again.')
    } finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={job ? 'Edit job' : 'Post a job'}
      style={{ position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(20, 31, 71, .62)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        animation: reduced ? 'none' : 'gb-fade var(--motion-base) var(--ease-out)' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 'min(680px, 100%)', maxHeight: '94vh', display: 'flex', flexDirection: 'column',
          background: 'var(--surface)', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(20, 31, 71, .28)', fontFamily: 'var(--font-ui)',
          animation: reduced ? 'none' : 'gb-pop var(--motion-base) var(--ease-out)' }}>

        <div style={{ background: RECRUIT_NAVY, color: '#fff', padding: '18px 22px',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(145deg, ${RECRUIT_GOLD}, #b8942a)`,
            display: 'grid', placeItems: 'center', color: RECRUIT_NAVY, flexShrink: 0 }}>
            <Icon name="briefcase" size={20} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', opacity: .7 }}>
              {job ? 'Edit job listing' : 'New job listing'}
            </div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600 }}>
              {job ? 'Edit job' : 'Post a job'}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', width: 36, height: 36,
              borderRadius: 999, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 22px 16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Lbl>Job title</Lbl>
            <div style={{ marginTop: 6 }}>
              <AutocompleteInput field="title" value={title} onChange={setTitle} placeholder="e.g. Senior Software Engineer" />
            </div>
          </div>

          <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Lbl>Company</Lbl>
              <div style={{ marginTop: 6 }}>
                <AutocompleteInput field="company" value={company} onChange={setCompany} placeholder="Company name" />
              </div>
            </div>
            <div>
              <Lbl>Location</Lbl>
              <div style={{ marginTop: 6 }}>
                <AutocompleteInput field="location" value={location} onChange={setLocation} placeholder="e.g. New York, NY or Remote" />
              </div>
            </div>
          </div>

          <div>
            <Lbl>Work type</Lbl>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {WORK_TYPES.map(([v, lb]) => (
                <button key={v} type="button" onClick={() => setType(v)}
                  style={{ border: type === v ? `2px solid ${RECRUIT_NAVY}` : '1px solid var(--border)',
                    background: type === v ? RECRUIT_NAVY : 'var(--surface)',
                    color: type === v ? RECRUIT_GOLD : 'var(--ink-2)',
                    borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {lb}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Experience level</Lbl>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {EXPERIENCE.map(([v, lb]) => (
                <button key={v} type="button" onClick={() => setExperience(v)}
                  style={{ border: experience === v ? `2px solid ${RECRUIT_GOLD}` : '1px solid var(--border)',
                    background: experience === v ? 'var(--gold-soft)' : 'var(--surface)',
                    color: experience === v ? RECRUIT_NAVY : 'var(--ink-2)',
                    borderRadius: 999, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                  {lb}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Salary range <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>(optional)</span></Lbl>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: 8, marginTop: 6 }}>
              <input value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="Min" inputMode="numeric" style={inputStyle} />
              <input value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="Max" inputMode="numeric" style={inputStyle} />
              <select value={salaryCurrency} onChange={e => setSalaryCurrency(e.target.value)} style={{ ...inputStyle, padding: '11px 10px' }}>
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            {!salaryValid && <div style={{ fontSize: 12.5, color: 'var(--alert)', fontWeight: 600, marginTop: 6 }}>Max must be equal to or greater than min.</div>}
          </div>

          <div>
            <Lbl>Description</Lbl>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What the role is, who it is for, and what makes it worth applying for."
              style={{ ...inputStyle, marginTop: 6, minHeight: 110, resize: 'vertical', lineHeight: 1.55 }} />
          </div>

          <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Lbl>Application link</Lbl>
              <input type="url" value={applyUrl} onChange={e => setApplyUrl(e.target.value)}
                placeholder="https://yourcompany.com/jobs/..." style={{ ...inputStyle, marginTop: 6 }} />
            </div>
            <div>
              <Lbl>Or application email</Lbl>
              <input type="email" value={applyEmail} onChange={e => setApplyEmail(e.target.value)}
                placeholder="careers@yourcompany.com" style={{ ...inputStyle, marginTop: 6 }} />
            </div>
          </div>
          {!hasApply && <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: -4 }}>Provide at least one way to apply.</div>}

          <div>
            <Lbl>Skills and tags <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>(optional)</span></Lbl>
            <div style={{ marginTop: 6 }}>
              <AutocompleteTags field="skills" values={tags} onChange={setTags} placeholder="Type to add skills (e.g. React, SQL)" />
            </div>
          </div>

          {error && <ErrorBox msg={error} />}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex',
          alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <button type="button" onClick={submit} disabled={!canSave}
            style={{ border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 700,
              cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : .5,
              background: RECRUIT_GOLD, color: RECRUIT_NAVY,
              boxShadow: canSave ? '0 4px 14px rgba(209, 171, 51, .35)' : 'none', fontFamily: 'var(--font-ui)' }}>
            {busy ? 'Saving…' : (job ? 'Save changes' : 'Post job')}
          </button>
        </div>
      </div>
    </div>
  )
}

Object.assign(window, { RecruiterJobForm })
