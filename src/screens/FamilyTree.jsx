// FamilyTree.jsx: visual Big/Little lineage you can climb. The centerpiece. Exports to window.
import React from 'react';
const { useState: useStateTree, useRef: useRefTree, useEffect: useEffectTree } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf } = window;

/* normalize a person's littles (supports legacy `little` + new `littles[]`) */
function littlesOf(p) {
  if (!p || !p.line) return [];
  if (p.line.littles && p.line.littles.length) return p.line.littles.filter(id => P(id));
  if (p.line.little && P(p.line.little)) return [p.line.little];
  return [];
}
function bigOf(p) { return p && p.line && p.line.big && P(p.line.big) ? p.line.big : null; }

/* climb to lineage root → ancestor chain (root-first, excluding focal) */
function ancestorsOf(id) {
  const chain = []; let cur = bigOf(P(id)); let guard = 0;
  while (cur && guard++ < 12) { chain.unshift(cur); cur = bigOf(P(cur)); }
  return chain;
}

const GEN_UP = ['Big', 'Grandbig', 'Great-grandbig', 'Great²-grandbig'];
const GEN_DOWN = ['Little', 'Grandlittle', 'Great-grandlittle', 'Great²-grandlittle'];

/* connector lines */
function VStem({ h = 26 }) { return <div style={{ width: 2, height: h, background: 'var(--gold-line)', margin: '0 auto' }} />; }

function TreeNode({ id, focal, label, go, onAsk, viewerId }) {
  const p = P(id);
  const ch = CH(p.chapter);
  const isFocal = id === focal;
  const yearLabel = p.role === 'undergrad' ? `Class of ’${String(p.classYear).slice(2)}` : `’${String(p.classYear).slice(2)} alum`;
  const canAsk = onAsk && id !== focal && id !== viewerId;
  return (
    <div style={{ position: 'relative', width: 210, '--chapter': ch.color, '--chapter-ink': ch.ink }}>
      {label && (
        <div style={{ position: 'absolute', top: -10, left: 14, zIndex: 2, fontFamily: 'var(--font-display)', fontStyle: 'italic',
          fontSize: 12.5, fontWeight: 600, color: 'var(--chapter)', background: 'var(--bg)', padding: '0 8px', whiteSpace: 'nowrap' }}>{label}</div>
      )}
      <div style={{ padding: '14px 14px 12px', borderRadius: 'var(--radius)',
        background: isFocal ? 'linear-gradient(165deg, #fffdf6, var(--gold-soft))' : 'var(--surface)',
        border: isFocal ? '2px solid var(--gold)' : '1.5px solid var(--border)',
        boxShadow: isFocal ? '0 8px 26px rgba(200,162,60,.30)' : 'var(--shadow-sm)' }}>
        <button onClick={() => go('profile', { id })} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11 }}>
          <Avatar personId={id} size={46} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15.5, color: 'var(--ink)', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--chapter-ink)', fontWeight: 600, marginTop: 2 }}>
              <Crest chapterId={p.chapter} size={13} ring={false} />{yearLabel}{isFocal && <span style={{ color: 'var(--gold-deep)' }}>· You</span>}</div>
          </div>
        </button>
        {(p.positions && p.positions.length > 0 || canAsk) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-2)' }}>
            {p.positions && p.positions[0]
              ? <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                  <Icon name="shield" size={12} stroke={2.2} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.positions[0]}</span></span>
              : <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.title}</span>}
            {canAsk && <button onClick={() => onAsk(p)} title="Ask for an intro" style={{ marginLeft: 'auto', flex: 'none', border: '1px solid var(--gold-line)', background: 'var(--gold-soft)', color: '#7a5e12',
              borderRadius: 999, width: 26, height: 26, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="intro" size={14} stroke={2.2} /></button>}
          </div>
        )}
      </div>
    </div>
  );
}

/* Mobile: the tree is legitimately wide (210px cards across generations and
   siblings), so it lives in a horizontal-pan container rather than being
   squeezed. touch-action: pan-x lets vertical swipes still scroll the page.
   Desktop returns the original centered column, byte-for-byte unchanged. */
function FamilyTreeCanvas({ isMobile, panRef, edges, children }) {
  if (!isMobile) {
    return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{children}</div>;
  }
  return (
    <div style={{ position: 'relative', margin: '0 -16px' }}>
      <div ref={panRef} className="gb-hscroll" style={{ overflowX: 'auto', overflowY: 'hidden',
        touchAction: 'pan-x', WebkitOverflowScrolling: 'touch', padding: '16px 16px 24px' }}>
        <div style={{ width: 'max-content', minWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {children}
        </div>
      </div>
      {edges.left && <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 28, pointerEvents: 'none', background: 'linear-gradient(to left, transparent, var(--bg))' }} />}
      {edges.right && (
        <>
          <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 32, pointerEvents: 'none', background: 'linear-gradient(to right, transparent, var(--bg))' }} />
          <div aria-hidden style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--ink-3)' }}><Icon name="chevR" size={22} stroke={2.4} /></div>
        </>
      )}
    </div>
  );
}

function FamilyTree({ id, meId, role, go, onAsk }) {
  const focal = id || meId;
  const p = P(focal);
  // Hooks run unconditionally (before the empty-state return) so the hook count
  // is stable whether or not there is lineage and across a desktop/mobile resize.
  const isMobile = window.useIsMobile ? window.useIsMobile() : false;
  const panRef = useRefTree(null);
  const [edges, setEdges] = useStateTree({ left: false, right: false });
  const syncEdges = () => {
    const el = panRef.current; if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 });
  };
  useEffectTree(() => {
    if (!isMobile) return;
    const el = panRef.current; if (!el) return;
    // Open centered on the focal node: it and the ancestor/root chain sit at the
    // tree's horizontal center, so centering the scroll opens on "you".
    const max = el.scrollWidth - el.clientWidth;
    el.scrollLeft = Math.max(0, Math.round(max / 2));
    syncEdges();
    el.addEventListener('scroll', syncEdges, { passive: true });
    window.addEventListener('resize', syncEdges);
    return () => { el.removeEventListener('scroll', syncEdges); window.removeEventListener('resize', syncEdges); };
  }, [isMobile, focal]);
  if (!p) {
    return (
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 16px 80px' }}>
        <Card><EmptyState icon="bond" title="No lineage to show yet" body="Family lines appear here once members and their Bigs and Littles are on GreekBond." /></Card>
      </div>
    );
  }
  const ch = CH(p.chapter);
  const ancestors = ancestorsOf(focal);              // root → ...→ big
  const littles = littlesOf(p);
  const grandlittlesByLittle = littles.map(lid => ({ lid, kids: littlesOf(P(lid)) }));
  const totalKin = ancestors.length + littles.length + grandlittlesByLittle.reduce((a, b) => a + b.kids.length, 0);

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 16px 80px', '--chapter': ch.color, '--chapter-ink': ch.ink }}>
      {/* heritage banner */}
      <Card pad={0} style={{ overflow: 'hidden', marginBottom: 22 }}>
        <div style={{ padding: '22px 26px', background: `linear-gradient(120deg, var(--chapter), ${tint(ch.color, .12)} 55%, var(--navy))`, color: '#fff', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: .15, background: 'repeating-linear-gradient(45deg, transparent, transparent 13px, rgba(255,255,255,.6) 13px, rgba(255,255,255,.6) 14px)' }} />
          <div style={{ position: 'absolute', right: 18, bottom: -24, opacity: .22 }}><Crest chapterId={p.chapter} size={150} ring={false} /></div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Crest chapterId={p.chapter} size={58} ring={false} seal />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.72)' }}>The lineage of {p.name}</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 600, margin: '3px 0 0' }}>
                {(p.line && p.line.name) || `${ch.letters} Family Line`}</h1>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: 'rgba(255,255,255,.85)', marginTop: 4 }}>{ch.motto}</div>
            </div>
            <div style={{ display: 'flex', gap: 22 }}>
              <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>{ancestors.length + 1}</div><div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.7)' }}>generations up</div></div>
              <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>{totalKin + 1}</div><div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.7)' }}>in this line</div></div>
            </div>
          </div>
        </div>
      </Card>

      {/* the tree (mobile: horizontal-pan canvas, centered on the focal node) */}
      <FamilyTreeCanvas isMobile={isMobile} panRef={panRef} edges={edges}>
        {/* ancestors, root at top */}
        {ancestors.length === 0 && (
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999, background: 'var(--surface)', border: '1px dashed var(--gold-line)', color: '#8a6d1e', fontSize: 12.5, fontWeight: 600 }}>
              <Icon name="seal" size={14} fill="var(--gold)" stroke={0} />Founder of this line, no Big on record</div>
            <VStem h={20} />
          </div>
        )}
        {ancestors.map((aid, i) => {
          const up = ancestors.length - i; // generations above focal
          const label = GEN_UP[up - 1] || `${up}× up`;
          return (
            <div key={aid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <TreeNode id={aid} focal={focal} label={label} go={go} onAsk={onAsk} viewerId={meId} />
              <VStem />
            </div>
          );
        })}

        {/* focal */}
        <TreeNode id={focal} focal={focal} label={ancestors.length ? 'You' : null} go={go} onAsk={onAsk} viewerId={meId} />

        {/* descendants */}
        {littles.length > 0 ? (
          <>
            <VStem />
            <div style={{ position: 'relative', display: 'flex', gap: 26, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 4 }}>
              {/* horizontal sibling bar */}
              {littles.length > 1 && <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, background: 'var(--gold-line)' }} />}
              {littles.map(lid => {
                const kids = littlesOf(P(lid));
                return (
                  <div key={lid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {littles.length > 1 && <VStem h={16} />}
                    <TreeNode id={lid} focal={focal} label={GEN_DOWN[0]} go={go} onAsk={onAsk} viewerId={meId} />
                    {kids.length > 0 && (
                      <>
                        <VStem />
                        <div style={{ position: 'relative', display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 4 }}>
                          {kids.length > 1 && <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: 'var(--gold-line)' }} />}
                          {kids.map(kid => (
                            <div key={kid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              {kids.length > 1 && <VStem h={16} />}
                              <TreeNode id={kid} focal={focal} label={GEN_DOWN[1]} go={go} onAsk={onAsk} viewerId={meId} />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <VStem h={20} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--ink-2)', fontSize: 13 }}>
              <Icon name="bond" size={16} stroke={2} />{focal === meId ? 'You haven’t taken a Little yet, your line continues with you.' : `${p.name.split(' ')[0]} hasn’t taken a Little yet.`}</div>
          </>
        )}
      </FamilyTreeCanvas>

      {/* legend / note */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 32, flexWrap: 'wrap', color: 'var(--ink-2)', fontSize: 12.5 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: 4, border: '2px solid var(--gold)', background: 'var(--gold-soft)' }} />Focal member</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="intro" size={14} /> Tap the seal on any kin to ask for an intro</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="seal" size={14} fill="var(--gold)" stroke={0} /> Built from verified lineage</span>
      </div>
    </div>
  );
}

Object.assign(window, { FamilyTree, littlesOf, bigOf, ancestorsOf });
