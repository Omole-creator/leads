import { describe, it, expect } from "vitest";
import { welcomePlanAmounts, isUndecidedTrack } from "@/lib/email";

describe("welcomePlanAmounts — welcome-email payment plans", () => {
  it("splits a ₦150,000 track cleanly", () => {
    expect(welcomePlanAmounts(150000)).toEqual({
      once: 150000,
      twice: 75000,
      thrice: 50000, // 150000 / 3 = 50000 exactly
    });
  });

  it("rounds the 3-installment figure up to ₦120,000 for a ₦350,000 track", () => {
    expect(welcomePlanAmounts(350000)).toEqual({
      once: 350000,
      twice: 175000,
      thrice: 120000, // 116,666.67 rounded up to the nearest ₦10,000
    });
  });
});

describe("isUndecidedTrack — skip leads who haven't chosen a program", () => {
  it("flags 'I'm not sure yet' and 'Undecided' (any case)", () => {
    expect(isUndecidedTrack("I'm not sure yet")).toBe(true);
    expect(isUndecidedTrack("Undecided")).toBe(true);
    expect(isUndecidedTrack("UNDECIDED")).toBe(true);
  });

  it("does not flag real program tracks", () => {
    expect(isUndecidedTrack("Cybersecurity")).toBe(false);
    expect(isUndecidedTrack("AI Engineering")).toBe(false);
    expect(isUndecidedTrack("Data Analysis")).toBe(false);
  });
});
