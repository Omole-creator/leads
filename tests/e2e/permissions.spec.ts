import { test, expect } from "@playwright/test";
import path from "node:path";

test.use({
  storageState: path.join(process.cwd(), "tests", "e2e", ".auth", "rep.json"),
});

test("a sales rep is redirected away from /admin/* routes", async ({ page }) => {
  await page.goto("/admin/reps");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("a sales rep does not see admin nav links", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Reps" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Leads" })).toBeVisible();
});
