// suggestions.js: value-completion catalogs for form-field autocomplete.
//
// Each field maps to a per-session list = curated seeds (shipped here) merged
// with distinct existing values in the matching Supabase column. The merge is
// case-insensitive: seed-list entries come first, then any DB values not
// already covered. Distinct values are fetched once per field per session and
// cached in memory so keystrokes filter the cached list synchronously.
//
// House rules followed in the seed copy: sentence case where natural, no em
// dashes, no curly quotes. Items are written the way a member would type them.

import { supabase } from '../lib/supabase.js'

/* ───────────────────────── seed catalogs ───────────────────────── */

// Job titles, covers finance, tech, consulting, ops, design, sales, legal,
// engineering. Lives behind the `title` AND `headline` field so a member typing
// "Software" gets the same useful hits in either input.
const JOB_TITLES = [
  'Software Engineer', 'Senior Software Engineer', 'Staff Software Engineer',
  'Principal Engineer', 'Engineering Manager', 'Engineering Lead', 'Tech Lead',
  'Front End Engineer', 'Back End Engineer', 'Full Stack Engineer',
  'Mobile Engineer', 'iOS Engineer', 'Android Engineer',
  'Site Reliability Engineer', 'DevOps Engineer', 'Platform Engineer',
  'Security Engineer', 'Data Engineer', 'Machine Learning Engineer',
  'Research Engineer', 'Data Scientist', 'Senior Data Scientist',
  'Data Analyst', 'Quantitative Researcher', 'Quantitative Analyst',
  'Product Manager', 'Senior Product Manager', 'Group Product Manager',
  'Director of Product', 'Technical Program Manager', 'Program Manager',
  'Project Manager', 'Chief of Staff', 'Operations Manager',
  'Business Operations Manager', 'Strategy Manager',
  'Product Designer', 'UX Designer', 'UX Researcher', 'Visual Designer',
  'Brand Designer', 'Design Lead', 'Design Manager',
  'Marketing Manager', 'Brand Manager', 'Content Marketing Manager',
  'Growth Marketing Manager', 'Performance Marketing Manager',
  'Social Media Manager', 'Communications Manager',
  'Sales Development Representative', 'Business Development Representative',
  'Account Executive', 'Senior Account Executive', 'Account Manager',
  'Customer Success Manager', 'Sales Engineer', 'Solutions Architect',
  'Solutions Engineer', 'Investment Banking Analyst',
  'Investment Banking Associate', 'Investment Banking Vice President',
  'Equity Research Analyst', 'Sales and Trading Analyst',
  'Private Equity Associate', 'Venture Capital Associate', 'Hedge Fund Analyst',
  'Financial Analyst', 'Senior Financial Analyst', 'Finance Manager',
  'Controller', 'FP&A Analyst', 'Treasury Analyst', 'Risk Analyst',
  'Credit Analyst', 'Consultant', 'Senior Consultant', 'Engagement Manager',
  'Principal', 'Partner', 'Associate', 'Senior Associate',
  'Attorney', 'Associate Attorney', 'General Counsel', 'Paralegal',
  'Real Estate Agent', 'Real Estate Broker', 'Mortgage Broker',
  'Mechanical Engineer', 'Electrical Engineer', 'Civil Engineer',
  'Chemical Engineer', 'Industrial Engineer', 'Aerospace Engineer',
  'Founder', 'Co-founder', 'CEO', 'CFO', 'CTO', 'COO', 'CMO', 'CRO',
  'Vice President', 'Senior Vice President', 'Director', 'Senior Director',
  'Managing Director',
]

const COMPANIES = [
  // Finance
  'Goldman Sachs', 'Morgan Stanley', 'JPMorgan Chase', 'Bank of America',
  'Citigroup', 'Wells Fargo', 'Evercore', 'Lazard', 'Jefferies', 'Houlihan Lokey',
  'BlackRock', 'Bridgewater Associates', 'Citadel', 'Two Sigma',
  'Jane Street', 'D. E. Shaw', 'Millennium Management', 'Point72',
  'KKR', 'Blackstone', 'Apollo Global Management', 'The Carlyle Group',
  'Vista Equity Partners', 'Bain Capital', 'TPG', 'Silver Lake',
  'Sequoia Capital', 'Andreessen Horowitz', 'Tiger Global', 'Benchmark',
  // Consulting + audit
  'McKinsey & Company', 'Bain & Company', 'Boston Consulting Group',
  'Deloitte', 'PwC', 'EY', 'KPMG', 'Accenture', 'Capgemini', 'IBM Consulting',
  // Big tech + cloud
  'Google', 'Alphabet', 'Meta', 'Apple', 'Microsoft', 'Amazon',
  'Amazon Web Services', 'Netflix', 'NVIDIA', 'Tesla', 'SpaceX',
  'Salesforce', 'Oracle', 'Adobe', 'IBM', 'Intel', 'AMD', 'Qualcomm',
  'Cisco', 'ServiceNow', 'Workday', 'Intuit',
  // Tech startups + scale-ups
  'Stripe', 'Snowflake', 'Databricks', 'Palantir', 'OpenAI', 'Anthropic',
  'Airbnb', 'Uber', 'Lyft', 'DoorDash', 'Instacart', 'Robinhood', 'Coinbase',
  'Square', 'Block', 'Plaid', 'Brex', 'Ramp', 'Shopify', 'Atlassian',
  'Slack', 'Notion', 'Figma', 'Asana',
  // Media + retail + consumer
  'Disney', 'Warner Bros. Discovery', 'Comcast', 'Paramount', 'Spotify',
  'Walmart', 'Target', 'Costco', 'Nike', 'PepsiCo', 'Coca-Cola',
  'Procter & Gamble', 'Unilever', 'Johnson & Johnson',
  // Healthcare + pharma
  'Pfizer', 'Merck', 'Moderna', 'UnitedHealth Group', 'CVS Health',
  'Eli Lilly', 'AbbVie', 'Bristol Myers Squibb',
  // Industrial + energy
  'Boeing', 'Lockheed Martin', 'Raytheon', 'General Electric', 'Honeywell',
  'ExxonMobil', 'Chevron', 'Schlumberger',
  // Telecom + auto
  'Verizon', 'AT&T', 'T-Mobile', 'Ford', 'General Motors', 'Toyota',
]

const SCHOOLS = [
  'University of Alabama', 'Auburn University',
  'University of Arizona', 'Arizona State University',
  'University of Arkansas',
  'University of California, Berkeley', 'University of California, Los Angeles',
  'University of California, Davis', 'University of California, San Diego',
  'University of Southern California', 'Stanford University',
  'Pepperdine University', 'Loyola Marymount University',
  'University of Colorado Boulder', 'Colorado State University',
  'University of Connecticut',
  'University of Florida', 'Florida State University', 'University of Miami',
  'University of Central Florida',
  'University of Georgia', 'Georgia Institute of Technology', 'Emory University',
  'University of Illinois Urbana-Champaign', 'Northwestern University',
  'University of Chicago', 'DePaul University',
  'Indiana University', 'Purdue University', 'University of Notre Dame',
  'Butler University',
  'University of Iowa', 'Iowa State University',
  'University of Kansas', 'Kansas State University',
  'University of Kentucky',
  'Louisiana State University', 'Tulane University',
  'University of Maryland', 'Johns Hopkins University',
  'Boston College', 'Boston University', 'Harvard University',
  'Massachusetts Institute of Technology', 'University of Massachusetts Amherst',
  'Tufts University',
  'University of Michigan', 'Michigan State University',
  'University of Minnesota',
  'University of Mississippi', 'Mississippi State University',
  'University of Missouri', 'Washington University in St. Louis',
  'Saint Louis University',
  'Vanderbilt University', 'University of Tennessee',
  'University of Nebraska',
  'University of Nevada, Las Vegas',
  'Dartmouth College', 'Princeton University', 'Cornell University',
  'Columbia University', 'New York University', 'Syracuse University',
  'Fordham University',
  'University of North Carolina at Chapel Hill',
  'North Carolina State University', 'Duke University', 'Wake Forest University',
  'Ohio State University', 'Miami University', 'University of Cincinnati',
  'University of Oklahoma', 'Oklahoma State University',
  'University of Oregon', 'Oregon State University',
  'Penn State University', 'University of Pennsylvania',
  'University of Pittsburgh', 'Lehigh University', 'Bucknell University',
  'Brown University', 'Yale University',
  'Clemson University', 'University of South Carolina',
  'University of Texas at Austin', 'Texas A&M University',
  'Texas Christian University', 'Southern Methodist University',
  'Baylor University', 'Rice University',
  'Brigham Young University', 'University of Utah',
  'University of Virginia', 'Virginia Tech',
  'James Madison University', 'William & Mary',
  'University of Washington', 'Washington State University',
  'University of Wisconsin-Madison', 'Marquette University',
  'University of Wyoming',
]

const INDUSTRIES = [
  'Finance', 'Investment Banking', 'Private Equity', 'Venture Capital',
  'Asset Management', 'Hedge Funds', 'Wealth Management', 'Insurance',
  'Real Estate', 'Commercial Real Estate', 'Residential Real Estate',
  'Construction',
  'Technology', 'Software', 'Hardware', 'Semiconductors', 'Cybersecurity',
  'Artificial Intelligence', 'Cloud Infrastructure',
  'Biotechnology', 'Pharmaceuticals', 'Healthcare', 'Hospitals',
  'Medical Devices', 'Health Tech',
  'Consulting', 'Management Consulting', 'Strategy', 'Law', 'Legal Services',
  'Government', 'Public Policy', 'Nonprofit', 'Philanthropy',
  'Education', 'Higher Education', 'EdTech',
  'Marketing', 'Advertising', 'Public Relations', 'Media', 'Entertainment',
  'Film and Television', 'Music', 'Publishing', 'Gaming',
  'Retail', 'E-commerce', 'Consumer Goods', 'Apparel', 'Beauty',
  'Hospitality', 'Travel', 'Restaurants', 'Food and Beverage',
  'Energy', 'Oil and Gas', 'Renewable Energy', 'Utilities',
  'Manufacturing', 'Automotive', 'Aerospace', 'Defense',
  'Transportation', 'Logistics', 'Supply Chain',
  'Telecommunications', 'Agriculture', 'Sports', 'Fitness',
  'Architecture', 'Engineering Services', 'Accounting',
]

const LOCATIONS = [
  'New York, NY', 'Brooklyn, NY', 'Boston, MA', 'Cambridge, MA',
  'Philadelphia, PA', 'Pittsburgh, PA', 'Washington, DC', 'Arlington, VA',
  'Alexandria, VA', 'Baltimore, MD',
  'Atlanta, GA', 'Charlotte, NC', 'Raleigh, NC', 'Durham, NC',
  'Nashville, TN', 'Memphis, TN', 'Birmingham, AL',
  'Tampa, FL', 'Orlando, FL', 'Miami, FL', 'Jacksonville, FL',
  'New Orleans, LA', 'Baton Rouge, LA',
  'Houston, TX', 'Dallas, TX', 'Austin, TX', 'San Antonio, TX',
  'Fort Worth, TX',
  'Oklahoma City, OK', 'Tulsa, OK',
  'Kansas City, MO', 'St. Louis, MO', 'Indianapolis, IN',
  'Cincinnati, OH', 'Columbus, OH', 'Cleveland, OH',
  'Detroit, MI', 'Ann Arbor, MI',
  'Chicago, IL', 'Milwaukee, WI', 'Madison, WI', 'Minneapolis, MN',
  'Omaha, NE',
  'Denver, CO', 'Boulder, CO', 'Salt Lake City, UT', 'Phoenix, AZ',
  'Tucson, AZ', 'Las Vegas, NV',
  'San Diego, CA', 'Los Angeles, CA', 'Orange County, CA',
  'San Francisco, CA', 'Palo Alto, CA', 'San Jose, CA', 'Sacramento, CA',
  'Portland, OR', 'Seattle, WA',
  'Honolulu, HI', 'Anchorage, AK',
  'Remote',
]

// Pledge class, light suggestions only. Members usually type a season + year.
function pledgeClassSeeds() {
  const seeds = []
  const now = new Date().getFullYear()
  // Recent and near-future years, both seasons. Newest first so they sort up.
  for (let y = now + 1; y >= now - 10; y--) {
    seeds.push(`Fall ${y}`, `Spring ${y}`)
  }
  return seeds
}

const PLEDGE_CLASSES = pledgeClassSeeds()

// Greek chapter offices and standing committees.
const POSITIONS = [
  'President', 'Vice President', 'Executive Vice President',
  'Treasurer', 'Assistant Treasurer',
  'Secretary', 'Corresponding Secretary', 'Recording Secretary',
  'Rush Chair', 'Recruitment Chair', 'Assistant Recruitment Chair',
  'Social Chair', 'Assistant Social Chair',
  'Risk Manager', 'Risk Management Chair',
  'Philanthropy Chair', 'Service Chair', 'Community Service Chair',
  'Pledge Educator', 'New Member Educator', 'Assistant New Member Educator',
  'Sergeant at Arms', 'Historian', 'Chaplain', 'Marshal',
  'Alumni Relations Chair', 'Alumni Chair',
  'Standards Chair', 'Judicial Board Chair', 'Scholarship Chair',
  'Academic Chair', 'Tutor Chair',
  'House Manager', 'Steward', 'Kitchen Steward',
  'Public Relations Chair', 'Communications Chair', 'Social Media Chair',
  'Brotherhood Chair', 'Sisterhood Chair',
  'Membership Development Chair', 'Education Chair',
  'IFC Delegate', 'Panhellenic Delegate', 'NPHC Delegate',
  'Greek Council Representative',
  'Intramural Chair', 'Sports Chair',
  'Founders Day Chair', 'Homecoming Chair',
  'Fundraising Chair', 'Parents Weekend Chair',
]

const HONORS = [
  "Dean's List", "President's List", 'Order of Omega',
  'Greek Man of the Year', 'Greek Woman of the Year',
  'Outstanding New Member', 'Outstanding Active', 'Outstanding Alumnus',
  'Outstanding Alumna', "Chapter President's Award",
  'Brother of the Year', 'Sister of the Year', 'Scholar of the Year',
  'Founders Day Award', 'National Scholarship Recipient',
  'Chapter Hall of Fame', 'Phi Beta Kappa', 'National Honor Society',
  'Mortar Board', 'Golden Key Honor Society',
  'Tau Beta Pi', 'Beta Gamma Sigma',
  'IFC Outstanding Member', 'Panhellenic Outstanding Member',
  'Summa Cum Laude', 'Magna Cum Laude', 'Cum Laude',
  'Valedictorian', 'Salutatorian',
  'ROTC Distinguished Cadet', 'Eagle Scout', 'Gold Award',
  'Homecoming Court', 'Student Body President',
]

const SKILLS = [
  // Professional / leadership
  'Leadership', 'Public Speaking', 'Recruiting', 'Event Planning',
  'Project Management', 'Strategic Planning', 'Business Development',
  'Negotiation', 'Conflict Resolution', 'Mentorship', 'Coaching',
  'Team Building', 'Cross-functional Collaboration',
  'Stakeholder Management', 'Hiring', 'Onboarding', 'Training',
  'Performance Management',
  // Finance + analysis
  'Financial Modeling', 'Valuation', 'Discounted Cash Flow',
  'Mergers and Acquisitions', 'Equity Research', 'Capital Markets',
  'Risk Management', 'Compliance', 'Auditing', 'Accounting', 'Bookkeeping',
  'Treasury', 'Investor Relations',
  'Data Analysis', 'Data Visualization', 'Statistical Analysis',
  'Quantitative Analysis',
  // Engineering / data / cloud
  'Python', 'R', 'Java', 'JavaScript', 'TypeScript', 'C++', 'Go', 'Rust',
  'React', 'Node.js', 'SQL', 'NoSQL', 'GraphQL',
  'Machine Learning', 'Deep Learning', 'Natural Language Processing',
  'Computer Vision', 'Cloud Computing', 'AWS', 'Google Cloud', 'Microsoft Azure',
  'DevOps', 'Kubernetes', 'Docker', 'Terraform',
  // Tools
  'Excel', 'PowerPoint', 'Tableau', 'Power BI', 'Looker',
  'Salesforce', 'HubSpot', 'Figma', 'Adobe Creative Suite',
  // Sales + marketing
  'Sales', 'Account Management', 'Customer Service',
  'Marketing Strategy', 'Content Strategy', 'Brand Strategy',
  'Search Engine Optimization', 'Performance Marketing', 'Email Marketing',
  'Social Media Marketing', 'Copywriting', 'Editing',
  // Operations + product + design
  'Operations', 'Process Improvement', 'Supply Chain Management', 'Logistics',
  'Product Strategy', 'Product Roadmap', 'User Research',
  'UX Design', 'Wireframing', 'Prototyping', 'Design Systems',
  // Research / writing
  'Research', 'Technical Writing', 'Grant Writing', 'Fundraising',
]

// Offers, what a member is willing to give the network. Sentence case.
const OFFERS = [
  'Warm intros', 'Mentorship', 'Hiring', 'Resume reviews', 'Coffee chats',
  'Advice in my field', 'Mock interviews', 'Referrals', 'Internship referrals',
  'Career advice', 'Industry insights', 'Networking introductions',
  'Job referrals', 'Letters of recommendation', 'Career coaching',
  'Interview prep', 'Salary negotiation advice', 'Portfolio reviews',
  'Code reviews', 'Pitch deck reviews', 'Cover letter reviews',
  'LinkedIn profile reviews', 'Mentoring meetings', 'Office hours',
  'Informational interviews', 'Speaking opportunities',
  'Conference introductions', 'Investor introductions',
]

// Seeking, what a member is looking for from the network.
const SEEKING = [
  'Internship', 'First role', 'New role', 'Mentees', 'Mentor', 'Co-founder',
  'Not looking right now', 'Job referrals', 'Career advice', 'Mock interviews',
  'Resume review', 'Coffee chats', 'Industry advice', 'Job leads',
  'Side project collaborators', 'Investors', 'Investment opportunities',
  'Speaking opportunities', 'Board positions', 'Volunteer opportunities',
  'Networking introductions', 'Career change support', 'Graduate school advice',
  'Recommendation letters', 'Career coaching', 'Salary benchmarks',
]

/* ───────────────────────── seed registry ───────────────────────── */

// `title` and `headline` share the same seed pool because a headline is
// typically a job-title-flavored description.
const SEEDS = {
  title: JOB_TITLES,
  headline: JOB_TITLES,
  company: COMPANIES,
  school: SCHOOLS,
  industry: INDUSTRIES,
  location: LOCATIONS,
  pledgeClass: PLEDGE_CLASSES,
  positions: POSITIONS,
  honors: HONORS,
  skills: SKILLS,
  offers: OFFERS,
  seekingTags: SEEKING,
}

// Postgres column for each field. `headline` shares the title pool but reads
// from its own column; `pledgeClass` is `pledge_class`, etc.
const FIELD_COLUMN = {
  title: 'title', headline: 'headline', company: 'company',
  school: 'school', industry: 'industry', location: 'location',
  pledgeClass: 'pledge_class',
  positions: 'positions', honors: 'honors', skills: 'skills',
  offers: 'offers', seekingTags: 'seeking_tags',
}

// `text[]` columns where every element is a candidate suggestion.
const ARRAY_FIELDS = new Set(['positions', 'honors', 'skills', 'offers', 'seekingTags'])

/* ───────────────────────── DB distinct fetch (cached) ─────────────────────────
   One query per field per session. Result is filtered client-side from then on.
   We don't have a Postgres distinct in PostgREST so we pull a bounded page and
   dedupe in JS. RLS still applies, for a recruiter this will route through the
   restricted view they have read access to, and any RLS-denied column simply
   returns no rows (silently falls back to seeds). */

const cache = Object.create(null)  // field -> Promise<string[]>

async function fetchDistinct(field) {
  const col = FIELD_COLUMN[field]
  if (!col) return []
  try {
    const { data, error } = await supabase.from('profiles').select(col).limit(500)
    if (error) {
      console.warn('[suggestions] db fetch failed for', field, error.message || error)
      return []
    }
    const out = new Map()  // lower → original casing (first seen)
    for (const row of data || []) {
      const v = row && row[col]
      if (v == null) continue
      if (ARRAY_FIELDS.has(field) && Array.isArray(v)) {
        for (const x of v) addOne(out, x)
      } else {
        addOne(out, v)
      }
    }
    return [...out.values()]
  } catch (e) {
    console.warn('[suggestions] db fetch threw for', field, e?.message || e)
    return []
  }
}

function addOne(map, raw) {
  if (raw == null) return
  const s = String(raw).trim()
  if (!s) return
  const k = s.toLowerCase()
  if (!map.has(k)) map.set(k, s)
}

// Public: returns the merged seed-first list for a field. Resolves to the same
// cached array on every call after the first per session.
export async function suggestionsFor(field) {
  if (!cache[field]) cache[field] = buildMerged(field)
  return cache[field]
}

async function buildMerged(field) {
  const seeds = SEEDS[field] || []
  const db = await fetchDistinct(field)
  const seen = new Set()
  const out = []
  // Seed-list matches first (preserves the curated order).
  for (const v of seeds) {
    const k = v.toLowerCase()
    if (!seen.has(k)) { seen.add(k); out.push(v) }
  }
  // Then DB values that aren't already covered.
  for (const v of db) {
    const k = (v || '').toLowerCase()
    if (k && !seen.has(k)) { seen.add(k); out.push(v) }
  }
  return out
}

// Synchronous accessor for the seed-only fallback (used before the DB fetch
// resolves on first render so the dropdown isn't empty for a heartbeat).
export function seedsFor(field) {
  return SEEDS[field] || []
}
