/* ════════════════════════════════════════════════════════════════════
   motion.js — single source of truth for motion preference.

   This site deliberately IGNORES the OS "reduce motion" setting: every
   visitor gets the full cockpit — boot cinema, parallax, ambient radar,
   panel flicker, interaction FX, music player. That is an authored
   choice, not an oversight, so it lives in one obvious place instead of
   five scattered matchMedia calls.

   To honour the OS setting again: swap the two statements below, and
   restore the CSS counterpart — the `prefers-reduced-motion` blocks that
   used to sit in style.css (hero grain, global animation kill, music
   player + panel reveal) and fx.css (gate, boot, radar, sweep, motes,
   shockwaves).
   ════════════════════════════════════════════════════════════════════ */
export const prefersReducedMotion = false;
// export const prefersReducedMotion = window.matchMedia(
//   "(prefers-reduced-motion: reduce)"
// ).matches;
