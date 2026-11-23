// Retakes the overview's two screenshots, public/shots/before.png and after.png, from a
// running copy of the site at 1440 x 900, the size the overview and the link card use.
// The link card (src/app/opengraph-image.png) is drawn from them by design/build.sh.
//
// Usage: pnpm build && pnpm start --port 3301, then: node design/shots.mjs http://localhost:3301
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3301";
const shots = [
  { path: "/before", file: "public/shots/before.png" },
  { path: "/after", file: "public/shots/after.png" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
for (const { path, file } of shots) {
  await page.goto(new URL(path, base).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200); // the hourly chart's bars grow in on load
  await page.screenshot({ path: file });
  console.log(`design/shots.mjs: ${file}`);
}
await browser.close();
