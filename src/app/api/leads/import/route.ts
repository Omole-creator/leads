import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { importLeadsFromCsv } from "@/lib/leads";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => ({}));
  const csv = typeof body?.csv === "string" ? body.csv : "";
  const cohortName =
    (typeof body?.cohortName === "string" && body.cohortName.trim()) || "";
  const segment =
    (typeof body?.segment === "string" && body.segment.trim()) || "IMPORTED";

  if (!csv.trim()) {
    return NextResponse.json({ error: "No CSV data provided" }, { status: 400 });
  }
  if (!cohortName) {
    return NextResponse.json({ error: "Enter a cohort name" }, { status: 400 });
  }

  const result = await importLeadsFromCsv(prisma, csv, cohortName, segment);
  return NextResponse.json(result, { status: 201 });
}
