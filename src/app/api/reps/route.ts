import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { repCreateSchema } from "@/lib/schemas";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const reps = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(reps);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const parsed = repCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A user with that email already exists" },
      { status: 409 },
    );
  }

  const rep = await prisma.user.create({ data: parsed.data });
  return NextResponse.json(rep, { status: 201 });
}
