import { describe, it, expect } from "vitest";
import { ingestSchema } from "@/lib/schemas";

const valid = {
  fullName: "Adegbite Ezekiel oluwafemi",
  email: "phemmiechambers@gmail.com",
  phone: "08066509858",
  trackSelected: "Cybersecurity",
  startTimeline: "April 30th Cohort",
  howFoundUs: "instagram",
};

describe("ingestSchema", () => {
  it("accepts a valid payload", () => {
    expect(ingestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing fields", () => {
    const { email: _omit, ...rest } = valid;
    void _omit;
    expect(ingestSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(
      ingestSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("rejects empty trackSelected", () => {
    expect(ingestSchema.safeParse({ ...valid, trackSelected: "" }).success).toBe(
      false,
    );
  });

  it("rejects empty startTimeline", () => {
    expect(
      ingestSchema.safeParse({ ...valid, startTimeline: "" }).success,
    ).toBe(false);
  });
});
