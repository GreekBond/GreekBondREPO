// data/index.js: registers the window.GB cache the screens read from.
//
// Session 3: the social graph (CHAPTERS, PEOPLE) and member-owned records now
// live in Supabase and are loaded into window.GB by db.hydrateCache() after
// auth resolves. NO fake people/chapters are seeded here, the app starts clean
// and empty and fills as real users sign up.
//
// What remains below is deliberately empty-but-shaped (so components that read
// these keys don't crash before/without data) plus the static, non-data UI
// catalogs used by the profile editor. Messages/Alerts stay on the in-memory
// store (store.jsx) this session by design.
import { CHAPTERS } from './chapters.js';
import { PEOPLE } from './people.js';

/* viewer identity, populated by useProfile.injectIdentity() after sign-in */
const ME = {};
const RECRUITER = { name: '', title: '', company: '', plan: '', location: '', hiringFor: [] };

/* feed / discovery, empty until backed by real data */
const POSTS = [];
const SUGGESTED = [];
const FOLLOW_CHAPTERS = [];

/* jobs, sourced from the `jobs` table (empty until posted) */
const JOBS = [];
/* saved jobs + bond count, populated by db.hydrateCache() after sign-in */
const SAVED_JOB_IDS = [];
const BOND_COUNT = 0;

/* chapter events + fundraisers, sourced from the `events` / `fundraisers`
   tables (migrations 0006/0007); hydrated by db.hydrateCache() after sign-in.
   Empty until a chapter admin creates them. */
const EVENTS = [];
const FUNDRAISERS = [];

/* messaging + alerts, remain on the in-memory store (store.jsx) this session */
const THREADS = [];
const ALERTS = [];
const ADMIN_ALERTS = [];

/* chapter console detail, empty-shaped so AdminConsole/ChapterPage don't crash */
const CHAPTER_DETAIL = {
  officers: [], events: [],
  give: { goal: 0, raised: 0, donors: 0, campaign: '', deadline: '' },
  posts: [], verifyQueue: [], roster: [],
  analytics: { views: 0, viewsDelta: 0, posts: 0, newFollowers: 0, verifyPending: 0 },
};

/* recruiter pipeline, empty-shaped */
const PIPELINE = { roles: [], candidates: [], introRequests: [] };

/* heritage timelines + notable alumni, derived/empty (no seeded heritage) */
const TIMELINES = {};
const NOTABLE = {};

/* vouches, sourced from the `vouches` table; merged by store.vouchesFor() */
const VOUCHES = {};

/* ── static UI catalogs (not data, keep) ── */
const OFFER_OPTIONS = ['Warm intros','Mentorship','Hiring','Résumé reviews','Coffee chats','Advice in my field','Mock interviews','Referrals'];
const SEEKING_OPTIONS = ['Internship','First role','New role','Mentees','Mentor','Co-founder','Not looking right now'];
const SKILL_SUGGESTIONS = ['Leadership','Recruiting','Mentorship','Hiring','Finance','Product','Marketing','Operations','Engineering','Public Speaking','Strategy','Sales','Design','Data','Writing','Fundraising'];

window.GB = { CHAPTERS, PEOPLE, ME, RECRUITER, POSTS, SUGGESTED, FOLLOW_CHAPTERS,
  JOBS, SAVED_JOB_IDS, BOND_COUNT, EVENTS, FUNDRAISERS, THREADS, ALERTS, ADMIN_ALERTS, CHAPTER_DETAIL, PIPELINE, TIMELINES, NOTABLE, VOUCHES,
  OFFER_OPTIONS, SEEKING_OPTIONS, SKILL_SUGGESTIONS };

export { CHAPTERS, PEOPLE };
