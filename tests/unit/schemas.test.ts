import { describe, it, expect } from "vitest";
import {
  companyContactCreateSchema,
  ingestSchema,
  outreachSendSchema,
} from "@/lib/schemas";

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

describe("outreachSendSchema", () => {
  const valid = {
    subject: "Hi",
    body: "Hello",
    fromName: "LIMITED",
  };

  it("accepts a known sender id", () => {
    expect(outreachSendSchema.safeParse(valid).success).toBe(true);
    expect(
      outreachSendSchema.safeParse({ ...valid, fromName: "OMOLE" }).success,
    ).toBe(true);
  });

  // The value lands in the From header, so a free-form display name would be a
  // header-injection path. Only the enumerated ids are representable.
  it("rejects a free-form display name", () => {
    expect(
      outreachSendSchema.safeParse({
        ...valid,
        fromName: "Evil\r\nBcc: x@y.com",
      }).success,
    ).toBe(false);
  });
});

describe("companyContactCreateSchema", () => {
  it("lower-cases the email and turns blank fields into null", () => {
    const r = companyContactCreateSchema.safeParse({
      email: " HR@XYZ.co ",
      firstName: "   ",
      companyName: " ABC Tech ",
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.email).toBe("hr@xyz.co");
    expect(r.data.firstName).toBeNull();
    expect(r.data.companyName).toBe("ABC Tech");
  });

  it("rejects a bad email", () => {
    expect(
      companyContactCreateSchema.safeParse({ email: "nope" }).success,
    ).toBe(false);
  });
});
