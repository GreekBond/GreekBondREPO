// AlumniMap.jsx: interactive US tile-grid map of where the network landed. Exports to window.
import React from 'react';
const { useState: useStateMap } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf } = window;

/* lerp between two hex colors */
function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

function AlumniMap({ meId, recruiter, go, bond }) {
  const dir = window.useDirectory(recruiter ? '__none' : meId);
  const { filtered, orgs, org, setOrg, open, setOpen, year, setYear } = dir;

  // bucket filtered members by state
  const byState = {};
  filtered.forEach(id => { const s = window.stateOf(P(id)); if (s) (byState[s] = byState[s] || []).push(id); });
  const counts = Object.fromEntries(Object.entries(byState).map(([s, arr]) => [s, arr.length]));
  const maxCount = Math.max(1, ...Object.values(counts));

  // default-select the densest state so the panel is never empty
  const densest = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const [sel, setSel] = useStateMap(densest ? densest[0] : 'CA');
  const [hover, setHover] = useStateMap(null);

  const cols = window.US_GRID_COLS, rows = window.US_GRID_ROWS, cell = 54, pad = 5;
  const selMembers = byState[sel] || [];
  const totalStates = Object.keys(byState).length;

  const shadeFor = (code) => {
    const c = counts[code] || 0;
    if (c === 0) return '#ece8dd';
    return lerpColor('#ecd9a3', '#9c7a26', (c - 1) / Math.max(1, maxCount - 1));
  };
  const textColor = (code) => {
    const c = counts[code] || 0;
    return c === 0 ? '#b4afa2' : (c - 1) / Math.max(1, maxCount - 1) > 0.5 ? '#fff' : '#5a4715';
  };

  return (
    <div>
      {/* filters, reuse the exact directory chip UI */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--navy)', color: 'var(--gold)', display: 'grid', placeItems: 'center' }}><Icon name="globe" size={17} /></span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--ink)' }}>Where the {recruiter ? 'talent' : 'network'} landed</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{filtered.length} {recruiter ? 'candidates' : 'members'} across {totalStates} states · click a state to explore</div>
          </div>
        </div>
        <window.FilterRows orgs={orgs} org={org} setOrg={setOrg} open={open} setOpen={setOpen} year={year} setYear={setYear}
          workLabel={recruiter ? 'Open to work' : 'Looking for work'} hiringLabel={recruiter ? 'Open to hire' : 'Open to hiring'} statusLabel="Status" />
      </Card>

      {/* map */}
      <Card pad={0} style={{ overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '20px 22px 8px', position: 'relative', background: 'linear-gradient(180deg, #fbfaf5, #f4f1e9)' }}>
          <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto' }}>
            <svg viewBox={`0 0 ${cols * cell} ${rows * cell}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
              {Object.entries(window.US_TILE_GRID).map(([code, [r, c]]) => {
                const isSel = sel === code, count = counts[code] || 0;
                return (
                  <g key={code} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHover({ code, r, c })} onMouseLeave={() => setHover(null)}
                    onClick={() => setSel(code)}>
                    <rect x={c * cell + pad} y={r * cell + pad} width={cell - pad * 2} height={cell - pad * 2} rx="7"
                      fill={shadeFor(code)} stroke={isSel ? 'var(--navy)' : (hover && hover.code === code ? 'var(--gold-deep)' : 'rgba(0,0,0,.06)')}
                      strokeWidth={isSel ? 3 : 1.5} style={{ transition: 'fill .15s' }} />
                    <text x={c * cell + cell / 2} y={r * cell + cell / 2 - 3} textAnchor="middle" dominantBaseline="middle"
                      fontSize="13" fontWeight="700" fill={textColor(code)} fontFamily="var(--font-ui)" style={{ pointerEvents: 'none' }}>{code}</text>
                    {count > 0 && <text x={c * cell + cell / 2} y={r * cell + cell / 2 + 11} textAnchor="middle" dominantBaseline="middle"
                      fontSize="10" fontWeight="700" fill={textColor(code)} opacity="0.85" fontFamily="var(--font-ui)" style={{ pointerEvents: 'none' }}>{count}</text>}
                  </g>
                );
              })}
            </svg>
            {/* hover tooltip, positioned by grid % so it tracks SVG scaling */}
            {hover && (
              <div style={{ position: 'absolute', left: `${(hover.c + 0.5) / cols * 100}%`, top: `${hover.r / rows * 100}%`,
                transform: 'translate(-50%, -118%)', pointerEvents: 'none', zIndex: 5,
                background: 'var(--navy)', color: '#fff', padding: '6px 11px', borderRadius: 8, whiteSpace: 'nowrap',
                boxShadow: 'var(--shadow-md)', fontSize: 12.5, fontWeight: 600 }}>
                {window.US_STATE_NAMES[hover.code]} · {counts[hover.code] || 0} {(counts[hover.code] || 0) === 1 ? (recruiter ? 'candidate' : 'member') : (recruiter ? 'candidates' : 'members')}
                <span style={{ position: 'absolute', left: '50%', bottom: -5, transform: 'translateX(-50%) rotate(45deg)', width: 10, height: 10, background: 'var(--navy)' }} />
              </div>
            )}
          </div>
        </div>
        {/* legend */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '12px 20px 18px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>Fewer</span>
          <div style={{ display: 'flex', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {[0, .25, .5, .75, 1].map(t => <span key={t} style={{ width: 30, height: 12, background: t === 0 ? '#ece8dd' : lerpColor('#ecd9a3', '#9c7a26', t) }} />)}
          </div>
          <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>More {recruiter ? 'talent' : 'brothers & sisters'}</span>
        </div>
      </Card>

      {/* selected-state results */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '4px 4px 14px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--ink)' }}>{window.US_STATE_NAMES[sel] || sel}</h2>
        <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>· {selMembers.length} {selMembers.length === 1 ? (recruiter ? 'candidate' : 'member') : (recruiter ? 'candidates' : 'brothers & sisters')}</span>
      </div>
      {selMembers.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: recruiter ? 'repeat(auto-fill, minmax(296px, 1fr))' : 'repeat(auto-fill, minmax(232px, 1fr))', gap: 16 }}>
          {selMembers.map(id => recruiter
            ? <window.TalentCard key={id} id={id} go={go} />
            : <window.NetCard key={id} id={id} meId={meId} go={go} bond={bond} />)}
        </div>
      ) : (
        <Card style={{ textAlign: 'center', padding: 36, color: 'var(--ink-2)' }}>
          <div style={{ marginBottom: 4 }}><Icon name="pin" size={26} /></div>
          No {recruiter ? 'candidates' : 'members'} in {window.US_STATE_NAMES[sel] || sel} match your filters yet. Try another state.
        </Card>
      )}
    </div>
  );
}

Object.assign(window, { AlumniMap });
