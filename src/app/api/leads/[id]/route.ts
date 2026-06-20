import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
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
