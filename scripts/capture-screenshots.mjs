// Captures the project card stills used in the "What I'm building" grid.
// Re-run whenever a deployment changes: node scripts/capture-screenshots.mjs
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const SHOTS = [
  { slug: "nova-core", url: "https://nova-core-systems.vercel.app" },
  { slug: "freshtrack", url: "https://myfreshtrack.app" },
  { slug: "first-step", url: "https://firststep-lac.vercel.app" },
];

await mkdir("public/projects", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});

for (const { slug, url } of SHOTS) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    // let entrance animations and webfonts settle before the shot
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `public/projects/${slug}.png` });
    console.log(`ok   ${slug}  <- ${url}`);
  } catch (err) {
    console.log(`FAIL ${slug}  <- ${url}  (${err.message.split("\n")[0]})`);
  }
}

await browser.close();
