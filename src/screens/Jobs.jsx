// Jobs.jsx: member view (warm-network: every job shows the brother) + recruiter management.
import React from 'react';
import { saveJob, unsaveJob, listJobsByPoster, deleteJob, refreshJobs } from '../lib/db.js';
import { RecruiterJobForm } from '../components/RecruiterJobForm.jsx';
const { useState: useStateJob, useEffect: useEffectJob } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf } = window;

function jobAccent(via) { return via === 'employer'; }

function openApplication(job) {
  if (!job) return;
  if (job.applyUrl) {
    window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  if (job.applyEmail) {
    window.location.href = `mailto:${job.applyEmail}?subject=${encodeURIComponent('Application: ' + (job.title || 'role'))}`;
    return;
  }
  window.__notify && window.__notify('No application link provided for this role.');
}

/* ───────────────── MEMBER jobs ───────────────── */
function Jobs({ role, meId, go, bond }) {
  const undergrad = role === 'undergrad';
  const [filter, setFilter] = useStateJob('all'); // all | bond | employer
  const list = window.GB.JOBS.filter(j => filter === 'all' || j.via === filter);
  const [sel, setSel] = useStateJob(window.GB.JOBS[0] || null);
  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: 0 }}>Jobs through the network</h1>
        <p style={{ fontSize: 14.5, color: 'var(--ink-2)', margin: '6px 0 0' }}>
          {undergrad ? 'Roles where a brother or sister can walk your résumé in. A warm intro beats a cold application every time.' : 'Every role shows who’s behind it. Refer a brother, or get referred.'}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1.4fr)', gap: 20, alignItems: 'start' }}>
        {/* list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
            {[['all', 'All roles'], ['bond', 'From brothers & sisters'], ['employer', 'From employers']].map(([v, l]) =>
              filterPill(filter === v, () => setFilter(v), l, v))}
          </div>
          {list.length
            ? list.map(j => <JobListItem key={j.id} job={j} meId={meId} active={sel && sel.id === j.id} onClick={() => setSel(j)} go={go} />)
            : <Card><div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>No roles posted yet. When brothers, sisters, and employers post, they’ll show up here.</div></Card>}
        </div>
        {/* detail */}
        <div style={{ position: 'sticky', top: 86 }}>{sel && <JobDetail job={sel} meId={meId} go={go} undergrad={undergrad} />}</div>
      </div>
    </div>
  );
}

function filterPill(active, onClick, label, key) {
  return (
    <button key={key} onClick={onClick} style={{ border: active ? '1.5px solid var(--navy)' : '1px solid var(--border)', background: active ? 'var(--navy)' : 'var(--surface)',
      color: active ? '#fff' : 'var(--navy)', borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
  );
}

function JobSourceTag({ job, go }) {
  const employer = jobAccent(job.via);
  const poster = job.poster ? P(job.poster) : null;
  if (employer || !poster) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#efe9f5', color: '#5b3b82', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="building" size={18} /></div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>Posted by an employer</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{job.company || 'Employer'} · verified employer</div>
        </div>
      </div>
    );
  }
  const ch = CH(poster.chapter);
  return (
    <button onClick={() => go && go('profile', { id: poster.id })} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <Avatar personId={poster.id} size={34} />
      <div style={{ minWidth: 0, textAlign: 'left' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>Posted by your {ch.noun} · {poster.name.split(' ')[0]}</div>
        <div style={{ fontSize: 11.5, color: '#8a6d1e', fontWeight: 600 }}>{ch.letters} · ’{String(poster.classYear).slice(2)} · can refer you</div>
      </div>
    </button>
  );
}

/* bookmark/save toggle, top-right of each job card */
function SaveJobBtn({ jobId, meId, size = 32 }) {
  const [saved, setSaved] = useStateJob((window.GB.SAVED_JOB_IDS || []).includes(jobId));
  const [busy, setBusy] = useStateJob(false);
  const toggle = async (e) => {
    e.stopPropagation();
    if (busy || !meId) return;
    const next = !saved;
    setSaved(next); setBusy(true);
    try {
      if (next) {
        await saveJob(meId, jobId);
        if (!(window.GB.SAVED_JOB_IDS || []).includes(jobId)) window.GB.SAVED_JOB_IDS = [...(window.GB.SAVED_JOB_IDS || []), jobId];
        window.__notify && window.__notify('Job saved.');
      } else {
        await unsaveJob(meId, jobId);
        window.GB.SAVED_JOB_IDS = (window.GB.SAVED_JOB_IDS || []).filter(id => id !== jobId);
        window.__notify && window.__notify('Job removed.');
      }
    } catch (err) {
      console.error('[savejob] failed:', err);
      setSaved(!next);
      window.__notify && window.__notify('Couldn’t update saved jobs, try again.');
    } finally { setBusy(false); }
  };
  return (
    <button onClick={toggle} aria-label={saved ? 'Remove from saved jobs' : 'Save job'} title={saved ? 'Saved' : 'Save'}
      style={{ flex: 'none', width: size, height: size, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)',
        color: saved ? 'var(--gold-deep)' : 'var(--ink-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'all .15s ease' }}
      onMouseEnter={e => e.currentTarget.style.background = '#f1efe9'} onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
      <Icon name="bookmark" size={16} fill={saved ? 'var(--gold)' : 'none'} stroke={saved ? 0 : 2} />
    </button>
  );
}

function JobListItem({ job, meId, active, onClick, go }) {
  const employer = jobAccent(job.via);
  return (
    <Card pad={0} hover onClick={onClick} style={{ cursor: 'pointer', overflow: 'hidden',
      border: active ? `1.5px solid var(--navy)` : '1px solid var(--border)', boxShadow: active ? 'var(--shadow-md)' : 'var(--shadow-sm)' }}>
      <div style={{ height: 4, background: employer ? '#8a6db5' : 'var(--gold)' }} />
      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{job.title}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 1 }}>{job.company} · {job.location}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
            {job.refer ? <Pill tone="gold" icon="intro">Referral</Pill> : <Pill tone="employer">Employer</Pill>}
            <SaveJobBtn jobId={job.id} meId={meId} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
          {job.type && <Pill tone="gray">{job.type}</Pill>}
          {job.pay && <Pill tone="gray">{job.pay}</Pill>}
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <JobSourceTag job={job} go={go} />
        </div>
      </div>
    </Card>
  );
}

function JobDetail({ job, meId, go, undergrad }) {
  const employer = jobAccent(job.via);
  const poster = job.poster ? P(job.poster) : null;
  const applyDisabled = employer && !(job.applyUrl || job.applyEmail);
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <div style={{ height: 5, background: employer ? 'linear-gradient(90deg,#8a6db5,#b29bd6)' : 'linear-gradient(90deg,var(--gold),#e6c659)' }} />
      <div style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>{job.title}</h2>
            <div style={{ fontSize: 14.5, color: 'var(--ink)', marginTop: 4 }}>{job.company} · {job.location}</div>
          </div>
          {job.refer ? <Pill tone="gold" icon="intro">Warm referral</Pill> : <Pill tone="employer" icon="building">Employer post</Pill>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {job.type && <Pill tone="navy">{job.type}</Pill>}
          {job.pay && <Pill tone="navy">{job.pay}</Pill>}
          {job.experience && <Pill tone="gray">{prettyExperience(job.experience)}</Pill>}
          <Pill tone="gray">Posted {job.posted}</Pill>
        </div>

        <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 'var(--radius)', background: employer ? '#f7f4fa' : 'var(--gold-soft)', border: `1px solid ${employer ? '#e3d8ef' : 'var(--gold-line)'}` }}>
          <JobSourceTag job={job} go={go} />
          {!employer && poster && <div style={{ fontSize: 13, color: '#6b5a2e', marginTop: 10, lineHeight: 1.5, fontStyle: 'italic' }}>
            “{undergrad ? 'Reach out before you apply, I’ll walk your résumé in personally.' : 'Happy to refer a brother who’s a fit. DM me first.'}”</div>}
        </div>

        <div style={{ marginTop: 18 }}>
          <Lbl>About the role</Lbl>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#33363c', margin: '8px 0 0', textWrap: 'pretty', whiteSpace: 'pre-wrap' }}>{job.desc || job.description}</p>
        </div>
        {!!(job.tags && job.tags.length) && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 7 }}>{job.tags.map(t => <Pill key={t} tone="gray">{t}</Pill>)}</div>
        )}

        <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {employer ? (
            applyDisabled
              ? <Btn variant="subtle" full icon="briefcase">No application link provided</Btn>
              : <Btn variant="primary" full icon="briefcase" onClick={() => openApplication(job)}>{job.applyUrl ? 'Apply on company site' : 'Apply by email'}</Btn>
          ) : poster ? (
            <>
              <Btn variant="gold" icon="intro" onClick={() => go('messages')}>Ask {poster.name.split(' ')[0]} for a referral</Btn>
              {(job.applyUrl || job.applyEmail) && <Btn variant="outline" icon="briefcase" onClick={() => openApplication(job)}>Apply directly</Btn>}
            </>
          ) : (
            <Btn variant="primary" full icon="briefcase" onClick={() => openApplication(job)}>Apply</Btn>
          )}
        </div>
      </div>
    </Card>
  );
}

function prettyExperience(v) {
  if (!v) return '';
  return ({ intern: 'Internship', entry: 'Entry level', mid: 'Mid level', senior: 'Senior', lead: 'Lead' })[v] || v;
}

/* ───────────────── RECRUITER jobs management ───────────────── */
function RecruiterJobs({ go, selfId, recruiterCompany, recruiterLocation }) {
  const [posts, setPosts] = useStateJob([]);
  const [loading, setLoading] = useStateJob(true);
  const [loadErr, setLoadErr] = useStateJob('');
  const [sel, setSel] = useStateJob(null);
  const [composer, setComposer] = useStateJob({ open: false, editing: null });
  const [confirmDelete, setConfirmDelete] = useStateJob(null);
  const [deleting, setDeleting] = useStateJob(false);

  const reload = React.useCallback(async () => {
    if (!selfId) { setPosts([]); setLoading(false); return; }
    setLoading(true); setLoadErr('');
    try {
      const rows = await listJobsByPoster(selfId);
      setPosts(rows);
      setSel((cur) => (cur && rows.find(r => r.id === cur.id)) || rows[0] || null);
    } catch (e) {
      console.error('[recruiter-jobs] load', e);
      setLoadErr((e && e.message) || 'Could not load your jobs.');
    } finally { setLoading(false); }
  }, [selfId]);

  useEffectJob(() => { reload(); }, [reload]);

  const onSaved = (job) => {
    setPosts(prev => {
      const existing = prev.findIndex(p => p.id === job.id);
      if (existing >= 0) { const next = prev.slice(); next[existing] = job; return next; }
      return [job, ...prev];
    });
    setSel(job);
  };

  const onDelete = async (job) => {
    setDeleting(true);
    try {
      await deleteJob(job.id);
      await refreshJobs();
      setPosts(prev => prev.filter(p => p.id !== job.id));
      setSel(prev => (prev && prev.id === job.id) ? null : prev);
      window.__notify && window.__notify('Job deleted.');
      setConfirmDelete(null);
    } catch (e) {
      console.error('[recruiter-jobs] delete', e);
      window.__notify && window.__notify((e && e.message) || 'Could not delete the job.');
    } finally { setDeleting(false); }
  };

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            <Icon name="briefcase" size={15} /> Job posts
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '5px 0 0' }}>Your job posts</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '5px 0 0' }}>{recruiterCompany} · employer posts are visible to alumni and undergraduates browsing jobs.</p>
        </div>
        <Btn variant="primary" icon="plus" onClick={() => setComposer({ open: true, editing: null })}>Post a job</Btn>
      </div>

      {loadErr && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: '14px 18px', color: 'var(--alert)', fontSize: 13.5, fontWeight: 600 }}>{loadErr}</div>
        </Card>
      )}

      {loading ? (
        <Card><div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>Loading your job posts.</div></Card>
      ) : posts.length === 0 ? (
        <Card><EmptyState icon="jobs" title="No jobs posted yet"
          body="Post a job and it will appear here, and in the jobs feed alumni and undergraduates browse."
          action={<Btn variant="primary" icon="plus" onClick={() => setComposer({ open: true, editing: null })}>Post a job</Btn>} />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr)', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {posts.map(j => (
              <Card key={j.id} pad={0} hover onClick={() => setSel(j)}
                style={{ cursor: 'pointer', overflow: 'hidden', border: sel && sel.id === j.id ? '1.5px solid var(--navy)' : '1px solid var(--border)' }}>
                <div style={{ height: 4, background: '#8a6db5' }} />
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{j.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>{j.location}</div>
                    </div>
                    <Pill tone="success">Live</Pill>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {j.type && <Pill tone="gray">{j.type}</Pill>}
                    {j.pay && <Pill tone="gray">{j.pay}</Pill>}
                    {j.experience && <Pill tone="gray">{prettyExperience(j.experience)}</Pill>}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'center' }}>
                    <RStat n={j.posted} l="Posted" />
                    {j.applyUrl && <RStat n="Link" l="Apply via" gold />}
                    {!j.applyUrl && j.applyEmail && <RStat n="Email" l="Apply via" gold />}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div style={{ position: 'sticky', top: 86 }}>
            {sel && (
              <Card pad={0} style={{ overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, margin: 0 }}>{sel.title}</h2>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn variant="ghost" size="sm" icon="edit" onClick={() => setComposer({ open: true, editing: sel })}>Edit</Btn>
                      <Btn variant="ghost" size="sm" onClick={() => setConfirmDelete(sel)}>Delete</Btn>
                    </div>
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 3 }}>
                    {sel.company} · {sel.location}{sel.pay ? ' · ' + sel.pay : ''}
                  </div>
                </div>
                <div style={{ padding: '16px 22px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {sel.type && <Pill tone="navy">{sel.type}</Pill>}
                    {sel.experience && <Pill tone="gray">{prettyExperience(sel.experience)}</Pill>}
                    <Pill tone="gray">Posted {sel.posted}</Pill>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <Lbl>Description</Lbl>
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: '#33363c', margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{sel.description || sel.desc}</p>
                  </div>
                  {!!(sel.tags && sel.tags.length) && (
                    <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{sel.tags.map(t => <Pill key={t} tone="gray">{t}</Pill>)}</div>
                  )}
                  <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--gold-soft)', border: '1px solid var(--gold-line)', borderRadius: 12 }}>
                    <Lbl>How candidates apply</Lbl>
                    <div style={{ fontSize: 13.5, color: 'var(--ink)', marginTop: 6, wordBreak: 'break-all' }}>
                      {sel.applyUrl
                        ? <a href={sel.applyUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--navy)', fontWeight: 600 }}>{sel.applyUrl}</a>
                        : sel.applyEmail
                          ? <a href={`mailto:${sel.applyEmail}`} style={{ color: 'var(--navy)', fontWeight: 600 }}>{sel.applyEmail}</a>
                          : <span style={{ color: 'var(--ink-2)' }}>No application link provided.</span>}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      <RecruiterJobForm
        open={composer.open}
        editing={composer.editing}
        posterId={selfId}
        defaults={{ company: recruiterCompany, location: recruiterLocation }}
        onClose={() => setComposer({ open: false, editing: null })}
        onSaved={onSaved}
      />

      {confirmDelete && (
        <div role="dialog" aria-modal="true" onClick={() => !deleting && setConfirmDelete(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 4100, background: 'rgba(20, 31, 71, .55)', backdropFilter: 'blur(3px)',
            display: 'grid', placeItems: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 'min(440px, 100%)', background: 'var(--surface)', borderRadius: 14, padding: 20,
              boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600 }}>Delete this job?</h3>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: '8px 0 16px', lineHeight: 1.5 }}>
              “{confirmDelete.title}” will be removed from the jobs feed. This cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
              <button onClick={() => onDelete(confirmDelete)} disabled={deleting}
                style={{ border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 13.5, fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer', background: 'var(--alert)', color: '#fff' }}>
                {deleting ? 'Deleting…' : 'Delete job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function RStat({ n, l, gold }) {
  return <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: gold ? 'var(--gold-deep)' : 'var(--navy)' }}>{n}</div><div style={{ fontSize: 11, color: 'var(--ink-2)' }}>{l}</div></div>;
}

/* ───────────────── SAVED jobs ───────────────── */
function SavedJobs({ go, meId, role }) {
  const ids = window.GB.SAVED_JOB_IDS || [];
  const saved = (window.GB.JOBS || []).filter(j => ids.includes(j.id));
  const [sel, setSel] = useStateJob(saved[0] || null);
  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: 0 }}>Saved jobs</h1>
          <p style={{ fontSize: 14.5, color: 'var(--ink-2)', margin: '6px 0 0' }}>Roles you’ve bookmarked to revisit.</p>
        </div>
        <Btn variant="outline" icon="briefcase" onClick={() => go('jobs')}>Browse all roles</Btn>
      </div>
      {saved.length === 0 ? (
        <Card><EmptyState icon="bookmark" title="No saved jobs yet" body="Browse the board and save roles that interest you, they’ll collect here."
          action={<Btn variant="primary" icon="briefcase" onClick={() => go('jobs')}>Go to jobs</Btn>} /></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1.4fr)', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {saved.map(j => <JobListItem key={j.id} job={j} meId={meId} active={sel && sel.id === j.id} onClick={() => setSel(j)} go={go} />)}
          </div>
          <div style={{ position: 'sticky', top: 86 }}>{sel && <JobDetail job={sel} meId={meId} go={go} undergrad={role === 'undergrad'} />}</div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Jobs, RecruiterJobs, SavedJobs, SaveJobBtn });
