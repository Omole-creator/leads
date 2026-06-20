import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { trackCreateSchema } from "@/lib/schemas";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const tracks = await prisma.track.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(tracks);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const parsed = trackCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const existing = await prisma.track.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A track with that name already exists" },
      { status: 409 },
    );
  }

  const track = await prisma.track.create({ data: parsed.data });
  return NextResponse.json(track, { status: 201 });
}
