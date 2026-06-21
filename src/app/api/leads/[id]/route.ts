import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/api";
import { getLeadDetail } from "@/lib/leads";
import { canAccessLead } from "@/lib/permissions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const lead = await getLeadDetail(prisma, id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccessLead(auth.user, lead)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(lead);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Follow-ups, notes and activity log cascade via the schema.
  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
