import { describe, it, expect } from "vitest";
import {
  closeRate,
  totalRevenue,
  outstandingBalance,
  avgDaysToClose,
  funnel,
  type LeadForMetrics,
} from "@/lib/metrics";

const lead = (over: Partial<LeadForMetrics>): LeadForMetrics => ({
  stage: "NEW",
  amountPaid: 0,
  balanceLeft: 0,
  createdAt: new Date("2026-01-01"),
  closedAt: null,
  ...over,
});

describe("closeRate", () => {
  it("is 0 when no closed leads", () => {
    expect(closeRate([lead({ stage: "NEW" }), lead({ stage: "CALLED" })])).toBe(0);
  });

  it("handles 0/0 without divide-by-zero", () => {
    expect(closeRate([])).toBe(0);
  });

  it("is 0.5 for 1 won, 1 lost", () => {
    expect(
      closeRate([lead({ stage: "CLOSED_WON" }), lead({ stage: "CLOSED_LOST" })]),
    ).toBe(0.5);
  });

  it("ignores leads in non-closed stages", () => {
    expect(
      closeRate([
        lead({ stage: "CLOSED_WON" }),
        lead({ stage: "CLOSED_LOST" }),
        lead({ stage: "NEW" }),
        lead({ stage: "SILENT" }),
      ]),
    ).toBe(0.5);
  });
});

describe("totalRevenue", () => {
  it("sums amountPaid across all leads", () => {
    expect(
      totalRevenue([lead({ amountPaid: 100 }), lead({ amountPaid: 250 })]),
    ).toBe(350);
  });
});

describe("outstandingBalance", () => {
  it("excludes CLOSED_LOST", () => {
    expect(
      outstandingBalance([
        lead({ stage: "CALLED", balanceLeft: 100 }),
        lead({ stage: "CLOSED_LOST", balanceLeft: 999 }),
        lead({ stage: "CLOSED_WON", balanceLeft: 50 }),
      ]),
    ).toBe(150);
  });
});

describe("avgDaysToClose", () => {
  it("is 0 when no won leads", () => {
    expect(avgDaysToClose([lead({ stage: "CLOSED_LOST" })])).toBe(0);
  });

  it("computes correctly for known dates", () => {
    expect(
      avgDaysToClose([
        lead({
          stage: "CLOSED_WON",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          closedAt: new Date("2026-01-11T00:00:00Z"),
        }),
        lead({
          stage: "CLOSED_WON",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          closedAt: new Date("2026-01-05T00:00:00Z"),
        }),
      ]),
    ).toBe(7); // (10 + 4) / 2
  });
});

describe("funnel", () => {
  it("returns all stages even with zero counts", () => {
    const f = funnel([lead({ stage: "NEW" })]);
    expect(f).toEqual({
      NEW: 1,
      CALLED: 0,
      CLOSED_WON: 0,
      CLOSED_LOST: 0,
      NO_ANSWER: 0,
      SILENT: 0,
    });
  });
});
