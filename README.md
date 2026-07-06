# Mason Cao - Personal Portfolio

My personal website, in a Jarvis HUD UI w/Holograms and a neural network.

**Live Site:** [mason-cao.github.io](https://mason-cao.github.io/)

## Stack

- **Vite** — build + dev server (HMR)
- **Three.js + postprocessing** — neural globe with HDR bloom & chromatic aberration
- **GSAP** — boot-sequence choreography, scramble text, magnetic buttons
- **Tailwind CSS v4** — utility classes (build-time, via `@tailwindcss/vite`)
- **Web Audio API** — synthesized JARVIS SFX, zero audio assets

## Develop

```bash
npm install
npm run dev      # http://localhost:8642
npm run build    # production bundle → dist/
npm run preview  # serve dist/ locally
```

Dev query flags: `?float=1` forces the cockpit on small windows, `?noboot=1`
skips the boot cinema, `?autoboot=1` runs it without the INITIALIZE gate.

## Deploy

Pushes to `main` build and deploy via GitHub Actions
(`.github/workflows/deploy.yml`). Repo **Settings → Pages → Source** must be
set to **GitHub Actions** (not "deploy from branch").
