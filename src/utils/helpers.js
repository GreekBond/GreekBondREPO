// utils/helpers.js: pure color + data-accessor helpers shared across the app.
// shade()/tint() drive the chapter-color theming; P()/CH() read from window.GB (the
// in-memory data layer, replaced by Supabase in Session 3).

export function tint(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
  return `rgb(${r},${g},${b})`;
}
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r * (1 - amt)); g = Math.round(g * (1 - amt)); b = Math.round(b * (1 - amt));
  return `rgb(${r},${g},${b})`;
}
// A neutral, navy-themed stand-in returned when a chapter isn't loaded yet
// (e.g. a brand-new user with no house, or before bulk-loaded chapters exist).
// Keeps the chapter-color theming and labels from crashing on an empty DB.
const FALLBACK_CHAPTER = {
  id: '', letters: 'GB', name: 'GreekBond', kind: '', council: '',
  color: '#111b3d', ink: '#0c1330', school: '', founded: null,
  members: 0, alumni: 0, gpa: '', motto: '', city: '', noun: 'member', plural: 'members',
};

export const CH = (id) => (window.GB.CHAPTERS && window.GB.CHAPTERS[id]) || FALLBACK_CHAPTER;
export const P = (id) => window.GB.PEOPLE && window.GB.PEOPLE[id];
