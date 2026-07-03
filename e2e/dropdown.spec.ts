import { expect, test } from "@playwright/test";

test.describe("location dropdown", () => {
  test("opens a popular-cities list on click and fills on pick", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("current-location").click();

    await expect(page.getByText("Popular cities")).toBeVisible();
    const options = page.getByTestId("current-location-option");
    await expect(options.first()).toBeVisible();
    expect(await options.count()).toBeGreaterThanOrEqual(6);

    await options.filter({ hasText: "Chicago, IL" }).first().click();
    await expect(page.getByTestId("current-location")).toHaveValue("Chicago, IL");
    // Selecting closes the list
    await expect(page.getByText("Popular cities")).not.toBeVisible();
  });

  test("chevron toggle opens and closes the list", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("pickup-location-toggle");
    const options = page.getByTestId("pickup-location-option");

    await toggle.click();
    await expect(options.first()).toBeVisible();

    await toggle.click();
    await expect(options.first()).not.toBeVisible();
  });

  test("typing filters to live-geocoded matches", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("dropoff-location");
    await input.click();
    await input.fill("Denv");

    const options = page.getByTestId("dropoff-location-option");
    await expect(options.first()).toContainText("Denver");
    // The popular-cities header is gone once a query is active
    await expect(page.getByText("Popular cities")).not.toBeVisible();
  });

  test("shows a no-matches message for unknown places", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("current-location");
    await input.click();
    await input.fill("Zzyzxville Nowhere");
    await expect(page.getByText(/No matches for/)).toBeVisible();
  });
});
