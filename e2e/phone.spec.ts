import { expect, test, type Page } from "@playwright/test";
import { expectNoOverflow, expectNoSidewaysScroll } from "./helpers";

const cards = (page: Page) => page.getByTestId("order-card");
const sheet = (page: Page) => page.getByTestId("order-sheet");

test.describe("phone, 390 px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("/after shows cards and nothing scrolls sideways", async ({ page }) => {
    await page.goto("/after");
    await expect(cards(page).first()).toBeVisible();
    await expect(page.getByTestId("order-row").first()).toBeHidden();
    await expectNoSidewaysScroll(page);
    // Finished work is folded away until asked for.
    await expect(cards(page)).toHaveCount(25);
    await page.getByRole("button", { name: /Completed and cancelled · 15/ }).click();
    await expect(cards(page)).toHaveCount(40);
  });

  test("controls are at least 44 px tall", async ({ page }) => {
    await page.goto("/after");
    await expect(cards(page).first()).toBeVisible();
    const targets = [
      page.getByTestId("view-today"),
      page.getByTestId("view-at_risk"),
      page.getByTestId("view-unassigned"),
      page.getByTestId("view-on_hold"),
      page.locator("#plant-switcher"),
      page.getByRole("button", { name: "Schedule pour" }),
      page.getByLabel("Search orders"),
      page.getByTestId("more-filters"),
    ];
    for (const t of targets) expect((await t.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test("a card opens a full-width sheet with readable chips and times, and Back closes it", async ({ page }) => {
    await page.goto("/after");
    await cards(page).nth(1).click();
    await expect(sheet(page)).toBeVisible();
    await expect.poll(async () => (await sheet(page).boundingBox())!.width).toBeGreaterThanOrEqual(374);
    const chips = sheet(page).locator('[data-slot="truck-chip"]');
    expect(await chips.count()).toBeGreaterThan(0);
    const spilled = await chips.evaluateAll((els) =>
      els.filter((e) => e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight + 1).map((e) => e.textContent),
    );
    expect(spilled).toEqual([]);
    // On a narrow sheet every stage carries its own label.
    await expect(sheet(page).getByTestId("load").first().getByText("Washout", { exact: true })).toBeVisible();
    await expectNoOverflow(sheet(page));
    await page.goBack();
    await expect(sheet(page)).toBeHidden();
    await expect(page).toHaveURL(/\/after$/);
  });

  test("Schedule pour fits the screen and takes 1330 from a number pad", async ({ page }) => {
    await page.goto("/after");
    await page.getByRole("button", { name: "Schedule pour" }).click();
    const dialog = page.getByRole("dialog");
    const submit = dialog.getByRole("button", { name: "Schedule pour" });
    const box = (await submit.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    await expect(dialog.getByRole("heading", { name: "Schedule pour" })).toBeInViewport();
    await expect(dialog.getByLabel("First truck on site")).toHaveAttribute("inputmode", "numeric");
    await dialog.getByLabel("Customer").fill("Auger Bay Builders");
    await dialog.getByLabel("Site address").fill("12 Auger Bay, Regina");
    await dialog.getByLabel(/^Volume/).fill("20");
    await dialog.getByLabel("First truck on site").fill("1330");
    await submit.click();
    await expect(sheet(page)).toContainText("Auger Bay Builders");
    await expect(sheet(page)).toContainText("13:30");
  });
});

test.describe("narrowest phones, 320 px", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const path of ["/", "/before", "/after", "/after?state=loading", "/after?state=empty", "/after?state=error", "/after?state=partial", "/after?notes=1", "/field", "/field/qc", "/standard"]) {
    test(`${path} does not scroll sideways`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoSidewaysScroll(page);
    });
  }

  test("the dialog and the sheet stay inside the screen", async ({ page }) => {
    await page.goto("/after");
    await page.getByRole("button", { name: "Schedule pour" }).click();
    const dialog = page.getByRole("dialog");
    const d = (await dialog.boundingBox())!;
    expect(d.x).toBeGreaterThanOrEqual(0);
    expect(d.x + d.width).toBeLessThanOrEqual(320);
    await expectNoOverflow(dialog.locator("fieldset"));
    await page.keyboard.press("Escape");
    await cards(page).nth(1).click();
    // Wait for the slide-in to finish before measuring.
    await expect.poll(async () => {
      const s = (await sheet(page).boundingBox())!;
      return s.x + s.width;
    }).toBeLessThanOrEqual(320);
    await expectNoOverflow(sheet(page));
  });
});

test.describe("field views on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the driver steps through a delivery with big buttons", async ({ page }) => {
    await page.goto("/field");
    const step = page.getByTestId("step-button");
    await expect(step).toBeVisible();
    await expect(step).toHaveText("Arrived on site");
    expect((await step.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    await step.click();
    await expect(step).toHaveText("Start pour");
    await step.click();
    await expect(step).toHaveText("Pour complete");
    await step.click();
    await expect(page.getByText(/Load delivered at/)).toBeVisible();
    await expectNoSidewaysScroll(page);
  });

  test("a double tap records one step, not two", async ({ page }) => {
    await page.goto("/field");
    const step = page.getByTestId("step-button");
    await expect(step).toHaveText("Arrived on site");
    await step.dblclick();
    await expect(step).toHaveText("Start pour");
    const steps = page.getByRole("list", { name: "Delivery steps" });
    await expect(steps.getByText("Pour started")).toHaveCount(0);
    await expect(steps.getByText("Start pour")).toBeVisible();
  });

  test("another ticket opens over the current load instead of replacing it", async ({ page }) => {
    await page.goto("/field");
    await page.getByRole("button", { name: /Sandhill Crane Builders/ }).click();
    const ticket = page.getByRole("dialog");
    await expect(ticket).toBeVisible();
    await expect(ticket).toContainText("Delivered: pour complete");
    await page.keyboard.press("Escape");
    await expect(ticket).toBeHidden();
    await expect(page.getByTestId("step-button")).toHaveText("Arrived on site");
  });

  test("the QC tech's test validates on blur and saves", async ({ page }) => {
    await page.goto("/field/qc");
    await expect(page.getByRole("heading", { name: "Field test for this load" })).toBeVisible();
    const slump = page.getByLabel(/^Slump/);
    await slump.fill("abc");
    await slump.blur();
    await expect(page.getByText("Use numbers only")).toBeVisible();
    await slump.fill("130");
    await page.getByLabel(/^Air content/).fill("2");
    await page.getByLabel(/^Concrete temperature/).fill("16");
    await page.getByLabel("Cylinders taken").fill("3");
    await page.getByLabel("Cylinders taken").blur();
    await expect(page.getByText(/Outside spec \(50–110 mm\)/)).toBeVisible();
    await page.getByTestId("save-test").click();
    await expect(page.getByText(/Saved at \d\d:\d\d and sent to the lab/)).toBeVisible();
    await expect(page.getByTestId("qc-test").filter({ hasText: /Saved \d\d:\d\d/ })).toHaveCount(1);
  });

  test("an edit made while saving stays an unsaved change", async ({ page }) => {
    await page.goto("/field/qc");
    await page.getByLabel(/^Slump/).fill("80");
    await page.getByLabel(/^Air content/).fill("2");
    await page.getByLabel(/^Concrete temperature/).fill("16");
    await page.getByLabel("Cylinders taken").fill("3");
    await page.getByTestId("save-test").click();
    await expect(page.getByTestId("save-test")).toHaveText("Saving…");
    await page.getByLabel(/^Slump/).fill("140");
    await expect(page.getByTestId("save-test")).toHaveText("Save changes");
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await expect(page.getByText(/Saved at/)).toHaveCount(0);
  });
});
