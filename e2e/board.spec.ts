import { expect, test, type Page } from "@playwright/test";
import { expectNoSidewaysScroll, tableContainer } from "./helpers";

const rows = (page: Page) => page.getByTestId("order-row");
const sheet = (page: Page) => page.getByTestId("order-sheet");
const sheetHeader = (page: Page) => sheet(page).locator('[data-slot="sheet-header"]');

test("a saved-view chip filters the table and updates the URL", async ({ page }) => {
  await page.goto("/after");
  await expect(rows(page)).toHaveCount(40);

  await page.getByTestId("view-on_hold").click();
  await expect(rows(page)).toHaveCount(2);
  for (const row of await rows(page).all()) await expect(row).toContainText("On hold");
  await expect(page).toHaveURL(/view=on-hold/);

  const atRisk = page.getByTestId("view-at_risk");
  const expected = Number(await atRisk.locator("span").last().innerText());
  await atRisk.click();
  await expect(rows(page)).toHaveCount(expected);
  await expect(page.getByTestId("result-count")).toHaveText(`${expected} orders`);

  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(rows(page)).toHaveCount(40);
});

test("filters survive leaving the board and coming back with Back", async ({ page }) => {
  await page.goto("/after");
  await page.getByTestId("view-on_hold").click();
  await expect(page).toHaveURL(/view=on-hold/);
  const views = page.getByRole("navigation", { name: "Sample views" });
  await views.getByRole("link", { name: "Field" }).click();
  await expect(page).toHaveURL(/\/field$/);
  await page.goBack();
  await expect(page).toHaveURL(/view=on-hold/);
  await expect(page.getByTestId("view-on_hold")).toHaveAttribute("data-state", "on");
  await expect(rows(page)).toHaveCount(2);
  // The board follows the URL: the demo bar's After link shows the whole day again.
  await views.getByRole("link", { name: "After" }).click();
  await expect(page).toHaveURL(/\/after$/);
  await expect(page.getByTestId("view-today")).toHaveAttribute("data-state", "on");
  await expect(rows(page)).toHaveCount(40);
});

test("the table header stays visible while the table scrolls", async ({ page }) => {
  await page.goto("/after");
  const header = page.locator("thead").first();
  await expect(rows(page).first()).toBeVisible();
  const top = (await header.boundingBox())!.y;
  const firstRow = rows(page).first();
  const rowTop = (await firstRow.boundingBox())!.y;
  await tableContainer(page).evaluate((el) => el.scrollBy(0, 400));
  await expect.poll(async () => (await firstRow.boundingBox())!.y).toBeLessThan(rowTop - 300);
  expect((await header.boundingBox())!.y).toBeCloseTo(top, 0);
});

test("search is one keystroke away and matches trucks and load tickets", async ({ page }) => {
  await page.goto("/after");
  await expect(rows(page)).toHaveCount(40);
  await page.keyboard.press("/");
  const search = page.getByLabel("Search orders");
  await expect(search).toBeFocused();
  await page.keyboard.type("T-304");
  await expect(rows(page).first()).toBeVisible();
  for (const row of await rows(page).all()) await expect(row).toContainText("T-304");
  await search.fill("#418237");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Combine Lane Homes");
  await expect(page).toHaveURL(/q=%23418237/);
});

test("sorting by start toggles between earliest and latest first", async ({ page }) => {
  await page.goto("/after");
  const header = page.getByRole("columnheader", { name: /Start/ });
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await expect(rows(page).first()).toContainText("08:30");
  await header.getByRole("button").click();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  await expect(rows(page).first()).toContainText("15:00");
  await header.getByRole("button").click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await expect(rows(page).first()).toContainText("08:30");
});

test("a row opens a 540 px side sheet that Back closes", async ({ page }) => {
  await page.goto("/after");
  await rows(page).nth(1).click();
  await expect(sheet(page)).toBeVisible();
  await expect(page).toHaveURL(/order=PRM-24115/);
  await expect(sheet(page).getByRole("heading", { name: "Larkspur Row Construction" })).toBeVisible();
  await expect(sheet(page).getByRole("heading", { name: "Loads" })).toBeVisible();
  await expect(sheet(page).getByTestId("load")).toHaveCount(5);
  await expect.poll(async () => (await sheet(page).boundingBox())!.width).toBe(540);
  // The late order's note names the load the train delays, and that load is the late one.
  await expect(sheet(page)).toContainText("Load 4 held by a train");
  await expect(sheet(page).getByTestId("load").nth(3)).toContainText("21 min late");
  await page.goBack();
  await expect(sheet(page)).toBeHidden();
  await expect(page).toHaveURL(/\/after$/);
  await expect(rows(page)).toHaveCount(40);
});

test("closing the sheet or the dialog puts focus back where it was", async ({ page }) => {
  await page.goto("/after");
  const opener = rows(page).nth(5).getByRole("button").first();
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(sheet(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet(page)).toBeHidden();
  await expect(opener).toBeFocused();

  const schedule = page.getByRole("button", { name: "Schedule pour" });
  await schedule.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(schedule).toBeFocused();
});

test("assigning a truck clears an unassigned order", async ({ page }) => {
  await page.goto("/after?view=unassigned");
  await expect(rows(page)).toHaveCount(3);
  await rows(page).first().click();
  await sheet(page).getByRole("combobox").click();
  await page.getByRole("option").first().click();
  await sheet(page).getByRole("button", { name: "Assign", exact: true }).click();
  await expect(sheet(page).getByText(/assigned to PRM-/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(rows(page)).toHaveCount(2);
});

test("hold, then release, brings a pour in progress back to Pouring", async ({ page }) => {
  await page.goto("/after?order=PRM-24115");
  await expect(sheetHeader(page)).toContainText("Pouring");
  await sheet(page).getByRole("button", { name: "Put on hold" }).click();
  await expect(sheetHeader(page)).toContainText("On hold");
  await sheet(page).getByRole("button", { name: "Release hold" }).click();
  await expect(sheetHeader(page)).toContainText("Pouring");
  await expect(sheetHeader(page)).toContainText("Late");
  await expect(sheetHeader(page)).not.toContainText("Scheduled");
});

test("cancel asks first, Enter twice keeps the order, and delivered concrete stays counted", async ({ page }) => {
  await page.goto("/after?order=PRM-24114");
  const cancel = sheet(page).getByRole("button", { name: "Cancel order…" });
  await cancel.focus();
  await page.keyboard.press("Enter");
  await expect(sheet(page).getByRole("button", { name: "Keep order" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(cancel).toBeFocused();
  await expect(sheetHeader(page)).toContainText("Pouring");

  await cancel.click();
  await expect(sheet(page)).toContainText("already out");
  await sheet(page).getByRole("button", { name: "Cancel order", exact: true }).click();
  await expect(sheetHeader(page)).toContainText("Cancelled");
  await expect(sheet(page).getByTestId("load")).toHaveCount(4);
  await expect(sheet(page)).toContainText("delivered and invoiced");
  await page.keyboard.press("Escape");
  await expect(page.getByText("208.5 m³ delivered · 36%")).toBeVisible();
  await expect(page.getByText("582.5", { exact: true })).toBeVisible();
});

test("Schedule pour starts on the board's plant and takes a time typed as 1330", async ({ page }) => {
  await page.goto("/after?plant=mjw");
  await expect(rows(page).first()).toBeVisible();
  await page.getByRole("button", { name: "Schedule pour" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("#pour-plant")).toContainText("Moose Jaw");
  await dialog.getByLabel("Customer").fill("Fescue Homes");
  await dialog.getByLabel("Site address").fill("120 Furrow St, Moose Jaw");
  await dialog.getByLabel(/^Volume/).fill("16");
  const start = dialog.getByLabel("First truck on site");
  await start.fill("1330");
  await start.blur();
  await expect(start).toHaveValue("13:30");
  await expect(dialog.getByText("2 loads of up to 8 m³ · last truck about 13:55")).toBeVisible();
  await dialog.getByRole("button", { name: "Schedule pour" }).click();
  await expect(sheetHeader(page)).toContainText("Fescue Homes");
  await expect(sheetHeader(page)).toContainText("Moose Jaw");
  await expect(page).toHaveURL(/plant=mjw.*order=PRM-24141/);
  await page.keyboard.press("Escape");
  await expect(rows(page).filter({ hasText: "Fescue Homes" })).toHaveCount(1);
});

test("Cancel while Scheduling… really cancels", async ({ page }) => {
  await page.goto("/after");
  await expect(rows(page)).toHaveCount(40);
  await page.getByRole("button", { name: "Schedule pour" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Customer").fill("Draft Co");
  await dialog.getByLabel("Site address").fill("8 Seeder Ave, Regina");
  await dialog.getByLabel(/^Volume/).fill("8");
  await dialog.getByLabel("First truck on site").fill("14:00");
  await dialog.getByRole("button", { name: "Schedule pour" }).click();
  await expect(dialog.getByRole("button", { name: "Scheduling…" })).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await page.waitForTimeout(1200);
  await expect(rows(page)).toHaveCount(40);
  await expect(sheet(page)).toBeHidden();
  // The next open starts empty.
  await page.getByRole("button", { name: "Schedule pour" }).click();
  await expect(page.getByRole("dialog").getByLabel("Customer")).toHaveValue("");
});

test("an empty day books a pour that then shows on the board", async ({ page }) => {
  await page.goto("/after?state=empty");
  await expect(page.getByRole("heading", { name: "No pours scheduled today" })).toBeVisible();
  await expect(page.getByText("17", { exact: true })).toBeVisible();
  await page.locator("#board").getByRole("button", { name: "Schedule pour" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Customer").fill("Thistle Way Homes");
  await dialog.getByLabel("Site address").fill("40 Thistle Way, Regina");
  await dialog.getByLabel(/^Volume/).fill("12");
  await dialog.getByLabel("First truck on site").fill("11:00");
  await dialog.getByRole("button", { name: "Schedule pour" }).click();
  await expect(sheet(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(rows(page)).toHaveCount(1);
  await expect(page.getByTestId("result-count")).toHaveText("1 order");
});

test("a failed refresh keeps the last good board, says how old it is and retries", async ({ page }) => {
  await page.goto("/after?state=error");
  await expect(page.getByRole("alert").filter({ hasText: "Couldn’t refresh the board since 09:41." })).toBeVisible();
  await expect(page.getByTestId("board-time")).toContainText("board as of 09:41, not updating");
  await expect(rows(page)).toHaveCount(40);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Couldn’t refresh" })).toBeHidden({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/after$/);
  await expect(rows(page)).toHaveCount(40);
});

test("loading shows no numbers before they are known", async ({ page }) => {
  await page.goto("/after?state=loading");
  await expect(page.getByTestId("result-count")).toHaveText("Loading…");
  await expect(page.getByTestId("view-today")).toBeVisible();
  await expect(page.getByTestId("view-today")).not.toContainText(/\d/);
  await expect(page.getByText("582.5")).toHaveCount(0);
});

test("partial data flags the Moose Jaw rows it affects", async ({ page }) => {
  await page.goto("/after?state=partial");
  await expect(page.getByText("ETAs for Moose Jaw loads may be up to 11 min old")).toBeVisible();
  await expect(rows(page).filter({ hasText: "GPS 11 min old" })).toHaveCount(2);
  await expect(page.getByText("MJW")).toHaveCount(0);
});

test("clicking an hour in the chart lists the pours due in it", async ({ page }) => {
  await page.goto("/after");
  await expect(rows(page)).toHaveCount(40);
  await page.getByRole("button", { name: /^10:00–11:00/ }).click();
  await expect(page).toHaveURL(/hour=10/);
  const chip = page.getByRole("button", { name: /Due 10:00–11:00/ });
  await expect(chip).toBeVisible();
  const count = await rows(page).count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThan(40);
  await chip.click();
  await expect(rows(page)).toHaveCount(40);
  await expect(page).not.toHaveURL(/hour=/);
});

test("rare filters sit behind Filters and show as removable chips", async ({ page }) => {
  await page.goto("/after");
  await page.getByTestId("more-filters").click();
  await page.getByRole("group", { name: "Placement" }).getByRole("button", { name: "Pump" }).click();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/place=pump/);
  const count = await rows(page).count();
  expect(count).toBeGreaterThan(0);
  for (const row of await rows(page).all()) await expect(row).toContainText("Pump");
  await page.getByRole("list", { name: "Active filters" }).getByRole("button", { name: /Pump/ }).click();
  await expect(rows(page)).toHaveCount(40);
});

test("annotations show nine markers beside a legend that covers nothing", async ({ page }) => {
  await page.goto("/after?notes=1");
  await expect(page.getByTestId("annotation-column")).toBeVisible();
  for (let n = 1; n <= 9; n++) {
    await expect(page.locator(`[data-annotation="${n}"]`).filter({ visible: true })).toHaveCount(1);
  }
  await page.locator('[data-annotation="1"]').click();
  await expect(page.getByRole("dialog").filter({ hasText: "One primary action" })).toBeVisible();
  await page.keyboard.press("Escape");
  // The legend is a column beside the board, not over it.
  const legend = (await page.getByTestId("annotation-column").boundingBox())!;
  const table = (await tableContainer(page).boundingBox())!;
  expect(table.x + table.width).toBeLessThanOrEqual(legend.x);
});

test.describe("tablet and laptop widths", () => {
  for (const notes of [false, true]) {
    test(`the table never scrolls sideways from 768 to 1920 px${notes ? " with annotations on" : ""}`, async ({ page }) => {
      await page.goto(notes ? "/after?notes=1" : "/after");
      await expect(rows(page).first()).toBeVisible();
      for (const width of [768, 820, 1024, 1112, 1180, 1280, 1300, 1366, 1440, 1536, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await expect
          .poll(async () => tableContainer(page).evaluate((el) => el.scrollWidth - el.clientWidth), {
            message: `table overflows at ${width}px`,
          })
          .toBeLessThanOrEqual(0);
        await expectNoSidewaysScroll(page);
      }
    });
  }

  test("trucks show on an iPad in landscape", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/after");
    await expect(page.getByRole("columnheader", { name: "Trucks" })).toBeVisible();
    await expect(rows(page).first().getByText("T-202")).toBeVisible();
  });
});
