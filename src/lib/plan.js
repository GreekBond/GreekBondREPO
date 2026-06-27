// plan.js: the single source of truth for client-side plan gating (V2.3).
//
// Tiers come straight from the Pricing page comparison table. The profiles.plan
// column stores 'free' | 'bond' | 'bond_pro' | 'bond_elite'; the Pricing page
// uses the shorter ids 'free' | 'bond' | 'pro' | 'elite' for the same tiers, so
// normalizePlan() bridges them.
//
// Gating rule: the alumni subscription tiers only gate the ALUMNI role. Everyone
// else is full-access by a different door, so they never see an upgrade wall:
//   undergrad → free full access while enrolled
//   admin     → access comes with the chapter plan
//   recruiter → access is brokered, a separate axis entirely
// is_god (the founder flag) overrides everything and reads as bond_elite.

export const PLAN_RANK = { free: 0, bond: 1, bond_pro: 2, bond_elite: 3 };
export const PLAN_LABEL = { free: 'Free', bond: 'Bond', bond_pro: 'Bond Pro', bond_elite: 'Bond Elite' };
// Pricing-page id <-> column id, for pre-highlighting the right card on upgrade.
export const PLAN_TO_PRICING_ID = { free: 'free', bond: 'bond', bond_pro: 'pro', bond_elite: 'elite' };

// Feature -> minimum tier, taken verbatim from ALUMNI_FEATURES in Pricing.jsx.
// Do not add a gate here that is not on the Pricing page.
export const FEATURES = {
  messaging: 'bond',              // "Messaging"
  intros: 'bond',                 // "Warm job intros"
  mentorship: 'bond',             // "Mentorship"
  alumniMap: 'bond',              // "Alumni map"
  whoViewedYou: 'bond_pro',       // "Who viewed you"
  priorityIntros: 'bond_pro',     // "Priority intro requests"
  recruiterVisibility: 'bond_pro',// "Recruiter visibility toggle"
  profileAnalytics: 'bond_elite', // "Profile analytics"
  featuredInDirectory: 'bond_elite', // "Featured in directory"
  earlyAccess: 'bond_elite',      // "Early feature access"
};

export function normalizePlan(p) {
  if (p === 'pro') return 'bond_pro';
  if (p === 'elite') return 'bond_elite';
  return p && PLAN_RANK[p] != null ? p : 'free';
}

// The viewer's effective tier id, honoring god-mode and the non-alumni bypass.
export function effectivePlan(profile) {
  if (!profile) return 'free';
  if (profile.isGod) return 'bond_elite';
  if (profile.role && profile.role !== 'alumni') return 'bond_elite';
  return normalizePlan(profile.plan);
}

// Can this profile (or raw plan id) reach a feature? Ungated features return true.
export function canAccess(feature, profileOrPlan) {
  const min = FEATURES[feature];
  if (!min) return true;
  const planId = typeof profileOrPlan === 'string' ? normalizePlan(profileOrPlan) : effectivePlan(profileOrPlan);
  return (PLAN_RANK[planId] ?? 0) >= PLAN_RANK[min];
}

// The minimum tier label needed for a feature, for "Upgrade to X" copy.
export function requiredTierLabel(feature) {
  return PLAN_LABEL[FEATURES[feature]] || 'Bond';
}

// Resolve the current viewer's profile from the hydrated cache (window.GB), so
// window-global screens that have no React context can still gate. Pass a meId
// if you have one to avoid ambiguity.
function viewerProfile(meId) {
  const GB = (typeof window !== 'undefined' && window.GB) || {};
  const id = meId || (GB.ME && (GB.ME.alumni || GB.ME.undergrad || GB.ME.admin || GB.ME.recruiter));
  if (!id) return null;
  const people = GB.PEOPLE || {};
  return people[id] || null;
}

// Hook-style accessor (it is a plain read, safe to call in render). Returns the
// current viewer's effective tier id.
export function useEffectivePlan(meId) {
  return effectivePlan(viewerProfile(meId));
}

// Convenience: can the current viewer reach a feature?
export function viewerCanAccess(feature, meId) {
  return canAccess(feature, viewerProfile(meId));
}

// Expose for window-global screens that prefer not to import.
if (typeof window !== 'undefined') {
  window.PLAN = {
    PLAN_RANK, PLAN_LABEL, PLAN_TO_PRICING_ID, FEATURES,
    normalizePlan, effectivePlan, canAccess, requiredTierLabel, useEffectivePlan, viewerCanAccess,
  };
}
