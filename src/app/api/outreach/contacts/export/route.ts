import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import {
  contactsToCsv,
  filtersFromParams,
  listContacts,
  toOutreachFilters,
} from "@/lib/outreach";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const filters = toOutreachFilters(filtersFromParams(req.nextUrl.searchParams));
  const contacts = await listContacts(prisma, filters);

  // The BOM makes Excel read the file as UTF-8 instead of the system codepage.
  const csv = "﻿" + contactsToCsv(contacts);
  const stamp = new Date().toISOString().slice(0, 10);

  // The filename is generated here, never taken from the query string: a header
  // is not the place to interpolate caller-controlled text.
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="outreach-contacts-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
