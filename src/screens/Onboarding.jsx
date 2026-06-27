// Onboarding.jsx: the role fork (§1). Sets role; ends on a "welcome to the house" beat.
import React from 'react';
const { useState: useStateOb } = React;
const { Icon, Crest, Avatar, WarmSignal, warmFacts, bondTies, bondStrengthLabel, HowConnected, Btn, Pill, Card, SectionCard, ImgPlaceholder, LineageBlock, LinkName, Detail, Lbl, Toggle, BondCelebration, EmptyState, avatarColor, initials, tint, shade, CH, P, GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts, addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone, US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf, AutocompleteInput, AutocompleteTags } = window;

function ObShell({ children, step, total }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      {/* texture */}
      <div style={{ position: 'absolute', inset: 0, opacity: .5, background:
        'radial-gradient(900px 500px at 50% -10%, rgba(200,162,60,.16), transparent 70%), radial-gradient(700px 600px at 110% 120%, rgba(122,31,43,.22), transparent 60%)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: .05, background:
        'repeating-linear-gradient(45deg, transparent, transparent 13px, rgba(255,255,255,.6) 13px, rgba(255,255,255,.6) 14px)' }} />
      {/* logo: full lockup, reversed for the navy onboarding ground */}
      <div style={{ position: 'absolute', top: 26, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <window.Logo variant="full" tone="reversed" size={60} />
      </div>
      <div style={{ position: 'relative', width: '100%', maxWidth: 720, animation: 'gb-fade var(--motion-slow) var(--ease-out)' }}>{children}</div>
      {total > 1 && (
        <div style={{ position: 'relative', display: 'flex', gap: 7, marginTop: 34 }}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} style={{ width: i === step ? 26 : 7, height: 7, borderRadius: 999, transition: 'all .2s',
              background: i <= step ? 'var(--gold)' : 'rgba(255,255,255,.22)' }} />
          ))}
        </div>
      )}
    </div>
  );
}

function ObChoice({ icon, title, body, onClick, accent }) {
  const [h, setH] = useStateOb(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ flex: 1, textAlign: 'left', background: h ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.04)',
        border: `1.5px solid ${h ? 'var(--gold)' : 'rgba(255,255,255,.14)'}`, borderRadius: 'var(--radius-lg)', padding: '28px 26px',
        cursor: 'pointer', transition: 'all .18s ease', transform: h ? 'translateY(-3px)' : 'none', color: '#fff' }}>
      <div style={{ width: 52, height: 52, borderRadius: 13, background: accent || 'rgba(200,162,60,.16)', color: 'var(--gold)',
        display: 'grid', placeItems: 'center', marginBottom: 18 }}><Icon name={icon} size={26} /></div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,.66)', lineHeight: 1.55 }}>{body}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, color: 'var(--gold)', fontSize: 13, fontWeight: 600, opacity: h ? 1 : .7 }}>
        Continue <Icon name="chevR" size={15} stroke={2.4} /></div>
    </button>
  );
}

function ObHeading({ over, title, sub }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 34 }}>
      {over && <div style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 14 }}>{over}</div>}
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.12, letterSpacing: '-.01em' }}>{title}</h1>
      {sub && <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,.62)', marginTop: 14, lineHeight: 1.55, maxWidth: 520, marginInline: 'auto' }}>{sub}</p>}
    </div>
  );
}

/* collect-step field shells (visual; not wired to a backend) */
function ObField({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.7)', marginBottom: 7, letterSpacing: '.02em' }}>{label}</div>
      {children}
    </div>
  );
}
const obInput = { width: '100%', height: 46, borderRadius: 10, border: '1.5px solid rgba(255,255,255,.16)',
  background: 'rgba(255,255,255,.06)', color: '#fff', padding: '0 15px', fontSize: 14.5, outline: 'none', fontFamily: 'var(--font-ui)' };
function ObInput(props) {
  return <input {...props} style={obInput} onFocus={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.background = 'rgba(255,255,255,.1)'; }}
    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.16)'; e.target.style.background = 'rgba(255,255,255,.06)'; }} />;
}
function ObChapterPick({ value, onChange }) {
  const chapters = Object.values(window.GB.CHAPTERS);
  if (!chapters.length) {
    return (
      <div style={{ padding: '14px 16px', borderRadius: 11, border: '1px dashed rgba(255,255,255,.2)', background: 'rgba(255,255,255,.04)',
        fontSize: 12.5, color: 'rgba(255,255,255,.6)', lineHeight: 1.5 }}>
        No chapters are loaded yet. You can continue now and your chapter will appear once it joins GreekBond.
      </div>
    );
  }
  return (
    <div className="gb-grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {chapters.map(c => {
        const on = value === c.id;
        return (
          <button key={c.id} onClick={() => onChange(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
            background: on ? 'rgba(200,162,60,.14)' : 'rgba(255,255,255,.05)', border: `1.5px solid ${on ? 'var(--gold)' : 'rgba(255,255,255,.14)'}`,
            borderRadius: 11, padding: '11px 12px', cursor: 'pointer', color: '#fff' }}>
            <Crest chapterId={c.id} size={34} ring={false} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.letters}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.school.split(' ')[0]}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Onboarding({ onDone }) {
  const [path, setPath] = useStateOb([]); // breadcrumb of choices
  const [chapter, setChapter] = useStateOb(''); // chosen chapter id (none until chapters exist)
  // Collect-step values for the in-scope autocomplete fields. None of these
  // persist to the database in this session, Onboarding only forwards role +
  // chapter to onDone(). They exist so the autocomplete components are wired
  // to real state and behave naturally during the wizard.
  const [pledgeClass, setPledgeClass] = useStateOb('');
  const [positions, setPositions] = useStateOb([]);
  const [seeking, setSeeking] = useStateOb('');
  const [title, setTitle] = useStateOb('');
  const [company, setCompany] = useStateOb('');
  const [adminRole, setAdminRole] = useStateOb('');
  const [recruiterCompany, setRecruiterCompany] = useStateOb('');
  const [hiringFor, setHiringFor] = useStateOb([]);
  const last = path[path.length - 1];
  const push = (p) => setPath(a => [...a, p]);
  const back = () => setPath(a => a.slice(0, -1));

  // total steps for the dots: fork → subfork → collect → welcome
  const total = 4;
  const stepIndex = { root: 0, member: 1, org: 1, alumni: 2, undergrad: 2, admin: 2, recruiter: 2, welcome: 3 }[last || 'root'];

  // ── Step: root ──
  if (!last) {
    return (
      <ObShell step={0} total={total}>
        <ObHeading over="Welcome" title="How are you joining GreekBond?" sub="GreekBond is a professional network governed by the bond between brothers and sisters, and the houses that hold them together." />
        <div style={{ display: 'flex', gap: 18 }}>
          <ObChoice icon="bond" title="I’m a member" body="Connect with your brothers and sisters, find mentors, and get hired through your network." onClick={() => push('member')} />
          <ObChoice icon="building" title="I’m an organization" body="Manage your chapter, or hire from a verified pool of Greek talent." onClick={() => push('org')} accent="rgba(255,255,255,.08)" />
        </div>
      </ObShell>
    );
  }

  // ── Step: member sub-fork ──
  if (last === 'member') {
    return (
      <ObShell step={1} total={total}>
        <ObHeading over="Members" title="Where are you in your journey?" />
        <div style={{ display: 'flex', gap: 18 }}>
          <ObChoice icon="graduation" title="Alumnus / Alumna" body="You’ve crossed. Mentor actives, hire through the network, and stay close to the house." onClick={() => push('alumni')} />
          <ObChoice icon="star" title="Current undergraduate" body="You’re active. Bond with alumni, get warm intros, and land your first roles." onClick={() => push('undergrad')} />
        </div>
        <ObBack onClick={back} />
      </ObShell>
    );
  }
  if (last === 'org') {
    return (
      <ObShell step={1} total={total}>
        <ObHeading over="Organizations" title="What do you operate?" />
        <div style={{ display: 'flex', gap: 18 }}>
          <ObChoice icon="shield" title="Chapter / organization admin" body="Run your chapter page, verify members, manage events, and broker access to your alumni." onClick={() => push('admin')} />
          <ObChoice icon="briefcase" title="Employer / recruiter" body="Search a verified Greek talent pool and request intros, brokered through the chapters." onClick={() => push('recruiter')} accent="rgba(255,255,255,.08)" />
        </div>
        <ObBack onClick={back} />
      </ObShell>
    );
  }

  // ── Step: collect (per path) ──
  if (last === 'alumni' || last === 'undergrad') {
    const undergrad = last === 'undergrad';
    return (
      <ObShell step={2} total={total}>
        <ObHeading over={undergrad ? 'Undergraduate' : 'Alumnus / Alumna'} title="Claim your letters" sub="Your house is the heart of your profile. We'll verify it with your chapter." />
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 'var(--radius-lg)', padding: '26px 28px' }}>
          <ObField label="Your chapter"><ObChapterPick value={chapter} onChange={setChapter} /></ObField>
          <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 4 }}>
            <ObField label={undergrad ? 'Expected graduation' : 'Pledge class'}>
              <AutocompleteInput field="pledgeClass" value={pledgeClass} onChange={setPledgeClass} placeholder={undergrad ? 'e.g. Spring 2027' : 'e.g. Fall 2016'} />
            </ObField>
            <ObField label={undergrad ? 'Position in house' : 'Positions held'}>
              <AutocompleteTags field="positions" value={positions} onChange={setPositions} placeholder={undergrad ? 'e.g. Social Chair' : 'e.g. Treasurer'} />
            </ObField>
          </div>
          {undergrad ? (
            <ObField label="What are you seeking?">
              <AutocompleteInput field="headline" value={seeking} onChange={setSeeking} placeholder="e.g. Summer internship in product" />
            </ObField>
          ) : (
            <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <ObField label="Current title"><AutocompleteInput field="title" value={title} onChange={setTitle} placeholder="e.g. Investment Associate" /></ObField>
              <ObField label="Company"><AutocompleteInput field="company" value={company} onChange={setCompany} placeholder="e.g. Hargrove Capital" /></ObField>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
          <ObBack onClick={back} inline />
          <Btn variant="gold" size="lg" iconR="chevR" onClick={() => push('welcome')}>Enter the house</Btn>
        </div>
      </ObShell>
    );
  }
  if (last === 'admin') {
    return (
      <ObShell step={2} total={total}>
        <ObHeading over="Chapter Admin" title="Set up your console" sub="You’ll govern this chapter, verify members, post as the house, and broker recruiter access." />
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 'var(--radius-lg)', padding: '26px 28px' }}>
          <ObField label="Which chapter do you govern?"><ObChapterPick value={chapter} onChange={setChapter} /></ObField>
          <ObField label="Your role in the chapter"><AutocompleteInput field="positions" value={adminRole} onChange={setAdminRole} placeholder="e.g. Chapter President" /></ObField>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', background: 'rgba(200,162,60,.1)', border: '1px solid rgba(200,162,60,.3)', borderRadius: 11, marginTop: 6 }}>
            <span style={{ color: 'var(--gold)' }}><Icon name="shield" size={20} /></span>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.78)', lineHeight: 1.5 }}>We verify that you govern this chapter before activating the console. Verifying your roster is what gives GreekBond its value.</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
          <ObBack onClick={back} inline />
          <Btn variant="gold" size="lg" iconR="chevR" onClick={() => push('welcome')}>Open the console</Btn>
        </div>
      </ObShell>
    );
  }
  if (last === 'recruiter') {
    return (
      <ObShell step={2} total={total}>
        <ObHeading over="Employer / Recruiter" title="Set up your seat" sub="You’re an outside employer, not a brother. Access to talent is brokered through the chapters." />
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 'var(--radius-lg)', padding: '26px 28px' }}>
          <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ObField label="Company"><AutocompleteInput field="company" value={recruiterCompany} onChange={setRecruiterCompany} placeholder="e.g. Lattice Robotics" /></ObField>
            <ObField label="What are you hiring for?"><AutocompleteTags field="title" value={hiringFor} onChange={setHiringFor} placeholder="e.g. Software Engineer" /></ObField>
          </div>
          <ObField label="Choose a plan">
            <div className="gb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Talent', '$0', 'Browse the pool'], ['Talent Pro', '$499/mo', '5 seats · request intros']].map(([n, pr, d], i) => (
                <div key={n} style={{ background: i ? 'rgba(200,162,60,.12)' : 'rgba(255,255,255,.05)', border: `1.5px solid ${i ? 'var(--gold)' : 'rgba(255,255,255,.14)'}`, borderRadius: 11, padding: '14px 16px', color: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{n}</span><span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--gold)' }}>{pr}</span></div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)', marginTop: 3 }}>{d}</div>
                </div>
              ))}
            </div>
          </ObField>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 11, marginTop: 6 }}>
            <span style={{ color: 'rgba(255,255,255,.7)' }}><Icon name="lock" size={18} /></span>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)' }}>Payment gate, a seat is required to message members.</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
          <ObBack onClick={back} inline />
          <Btn variant="gold" size="lg" iconR="lock" onClick={() => push('welcome')}>Pay & activate seat</Btn>
        </div>
      </ObShell>
    );
  }

  // ── Step: welcome (initiation beat) ──
  if (last === 'welcome') {
    const role = path.includes('admin') ? 'admin' : path.includes('recruiter') ? 'recruiter' : path.includes('undergrad') ? 'undergrad' : 'alumni';
    const recruiter = role === 'recruiter';
    const ch = CH(chapter); // safe fallback when no chapter is loaded/selected yet
    return (
      <ObShell step={3} total={total}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22, animation: 'gb-seal .6s ease both' }}>
            {recruiter
              ? <div style={{ width: 96, height: 96, borderRadius: 22, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', color: 'var(--gold)', display: 'grid', placeItems: 'center' }}><Icon name="building" size={44} /></div>
              : <Crest chapterId={chapter} size={104} seal />}
          </div>
          <div style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 14 }}>
            {recruiter ? 'Seat activated' : role === 'admin' ? 'Console activated' : 'Welcome to the house'}</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.1 }}>
            {recruiter ? 'You’re in, ' + window.GB.RECRUITER.name.split(' ')[0] : role === 'admin' ? 'The console is yours' : 'Welcome home'}</h1>
          {!recruiter && role !== 'admin' && (
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 19, color: 'var(--gold)', marginTop: 16 }}>{ch.motto}</p>
          )}
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.66)', marginTop: 14, lineHeight: 1.6, maxWidth: 480, marginInline: 'auto' }}>
            {recruiter ? `Your seat with ${window.GB.RECRUITER.company} is live. Search the talent pool and request intros, brokered through the chapters.`
              : role === 'admin' ? `You now govern ${ch.name}. Verify your roster, post as the house, and decide who reaches your alumni.`
              : `You’re part of ${ch.name}. ${role === 'undergrad' ? 'Bond with alumni and let the network open doors.' : 'Mentor actives and hire through the brothers and sisters you trust.'}`}</p>
          <div style={{ marginTop: 30 }}>
            <Btn variant="gold" size="lg" iconR="chevR" onClick={() => onDone(role, chapter)}>
              {recruiter ? 'Open the console' : role === 'admin' ? 'Open the console' : 'Enter GreekBond'}</Btn>
          </div>
        </div>
      </ObShell>
    );
  }
  return null;
}

function ObBack({ onClick, inline }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 600, padding: inline ? 0 : '18px 0 0', margin: inline ? 0 : '0 auto' }}
      onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.6)'}>
      <Icon name="arrowL" size={16} /> Back</button>
  );
}

Object.assign(window, { Onboarding });
