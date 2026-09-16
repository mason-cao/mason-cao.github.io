// Renders the hero map once and freezes it as the static fallback that
// always paints first. Re-run if the map style or centre changes.
//
// Runs HEADED on purpose: headless Chromium falls back to SwiftShader,
// which renders the WebGL map as pure black. A real GPU context is needed.
// Requires `npm run preview` on :8642.
import { chromium } from "playwright";
import sharp from "sharp";
import { unlink } from "node:fs/promises";

const browser = await chromium.launch({
  headless: false,
  // MapLibre defers style loading to requestAnimationFrame. Chrome stops
  // firing rAF in occluded or backgrounded windows, so the map sits inert
  // and the capture comes out black. These three keep the renderer awake.
  args: [
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-background-timer-throttling",
  ],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 640 } });

// 127.0.0.1, not localhost: vite preview binds IPv4 only.
// domcontentloaded, not networkidle: maplibre streams tiles continuously.
// ?still=1 asks hero.js for preserveDrawingBuffer so the canvas reads back.
await page.goto("http://127.0.0.1:8642/?still=1", { waitUntil: "domcontentloaded" });

// The still is the map alone : the chip and name are live DOM drawn over it.
await page.addStyleTag({
  content: ".hero-chip, .hero-inner, .hero-bg:after { display: none !important; }",
});

await page.waitForSelector("#hero-map.is-ready", { timeout: 60000 });
await page.waitForTimeout(2000);
await page.waitForFunction(() => {
  const m = window.__mcMap;
  return !m || m.areTilesLoaded();
}, null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(4000); // let the last tiles paint

await page.locator("#hero-map").screenshot({ path: "public/_map.png" });
await sharp("public/_map.png").webp({ quality: 82 }).toFile("public/map-atlanta.webp");
await unlink("public/_map.png");

const st = await sharp("public/map-atlanta.webp").stats();
const mean = st.channels[0].mean;
console.log(`ok   public/map-atlanta.webp  (luma mean ${mean.toFixed(1)})`);
if (mean < 3) console.log("WARN still looks blank : did the GPU context render?");

await browser.close();
