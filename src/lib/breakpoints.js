// breakpoints.js: single source of truth for responsive breakpoints + the
// useIsMobile()/useIsTablet() hooks (Session M0).
//
// These values MIRROR the --bp-* CSS custom properties in index.css. CSS cannot
// read a var() inside a media-query condition, so the px live in two places by
// necessity: here for JS, and hardcoded in index.css media queries. Keep both in
// sync. Bands: mobile ≤640 · tablet 641–1024 · desktop ≥1025.
//
// Registered on window to match the app's global-registry convention (window.GB,
// window.useReducedMotion, …); also exported normally for direct import.
import React from 'react';
const { useState, useEffect } = React;

export const BREAKPOINTS = { mobile: 640, tablet: 1024 };

export const mediaQuery = {
  mobile: `(max-width: ${BREAKPOINTS.mobile}px)`,
  tablet: `(min-width: ${BREAKPOINTS.mobile + 1}px) and (max-width: ${BREAKPOINTS.tablet}px)`,
  desktop: `(min-width: ${BREAKPOINTS.tablet + 1}px)`,
};

// SSR-safe synchronous read. With no window (prerender) we assume desktop, the
// wider default that matches the app's only current rendering path.
function matchesNow(query) {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(query).matches;
}

// Resize-aware match for an arbitrary media query. Use for components that must
// switch BEHAVIOR (not just styling) — the M1 nav will use this to swap the
// desktop top bar for a mobile nav. Pure styling should prefer CSS media queries.
export function useMediaQuery(query) {
  const [match, setMatch] = useState(() => matchesNow(query));
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatch(mql.matches);
    onChange(); // re-sync in case the viewport changed before this effect ran
    // addEventListener is the modern API; addListener is the Safari <14 fallback.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);
  return match;
}

export function useIsMobile() { return useMediaQuery(mediaQuery.mobile); }
export function useIsTablet() { return useMediaQuery(mediaQuery.tablet); }

if (typeof window !== 'undefined') {
  Object.assign(window, { BREAKPOINTS, GB_MEDIA: mediaQuery, useMediaQuery, useIsMobile, useIsTablet });
}
