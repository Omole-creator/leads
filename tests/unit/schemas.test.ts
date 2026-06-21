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

  it("accepts blank optional fields (source, phone, timeline)", () => {
    const r = ingestSchema.safeParse({
      ...valid,
      startTimeline: "",
      howFoundUs: "",
      phone: "",
    });
    expect(r.success).toBe(true);
  });

  it("accepts a payload with optional fields omitted entirely", () => {
    expect(
      ingestSchema.safeParse({
        fullName: "Jane",
        email: "jane@example.com",
        trackSelected: "Cybersecurity",
      }).success,
    ).toBe(true);
  });
});
