import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { repUpdateSchema } from "@/lib/schemas";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const parsed = repUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const rep = await prisma.user.update({ where: { id }, data: parsed.data });
  return NextResponse.json(rep);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  // Never delete an admin via this endpoint — that can lock everyone out.
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admins can't be deleted here." },
      { status: 403 },
    );
  }

  // Their leads become UNASSIGNED (admin's pool) but keep ALL history — stage,
  // follow-up counts, notes, activity stay on the lead. The admin then
  // reassigns to another closer, who picks up exactly where this one left off.
  const leadCount = await prisma.lead.count({ where: { assignedRepId: id } });
  await prisma.lead.updateMany({
    where: { assignedRepId: id },
    data: { assignedRepId: null },
  });
  // Detach the closer from history records (preserved, just authorless).
  await prisma.note.updateMany({ where: { authorId: id }, data: { authorId: null } });
  await prisma.followUpLog.updateMany({ where: { byId: id }, data: { byId: null } });
  await prisma.followUp.updateMany({
    where: { completedById: id },
    data: { completedById: null },
  });
  await prisma.activityLog.updateMany({ where: { userId: id }, data: { userId: null } });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true, unassignedLeads: leadCount });
}
