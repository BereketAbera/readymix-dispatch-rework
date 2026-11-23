import { expect, test, type Page } from "@playwright/test";

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

const PAGES = [
  { path: "/", heading: "Dispatch screen rework" },
  { path: "/before", heading: "Orders" },
  { path: "/after", heading: "Dispatch" },
  { path: "/field", heading: "Field test" },
  { path: "/standard", heading: "UI standard" },
];

for (const { path, heading } of PAGES) {
  test(`${path} renders without errors`, async ({ page }) => {
    const errors = watchErrors(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("before is labelled as a reconstruction", async ({ page }) => {
  await page.goto("/before");
  await expect(page.getByText("a typical first-version screen, reconstructed for this demo")).toBeVisible();
  await expect(page.getByTestId("legacy-row")).toHaveCount(10);
});

test("a saved-view chip filters the table and updates the URL", async ({ page }) => {
  await page.goto("/after");
  const rows = page.getByTestId("order-row");
  await expect(rows).toHaveCount(40);

  await page.getByTestId("view-on_hold").click();
  await expect(rows).toHaveCount(2);
  for (const row of await rows.all()) await expect(row).toContainText("On hold");
  await expect(page).toHaveURL(/view=on-hold/);

  const atRisk = page.getByTestId("view-at_risk");
  const expected = Number(await atRisk.locator("span").last().innerText());
  await atRisk.click();
  await expect(rows).toHaveCount(expected);
  await expect(page.getByTestId("result-count")).toHaveText(`${expected} orders`);

  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(rows).toHaveCount(40);
});

test("the table header stays visible while the table scrolls", async ({ page }) => {
  await page.goto("/after");
  const header = page.locator("thead").first();
  const top = (await header.boundingBox())!.y;
  const firstRow = page.getByTestId("order-row").first();
  const rowTop = (await firstRow.boundingBox())!.y;
  await page.locator('[data-slot="table-container"]').first().evaluate((el) => el.scrollBy(0, 400));
  await expect.poll(async () => (await firstRow.boundingBox())!.y).toBeLessThan(rowTop - 300);
  expect((await header.boundingBox())!.y).toBeCloseTo(top, 0);
});

test("search is one keystroke away and filters by truck", async ({ page }) => {
  await page.goto("/after");
  await page.keyboard.press("/");
  await expect(page.getByLabel("Search orders")).toBeFocused();
  await page.keyboard.type("T-304");
  const rows = page.getByTestId("order-row");
  await expect(rows.first()).toBeVisible();
  for (const row of await rows.all()) await expect(row).toContainText("T-304");
});

test("clicking a row opens the side sheet with the load timeline", async ({ page }) => {
  await page.goto("/after");
  const first = page.getByTestId("order-row").first();
  const customer = (await first.getByRole("button").first().innerText()).split("\n")[0].trim();
  await first.click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("heading", { name: customer })).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Loads" })).toBeVisible();
  await expect(sheet.getByTestId("load").first()).toBeVisible();
  await expect(sheet.getByText("Assign truck", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});

test("assigning a truck clears an unassigned order", async ({ page }) => {
  await page.goto("/after?view=unassigned");
  const rows = page.getByTestId("order-row");
  const before = await rows.count();
  await rows.first().click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("combobox").click();
  await page.getByRole("option").first().click();
  await sheet.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(sheet.getByText(/assigned to PRM-/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(rows).toHaveCount(before - 1);
});

test("preview states use the shared loading, empty and error components", async ({ page }) => {
  await page.goto("/after?state=empty");
  await expect(page.getByRole("heading", { name: "No pours scheduled today" })).toBeVisible();
  await page.goto("/after?state=error");
  await expect(page.getByRole("alert").filter({ hasText: "Today's orders didn't load" })).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByTestId("order-row")).toHaveCount(40, { timeout: 10_000 });
});

test.describe("phone width", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("/after shows cards and nothing scrolls sideways", async ({ page }) => {
    await page.goto("/after");
    await expect(page.getByTestId("order-card").first()).toBeVisible();
    await expect(page.getByTestId("order-row").first()).toBeHidden();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.scrollingElement!.scrollWidth,
      clientWidth: document.scrollingElement!.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("/field steps through a delivery with big buttons", async ({ page }) => {
    await page.goto("/field");
    const step = page.getByTestId("step-button");
    await expect(step).toHaveText("Arrived on site");
    expect((await step.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    await step.click();
    await expect(step).toHaveText("Start pour");
    await step.click();
    await expect(step).toHaveText("Pour complete");
    await step.click();
    await expect(page.getByText(/Load delivered at/)).toBeVisible();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.scrollingElement!.scrollWidth,
      clientWidth: document.scrollingElement!.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("/field validates on blur and saves", async ({ page }) => {
    await page.goto("/field");
    const slump = page.getByLabel("Slump");
    await slump.fill("abc");
    await slump.blur();
    await expect(page.getByText("Use numbers only")).toBeVisible();
    await slump.fill("130");
    await page.getByLabel("Air content").fill("2");
    await page.getByLabel("Concrete temperature").fill("16");
    await page.getByLabel("Cylinders taken").fill("3");
    await page.getByLabel("Cylinders taken").blur();
    await expect(page.getByText(/Outside spec \(50–110 mm\)/)).toBeVisible();
    await page.getByTestId("save-test").click();
    await expect(page.getByText(/Saved at \d\d:\d\d/)).toBeVisible();
  });
});
