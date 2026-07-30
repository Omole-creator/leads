import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { outreachDraftSchema } from "@/lib/schemas";
import { senderName } from "@/lib/outreach-constants";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const parsed = outreachDraftSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const draft = await prisma.outreachCampaign.create({
    data: {
      status: "DRAFT",
      subject: parsed.data.subject,
      body: parsed.data.body,
      fromName: senderName(parsed.data.fromName),
      variant: parsed.data.variant ?? null,
      filters: parsed.data.filters ?? {},
      sentById: auth.user.id,
    },
  });
  return NextResponse.json(draft, { status: 201 });
}
