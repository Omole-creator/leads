import { test, expect } from "@playwright/test";
import path from "node:path";

test.use({
  storageState: path.join(process.cwd(), "tests", "e2e", ".auth", "admin.json"),
});

test("dashboard renders overview, KPIs and charts", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Total Leads", { exact: true })).toBeVisible();
  await expect(page.getByText("Total Commission", { exact: true })).toBeVisible();
  await expect(page.getByText("Leads by Source", { exact: true })).toBeVisible();
  await expect(page.getByText("Pipeline by Stage", { exact: true })).toBeVisible();
  await expect(page.getByText("Commission per Closer", { exact: true })).toBeVisible();
});

test("visual smoke: logo top-left and brand on the header", async ({ page }) => {
  await page.goto("/dashboard");
  const logo = page.getByRole("img", { name: "JobMingle" });
  await expect(logo).toBeVisible();
  const box = await logo.boundingBox();
  expect(box).not.toBeNull();
  // Logo sits in the top-left region of the viewport.
  expect(box!.x).toBeLessThan(300);
  expect(box!.y).toBeLessThan(80);
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
});

test("mobile (375px) renders without horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
