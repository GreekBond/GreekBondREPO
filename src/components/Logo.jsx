// Logo.jsx: the single source of truth for the GreekBond brand mark.
//
// Renders the brand SVGs from /public via <img src> (chosen over inline import
// so a future logo change is a one-file swap: overwrite the file in public/ and
// every surface updates, no code change). SVG keeps it crisp at any size.
//
// Files (in public/):
//   greekbond-mark.svg / greekbond-mark-reversed.svg          (monogram)
//   greekbond-logo-full.svg / greekbond-logo-full-reversed.svg (lockup)
//
// Props:
//   variant : 'full' | 'mark'      (default 'mark')
//   tone    : 'navy' | 'reversed'  (default 'navy'; use 'reversed' on dark bg)
//   size    : height in px         (default 32; width follows the aspect ratio)
//   onClick : optional (nav logo routes home)
//   style / className : passthrough
import React from 'react';

const SRC = {
  'mark:navy': '/greekbond-mark.svg',
  'mark:reversed': '/greekbond-mark-reversed.svg',
  'full:navy': '/greekbond-logo-full.svg',
  'full:reversed': '/greekbond-logo-full-reversed.svg',
};

function Logo({ variant = 'mark', tone = 'navy', size = 32, onClick, style, className, alt = 'GreekBond' }) {
  const src = SRC[`${variant}:${tone}`] || SRC['mark:navy'];
  const img = (
    <img src={src} alt={alt} height={size} style={{ height: size, width: 'auto', display: 'block', ...style }} className={className} />
  );
  if (!onClick) return img;
  return (
    <button type="button" onClick={onClick} aria-label={alt}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
      {img}
    </button>
  );
}

if (typeof window !== 'undefined') window.Logo = Logo;
export default Logo;
