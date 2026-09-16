# Mason Cao - Personal Portfolio

My personal website: clean, dark, dev-minimal. Software for environmental
systems.

**Live Site:** [mason-cao.github.io](https://mason-cao.github.io/)

## Stack

- **Vite**: build + dev server (HMR), multi-page (`/` and `/play/`)
- **MapLibre GL + OpenFreeMap**: the hero map of metro Atlanta, lazily loaded
  behind a static WebP still
- **Tailwind CSS v4**: tokens in `@theme`, utilities for layout and type
- **Geist Sans / Geist Mono**: self-hosted, weights 300 and 400 only

No animation library — the motion vocabulary is CSS keyframes plus an
IntersectionObserver.

## Develop

```bash
npm install
npm run dev      # http://localhost:8642
npm run build    # production bundle → dist/
npm run preview  # serve dist/ locally
```

## Regenerating assets

All three need `npm run preview` running on :8642 first.

```bash
npm run shots      # project card stills from the live deployments
npm run map-still  # the hero map's static fallback
npm run review     # full-page screenshot, for eyeballing changes
```

`shots` and `map-still` run a **headed** browser on purpose: headless Chromium
falls back to SwiftShader and renders WebGL as black.

## Gotchas

- **MapLibre's worker.** MapLibre resolves it with `new URL(..., import.meta.url)`
  and then calls `new Worker(url)` with a variable, which Vite cannot statically
  analyse — so it never emits the worker, and the built map fetches tiles but
  never parses them, hanging with no error. `vite.config.js` emits
  `maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs` into `assets/` to fix
  this. Don't remove that plugin.
- **MapLibre needs `requestAnimationFrame`.** It defers style loading to a
  frame, so the map stays inert in a backgrounded or occluded tab and resumes
  when focused. This makes it look broken under automation; pass
  `--disable-backgrounding-occluded-windows` and friends.
- **Deploy.** Pushes to `main` build and deploy via GitHub Actions
  (`.github/workflows/deploy.yml`). Repo **Settings → Pages → Source** must be
  **GitHub Actions**, not "deploy from branch".
