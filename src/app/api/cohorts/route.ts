import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { cohortCreateSchema } from "@/lib/schemas";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const cohorts = await prisma.cohort.findMany({ orderBy: { startDate: "desc" } });
  return NextResponse.json(cohorts);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const parsed = cohortCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const { active, ...rest } = parsed.data;
  const cohort = await prisma.$transaction(async (tx) => {
    if (active) await tx.cohort.updateMany({ data: { active: false } });
    return tx.cohort.create({ data: { ...rest, active: active ?? false } });
  });
  return NextResponse.json(cohort, { status: 201 });
}
