// chrome.jsx: role-aware top navigation + prototype role switcher. Exports to window.
import React from 'react';
const { useState: useStateNav, useEffect: useEffectNav, useRef: useRefNav } = React;
const { Icon, Crest, Avatar, P, CH } = window;

/* Real, live nav badge counts (no hardcoded numbers). Sources are the runtime
   store (threads / alerts / intro requests). 0 → null so the badge hides. */
function computeBadges(meId, admin) {
  const threads = (window.allThreads && window.allThreads()) || [];
  const messages = threads.filter(t => (t.unread || 0) > 0).length;

  const store = window.GB_STORE || {};
  const reqs = store.introRequests || [];
  // inbound member requests waiting on the viewer (a pending bond/intro to them)
  const network = reqs.filter(r => r.status === 'pending' && !r.brokered && r.toId === meId).length;
  // brokered recruiter intro requests awaiting action
  const candidates = reqs.filter(r => r.status === 'pending' && r.brokered === true).length;

  const alertsList = admin
    ? ((window.govAlerts && window.govAlerts()) || [])
    : ((window.memberAlerts && window.memberAlerts()) || []);
  const alerts = alertsList.filter(a => a && a.unread).length;

  return {
    network: network || null, messages: messages || null,
    alerts: alerts || null, candidates: candidates || null,
    talent: null, mentorship: null, jobs: null,
  };
}

/* Live typeahead suggestions (People / Chapters / Companies / Job titles /
   Schools) pulled from Supabase with ilike prefix matching. RLS-aware: the db
   layer restricts recruiters to People + recruiter-visible fields. */

const SUGGEST_ICON = { company: 'building', title: 'briefcase', school: 'graduation' };

// One row in the dropdown. `active` drives the keyboard-highlight styling.
function SuggestionRow({ item, active, onSelect, onHover }) {
  const base = {
    width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
    padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 11,
    background: active ? 'var(--gold-soft)' : 'none',
    boxShadow: active ? 'inset 3px 0 0 var(--gold)' : 'none',
  };
  let leading, primary, secondary;
  if (item.kind === 'person') {
    leading = <Avatar personId={item.id} name={item.name} chapterId={item.chapterId || undefined} size={36} />;
    primary = item.name; secondary = item.sub;
  } else if (item.kind === 'chapter') {
    leading = <Crest chapterId={item.id} size={32} ring={false} />;
    primary = `${item.letters} · ${item.name}`; secondary = 'Chapter';
  } else {
    leading = (
      <span style={{ width: 36, height: 36, flex: 'none', borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--navy-50)', color: 'var(--navy)' }}>
        <Icon name={SUGGEST_ICON[item.kind]} size={18} />
      </span>
    );
    primary = item.value;
    secondary = item.kind === 'company' ? 'Company' : item.kind === 'title' ? 'Job title' : 'School';
  }
  return (
    <button onMouseDown={e => { e.preventDefault(); onSelect(item); }} onMouseEnter={onHover} style={base}>
      {leading}
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{primary}</span>
        {secondary && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{secondary}</span>}
      </span>
    </button>
  );
}

function Suggestions({ data, loading, active, onSelect, setActive }) {
  if (loading && (!data || !data.flat.length)) {
    return <div style={{ padding: '18px 16px', fontSize: 13.5, color: 'var(--ink-2)', textAlign: 'center' }}>Searching…</div>;
  }
  if (!data || !data.flat.length) {
    return <div style={{ padding: '18px 16px', fontSize: 13.5, color: 'var(--ink-2)', textAlign: 'center' }}>No matches yet, keep typing.</div>;
  }
  let idx = -1;
  return (
    <div>
      {data.groups.map(g => (
        <div key={g.key}>
          <div style={{ padding: '10px 14px 4px', fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{g.label}</div>
          {g.items.map(it => {
            idx += 1;
            const myIdx = idx;
            return <SuggestionRow key={it.kind + (it.id || it.value)} item={it} active={myIdx === active} onSelect={onSelect} onHover={() => setActive(myIdx)} />;
          })}
        </div>
      ))}
    </div>
  );
}

/* Reusable live typeahead, used by the top nav (all roles) and the in-page
   directory / talent search boxes. RLS handled in db.searchSuggestions, so a
   recruiter automatically gets the restricted People + career-field results. */
function Typeahead({ go, placeholder, variant = 'page', autoFocus = false }) {
  const nav = variant === 'nav';
  const [query, setQuery] = useStateNav('');
  const [sugg, setSugg] = useStateNav(null);
  const [open, setOpen] = useStateNav(false);
  const [loading, setLoading] = useStateNav(false);
  const [active, setActive] = useStateNav(-1);
  const reqRef = useRefNav(0);
  const closeSearch = () => { setOpen(false); setSugg(null); setActive(-1); };
  const resetSearch = () => { setQuery(''); closeSearch(); };

  useEffectNav(() => {
    const term = query.trim();
    if (!term) { setSugg(null); setLoading(false); setActive(-1); return; }
    setOpen(true); setLoading(true);
    const id = ++reqRef.current;
    const t = setTimeout(async () => {
      try {
        const res = window.searchSuggestions ? await window.searchSuggestions(term) : null;
        if (id !== reqRef.current) return;
        setSugg(res || { groups: [], flat: [] });
      } catch (e) {
        if (id !== reqRef.current) return;
        console.warn('[search] suggestions failed:', e?.message || e);
        setSugg({ groups: [], flat: [] });
      } finally {
        if (id === reqRef.current) { setLoading(false); setActive(-1); }
      }
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  const selectItem = (it) => {
    if (!it) return;
    resetSearch();
    if (it.kind === 'person') go('profile', { id: it.id });
    else if (it.kind === 'chapter') go('chapter', { id: it.id });
    else go('search', { field: it.kind, value: it.value, q: it.value });
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { closeSearch(); return; }
    const flat = (sugg && sugg.flat) || [];
    if (e.key === 'ArrowDown') { e.preventDefault(); if (flat.length) setActive(a => (a + 1) % flat.length); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (flat.length) setActive(a => (a <= 0 ? flat.length - 1 : a - 1)); return; }
    if (e.key === 'Enter') {
      if (active >= 0 && flat[active]) { selectItem(flat[active]); return; }
      const term = query.trim();
      if (term) { resetSearch(); go('search', { field: 'keyword', value: term, q: term }); }
    }
  };

  const inputStyle = nav
    ? { width: '100%', height: 38, borderRadius: 999, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.08)', color: '#fff', padding: '0 16px 0 38px', fontSize: 13.5, fontFamily: 'var(--font-ui)', outline: 'none' }
    : { width: '100%', height: 46, borderRadius: 999, border: '1px solid var(--border)', background: '#faf8f2', padding: '0 18px 0 42px', fontSize: 14.5, fontFamily: 'var(--font-ui)', outline: 'none' };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <span style={{ position: 'absolute', left: nav ? 13 : 14, top: '50%', transform: 'translateY(-50%)', color: nav ? 'rgba(255,255,255,.55)' : 'var(--ink-2)', zIndex: 2 }}>
        <Icon name="search" size={nav ? 18 : 19} stroke={2.2} /></span>
      <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKey} autoFocus={autoFocus}
        placeholder={placeholder} role="combobox" aria-expanded={open} aria-autocomplete="list"
        onFocus={e => { if (nav) { e.target.style.background = 'rgba(255,255,255,.14)'; e.target.style.borderColor = 'var(--gold)'; } else { e.target.style.borderColor = 'var(--navy)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px var(--navy-50)'; } if (query.trim()) setOpen(true); }}
        onBlur={e => { if (nav) { e.target.style.background = 'rgba(255,255,255,.08)'; e.target.style.borderColor = 'rgba(255,255,255,.16)'; } else { e.target.style.borderColor = 'var(--border)'; e.target.style.background = '#faf8f2'; e.target.style.boxShadow = 'none'; } }}
        style={inputStyle} />
      {open && query.trim() && (
        <>
          <div onMouseDown={closeSearch} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 61, background: 'var(--surface)',
            borderRadius: 12, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', overflow: 'hidden auto', maxHeight: 440, animation: 'gb-pop var(--motion-fast) var(--ease-out)' }}>
            <Suggestions data={sugg} loading={loading} active={active} onSelect={selectItem} setActive={setActive} />
          </div>
        </>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }) {
  const [hover, setHover] = useStateNav(false);
  // The active gold underline is a single sliding indicator owned by TopNav
  // (data-nav-active marks the target). Each item only animates its own color.
  return (
    <button onClick={onClick} data-nav-active={active ? 'true' : 'false'}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', background: 'none', border: 'none',
        color: active ? 'var(--gold)' : (hover ? '#fff' : 'rgba(255,255,255,.72)'),
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 14px 7px',
        fontSize: 11.5, fontWeight: 600, transition: 'color var(--motion-fast) var(--ease-out)', minWidth: 62, letterSpacing: '.01em' }}>
      <div style={{ position: 'relative' }}>
        <Icon name={icon} size={22} stroke={active ? 2.3 : 2} />
        {badge && <span style={{ position: 'absolute', top: -4, right: -8, background: 'var(--alert)', color: '#fff',
          fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 999, display: 'grid', placeItems: 'center',
          padding: '0 4px', border: '1.5px solid var(--navy)' }}>{badge}</span>}
      </div>
      <span>{label}</span>
    </button>
  );
}

const MEMBER_NAV = [
  ['home', 'Home', 'feed'],
  ['bond', 'Bonds', 'network'],
  ['graduation', 'Mentorship', 'mentorship'],
  ['jobs', 'Jobs', 'jobs'],
  ['message', 'Messages', 'messages'],
  ['bell', 'Alerts', 'alerts'],
];
const RECRUITER_NAV = [
  ['home', 'Home', 'pipeline'],
  ['search', 'Search talent', 'talent'],
  ['jobs', 'Jobs', 'jobs'],
  ['users', 'Candidates', 'candidates'],
  ['message', 'Messages', 'messages'],
];

function DesktopTopNav({ role, screen, mode, setMode, self, go, logout }) {
  const recruiter = role === 'recruiter';
  const admin = role === 'admin';
  const meId = window.GB.ME[role] || 'marcus';
  const me = recruiter ? null : P(meId);
  const nav = recruiter ? RECRUITER_NAV : MEMBER_NAV;

  // Live subscription so badge counts re-render when requests/messages arrive.
  window.useGBStore();
  const badges = computeBadges(meId, admin);

  // Sliding gold nav indicator: measure the active item and move one bar to it,
  // animating transform (and width, on a single out-of-flow element, no reflow).
  const navRef = useRefNav(null);
  const [ind, setInd] = useStateNav({ x: 0, w: 0, ready: false });
  useEffectNav(() => {
    const measure = () => {
      const navEl = navRef.current; if (!navEl) return;
      const target = navEl.querySelector('[data-nav-active="true"]');
      if (!target) { setInd(s => (s.ready ? { ...s, ready: false } : s)); return; }
      const nb = navEl.getBoundingClientRect();
      const tb = target.getBoundingClientRect();
      setInd({ x: tb.left - nb.left, w: tb.width, ready: true });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [screen, role, mode]);

  // DB-backed pending intro count for the admin console nav badge. Subscribe so it
  // re-renders when the queue screen approves/declines, and refresh on mount.
  const introPending = (window.useIntroBadge && window.useIntroBadge()) || 0;
  const adminChapter = admin ? (P(meId) && P(meId).chapter) : null;
  useEffectNav(() => {
    if (admin && mode === 'console' && window.refreshIntroBadge) window.refreshIntroBadge(meId, adminChapter);
  }, [admin, mode, meId, adminChapter]);

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--navy)',
      borderBottom: '1px solid rgba(255,255,255,.08)', boxShadow: '0 2px 12px rgba(0,0,0,.18)' }}>
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', height: 62, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Logo: monogram mark, reversed for the navy nav, routes home */}
        <button onClick={() => go(recruiter ? 'pipeline' : 'feed')} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 11, padding: 0 }}>
          <window.Logo variant="mark" tone="reversed" size={38} />
          {(recruiter || admin) && (
            <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}>
              {recruiter ? 'Employer Console' : 'Chapter Console'}</span>
          )}
        </button>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: recruiter ? 320 : 340 }}>
          <Typeahead variant="nav" go={go} placeholder={recruiter ? 'Search the talent pool' : 'Search people, chapters, jobs'} />
        </div>

        {/* Admin me/console toggle */}
        {admin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,.08)', borderRadius: 999, padding: 3, marginLeft: 'auto' }}>
            {[['you', 'You'], ['console', 'ΘΔΣ Console']].map(([m, lb]) => (
              <button key={m} onClick={() => { setMode(m); go(m === 'console' ? 'console' : 'feed'); }}
                style={{ border: 'none', borderRadius: 999, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  background: mode === m ? 'var(--gold)' : 'transparent', color: mode === m ? '#2c2207' : 'rgba(255,255,255,.78)' }}>{lb}</button>
            ))}
          </div>
        )}

        {/* Nav */}
        <nav ref={navRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2, marginLeft: admin ? 8 : 'auto' }}>
          {ind.ready && (
            <span aria-hidden style={{ position: 'absolute', bottom: -1, left: 0, width: ind.w, height: 3, borderRadius: 3,
              background: 'var(--gold)', transform: `translateX(${ind.x}px)`, pointerEvents: 'none',
              transition: 'transform var(--motion-fast) var(--ease-out), width var(--motion-fast) var(--ease-out)' }} />
          )}
          {(admin && mode === 'console') ? (
            <>
              <NavItem icon="home" label="Console" active={screen === 'console'} onClick={() => go('console')} />
              <NavItem icon="chart" label="Roster" active={screen === 'roster'} onClick={() => go('roster')} />
              <NavItem icon="shield" label="Intros" active={screen === 'intro-requests'} onClick={() => go('intro-requests')} badge={introPending || null} />
              <NavItem icon="bell" label="Alerts" active={screen === 'alerts'} onClick={() => go('alerts')} badge={(window.govAlerts && window.govAlerts().filter(a => a && a.unread).length) || null} />
            </>
          ) : nav.map(([ic, lb, sc]) => (
            <NavItem key={sc} icon={ic} label={lb} active={screen === sc} onClick={() => go(sc)} badge={badges[sc]} />
          ))}

          <div style={{ width: 1, height: 34, background: 'rgba(255,255,255,.12)', margin: '0 8px' }} />

          <AccountMenu role={role} meId={meId} self={self} screen={screen} mode={mode} go={go} logout={logout} recruiter={recruiter} admin={admin} />
        </nav>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Session M1: mobile navigation (≤640px).
   TopNav is now a thin dispatcher: it renders DesktopTopNav unchanged above the
   breakpoint, and MobileNav below it. Splitting on component type (not an early
   return inside one component) keeps the hook count stable across a resize.
   ════════════════════════════════════════════════════════════════════════════ */

// Members → bottom tab bar (4 primary + More). Recruiter/admin → slide-out drawer.
const MEMBER_TABS = [
  ['home', 'Home', 'feed'],
  ['bond', 'Bonds', 'network'],
  ['jobs', 'Jobs', 'jobs'],
  ['message', 'Messages', 'messages'],
];
// Screens that live under "More" (so the More tab shows active for them).
const MEMBER_MORE_SCREENS = ['mentorship', 'alerts', 'profile', 'pricing'];

function TopNav(props) {
  const isMobile = window.useIsMobile();
  return isMobile ? <MobileNav {...props} /> : <DesktopTopNav {...props} />;
}

// Compact monogram mark (reversed for the navy bar), routes home. Shared by
// every mobile pattern (M1 top bar).
function MobileLogo({ go, recruiter, admin, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 9, padding: 0, minWidth: 0 }}>
      <window.Logo variant="mark" tone="reversed" size={32} />
    </button>
  );
}

// Round icon button for the mobile top bar (search, hamburger).
function BarIconBtn({ icon, label, onClick, badge }) {
  return (
    <button onClick={onClick} aria-label={label} style={{ position: 'relative', flex: 'none', width: 40, height: 40, borderRadius: 999,
      background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
      <Icon name={icon} size={20} stroke={2.1} />
      {badge && <span style={{ position: 'absolute', top: -3, right: -3, background: 'var(--alert)', color: '#fff', fontSize: 10, fontWeight: 700,
        minWidth: 16, height: 16, borderRadius: 999, display: 'grid', placeItems: 'center', padding: '0 4px', border: '1.5px solid var(--navy)' }}>{badge}</span>}
    </button>
  );
}

// Slim sticky navy bar: logo + search, plus a hamburger for drawer roles.
function MobileTopBar({ go, recruiter, admin, onSearch, onMenu, drawer }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--navy)',
      borderBottom: '1px solid rgba(255,255,255,.08)', boxShadow: '0 2px 12px rgba(0,0,0,.18)' }}>
      <div style={{ height: 56, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <MobileLogo go={go} recruiter={recruiter} admin={admin} onClick={() => go(recruiter ? 'pipeline' : 'feed')} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarIconBtn icon="search" label="Search" onClick={onSearch} />
          {drawer && <BarIconBtn icon="menu" label="Open menu" onClick={onMenu} />}
        </div>
      </div>
    </header>
  );
}

// Full-screen search sheet. Reuses the Session A Typeahead untouched; selecting a
// result navigates and closes the sheet. Body scroll locked while open.
function MobileSearchOverlay({ go, recruiter, onClose }) {
  useEffectNav(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, []);
  const goAndClose = (s, p) => { onClose(); go(s, p); };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'var(--bg)', animation: 'gb-fade var(--motion-base) var(--ease-out)' }}>
      <div style={{ background: 'var(--navy)', padding: '12px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} aria-label="Close search" style={{ flex: 'none', width: 40, height: 40, borderRadius: 999, background: 'rgba(255,255,255,.08)',
          border: '1px solid rgba(255,255,255,.16)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <Icon name="arrowL" size={20} stroke={2.2} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typeahead variant="nav" go={goAndClose} autoFocus
            placeholder={recruiter ? 'Search the talent pool' : 'Search people, chapters, jobs'} />
        </div>
      </div>
    </div>
  );
}

// One bottom-bar tab: stacked icon + label, gold when active.
function BottomTab({ icon, label, active, onClick, badge }) {
  const reduced = window.useReducedMotion ? window.useReducedMotion() : false;
  return (
    <button onClick={onClick} aria-label={label} aria-current={active ? 'page' : undefined}
      style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 2px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        color: active ? 'var(--gold)' : 'var(--ink-2)',
        transition: reduced ? 'none' : 'color var(--motion-fast) var(--ease-out)' }}>
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
        <Icon name={icon} size={23} stroke={active ? 2.4 : 2} />
        {badge && <span style={{ position: 'absolute', top: -5, right: -9, background: 'var(--alert)', color: '#fff', fontSize: 9.5, fontWeight: 700,
          minWidth: 15, height: 15, borderRadius: 999, display: 'grid', placeItems: 'center', padding: '0 4px', border: '1.5px solid var(--surface)' }}>{badge}</span>}
      </span>
      <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 600, letterSpacing: '.01em' }}>{label}</span>
    </button>
  );
}

// Member bottom tab bar: 4 primary destinations + More. Fixed, safe-area aware.
function BottomTabBar({ screen, go, badges, onMore }) {
  const moreActive = MEMBER_MORE_SCREENS.includes(screen);
  const moreBadge = (badges.alerts || 0) + (badges.mentorship || 0) || null;
  return (
    <nav aria-label="Primary" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
      background: 'var(--surface)', borderTop: '1px solid var(--border)', boxShadow: '0 -2px 14px rgba(17,27,61,.08)',
      paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', height: 58 }}>
        {MEMBER_TABS.map(([ic, lb, sc]) => (
          <BottomTab key={sc} icon={ic} label={lb} active={screen === sc} onClick={() => go(sc)} badge={badges[sc] || null} />
        ))}
        <BottomTab icon="dots" label="More" active={moreActive} onClick={onMore} badge={moreBadge} />
      </div>
    </nav>
  );
}

// Shared row used by the More sheet and the drawer.
function MobileNavRow({ icon, label, sub, active, badge, tone, onClick }) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined} style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
      background: active ? 'var(--navy-50)' : 'none', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 13,
      boxShadow: active ? 'inset 3px 0 0 var(--gold)' : 'none' }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, flex: 'none', display: 'grid', placeItems: 'center',
        background: tone === 'alert' ? '#f7e7e4' : active ? 'var(--navy)' : 'var(--navy-50)',
        color: tone === 'alert' ? 'var(--alert)' : active ? 'var(--gold)' : 'var(--navy)' }}>
        <Icon name={icon} size={18} /></span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: tone === 'alert' ? 'var(--alert)' : 'var(--ink)' }}>{label}</span>
        {sub && <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)' }}>{sub}</span>}
      </span>
      {badge && <span style={{ flex: 'none', background: 'var(--alert)', color: '#fff', fontSize: 11, fontWeight: 700, minWidth: 18, height: 18,
        borderRadius: 999, display: 'grid', placeItems: 'center', padding: '0 5px' }}>{badge}</span>}
    </button>
  );
}

// Bottom sheet for the member "More" tab: the 2 overflow nav items + account.
function MoreSheet({ screen, go, badges, meId, onClose, logout }) {
  useEffectNav(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, []);
  const nav = (s, p) => { onClose(); go(s, p); };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(17,27,61,.5)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'gb-fade var(--motion-base) var(--ease-out)' }}>
      <div onClick={e => e.stopPropagation()} role="menu" style={{ background: 'var(--surface)', borderTopLeftRadius: 18, borderTopRightRadius: 18,
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))', boxShadow: 'var(--shadow-lg)',
        animation: 'gb-sheet-up var(--motion-base) var(--ease-out)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <span style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--border)' }} /></div>
        <div style={{ padding: '4px 0 6px' }}>
          <MobileNavRow icon="graduation" label="Mentorship" active={screen === 'mentorship'} badge={badges.mentorship || null} onClick={() => nav('mentorship')} />
          <MobileNavRow icon="bell" label="Alerts" active={screen === 'alerts'} badge={badges.alerts || null} onClick={() => nav('alerts')} />
        </div>
        <div style={{ borderTop: '1px solid var(--border)', padding: '6px 0' }}>
          <MobileNavRow icon="home" label="View profile" sub="Your letterman record" active={screen === 'profile'} onClick={() => nav('profile', { id: meId })} />
          <MobileNavRow icon="seal" label="GreekBond Plus" sub="See plans & upgrade" active={screen === 'pricing'} onClick={() => nav('pricing')} />
        </div>
        <div style={{ borderTop: '1px solid var(--border)', padding: '6px 0' }}>
          <MobileNavRow icon="arrowL" label="Log out" tone="alert" onClick={() => { onClose(); logout && logout(); }} />
        </div>
      </div>
    </div>
  );
}

// Slide-out drawer for admin/recruiter. Backdrop fade + panel slide from the
// right, body scroll locked, Escape/backdrop close, basic focus trap.
function MobileDrawer({ role, mode, screen, setMode, go, logout, meId, self, badges, introPending, onClose }) {
  const recruiter = role === 'recruiter';
  const admin = role === 'admin';
  const panelRef = useRefNav(null);
  const reduced = window.useReducedMotion ? window.useReducedMotion() : false;

  useEffectNav(() => {
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    const focusables = () => panel ? panel.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])') : [];
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

  const nav = (s, p) => { onClose(); go(s, p); };
  const display = P(meId) || self || {};
  const ch = CH(display.chapter || display.chapter_id);

  // The nav list for this role/mode (mirrors DesktopTopNav exactly).
  let items;
  if (recruiter) {
    items = RECRUITER_NAV.map(([ic, lb, sc]) => ({ icon: ic, label: lb, screen: sc, badge: badges[sc] || null }));
  } else if (admin && mode === 'console') {
    items = [
      { icon: 'home', label: 'Console', screen: 'console' },
      { icon: 'chart', label: 'Roster', screen: 'roster' },
      { icon: 'shield', label: 'Intros', screen: 'intro-requests', badge: introPending || null },
      { icon: 'bell', label: 'Alerts', screen: 'alerts', badge: (window.govAlerts && window.govAlerts().filter(a => a && a.unread).length) || null },
    ];
  } else {
    items = MEMBER_NAV.map(([ic, lb, sc]) => ({ icon: ic, label: lb, screen: sc, badge: badges[sc] || null }));
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(17,27,61,.5)',
      display: 'flex', justifyContent: 'flex-end', animation: 'gb-fade var(--motion-base) var(--ease-out)' }}>
      <div ref={panelRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Menu"
        style={{ width: 'min(86vw, 320px)', height: '100%', background: 'var(--surface)', display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)', animation: reduced ? 'none' : 'gb-drawer-in var(--motion-base) var(--ease-out)' }}>
        {/* header */}
        <div style={{ padding: '14px 14px 14px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid var(--border)' }}>
          {recruiter
            ? <div style={{ width: 42, height: 42, borderRadius: 10, background: '#efe9f5', color: '#5b3b82', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="building" size={21} /></div>
            : <Avatar personId={meId} size={42} />}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {recruiter ? window.GB.RECRUITER.name : display.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {recruiter ? window.GB.RECRUITER.company : admin ? `${ch.letters} Console` : `${ch.letters} · ${display.role === 'undergrad' ? 'Active' : 'Alumnus'}`}</div>
          </div>
          <button onClick={onClose} aria-label="Close menu" style={{ flex: 'none', width: 36, height: 36, borderRadius: 999, background: 'var(--navy-50)',
            border: 'none', color: 'var(--navy)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="x" size={18} stroke={2.2} /></button>
        </div>

        {/* admin you/console toggle */}
        {admin && (
          <div style={{ padding: '12px 14px 6px' }}>
            <div style={{ display: 'flex', gap: 3, background: 'var(--navy-50)', borderRadius: 999, padding: 3 }}>
              {[['you', 'You'], ['console', 'ΘΔΣ Console']].map(([m, lb]) => (
                <button key={m} onClick={() => { setMode(m); nav(m === 'console' ? 'console' : 'feed'); }}
                  style={{ flex: 1, border: 'none', borderRadius: 999, padding: '8px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                    background: mode === m ? 'var(--gold)' : 'transparent', color: mode === m ? '#2c2207' : 'var(--navy)' }}>{lb}</button>
              ))}
            </div>
          </div>
        )}

        {/* nav */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {items.map(it => (
            <MobileNavRow key={it.screen} icon={it.icon} label={it.label} active={screen === it.screen} badge={it.badge} onClick={() => nav(it.screen)} />
          ))}

          <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
            {!recruiter && <MobileNavRow icon="home" label="View profile" sub="Your record" active={screen === 'profile'} onClick={() => nav('profile', { id: meId })} />}
            {recruiter && <MobileNavRow icon="briefcase" label="Talk to sales" sub="Recruiter access, brokered" onClick={() => nav('talent')} />}
            {admin && <MobileNavRow icon="building" label="Chapter billing & plans" sub="Manage your chapter's plan" active={screen === 'chapter-pricing'} onClick={() => nav('chapter-pricing')} />}
          </div>
        </div>

        {/* log out */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '6px 0 calc(6px + env(safe-area-inset-bottom))' }}>
          <MobileNavRow icon="arrowL" label="Log out" tone="alert" onClick={() => { onClose(); logout && logout(); }} />
        </div>
      </div>
    </div>
  );
}

function MobileNav({ role, screen, mode, setMode, self, go, logout }) {
  const recruiter = role === 'recruiter';
  const admin = role === 'admin';
  const meId = window.GB.ME[role] || 'marcus';
  // Same live subscriptions/badges as DesktopTopNav (called unconditionally).
  window.useGBStore();
  const badges = computeBadges(meId, admin);
  const introPending = (window.useIntroBadge && window.useIntroBadge()) || 0;
  const adminChapter = admin ? (P(meId) && P(meId).chapter) : null;
  useEffectNav(() => {
    if (admin && mode === 'console' && window.refreshIntroBadge) window.refreshIntroBadge(meId, adminChapter);
  }, [admin, mode, meId, adminChapter]);

  const drawerRole = recruiter || admin;
  const [searchOpen, setSearchOpen] = useStateNav(false);
  const [moreOpen, setMoreOpen] = useStateNav(false);
  const [drawerOpen, setDrawerOpen] = useStateNav(false);

  // Reserve space so the fixed bottom bar never covers the last bit of content.
  useEffectNav(() => {
    if (drawerRole) return;
    document.body.classList.add('gb-has-bottomnav');
    return () => document.body.classList.remove('gb-has-bottomnav');
  }, [drawerRole]);

  // Close any transient surface when the destination changes.
  useEffectNav(() => { setMoreOpen(false); setDrawerOpen(false); }, [screen, mode]);

  return (
    <>
      <MobileTopBar go={go} recruiter={recruiter} admin={admin} drawer={drawerRole}
        onSearch={() => setSearchOpen(true)} onMenu={() => setDrawerOpen(true)} />

      {!drawerRole && (
        <BottomTabBar screen={screen} go={go} badges={badges} onMore={() => setMoreOpen(true)} />
      )}

      {searchOpen && <MobileSearchOverlay go={go} recruiter={recruiter} onClose={() => setSearchOpen(false)} />}
      {moreOpen && <MoreSheet screen={screen} go={go} badges={badges} meId={meId} logout={logout} onClose={() => setMoreOpen(false)} />}
      {drawerOpen && (
        <MobileDrawer role={role} mode={mode} screen={screen} setMode={setMode} go={go} logout={logout}
          meId={meId} self={self} badges={badges} introPending={introPending} onClose={() => setDrawerOpen(false)} />
      )}
    </>
  );
}

/* ───────────────── Account menu, profile, plans, and the log-out action ───────────────── */
function AccountMenu({ role, meId, self, screen, mode, go, logout, recruiter, admin }) {
  const [open, setOpen] = useStateNav(false);
  const close = () => setOpen(false);
  const nav = (fn) => { close(); fn(); };
  // Window cache first, then the raw Supabase profile (always present for the
  // logged-in user, even before window.GB.PEOPLE is hydrated), then {}. Never
  // crashes on an empty cache. Supabase rows use chapter_id; cache uses chapter.
  const display = P(meId) || self || {};
  const ch = CH(display.chapter || display.chapter_id);

  const Item = ({ icon, label, sub, onClick, tone }) => (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: 'none',
      padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 11 }}
      onMouseEnter={e => e.currentTarget.style.background = '#f7f5ef'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
      <span style={{ width: 30, height: 30, borderRadius: 8, flex: 'none', display: 'grid', placeItems: 'center',
        background: tone === 'alert' ? '#f7e7e4' : 'var(--navy-50)', color: tone === 'alert' ? 'var(--alert)' : 'var(--navy)' }}><Icon name={icon} size={16} /></span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: tone === 'alert' ? 'var(--alert)' : 'var(--ink)' }}>{label}</span>
        {sub && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-2)' }}>{sub}</span>}
      </span>
    </button>
  );

  return (
    <div style={{ position: 'relative' }}>
      {recruiter ? (
        <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px 4px 4px', cursor: 'pointer' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.12)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="building" size={18} /></div>
          <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
            <div style={{ color: '#fff', fontSize: 12.5, fontWeight: 700 }}>{window.GB.RECRUITER.company}</div>
            <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 10.5 }}>{window.GB.RECRUITER.name}</div>
          </div>
          <Icon name="chevron" size={13} stroke={2.4} style={{ color: 'rgba(255,255,255,.6)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
      ) : (
        <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 6px', cursor: 'pointer' }}>
          <Avatar personId={meId} size={30} showCrest={false} />
          <span style={{ color: screen === 'profile' ? 'var(--gold)' : 'rgba(255,255,255,.72)', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            Me <Icon name="chevron" size={12} stroke={2.4} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} /></span>
        </button>
      )}

      {open && (
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 12px)', width: 268, zIndex: 61, background: 'var(--surface)',
            borderRadius: 14, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', overflow: 'hidden', animation: 'gb-pop var(--motion-fast) var(--ease-out)' }}>
            {/* header */}
            <div style={{ padding: '14px 14px 12px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid var(--border)' }}>
              {recruiter
                ? <div style={{ width: 40, height: 40, borderRadius: 10, background: '#efe9f5', color: '#5b3b82', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="building" size={20} /></div>
                : <Avatar personId={meId} size={40} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{recruiter ? window.GB.RECRUITER.name : display.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {recruiter ? window.GB.RECRUITER.company : admin ? `${ch.letters} Console · ${(display.positions && display.positions[0]) || 'Admin'}` : `${ch.letters} · ${display.role === 'undergrad' ? 'Active' : 'Alumnus'}`}</div>
              </div>
            </div>

            <div style={{ padding: '6px 0' }}>
              {!recruiter && <Item icon="home" label="View profile" sub="Your letterman record" onClick={() => nav(() => go('profile', { id: meId }))} />}
              {recruiter && <Item icon="target" label="My pipeline" sub={window.GB.RECRUITER.company} onClick={() => nav(() => go('pipeline'))} />}

              {admin ? (
                <Item icon="building" label="Chapter billing & plans" sub="Manage your chapter's plan" onClick={() => nav(() => go('chapter-pricing'))} />
              ) : recruiter ? (
                <Item icon="briefcase" label="Talk to sales" sub="Recruiter access, brokered" onClick={() => nav(() => go('talent'))} />
              ) : (
                <Item icon="seal" label="GreekBond Plus" sub="See plans & upgrade" onClick={() => nav(() => go('pricing'))} />
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', padding: '6px 0' }}>
              <Item icon="arrowL" label="Log out" tone="alert" onClick={() => nav(() => logout && logout())} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────────── Prototype "View as" switcher (not product chrome) ───────────────── */
function RoleSwitcher({ role, setRole, replay }) {
  const [open, setOpen] = useStateNav(false);
  // On mobile, member roles get a fixed bottom tab bar; lift this prototype tool
  // above it so it never overlaps the tabs. Drawer roles keep the default offset.
  const isMobile = window.useIsMobile ? window.useIsMobile() : false;
  const liftForBar = isMobile && (role === 'alumni' || role === 'undergrad');
  const roles = [
    ['alumni', 'Alumnus', 'graduation', 'Marcus Vance · ΘΔΣ'],
    ['undergrad', 'Undergrad', 'star', 'Devin Tran · ΘΔΣ'],
    ['admin', 'Chapter Admin', 'shield', 'Eli Brooks · ΘΔΣ Console'],
    ['recruiter', 'Recruiter', 'building', 'Diana Cole · Lattice Robotics'],
  ];
  const cur = roles.find(r => r[0] === role);
  return (
    <div style={{ position: 'fixed', left: 16, bottom: liftForBar ? 'calc(58px + env(safe-area-inset-bottom) + 14px)' : 16, zIndex: 2000, fontFamily: 'var(--font-ui)' }}>
      {open && (
        <div style={{ position: 'absolute', bottom: 50, left: 0, width: 268, background: 'var(--surface)', borderRadius: 14,
          boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', overflow: 'hidden', animation: 'gb-pop var(--motion-fast) var(--ease-out)' }}>
          <div style={{ padding: '11px 14px 7px', fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Prototype · View as role</div>
          {roles.map(([r, lb, ic, sub]) => (
            <button key={r} onClick={() => { setRole(r); setOpen(false); }} style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
              background: r === role ? 'var(--navy-50)' : 'none', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 11 }}
              onMouseEnter={e => { if (r !== role) e.currentTarget.style.background = '#f7f5ef'; }} onMouseLeave={e => { if (r !== role) e.currentTarget.style.background = 'none'; }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: r === role ? 'var(--navy)' : 'var(--navy-50)', color: r === role ? 'var(--gold)' : 'var(--navy)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                <Icon name={ic} size={17} /></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{lb}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
              </div>
              {r === role && <span style={{ marginLeft: 'auto', color: 'var(--gold)' }}><Icon name="check" size={16} stroke={2.6} /></span>}
            </button>
          ))}
          <button onClick={() => { setOpen(false); replay(); }} style={{ width: '100%', textAlign: 'left', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer',
            background: 'none', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, fontWeight: 600, color: 'var(--navy)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f7f5ef'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <Icon name="arrowL" size={16} /> Replay onboarding</button>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--navy)', color: '#fff',
        border: '1px solid rgba(255,255,255,.14)', borderRadius: 999, padding: '8px 15px 8px 11px', boxShadow: 'var(--shadow-md)', cursor: 'pointer' }}>
        <span style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(255,255,255,.12)', color: 'var(--gold)', display: 'grid', placeItems: 'center' }}>
          <Icon name={cur[2]} size={15} /></span>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}><span style={{ color: 'rgba(255,255,255,.6)' }}>Viewing as </span>{cur[1]}</span>
        <Icon name="chevron" size={14} stroke={2.4} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
    </div>
  );
}

Object.assign(window, { TopNav, RoleSwitcher, Typeahead });
