import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { outreachBatchUpdateSchema } from "@/lib/schemas";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const parsed = outreachBatchUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const data = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );

  const batch = await prisma.outreachBatch
    .update({ where: { id }, data })
    .catch(() => null);
  if (!batch) {
    return NextResponse.json(
      { error: "Could not rename that batch. Is the name already taken?" },
      { status: 409 },
    );
  }
  return NextResponse.json(batch);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const withContacts = req.nextUrl.searchParams.get("withContacts") === "1";
  const count = await prisma.companyContact.count({ where: { batchId: id } });

  // Deleting a batch is not a way to lose contacts by accident: say how many
  // are in it and make the caller opt in to removing them.
  if (count > 0 && !withContacts) {
    return NextResponse.json(
      {
        error: `This batch has ${count} contact(s). Delete them too, or move them to another batch first.`,
        contactCount: count,
      },
      { status: 409 },
    );
  }

  if (withContacts && count > 0) {
    await prisma.companyContact.deleteMany({ where: { batchId: id } });
  }
  await prisma.outreachBatch.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true, deletedContacts: withContacts ? count : 0 });
}
