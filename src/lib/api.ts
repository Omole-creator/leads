import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import type { SessionUser } from "./permissions";

/** Returns the session user, or a 401 NextResponse to return early. */
export async function requireUser(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}

/** Returns the session user if admin, or a 401/403 NextResponse. */
export async function requireAdmin(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const result = await requireUser();
  if ("response" in result) return result;
  if (result.user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
}
