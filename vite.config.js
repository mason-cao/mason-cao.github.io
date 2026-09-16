import { defineConfig } from "vite";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import tailwindcss from "@tailwindcss/vite";

const MAPLIBRE_DIST = resolve(
  import.meta.dirname,
  "node_modules/maplibre-gl/dist"
);

// MapLibre resolves its web worker at runtime with
//   new URL("./maplibre-gl-worker.mjs", import.meta.url)
// from inside its own chunk, then calls `new Worker(url, {type:"module"})`
// with that value in a variable. Vite's worker plugin only understands the
// literal `new Worker(new URL(...))` form, so it never emits the worker and
// the built map 404s it — tiles are fetched but never parsed, and the map
// hangs forever with no error event. Emitting both files next to the chunk
// is what makes the production build work at all.
function maplibreWorkerAssets() {
  return {
    name: "maplibre-worker-assets",
    apply: "build",
    async generateBundle() {
      for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
        this.emitFile({
          type: "asset",
          fileName: `assets/${file}`,
          source: await readFile(resolve(MAPLIBRE_DIST, file), "utf8"),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), maplibreWorkerAssets()],
  // The dep optimizer rewrites the worker into a path it cannot resolve.
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  server: {
    port: 8642,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        play: resolve(import.meta.dirname, "play/index.html"),
      },
    },
  },
});
