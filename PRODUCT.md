# Product

## Register

brand

## Users

Potential collaborators, recruiters, technical peers, and curious visitors exploring Mason Cao's work in AI, environmental intelligence, productivity tools, and community-focused software. They should be able to understand the work while experiencing a memorable demonstration of technical craft.

## Product Purpose

Present Mason's projects, experiments, credentials, interests, and contact paths as an interactive personal portfolio. Success means visitors remember the Jarvis-inspired command deck, recognize the neural globe as the visual centerpiece, and can still reach the underlying portfolio information.

## Brand Personality

Technical, cinematic, ambitious. The experience should feel like an authored personal command deck: precise, energetic, and more distinctive than a conventional developer portfolio.

## Anti-references

Generic template portfolios, plain stacked card pages used as the primary desktop experience, quiet minimalism that removes the neural globe, decorative telemetry with no useful purpose, forced splash screens, and responsive behavior that selects a completely different identity based on pointer hardware or ordinary laptop height.

## Design Principles

- Preserve the command-deck identity across desktop and laptop contexts.
- Keep the neural globe centered as the system's visual anchor.
- Let visitors enter the portfolio immediately, without an initialization gate.
- Keep peripheral chrome quiet and remove readouts that do not help visitors navigate or understand the work.
- Present real project substance beneath the spectacle.
- Adapt the composition proportionally before changing its information architecture.

## Accessibility & Inclusion

Keep semantic headings and content available to assistive technology, and preserve keyboard focus states and skip navigation. Maintain a readable stacked experience for genuinely narrow phone viewports.

The OS `prefers-reduced-motion` setting is deliberately **not** honored: every visitor gets the full cockpit, parallax, ambient radar, panel flicker, and interaction FX. This is an authored trade-off against the usual accessibility guidance, chosen so the experience is never split into two versions. It is centralized in `src/motion.js` and can be reverted from that one file.
