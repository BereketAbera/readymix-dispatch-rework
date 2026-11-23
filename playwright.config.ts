import { defineConfig, devices } from "@playwright/test";

/** Runs against a local production build, or against BASE_URL when it is set. */
const baseURL = process.env.BASE_URL ?? "http://localhost:3301";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "pnpm start --port 3301",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
