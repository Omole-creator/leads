import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { stageUpdateSchema } from "@/lib/schemas";
import { updateStage } from "@/lib/leads";
import { canAccessLead } from "@/lib/permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccessLead(auth.user, lead)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = stageUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const updated = await updateStage(prisma, auth.user, id, parsed.data.stage);
  return NextResponse.json(updated);
}
