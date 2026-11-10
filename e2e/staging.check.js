import { test, expect } from "@playwright/test";

// xuexi staging gate: the staging preview must load, show the STAGING
// banner, and render review cards from the data API.
// Note: until xuexi-gas-staging exists, the staging preview reads the
// production (read-only) API, so this check does not assert which GAS
// deployment was called. Switch to the shared registry check
// (e2e/apps.js) once the staging backend exists.
test("xuexi staging page loads with banner and cards", async ({ page }) => {
  const resp = await page.goto("/xuexi/staging/");
  expect(resp.status()).toBe(200);
  await expect(page.getByText("STAGING")).toBeVisible();
  await expect(page.getByRole("button", { name: "今日の復習" })).toBeVisible();
  await expect(page.locator(".zh").first()).toBeVisible();
});
