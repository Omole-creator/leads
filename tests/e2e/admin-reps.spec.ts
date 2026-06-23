import { test, expect } from "@playwright/test";
import path from "node:path";

test.use({
  storageState: path.join(process.cwd(), "tests", "e2e", ".auth", "admin.json"),
});

test("admin can add a new sales closer", async ({ page }) => {
  const unique = `New Closer ${Date.now()}`;
  const email = `newcloser-${Date.now()}@jobmingle.com`;

  await page.goto("/admin/reps");
  await page.getByLabel("Name").fill(unique);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Add closer" }).click();

  // The name also appears in the commission panel, so scope to the closers
  // table cell to avoid a strict-mode violation (two visible matches).
  await expect(page.getByRole("cell", { name: unique })).toBeVisible();
  await expect(page.getByRole("cell", { name: email })).toBeVisible();
});
