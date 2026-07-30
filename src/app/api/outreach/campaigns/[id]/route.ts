import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { outreachDraftSchema } from "@/lib/schemas";
import { senderName } from "@/lib/outreach-constants";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const existing = await prisma.outreachCampaign.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Sent emails can't be edited." },
      { status: 409 },
    );
  }

  const parsed = outreachDraftSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const draft = await prisma.outreachCampaign.update({
    where: { id },
    data: {
      subject: parsed.data.subject || existing.subject,
      body: parsed.data.body || existing.body,
      fromName: senderName(parsed.data.fromName),
      variant: parsed.data.variant ?? null,
      filters: parsed.data.filters ?? {},
    },
  });
  return NextResponse.json(draft);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  await prisma.outreachCampaign.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
