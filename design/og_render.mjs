// Draws design/out/og.svg (written by design/og_image.py) into src/app/opengraph-image.png in
// Chromium, so the title is set in IBM Plex Sans, the site's face. The font is the latin file
// that next/font put in .next/static/media at the last `pnpm build`, found through the build's
// CSS; nothing is downloaded. Run from the repo root after a build: node design/og_render.mjs
import { readFileSync, readdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const cssDir = ".next/static/css";
let css;
try {
  css = readdirSync(cssDir).map((f) => readFileSync(`${cssDir}/${f}`, "utf8")).join("");
} catch {
  console.error("design/og_render.mjs: no .next/static/css; run pnpm build first");
  process.exit(1);
}
// The @font-face rule for IBM Plex Sans whose range covers basic Latin (u+00??)
const face = css.split("@font-face").find((rule) => /font-family:\s*"?IBM Plex Sans"?;/.test(rule) && rule.includes("u+00??"));
const url = face?.match(/url\((\/_next\/static\/media\/[^)]+\.woff2)\)/)?.[1];
if (!url) {
  console.error("design/og_render.mjs: IBM Plex Sans not found in the build's CSS");
  process.exit(1);
}
const font = readFileSync(url.replace("/_next/", ".next/")).toString("base64");

// The card links the overview's screenshots by relative path; inline them so the page needs no files.
const svg = readFileSync("design/out/og.svg", "utf8").replace(
  /xlink:href="\.\.\/\.\.\/public\/(shots\/[a-z]+\.png)"/g,
  (_, file) => `xlink:href="data:image/png;base64,${readFileSync(`public/${file}`).toString("base64")}"`,
);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(
  `<!doctype html><style>@font-face{font-family:"IBM Plex Sans";font-weight:100 700;src:url(data:font/woff2;base64,${font}) format("woff2")}body{margin:0}svg{display:block}</style>${svg}`,
);
const faces = await page.evaluate(async () => (await document.fonts.load('700 44px "IBM Plex Sans"')).length);
await page.evaluate(() => document.fonts.ready);
if (faces === 0) {
  console.error("design/og_render.mjs: IBM Plex Sans did not load");
  process.exit(1);
}
await page.screenshot({ path: "src/app/opengraph-image.png" });
await browser.close();
console.log("design/og_render.mjs: src/app/opengraph-image.png, set in IBM Plex Sans");
