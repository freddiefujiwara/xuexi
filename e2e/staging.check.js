import { test, expect } from "@playwright/test";

// xuexi staging gate: the staging preview must load, show the STAGING
// banner, and render the exercise session from the data API.
// Note: until xuexi-gas-staging exists, the staging preview reads the
// production (read-only) API, so this check does not assert which GAS
// deployment was called. Switch to the shared registry check
// (e2e/apps.js) once the staging backend exists.
// The first question's format rotates daily (ordering questions have no
// .zh element before answering), so assert the session header instead of
// a specific question format.
test("xuexi staging page loads with banner and exercises", async ({ page }) => {
  const resp = await page.goto("/xuexi/staging/");
  expect(resp.status()).toBe(200);
  await expect(page.getByText("STAGING")).toBeVisible();
  await expect(page.getByRole("button", { name: "レッスンの復習" })).toBeVisible();
  await expect(page.getByText(/問目/).first()).toBeVisible();
  await expect(page.getByText(/レッスン議事録から作ったカード/)).toBeVisible();
});
