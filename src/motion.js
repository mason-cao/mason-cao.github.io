/* ════════════════════════════════════════════════════════════════════
   motion.js — single source of truth for motion preference.

   This site deliberately IGNORES the OS "reduce motion" setting: every
   visitor gets the full cockpit, parallax, ambient radar, panel flicker,
   and interaction FX. That is an authored
   choice, not an oversight, so it lives in one obvious place instead of
   five scattered matchMedia calls.

   To honour the OS setting again: swap the two statements below, and
   restore the CSS counterpart in style.css and fx.css.
   ════════════════════════════════════════════════════════════════════ */
export const prefersReducedMotion = false;
// export const prefersReducedMotion = window.matchMedia(
//   "(prefers-reduced-motion: reduce)"
// ).matches;
