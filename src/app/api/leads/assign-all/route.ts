import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import type { LeadFilters } from "@/lib/leads";
import type { Prisma, Stage } from "@prisma/client";

// Assign every lead matching the filters to a single chosen closer.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const b = await req.json().catch(() => ({}));
  const repId = String(b?.repId ?? "");
  if (!repId) {
    return NextResponse.json({ error: "Choose a closer" }, { status: 400 });
  }
  const rep = await prisma.user.findUnique({ where: { id: repId } });
  if (!rep || rep.role !== "SALES_REP") {
    return NextResponse.json({ error: "Invalid closer" }, { status: 400 });
  }

  const f: LeadFilters = {
    cohortId: b?.cohortId || undefined,
    trackId: b?.trackId || undefined,
    stage: (b?.stage as Stage) || undefined,
    segment: b?.segment || undefined,
  };
  const where: Prisma.LeadWhereInput = {};
  if (f.cohortId) where.cohortId = f.cohortId;
  if (f.trackId) where.trackId = f.trackId;
  if (f.stage) where.stage = f.stage;
  if (f.segment) where.segment = f.segment;

  const result = await prisma.lead.updateMany({
    where,
    data: { assignedRepId: repId, lastActivityAt: new Date() },
  });
  return NextResponse.json({ assigned: result.count, closer: rep.name });
}
