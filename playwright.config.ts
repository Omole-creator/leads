import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      E2E_TEST_MODE: "true",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "e2e-dummy-secret",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-dummy-secret",
      INGEST_SHARED_SECRET: process.env.INGEST_SHARED_SECRET ?? "e2e-ingest-secret",
    },
  },
});
