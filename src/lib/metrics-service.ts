import type { PrismaClient, Stage } from "@prisma/client";
import type { SessionUser } from "./permissions";
import { leadWhere, type LeadFilters } from "./leads";
import { closeRate, avgDaysToClose, funnel, type LeadForMetrics } from "./metrics";

export interface NamedCount {
  label: string;
  count: number;
}
export interface NamedRate {
  label: string;
  rate: number;
  won: number;
  total: number;
}
export interface NamedValue {
  label: string;
  value: number;
}

export interface DashboardMetrics {
  totalLeads: number;
  funnel: Record<Stage, number>;
  closeRate: number;
  avgDaysToClose: number;
  closedWon: number;
  closedLost: number;
  openLeads: number;
  leadsByTrack: NamedCount[];
  leadsBySource: NamedCount[];
  leadsByCohort: NamedCount[];
  conversionBySource: NamedRate[];
  conversionByTrack: NamedRate[];
  perRep: {
    repId: string;
    name: string;
    leads: number;
    closeRate: number;
    won: number;
    lost: number;
  }[];
}

interface Row {
  stage: Stage;
  amountPaid: number;
  balanceLeft: number;
  createdAt: Date;
  closedAt: Date | null;
  trackName: string;
  cohortName: string;
  source: string;
  repId: string | null;
  repName: string | null;
}

function conversion(rows: { stage: Stage }[]): { won: number; total: number; rate: number } {
  const won = rows.filter((r) => r.stage === "CLOSED_WON").length;
  const lost = rows.filter((r) => r.stage === "CLOSED_LOST").length;
  const total = won + lost;
  return { won, total, rate: total === 0 ? 0 : won / total };
}

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = map.get(k);
    if (arr) arr.push(r);
    else map.set(k, [r]);
  }
  return map;
}

export async function computeDashboardMetrics(
  prisma: PrismaClient,
  user: SessionUser,
  filters: LeadFilters = {},
): Promise<DashboardMetrics> {
  const leads = await prisma.lead.findMany({
    where: leadWhere(user, filters),
    include: { track: true, cohort: true, assignedRep: true },
  });

  const rows: Row[] = leads.map((l) => ({
    stage: l.stage,
    amountPaid: Number(l.amountPaid),
    balanceLeft: Number(l.balanceLeft),
    createdAt: l.createdAt,
    closedAt: l.closedAt,
    trackName: l.track.name,
    cohortName: l.cohort.name,
    source: l.howFoundUs,
    repId: l.assignedRepId,
    repName: l.assignedRep?.name ?? null,
  }));

  const forMetrics: LeadForMetrics[] = rows.map((r) => ({
    stage: r.stage,
    amountPaid: r.amountPaid,
    balanceLeft: r.balanceLeft,
    createdAt: r.createdAt,
    closedAt: r.closedAt,
  }));

  const byTrack = groupBy(rows, (r) => r.trackName);
  const bySource = groupBy(rows, (r) => r.source);
  const byCohort = groupBy(rows, (r) => r.cohortName);
  const byRep = groupBy(
    rows.filter((r) => r.repId),
    (r) => r.repId!,
  );

  const namedCount = (m: Map<string, Row[]>): NamedCount[] =>
    [...m.entries()]
      .map(([label, rs]) => ({ label, count: rs.length }))
      .sort((a, b) => b.count - a.count);

  const namedRate = (m: Map<string, Row[]>): NamedRate[] =>
    [...m.entries()]
      .map(([label, rs]) => {
        const c = conversion(rs);
        return { label, rate: c.rate, won: c.won, total: c.total };
      })
      .sort((a, b) => b.rate - a.rate);

  const closedWon = rows.filter((r) => r.stage === "CLOSED_WON").length;
  const closedLost = rows.filter((r) => r.stage === "CLOSED_LOST").length;

  return {
    totalLeads: rows.length,
    funnel: funnel(forMetrics),
    closeRate: closeRate(forMetrics),
    avgDaysToClose: avgDaysToClose(forMetrics),
    closedWon,
    closedLost,
    openLeads: rows.length - closedWon - closedLost,
    leadsByTrack: namedCount(byTrack),
    leadsBySource: namedCount(bySource),
    leadsByCohort: namedCount(byCohort),
    conversionBySource: namedRate(bySource),
    conversionByTrack: namedRate(byTrack),
    perRep: [...byRep.entries()]
      .map(([repId, rs]) => ({
        repId,
        name: rs[0].repName ?? "Unknown",
        leads: rs.length,
        closeRate: conversion(rs).rate,
        won: rs.filter((r) => r.stage === "CLOSED_WON").length,
        lost: rs.filter((r) => r.stage === "CLOSED_LOST").length,
      }))
      .sort((a, b) => b.won - a.won),
  };
}
