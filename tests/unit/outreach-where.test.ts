import { describe, it, expect } from "vitest";
import { outreachWhere, endOfDay, toOutreachFilters } from "@/lib/outreach";

describe("outreachWhere — requirement tick-boxes", () => {
  it("turns each requirement into a not-null clause", () => {
    const w = outreachWhere({ require: ["firstName", "hiringRoles"] });
    expect(w.AND).toEqual([
      { firstName: { not: null } },
      { hiringRoles: { not: null } },
    ]);
  });

  it("adds no AND key when nothing is required", () => {
    expect(outreachWhere({}).AND).toBeUndefined();
  });
});

describe("outreachWhere — unsubscribed", () => {
  it("excludes unsubscribed contacts by default", () => {
    expect(outreachWhere({}).unsubscribed).toBe(false);
  });

  it("drops the filter when the admin asks to see them", () => {
    expect(outreachWhere({ includeUnsubscribed: true }).unsubscribed).toBeUndefined();
  });
});

describe("outreachWhere — batches and dates", () => {
  it('maps the "none" batch to a null batchId', () => {
    expect(outreachWhere({ batchId: "none" }).batchId).toBeNull();
  });

  it("passes a real batch id straight through", () => {
    expect(outreachWhere({ batchId: "abc" }).batchId).toBe("abc");
  });

  it("builds gte/lte from the added-date range", () => {
    const from = new Date("2026-07-01");
    const to = new Date("2026-07-31");
    expect(outreachWhere({ addedFrom: from, addedTo: to }).importedAt).toEqual({
      gte: from,
      lte: to,
    });
  });

  it("emits only the bound that was given", () => {
    const to = new Date("2026-07-31");
    expect(outreachWhere({ addedTo: to }).importedAt).toEqual({ lte: to });
  });
});

describe("outreachWhere — facets", () => {
  it("matches industry exactly but job title loosely", () => {
    const w = outreachWhere({ industry: "FinTech", jobTitle: "Head of Talent" });
    expect(w.industry).toBe("FinTech");
    expect(w.jobTitle).toEqual({
      contains: "Head of Talent",
      mode: "insensitive",
    });
  });
});

describe("outreachWhere — explicit id list", () => {
  it("narrows to the ticked rows", () => {
    expect(outreachWhere({ onlyIds: ["a", "b"] }).id).toEqual({ in: ["a", "b"] });
  });
});

describe("date boundary", () => {
  // A plain <input type="date"> value parses to midnight, so using it as `lte`
  // would drop everything imported that same day.
  it("pushes addedTo to the end of the day", () => {
    const f = toOutreachFilters({ addedTo: "2026-07-31" });
    expect(f.addedTo?.toISOString()).toBe("2026-07-31T23:59:59.999Z");
  });

  it("endOfDay does not mutate its argument", () => {
    const d = new Date("2026-07-31T00:00:00.000Z");
    endOfDay(d);
    expect(d.toISOString()).toBe("2026-07-31T00:00:00.000Z");
  });
});
