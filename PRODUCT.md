# Product

## Register

brand

## Users

College admissions officers first — they arrive from an application, give a
linked site 60–120 seconds, and often open it on a phone or a restricted school
laptop. Collaborators, recruiters and technical peers second. Their needs
converge: what was built, what the evidence is, in ninety seconds.

## Product Purpose

Present Mason's work so it is legible in under ninety seconds and reads as one
thesis — **computer science for environmental systems and sustainability**.
Success means a reader can name what he builds, see that the projects are real,
and open a document proving any credential, without scrolling past anything that
does not earn its place.

## Brand Personality

Quiet, precise, evidence-led. Restraint is the signal: two type weights, one
accent, and a page whose craft shows in working correctly rather than in
spectacle. Every claim carries a number.

## Anti-references

Spectacle that spends the reader's time before it informs them. Stacked
uppercase badges where a sentence would read faster. Layouts that depend on a
pointer, a wide window, or a fast GPU. Decoration that carries no information.
Numbers stated as adjectives ("many", "popular") instead of counts.

## Design Principles

- Say it in sentences, not badges.
- Every claim carries its number.
- The page's only colour beyond monochrome is real data — the hero AQI dot is
  coloured by the live reading, and card halos are derived from the screenshots
  behind them.
- Two type weights, 300 and 400. No bold anywhere.
- Every external dependency degrades to *less content*, never to a broken or
  loading state.
- Projects before credentials: the application already lists the awards, so the
  site's job is the work it cannot show.

## Accessibility & Inclusion

`prefers-reduced-motion` is honoured. The v2 override — which hard-coded
`prefersReducedMotion = false` so every visitor got the cockpit — is reverted;
nothing in v3's vocabulary (a 0.5s entrance, a slow halo drift, a 0.6s icon
draw) justifies overriding an OS accessibility setting.

Scroll-reveal hides content only behind an `html.js` class, so a blocked or
failed script leaves every section visible rather than permanently transparent.
The hero map is decorative and `aria-hidden`; the AQI chip is exposed as text.
Card hover motifs are enhancement only — no information lives solely in a hover
state. A print stylesheet inverts the page to black-on-white and expands links.
