import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { outreachImportSchema } from "@/lib/schemas";
import { importContactsFromCsv } from "@/lib/outreach";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const parsed = outreachImportSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const { csv, batchName, updateExisting } = parsed.data;
  const result = await importContactsFromCsv(prisma, csv, batchName, {
    updateExisting,
  });
  return NextResponse.json(result, { status: 201 });
}
