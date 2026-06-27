// db.js: the Supabase data layer. All reads/writes go through here.
//
// The app's components still read the prototype's nested, camelCase shape via
// the synchronous window.GB cache and the P(id)/CH(id) accessors. So this
// module does two jobs:
//   1. typed async read/write functions against Supabase (the real source)
//   2. transforms between DB rows (snake_case, normalized lineage) and the
//      prototype shape, plus hydrateCache() which loads the DB into window.GB
//      so existing screens keep working unchanged.
import { supabase } from './supabase.js'

/* ─────────────────── viewer role (RLS routing) ───────────────────
   Session 4: RLS is live. Recruiters can't read the full profiles table, the
   bonds table, or vouch content. We track the viewer's role here so reads are
   routed to the right source (the restricted recruiter view) and recruiter-only
   blocks are short-circuited instead of firing queries RLS would reject. The
   server enforces all of this regardless; this just keeps the client honest and
   avoids failed requests. Role is set by hydrateCache (called from useProfile). */
let VIEWER_ROLE = null
export function setViewerRole(role) { VIEWER_ROLE = role || null }
function isRecruiter() { return VIEWER_ROLE === 'recruiter' }
const RECRUITER_VIEW = 'profiles_recruiter_view'
// Recruiters read the restricted column projection; everyone else the full table.
function profileSource() { return isRecruiter() ? RECRUITER_VIEW : 'profiles' }

/* ─────────────────────────── transforms ─────────────────────────── */

export function chapterFromRow(r) {
  if (!r) return null
  return {
    id: r.id, letters: r.letters, name: r.name, kind: r.kind, council: r.council,
    color: r.color, ink: r.ink, school: r.school, founded: r.founded,
    members: r.members, alumni: r.alumni, gpa: r.gpa, motto: r.motto,
    city: r.city, noun: r.noun, plural: r.plural,
  }
}

// Row → prototype PEOPLE shape. `littles`/`little` are filled in by the caller
// (hydrateCache) which has every row and can derive them from big_id.
export function profileFromRow(r) {
  if (!r) return null
  const line = {}
  if (r.big_id) line.big = r.big_id
  if (r.line_name) line.name = r.line_name
  line.littles = []
  return {
    id: r.id, userId: r.user_id, email: r.email, name: r.name || '',
    role: r.role, chapter: r.chapter_id, avatarUrl: r.avatar_url || null,
    headline: r.headline, company: r.company, title: r.title,
    location: r.location, school: r.school,
    classYear: r.class_year, gradYear: r.grad_year, pledgeClass: r.pledge_class,
    industry: r.industry, about: r.about, open: r.open, offerNote: r.offer_note,
    verified: !!r.verified,
    positions: r.positions || [], honors: r.honors || [], skills: r.skills || [],
    offers: r.offers || [], seekingTags: r.seeking_tags || [], seeking: r.seeking,
    line,
    // subscription tier + god-mode (V2.3). The recruiter view omits these, but
    // non-alumni bypass plan gates anyway, so the fallbacks are safe.
    plan: r.plan || 'free', isGod: !!r.is_god,
    bonds: 0, mutuals: 0, bonded: false,
  }
}

// Prototype patch (camelCase, possibly nested line) → DB columns (snake_case).
const COLUMN_MAP = {
  // accept both the real column name (preferred for writes) and the legacy alias
  name: 'name', role: 'role', chapter_id: 'chapter_id', chapter: 'chapter_id', email: 'email',
  headline: 'headline', company: 'company', title: 'title', location: 'location',
  school: 'school', classYear: 'class_year', gradYear: 'grad_year',
  pledgeClass: 'pledge_class', industry: 'industry', about: 'about', open: 'open',
  offerNote: 'offer_note', verified: 'verified', positions: 'positions',
  honors: 'honors', skills: 'skills', offers: 'offers', seekingTags: 'seeking_tags',
  seeking: 'seeking', avatarUrl: 'avatar_url', avatar_url: 'avatar_url',
}
export function toProfileRow(patch) {
  const row = {}
  for (const [k, v] of Object.entries(patch || {})) {
    if (k === 'line' && v && typeof v === 'object') {
      if ('big' in v) row.big_id = v.big || null
      if ('name' in v) row.line_name = v.name || null
    } else if (k in COLUMN_MAP) {
      row[COLUMN_MAP[k]] = v
    }
  }
  return row
}

/* ─────────────────────────── chapters ─────────────────────────── */

export async function listChapters() {
  const { data, error } = await supabase.from('chapters').select('*').order('name')
  if (error) throw error
  return (data || []).map(chapterFromRow)
}
export async function getChapter(id) {
  const { data, error } = await supabase.from('chapters').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return chapterFromRow(data)
}

/* ─────────────────────────── profiles ─────────────────────────── */

export async function getProfile(id) {
  const { data, error } = await supabase.from(profileSource()).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return profileFromRow(data)
}
export async function getProfileByUser(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return profileFromRow(data)
}
export async function getProfileByEmail(email) {
  if (!email) return null
  const { data, error } = await supabase.from('profiles').select('*')
    .ilike('email', email).is('user_id', null).limit(1)
  if (error) throw error
  return profileFromRow((data || [])[0])
}

export async function listMembers(filters = {}) {
  // Recruiters read the restricted view (RLS denies them the full profiles table).
  let q = supabase.from(profileSource()).select('*')
  if (filters.chapterId) q = q.eq('chapter_id', filters.chapterId)
  if (filters.role && !isRecruiter()) q = q.eq('role', filters.role)  // view has no role column
  const { data, error } = await q
  if (error) throw error
  return (data || []).map(profileFromRow)
}

export async function updateProfile(id, patch) {
  const row = toProfileRow(patch)
  const { data, error } = await supabase.from('profiles').update(row).eq('id', id).select('*').single()
  if (error) throw error
  return profileFromRow(data)
}

/* ─────────────────────────── avatar upload ───────────────────────────
   Uploads a profile photo to the public `avatars` bucket (migration 0014)
   under a per-user path so the storage RLS lets a user overwrite only their
   own file. Returns a public URL (cache-busted so an overwrite shows at once).
   Validates type + size client-side; the bucket also enforces both server-side. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const AVATAR_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export async function uploadAvatar(userId, file) {
  if (!userId) throw new Error('You must be signed in to change your photo.')
  if (!file) throw new Error('No image selected.')
  const ext = AVATAR_EXT[file.type]
  if (!ext) throw new Error('Please use a JPG, PNG, or WebP image.')
  if (file.size > AVATAR_MAX_BYTES) throw new Error('That image is too large. The limit is 5 MB.')

  const path = `${userId}/avatar.${ext}`
  const { error: upErr } = await supabase.storage.from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' })
  if (upErr) throw upErr

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  if (!data || !data.publicUrl) throw new Error('Upload succeeded but no public URL was returned.')
  return `${data.publicUrl}?t=${Date.now()}`
}

/* ─────────────────────────── search / typeahead ───────────────────────────
   Live prefix search against Supabase (ilike `term%`), grouped into People,
   Companies, Schools, Job titles, and Chapters. RLS-aware: recruiters read the
   restricted profiles view (no school / lineage) and never the chapters list,
   so their suggestions are People + Companies + Job titles only. */

const SUGGEST_GROUP_CAP = 5
const SUGGEST_TOTAL_CAP = 12

// Strip characters that would break a PostgREST .or() filter; keep it a plain
// prefix term. We always append our own `%`.
function safeTerm(term) {
  return (term || '').replace(/[,()*%\\]/g, ' ').trim()
}
function dedupeStrings(rows, key, cap) {
  const seen = new Set()
  const out = []
  for (const r of rows || []) {
    const v = r && r[key]
    if (!v) continue
    const k = v.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(v)
    if (out.length >= cap) break
  }
  return out
}

export async function searchSuggestions(rawTerm) {
  const term = safeTerm(rawTerm)
  if (!term) return null
  const recruiter = isRecruiter()
  const like = term + '%'
  const src = profileSource()

  const peopleQ = supabase.from(src)
    .select('id,name,headline,company,title,chapter_id')
    .or(`name.ilike.${like},headline.ilike.${like}`).limit(SUGGEST_GROUP_CAP)
  const companyQ = supabase.from(src).select('company').ilike('company', like).limit(20)
  const titleQ = supabase.from(src).select('title').ilike('title', like).limit(20)
  // school + chapters are member-only (chapters aren't part of a recruiter's
  // restricted talent search). School is now in the recruiter view (0012) so
  // recruiters do get school suggestions, just no chapter group.
  const schoolQ = supabase.from(src).select('school').ilike('school', like).limit(20)
  const chapterQ = recruiter ? null : supabase.from('chapters')
    .select('id,name,letters').or(`name.ilike.${like},letters.ilike.${like}`).limit(SUGGEST_GROUP_CAP)

  const [people, companies, titles, schools, chapters] = await Promise.all([
    peopleQ, companyQ, titleQ,
    schoolQ || Promise.resolve({ data: [] }),
    chapterQ || Promise.resolve({ data: [] }),
  ])

  const groups = []
  const peopleItems = (people.data || []).map(r => ({
    kind: 'person', id: r.id, name: r.name || 'Member',
    sub: r.headline || [r.title, r.company].filter(Boolean).join(' at ') || '',
    chapterId: r.chapter_id || null,
  }))
  if (peopleItems.length) groups.push({ key: 'person', label: 'People', items: peopleItems })

  if (!recruiter) {
    const chapterItems = (chapters.data || []).map(r => ({
      kind: 'chapter', id: r.id, letters: r.letters || '', name: r.name || r.id,
    }))
    if (chapterItems.length) groups.push({ key: 'chapter', label: 'Chapters', items: chapterItems })
  }

  const companyItems = dedupeStrings(companies.data, 'company', SUGGEST_GROUP_CAP).map(v => ({ kind: 'company', value: v }))
  if (companyItems.length) groups.push({ key: 'company', label: 'Companies', items: companyItems })

  const titleItems = dedupeStrings(titles.data, 'title', SUGGEST_GROUP_CAP).map(v => ({ kind: 'title', value: v }))
  if (titleItems.length) groups.push({ key: 'title', label: 'Job titles', items: titleItems })

  const schoolItems = dedupeStrings(schools.data, 'school', SUGGEST_GROUP_CAP).map(v => ({ kind: 'school', value: v }))
  if (schoolItems.length) groups.push({ key: 'school', label: 'Schools', items: schoolItems })

  // Enforce the overall cap by trimming whole-ish, keeping group order priority.
  let budget = SUGGEST_TOTAL_CAP
  const flat = []
  const capped = []
  for (const g of groups) {
    if (budget <= 0) break
    const items = g.items.slice(0, budget)
    if (!items.length) continue
    capped.push({ ...g, items })
    for (const it of items) flat.push(it)
    budget -= items.length
  }
  return { groups: capped, flat }
}

// Full results page: people matching a chosen company / title / school facet,
// or a free-text keyword across the recruiter-safe fields. Returns the prototype
// profile shape so cards can render via P(id).
export async function searchPeople({ field, value, limit = 60 }) {
  const src = profileSource()
  const v = safeTerm(value)
  let q = supabase.from(src).select('*')
  if (field === 'company') q = q.ilike('company', v)
  else if (field === 'title') q = q.ilike('title', v)
  else if (field === 'school') q = q.ilike('school', v)
  else q = q.or(`name.ilike.%${v}%,headline.ilike.%${v}%,company.ilike.%${v}%,title.ilike.%${v}%`)
  const { data, error } = await q.limit(limit)
  if (error) throw error
  return (data || []).map(profileFromRow)
}

// Count of members marked "open to work" (open = 'work') that the caller is
// allowed to see. Routes through profileSource(), so a recruiter counts via
// profiles_recruiter_view (recruiter-safe columns for everyone) and a member
// counts via the RLS-scoped profiles table. head:true means no rows are
// transferred, just the exact count.
export async function countOpenToWork() {
  const { count, error } = await supabase.from(profileSource())
    .select('id', { count: 'exact', head: true }).eq('open', 'work')
  if (error) throw error
  return count || 0
}

// The claim-or-create pattern (the heart of the growth model):
//   1. already-claimed profile (user_id = this user)        → return it
//   2. pre-loaded unclaimed row (email match, user_id null)  → claim it
//   3. otherwise                                             → create fresh
export async function claimOrCreateProfile(user) {
  if (!user) return null

  let profile = null
  const byUser = await getProfileByUser(user.id)
  if (byUser) {
    profile = byUser
  } else {
    // Claim a pre-loaded unclaimed row matching the user's verified email. Under
    // RLS a brand-new user can't read other rows or update a NULL-user_id row, so
    // this runs server-side via a SECURITY DEFINER function (see 0002_rls.sql). It
    // returns the claimed row, or null if no pre-loaded row matched.
    const { data: claimed, error: claimErr } = await supabase.rpc('claim_profile_by_email')
    if (claimErr) throw claimErr
    if (claimed) {
      profile = profileFromRow(claimed)
    } else {
      const email = user.email || null
      const fullName = (user.user_metadata && user.user_metadata.full_name) || ''
      const { data: created, error: createErr } = await supabase
        .from('profiles').insert({ user_id: user.id, email, name: fullName }).select('*').single()
      if (createErr) throw createErr
      profile = profileFromRow(created)
    }
  }

  // Growth model: if the user arrived via a chapter invite code (stashed at
  // sign-up), redeem it now, links their profile to the chapter and marks the
  // invite claimed. Best-effort: a bad/expired code just clears and is ignored.
  return await maybeRedeemPendingInvite(profile)
}

const INVITE_CODE_KEY = 'gb_invite_code'
async function maybeRedeemPendingInvite(profile) {
  if (!profile) return profile
  let code = null
  try { code = typeof localStorage !== 'undefined' ? localStorage.getItem(INVITE_CODE_KEY) : null } catch {}
  if (!code) return profile
  try {
    const updated = await redeemInviteCode(code)
    if (updated) profile = profileFromRow(updated)
  } catch (e) {
    const msg = (e && e.message) || 'Invalid or expired invite code'
    console.warn('[invite] could not redeem code:', msg)
    if (typeof window !== 'undefined' && window.__notify) window.__notify(msg)
  } finally {
    try { localStorage.removeItem(INVITE_CODE_KEY) } catch {}
  }
  return profile
}

/* ─────────────────────────── bonds ─────────────────────────── */

export async function listAllBonds() {
  if (isRecruiter()) return []  // Rule 2: recruiters have no access to bonds
  const { data, error } = await supabase.from('bonds').select('*')
  if (error) throw error
  return data || []
}
export async function listBonds(profileId) {
  if (isRecruiter()) return []  // Rule 2: recruiters have no access to bonds
  const { data, error } = await supabase.from('bonds').select('*')
    .or(`a_id.eq.${profileId},b_id.eq.${profileId}`)
  if (error) throw error
  return data || []
}
// Mutual: stored once. If a row already exists in either direction, return it.
export async function createBond(aId, bId, status = 'bonded') {
  if (!aId || !bId || aId === bId) return null
  const { data: existing, error: exErr } = await supabase.from('bonds').select('*')
    .or(`and(a_id.eq.${aId},b_id.eq.${bId}),and(a_id.eq.${bId},b_id.eq.${aId})`).limit(1)
  if (exErr) throw exErr
  if (existing && existing.length) return existing[0]
  const { data, error } = await supabase.from('bonds')
    .insert({ a_id: aId, b_id: bId, status }).select('*').single()
  if (error) throw error
  return data
}
// Un-bond / cancel-request: removes the row in EITHER direction. The bonds
// DELETE policy (0002_rls) lets either party delete, so this works whether the
// caller is the initiator (a_id) or the recipient (b_id).
export async function deleteBond(aId, bId) {
  if (!aId || !bId) return
  const { error } = await supabase.from('bonds').delete()
    .or(`and(a_id.eq.${aId},b_id.eq.${bId}),and(a_id.eq.${bId},b_id.eq.${aId})`)
  if (error) throw error
}
// Accept a pending request: set the shared row to the given status. Either
// party may update under the bonds UPDATE policy.
export async function setBondStatus(aId, bId, status = 'bonded') {
  if (!aId || !bId) return null
  const { data, error } = await supabase.from('bonds').update({ status })
    .or(`and(a_id.eq.${aId},b_id.eq.${bId}),and(a_id.eq.${bId},b_id.eq.${aId})`)
    .select('*')
  if (error) throw error
  return (data && data[0]) || null
}
// Viewer-relative bond state, read from the hydrated cache (window.GB.BONDS).
// Returns one of: 'none' | 'bonded' | 'pending-out' (you asked) |
// 'pending-in' (they asked). Drives the toggle button label/action.
export function bondState(viewerId, personId) {
  if (!viewerId || !personId) return { state: 'none', row: null }
  const bonds = (typeof window !== 'undefined' && window.GB && window.GB.BONDS) || []
  const row = bonds.find(b =>
    (b.a_id === viewerId && b.b_id === personId) ||
    (b.a_id === personId && b.b_id === viewerId))
  if (!row) return { state: 'none', row: null }
  if (row.status === 'bonded') return { state: 'bonded', row }
  return { state: row.a_id === viewerId ? 'pending-out' : 'pending-in', row }
}

/* ─────────────────────────── follows ─────────────────────────── */

export async function listFollows(profileId) {
  const { data, error } = await supabase.from('follows').select('*').eq('profile_id', profileId)
  if (error) throw error
  return data || []
}
export async function createFollow(profileId, chapterId) {
  if (!profileId || !chapterId) return null
  const { data, error } = await supabase.from('follows')
    .upsert({ profile_id: profileId, chapter_id: chapterId }, { onConflict: 'profile_id,chapter_id' })
    .select('*').single()
  if (error) throw error
  return data
}

/* ─────────────────────────── vouches ─────────────────────────── */

// Returns { count, items }. Rule 3: recruiters see the COUNT (trust signal) but
// never the content, they get items: [] and a count from a definer function.
export async function listVouches(subjectId) {
  if (isRecruiter()) {
    const { data, error } = await supabase.rpc('vouch_count', { subject: subjectId })
    if (error) throw error
    return { count: data || 0, items: [] }
  }
  const { data, error } = await supabase.from('vouches').select('*')
    .eq('subject_id', subjectId).order('created_at', { ascending: false })
  if (error) throw error
  return { count: (data || []).length, items: data || [] }
}
export async function createVouch({ authorId, subjectId, body }) {
  const { data, error } = await supabase.from('vouches')
    .insert({ author_id: authorId, subject_id: subjectId, body }).select('*').single()
  if (error) throw error
  return data
}

/* ─────────────────────────── jobs ─────────────────────────── */

// Row → the shape Jobs.jsx reads (matches the legacy in-memory JOBS items).
export function jobFromRow(r) {
  if (!r) return null
  const salary = formatSalary(r.salary_min, r.salary_max, r.salary_currency)
  return {
    id: r.id,
    via: r.via || 'employer',
    poster: r.poster_id,
    title: r.title || '',
    company: r.company || '',
    location: r.location || '',
    type: r.type || '',
    pay: salary || r.pay || '',
    salaryMin: r.salary_min != null ? Number(r.salary_min) : null,
    salaryMax: r.salary_max != null ? Number(r.salary_max) : null,
    salaryCurrency: r.salary_currency || 'USD',
    experience: r.experience || '',
    applyUrl: r.apply_url || null,
    applyEmail: r.apply_email || null,
    tags: r.tags || [],
    refer: !!r.refer,
    desc: r.description || '',
    description: r.description || '',
    createdAt: r.created_at,
    posted: relativeJobAge(r.created_at),
    applicants: 0,
  }
}

function relativeJobAge(iso) {
  if (!iso) return 'recent'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 7) return days + ' days ago'
  if (days < 30) return Math.floor(days / 7) + 'w ago'
  return Math.floor(days / 30) + 'mo ago'
}

function formatSalary(min, max, currency) {
  if (min == null && max == null) return ''
  const symbol = (currency || 'USD') === 'USD' ? '$' : ''
  const fmt = (n) => Number(n) >= 1000 ? symbol + Math.round(Number(n) / 1000) + 'k' : symbol + Number(n)
  if (min != null && max != null) return `${fmt(min)} to ${fmt(max)}`
  if (min != null) return `${fmt(min)}+`
  return `up to ${fmt(max)}`
}

export async function listJobs() {
  const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(jobFromRow)
}
export async function listJobsByPoster(posterId) {
  const { data, error } = await supabase.from('jobs').select('*')
    .eq('poster_id', posterId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(jobFromRow)
}
export async function createJob(payload) {
  // Accept either the structured composer payload or a raw db row.
  const row = {
    via: payload.via || 'employer',
    poster_id: payload.posterId || payload.poster_id || null,
    title: payload.title || '',
    company: payload.company || '',
    location: payload.location || '',
    type: payload.type || null,
    pay: payload.pay || null,
    salary_min: payload.salaryMin ?? payload.salary_min ?? null,
    salary_max: payload.salaryMax ?? payload.salary_max ?? null,
    salary_currency: payload.salaryCurrency || payload.salary_currency || 'USD',
    apply_url: payload.applyUrl || payload.apply_url || null,
    apply_email: payload.applyEmail || payload.apply_email || null,
    experience: payload.experience || null,
    tags: payload.tags || [],
    refer: payload.refer === true,
    description: payload.description || payload.desc || '',
  }
  const { data, error } = await supabase.from('jobs').insert(row).select('*').single()
  if (error) throw error
  return jobFromRow(data)
}
export async function updateJob(id, patch) {
  const row = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.company !== undefined) row.company = patch.company
  if (patch.location !== undefined) row.location = patch.location
  if (patch.type !== undefined) row.type = patch.type
  if (patch.pay !== undefined) row.pay = patch.pay
  if (patch.salaryMin !== undefined) row.salary_min = patch.salaryMin
  if (patch.salaryMax !== undefined) row.salary_max = patch.salaryMax
  if (patch.salaryCurrency !== undefined) row.salary_currency = patch.salaryCurrency
  if (patch.applyUrl !== undefined) row.apply_url = patch.applyUrl
  if (patch.applyEmail !== undefined) row.apply_email = patch.applyEmail
  if (patch.experience !== undefined) row.experience = patch.experience
  if (patch.tags !== undefined) row.tags = patch.tags
  if (patch.description !== undefined) row.description = patch.description
  const { data, error } = await supabase.from('jobs').update(row).eq('id', id).select('*').single()
  if (error) throw error
  return jobFromRow(data)
}
export async function deleteJob(id) {
  const { error } = await supabase.from('jobs').delete().eq('id', id)
  if (error) throw error
}
// Reload window.GB.JOBS after recruiter mutations so the lists react.
export async function refreshJobs() {
  const jobs = await listJobs()
  if (typeof window !== 'undefined' && window.GB) window.GB.JOBS = jobs
  return jobs
}

/* ─────────────────────────── saved searches ─────────────────────────── */

export async function listSavedSearches(profileId) {
  if (!profileId) return []
  const { data, error } = await supabase.from('saved_searches').select('*')
    .eq('profile_id', profileId).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function createSavedSearch({ profileId, name, query, filters }) {
  const row = {
    profile_id: profileId,
    name: (name || '').trim() || null,
    query: (query || '').trim() || null,
    filters: filters || {},
  }
  const { data, error } = await supabase.from('saved_searches').insert(row).select('*').single()
  if (error) throw error
  return data
}
export async function renameSavedSearch(id, name) {
  const { data, error } = await supabase.from('saved_searches').update({ name: (name || '').trim() || null })
    .eq('id', id).select('*').single()
  if (error) throw error
  return data
}
export async function deleteSavedSearch(id) {
  const { error } = await supabase.from('saved_searches').delete().eq('id', id)
  if (error) throw error
}
export async function touchSavedSearch(id) {
  const { data, error } = await supabase.from('saved_searches').update({ last_run_at: new Date().toISOString() })
    .eq('id', id).select('*').single()
  if (error) throw error
  return data
}

/* ─────────────────────────── intro requests ─────────────────────────── */

export async function createIntroRequest({ requesterId, targetId, brokerAdminId = null, intent, note }) {
  const { data, error } = await supabase.from('intro_requests')
    .insert({ requester_id: requesterId, target_id: targetId, broker_admin_id: brokerAdminId, intent, note })
    .select('*').single()
  if (error) throw error
  return data
}
export async function listIntroRequests(profileId) {
  const { data, error } = await supabase.from('intro_requests').select('*')
    .or(`requester_id.eq.${profileId},target_id.eq.${profileId}`)
  if (error) throw error
  return data || []
}

// Chapter admin's intro queue. Embeds the requester (the recruiter or member who
// asked) and the target (the brother/sister being requested) from profiles. The
// 0012 intro_select RLS already scopes the rows to the admin's chapter members,
// so this is a plain select; the screen filters target.chapter_id to the admin's
// chapter as belt-and-braces. Admins can read full profiles (0002 profiles_select),
// so both embeds resolve. Newest first.
export async function listChapterIntroRequests(adminProfileId) {
  const { data, error } = await supabase.from('intro_requests')
    .select(`
      id, requester_id, target_id, broker_admin_id, intent, note, status, created_at,
      requester:requester_id ( id, name, company, title, headline, role ),
      target:target_id ( id, name, headline, chapter_id, role )
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Approve ('accepted') or decline ('declined') a request. On approve we stamp
// broker_admin_id with the acting admin so the row records who brokered it (and
// so the admin keeps read/update access via the broker_admin_id clause). The DB
// status check constraint allows only pending/accepted/declined; the UI shows
// 'accepted' as "Approved". RLS (0012 intro_update) permits this for the target's
// chapter admin. Real errors propagate to the caller.
export async function resolveIntroRequest(id, status, brokerAdminId = null) {
  if (!['accepted', 'declined'].includes(status)) throw new Error('invalid status: ' + status)
  const patch = { status }
  if (status === 'accepted' && brokerAdminId) patch.broker_admin_id = brokerAdminId
  const { data, error } = await supabase.from('intro_requests')
    .update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

// A requester's own intro requests (recruiter or member), newest first. Recruiters
// cannot read the profiles table (0002 profiles_select excludes their role), so we
// resolve target display info through profiles_recruiter_view, which is granted to
// all authenticated and exposes recruiter-safe fields only. Members hit the same
// path harmlessly.
export async function listMyIntroRequests(profileId) {
  const { data, error } = await supabase.from('intro_requests')
    .select('id, target_id, broker_admin_id, intent, note, status, created_at')
    .eq('requester_id', profileId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = data || []
  const ids = [...new Set(rows.map(r => r.target_id).filter(Boolean))]
  let byId = {}
  if (ids.length) {
    const { data: people, error: pErr } = await supabase.from('profiles_recruiter_view')
      .select('id, name, company, title, headline, chapter_id').in('id', ids)
    if (pErr) throw pErr
    byId = Object.fromEntries((people || []).map(p => [p.id, p]))
  }
  return rows.map(r => ({ ...r, target: byId[r.target_id] || null }))
}

/* ─────────────────── chapter content: events + fundraisers ───────────────────
   Real tables behind the old in-memory CHAPTER_DETAIL.events / .give placeholders
   (migrations 0006/0007). RLS scopes reads to chapters the viewer belongs to or
   follows, so a plain select returns only the rows they're allowed to see. */

// Short date label ("MAR 14") + a friendly when ("Fri 7:00 PM") for the
// existing EventRow UI, plus the raw fields for any future screen.
function eventDateLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short' }).toUpperCase() + ' ' + d.getDate()
}
function eventWhenLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

// Row → the shape ChapterPage's EventRow reads (date/when/where/title/rsvps),
// with the raw fields carried alongside for future use.
export function eventFromRow(r) {
  if (!r) return null
  return {
    id: r.id, chapter: r.chapter_id, createdBy: r.created_by,
    title: r.title, description: r.description || '',
    location: r.location || '', where: r.location || '',
    startAt: r.start_at, endAt: r.end_at, coverUrl: r.cover_url || null,
    date: eventDateLabel(r.start_at), when: eventWhenLabel(r.start_at),
    rsvps: 0,
  }
}

// Row → the shape ChapterPage's give cards read. Display / link-out ONLY: there
// is no money in GreekBond, so raised/donors are always 0 and the action is the
// outbound externalUrl. goal_amount is a display target.
export function fundraiserFromRow(r) {
  if (!r) return null
  return {
    id: r.id, chapter: r.chapter_id, createdBy: r.created_by,
    title: r.title, description: r.description || '',
    goalAmount: r.goal_amount, externalUrl: r.external_url || null,
    coverUrl: r.cover_url || null, active: r.active !== false,
    // legacy give-card fields (no money is tracked through GreekBond):
    campaign: r.title, goal: Number(r.goal_amount) || 0, raised: 0, donors: 0, deadline: '',
  }
}

export async function listEvents(chapterId) {
  let q = supabase.from('events').select('*').order('start_at', { ascending: true })
  if (chapterId) q = q.eq('chapter_id', chapterId)
  const { data, error } = await q
  if (error) throw error
  return (data || []).map(eventFromRow)
}
export async function createEvent({ chapterId, createdBy, title, description, location, startAt, endAt, coverUrl }) {
  const { data, error } = await supabase.from('events').insert({
    chapter_id: chapterId, created_by: createdBy || null, title, description: description || null,
    location: location || null, start_at: startAt || null, end_at: endAt || null, cover_url: coverUrl || null,
  }).select('*').single()
  if (error) throw error
  return eventFromRow(data)
}
export async function updateEvent(id, fields) {
  const row = {}
  if (fields.title != null) row.title = fields.title
  if (fields.description != null) row.description = fields.description
  if (fields.location != null) row.location = fields.location
  if (fields.startAt != null) row.start_at = fields.startAt
  if (fields.endAt != null) row.end_at = fields.endAt
  if (fields.coverUrl != null) row.cover_url = fields.coverUrl
  const { data, error } = await supabase.from('events').update(row).eq('id', id).select('*').single()
  if (error) throw error
  return eventFromRow(data)
}
export async function deleteEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}

export async function listFundraisers(chapterId) {
  let q = supabase.from('fundraisers').select('*').order('created_at', { ascending: false })
  if (chapterId) q = q.eq('chapter_id', chapterId)
  const { data, error } = await q
  if (error) throw error
  return (data || []).map(fundraiserFromRow)
}
export async function createFundraiser({ chapterId, createdBy, title, description, goalAmount, externalUrl, coverUrl, active = true }) {
  const { data, error } = await supabase.from('fundraisers').insert({
    chapter_id: chapterId, created_by: createdBy || null, title, description: description || null,
    goal_amount: goalAmount ?? null, external_url: externalUrl || null, cover_url: coverUrl || null, active,
  }).select('*').single()
  if (error) throw error
  return fundraiserFromRow(data)
}
export async function updateFundraiser(id, fields) {
  const row = {}
  if (fields.title != null) row.title = fields.title
  if (fields.description != null) row.description = fields.description
  if (fields.goalAmount !== undefined) row.goal_amount = fields.goalAmount
  if (fields.externalUrl != null) row.external_url = fields.externalUrl
  if (fields.coverUrl != null) row.cover_url = fields.coverUrl
  if (fields.active !== undefined) row.active = fields.active
  const { data, error } = await supabase.from('fundraisers').update(row).eq('id', id).select('*').single()
  if (error) throw error
  return fundraiserFromRow(data)
}
export async function deleteFundraiser(id) {
  const { error } = await supabase.from('fundraisers').delete().eq('id', id)
  if (error) throw error
}

// Reload events/fundraisers for a chapter into window.GB after admin mutations.
export async function refreshChapterContent(chapterId) {
  const [events, fundraisers] = await Promise.all([
    listEvents(chapterId),
    listFundraisers(chapterId),
  ])
  if (typeof window !== 'undefined' && window.GB) {
    const prevEvents = window.GB.EVENTS || []
    const prevFunds = window.GB.FUNDRAISERS || []
    window.GB.EVENTS = [...prevEvents.filter(e => e.chapter !== chapterId), ...events]
    window.GB.FUNDRAISERS = [...prevFunds.filter(f => f.chapter !== chapterId), ...fundraisers]
    const detail = window.GB.CHAPTER_DETAIL || {}
    const liveFund = fundraisers.find(f => f.active) || null
    window.GB.CHAPTER_DETAIL = {
      ...detail,
      events,
      give: liveFund || detail.give,
    }
  }
  return { events, fundraisers }
}

/* ─────────────────────────── chapter invites ─────────────────────────── */

function inviteFromRow(r) {
  if (!r) return null
  const expired = r.expires_at && new Date(r.expires_at).getTime() <= Date.now()
  let status = 'unclaimed'
  if (r.claimed_by) status = 'claimed'
  else if (expired) status = 'expired'
  return {
    id: r.id, chapterId: r.chapter_id, code: r.code,
    email: r.email || null, createdBy: r.created_by,
    claimedBy: r.claimed_by, claimedAt: r.claimed_at,
    expiresAt: r.expires_at, createdAt: r.created_at, status,
  }
}

export async function listChapterInvites(chapterId) {
  const { data, error } = await supabase.from('chapter_invites')
    .select('*').eq('chapter_id', chapterId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(inviteFromRow)
}
export async function revokeChapterInvite(id) {
  const { error } = await supabase.from('chapter_invites').delete().eq('id', id)
  if (error) throw error
}

/* ─────────────────────────── chapter invites (RPC) ─────────────────────────── */

// Admin-only: mint a unique human-typable join code for the admin's chapter.
// Returns the raw invite row ({ id, chapter_id, code, expires_at, ... }).
export async function generateChapterInvite(chapterId, email = null, ttlDays = 30) {
  const { data, error } = await supabase.rpc('generate_chapter_invite', {
    cid: chapterId, invite_email: email, ttl_days: ttlDays,
  })
  if (error) throw error
  return data
}
// Anon/auth: validate a code without claiming it → { valid, chapter_id, chapter_name } | null.
export async function lookupInviteCode(code) {
  if (!code) return null
  const { data, error } = await supabase.rpc('lookup_invite_code', { invite_code: code })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return row || null
}
// Auth: redeem a code → links the caller's profile to the chapter, marks claimed.
// Returns the updated profile row (raw, snake_case) or throws on invalid/expired.
export async function redeemInviteCode(code) {
  const { data, error } = await supabase.rpc('redeem_invite_code', { invite_code: code })
  if (error) throw error
  return data
}

/* ─────────────────────────── posts (home feed) ─────────────────────────── */

// Compact relative-time label (e.g. "just now", "2h", "3d") for the feed.
function relativeTime(iso) {
  if (!iso) return 'just now'
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60); if (mins < 60) return mins + 'm'
  const hrs = Math.floor(mins / 60); if (hrs < 24) return hrs + 'h'
  const days = Math.floor(hrs / 24); if (days < 7) return days + 'd'
  const wks = Math.floor(days / 7); if (wks < 5) return wks + 'w'
  const mos = Math.floor(days / 30); if (mos < 12) return mos + 'mo'
  return Math.floor(days / 365) + 'y'
}

// Row → the shape MemberHome's PostCard reads.
export function postFromRow(r) {
  if (!r) return null
  const meta = (r.meta && typeof r.meta === 'object') ? r.meta : {}
  return {
    id: r.id, author: r.author_id, kind: r.kind, text: r.text,
    time: relativeTime(r.created_at), likes: r.likes || 0,
    comments: r.comments || 0, image: r.image_label || null,
    tags: r.tags || [], audience: r.audience || 'network',
    linkUrl: r.link_url || meta.linkUrl || null,
    meta,
    eventId: meta.eventId || null,
    seeking: meta.seeking || null,
    eventShare: meta.event || null,
  }
}

// Can the viewer see this post given its audience setting?
export function canViewerSeePost(post, viewerId, people) {
  if (!post || !viewerId) return false
  if (post.author === viewerId) return true
  const viewer = people[viewerId]
  const author = people[post.author]
  if (!viewer || !author) return false
  const aud = post.audience || 'network'
  if (aud === 'chapter') return viewer.chapter && viewer.chapter === author.chapter
  if (aud === 'alumni') return viewer.role === 'alumni' || viewer.role === 'admin'
  // network: viewer must be bonded with the author
  return !!author.bonded
}

// Count the viewer's bonds that fall within the selected audience scope.
export function countAudienceBonds(viewerId, audience, people) {
  const me = people && people[viewerId]
  if (!me) return 0
  const bondedIds = Object.keys(people).filter(id => id !== viewerId && people[id]?.bonded)
  if (audience === 'network') return bondedIds.length
  if (audience === 'chapter') {
    return bondedIds.filter(id => people[id]?.chapter === me.chapter).length
  }
  if (audience === 'alumni') {
    return bondedIds.filter(id => {
      const p = people[id]
      return p && (p.role === 'alumni' || p.role === 'admin')
    }).length
  }
  return 0
}

export async function createPost(authorId, payload) {
  // Backward compat: createPost(id, kind, text) still works.
  let row
  if (typeof payload === 'string') {
    row = { author_id: authorId, kind: arguments[1] || 'post', text: arguments[2] || '' }
  } else {
    const p = payload || {}
    row = {
      author_id: authorId,
      kind: p.kind || 'post',
      text: p.text || '',
      tags: p.tags || [],
      audience: p.audience || 'network',
      meta: p.meta || {},
      image_label: p.imageLabel || null,
      link_url: p.linkUrl || null,
    }
  }
  const { data, error } = await supabase.from('posts').insert(row).select('*').single()
  if (error) throw error
  return postFromRow(data)
}

// Most-recent posts. Audience scoping is enforced by posts_select RLS (0010);
// the client filter below is defense-in-depth.
export async function listFeedPosts(viewerId, limit = 40) {
  const { data, error } = await supabase.from('posts').select('*')
    .order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  const people = (typeof window !== 'undefined' && window.GB && window.GB.PEOPLE) || {}
  return (data || [])
    .map(postFromRow)
    .filter(p => canViewerSeePost(p, viewerId, people))
}

// Full composer write, returns the PostCard shape.
export async function createPostFull(payload) {
  const me = (typeof window !== 'undefined' && window.GB && window.GB.ME) || {}
  const meId = me.id || me.alumni || me.undergrad || me.admin || me.recruiter
  if (!meId) throw new Error('Not logged in')
  const post = await createPost(meId, payload)
  return { ...post, time: 'just now', likes: 0, comments: 0 }
}

// Create a chapter event + optional feed share post.
export async function createEventWithShare({ chapterId, createdBy, event, sharePost = true, audience = 'chapter' }) {
  const ev = await createEvent({ chapterId, createdBy, ...event })
  if (!sharePost) return { event: ev, post: null }
  const when = ev.startAt ? new Date(ev.startAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''
  const text = [ev.title, when, ev.location].filter(Boolean).join(' · ')
  const post = await createPost(createdBy, {
    kind: 'event_share',
    text,
    audience,
    meta: { eventId: ev.id, event: { title: ev.title, startAt: ev.startAt, endAt: ev.endAt, location: ev.location, description: ev.description } },
  })
  return { event: ev, post: { ...post, time: 'just now', likes: 0, comments: 0 } }
}

// Increment likes. Goes through a SECURITY DEFINER function so any member can
// like any post under the author-only update policy. Returns the new count.
export async function likePost(postId) {
  const { data, error } = await supabase.rpc('increment_post_likes', { post: postId })
  if (error) throw error
  return data
}
// One-way decrement (floored at 0) for toggling a like off.
export async function unlikePost(postId) {
  const { data, error } = await supabase.rpc('decrement_post_likes', { post: postId })
  if (error) throw error
  return data
}

// Legacy wrapper, still used by older call sites; prefer createPostFull.
export async function createPostDB(kind, text) {
  return createPostFull({ kind: kind || 'post', text: text || '' })
}

/* ─────────────────────────── post comments ─────────────────────────── */

export function commentFromRow(r) {
  if (!r) return null
  return { id: r.id, postId: r.post_id, author: r.author_id, text: r.text, time: relativeTime(r.created_at) }
}

export async function listComments(postId) {
  const { data, error } = await supabase.from('post_comments').select('*')
    .eq('post_id', postId).order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(commentFromRow)
}

export async function createComment(postId, authorId, text) {
  const { data, error } = await supabase.from('post_comments')
    .insert({ post_id: postId, author_id: authorId, text }).select('*').single()
  if (error) throw error
  // Bump the denormalized counter (best-effort; goes through a definer fn).
  try { await supabase.rpc('increment_post_comments', { post: postId }) }
  catch (e) { console.warn('[comments] count bump failed:', e?.message || e) }
  return commentFromRow(data)
}

/* ─────────────────────────── saved jobs ─────────────────────────── */

export async function saveJob(profileId, jobId) {
  const { data, error } = await supabase.from('saved_jobs')
    .upsert({ profile_id: profileId, job_id: jobId }, { onConflict: 'profile_id,job_id' })
    .select('*').single()
  if (error) throw error
  return data
}
export async function unsaveJob(profileId, jobId) {
  const { error } = await supabase.from('saved_jobs').delete()
    .eq('profile_id', profileId).eq('job_id', jobId)
  if (error) throw error
}
export async function listSavedJobIds(profileId) {
  // RLS already scopes saved_jobs rows to the current user.
  const { data, error } = await supabase.from('saved_jobs').select('job_id')
  if (error) throw error
  return (data || []).map(r => r.job_id)
}
export async function listSavedJobs(profileId) {
  const ids = await listSavedJobIds(profileId)
  if (!ids.length) return []
  const { data, error } = await supabase.from('jobs').select('*').in('id', ids)
  if (error) throw error
  return data || []
}
export async function isJobSaved(profileId, jobId) {
  const { data, error } = await supabase.from('saved_jobs').select('id').eq('job_id', jobId).maybeSingle()
  if (error) throw error
  return !!data
}

/* ─────────────────────── window.GB hydration ───────────────────────
   Loads chapters + members (+ the viewer's bond state) from Supabase into the
   synchronous window.GB cache the existing screens read from. With an empty DB
   this yields empty maps (plus the viewer's own profile), the correct
   "clean and empty" state. */
export async function hydrateCache(viewerId, viewerRole) {
  // Set the viewer role first so member/bond reads below route correctly under
  // RLS (recruiters → restricted view, no bonds).
  if (viewerRole !== undefined) setViewerRole(viewerRole)
  const [chapters, members, bonds, posts, savedJobIds, events, fundraisers, jobs] = await Promise.all([
    listChapters(), listMembers(), listAllBonds(),
    // tolerate a missing posts table (migration 0003 not run yet), feed is
    // empty rather than the whole app failing to hydrate.
    listFeedPosts(viewerId).catch((e) => { console.warn('[db] posts not loaded:', e?.message || e); return [] }),
    // tolerate a missing saved_jobs table (migration 0005 not run yet).
    (viewerId && !isRecruiter()
      ? listSavedJobIds(viewerId).catch((e) => { console.warn('[db] saved jobs not loaded:', e?.message || e); return [] })
      : Promise.resolve([])),
    // tolerate missing events / fundraisers tables (migrations 0006/0007 not run yet).
    listEvents().catch((e) => { console.warn('[db] events not loaded:', e?.message || e); return [] }),
    listFundraisers().catch((e) => { console.warn('[db] fundraisers not loaded:', e?.message || e); return [] }),
    listJobs().catch((e) => { console.warn('[db] jobs not loaded:', e?.message || e); return [] }),
  ])

  const CHAPTERS = {}
  for (const c of chapters) CHAPTERS[c.id] = c

  const PEOPLE = {}
  for (const p of members) PEOPLE[p.id] = p

  // derive lineage littles from big_id, and bond counts / viewer-relative bonded
  const counts = {}
  for (const p of members) {
    const big = p.line && p.line.big
    if (big && PEOPLE[big]) {
      PEOPLE[big].line.littles.push(p.id)
      if (!PEOPLE[big].line.little) PEOPLE[big].line.little = p.id
    }
  }
  for (const b of bonds) {
    counts[b.a_id] = (counts[b.a_id] || 0) + 1
    counts[b.b_id] = (counts[b.b_id] || 0) + 1
    if (viewerId && b.status === 'bonded') {
      if (b.a_id === viewerId && PEOPLE[b.b_id]) PEOPLE[b.b_id].bonded = true
      if (b.b_id === viewerId && PEOPLE[b.a_id]) PEOPLE[b.a_id].bonded = true
    }
  }
  for (const id of Object.keys(PEOPLE)) PEOPLE[id].bonds = counts[id] || 0

  window.GB.CHAPTERS = CHAPTERS
  window.GB.PEOPLE = PEOPLE
  window.GB.POSTS = posts
  window.GB.SAVED_JOB_IDS = savedJobIds || []
  window.GB.BONDS = bonds            // raw rows: drives bondState() for the toggle
  window.GB.BOND_COUNT = bonds.length
  window.GB.EVENTS = events || []
  window.GB.FUNDRAISERS = fundraisers || []
  window.GB.JOBS = jobs || []

  // Keep the legacy CHAPTER_DETAIL.events / .give the existing ChapterPage and
  // AdminConsole read in sync, scoped to the viewer's own chapter, so those
  // screens render real data without any rewrite. Other CHAPTER_DETAIL keys
  // (officers, verifyQueue, analytics…) are preserved.
  const meChapter = (viewerId && PEOPLE[viewerId] && PEOPLE[viewerId].chapter) || null
  const detail = window.GB.CHAPTER_DETAIL || {}
  const chapterEvents = meChapter ? (events || []).filter(e => e.chapter === meChapter) : (events || [])
  const liveFund = meChapter ? (fundraisers || []).find(f => f.chapter === meChapter && f.active) : (fundraisers || [])[0]
  window.GB.CHAPTER_DETAIL = {
    ...detail,
    events: chapterEvents,
    give: liveFund || detail.give,
  }
  return { CHAPTERS, PEOPLE }
}

// Expose the write helpers the window-global screens (Jobs, MemberHome,
// AdminConsole) call.
Object.assign(window, {
  createPostDB, createPostFull, createEventWithShare,
  canViewerSeePost, countAudienceBonds,
  likePost, unlikePost, createComment, listComments,
  saveJob, unsaveJob, listSavedJobs, isJobSaved,
  listJobs, listJobsByPoster, createJob, updateJob, deleteJob, refreshJobs,
  createIntroRequest, listIntroRequests,
  listChapterIntroRequests, resolveIntroRequest, listMyIntroRequests,
  listSavedSearches, createSavedSearch, renameSavedSearch, deleteSavedSearch, touchSavedSearch,
  listEvents, createEvent, updateEvent, deleteEvent, listFundraisers, createFundraiser, updateFundraiser, deleteFundraiser,
  refreshChapterContent, listChapterInvites, revokeChapterInvite,
  generateChapterInvite, lookupInviteCode, redeemInviteCode,
  searchSuggestions, searchPeople,
  createBond, deleteBond, setBondStatus, bondState,
})
