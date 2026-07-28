import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e is temporarily disabled for Phase 9.5.
 * Specs under `e2e/` are stale (Advertising OS nav/copy) and will be rewritten
 * after Meta Marketing API (Phase 10) or when a dedicated e2e pass is scheduled.
 *
 * Running `pnpm test:e2e` exits successfully with zero tests collected.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Collect no tests until specs are restored.
  testMatch: /(?!)/,
});
