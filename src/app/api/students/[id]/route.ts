import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { studentUpdateSchema } from "@/lib/schemas";

// Admin: change a student's status (drop/defer/complete) or move them to
// another track (which re-routes them to that track's tutor).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const parsed = studentUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(lead);
}
