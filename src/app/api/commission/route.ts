import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { commissionForTrackCost } from "@/lib/commission";

// Commission earned on won deals within a date range.
// Closer -> their own total. Admin -> total + per-closer breakdown.
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const sp = req.nextUrl.searchParams;
  const fromStr = sp.get("from");
  const toStr = sp.get("to");
  const from = fromStr ? new Date(fromStr + "T00:00:00Z") : new Date(0);
  const to = toStr ? new Date(toStr + "T00:00:00Z") : new Date();
  to.setUTCDate(to.getUTCDate() + 1); // inclusive of the "to" day

  const isAdmin = auth.user.role === "ADMIN";
  const leads = await prisma.lead.findMany({
    where: {
      stage: "CLOSED_WON",
      closedAt: { gte: from, lt: to },
      ...(isAdmin ? {} : { assignedRepId: auth.user.id }),
    },
    include: { track: true, assignedRep: true },
  });

  let total = 0;
  const byRep = new Map<string, { name: string; amount: number }>();
  for (const l of leads) {
    const amt = commissionForTrackCost(Number(l.track.cost));
    total += amt;
    if (l.assignedRepId) {
      const cur = byRep.get(l.assignedRepId) ?? {
        name: l.assignedRep?.name ?? "Unknown",
        amount: 0,
      };
      cur.amount += amt;
      byRep.set(l.assignedRepId, cur);
    }
  }

  return NextResponse.json({
    total,
    perRep: isAdmin
      ? [...byRep.entries()]
          .map(([repId, v]) => ({ repId, name: v.name, amount: v.amount }))
          .sort((a, b) => b.amount - a.amount)
      : undefined,
  });
}
