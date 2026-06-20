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

  // Only delete a rep with zero historical leads; otherwise deactivate instead.
  const leadCount = await prisma.lead.count({ where: { assignedRepId: id } });
  if (leadCount > 0) {
    return NextResponse.json(
      {
        error:
          "This rep has historical leads. Deactivate them instead of deleting.",
      },
      { status: 409 },
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
