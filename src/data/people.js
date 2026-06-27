/* PEOPLE, now sourced from Supabase (the `profiles` table) at runtime via
   db.hydrateCache(). Starts empty; no fake people are seeded. The logged-in
   user's own profile is injected by useProfile after auth resolves. */
export const PEOPLE = {};
