import { expect, test } from "@playwright/test";
import { expectPlanReady, planTrip } from "./helpers";

test.describe("validation and error handling", () => {
  test("rejects an empty form with inline errors", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("plan-trip").click();
    await expect(page.getByText("Enter your current location.")).toBeVisible();
    await expect(page.getByText("Enter the pickup location.")).toBeVisible();
    await expect(page.getByText("Enter the dropoff location.")).toBeVisible();
    await expect(page.getByTestId("summary-distance")).not.toBeVisible();
  });

  test("rejects out-of-range cycle hours", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("cycle-used").fill("90");
    await page.getByTestId("plan-trip").click();
    await expect(
      page.getByText("Cycle hours must be between 0 and 70.")
    ).toBeVisible();
  });

  test("surfaces unknown locations from the backend", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("current-location");
    await input.fill("Zzyzxville Nowhere");
    await page.getByTestId("pickup-location").fill("Chicago");
    await page.getByTestId("pickup-location-option").first().click();
    await page.getByTestId("dropoff-location").fill("Dallas");
    await page.getByTestId("dropoff-location-option").first().click();
    await page.getByTestId("plan-trip").click();
    await expect(page.getByTestId("error-banner")).toBeVisible();
    await expect(page.getByTestId("error-banner")).toContainText(
      "Could not find a location"
    );
  });

  test("shows a friendly banner when the API fails", async ({ page }) => {
    await page.goto("/");
    await page.route("**/api/trips/plan/", (route) =>
      route.fulfill({ status: 500, body: "{}" })
    );
    await planTrip(page, {
      current: "Chicago",
      pickup: "St. Louis",
      dropoff: "Dallas",
      cycleUsed: "10",
    });
    await expect(page.getByTestId("error-banner")).toBeVisible();
  });

  test("recovers after an error", async ({ page }) => {
    await page.goto("/");
    await page.route("**/api/trips/plan/", (route) => route.abort());
    await planTrip(page, {
      current: "Chicago",
      pickup: "St. Louis",
      dropoff: "Dallas",
      cycleUsed: "10",
    });
    await expect(page.getByTestId("error-banner")).toBeVisible();
    await page.unroute("**/api/trips/plan/");
    await page.getByTestId("plan-trip").click();
    await expectPlanReady(page);
  });
});
