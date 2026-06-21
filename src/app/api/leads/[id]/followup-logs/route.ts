import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { addFollowUpLog, removeLastFollowUpLog } from "@/lib/leads";
import { canAccessLead } from "@/lib/permissions";

async function guard(id: string) {
  const auth = await requireUser();
  if ("response" in auth) return { response: auth.response };
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead)
    return { response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!canAccessLead(auth.user, lead)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user: auth.user };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const g = await guard(id);
  if ("response" in g) return g.response;

  const body = await req.json().catch(() => ({}));
  const reached = Boolean(body?.reached);
  const updated = await addFollowUpLog(prisma, g.user, id, reached);
  return NextResponse.json(updated, { status: 201 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const g = await guard(id);
  if ("response" in g) return g.response;

  await removeLastFollowUpLog(prisma, id);
  return NextResponse.json({ ok: true });
}
