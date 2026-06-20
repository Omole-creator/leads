import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { cohortUpdateSchema } from "@/lib/schemas";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const parsed = cohortUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  // Activating a cohort deactivates all others atomically.
  const cohort = await prisma.$transaction(async (tx) => {
    if (parsed.data.active === true) {
      await tx.cohort.updateMany({ data: { active: false } });
    }
    return tx.cohort.update({ where: { id }, data: parsed.data });
  });
  return NextResponse.json(cohort);
}
