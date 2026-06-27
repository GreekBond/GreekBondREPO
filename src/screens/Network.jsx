// Network.jsx: directory. Member variant is Bonds, recruiter variant is Search Talent.
import React from 'react';
import { viewerCanAccess, requiredTierLabel } from '../lib/plan.js';
const { useState: useStateNet, useEffect: useEffectNet, useMemo: useMemoNet, useRef: useRefNet } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf, SavedSearchesList, SaveSearchButton } = window;
const { AnimateIn } = window;

function filterChip(active, onClick, children, key) {
  return (
    <button key={key} onClick={onClick} style={{ border: active ? '1.5px solid var(--navy)' : '1px solid var(--border)',
      background: active ? 'var(--navy)' : 'var(--surface)', color: active ? '#fff' : 'var(--navy)',
      borderRadius: 999, padding: '7px 15px', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', cursor: 'pointer' }}>{children}</button>
  );
}

function ViewToggle({ view, setView }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: '#efece5', padding: 4, borderRadius: 999 }}>
      {[['list', 'List', 'network'], ['map', 'Map', 'globe']].map(([v, lb, ic]) => (
        <button key={v} onClick={() => setView(v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 999,
          padding: '7px 15px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          background: view === v ? 'var(--surface)' : 'transparent', color: view === v ? 'var(--navy)' : 'var(--ink-2)', boxShadow: view === v ? 'var(--shadow-sm)' : 'none' }}>
          <Icon name={ic} size={16} stroke={2.1} />{lb}</button>
      ))}
    </div>
  );
}

function useDirectory(meId, initial) {
  const ALL = Object.keys(window.GB.PEOPLE).filter(k => k !== meId);
  const [org, setOrg] = useStateNet((initial && initial.org) || 'All');
  const [open, setOpen] = useStateNet((initial && initial.open) || 'any');
  const [year, setYear] = useStateNet((initial && initial.year) || 'All');
  const orgs = ['All', ...Array.from(new Set(ALL.map(id => P(id).chapter)))];
  const filtered = ALL.filter(id => {
    const p = P(id);
    if (org !== 'All' && p.chapter !== org) return false;
    if (open === 'hiring' && p.open !== 'hiring') return false;
    if (open === 'work' && p.open !== 'work') return false;
    if (year === 'Actives' && p.role !== 'undergrad') return false;
    if (year === 'Alumni' && p.role !== 'alumni') return false;
    return true;
  });
  return { filtered, total: ALL.length, org, setOrg, open, setOpen, year, setYear, orgs };
}

/* MEMBER: Bonds directory. The Bond page surfaces real saved searches in the
   left rail. When navigated to with params.savedSearch, the filter state is
   rehydrated from the saved row so the round trip restores filters, not just
   the text query. */
// Shared directory state for both the desktop and mobile variants. Extracted so
// the two layouts stay single-sourced (no filter-logic drift) while the M1/M2
// component-type dispatch keeps hook counts stable across a resize.
function useDirectoryViewState(meId, params) {
  const me = P(meId);
  const [view, setView] = useStateNet('list');
  const savedFilters = (params && params.savedSearch && params.savedSearch.filters) || null;
  const savedQuery = (params && params.savedSearch && params.savedSearch.query) || '';
  const initTab = (savedFilters && savedFilters.tab) || (params && params.tab === 'bonds' ? 'bonds' : 'all');
  const [tab, setTab] = useStateNet(initTab);
  const [query, setQuery] = useStateNet(savedQuery);
  const { filtered, total, org, setOrg, open, setOpen, year, setYear, orgs } = useDirectory(meId, savedFilters || {});

  useEffectNet(() => {
    if (!params || !params.savedSearch) return;
    const f = params.savedSearch.filters || {};
    if (f.tab) setTab(f.tab);
    if (f.org) setOrg(f.org);
    if (f.open) setOpen(f.open);
    if (f.year) setYear(f.year);
    setQuery(params.savedSearch.query || '');
  }, [params && params.savedSearchId]);

  const matchesQuery = (id) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const p = P(id) || {};
    const hay = [p.name, p.headline, p.title, p.company, p.location, p.school, p.industry, ...(p.skills || [])]
      .filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  };
  const baseShown = tab === 'bonds' ? filtered.filter(id => P(id) && P(id).bonded) : filtered;
  const shown = baseShown.filter(matchesQuery);
  const reqIds = ['tessa', 'kofi'].filter(id => P(id));

  const currentFilters = { scope: 'bonds', tab, org, open, year };
  return { me, view, setView, tab, setTab, query, setQuery, filtered, total, org, setOrg, open, setOpen, year, setYear, orgs, shown, reqIds, currentFilters };
}

function NetworkDirectoryDesktop({ meId, go, bond, params }) {
  const { me, view, setView, tab, setTab, query, total, org, setOrg, open, setOpen, year, setYear, orgs, shown, reqIds, currentFilters } = useDirectoryViewState(meId, params);
  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: 0 }}>{tab === 'bonds' ? 'Your bonds' : 'The directory'}</h1>
        <ViewToggle view={view} setView={setView} />
      </div>
      {view === 'list' && (
        <div style={{ display: 'flex', gap: 4, background: '#efece5', padding: 4, borderRadius: 999, width: 'fit-content', marginBottom: 16 }}>
          {[['all', 'All members'], ['bonds', 'My bonds']].map(([v, lb]) => (
            <button key={v} onClick={() => setTab(v)} style={{ border: 'none', borderRadius: 999, padding: '8px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              background: tab === v ? 'var(--surface)' : 'transparent', color: tab === v ? 'var(--navy)' : 'var(--ink-2)', boxShadow: tab === v ? 'var(--shadow-sm)' : 'none' }}>
              {lb}{v === 'bonds' && window.GB.BOND_COUNT ? ` · ${window.GB.BOND_COUNT}` : ''}</button>
          ))}
        </div>
      )}
      {view === 'map' ? (viewerCanAccess('alumniMap', meId)
        ? <window.AlumniMap meId={meId} go={go} bond={bond} />
        : <div style={{ padding: '40px 16px' }}><window.UpgradeLock icon="map" feature="Alumni map" tier={requiredTierLabel('alumniMap')} go={go} /></div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '256px minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
      {/* Left rail */}
      <div style={{ position: 'sticky', top: 86, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>You’re bonded with</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.1, margin: '2px 0' }}>{window.GB.BOND_COUNT || 0} <span style={{ fontSize: 15, fontFamily: 'var(--font-ui)', color: 'var(--ink-2)', fontWeight: 500 }}>{me.chapter && CH(me.chapter).plural}</span></div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>across <strong style={{ color: 'var(--gold-deep)' }}>14 chapters</strong> and 9 industries</div>
        </Card>
        {reqIds.length > 0 && <Card pad={0}>
          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Bond requests</span><Pill tone="gold">{reqIds.length}</Pill>
          </div>
          {reqIds.map(id => {
            const p = P(id);
            return (
              <div key={id} style={{ padding: '11px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Avatar personId={id} size={40} onClick={() => go('profile', { id })} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</div>
                  <div style={{ marginBottom: 7 }}><WarmSignal person={p} viewerId={meId} size={11} max={1} /></div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn variant="primary" size="sm" icon="bond" onClick={() => bond && bond(p)}>Bond back</Btn>
                    <button onClick={() => window.__notify && window.__notify('Request ignored')} style={{ border: '1px solid var(--border)', background: 'none', borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>Ignore</button>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>}
        {SavedSearchesList && <SavedSearchesList profileId={meId} go={go} scopeHint="bonds" />}
      </div>

      <div>
        <Card style={{ marginBottom: 16 }}>
          <SearchBox go={go} placeholder="Search people, companies or chapters" />
          <FilterRows orgs={orgs} org={org} setOrg={setOrg} open={open} setOpen={setOpen} year={year} setYear={setYear} workLabel="Looking for work" />
        </Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 4px 12px', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}><strong style={{ color: 'var(--ink)' }}>{shown.length}</strong> {shown.length === 1 ? 'member' : 'members'} {tab === 'bonds' ? 'bonded' : 'match'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {SaveSearchButton && <SaveSearchButton profileId={meId} query={query} filters={currentFilters} />}
            <span style={{ fontSize: 13, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 }}>Sort: Strongest bond <Icon name="chevron" size={15} /></span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))', gap: 16 }}>
          {shown.map(id => <NetCard key={id} id={id} meId={meId} go={go} bond={bond} />)}
        </div>
        {shown.length === 0 && (tab === 'bonds'
          ? <Card><EmptyState icon="bond" title="No bonds yet" body="Your bonds will live here, start by bonding with brothers and sisters in the directory." action={<Btn variant="primary" icon="network" onClick={() => setTab('all')}>Browse the directory</Btn>} /></Card>
          : total === 0
            ? <Card><EmptyState icon="bond" title="No members yet" body="No members yet. Invite your brothers and sisters to join, and the bonds you make will live here." /></Card>
            : <Card style={{ textAlign: 'center', color: 'var(--ink-2)', padding: 40 }}>No members match these filters.</Card>)}
      </div>
      </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Session M3: mobile filter sheet (≤640px), shared by the member directory and
   recruiter talent search. Results are the full-width primary view; the desktop
   filter rail moves into a bottom sheet summoned by a "Filters" button.

   Live vs apply: structured filters are edited as a DRAFT inside the sheet and
   committed only on Apply. Reasoning: these screens have many filters (talent has
   up to seven), and the sheet covers the results, so live-updating would re-run
   the filter over results the user cannot even see and produce a jarring jump on
   close, with no clear commit moment. A draft plus explicit Apply is deliberate,
   avoids wasted re-renders of the hidden list, and gives "Clear all" + "Apply"
   crisp semantics. Two deliberate exceptions stay live because their result is
   visible and a commit step would only add friction: the free-text keyword field
   (search as you type) and the inline active-filter chips (tap the x to remove
   one filter instantly).

   The sheet uses the Session G / M1 overlay tokens (gb-fade backdrop, gb-sheet-up
   panel, reduced-motion safe), locks body scroll, and traps focus, mirroring the
   M1 MoreSheet.
   ════════════════════════════════════════════════════════════════════════════ */
function FilterSheet({ title, applyCount, onApply, onClear, onClose, children }) {
  const reduced = window.useReducedMotion ? window.useReducedMotion() : false;
  const panelRef = useRefNet(null);
  useEffectNet(() => {
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    const focusables = () => panel ? panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') : [];
    const first = focusables()[0];
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const els = focusables(); if (!els.length) return;
      const f = els[0], l = els[els.length - 1];
      if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
      else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    };
  }, []);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(17,27,61,.5)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: reduced ? 'none' : 'gb-fade var(--motion-base) var(--ease-out)' }}>
      <div ref={panelRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}
        style={{ background: 'var(--surface)', borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '88dvh',
          display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)',
          animation: reduced ? 'none' : 'gb-sheet-up var(--motion-base) var(--ease-out)' }}>
        <div style={{ flex: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
            <span style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--border)' }} /></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 18px 12px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600 }}>{title}</h2>
            <button onClick={onClose} aria-label="Close filters" style={{ flex: 'none', width: 40, height: 40, borderRadius: 999, background: 'var(--navy-50)',
              border: 'none', color: 'var(--navy)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="x" size={18} stroke={2.2} /></button>
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {children}
        </div>
        <div style={{ flex: 'none', borderTop: '1px solid var(--border)', padding: '12px 18px calc(12px + env(safe-area-inset-bottom))', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={onClear} style={{ flex: 'none', minHeight: 44, background: 'none', border: '1px solid var(--border)', borderRadius: 999,
            padding: '0 18px', fontSize: 13.5, fontWeight: 700, color: 'var(--ink-2)', cursor: 'pointer' }}>Clear all</button>
          <Btn variant="primary" full onClick={onApply} style={{ minHeight: 44 }}>Apply{applyCount ? ` · ${applyCount}` : ''}</Btn>
        </div>
      </div>
    </div>
  );
}

// The sticky filter affordance on the results page: a "Filters" button with an
// active-count badge, plus an optional removable chip strip of committed filters.
function FilterBar({ activeCount, onOpen, chips }) {
  return (
    <div>
      <button onClick={onOpen} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44,
        border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 999, padding: '0 16px',
        fontSize: 14, fontWeight: 700, color: 'var(--navy)', cursor: 'pointer' }}>
        <Icon name="filter" size={17} stroke={2.2} />Filters
        {activeCount > 0 && <span style={{ background: 'var(--navy)', color: '#fff', borderRadius: 999, minWidth: 20, height: 20,
          padding: '0 6px', fontSize: 12, fontWeight: 700, display: 'inline-grid', placeItems: 'center' }}>{activeCount}</span>}
      </button>
      {chips && chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {chips.map(c => (
            <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--navy-50)',
              border: '1px solid var(--navy-100)', borderRadius: 999, padding: '5px 6px 5px 12px', fontSize: 12.5, fontWeight: 600, color: 'var(--navy)' }}>
              {c.label}
              <button onClick={c.onRemove} aria-label={`Remove ${c.label}`} style={{ flex: 'none', width: 24, height: 24, borderRadius: 999,
                border: 'none', background: 'var(--navy-100)', color: 'var(--navy)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <Icon name="x" size={12} stroke={2.6} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function NetworkDirectoryMobile({ meId, go, bond, params }) {
  const { me, view, setView, tab, setTab, query, total, org, setOrg, open, setOpen, year, setYear, orgs, shown, reqIds, currentFilters } = useDirectoryViewState(meId, params);
  const [sheetOpen, setSheetOpen] = useStateNet(false);
  const [draft, setDraft] = useStateNet(null);

  const openSheet = () => { setDraft({ org, open, year }); setSheetOpen(true); };
  const applySheet = () => { if (draft) { setOrg(draft.org); setOpen(draft.open); setYear(draft.year); } setSheetOpen(false); };
  const clearSheet = () => setDraft({ org: 'All', open: 'any', year: 'All' });
  const d = draft || { org, open, year };

  const activeCount = (org !== 'All' ? 1 : 0) + (open !== 'any' ? 1 : 0) + (year !== 'All' ? 1 : 0);
  const draftCount = (d.org !== 'All' ? 1 : 0) + (d.open !== 'any' ? 1 : 0) + (d.year !== 'All' ? 1 : 0);
  const chips = [];
  if (org !== 'All') chips.push({ key: 'org', label: CH(org).letters, onRemove: () => setOrg('All') });
  if (open !== 'any') chips.push({ key: 'open', label: open === 'hiring' ? 'Open to hiring' : 'Looking for work', onRemove: () => setOpen('any') });
  if (year !== 'All') chips.push({ key: 'year', label: year, onRemove: () => setYear('All') });

  const Header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>{tab === 'bonds' ? 'Your bonds' : 'The directory'}</h1>
      <ViewToggle view={view} setView={setView} />
    </div>
  );

  if (view === 'map') {
    return (
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '16px 14px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Header}
        {viewerCanAccess('alumniMap', meId)
          ? <window.AlumniMap meId={meId} go={go} bond={bond} />
          : <window.UpgradeLock icon="map" feature="Alumni map" tier={requiredTierLabel('alumniMap')} go={go} compact />}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '16px 14px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Header}

      {/* stats context */}
      <Card>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>You’re bonded with</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.1, margin: '2px 0' }}>{window.GB.BOND_COUNT || 0} <span style={{ fontSize: 15, fontFamily: 'var(--font-ui)', color: 'var(--ink-2)', fontWeight: 500 }}>{me.chapter && CH(me.chapter).plural}</span></div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>across <strong style={{ color: 'var(--gold-deep)' }}>14 chapters</strong> and 9 industries</div>
      </Card>

      {/* tab segmented */}
      <div style={{ display: 'flex', gap: 4, background: '#efece5', padding: 4, borderRadius: 999, width: 'fit-content' }}>
        {[['all', 'All members'], ['bonds', 'My bonds']].map(([v, lb]) => (
          <button key={v} onClick={() => setTab(v)} style={{ border: 'none', borderRadius: 999, padding: '8px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            background: tab === v ? 'var(--surface)' : 'transparent', color: tab === v ? 'var(--navy)' : 'var(--ink-2)', boxShadow: tab === v ? 'var(--shadow-sm)' : 'none' }}>
            {lb}{v === 'bonds' && window.GB.BOND_COUNT ? ` · ${window.GB.BOND_COUNT}` : ''}</button>
        ))}
      </div>

      <FilterBar activeCount={activeCount} onOpen={openSheet} chips={chips} />

      {SavedSearchesList && <SavedSearchesList profileId={meId} go={go} scopeHint="bonds" />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '0 2px' }}>
        <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}><strong style={{ color: 'var(--ink)' }}>{shown.length}</strong> {shown.length === 1 ? 'member' : 'members'} {tab === 'bonds' ? 'bonded' : 'match'}</span>
        {SaveSearchButton && <SaveSearchButton profileId={meId} query={query} filters={currentFilters} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {shown.map(id => <NetCard key={id} id={id} meId={meId} go={go} bond={bond} />)}
      </div>
      {shown.length === 0 && (tab === 'bonds'
        ? <Card><EmptyState icon="bond" title="No bonds yet" body="Your bonds will live here, start by bonding with brothers and sisters in the directory." action={<Btn variant="primary" icon="network" onClick={() => setTab('all')}>Browse the directory</Btn>} /></Card>
        : total === 0
          ? <Card><EmptyState icon="bond" title="No members yet" body="No members yet. Invite your brothers and sisters to join, and the bonds you make will live here." /></Card>
          : <Card style={{ textAlign: 'center', color: 'var(--ink-2)', padding: 40 }}>No members match these filters.</Card>)}

      {/* bond requests, secondary, also surfaced via the nav badge */}
      {reqIds.length > 0 && (
        <Card pad={0}>
          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Bond requests</span><Pill tone="gold">{reqIds.length}</Pill>
          </div>
          {reqIds.map(id => {
            const p = P(id);
            return (
              <div key={id} style={{ padding: '11px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Avatar personId={id} size={40} onClick={() => go('profile', { id })} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</div>
                  <div style={{ marginBottom: 7 }}><WarmSignal person={p} viewerId={meId} size={11} max={1} /></div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn variant="primary" size="sm" icon="bond" onClick={() => bond && bond(p)}>Bond back</Btn>
                    <button onClick={() => window.__notify && window.__notify('Request ignored')} style={{ border: '1px solid var(--border)', background: 'none', borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>Ignore</button>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {sheetOpen && (
        <FilterSheet title="Filter the directory" applyCount={draftCount} onApply={applySheet} onClear={clearSheet} onClose={() => setSheetOpen(false)}>
          <FilterRows orgs={orgs}
            org={d.org} setOrg={v => setDraft(p => ({ ...(p || { org, open, year }), org: v }))}
            open={d.open} setOpen={v => setDraft(p => ({ ...(p || { org, open, year }), open: v }))}
            year={d.year} setYear={v => setDraft(p => ({ ...(p || { org, open, year }), year: v }))}
            workLabel="Looking for work" />
        </FilterSheet>
      )}
    </div>
  );
}

function NetworkDirectory(props) {
  const isMobile = window.useIsMobile();
  return isMobile ? <NetworkDirectoryMobile {...props} /> : <NetworkDirectoryDesktop {...props} />;
}

function NetCard({ id, meId, go, bond }) {
  const p = P(id);
  const ch = CH(p.chapter);
  const { state: bState } = window.bondState ? window.bondState(meId, id) : { state: p.bonded ? 'bonded' : 'none' };
  const bCfg = (window.BOND_BTN_CFG && window.BOND_BTN_CFG[bState]) || { variant: 'outline', icon: 'bond', label: 'Bond' };
  return (
    <Card pad={0} hover style={{ '--chapter': ch.color, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 58, background: `linear-gradient(110deg, var(--chapter), ${tint(ch.color, .28)})`, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .2, background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,.5) 8px, rgba(255,255,255,.5) 9px)' }} />
        {p.open && <div style={{ position: 'absolute', top: 8, right: 8 }}><Pill tone={p.open === 'hiring' ? 'gold' : 'success'}>{p.open === 'hiring' ? 'Hiring' : 'Open to work'}</Pill></div>}
      </div>
      <div style={{ padding: '0 16px 16px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginTop: -32, display: 'flex', justifyContent: 'center' }}>
          <div style={{ border: '3px solid var(--surface)', borderRadius: '50%', background: 'var(--surface)' }}><Avatar personId={id} size={64} onClick={() => go('profile', { id })} /></div>
        </div>
        <button onClick={() => go('profile', { id })} style={{ background: 'none', border: 'none', padding: 0, marginTop: 8, fontWeight: 700, fontSize: 15.5, color: 'var(--ink)' }}>{p.name}</button>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4, marginTop: 3, height: 34, overflow: 'hidden' }}>{p.headline}</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 9 }}><WarmSignal person={p} viewerId={meId} size={11} max={2} /></div>
        <div style={{ marginTop: 'auto', paddingTop: 14 }}>
          <Btn variant={bCfg.variant} size="sm" full icon={bCfg.icon} onClick={() => bond && bond(p)}>{bCfg.label}</Btn>
        </div>
      </div>
    </Card>
  );
}

/* ───────────────── RECRUITER: Search Talent ─────────────────
   Recruiter-safe directory. The source (window.GB.PEOPLE) is hydrated from
   public.profiles_recruiter_view, which is granted to authenticated and only
   exposes career fields: id, name, headline, company, title, location, industry,
   skills, offers, open, seeking_tags, seeking, chapter_id, school, class_year,
   grad_year, verified, created_at. Lineage, pledge_class, big_id, line_name,
   honors, about, email, positions are not in the view, so the database itself
   refuses to return them to a recruiter session. Filtering here is a UX
   convenience, not a privacy gate. */
// Shared recruiter talent-search state, extracted for the desktop/mobile split.
function useTalentSearchState(selfId, params) {
  const [view, setView] = useStateNet('list');
  const allIds = useMemoNet(
    () => Object.keys(window.GB.PEOPLE).filter(id => id !== selfId),
    [selfId]
  );

  const initialFilters = (params && params.savedSearch && params.savedSearch.filters) || {};
  const initialQuery = (params && params.savedSearch && params.savedSearch.query) || '';
  const [query, setQuery] = useStateNet(initialQuery);
  const [industry, setIndustry] = useStateNet(initialFilters.industry || 'Any');
  const [location, setLocation] = useStateNet(initialFilters.location || 'Any');
  const [school, setSchool] = useStateNet(initialFilters.school || 'Any');
  const [skills, setSkills] = useStateNet(Array.isArray(initialFilters.skills) ? initialFilters.skills : []);
  const currentYear = new Date().getFullYear();
  const [gradFrom, setGradFrom] = useStateNet(initialFilters.gradFrom || '');
  const [gradTo, setGradTo] = useStateNet(initialFilters.gradTo || '');
  const [openOnly, setOpenOnly] = useStateNet(!!initialFilters.openOnly);

  useEffectNet(() => {
    if (!params || !params.savedSearch) return;
    const f = params.savedSearch.filters || {};
    setQuery(params.savedSearch.query || '');
    setIndustry(f.industry || 'Any');
    setLocation(f.location || 'Any');
    setSchool(f.school || 'Any');
    setSkills(Array.isArray(f.skills) ? f.skills : []);
    setGradFrom(f.gradFrom || '');
    setGradTo(f.gradTo || '');
    setOpenOnly(!!f.openOnly);
  }, [params && params.savedSearchId]);

  const industries = useMemoNet(
    () => ['Any', ...Array.from(new Set(allIds.map(id => P(id).industry).filter(Boolean))).sort()],
    [allIds]
  );
  const locations = useMemoNet(
    () => ['Any', ...Array.from(new Set(allIds.map(id => P(id).location).filter(Boolean))).sort()],
    [allIds]
  );
  const schools = useMemoNet(
    () => ['Any', ...Array.from(new Set(allIds.map(id => P(id).school).filter(Boolean))).sort()],
    [allIds]
  );
  const skillPool = useMemoNet(() => {
    const set = new Set();
    for (const id of allIds) (P(id).skills || []).forEach(s => set.add(s));
    return Array.from(set).sort();
  }, [allIds]);

  const currentFilters = {
    scope: 'talent',
    industry, location, school, skills, gradFrom, gradTo, openOnly,
  };

  const list = useMemoNet(() => {
    const q = query.trim().toLowerCase();
    const gradMin = gradFrom ? parseInt(gradFrom, 10) : null;
    const gradMax = gradTo ? parseInt(gradTo, 10) : null;
    return allIds.filter(id => {
      const p = P(id);
      if (openOnly && p.open !== 'work') return false;
      if (industry !== 'Any' && p.industry !== industry) return false;
      if (location !== 'Any' && p.location !== location) return false;
      if (school !== 'Any' && p.school !== school) return false;
      if (skills.length && !skills.every(s => (p.skills || []).includes(s))) return false;
      if (gradMin != null && (!p.gradYear || p.gradYear < gradMin)) return false;
      if (gradMax != null && (!p.gradYear || p.gradYear > gradMax)) return false;
      if (q) {
        const hay = [p.name, p.headline, p.title, p.company, p.location, p.school, p.industry, ...(p.skills || [])]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allIds, query, industry, location, school, skills, gradFrom, gradTo, openOnly]);

  const resetFilters = () => {
    setQuery(''); setIndustry('Any'); setLocation('Any'); setSchool('Any');
    setSkills([]); setGradFrom(''); setGradTo(''); setOpenOnly(false);
  };
  const filterActive = query || industry !== 'Any' || location !== 'Any' || school !== 'Any'
    || skills.length || gradFrom || gradTo || openOnly;

  return { view, setView, allIds, query, setQuery, industry, setIndustry, location, setLocation,
    school, setSchool, skills, setSkills, currentYear, gradFrom, setGradFrom, gradTo, setGradTo,
    openOnly, setOpenOnly, industries, locations, schools, skillPool, currentFilters, list, resetFilters, filterActive };
}

function SearchTalentDesktop({ go, selfId, params }) {
  const { view, setView, query, setQuery, industry, setIndustry, location, setLocation, school, setSchool,
    skills, setSkills, currentYear, gradFrom, setGradFrom, gradTo, setGradTo, openOnly, setOpenOnly,
    industries, locations, schools, skillPool, currentFilters, list, resetFilters, filterActive } = useTalentSearchState(selfId, params);

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '24px 16px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>
            <Icon name="search" size={15} /> Search talent</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '6px 0 0' }}>The Greek talent pool</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '5px 0 0', maxWidth: 640 }}>
            Verified members across the network. You see career fields only. Intros are brokered through the chapter, never sent directly.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Open to work only</span><Toggle on={openOnly} set={setOpenOnly} /></div>
          <ViewToggle view={view} setView={setView} />
        </div>
      </div>

      {view === 'map' ? <window.AlumniMap recruiter selfId={selfId} go={go} /> : (
        <>
          {SavedSearchesList && (
            <div style={{ marginBottom: 16 }}>
              <SavedSearchesList profileId={selfId} go={go} scopeHint="talent" />
            </div>
          )}
          <Card style={{ marginBottom: 16 }}>
            <SearchBox go={go} placeholder="Search by name, title, company, or skill" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14, alignItems: 'flex-end' }}>
              <SelectFilter label="Industry" value={industry} options={industries} onChange={setIndustry} />
              <SelectFilter label="Location" value={location} options={locations} onChange={setLocation} />
              <SelectFilter label="School" value={school} options={schools} onChange={setSchool} />
              <GradYearFilter from={gradFrom} to={gradTo} onFrom={setGradFrom} onTo={setGradTo} hint={`e.g. ${currentYear - 6} to ${currentYear}`} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Skills</span>
                <SkillsPicker pool={skillPool} value={skills} onChange={setSkills} />
              </div>
              {!!filterActive && (
                <button onClick={resetFilters} style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: 999,
                  padding: '7px 14px', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)', cursor: 'pointer' }}>Clear filters</button>
              )}
            </div>
            {SaveSearchButton && (
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <SaveSearchButton profileId={selfId} query={query} filters={currentFilters} />
              </div>
            )}
          </Card>

          {/* Inline keyword search separate from the nav typeahead, scoped to current results */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, margin: '0 4px 12px' }}>
            <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}><strong style={{ color: 'var(--ink)' }}>{list.length}</strong> candidate{list.length === 1 ? '' : 's'} · restricted view</span>
            <div style={{ position: 'relative', maxWidth: 280, flex: 1 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}><Icon name="search" size={15} /></span>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter results"
                style={{ width: '100%', height: 36, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)',
                  padding: '0 14px 0 34px', fontSize: 13.5, outline: 'none' }} />
            </div>
          </div>

          {list.length === 0 ? (
            <Card><EmptyState icon="search" title="No matches yet" body="No matches yet, keep refining your search." /></Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(296px, 1fr))', gap: 16 }}>
              {list.map((id, i) => <AnimateIn key={id} index={i}><TalentCard id={id} go={go} /></AnimateIn>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SearchTalentMobile({ go, selfId, params }) {
  const { view, setView, query, setQuery, industry, setIndustry, location, setLocation, school, setSchool,
    skills, setSkills, currentYear, gradFrom, setGradFrom, gradTo, setGradTo, openOnly, setOpenOnly,
    industries, locations, schools, skillPool, currentFilters, list } = useTalentSearchState(selfId, params);
  const [sheetOpen, setSheetOpen] = useStateNet(false);
  const [draft, setDraft] = useStateNet(null);

  const snapshot = () => ({ industry, location, school, skills, gradFrom, gradTo, openOnly });
  const openSheet = () => { setDraft(snapshot()); setSheetOpen(true); };
  const applySheet = () => {
    if (draft) {
      setIndustry(draft.industry); setLocation(draft.location); setSchool(draft.school);
      setSkills(draft.skills); setGradFrom(draft.gradFrom); setGradTo(draft.gradTo); setOpenOnly(draft.openOnly);
    }
    setSheetOpen(false);
  };
  const clearSheet = () => setDraft({ industry: 'Any', location: 'Any', school: 'Any', skills: [], gradFrom: '', gradTo: '', openOnly: false });
  const d = draft || snapshot();

  const countOf = (o) => (o.industry !== 'Any' ? 1 : 0) + (o.location !== 'Any' ? 1 : 0) + (o.school !== 'Any' ? 1 : 0)
    + (o.skills.length ? 1 : 0) + (o.gradFrom || o.gradTo ? 1 : 0) + (o.openOnly ? 1 : 0);
  const activeCount = countOf(snapshot());
  const draftCount = countOf(d);

  const gradLabel = gradFrom && gradTo ? `Grad ${gradFrom} to ${gradTo}` : gradFrom ? `Grad ${gradFrom}+` : `Grad up to ${gradTo}`;
  const chips = [];
  if (industry !== 'Any') chips.push({ key: 'ind', label: industry, onRemove: () => setIndustry('Any') });
  if (location !== 'Any') chips.push({ key: 'loc', label: location, onRemove: () => setLocation('Any') });
  if (school !== 'Any') chips.push({ key: 'sch', label: school, onRemove: () => setSchool('Any') });
  skills.forEach(s => chips.push({ key: `sk-${s}`, label: s, onRemove: () => setSkills(skills.filter(x => x !== s)) }));
  if (gradFrom || gradTo) chips.push({ key: 'grad', label: gradLabel, onRemove: () => { setGradFrom(''); setGradTo(''); } });
  if (openOnly) chips.push({ key: 'open', label: 'Open to work', onRemove: () => setOpenOnly(false) });

  const Header = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>
        <Icon name="search" size={15} /> Search talent</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginTop: 6 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>The Greek talent pool</h1>
        <ViewToggle view={view} setView={setView} />
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: '6px 0 0', lineHeight: 1.5 }}>
        Verified members, career fields only. Intros are brokered through the chapter, never sent directly.</p>
    </div>
  );

  if (view === 'map') {
    return (
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '16px 14px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Header}
        <window.AlumniMap recruiter selfId={selfId} go={go} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '16px 14px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Header}

      {SavedSearchesList && <SavedSearchesList profileId={selfId} go={go} scopeHint="talent" />}

      {/* keyword search stays live (search as you type, results visible) */}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}><Icon name="search" size={18} /></span>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, title, company, or skill"
          style={{ width: '100%', height: 46, borderRadius: 999, border: '1px solid var(--border)', background: '#faf8f2', padding: '0 16px 0 42px', fontSize: 14.5, outline: 'none' }} />
      </div>

      <FilterBar activeCount={activeCount} onOpen={openSheet} chips={chips} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '0 2px' }}>
        <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}><strong style={{ color: 'var(--ink)' }}>{list.length}</strong> candidate{list.length === 1 ? '' : 's'} · restricted view</span>
        {SaveSearchButton && <SaveSearchButton profileId={selfId} query={query} filters={currentFilters} />}
      </div>

      {list.length === 0 ? (
        <Card><EmptyState icon="search" title="No matches yet" body="No matches yet, keep refining your search." /></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {list.map((id, i) => <AnimateIn key={id} index={i}><TalentCard id={id} go={go} /></AnimateIn>)}
        </div>
      )}

      {sheetOpen && (
        <FilterSheet title="Filter talent" applyCount={draftCount} onApply={applySheet} onClear={clearSheet} onClose={() => setSheetOpen(false)}>
          <SelectFilter label="Industry" value={d.industry} options={industries} onChange={v => setDraft(p => ({ ...p, industry: v }))} />
          <SelectFilter label="Location" value={d.location} options={locations} onChange={v => setDraft(p => ({ ...p, location: v }))} />
          <SelectFilter label="School" value={d.school} options={schools} onChange={v => setDraft(p => ({ ...p, school: v }))} />
          <GradYearFilter from={d.gradFrom} to={d.gradTo} onFrom={v => setDraft(p => ({ ...p, gradFrom: v }))} onTo={v => setDraft(p => ({ ...p, gradTo: v }))} hint={`e.g. ${currentYear - 6} to ${currentYear}`} />
          <div>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Skills</span>
            <SkillsPicker pool={skillPool} value={d.skills} onChange={v => setDraft(p => ({ ...p, skills: v }))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 2 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Open to work only</span>
            <Toggle on={d.openOnly} set={v => setDraft(p => ({ ...p, openOnly: v }))} />
          </div>
        </FilterSheet>
      )}
    </div>
  );
}

function SearchTalent(props) {
  const isMobile = window.useIsMobile();
  return isMobile ? <SearchTalentMobile {...props} /> : <SearchTalentDesktop {...props} />;
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <div style={{ minWidth: 160 }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)',
          padding: '0 10px', fontSize: 13.5, fontFamily: 'var(--font-ui)', color: 'var(--ink)', outline: 'none', cursor: 'pointer' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function GradYearFilter({ from, to, onFrom, onTo, hint }) {
  return (
    <div style={{ minWidth: 200 }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Grad year</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input value={from} onChange={e => onFrom(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="From" inputMode="numeric"
          style={{ width: '50%', height: 38, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', padding: '0 10px', fontSize: 13.5, outline: 'none' }} />
        <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>to</span>
        <input value={to} onChange={e => onTo(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="To" inputMode="numeric"
          style={{ width: '50%', height: 38, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', padding: '0 10px', fontSize: 13.5, outline: 'none' }} />
      </div>
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
function SkillsPicker({ pool, value, onChange }) {
  const [input, setInput] = useStateNet('');
  const remaining = pool.filter(s => !value.includes(s) && s.toLowerCase().includes(input.toLowerCase())).slice(0, 6);
  const add = (s) => { if (!value.includes(s)) onChange([...value, s]); setInput(''); };
  const remove = (s) => onChange(value.filter(v => v !== s));
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: 4, minHeight: 38, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}>
        {value.map(s => (
          <span key={s} style={{ background: 'var(--navy)', color: 'var(--gold)', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {s}<button onClick={() => remove(s)} aria-label={`Remove ${s}`} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 800 }}>×</button>
          </span>
        ))}
        <input value={input} onChange={e => setInput(e.target.value)} placeholder={value.length ? '' : 'Type to add a skill'}
          style={{ flex: 1, minWidth: 110, border: 'none', background: 'transparent', outline: 'none', fontSize: 13.5, padding: '4px 6px' }} />
      </div>
      {!!input && remaining.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
          {remaining.map(s => (
            <button key={s} onClick={() => add(s)}
              style={{ background: 'var(--gold-soft)', border: '1px solid var(--gold-line)', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: 'var(--navy)', cursor: 'pointer' }}>+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function TalentCard({ id, go }) {
  const p = P(id);
  const ch = CH(p.chapter);
  window.useGBStore();
  const requested = !!window.introBetween('__recruiter', id);
  return (
    <Card pad={0} hover style={{ '--chapter': ch.color, overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
        <Avatar personId={id} size={54} onClick={() => go('profile', { id })} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <button onClick={() => go('profile', { id })} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, fontSize: 15.5, color: 'var(--ink)', textAlign: 'left' }}>{p.name}</button>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4, marginTop: 2 }}>
            {p.title || 'Member'}{p.company ? `, ${p.company}` : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
            <Crest chapterId={p.chapter} size={14} ring={false} />{ch.letters}{p.location ? ` · ${p.location}` : ''}
          </div>
        </div>
        {p.open && <Pill tone={p.open === 'hiring' ? 'gold' : 'success'}>{p.open === 'hiring' ? 'Hiring' : 'Open'}</Pill>}
      </div>
      <div style={{ padding: '12px 18px' }}>
        {(p.industry || p.school || p.gradYear) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {p.industry && <Pill tone="gray">{p.industry}</Pill>}
            {p.school && <Pill tone="gray">{p.school}</Pill>}
            {p.gradYear && <Pill tone="gray">Grad ’{String(p.gradYear).slice(2)}</Pill>}
          </div>
        )}
        {!!(p.skills && p.skills.length) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{p.skills.slice(0, 4).map(s => <Pill key={s} tone="navy">{s}</Pill>)}</div>
        )}
        <div style={{ marginTop: 14 }}>
          {requested
            ? <Btn variant="subtle" size="sm" full icon="check">Intro requested</Btn>
            : <Btn variant="primary" size="sm" full icon="intro" onClick={() => window.__askIntro && window.__askIntro(p, 'intro')}>Request intro via {ch.letters}</Btn>}
        </div>
      </div>
    </Card>
  );
}

/* shared bits, the in-page search now uses the same live typeahead as the top
   nav (window.Typeahead), so members and recruiters get grouped suggestions. */
function SearchBox({ placeholder, go }) {
  const TA = window.Typeahead;
  return (
    <div style={{ marginBottom: 14 }}>
      {TA
        ? <TA variant="page" go={go || ((s, p) => window.__go && window.__go(s, p))} placeholder={placeholder} />
        : (
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)' }}><Icon name="search" size={19} /></span>
            <input placeholder={placeholder} style={{ width: '100%', height: 46, borderRadius: 999, border: '1px solid var(--border)', background: '#faf8f2', padding: '0 18px 0 42px', fontSize: 14.5, outline: 'none' }} />
          </div>
        )}
    </div>
  );
}
function FilterRows({ orgs, org, setOrg, open, setOpen, year, setYear, workLabel, hiringLabel, statusLabel }) {
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginRight: 2 }}>Chapter</span>
        {orgs.map(o => filterChip(org === o, () => setOrg(o), o === 'All' ? 'All chapters' : <><Crest chapterId={o} size={18} ring={false} />{CH(o).letters}</>, o))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginRight: 2 }}>{statusLabel || 'Status'}</span>
        {[['any', 'Everyone'], ['hiring', hiringLabel || 'Open to hiring'], ['work', workLabel || 'Looking for work']].map(([v, l]) => filterChip(open === v, () => setOpen(v), l, v))}
        <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px' }} />
        {['All', 'Actives', 'Alumni'].map(y => filterChip(year === y, () => setYear(y), y, y))}
      </div>
    </>
  );
}

Object.assign(window, { NetworkDirectory, SearchTalent, useDirectory, FilterRows, SearchBox, NetCard, TalentCard });
