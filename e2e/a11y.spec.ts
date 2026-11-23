import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ROUTES = [
  "/",
  "/before",
  "/after",
  "/after?notes=1",
  "/after?state=loading",
  "/after?state=empty",
  "/after?state=error",
  "/after?state=partial",
  "/after?q=zzqx",
  "/field",
  "/field/qc",
  "/standard",
  "/no-such-page",
];

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
}

for (const [label, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test.describe(`axe, ${label}`, () => {
    test.use({ viewport });
    for (const path of ROUTES) {
      test(`${path} has no violations`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        if (path === "/after" || path === "/after?notes=1") {
          await expect(page.getByRole("group", { name: "Concrete due on site by hour" })).toBeVisible();
        }
        expect(await violations(page)).toEqual([]);
      });
    }

    test("the open order sheet has no violations", async ({ page }) => {
      await page.goto("/after?order=PRM-24115");
      await expect(page.getByTestId("order-sheet")).toBeVisible();
      await page.waitForTimeout(400);
      expect(await violations(page)).toEqual([]);
    });

    test("the Schedule pour form with errors has no violations", async ({ page }) => {
      await page.goto("/after");
      await page.getByRole("button", { name: "Schedule pour" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Schedule pour" }).click();
      await expect(page.getByText("Enter the customer’s name.")).toBeVisible();
      await page.waitForTimeout(300);
      expect(await violations(page)).toEqual([]);
    });
  });
}
