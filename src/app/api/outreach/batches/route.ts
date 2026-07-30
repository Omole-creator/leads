import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { outreachBatchCreateSchema } from "@/lib/schemas";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const batches = await prisma.outreachBatch.findMany({
    include: { _count: { select: { contacts: true } } },
    orderBy: { importedAt: "desc" },
  });
  return NextResponse.json(
    batches.map((b) => ({
      id: b.id,
      name: b.name,
      note: b.note,
      importedAt: b.importedAt,
      contactCount: b._count.contacts,
    })),
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const parsed = outreachBatchCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const existing = await prisma.outreachBatch.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A batch with that name already exists" },
      { status: 409 },
    );
  }

  const batch = await prisma.outreachBatch.create({ data: parsed.data });
  return NextResponse.json(batch, { status: 201 });
}
