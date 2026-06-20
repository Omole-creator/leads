import { test, expect } from "@playwright/test";
import path from "node:path";

test.use({
  storageState: path.join(process.cwd(), "tests", "e2e", ".auth", "admin.json"),
});

test("admin can add a new sales rep", async ({ page }) => {
  const unique = `New Rep ${Date.now()}`;
  const email = `newrep-${Date.now()}@jobmingle.com`;

  await page.goto("/admin/reps");
  await page.getByLabel("Name").fill(unique);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Add rep" }).click();

  await expect(page.getByText(unique)).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});
