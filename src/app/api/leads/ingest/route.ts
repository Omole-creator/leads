import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ingestSchema } from "@/lib/schemas";
import { ingestLead, TrackNotFoundError } from "@/lib/ingest";

export async function POST(req: NextRequest) {
  // 1. Shared-secret auth
  const secret = req.headers.get("x-ingest-secret");
  if (!secret || secret !== process.env.INGEST_SHARED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse + validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // 3. Ingest
  try {
    const result = await ingestLead(prisma, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof TrackNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[ingest] unexpected error:", err);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}
