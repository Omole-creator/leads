import { describe, it, expect } from "vitest";
import { leadWhere } from "@/lib/leads";
import type { SessionUser } from "@/lib/permissions";

const admin: SessionUser = { id: "admin-1", role: "ADMIN" };
const rep: SessionUser = { id: "rep-1", role: "SALES_REP" };

describe("leadWhere — excludeWon (bulk-email recipient scoping)", () => {
  it("drops CLOSED_WON when excludeWon is set and no stage chosen", () => {
    expect(leadWhere(admin, { excludeWon: true }).stage).toEqual({
      not: "CLOSED_WON",
    });
  });

  it("matches nothing when excludeWon targets the CLOSED_WON stage", () => {
    expect(leadWhere(admin, { excludeWon: true, stage: "CLOSED_WON" }).stage).toEqual(
      { in: [] },
    );
  });

  it("honors a non-won stage filter unchanged under excludeWon", () => {
    expect(leadWhere(admin, { excludeWon: true, stage: "NEW" }).stage).toBe("NEW");
  });

  it("applies no stage condition for the plain list path (won stays visible)", () => {
    expect(leadWhere(admin, {}).stage).toBeUndefined();
  });

  it("still scopes reps to their own leads alongside excludeWon", () => {
    const where = leadWhere(rep, { excludeWon: true });
    expect(where.assignedRepId).toBe("rep-1");
    expect(where.stage).toEqual({ not: "CLOSED_WON" });
  });
});

describe("leadWhere — excludeScholarship (skip scholarship on general blasts)", () => {
  it("excludes any Scholarship* segment, case-insensitively", () => {
    expect(leadWhere(admin, { excludeScholarship: true }).NOT).toEqual({
      segment: { contains: "scholarship", mode: "insensitive" },
    });
  });

  it("adds no NOT clause when the flag is off", () => {
    expect(leadWhere(admin, {}).NOT).toBeUndefined();
  });

  it("combines with a cohort filter (cohort AND not-scholarship)", () => {
    const where = leadWhere(admin, {
      cohortId: "july",
      excludeScholarship: true,
    });
    expect(where.cohortId).toBe("july");
    expect(where.NOT).toEqual({
      segment: { contains: "scholarship", mode: "insensitive" },
    });
  });
});
