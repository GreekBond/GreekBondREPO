// motion.js: the single source of truth for motion in GreekBond (Session G).
// Pairs with the CSS tokens + keyframes in index.css. Everything that animates
// pulls duration/easing from here and respects reduced motion through one hook,
// so there are no magic numbers or duplicate media-query checks scattered around.
import React from 'react'
const { useState: useStateM, useEffect: useEffectM } = React

// Numeric mirrors of the CSS tokens, for the rare JS-driven timing (toast exit,
// measured nav indicator). Keep in lockstep with index.css :root.
export const MOTION = {
  fast: 150,
  base: 200,
  slow: 300,
  easeOut: 'cubic-bezier(.22, .61, .36, 1)',
  easeIn: 'cubic-bezier(.55, .06, .68, .19)',
  easeInOut: 'cubic-bezier(.45, .05, .55, .95)',
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

// One-shot read, for useMemo callers and non-React code.
export function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(REDUCED_QUERY).matches
      : false
  } catch { return false }
}

// Live hook: re-renders if the user flips the OS setting mid-session.
export function useReducedMotion() {
  const [reduced, setReduced] = useStateM(prefersReducedMotion)
  useEffectM(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(REDUCED_QUERY)
    const on = () => setReduced(mq.matches)
    on()
    // addEventListener is the modern API; fall back for older Safari.
    if (mq.addEventListener) { mq.addEventListener('change', on); return () => mq.removeEventListener('change', on) }
    mq.addListener(on); return () => mq.removeListener(on)
  }, [])
  return reduced
}

// Capped stagger delay (ms) for list entrances: first `cap` items cascade, the
// rest appear instantly so long lists never wave across the screen.
export function staggerDelay(index, { step = 25, cap = 8 } = {}) {
  if (!index || index < 0) return 0
  return Math.min(index, cap) * step
}

// AnimateIn: wraps a list/feed item so it fades + lifts in ONCE on mount. Because
// it is a plain element with the parent's stable key, React reuses its DOM node
// across re-renders / filter changes / background refreshes, so the CSS animation
// does not re-fire. Only a genuinely new key (new item) animates. Reduced motion
// renders a plain wrapper with no animation.
export function AnimateIn({ index = 0, as = 'div', style, className, children, ...rest }) {
  const reduced = useReducedMotion()
  const Tag = as
  if (reduced) return React.createElement(Tag, { style, className, ...rest }, children)
  return React.createElement(
    Tag,
    {
      className: className ? `gb-enter ${className}` : 'gb-enter',
      style: { animationDelay: `${staggerDelay(index)}ms`, ...style },
      ...rest,
    },
    children,
  )
}

// Expose to the window-global screens (which read helpers off window, not imports).
if (typeof window !== 'undefined') {
  Object.assign(window, { MOTION, prefersReducedMotion, useReducedMotion, staggerDelay, AnimateIn })
}
