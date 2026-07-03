import { defineConfig, devices } from "@playwright/test";

/**
 * Boots both servers: Django (with USE_MOCK_APIS=1 so geocoding/routing are
 * deterministic and offline) and the production Next.js build.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium",
      },
    },
  ],
  webServer: [
    {
      command:
        "cd backend && .venv/bin/python manage.py runserver 8000 --noreload",
      url: "http://localhost:8000/api/health/",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: { USE_MOCK_APIS: "1" },
    },
    {
      command: "cd frontend && npm run build && npm run start",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { NEXT_PUBLIC_API_URL: "http://localhost:8000" },
    },
  ],
});
