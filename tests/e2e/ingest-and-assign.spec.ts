import { test, expect } from "@playwright/test";
import path from "node:path";

const INGEST_SECRET = process.env.INGEST_SHARED_SECRET ?? "e2e-ingest-secret";
const adminState = path.join(process.cwd(), "tests", "e2e", ".auth", "admin.json");

test("ingest endpoint creates a lead that appears in the admin leads list", async ({
  request,
  browser,
}) => {
  const unique = `e2e-${Date.now()}`;
  const res = await request.post("/api/leads/ingest", {
    headers: { "x-ingest-secret": INGEST_SECRET },
    data: {
      fullName: `E2E Lead ${unique}`,
      email: `${unique}@example.com`,
      phone: "08000000000",
      trackSelected: "Cybersecurity - ₦470,000",
      startTimeline: "April 30th Cohort",
      howFoundUs: "instagram",
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.balanceLeft).toBe(350000); // seeded price wins over email price

  const ctx = await browser.newContext({ storageState: adminState });
  const page = await ctx.newPage();
  await page.goto("/leads");
  await expect(page.getByText(`E2E Lead ${unique}`)).toBeVisible();
  await ctx.close();
});

test("ingest rejects requests without the shared secret", async ({ request }) => {
  const res = await request.post("/api/leads/ingest", {
    data: { fullName: "x", email: "x@x.com", phone: "1", trackSelected: "Cybersecurity", startTimeline: "c", howFoundUs: "ig" },
  });
  expect(res.status()).toBe(401);
});
