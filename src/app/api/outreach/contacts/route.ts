import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { companyContactCreateSchema } from "@/lib/schemas";
import {
  countContacts,
  filtersFromParams,
  listContacts,
  toOutreachFilters,
} from "@/lib/outreach";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const sp = req.nextUrl.searchParams;
  const filters = toOutreachFilters(filtersFromParams(sp));
  const take = Number(sp.get("take")) || undefined;
  const skip = Number(sp.get("skip")) || undefined;

  // The composer only needs enough to render the recipient tick-list.
  const slim = sp.get("fields") === "recipient";

  const [contacts, total] = await Promise.all([
    listContacts(prisma, filters, { take, skip }),
    countContacts(prisma, filters),
  ]);

  return NextResponse.json({
    total,
    contacts: slim
      ? contacts.map((c) => ({
          id: c.id,
          email: c.email,
          firstName: c.firstName,
          companyName: c.companyName,
          jobTitle: c.jobTitle,
        }))
      : contacts,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const parsed = companyContactCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const existing = await prisma.companyContact.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A contact with that email already exists" },
      { status: 409 },
    );
  }

  const contact = await prisma.companyContact.create({ data: parsed.data });
  return NextResponse.json(contact, { status: 201 });
}
