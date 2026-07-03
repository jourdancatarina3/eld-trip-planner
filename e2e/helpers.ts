import { expect, type Page } from "@playwright/test";

export interface TripInput {
  current: string;
  pickup: string;
  dropoff: string;
  cycleUsed: string;
  startTime?: string;
}

export async function pickLocation(page: Page, testId: string, query: string) {
  const input = page.getByTestId(testId);
  await input.click();
  await input.fill(query);
  const option = page.getByTestId(`${testId}-option`).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(input).not.toHaveValue(query.length ? "" : query);
}

export async function planTrip(page: Page, trip: TripInput) {
  await pickLocation(page, "current-location", trip.current);
  await pickLocation(page, "pickup-location", trip.pickup);
  await pickLocation(page, "dropoff-location", trip.dropoff);
  await page.getByTestId("cycle-used").fill(trip.cycleUsed);
  await page
    .getByTestId("start-time")
    .fill(trip.startTime ?? "2026-07-06T08:00");
  await page.getByTestId("plan-trip").click();
}

export async function expectPlanReady(page: Page) {
  await expect(page.getByTestId("summary-distance")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("route-map")).toBeVisible();
  await expect(page.getByTestId("log-sheet").first()).toBeVisible();
}
