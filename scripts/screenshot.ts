/**
 * Captures review screenshots of the app at desktop and mobile sizes.
 * Assumes both dev servers are already running (backend on :8000 with or
 * without mock APIs, frontend on :3000).
 *
 * Usage: npx tsx scripts/screenshot.ts <output-dir>
 */
import { chromium, devices, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve(process.argv[2] ?? "docs/screenshots");
mkdirSync(OUT, { recursive: true });

async function fillLocation(page: Page, testId: string, query: string) {
  const input = page.getByTestId(testId);
  await input.click();
  await input.fill(query);
  await page.getByTestId(`${testId}-option`).first().click();
}

async function planTrip(page: Page) {
  await fillLocation(page, "current-location", "Chicago");
  await fillLocation(page, "pickup-location", "St. Louis");
  await fillLocation(page, "dropoff-location", "Dallas");
  await page.getByTestId("cycle-used").fill("20");
  await page.getByTestId("start-time").fill("2026-07-06T08:00");
  await page.getByTestId("plan-trip").click();
  await page.getByTestId("summary-distance").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2500); // let map tiles settle
}

async function capture(
  name: string,
  viewport: { width: number; height: number },
  mobile = false
) {
  const browser = await chromium.launch();
  const context = await browser.newContext(
    mobile
      ? { ...devices["Pixel 7"], viewport }
      : { viewport, deviceScaleFactor: 2 }
  );
  const page = await context.newPage();
  await page.goto("http://localhost:3000/");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${name}-form.png`, fullPage: false });

  await planTrip(page);
  await page.screenshot({ path: `${OUT}/${name}-results.png`, fullPage: false });
  await page.screenshot({ path: `${OUT}/${name}-full.png`, fullPage: true });

  const sheet = page.getByTestId("log-sheet").first();
  await sheet.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await sheet.screenshot({ path: `${OUT}/${name}-log.png` });

  await browser.close();
  console.log(`captured ${name}`);
}

(async () => {
  await capture("desktop", { width: 1440, height: 900 });
  await capture("mobile", { width: 412, height: 915 }, true);
})();
