import { expect, test } from "@playwright/test";
import { expectPlanReady, planTrip } from "./helpers";

test.describe("responsive layout", () => {
  test("full workflow works at the current viewport", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await planTrip(page, {
      current: "Seattle",
      pickup: "Portland",
      dropoff: "Denver",
      cycleUsed: "0",
    });
    await expectPlanReady(page);

    // No horizontal page overflow at any viewport
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);

    const sheet = page.getByTestId("log-sheet").first();
    await sheet.scrollIntoViewIfNeeded();
    await expect(sheet.getByTestId("total-day")).toHaveText(/= 24\.00/);

    if (isMobile) {
      // The log grid pans horizontally inside its own container on phones
      const scroll = sheet.getByTestId("log-grid-scroll");
      const canPan = await scroll.evaluate(
        (el) => el.scrollWidth > el.clientWidth
      );
      expect(canPan).toBe(true);
    }
  });
});
