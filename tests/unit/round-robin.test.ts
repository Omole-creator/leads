import { describe, it, expect } from "vitest";
import { pickNextRep, type ActiveRep } from "@/lib/round-robin";

const d = (iso: string) => new Date(iso);

describe("pickNextRep", () => {
  it("returns null when no reps", () => {
    expect(pickNextRep([])).toBeNull();
  });

  it("returns the sole rep when one rep", () => {
    expect(pickNextRep([{ id: "a", lastAssignedAt: d("2026-01-01") }])).toBe("a");
  });

  it("returns a never-assigned rep over a previously-assigned one", () => {
    const reps: ActiveRep[] = [
      { id: "a", lastAssignedAt: d("2026-01-01") },
      { id: "b", lastAssignedAt: null },
    ];
    expect(pickNextRep(reps)).toBe("b");
  });

  it("when all assigned, returns the one with the oldest lastAssignedAt", () => {
    const reps: ActiveRep[] = [
      { id: "a", lastAssignedAt: d("2026-03-01") },
      { id: "b", lastAssignedAt: d("2026-01-01") },
      { id: "c", lastAssignedAt: d("2026-02-01") },
    ];
    expect(pickNextRep(reps)).toBe("b");
  });

  it("ties: returns the first never-assigned by stable input order", () => {
    const reps: ActiveRep[] = [
      { id: "a", lastAssignedAt: null },
      { id: "b", lastAssignedAt: null },
    ];
    expect(pickNextRep(reps)).toBe("a");
  });

  it("ignores inactive reps (caller filters): input contract", () => {
    // Caller passes only active reps; given only active inputs it must choose
    // among them and never invent an id outside the set.
    const reps: ActiveRep[] = [{ id: "active", lastAssignedAt: d("2026-01-01") }];
    expect(pickNextRep(reps)).toBe("active");
  });

  it("chain of 6 leads / 3 reps distributes 2 each", () => {
    const reps: ActiveRep[] = [
      { id: "a", lastAssignedAt: null },
      { id: "b", lastAssignedAt: null },
      { id: "c", lastAssignedAt: null },
    ];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    let clock = d("2026-01-01T00:00:00Z").getTime();
    for (let i = 0; i < 6; i++) {
      const picked = pickNextRep(reps)!;
      counts[picked]++;
      const rep = reps.find((r) => r.id === picked)!;
      rep.lastAssignedAt = new Date((clock += 1000));
    }
    expect(counts).toEqual({ a: 2, b: 2, c: 2 });
  });
});
