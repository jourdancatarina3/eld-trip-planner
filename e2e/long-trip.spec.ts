import { expect, test } from "@playwright/test";
import { expectPlanReady, planTrip } from "./helpers";

test.describe("long cross-country trip", () => {
  test("schedules fuel stops, rests, and a 34-hr restart", async ({ page }) => {
    await page.goto("/");
    await planTrip(page, {
      current: "Los Angeles",
      pickup: "Las Vegas",
      dropoff: "New York",
      cycleUsed: "60",
    });
    await expectPlanReady(page);

    // A ~2,800 mile trip with only 10 cycle hours left needs a restart,
    // several rests, and at least two fuel stops.
    const stopsPanel = page.getByTestId("stops-timeline");
    await expect(stopsPanel.getByText("34-hr restart").first()).toBeVisible();
    await expect(stopsPanel.getByText("Fuel stop").first()).toBeVisible();
    await expect(stopsPanel.getByText("10-hr rest").first()).toBeVisible();

    const summaryStops = page.getByTestId("summary-stops");
    await expect(summaryStops).toContainText("fuel");
    await expect(summaryStops).toContainText("restart");

    // Multiple daily log sheets, one per calendar day, each totaling 24h
    const sheets = page.getByTestId("log-sheet");
    const sheetCount = await sheets.count();
    expect(sheetCount).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < sheetCount; i++) {
      await expect(sheets.nth(i).getByTestId("total-day")).toHaveText(
        /= 24\.00/
      );
    }

    // The summary day count matches the number of sheets
    await expect(page.getByTestId("summary-duration")).toContainText(
      `${sheetCount} days`
    );

    // The 11-hr limit applies per 14-hr window (verified by backend unit
    // tests), not per calendar day — a day spanning two windows can show up
    // to 14 hrs of driving (24 minus a 10-hr rest).
    for (let i = 0; i < sheetCount; i++) {
      const driving = await sheets
        .nth(i)
        .getByTestId("total-driving")
        .textContent();
      expect(parseFloat(driving ?? "0")).toBeLessThanOrEqual(14.0 + 1e-6);
    }
  });
});
