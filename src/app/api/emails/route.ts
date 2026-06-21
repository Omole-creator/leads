import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";

// Create a draft email.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const b = await req.json().catch(() => ({}));
  const draft = await prisma.emailCampaign.create({
    data: {
      status: "DRAFT",
      subject: String(b?.subject ?? ""),
      body: String(b?.body ?? ""),
      segment: b?.segment || null,
      trackId: b?.trackId || null,
      stage: b?.stage || null,
      cohortId: b?.cohortId || null,
      sentById: auth.user.id,
    },
  });
  return NextResponse.json(draft, { status: 201 });
}
