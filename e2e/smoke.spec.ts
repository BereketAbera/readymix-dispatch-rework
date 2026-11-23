import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

const PAGES: { path: string; heading: string | RegExp }[] = [
  { path: "/", heading: "Dispatch screen rework" },
  { path: "/before", heading: "Orders" },
  { path: "/after", heading: "Dispatch" },
  { path: "/field", heading: /^Driver · T-201, Noor A\.$/ },
  { path: "/field/qc", heading: /^QC tech · field tests/ },
  { path: "/standard", heading: "UI standard" },
];

for (const { path, heading } of PAGES) {
  test(`${path} renders without errors`, async ({ page }) => {
    const errors = watchErrors(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
}

test("an unknown page gets the sample's own 404 with a way back", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "This page isn’t part of the sample" })).toBeVisible();
  await page.getByRole("link", { name: "Open the reworked board" }).click();
  await expect(page).toHaveURL(/\/after$/);
});

test("says the data is invented, never anonymized, and previews with an image", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /on invented data/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  expect(await page.content()).not.toMatch(/anonymi[sz]ed/i);
  await expect(page.getByText("Sample by Bereket A. · fictional data")).toBeVisible();
});

test("the home page leads with the before and after screens", async ({ page }) => {
  await page.goto("/");
  for (const name of ["before", "after"]) {
    const image = page.getByRole("img", { name: new RegExp(`^The ${name === "before" ? "before screen" : "reworked board"}`) });
    await expect(image).toBeVisible();
    expect(await image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
});

test("the standard is served as Markdown with rule IDs", async ({ request }) => {
  const response = await request.get("/ui-standard.md");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/markdown");
  const text = await response.text();
  for (const id of ["TB1", "FL5", "FM7", "ST4", "CH4"]) expect(text).toContain(`| ${id} |`);
});

test("responses carry the security headers", async ({ request }) => {
  const headers = (await request.get("/")).headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("before is labelled as a reconstruction and points at its problems", async ({ page }) => {
  await page.goto("/before");
  await expect(page.getByText("a typical first-version screen, reconstructed for this demo")).toBeVisible();
  await expect(page.getByTestId("legacy-row")).toHaveCount(10);
  // Page 1 is ten finished jobs; the late pours are on page 2.
  for (const row of await page.getByTestId("legacy-row").all()) await expect(row).toContainText("CMPL");
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(page.getByTestId("legacy-row").filter({ hasText: "Larkspur Row Construction" })).toHaveCount(1);
  await expect(page.getByTestId("legacy-row").filter({ hasText: "Harrow and Disc Builders" })).toHaveCount(1);
  await page.getByRole("link", { name: "At risk, first thing on the board" }).click();
  await expect(page).toHaveURL(/view=at-risk/);
});
