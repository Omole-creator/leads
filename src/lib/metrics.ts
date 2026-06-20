import type { Stage } from "@prisma/client";
import { STAGES } from "./constants";

export interface LeadForMetrics {
  stage: Stage;
  amountPaid: number;
  balanceLeft: number;
  createdAt: Date;
  closedAt: Date | null;
}

export function closeRate(leads: LeadForMetrics[]): number {
  const won = leads.filter((l) => l.stage === "CLOSED_WON").length;
  const lost = leads.filter((l) => l.stage === "CLOSED_LOST").length;
  const total = won + lost;
  return total === 0 ? 0 : won / total;
}

export function totalRevenue(leads: LeadForMetrics[]): number {
  return leads.reduce((sum, l) => sum + l.amountPaid, 0);
}

export function outstandingBalance(leads: LeadForMetrics[]): number {
  return leads
    .filter((l) => l.stage !== "CLOSED_LOST")
    .reduce((sum, l) => sum + l.balanceLeft, 0);
}

export function avgDaysToClose(leads: LeadForMetrics[]): number {
  const closed = leads.filter((l) => l.stage === "CLOSED_WON" && l.closedAt);
  if (closed.length === 0) return 0;
  const totalDays = closed.reduce((sum, l) => {
    const ms = l.closedAt!.getTime() - l.createdAt.getTime();
    return sum + ms / (1000 * 60 * 60 * 24);
  }, 0);
  return totalDays / closed.length;
}

export function funnel(leads: LeadForMetrics[]): Record<Stage, number> {
  return Object.fromEntries(
    STAGES.map((s) => [s, leads.filter((l) => l.stage === s).length]),
  ) as Record<Stage, number>;
}

/** Count leads in a category, e.g. by source or track name. */
export function countBy<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const label = String(row[key] ?? "Unknown");
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count }));
}
