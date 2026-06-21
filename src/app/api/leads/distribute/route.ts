import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { distributeUnassignedLeads } from "@/lib/leads";

export async function POST() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const assigned = await distributeUnassignedLeads(prisma);
  return NextResponse.json({ assigned });
}
