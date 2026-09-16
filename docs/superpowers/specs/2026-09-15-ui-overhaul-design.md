# UI Overhaul — mason-cao.github.io v3

**Date:** 2026-09-15
**Status:** approved design, pending implementation plan

## 1. Context

Mason is a Lambert High School senior applying in the 2026–27 cycle (graduating
May 2027). Early Action / Early Decision deadlines are approximately 1 Nov 2026,
six to seven weeks out. The site's primary reader shifts from "collaborators,
recruiters, technical peers" to **college admissions officers**, who give a
linked site 60–120 seconds, frequently on a phone or a restricted school laptop.

The current site (v2) is a Jarvis HUD command deck: a fixed 1200×900 cockpit
stage with draggable holographic panels positioned from hand-measured anchors, a
Three.js neural globe with HDR bloom and chromatic aberration, and
`prefers-reduced-motion` deliberately disabled in `src/motion.js`. It is a strong
craft demonstration and a poor fit for the new reader — absolute positioning
resists scanning, the deck does not survive a phone, and the composition spends
the reader's attention on navigation rather than substance.

**Reference:** hirok.io (Hiroki Osame), named directly by Mason.

## 2. Goals

- Substance reachable in under 90 seconds.
- One coherent thesis: **computer science for environmental systems and
  sustainability.**
- Craft demonstrated by the page working correctly, not by spectacle.
- Works on a phone and on a locked-down school laptop.
- Ships before 1 Nov 2026.

## 3. Non-goals

- Light mode. Black only; a print stylesheet covers the printing case.
- Preserving the command-deck identity. `PRODUCT.md` is rewritten (§10).
- A blog or CMS.
- Retaining the Three.js globe.
- A separate reduced-motion experience. One page that honors the OS setting.

## 4. Design system

### 4.1 Typography

**Geist Sans** and **Geist Mono**, self-hosted via the `geist` npm package (SIL
OFL). No Google Fonts request. **Weights 300 and 400 only — no bold anywhere on
the site.** That single constraint carries most of the visual identity.

| Role | Family | Size | Weight | Line-height | Color |
|---|---|---|---|---|---|
| Hero name | Sans | `clamp(34px, 6vw, 44px)` | 300 | 1.1 | `--text` |
| Thesis line | Sans | 17px | 300 | 1.5 | `--text-body` |
| Section `h2` | Sans | 28px | 300 | 1.2 | `rgba(255,255,255,.9)` |
| Card title | Sans | 20px | 300 | 1.3 | `rgba(255,255,255,.9)` |
| Body | Sans | 15px | 300 | 1.7 | `--text-body` |
| Card description | Sans | 15px | 300 | 1.5 | `rgba(255,255,255,.55)` |
| Meta, captions | Sans | 13px | 400 | 1.4 | `--text-meta` |
| Metrics, AQI, labels | Mono | 12–13px | 400 | 1 | `rgba(255,255,255,.6)`, `tabular-nums` |

Body text never goes below 15px. Weight 300 at small sizes is the legibility
risk in this design, not contrast.

### 4.2 Color

```
--bg:            #000000
--surface:       #0a0a0a
--hairline:      rgba(255,255,255,.08)
--text:          #ffffff
--text-body:     rgba(255,255,255,.65)
--text-meta:     rgba(255,255,255,.45)
--accent:        #38bdf8   /* links, focus rings — used sparingly */
```

Contrast on `#000`: `--text-body` ≈ 13.6:1, `--text-meta` ≈ 8.2:1. Both clear
WCAG AA comfortably.

**The page's only other color is live data.** The hero AQI dot takes its color
from the current reading, per EPA bands:

```
--aqi-good:       #4ade80   /*   0– 50 */
--aqi-moderate:   #facc15   /*  51–100 */
--aqi-usg:        #fb923c   /* 101–150 */
--aqi-unhealthy:  #f87171   /* 151–200 */
--aqi-very:       #c084fc   /* 201–300 */
--aqi-hazardous:  #fb7185   /* 301+    */
```

Everything else on the page is monochrome, except project-card halos, whose
color derives from the screenshot behind them.

### 4.3 Layout

```
--measure:     680px     /* single centered column */
--gutter:      20px
--section-gap: 80px      /* 56px below 640px */
--radius:      10px
```

Single column, no sidebar. A small fixed section-nav pill, bottom-center on
desktop, lets a reader jump straight to Credentials. Its items are
`Building · Credentials · Stack · Next · Contact` — five anchors, mono 12px,
current section marked with `--accent`. Hidden below 640px, where the page is
short enough to scroll.

### 4.4 Motion

```
--dur-fast: .2s   /* hover, focus */
--dur-mid:  .3s   /* transform, crossfade */
--dur-slow: .5s   /* slide-up entrance */
--dur-fade: .8s   /* image fade-in */
--ease: cubic-bezier(.4, 0, .2, 1)
```

The full vocabulary, ported from hirok.io:

- `slide-up` 0.5s ease-out, `forwards`, fired once by IntersectionObserver.
- Count-up on every number, `font-variant-numeric: tabular-nums` so digits do
  not jitter during the count.
- Self-drawing SVG icons (line-md set): `stroke-dashoffset` 32→0 over 0.6s for
  GitHub, LinkedIn, and mail.
- Project-card halo: a heavily blurred copy of the screenshot behind the sharp
  one, counter-rotating on a 10s `linear infinite alternate` loop.
- Card screenshots fade in at `opacity .8s ease-in-out` on scroll into view.
- All hover and focus states are 0.2s ease-in-out.

Nothing loops in peripheral vision except the halo drift, which is slow and
low-contrast. **All of it sits inside
`@media (prefers-reduced-motion: no-preference)`.** Under reduced motion:
no entrances, no halo rotation, no crossfade, and counters render their final
values directly. `src/motion.js` is rewritten — the current hard-coded
`prefersReducedMotion = false` was a defensible trade for the cockpit, but
nothing in this design justifies overriding an accessibility setting.

**No animation library.** GSAP is removed; CSS keyframes plus an
IntersectionObserver plus roughly 30 lines of count-up cover the whole
vocabulary.

### 4.5 Implementation approach

Tailwind v4 stays, already wired through `@tailwindcss/vite`. Every token in
§4.1–4.4 is declared in `@theme` in `src/styles/tailwind.css` so utilities and
hand-written CSS share one source of truth. Utilities cover layout, spacing, and
type; `src/styles/style.css` keeps hand-written CSS only for the three bespoke
components — hero, project card, and credential row — where utility soup would
be less readable than the rules themselves.

## 5. Information architecture

1. **Hero** — map, live AQI chip, portrait, name, thesis line
2. **What I'm building** — four project cards, 2×2
3. **Research & credentials** — years on every row
4. **Stack** — flat logo row, live GitHub numbers, one sentence
5. **Where I'm going** — +5Y / +15Y / +30Y horizon
6. **Contact** — email, LinkedIn, GitHub, CV, link to `/play/`
7. **`/play/`** — the 20-game log, its own page

Projects precede credentials deliberately: the Common App already lists the
awards, so the site's job is the work it cannot show.

**Cut from v2:** the "At a glance" strip (rejected), the Timeline section
(rejected), the Signal section as a standalone module (folded into Stack).
Dropping the timeline loses the 2021→2026 trajectory, so **every credential row
carries its year** and the arc stays readable.

### 5.1 Voice

v2 is written in badges: `NOVA CORE` / `LIVE` / `8-agent customer intelligence
platform` — three stacked uppercase fragments. v3 is written in **sentences with
small inline icons**, hirok.io's register. Badges scan slower than prose, and
this single change accounts for most of "readable by an admissions officer."

## 6. Components

### 6.1 Hero

A ~280px full-bleed map of metro Atlanta, dissolving into the page through
`linear-gradient(transparent, rgba(0,0,0,.5) 40%, #000)`. One dot at Forsyth
County. A 120px `rounded-md` portrait overlaps the map's right edge. The name and
thesis line sit over the map's lower third.

Corner chip, mono: `● AQI 42 · Good · Atlanta`. The dot is colored from the live
reading (§4.2).

**Draft hero copy** (Mason's to edit — this is the single highest-leverage text
on the site):

> **Mason Cao**
> I'm a high school senior in Georgia. I build software for environmental
> systems — air-quality intelligence, food-waste tracking, and the research
> behind them.

Two sentences, same length as hirok.io's. The first answers *who*, the second
answers *what* and states the thesis. Everything below the hero is evidence for
that second sentence.

**Map rendering.** A pre-rendered static WebP of the exact view paints
immediately and is the permanent fallback. `maplibre-gl` is dynamically imported
only when the hero enters the viewport, on pointer-capable viewports ≥640px, and
never under reduced motion; the live map crossfades over the static image once
its style loads. If the import or the tiles fail, the static image simply stays —
there is no timeout logic, spinner, or error state.

Tiles come from OpenFreeMap (free, keyless, no usage limits). We do not use one
of their prebuilt styles; we ship our own ~60-line MapLibre style JSON against
their vector source, with only: background `#000`, water `#060606`, roads
`rgba(255,255,255,.07)`, and two label layers at `rgba(255,255,255,.35)`. Total
control over the look, and no dependency on a third party's style staying put.

The map is `aria-hidden="true"` (decorative). The AQI chip has a text equivalent
in the accessibility tree.

### 6.2 Project card

```
┌──────────────────────────────┐
│ research          7 live feeds│  ← mono 13px, rgba(255,255,255,.6)
│                              │
│      [ app screenshot ]      │  ← sharp; blurred copy behind,
│    blurred halo → card edges │    counter-rotating 10s alternate
│                              │  ← hover: motif canvas crossfades in
│ A.E.R.I.S                    │  ← 20px / 300
│ Seven live air-quality feeds,│  ← 15px, rgba(255,255,255,.55)
│ anomaly detection            │
└──────────────────────────────┘
```

`--radius`, no border — the halo separates the card from the black page. 2×2
grid at `--measure`, single column below 640px. Four projects do not warrant
hirok.io's horizontal scroller; a reader should not have to discover a sideways
scroll to see half the work.

Header slots are **status (left) · hardest number (right)**:

| Project | Status | Number |
|---|---|---|
| Nova Core | live | 8 agents |
| A.E.R.I.S | research | 7 live feeds |
| First Step | live | 300+ members |
| FreshTrack | deployed | *(see §12)* |

`src/motifs.js` survives and is **promoted**: its four canvas animations
(`nova`, `aeris`, `fresh`, `first`) stop being background decoration and become
the card hover state, crossfading over the screenshot at `--dur-mid`. On touch
devices the screenshot simply rests — the motif is a desktop enhancement, never
required to understand the card.

### 6.3 Credentials

Each row: title, issuer, **year**, and a `PROOF` affordance opening the existing
lightbox. All six current credentials keep their proof assets. The résumé-only
awards (Earthshot Prize top 150, Codeforces Candidate Master, USESO High Honors,
International Environmental Science Olympiad gold, AP Scholar with Distinction,
5× GMEA All-State) are listed as plain text with no proof badge, so the presence
or absence of a badge stays meaningful.

Adding credentials no longer requires re-measuring cockpit anchors — the v2
constraint recorded in `credentials-hologram-pending-additions` is dissolved by
this rewrite. A new credential becomes one list item.

### 6.4 Stack, horizon, contact

**Stack** — a flat inline row of technology logos plus one sentence carrying the
live GitHub numbers. `src/constellation.js` and its draggable sphere are deleted.

**Horizon** — the +5Y / +15Y / +30Y lists, preserved close to their current
wording. This is the strongest personality content on the site and states the
thesis in human terms.

**Contact** — email, LinkedIn, GitHub, CV (PDF), each with a self-drawing icon,
plus the link to `/play/`.

### 6.5 `/play/`

The full 20-game log on its own page, framed as off-hours, reached from Contact.
A second Vite entry via `build.rollupOptions.input`. Same design system, no map.

## 7. Data dependencies

| Source | Endpoint | Auth | Failure behavior |
|---|---|---|---|
| Air quality | `air-quality-api.open-meteo.com/v1/air-quality?latitude=34.2073&longitude=-84.1402&current=us_aqi&timezone=America/New_York` | none, CORS-open | Chip is hidden. No spinner, no error text. |
| Map tiles | OpenFreeMap vector tiles | none | Static WebP remains; nothing else changes. |
| GitHub | `api.github.com/users/mason-cao` | none (60 req/hr per IP) | The sentence renders without its numbers. |

Every one of these degrades to *less content*, never to a broken or loading
state. A school network blocking all three still yields a complete page.

## 8. Files

**Deleted** — `src/deck.js` (381), `src/globe.js` (495),
`src/constellation.js` (248), all of `src/fx/`, `src/styles/fx.css` (189), and
nearly all of `src/styles/style.css` (1875). `three`, `postprocessing`, and
`gsap` come out of `package.json`. `src/app.js` retains only its modal logic and
the GitHub fetch.

**Kept** — `src/motifs.js` (315), repurposed per §6.2. The credentials lightbox.
`public/credentials/*`. `public/mason-cao-cv.pdf`.

**Rewritten** — `index.html`, `src/styles/style.css`, `src/motion.js`,
`PRODUCT.md`, `README.md`.

**New** — hero map module, AQI chip module, count-up utility, IntersectionObserver
entrance utility, `play/index.html`, the MapLibre style JSON, a print stylesheet,
`public/projects/*.webp`, `public/mason.webp`, `public/map-atlanta.webp`.

Approximately 2,000 lines of JavaScript and 1,900 lines of CSS are removed.

## 9. Performance

| | v2 | v3 |
|---|---|---|
| `three` | ~170 KB gz | — |
| `postprocessing` | ~45 KB gz | — |
| `gsap` | ~70 KB gz | — |
| `maplibre-gl` | — | ~250 KB gz, **lazy, off critical path** |
| Critical-path JS | ~300 KB gz | **< 25 KB gz** |

Swapping Three.js for MapLibre is roughly weight-neutral on its own; the win
comes entirely from making the map a deferred chunk behind a static image.

**Targets:** LCP < 1.5s on 4G. Critical JS < 25 KB gz. First-paint payload
< 400 KB including the static map and portrait. All raster assets WebP.

## 10. `PRODUCT.md` rewrite

v2's `PRODUCT.md` lists as anti-references: *"quiet minimalism that removes the
neural globe"* and *"plain stacked card pages used as the primary desktop
experience."* It currently forbids the site being built here. It must be
rewritten in the same commit as the overhaul, not left to contradict the code:

- **Users** → admissions officers first; collaborators, recruiters, and peers
  second. Their needs converge on the same requirement: what was built, what the
  evidence is, in 90 seconds.
- **Purpose** → present the work so it is legible in under 90 seconds and reads
  as one thesis.
- **Brand personality** → quiet, precise, evidence-led. Restraint as the signal.
- **Anti-references** → spectacle that costs the reader time; badge-stacked
  layouts in place of sentences; anything that fails on a phone or a restricted
  network; decoration that carries no information.
- **Accessibility** → `prefers-reduced-motion` is now honored. The v2 override is
  reverted.

## 11. Accessibility

- Semantic landmarks; one `h1`; an `h2` per section. Skip link retained.
- `:focus-visible` rings in `--accent`, 2px, 2px offset.
- Map decorative and `aria-hidden`; AQI chip exposed as text.
- Contrast verified per §4.2.
- Reduced motion honored in full (§4.4).
- Card hover motifs are enhancement only; no information lives solely in a
  hover state.
- `/play/` reachable and operable by keyboard.
- Print stylesheet inverts to black-on-white, drops the map, and expands links.

## 12. Assets and inputs required from Mason

1. **Portrait** — the FBLA photo, currently in the iCloud Photos library on this
   machine. Export from Photos (File → Export → Export Unmodified Original, or
   drag onto the desktop), then it gets cropped square and converted to WebP as
   `public/mason.webp`.
2. **Four app screenshots** — captured with Playwright, already a devDependency,
   at a fixed viewport against the live deployments
   (`nova-core-systems.vercel.app`, `freshtrack.up.railway.app`,
   `firststep-lac.vercel.app`) and the A.E.R.I.S repo. Saved to
   `public/projects/*.webp`.
3. **A FreshTrack number** — users, scans, items tracked, anything. Without one
   its card runs status-only and reads weaker than the other three.

## 13. Risks

| Risk | Mitigation |
|---|---|
| MapLibre bundle size | Lazy import behind a static WebP; never on the critical path. |
| OpenFreeMap down, or blocked on a school network | Static WebP always paints first and simply stays. |
| Open-Meteo unavailable | Chip hides. |
| GitHub unauthenticated rate limit (60/hr, shared per IP) | Numbers omitted; sentence still reads. |
| Screenshots going stale as the apps change | Capture script committed, so refreshing is one command. |
| **Schedule — 1 Nov 2026** | The deletions carry most of the work. The hero map is the single component most likely to consume a day; it is also the most cuttable if time runs short, since the static WebP alone is a complete hero. |

## 14. Open questions

The FreshTrack metric (§12.3). Everything else is decided.
