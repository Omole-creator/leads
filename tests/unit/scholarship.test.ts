import { describe, it, expect } from "vitest";
import { scholarshipOffer } from "@/lib/scholarship";

describe("scholarshipOffer", () => {
  it("Cybersecurity -> ₦280,000 (was ₦350,000), ₦94,000 x3", () => {
    expect(scholarshipOffer("Cybersecurity")).toEqual({
      regular: 350000,
      scholarship: 280000,
      installment: 94000,
    });
  });

  it("AI Engineering -> ₦280,000 (was ₦350,000), ₦94,000 x3", () => {
    expect(scholarshipOffer("AI Engineering")).toEqual({
      regular: 350000,
      scholarship: 280000,
      installment: 94000,
    });
  });

  it("Fullstack Development -> ₦210,000 (was ₦300,000), ₦70,000 x3", () => {
    expect(scholarshipOffer("Fullstack Development")).toEqual({
      regular: 300000,
      scholarship: 210000,
      installment: 70000,
    });
  });

  it("the combined 'Frontend / Backend / Fullstack Development' -> default tier (NOT fullstack)", () => {
    expect(scholarshipOffer("Frontend / Backend / Fullstack Development")).toEqual(
      { regular: 150000, scholarship: 105000, installment: 35000 },
    );
  });

  it("Frontend Development -> default ₦105,000 (was ₦150,000), ₦35,000 x3", () => {
    expect(scholarshipOffer("Frontend Development")).toEqual({
      regular: 150000,
      scholarship: 105000,
      installment: 35000,
    });
  });

  it("Backend Development -> default tier", () => {
    expect(scholarshipOffer("Backend Development").scholarship).toBe(105000);
  });

  it("an unknown track -> default tier", () => {
    expect(scholarshipOffer("Product Management")).toEqual({
      regular: 150000,
      scholarship: 105000,
      installment: 35000,
    });
  });

  it("the legacy seeded 'Frontend/Backend/Fullstack' (₦150k) stays on the default tier (no substring match)", () => {
    expect(scholarshipOffer("Frontend/Backend/Fullstack").scholarship).toBe(
      105000,
    );
  });

  it("matches case-insensitively and trims surrounding whitespace", () => {
    expect(scholarshipOffer("  cybersecurity ").scholarship).toBe(280000);
  });
});
