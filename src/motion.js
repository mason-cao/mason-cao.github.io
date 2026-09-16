// One version of the site for everyone.
//
// Mason asked that a visitor with the OS "reduce motion" setting on sees
// exactly what everyone else sees, so this is pinned false rather than read
// from matchMedia. It is an authored trade-off against the usual guidance,
// deliberately centralised here and in the Motion block of style.css so it
// can be reverted from two places.
export const prefersReducedMotion = false;
