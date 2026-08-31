# Mason Cao - Personal Portfolio

My personal website, in a Jarvis HUD UI w/Holograms and a neural network.

**Live Site:** [mason-cao.github.io](https://mason-cao.github.io/)

## Stack

- **Vite**: build + dev server (HMR)
- **Three.js + postprocessing**: neural globe with HDR bloom and chromatic aberration
- **GSAP**: scramble text, magnetic buttons, and interface motion
- **Tailwind CSS v4**: utility classes (build-time, via `@tailwindcss/vite`)

## Develop

```bash
npm install
npm run dev      # http://localhost:8642
npm run build    # production bundle → dist/
npm run preview  # serve dist/ locally
```

Dev query flag: `?float=1` forces the cockpit on small windows.

## Deploy

Pushes to `main` build and deploy via GitHub Actions
(`.github/workflows/deploy.yml`). Repo **Settings → Pages → Source** must be
set to **GitHub Actions** (not "deploy from branch").
