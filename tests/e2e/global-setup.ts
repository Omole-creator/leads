import { request, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const baseURL = `http://localhost:${PORT}`;

export const STORAGE_DIR = path.join(process.cwd(), "tests", "e2e", ".auth");

/**
 * Logs in as a seeded user via the E2E credentials provider and saves the
 * resulting session as a Playwright storageState file. Requires the app to be
 * started with E2E_TEST_MODE=true.
 */
async function login(email: string, file: string) {
  const ctx = await request.newContext({ baseURL });

  const csrfRes = await ctx.get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();

  await ctx.post("/api/auth/callback/e2e", {
    form: { csrfToken, email, json: "true", redirect: "false" },
  });

  await ctx.storageState({ path: file });
  await ctx.dispose();
}

export default async function globalSetup(_config: FullConfig) {
  if (process.env.E2E_TEST_MODE !== "true") return;
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  await login("admin@jobmingle.com", path.join(STORAGE_DIR, "admin.json"));
  await login("rep1@jobmingle.com", path.join(STORAGE_DIR, "rep.json"));
}
