import { defineConfig, devices } from "@playwright/test";

const port = 3210;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/smoke",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm dev --hostname 127.0.0.1 --port ${port}`,
    env: {
      MAIL_BROWSER_SMOKE_TESTS: "1",
      // The smoke app renders through the real root layout, which calls
      // Auth.js even though these fixtures do not sign in. Keep this local to
      // Playwright so CI has valid test configuration without a repository
      // secret or production credential.
      AUTH_SECRET: "mail-playwright-smoke-tests-only-not-for-production",
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: `${baseURL}/smoke-tests`,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
