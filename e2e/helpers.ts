import { expect, type Locator, type Page } from "@playwright/test";

/** Collects page errors and console errors, so a test can assert there were none. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

/** The page itself never scrolls sideways (rule TB6). */
export async function expectNoSidewaysScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.scrollingElement!.scrollWidth,
    clientWidth: document.scrollingElement!.clientWidth,
  }));
  expect(scrollWidth, `page is ${scrollWidth - clientWidth}px wider than the screen`).toBeLessThanOrEqual(clientWidth);
}

/** Neither the page nor any element inside the locator is wider than its box. */
export async function expectNoOverflow(locator: Locator) {
  const extra = await locator.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(extra, "content overflows sideways").toBeLessThanOrEqual(0);
}

export const tableContainer = (page: Page) => page.locator('[data-slot="table-container"]').first();
