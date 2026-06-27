// SearchResults.jsx: full search results page. Reached from the typeahead when
// a member selects a company, job title, or school facet, or presses enter on a
// free-text keyword. Pulls matching people live from Supabase (RLS-aware), then
// renders the same cards the directory uses (NetCard for members, TalentCard
// for recruiters). UI copy is sentence case with no em dashes.
import React from 'react';
import { searchPeople } from '../lib/db.js';
const { useState: useStateSR, useEffect: useEffectSR } = React;
const { Icon, Card, EmptyState, Btn, P, CH, SaveSearchButton, AnimateIn } = window;

const FIELD_LABEL = { company: 'Company', title: 'Job title', school: 'School', keyword: 'Search' };

function SearchResults({ params, go, meId, role, bond, selfId }) {
  const field = (params && params.field) || 'keyword';
  const value = (params && (params.value || params.q)) || '';
  const recruiter = role === 'recruiter';
  const [ids, setIds] = useStateSR(null);   // null = loading
  const [err, setErr] = useStateSR(false);

  useEffectSR(() => {
    let live = true;
    setIds(null); setErr(false);
    (async () => {
      try {
        const rows = window.searchPeople ? await window.searchPeople({ field, value }) : await searchPeople({ field, value });
        if (!live) return;
        // merge fetched profiles into the cache so P(id) and the cards resolve;
        // keep any already-hydrated entry (it carries bond state).
        window.GB.PEOPLE = window.GB.PEOPLE || {};
        for (const p of rows) if (!window.GB.PEOPLE[p.id]) window.GB.PEOPLE[p.id] = p;
        setIds(rows.filter(p => p.id !== meId).map(p => p.id));
      } catch (e) {
        console.warn('[search] results failed:', e?.message || e);
        if (live) { setErr(true); setIds([]); }
      }
    })();
    return () => { live = false; };
  }, [field, value, meId]);

  const NetCard = window.NetCard;
  const TalentCard = window.TalentCard;
  const count = ids ? ids.length : 0;
  const label = FIELD_LABEL[field] || 'Search';

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>
          <Icon name="search" size={15} /> {label}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '6px 0 0' }}>
          Results for {value || 'your search'}
        </h1>
        {ids && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0 }}>
              {count} {count === 1 ? 'member' : 'members'} found{recruiter ? ' · restricted view' : ''}
            </p>
            {SaveSearchButton && (selfId || meId) && (
              <SaveSearchButton profileId={selfId || meId} query={value} filters={{ scope: 'keyword', field }} />
            )}
          </div>
        )}
      </div>

      {ids === null && (
        <Card style={{ textAlign: 'center', color: 'var(--ink-2)', padding: 40 }}>Searching…</Card>
      )}

      {ids && ids.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: recruiter ? 'repeat(auto-fill, minmax(296px, 1fr))' : 'repeat(auto-fill, minmax(232px, 1fr))', gap: 16 }}>
          {ids.map((id, i) => (
            <AnimateIn key={id} index={i}>
              {recruiter
                ? <TalentCard id={id} go={go} />
                : <NetCard id={id} meId={meId} go={go} bond={bond} />}
            </AnimateIn>
          ))}
        </div>
      )}

      {ids && ids.length === 0 && (
        <Card>
          <EmptyState icon="search"
            title={err ? 'Search is unavailable' : 'No matches found'}
            body={err
              ? 'Something went wrong running that search. Please try again.'
              : `No members matched ${value || 'that search'}. Try a different name, company or title.`}
            action={<Btn variant="primary" icon="network" onClick={() => go(recruiter ? 'talent' : 'network')}>Browse the directory</Btn>} />
        </Card>
      )}
    </div>
  );
}

Object.assign(window, { SearchResults });
