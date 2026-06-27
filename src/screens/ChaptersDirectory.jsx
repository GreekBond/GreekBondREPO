// ChaptersDirectory.jsx: every chapter on GreekBond, searchable + filterable.
import React from 'react';
const { useState: useStateCD } = React;
const { Icon, Crest, Btn, Card, EmptyState, CH, tint } = window;

function ChapterDirCard({ id, go }) {
  const c = CH(id);
  const [following, setFollowing] = useStateCD(false);
  return (
    <Card pad={0} hover onClick={() => go('chapter', { id })}
      style={{ '--chapter': c.color, '--chapter-ink': c.ink, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 64, background: `linear-gradient(120deg, var(--chapter), ${tint(c.color, .2)})`, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .18, background: 'repeating-linear-gradient(45deg, transparent, transparent 9px, rgba(255,255,255,.6) 9px, rgba(255,255,255,.6) 10px)' }} />
      </div>
      <div style={{ padding: '0 18px 18px', display: 'flex', gap: 14, marginTop: -22 }}>
        <div style={{ flex: 'none', border: '3px solid var(--surface)', borderRadius: '50%', background: 'var(--surface)' }}>
          <Crest chapterId={id} size={52} ring={false} />
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: 'var(--chapter-ink)' }}>{c.name}</span>
            <span style={{ fontSize: 15, color: 'var(--chapter)', fontWeight: 600 }}>{c.letters}</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>
            {[c.school, c.founded ? `Founded ${c.founded}` : null].filter(Boolean).join(' · ') || '-'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6, display: 'flex', gap: 14 }}>
            <span><strong style={{ color: 'var(--ink)' }}>{c.members || 0}</strong> members</span>
            <span><strong style={{ color: 'var(--ink)' }}>{(c.alumni || 0).toLocaleString()}</strong> alumni</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <Btn variant={following ? 'subtle' : 'outline'} size="sm" icon={following ? 'check' : 'plus'}
              onClick={(e) => { e.stopPropagation(); setFollowing(v => !v); window.__notify && window.__notify(following ? 'Unfollowed' : `Following ${c.letters}`); }}>
              {following ? 'Following' : 'Follow'}</Btn>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ChaptersDirectory({ go }) {
  const [q, setQ] = useStateCD('');
  const [org, setOrg] = useStateCD('All');
  const all = Object.values(window.GB.CHAPTERS || {});
  const orgs = ['All', 'NIC', 'NPC', 'IFC', 'Panhellenic'];
  const ql = q.trim().toLowerCase();
  const filtered = all.filter(c => {
    if (org !== 'All' && c.council !== org && c.kind !== org) return false;
    if (!ql) return true;
    return [c.name, c.letters, c.school].filter(Boolean).some(s => String(s).toLowerCase().includes(ql));
  });

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: 0 }}>Greek Houses</h1>
        <p style={{ fontSize: 14.5, color: 'var(--ink-2)', margin: '6px 0 0' }}>Every chapter on GreekBond.</p>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)' }}><Icon name="search" size={19} /></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, letters, or school"
            style={{ width: '100%', height: 46, borderRadius: 999, border: '1px solid var(--border)', background: '#faf8f2', padding: '0 18px 0 42px', fontSize: 14.5, outline: 'none' }}
            onFocus={e => { e.target.style.borderColor = 'var(--navy)'; e.target.style.background = '#fff'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = '#faf8f2'; }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {orgs.map(o => (
            <button key={o} onClick={() => setOrg(o)} style={{ border: org === o ? '1.5px solid var(--navy)' : '1px solid var(--border)', background: org === o ? 'var(--navy)' : 'var(--surface)',
              color: org === o ? '#fff' : 'var(--navy)', borderRadius: 999, padding: '7px 15px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{o === 'All' ? 'All councils' : o}</button>
          ))}
        </div>
      </Card>

      {all.length === 0 ? (
        <Card><EmptyState icon="building" title="No chapters yet" body="When houses join GreekBond, they’ll appear here." /></Card>
      ) : filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', color: 'var(--ink-2)', padding: 40 }}>No chapters match your search.</Card>
      ) : (
        <div className="gb-cards-280" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(c => <ChapterDirCard key={c.id} id={c.id} go={go} />)}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ChaptersDirectory, ChapterDirCard });
