import { expect, test } from "@playwright/test";
import { expectPlanReady, planTrip } from "./helpers";

test.describe("trip planning workflow", () => {
  test("shows the empty state before planning", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ELD Trip Planner/);
    await expect(page.getByTestId("empty-state")).toBeVisible();
    await expect(page.getByTestId("trip-form")).toBeVisible();
  });

  test("plans a regional trip end to end", async ({ page }) => {
    await page.goto("/");
    await planTrip(page, {
      current: "Chicago",
      pickup: "St. Louis",
      dropoff: "Dallas",
      cycleUsed: "20",
    });
    await expectPlanReady(page);

    // Summary reflects a ~950 mile, 2-day trip
    await expect(page.getByTestId("summary-distance")).toContainText("mi");
    await expect(page.getByTestId("summary-duration")).toContainText("2 days");

    // Map draws the route and every stop marker
    await expect(page.locator(".leaflet-interactive").first()).toBeVisible();
    const markers = page.locator(".stop-marker");
    await expect(markers.first()).toBeVisible();
    expect(await markers.count()).toBeGreaterThanOrEqual(4);

    // Timeline lists the same stops in order, starting and ending correctly
    const timelineStops = page.getByTestId("timeline-stop");
    await expect(timelineStops.first()).toContainText("Trip start");
    await expect(timelineStops.last()).toContainText("Dropoff");
    expect(await timelineStops.count()).toBe(await markers.count());

    // A pickup and a 10-hr rest are on the schedule
    await expect(
      page.getByTestId("stops-timeline").getByText("Pickup", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByTestId("stops-timeline").getByText("10-hr rest").first()
    ).toBeVisible();
  });

  test("draws a compliant daily log sheet for every day", async ({ page }) => {
    await page.goto("/");
    await planTrip(page, {
      current: "Chicago",
      pickup: "St. Louis",
      dropoff: "Dallas",
      cycleUsed: "20",
    });
    await expectPlanReady(page);

    const sheets = page.getByTestId("log-sheet");
    const sheetCount = await sheets.count();
    expect(sheetCount).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < sheetCount; i++) {
      const sheet = sheets.nth(i);
      // Every day must account for exactly 24 hours
      await expect(sheet.getByTestId("total-day")).toHaveText(/= 24\.00/);
      // The duty-status line is drawn on the grid
      await expect(sheet.getByTestId("duty-line")).toBeAttached();
      // Recap chips are present
      await expect(sheet.getByTestId("recap-available")).toBeVisible();
    }

    // Day 1 shows the trip's start city and some driving miles
    await expect(sheets.first()).toContainText("Chicago, IL");
    await expect(sheets.first()).toContainText("mi");
  });

  test("fills the form from a sample chip", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("sample-Chicago → Dallas").click();
    await expect(page.getByTestId("current-location")).toHaveValue(
      "Chicago, IL"
    );
    await page.getByTestId("start-time").fill("2026-07-06T08:00");
    await page.getByTestId("plan-trip").click();
    await expectPlanReady(page);
  });
});
