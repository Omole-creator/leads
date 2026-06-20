import { chromium } from "@playwright/test";
import path from "node:path";

const BASE = "http://localhost:3100";
const adminState = path.join(process.cwd(), "tests", "e2e", ".auth", "admin.json");
const out = process.env.TEMP || "/tmp";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  storageState: adminState,
  viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();

async function shot(url, file) {
  await page.goto(BASE + url, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(out, file), fullPage: true });
  console.log("captured", file);
}

await shot("/dashboard", "shot-dashboard.png");
await shot("/leads", "shot-leads.png");

// First lead detail
await page.goto(BASE + "/leads", { waitUntil: "networkidle" });
const firstLead = page.locator("table tbody tr td a").first();
const href = await firstLead.getAttribute("href");
if (href) {
  await page.goto(BASE + href, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, "shot-lead-detail.png"), fullPage: true });
  console.log("captured shot-lead-detail.png");
}

await shot("/admin/reps", "shot-admin-reps.png");

await browser.close();
