import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";

// Edit a draft (only drafts are editable — sent emails are a record).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const existing = await prisma.emailCampaign.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Sent emails can't be edited." },
      { status: 409 },
    );
  }

  const b = await req.json().catch(() => ({}));
  const updated = await prisma.emailCampaign.update({
    where: { id },
    data: {
      subject: String(b?.subject ?? existing.subject),
      body: String(b?.body ?? existing.body),
      segment: b?.segment ?? null,
      trackId: b?.trackId ?? null,
      stage: b?.stage ?? null,
      cohortId: b?.cohortId ?? null,
    },
  });
  return NextResponse.json(updated);
}

// Delete a campaign (draft or sent record).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  await prisma.emailCampaign.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
