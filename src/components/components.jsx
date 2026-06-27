// components.jsx: GreekBond V2 design primitives. Exports to window.
import React from 'react';
import { tint, shade, CH, P } from '../utils/helpers.js';
const { useState, useEffect, useRef } = React;

/* ───────────────── icons ───────────────── */
const ICONS = {
  home:'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10',
  bond:'M8.5 9.5a3.5 3.5 0 0 0 0 5h2M15.5 9.5a3.5 3.5 0 0 1 0 5h-2M9 12h6',
  network:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 9a4 4 0 0 0-4-4M5 20a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4m4-9a3 3 0 1 0 0-6',
  jobs:'M3 8h18v12H3zM8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18',
  message:'M4 5h16v11H8l-4 3.5z',
  bell:'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 21a2 2 0 0 0 4 0',
  search:'M11 11m-7 0a7 7 0 1 0 14 0 7 7 0 1 0-14 0M21 21l-5-5',
  like:'M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 3 1.5V9h4.5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.3 20H7',
  comment:'M4 5h16v11H8l-4 3.5z',
  share:'M16 6l-4-4-4 4M12 2v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  plus:'M12 5v14M5 12h14',
  check:'M4 12l5 5L20 6',
  pin:'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  chevron:'M6 9l6 6 6-6',
  chevR:'M9 6l6 6-6 6',
  calendar:'M5 6h14v14H5zM5 10h14M9 4v4M15 4v4',
  filter:'M3 5h18M6 12h12M10 19h4',
  edit:'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  seal:'M12 3l2.3 1.7 2.8-.3 1 2.7 2.4 1.5-.9 2.7.9 2.7-2.4 1.5-1 2.7-2.8-.3L12 21l-2.3-1.7-2.8.3-1-2.7L3.5 15l.9-2.7-.9-2.7 2.4-1.5 1-2.7 2.8.3z',
  globe:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18',
  star:'M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z',
  shield:'M12 3l8 3v6c0 4.5-3.4 7.6-8 9-4.6-1.4-8-4.5-8-9V6z',
  building:'M4 21V5l8-2v18M12 21V9l8 2v10M7 8h0M7 12h0M7 16h0M16 13h0M16 17h0',
  intro:'M3 11h13l-3-3M16 14H3M19 4v16',
  briefcase:'M3 8h18v12H3zM8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  target:'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0',
  lock:'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  arrowL:'M19 12H5M11 6l-6 6 6 6',
  send:'M4 12l16-7-7 16-2-7z',
  users:'M16 18a4 4 0 0 0-8 0M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 18a3 3 0 0 0-3-3M4 18a3 3 0 0 1 3-3',
  chart:'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8',
  graduation:'M3 9l9-4 9 4-9 4zM7 11v4c0 1 2.2 2 5 2s5-1 5-2v-4',
  bookmark:'M6 4h12v16l-6-4-6 4z',
  x:'M6 6l12 12M18 6L6 18',
  image:'M4 5h16v14H4zM4 16l4.5-4.5 3 3L16 10l4 4M9 9a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0',
  smile:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9 10h0M15 10h0M8.5 14a4 4 0 0 0 7 0',
  menu:'M4 7h16M4 12h16M4 17h16',
  dots:'M6 12h0M12 12h0M18 12h0',
};
function Icon({ name, size = 22, stroke = 2, fill = 'none', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

/* ───────────────── Crest, the hero mark (chapter color + wax-seal ring) ───────────────── */
function Crest({ chapterId, size = 44, ring = true, seal = false }) {
  const ch = CH(chapterId);
  if (!ch) return null;
  const fs = size * 0.4;
  return (
    <div title={ch.name} style={{
      width: size, height: size, borderRadius: '50%', position: 'relative', flex: 'none',
      background: `radial-gradient(120% 120% at 32% 24%, ${tint(ch.color, .22)}, ${ch.color} 62%, ${shade(ch.color, .22)})`,
      color: '#fff', display: 'grid', placeItems: 'center',
      boxShadow: ring
        ? `0 0 0 ${Math.max(1.5, size*0.04)}px var(--surface), 0 0 0 ${Math.max(2.5, size*0.07)}px ${ch.color}, inset 0 0 0 ${Math.max(1, size*0.03)}px rgba(255,255,255,.32)`
        : `inset 0 0 0 ${Math.max(1, size*0.028)}px rgba(255,255,255,.28)`,
      fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: fs, letterSpacing: '.01em',
      lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,.3)',
    }}>
      {seal && <span style={{ position: 'absolute', inset: size*0.13, borderRadius: '50%',
        border: `1px solid rgba(255,255,255,.4)` }} />}
      {ch.letters}
    </div>
  );
}

/* ───────────────── Avatar, paired with crest (Rule 1: never a member without their house) ───────────────── */
const AV_COLORS = ['#3a4a63', '#6b3540', '#356049', '#5a3a60', '#7a5526', '#34406e', '#475160'];
function avatarColor(name) {
  name = name || '?';
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}
function initials(name) { return (name || '?').split(' ').slice(0, 2).map(w => w[0] || '').join(''); }

function Avatar({ personId, name, chapterId, size = 56, showCrest = true, onClick, avatarUrl, src }) {
  const p = personId ? P(personId) : null;
  const nm = name || (p && p.name) || '?';
  const ch = chapterId || (p && p.chapter);
  // A real uploaded photo wins over generated initials. Callers can pass it
  // directly (editor preview); otherwise we read the cached profile.
  const photo = src || avatarUrl || (p && p.avatarUrl) || null;
  const crestSize = Math.max(18, Math.round(size * 0.44));
  // Fade the photo in once it decodes (covers cached images via .complete) so a
  // load never pops. The reduced-motion CSS forces .gb-img fully opaque.
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef(null);
  useEffect(() => {
    setImgLoaded(false);
    if (imgRef.current && imgRef.current.complete) setImgLoaded(true);
  }, [photo]);
  return (
    <div onClick={onClick} style={{ position: 'relative', width: size, height: size, flex: 'none', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
        background: `linear-gradient(150deg, ${tint(avatarColor(nm),.12)}, ${avatarColor(nm)})`,
        color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 600,
        fontSize: size * 0.36, letterSpacing: '.01em', userSelect: 'none', fontFamily: 'var(--font-ui)',
      }}>{photo
        ? <img ref={imgRef} src={photo} alt={nm} onLoad={() => setImgLoaded(true)}
            className={imgLoaded ? 'gb-img is-loaded' : 'gb-img'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : initials(nm)}</div>
      {showCrest && ch && (
        <div style={{ position: 'absolute', right: -3, bottom: -3 }}>
          <Crest chapterId={ch} size={crestSize} />
        </div>
      )}
    </div>
  );
}

/* ───────────────── WarmSignal, why you're bonded (Rule 4), gold-tinted, proud ───────────────── */
/* littles + office-year helpers for the bond-strength engine */
function _littlesOf(p) {
  if (!p || !p.line) return [];
  if (p.line.littles && p.line.littles.length) return p.line.littles.filter(id => P(id));
  if (p.line.little && P(p.line.little)) return [p.line.little];
  return [];
}
function _officeYears(positions) {
  const ys = new Set();
  (positions || []).forEach(s => { const m = String(s).match(/(\d{2})\b/); if (m) ys.add(m[1]); });
  return ys;
}
function _cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

/* bondTies, ranked shared ties between a viewer and a person, STRONGEST FIRST.
   Rank law: same line > same pledge class > served on exec > same chapter > mutual bonds > same school > same city > same field. */
function bondTies(person, viewerId) {
  const viewer = viewerId ? P(viewerId) : null;
  const ch = CH(person.chapter);
  const ties = [];
  if (!viewer || viewer.id === person.id) {
    if (person.bonded) ties.push({ kind: 'chapter', strength: 60, label: `Bonded through ${ch.letters}` });
    else ties.push({ kind: 'chapter', strength: 60, label: `${ch.letters} · ${ch.school}` });
    if (person.mutuals > 0) ties.push({ kind: 'mutual', strength: 50, label: `${person.mutuals} mutual bonds` });
    return ties;
  }
  // 1, lineage / same line (the strongest tie there is)
  const vBig = viewer.line && viewer.line.big;
  const vLittles = _littlesOf(viewer);
  if (vBig === person.id) ties.push({ kind: 'line', strength: 100, label: 'Your Big' });
  else if (vLittles.includes(person.id)) ties.push({ kind: 'line', strength: 99, label: 'Your Little' });
  else if (vBig && P(vBig) && P(vBig).line && P(vBig).line.big === person.id) ties.push({ kind: 'line', strength: 95, label: 'Your Grandbig' });
  else if (viewer.line && person.line && viewer.line.name && viewer.line.name === person.line.name) ties.push({ kind: 'line', strength: 90, label: `Same line · ${viewer.line.name}` });
  // 2, same pledge class
  if (viewer.pledgeClass && person.pledgeClass === viewer.pledgeClass) ties.push({ kind: 'pledge', strength: 80, label: `Pledge ${ch.plural} · ${person.pledgeClass}` });
  // 3, served on exec together
  const shared = [..._officeYears(viewer.positions)].filter(y => _officeYears(person.positions).has(y));
  if (shared.length) ties.push({ kind: 'exec', strength: 70, label: `Served on exec together · ’${shared.sort()[0]}` });
  // 4, same chapter (brothers/sisters) or same house elsewhere
  if (viewer.chapter === person.chapter) ties.push({ kind: 'chapter', strength: 60, label: `${_cap(ch.plural)} · ${ch.letters}` });
  else ties.push({ kind: 'house', strength: 30, label: `${ch.letters} · ${ch.kind}` });
  // 5, mutual bonds
  if (person.mutuals > 0) ties.push({ kind: 'mutual', strength: 50, label: `${person.mutuals} mutual bonds` });
  // 6, same school, different chapter
  if (viewer.chapter !== person.chapter && person.school && viewer.school === person.school) ties.push({ kind: 'school', strength: 40, label: `Both ${person.school.split(' ')[0]}` });
  // 7, same city
  if (viewer.location && person.location && viewer.location === person.location) ties.push({ kind: 'city', strength: 35, label: `Both in ${person.location.split(',')[0]}` });
  // 8, same field
  if (viewer.industry && person.industry && viewer.industry === person.industry && person.industry !== 'Student') ties.push({ kind: 'field', strength: 20, label: `Both in ${person.industry}` });
  return ties.sort((a, b) => b.strength - a.strength);
}
/* tasteful strength headline, relationship texture, never a gamified score */
function bondStrengthLabel(ties) {
  if (!ties || !ties.length) return null;
  const top = ties[0];
  if (top.kind === 'line') return 'Closest bond';
  if (top.kind === 'pledge' || top.kind === 'exec') return 'Close bond';
  if (top.strength >= 60) return 'Strong bond';
  return 'Connected';
}
/* warmFacts, kept for every existing caller; now derived from the ranked engine */
function warmFacts(person, viewerId) {
  return bondTies(person, viewerId).map(t => t.label);
}
function WarmSignal({ person, viewerId, size = 12.5, max = 3, style }) {
  const facts = warmFacts(person, viewerId).slice(0, max);
  const bonded = person.bonded || (P(viewerId) && P(viewerId).chapter === person.chapter);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px 3px 7px',
      borderRadius: 999, background: bonded ? 'var(--gold-soft)' : 'var(--navy-50)',
      border: `1px solid ${bonded ? 'var(--gold-line)' : 'var(--navy-100)'}`, ...style }}>
      <span style={{ color: bonded ? 'var(--gold-deep)' : 'var(--navy-600)', display: 'grid', placeItems: 'center' }}>
        <Icon name="bond" size={size + 2.5} stroke={2.2} /></span>
      <span style={{ fontSize: size, fontWeight: 600, color: bonded ? '#7a5e12' : 'var(--navy-600)', lineHeight: 1.3 }}>
        {facts.join(' · ')}</span>
    </div>
  );
}

/* HowConnected, Bond Strength made visible. Headlines the strongest shared tie,
   chips the rest. Extends WarmSignal's gold-tinted, proud language (Rule 4). */
function HowConnected({ person, viewerId, style }) {
  const ties = bondTies(person, viewerId);
  if (!ties.length) return null;
  const head = ties[0];
  const rest = ties.slice(1, 5);
  const strength = bondStrengthLabel(ties);
  const bonded = person.bonded || (P(viewerId) && P(viewerId).chapter === person.chapter);
  const lineColor = bonded ? 'var(--gold-line)' : 'var(--navy-100)';
  return (
    <div style={{ borderRadius: 'var(--radius)', border: `1px solid ${lineColor}`,
      background: bonded ? 'linear-gradient(150deg, #fffdf6, var(--gold-soft))' : 'var(--navy-50)', padding: '14px 18px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <span style={{ width: 38, height: 38, borderRadius: 999, flex: 'none', display: 'grid', placeItems: 'center',
          background: bonded ? 'var(--gold)' : 'var(--navy)', color: '#fff' }}><Icon name="bond" size={21} stroke={2.3} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>How you’re connected</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginTop: 3 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: bonded ? '#7a5e12' : 'var(--navy)', lineHeight: 1.1 }}>{head.label}</span>
            {strength && <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: bonded ? 'var(--gold-deep)' : 'var(--navy-600)', background: 'var(--surface)', border: `1px solid ${lineColor}`, borderRadius: 999, padding: '3px 9px' }}>{strength}</span>}
          </div>
        </div>
      </div>
      {rest.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 13 }}>
          {rest.map((t, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px 4px 9px', borderRadius: 999,
              background: 'var(--surface)', border: `1px solid ${lineColor}`, fontSize: 12.5, fontWeight: 600, color: bonded ? '#7a5e12' : 'var(--navy-600)' }}>
              <span style={{ width: 5, height: 5, borderRadius: 9, background: bonded ? 'var(--gold)' : 'var(--navy)' }} />{t.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────── Buttons, verb law lives here (no "Connect" anywhere) ───────────────── */
function Btn({ variant = 'primary', size = 'md', icon, iconR, children, onClick, full, style, chapter }) {
  const pad = size === 'sm' ? '7px 14px' : size === 'lg' ? '13px 28px' : '10px 21px';
  const fz = size === 'sm' ? 13.5 : size === 'lg' ? 16 : 14.5;
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    border: '1.5px solid transparent', borderRadius: 999, padding: pad, fontSize: fz,
    fontWeight: 600, fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap',
    transition: 'background var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out), box-shadow var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out)',
    width: full ? '100%' : 'auto', lineHeight: 1.1, letterSpacing: '.005em', ...style,
  };
  const variants = {
    primary: { background: 'var(--navy)', color: '#fff' },
    gold: { background: 'var(--gold)', color: '#3a2c08' },
    chapter: { background: 'var(--chapter)', color: '#fff' },
    outline: { background: 'transparent', color: 'var(--navy)', borderColor: 'var(--navy)' },
    outlineCh: { background: 'transparent', color: 'var(--chapter)', borderColor: 'var(--chapter)' },
    ghost: { background: 'transparent', color: 'var(--ink-2)', borderColor: 'var(--border)' },
    subtle: { background: 'var(--navy-50)', color: 'var(--navy)' },
    bonded: { background: 'var(--gold-soft)', color: '#7a5e12', borderColor: 'var(--gold-line)' },
  };
  const hoverFx = {
    primary: { background: 'var(--navy-700)' }, gold: { background: 'var(--gold-deep)', color: '#fff' },
    chapter: { filter: 'brightness(1.08)' }, outline: { background: 'var(--navy-50)' },
    outlineCh: { background: 'rgba(0,0,0,.04)' }, ghost: { background: '#f1efe9', color: 'var(--ink)' },
    subtle: { background: '#e2e6f2' }, bonded: { background: '#efe2bd' },
  };
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)}
      style={{ ...base, ...variants[variant], ...(hover ? hoverFx[variant] : {}), transform: pressed ? 'scale(.97)' : 'none' }}>
      {icon && <Icon name={icon} size={fz + 3} stroke={2.1} />}
      {children}
      {iconR && <Icon name={iconR} size={fz + 2} stroke={2.1} />}
    </button>
  );
}

/* ───────────────── Pill / badge ───────────────── */
function Pill({ tone = 'gray', children, icon, style }) {
  const tones = {
    gold: { background: 'var(--gold-soft)', color: '#7a5e12', border: '1px solid var(--gold-line)' },
    navy: { background: 'var(--navy-50)', color: 'var(--navy)', border: '1px solid var(--navy-100)' },
    gray: { background: '#f0eee7', color: 'var(--ink-2)', border: '1px solid var(--border)' },
    success: { background: '#e6f1ea', color: 'var(--success)', border: '1px solid #c2dccb' },
    chapter: { background: 'color-mix(in srgb, var(--chapter) 12%, #fff)', color: 'var(--chapter-ink)', border: '1px solid color-mix(in srgb, var(--chapter) 28%, #fff)' },
    employer: { background: '#efe9f5', color: '#5b3b82', border: '1px solid #ddd0ea' },
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 700, lineHeight: 1.3, whiteSpace: 'nowrap', letterSpacing: '.01em', ...tones[tone], ...style }}>
      {icon && <Icon name={icon} size={12.5} stroke={2.4} />}{children}
    </span>
  );
}

/* ───────────────── Card ───────────────── */
function Card({ children, pad = 20, style, onClick, hover }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hover && setH(true)} onMouseLeave={() => hover && setH(false)}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        boxShadow: h ? 'var(--shadow-md)' : 'var(--shadow-sm)', padding: pad,
        transition: 'box-shadow var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out)', cursor: onClick ? 'pointer' : 'default',
        transform: h ? 'translateY(-2px)' : 'none', ...style,
      }}>{children}</div>
  );
}

function SectionCard({ title, action, children, accent }) {
  return (
    <Card pad={0}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 0' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.01em' }}>{title}</h2>
        {action}
      </div>
      <div style={{ padding: '14px 24px 22px' }}>{children}</div>
    </Card>
  );
}

/* ───────────────── striped image placeholder w/ crest watermark ───────────────── */
function ImgPlaceholder({ label, h = 200, style, watermark }) {
  return (
    <div style={{
      height: h, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden',
      background: 'repeating-linear-gradient(135deg, #efece4, #efece4 11px, #e7e3d8 11px, #e7e3d8 22px)',
      display: 'grid', placeItems: 'center', ...style,
    }}>
      {watermark && <div style={{ position: 'absolute', right: -8, bottom: -10, opacity: .14 }}><Crest chapterId={watermark} size={h * 0.72} ring={false} /></div>}
      <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11.5, color: '#938f84', position: 'relative',
        background: 'rgba(255,255,255,.72)', padding: '4px 11px', borderRadius: 6, letterSpacing: '.02em' }}>{label}</span>
    </div>
  );
}

/* ───────────────── LineageBlock, the letterman record (Rule 3) ───────────────── */
function LinkName({ id, go, color }) {
  if (!id || !P(id)) return <span style={{ color: 'var(--ink-3)' }}>-</span>;
  return (
    <button onClick={() => go && go('profile', { id })} style={{ background: 'none', border: 'none', padding: 0,
      fontWeight: 700, fontSize: 'inherit', color: color || 'var(--navy)', textDecoration: 'underline', textDecorationColor: 'var(--gold-line)', textUnderlineOffset: 3 }}>
      {P(id).name}</button>
  );
}
function LineageBlock({ person, go, compact }) {
  const ch = CH(person.chapter);
  const status = person.role === 'undergrad' ? 'Active member · Good standing' : 'Alumnus in good standing';
  return (
    <div style={{ '--chapter': ch.color, '--chapter-ink': ch.ink }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <Crest chapterId={person.chapter} size={compact ? 48 : 58} seal />
        <div style={{ minWidth: 0 }}>
          <button onClick={() => go && go('chapter', { id: person.chapter })} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left',
            fontFamily: 'var(--font-display)', fontSize: compact ? 19 : 22, fontWeight: 600, color: 'var(--chapter-ink)', lineHeight: 1.1 }}>
            {ch.name} <span style={{ color: 'var(--chapter)' }}>{ch.letters}</span></button>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 3 }}>{ch.kind} · {ch.council} · {ch.school}</div>
        </div>
      </div>

      <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px 26px', marginTop: 16 }}>
        <Detail label="Pledge class" value={person.pledgeClass || '-'} />
        <Detail label={person.role === 'undergrad' ? 'Expected grad' : 'Class year'} value={[person.classYear ? `’${String(person.classYear).slice(2)}` : null, person.school ? person.school.split(' ')[0] : null].filter(Boolean).join(' · ') || '-'} />
        <Detail label="Status" value={status} />
        <Detail label="Lineage" value={
          <span style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span><span style={{ color: 'var(--ink-3)', fontWeight: 600, fontSize: 12 }}>Big </span><LinkName id={person.line && person.line.big} go={go} /></span>
            <span><span style={{ color: 'var(--ink-3)', fontWeight: 600, fontSize: 12 }}>Little </span>{
              (() => {
                const littles = (person.line && person.line.littles) || (person.line && person.line.little ? [person.line.little] : []);
                if (!littles.length) return <LinkName id={null} go={go} />;
                return littles.map((lid, i) => <span key={lid}>{i > 0 && <span style={{ color: 'var(--ink-3)' }}>, </span>}<LinkName id={lid} go={go} /></span>);
              })()
            }</span>
          </span>
        } />
        {person.line && person.line.name && <Detail label="Line name" value={<span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--chapter-ink)' }}>{person.line.name}</span>} />}
      </div>

      {person.positions && person.positions.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Lbl>Positions held</Lbl>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {person.positions.map(p => (
              <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 7,
                background: 'var(--surface)', border: '1px solid var(--chapter)', color: 'var(--chapter-ink)', fontSize: 13, fontWeight: 600 }}>
                <span style={{ width: 5, height: 5, borderRadius: 9, background: 'var(--chapter)' }} />{p}</span>
            ))}
          </div>
        </div>
      )}
      {person.honors && person.honors.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Lbl>Honors</Lbl>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {person.honors.map(h => (
              <span key={h} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px 5px 9px', borderRadius: 999,
                background: 'var(--gold-soft)', border: '1px solid var(--gold-line)', color: '#7a5e12', fontSize: 12.5, fontWeight: 700 }}>
                <Icon name="seal" size={14} fill="var(--gold)" stroke={0} />{h}</span>
            ))}
          </div>
        </div>
      )}
      {!compact && (window.bigOf(person) || window.littlesOf(person).length > 0) && go && (
        <button onClick={() => go('tree', { id: person.id })} style={{ marginTop: 18, width: '100%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(120deg, var(--surface), var(--bg-2))', border: '1px solid var(--chapter)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'} onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(120deg, var(--surface), var(--bg-2))'}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--chapter)', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="network" size={18} /></span>
          <span style={{ textAlign: 'left', flex: 1 }}>
            <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--chapter-ink)' }}>View the family tree</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)' }}>Climb the Big/Little line, {(person.line && person.line.name) || 'generation by generation'}</span>
          </span>
          <Icon name="chevR" size={18} stroke={2.2} style={{ color: 'var(--chapter)' }} />
        </button>
      )}
    </div>
  );
}
function Lbl({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{children}</div>;
}
function Detail({ label, value }) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      <div style={{ fontSize: 14.5, color: 'var(--ink)', marginTop: 4, fontWeight: 500, lineHeight: 1.35 }}>{value}</div>
    </div>
  );
}

/* ───────────────── Toggle ───────────────── */
function Toggle({ on, set, gold }) {
  return (
    <button onClick={() => set(!on)} style={{ width: 42, height: 24, borderRadius: 999, border: 'none', position: 'relative',
      background: on ? (gold ? 'var(--gold)' : 'var(--success)') : 'rgba(120,120,120,.35)', transition: 'background .15s', cursor: 'pointer', padding: 0, flex: 'none' }}>
      <span style={{ position: 'absolute', top: 2.5, left: on ? 20.5 : 2.5, width: 19, height: 19, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
    </button>
  );
}

/* ───────────────── Bond celebration, a moment of warmth (Rule 6) ───────────────── */
function BondCelebration({ person, onClose }) {
  const ch = CH(person.chapter);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(17,27,61,.55)',
      backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', animation: 'gb-fade var(--motion-base) var(--ease-out)' }}>
      <div onClick={e => e.stopPropagation()} style={{ '--chapter': ch.color, width: 380, maxWidth: '90vw', background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)', padding: '36px 32px 28px', textAlign: 'center', boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--gold-line)', animation: 'gb-pop var(--motion-base) var(--ease-out)' }}>
        <div style={{ position: 'relative', width: 120, height: 88, margin: '0 auto 8px' }}>
          <div style={{ position: 'absolute', left: 16, top: 12, animation: 'gb-seal .5s ease both' }}><Avatar personId="me" size={64} showCrest={false} /></div>
          <div style={{ position: 'absolute', right: 16, top: 12, animation: 'gb-seal .5s .08s ease both' }}><Avatar personId={person.id} size={64} /></div>
          <div style={{ position: 'absolute', left: '50%', top: 30, transform: 'translateX(-50%)', zIndex: 2,
            width: 36, height: 36, borderRadius: 999, background: 'var(--gold)', color: '#fff', display: 'grid', placeItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,.2)', animation: 'gb-seal .5s .16s ease both' }}><Icon name="bond" size={22} stroke={2.4} /></div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 600, color: 'var(--navy)', marginTop: 6 }}>You’re bonded</div>
        <div style={{ fontSize: 14.5, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.5 }}>
          You and <strong style={{ color: 'var(--ink)' }}>{person.name}</strong> are now bonded through the network.</div>
        <div style={{ display: 'inline-flex', marginTop: 12 }}><WarmSignal person={{ ...person, bonded: true }} viewerId="me" /></div>
        <div style={{ marginTop: 22 }}><Btn variant="gold" full onClick={onClose}>Continue</Btn></div>
      </div>
    </div>
  );
}

/* ───────────────── EmptyState ───────────────── */
function EmptyState({ icon, title, body, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '54px 24px', maxWidth: 460, margin: '0 auto' }}>
      <div style={{ width: 72, height: 72, borderRadius: 999, background: 'var(--navy-50)', color: 'var(--navy)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
        <Icon name={icon} size={32} /></div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 600, color: 'var(--navy)', margin: '0 0 8px' }}>{title}</h3>
      <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 20px' }}>{body}</p>
      {action}
    </div>
  );
}

/* ───────────────── UpgradeLock (V2.3 plan gating) ─────────────────
   The shared "this is a paid feature" wall. Shown in place of a gated surface
   for free-tier alumni. Always offers a real route to Pricing, never a dead
   button. `tier` is the label of the minimum plan (e.g. "Bond"). */
function UpgradeLock({ icon = 'lock', feature, tier = 'Bond', body, go, compact }) {
  return (
    <div style={{ textAlign: 'center', padding: compact ? '32px 22px' : '54px 24px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ width: 72, height: 72, borderRadius: 999, background: 'var(--gold-soft)', color: 'var(--gold-deep)', display: 'grid', placeItems: 'center', margin: '0 auto 18px', border: '1px solid var(--gold-line)' }}>
        <Icon name={icon} size={30} /></div>
      <div style={{ color: 'var(--gold-deep)', fontSize: 11.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>{tier} feature</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--navy)', margin: '0 0 8px' }}>{feature} is part of {tier}</h3>
      <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 20px' }}>
        {body || `Upgrade to ${tier} to unlock ${feature.toLowerCase()} and put the network to work.`}</p>
      <Btn variant="gold" iconR="chevR" onClick={() => go && go('pricing')}>Upgrade to {tier}</Btn>
    </div>
  );
}

Object.assign(window, {
  Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder,
  LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, UpgradeLock,
  avatarColor, initials, tint, shade, CH, P,
});
