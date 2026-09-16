// Full-page review screenshot. Headed + anti-throttling for the same reason
// capture-map-still.mjs is: the map needs rAF and a real GPU context.
import { chromium } from "playwright";
const [out, width = "1280"] = process.argv.slice(2);
const browser = await chromium.launch({
  headless: false,
  args: ["--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling"],
});
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });
await page.goto("http://127.0.0.1:8642/", { waitUntil: "domcontentloaded" });
// Neutralise scroll-reveal for review shots. A fullPage capture does not
// reliably preserve animation end-state, which makes revealed sections read
// as missing when they are not.
await page.addStyleTag({
  content: ".reveal, .card-shot { opacity: 1 !important; transform: none !important; animation: none !important; }",
});

await page.waitForTimeout(8000);

// Scroll the whole page so every IntersectionObserver reveal fires;
// otherwise a fullPage shot captures below-the-fold content at opacity 0.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 400) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 90));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1200);
await page.screenshot({ path: out, fullPage: true });
console.log("ok  " + out);
await browser.close();
