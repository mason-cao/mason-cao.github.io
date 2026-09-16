// Nova Core's landing page is a passcode gate. The product lives behind
// "Start Demo Workspace" : that is what belongs on the card.
import { chromium } from "playwright";
import sharp from "sharp";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
try {
  await page.goto("https://nova-core-systems.vercel.app", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.getByRole("button", { name: /demo workspace/i }).click({ timeout: 15000 });
  await page.waitForLoadState("networkidle", { timeout: 60000 });

  // The demo workspace generates its data on entry. Screenshotting during
  // that shows a progress ring instead of the product, so wait for the
  // generation pipeline to finish before capturing.
  await page
    .waitForFunction(
      () => !/\b\d{1,2}%/.test(document.body.innerText) ||
            /system ready/i.test(document.body.innerText),
      null,
      { timeout: 120000 }
    )
    .catch(() => {});
  // Generation ends on a "dashboard is ready" interstitial that auto-
  // redirects; click through rather than racing it.
  await page
    .getByRole("button", { name: /enter dashboard/i })
    .click({ timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(9000);
  await page.screenshot({ path: "public/projects/_nova.png" });
  await sharp("public/projects/_nova.png")
    .resize({ width: 800 })
    .webp({ quality: 80 })
    .toFile("public/projects/nova-core.webp");
  console.log("ok   nova-core (demo workspace)");
} catch (err) {
  console.log("FAIL nova-core (" + err.message.split("\n")[0] + ")");
}
await browser.close();
