import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { noteCreateSchema } from "@/lib/schemas";
import { addNote } from "@/lib/leads";
import { canAccessLead } from "@/lib/permissions";

export async function POST(
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

  const parsed = noteCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const note = await addNote(prisma, auth.user, id, parsed.data.body);
  return NextResponse.json(note, { status: 201 });
}
