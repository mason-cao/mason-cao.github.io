import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 8642,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "postprocessing"],
          gsap: ["gsap"],
        },
      },
    },
  },
});
