// Pricing.jsx: in-app pricing, gated behind login (LinkedIn-style placement).
// AlumniPricing (members) · ChapterPricing (admins) · RecruiterAccessBlock + ContactSales.
// Billing is visual/prototype only, CTAs trigger a seal confirmation beat, no real checkout.
import React from 'react';
import { effectivePlan, PLAN_TO_PRICING_ID } from '../lib/plan.js';
const { useState: useStatePr } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf } = window;

/* ───────────────── data ───────────────── */
const ALUMNI_TIERS = [
  { id: 'free',  name: 'Free',       price: 0,  tagline: 'Be here. Be found.',                 cta: 'Get started' },
  { id: 'bond',  name: 'Bond',       price: 10, tagline: 'Put the network to work.',           cta: 'Upgrade to Bond' },
  { id: 'pro',   name: 'Bond Pro',   price: 15, tagline: 'See who’s paying attention.',        cta: 'Upgrade to Bond Pro', recommended: true },
  { id: 'elite', name: 'Bond Elite', price: 20, tagline: 'Stand at the front of the network.', cta: 'Upgrade to Bond Elite' },
];
// [free, bond, pro, elite]
const ALUMNI_FEATURES = [
  ['Create profile',              [1, 1, 1, 1]],
  ['Show up in search',           [1, 1, 1, 1]],
  ['See the network exists',      [1, 1, 1, 1]],
  ['Messaging',                   [0, 1, 1, 1]],
  ['Warm job intros',             [0, 1, 1, 1]],
  ['Mentorship',                  [0, 1, 1, 1]],
  ['Alumni map',                  [0, 1, 1, 1]],
  ['Who viewed you',              [0, 0, 1, 1]],
  ['Priority intro requests',     [0, 0, 1, 1]],
  ['Recruiter visibility toggle', [0, 0, 1, 1]],
  ['Profile analytics',           [0, 0, 0, 1]],
  ['Featured in directory',       [0, 0, 0, 1]],
  ['Early feature access',        [0, 0, 0, 1]],
];
// what each tier ADDS over the one before it (for the card lists)
function tierHighlights(col) {
  return ALUMNI_FEATURES.filter(([, row]) => row[col] && (col === 0 || !row[col - 1])).map(([f]) => f);
}

const CHAPTER_TIERS = [
  { id: 'basic',   name: 'Basic',       under: 200, over: 350, cta: 'Choose Basic',
    blurb: 'Everything a chapter needs to run.',
    includes: ['Chapter page', 'Member directory', 'Admin console', 'Alumni verification'] },
  { id: 'charter', name: 'Charter',     under: 400, over: 600, cta: 'Choose Charter', recommended: true,
    blurb: 'The full network, switched on.',
    includes: ['Everything in Basic', 'Alumni map', 'Analytics dashboard', 'Job board posting'] },
  { id: 'pro',     name: 'Charter Pro', under: 600, over: 900, cta: 'Choose Charter Pro',
    blurb: 'For chapters brokering at scale.',
    includes: ['Everything in Charter', 'Recruiter brokering', 'Priority support', 'Custom branding'] },
];

/* ───────────────── shared chrome ───────────────── */
function PricingHead({ over, title, sub, back, go }) {
  return (
    <div style={{ marginBottom: 26 }}>
      {back && (
        <button onClick={() => go(back[0], back[1])} style={{ background: 'none', border: 'none', color: 'var(--navy)', fontWeight: 600, fontSize: 13.5,
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, cursor: 'pointer' }}>
          <Icon name="arrowL" size={16} /> {back[2]}</button>
      )}
      <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
        <div style={{ color: 'var(--gold-deep)', fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 12 }}>{over}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 600, color: 'var(--navy)', margin: 0, lineHeight: 1.12, letterSpacing: '-.015em', textWrap: 'balance' }}>{title}</h1>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', marginTop: 13, lineHeight: 1.55, textWrap: 'pretty' }}>{sub}</p>
      </div>
    </div>
  );
}

function CheckCell({ on, gold }) {
  if (on) return <span style={{ color: gold ? 'var(--gold-deep)' : 'var(--success)', display: 'inline-grid', placeItems: 'center' }}><Icon name="check" size={18} stroke={2.6} /></span>;
  return <span style={{ display: 'inline-block', width: 14, height: 2, borderRadius: 2, background: 'var(--ink-3)', opacity: .45 }} />;
}

/* ───────────────── 2A · Alumni pricing (member-facing) ───────────────── */
function TierCard({ tier, col, undergrad, current, onPick }) {
  const rec = tier.recommended;
  const isCurrent = current === tier.id;
  const highlights = tierHighlights(col);
  const base = col === 0 ? null : ALUMNI_TIERS[col - 1].name;
  // CTA logic
  let cta, variant = 'outline', disabled = false;
  if (undergrad) {
    cta = tier.id === 'free' ? 'Included for you' : 'Free while enrolled';
    variant = tier.id === 'free' ? 'bonded' : 'subtle'; disabled = true;
  } else if (isCurrent) {
    cta = 'Your current plan'; variant = 'bonded'; disabled = true;
  } else {
    cta = tier.cta; variant = rec ? 'gold' : 'outline';
  }
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column',
      background: rec ? 'linear-gradient(180deg, #fffdf7, #fbf4e1)' : 'var(--surface)',
      border: `1.5px solid ${rec ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)',
      padding: rec ? '26px 22px 22px' : '22px', boxShadow: rec ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      marginTop: rec ? -8 : 0 }}>
      {rec && (
        <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap',
          background: 'var(--gold)', color: '#3a2c08', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
          padding: '5px 13px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 5, boxShadow: 'var(--shadow-sm)' }}>
          <Icon name="seal" size={13} fill="#3a2c08" stroke={0} /> Recommended</div>
      )}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: rec ? '#7a5e12' : 'var(--navy)' }}>{tier.name}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2, minHeight: 36, lineHeight: 1.35 }}>{tier.tagline}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '8px 0 16px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-.02em', lineHeight: 1 }}>${tier.price}</span>
        <span style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 600 }}>{tier.price === 0 ? 'forever' : '/mo'}</span>
      </div>
      <Btn variant={variant} full size="md" onClick={disabled ? undefined : () => onPick(tier)}
        style={disabled ? { cursor: 'default', opacity: undergrad && tier.id !== 'free' ? .85 : 1 } : null}>{cta}</Btn>
      <div style={{ borderTop: '1px solid var(--border)', margin: '18px 0 14px' }} />
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 11 }}>
        {base ? `Everything in ${base}, plus` : 'Included'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {highlights.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.35 }}>
            <span style={{ color: rec ? 'var(--gold-deep)' : 'var(--success)', flex: 'none', marginTop: 1 }}><Icon name="check" size={16} stroke={2.6} /></span>{f}</div>
        ))}
      </div>
    </div>
  );
}

function AlumniPricing({ role, meId, go }) {
  const undergrad = role === 'undergrad';
  const [soon, setSoon] = useStatePr(null);
  // Real current tier (honors god-mode and the non-alumni bypass), mapped to the
  // Pricing-page ids so the right card shows "Your current plan".
  const current = PLAN_TO_PRICING_ID[effectivePlan(P(meId))] || 'free';
  // Stripe is not live yet (V2.4). Picking any non-current tier opens an honest
  // "coming soon" modal and changes nothing in the database. No fake upgrade,
  // and no silent dead clicks (the current-plan card is already disabled).
  const pick = (tier) => { if (tier.id !== current) setSoon(tier); };
  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '26px 16px 72px' }}>
      <PricingHead over="GreekBond Plans"
        title="Free forever to be here. Upgrade to put the network to work."
        sub="Your profile, your lineage, and your house never cost a thing. Pay only when you want the network working for you, messaging, warm intros, and who’s paying attention."
        back={['feed', null, 'Back to home']} go={go} />

      {undergrad ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, maxWidth: 720, margin: '0 auto 26px', padding: '16px 20px',
          background: 'linear-gradient(120deg, #fffdf6, var(--gold-soft))', border: '1px solid var(--gold-line)', borderRadius: 'var(--radius-lg)' }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, flex: 'none', background: 'var(--gold)', color: '#3a2c08', display: 'grid', placeItems: 'center' }}><Icon name="star" size={22} /></span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--navy)' }}>Undergrads have full access, free, while enrolled.</div>
            <div style={{ fontSize: 13.5, color: '#6b5a2e', marginTop: 2, lineHeight: 1.45 }}>Every paid feature below is already yours as an active. This is what you’ll keep building on after you cross.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, margin: '0 0 30px', fontSize: 13, color: 'var(--ink-2)' }}>
          <Icon name="shield" size={15} style={{ color: 'var(--gold-deep)' }} /> Cancel anytime · Billed monthly · Verified members only
        </div>
      )}

      <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start', maxWidth: 1080, margin: '0 auto' }}>
        {ALUMNI_TIERS.map((t, i) => <TierCard key={t.id} tier={t} col={i} undergrad={undergrad} current={current} onPick={pick} />)}
      </div>

      {/* full comparison matrix (verbatim) */}
      <div style={{ maxWidth: 1080, margin: '40px auto 0' }}>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--navy)' }}>Compare every plan</h2>
          </div>
          <div className="gb-scroll-fade">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 620 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '14px 24px', fontWeight: 700, color: 'var(--ink-2)', fontSize: 12.5 }}>Feature</th>
                  {ALUMNI_TIERS.map(t => (
                    <th key={t.id} style={{ padding: '14px 10px', textAlign: 'center', minWidth: 96,
                      background: t.recommended ? 'var(--gold-soft)' : 'transparent', borderBottom: t.recommended ? '2px solid var(--gold)' : 'none' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: t.recommended ? '#7a5e12' : 'var(--navy)' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>${t.price}{t.price ? '/mo' : ''}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALUMNI_FEATURES.map(([feat, row], ri) => (
                  <tr key={feat} style={{ borderTop: '1px solid var(--border-2)' }}>
                    <td style={{ padding: '11px 24px', color: 'var(--ink)', fontWeight: 500 }}>{feat}</td>
                    {row.map((on, ci) => (
                      <td key={ci} style={{ padding: '11px 10px', textAlign: 'center', background: ci === 2 ? 'color-mix(in srgb, var(--gold-soft) 45%, #fff)' : 'transparent' }}>
                        <CheckCell on={on} gold={ci === 2} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </Card>
      </div>

      {soon && <StripeSoon tier={soon} onClose={() => setSoon(null)} />}
    </div>
  );
}

/* Honest upgrade landing until Stripe lands in V2.4. Changes nothing in the DB,
   makes no claim that an upgrade happened. Plans are admin-set via SQL for now. */
function StripeSoon({ tier, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(17,27,61,.55)', backdropFilter: 'blur(4px)',
      display: 'grid', placeItems: 'center', animation: 'gb-fade var(--motion-base) var(--ease-out)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, maxWidth: '90vw', background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        padding: '32px 30px 24px', textAlign: 'center', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--gold-soft)', color: 'var(--gold-deep)', display: 'grid', placeItems: 'center', border: '1px solid var(--gold-line)' }}>
            <Icon name="lock" size={28} /></div>
        </div>
        <div style={{ color: 'var(--gold-deep)', fontSize: 11.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>Coming soon</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 600, color: 'var(--navy)' }}>Upgrades open soon</div>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.55 }}>
          Card payments for {tier.name} aren’t switched on yet. Nothing was charged and your plan hasn’t changed. To move to {tier.name} now, contact the GreekBond team and we’ll set it up for you.</p>
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href={`mailto:team@greekbond.com?subject=${encodeURIComponent('Upgrade to ' + tier.name)}`} style={{ textDecoration: 'none' }}>
            <Btn variant="gold" full>Contact us to upgrade</Btn></a>
          <Btn variant="ghost" full onClick={onClose}>Maybe later</Btn>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 12 }}>Stripe checkout arrives in a future update.</div>
      </div>
    </div>
  );
}

/* ───────────────── 2B · Chapter pricing (admin-facing) ───────────────── */
function ChapterTierCard({ tier, big, onPick }) {
  const rec = tier.recommended;
  const price = big ? tier.over : tier.under;
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column',
      background: rec ? 'linear-gradient(180deg, #fffdf7, #fbf4e1)' : 'var(--surface)',
      border: `1.5px solid ${rec ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)',
      padding: rec ? '26px 24px 24px' : '24px', boxShadow: rec ? 'var(--shadow-md)' : 'var(--shadow-sm)', marginTop: rec ? -8 : 0 }}>
      {rec && (
        <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap',
          background: 'var(--gold)', color: '#3a2c08', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
          padding: '5px 13px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 5, boxShadow: 'var(--shadow-sm)' }}>
          <Icon name="seal" size={13} fill="#3a2c08" stroke={0} /> Recommended</div>
      )}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 600, color: rec ? '#7a5e12' : 'var(--navy)' }}>{tier.name}</div>
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 3, minHeight: 38, lineHeight: 1.4 }}>{tier.blurb}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, margin: '10px 0 18px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-.02em', lineHeight: 1 }}>${price}</span>
        <span style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 600 }}>/semester</span>
      </div>
      <Btn variant={rec ? 'gold' : 'outline'} full size="md" onClick={() => onPick(tier)}>{tier.cta}</Btn>
      <div style={{ borderTop: '1px solid var(--border)', margin: '18px 0 14px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tier.includes.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.35 }}>
            <span style={{ color: rec ? 'var(--gold-deep)' : 'var(--success)', flex: 'none', marginTop: 1 }}><Icon name="check" size={16} stroke={2.6} /></span>{f}</div>
        ))}
      </div>
    </div>
  );
}

function ChapterPricing({ go }) {
  const [big, setBig] = useStatePr(true); // default 50+
  const [soon, setSoon] = useStatePr(null);
  // Same honest landing as alumni plans: no checkout yet, nothing is charged.
  const pick = (tier) => setSoon(tier);
  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '26px 16px 72px' }}>
      <PricingHead over="Chapter Plans"
        title="One flat rate for your whole house, every semester."
        sub="Run your chapter, verify your roster, and open your alumni network. Priced per semester, not per head, so a bigger, stronger chapter never costs you more."
        back={['console', null, 'Back to console']} go={go} />

      {/* member-count toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 30 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 999, padding: 4 }}>
          {[[false, 'Under 50 members'], [true, '50+ members']].map(([v, lb]) => (
            <button key={lb} onClick={() => setBig(v)} style={{ border: 'none', borderRadius: 999, padding: '9px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-ui)', transition: 'all .15s', background: big === v ? 'var(--navy)' : 'transparent', color: big === v ? '#fff' : 'var(--navy-600)' }}>{lb}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, fontSize: 12.5, color: 'var(--ink-2)' }}>
          <Icon name="shield" size={14} style={{ color: 'var(--gold-deep)' }} /> Member count is verified in your admin console, not self-reported.
        </div>
      </div>

      <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, alignItems: 'start', maxWidth: 900, margin: '0 auto' }}>
        {CHAPTER_TIERS.map(t => <ChapterTierCard key={t.id} tier={t} big={big} onPick={pick} />)}
      </div>

      {/* the flat-pricing pitch, a designed sales moment */}
      <div style={{ maxWidth: 900, margin: '40px auto 0', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        background: 'linear-gradient(120deg, var(--navy), var(--navy-700) 64%, #2a1620)', color: '#fff', position: 'relative', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .5, background: 'radial-gradient(700px 360px at 88% 0%, rgba(122,31,43,.4), transparent 62%), radial-gradient(520px 320px at 0% 110%, rgba(200,162,60,.16), transparent 60%)' }} />
        <div style={{ position: 'relative', padding: '34px 38px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(200,162,60,.18)', color: 'var(--gold)', display: 'grid', placeItems: 'center' }}><Icon name="chart" size={17} /></span>
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold)' }}>Why GreekBond</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, margin: 0, lineHeight: 1.18, letterSpacing: '-.01em', maxWidth: 560 }}>
            Flat pricing. <span style={{ color: 'var(--gold)' }}>No per-member surprises.</span></h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.74)', marginTop: 13, lineHeight: 1.6, maxWidth: 600 }}>
            Most chapter platforms charge per member, so your bill climbs every recruitment season. GreekBond’s rate is flat. The more brothers you bring in, the more you save per head.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 22 }}>
            <div style={{ flex: '1 1 200px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', fontWeight: 700 }}>100-member chapter · elsewhere</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, marginTop: 4 }}>~$800<span style={{ fontSize: 14, color: 'rgba(255,255,255,.6)' }}>/sem, and rising</span></div>
            </div>
            <div style={{ flex: '1 1 200px', background: 'rgba(200,162,60,.14)', border: '1px solid var(--gold)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>Same chapter · GreekBond Charter</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, marginTop: 4, color: '#fff' }}>$600<span style={{ fontSize: 14, color: 'rgba(255,255,255,.6)' }}>/sem, flat</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* 2C · recruiter access, no public price */}
      <div style={{ maxWidth: 900, margin: '24px auto 0' }}><RecruiterAccessBlock /></div>

      {soon && <StripeSoon tier={soon} onClose={() => setSoon(null)} />}
    </div>
  );
}

/* ───────────────── 2C · Recruiter access (brokered, contact sales, no tiers) ───────────────── */
function RecruiterAccessBlock({ compact }) {
  const [open, setOpen] = useStatePr(false);
  return (
    <Card style={{ borderColor: '#ddd0ea', background: 'linear-gradient(160deg, #ffffff, #f7f3fb)' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <span style={{ width: 46, height: 46, borderRadius: 12, flex: 'none', background: '#efe9f5', color: '#5b3b82', display: 'grid', placeItems: 'center' }}><Icon name="building" size={24} /></span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--navy)' }}>Talk to us about recruiter access</div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: '5px 0 0', lineHeight: 1.55, maxWidth: 520 }}>
            Recruiters don’t get a public price. Access to a chapter’s talent is brokered through the chapter itself, every intro is approved by an admin before it’s relayed. Tell us who you’re hiring and we’ll set it up.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Btn variant="primary" icon="send" onClick={() => setOpen(true)}>Contact sales</Btn>
        </div>
      </div>
      {open && <ContactSales onClose={() => setOpen(false)} />}
    </Card>
  );
}

function ContactSales({ onClose }) {
  const [sent, setSent] = useStatePr(false);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(17,27,61,.55)', backdropFilter: 'blur(4px)',
      display: 'grid', placeItems: 'center', animation: 'gb-fade var(--motion-base) var(--ease-out)', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 460, maxWidth: '92vw', background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', overflow: 'hidden', animation: 'gb-pop var(--motion-base) var(--ease-out)' }}>
        {sent ? (
          <div style={{ padding: '36px 32px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gold-soft)', color: 'var(--gold-deep)', display: 'grid', placeItems: 'center', animation: 'gb-seal .5s ease both' }}><Icon name="check" size={32} stroke={2.6} /></div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 600, color: 'var(--navy)' }}>We’ll be in touch</div>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 7, lineHeight: 1.5 }}>Thanks, our team will reach out about brokered recruiter access within a day.</p>
            <div style={{ marginTop: 20 }}><Btn variant="gold" full onClick={onClose}>Done</Btn></div>
          </div>
        ) : (
          <>
            <div style={{ padding: '20px 26px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: '#efe9f5', color: '#5b3b82', display: 'grid', placeItems: 'center' }}><Icon name="building" size={20} /></span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--navy)' }}>Contact sales</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Recruiter access · brokered through chapters</div>
              </div>
            </div>
            <div style={{ padding: '20px 26px' }}>
              {[['Work email', 'you@company.com', 'email'], ['Company', 'e.g. Lattice Robotics', 'text']].map(([l, ph, ty]) => (
                <div key={l} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>{l}</div>
                  <input type={ty} placeholder={ph} style={{ width: '100%', height: 44, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', padding: '0 14px', fontSize: 14, fontFamily: 'var(--font-ui)', outline: 'none', color: 'var(--ink)' }} />
                </div>
              ))}
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>Who are you hiring for?</div>
                <textarea placeholder="Roles, chapters, timeline…" rows={3} style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', padding: '11px 14px', fontSize: 14, fontFamily: 'var(--font-ui)', outline: 'none', resize: 'vertical', color: 'var(--ink)' }} />
              </div>
            </div>
            <div style={{ padding: '0 26px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
              <Btn variant="primary" icon="send" onClick={() => setSent(true)}>Send to sales</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { AlumniPricing, ChapterPricing, RecruiterAccessBlock, ContactSales });
