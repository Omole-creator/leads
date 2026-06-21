import { describe, it, expect } from "vitest";
import { commissionForTrackCost, commissionEarned } from "@/lib/commission";

describe("commissionForTrackCost", () => {
  it("₦150,000 program -> ₦10,000", () => {
    expect(commissionForTrackCost(150000)).toBe(10000);
  });
  it("₦280,000 program -> ₦20,000", () => {
    expect(commissionForTrackCost(280000)).toBe(20000);
  });
  it("₦350,000 program -> ₦20,000", () => {
    expect(commissionForTrackCost(350000)).toBe(20000);
  });
});

describe("commissionEarned", () => {
  it("is paid only on a won deal", () => {
    expect(commissionEarned("CLOSED_WON", 350000)).toBe(20000);
    expect(commissionEarned("CLOSED_WON", 150000)).toBe(10000);
  });
  it("is zero for any non-won stage", () => {
    expect(commissionEarned("NEW", 350000)).toBe(0);
    expect(commissionEarned("CLOSED_LOST", 150000)).toBe(0);
    expect(commissionEarned("CALLED", 150000)).toBe(0);
  });
});
