import { test, expect } from "@playwright/test";

// Unauthenticated — no storage state.
test.use({ storageState: { cookies: [], origins: [] } });

test("unauthenticated user is redirected to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("login page shows the JobMingle logo and Google button", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("img", { name: "JobMingle" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /continue with google/i }),
  ).toBeVisible();
});
