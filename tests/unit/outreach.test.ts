import { describe, it, expect } from "vitest";
import type { CompanyContact } from "@prisma/client";
import {
  contactsToCsv,
  EXPORT_HEADERS,
  outreachVars,
  rowToContact,
} from "@/lib/outreach";
import { blankToNull, senderName } from "@/lib/outreach-constants";
import { parseCsv } from "@/lib/csv";

const bare = (over: Partial<CompanyContact> = {}): CompanyContact =>
  ({
    id: "1",
    email: "hr@xyz.co",
    firstName: null,
    companyName: null,
    jobTitle: null,
    industry: null,
    companySize: null,
    location: null,
    hiringRoles: null,
    hiringSource: null,
    triggerEvent: null,
    personalization: null,
    batchId: null,
    importedAt: new Date("2026-07-31"),
    unsubscribed: false,
    lastEmailedAt: null,
    emailCount: 0,
    createdAt: new Date("2026-07-31"),
    ...over,
  }) as CompanyContact;

describe("blankToNull", () => {
  it("collapses empty and whitespace to null", () => {
    expect(blankToNull("")).toBeNull();
    expect(blankToNull("   ")).toBeNull();
    expect(blankToNull(undefined)).toBeNull();
    expect(blankToNull(null)).toBeNull();
  });

  it("trims a real value", () => {
    expect(blankToNull("  Ada ")).toBe("Ada");
  });
});

describe("outreachVars", () => {
  // Every NULL must arrive as "" so renderTemplate falls through to the
  // template's |fallback instead of leaving a hole in the sentence.
  it("maps an all-null contact to empty strings", () => {
    const vars = outreachVars(bare());
    expect(Object.values(vars).every((v) => v === "")).toBe(true);
  });

  it("maps populated columns onto the snake_case tokens", () => {
    const vars = outreachVars(
      bare({
        firstName: "Sarah",
        companyName: "ABC Tech",
        jobTitle: "HR Manager",
        hiringRoles: "Backend Developer",
        triggerEvent: "raised a seed round",
      }),
    );
    expect(vars.first_name).toBe("Sarah");
    expect(vars.company).toBe("ABC Tech");
    expect(vars.job_title).toBe("HR Manager");
    expect(vars.hiring_role).toBe("Backend Developer");
    expect(vars.trigger).toBe("raised a seed round");
  });
});

describe("rowToContact", () => {
  it("maps common header spellings", () => {
    const [row] = parseCsv("Company,Title,E-mail\nABC Tech,HR Manager,S@ABC.co\n");
    const c = rowToContact(row);
    expect(c).toEqual({
      email: "s@abc.co",
      firstName: null,
      companyName: "ABC Tech",
      jobTitle: "HR Manager",
      industry: null,
      companySize: null,
      location: null,
      hiringRoles: null,
      hiringSource: null,
      triggerEvent: null,
      personalization: null,
    });
  });

  it("accepts a row that only has an email", () => {
    const [row] = parseCsv("Email\nhr@xyz.co\n");
    expect(rowToContact(row)?.email).toBe("hr@xyz.co");
  });

  it("rejects a row with a bad or missing email", () => {
    const [bad, missing] = parseCsv("Email,Company\nnot-an-email,A\n,B\n");
    expect(rowToContact(bad)).toBeNull();
    expect(rowToContact(missing)).toBeNull();
  });
});

describe("contactsToCsv", () => {
  it("exports a half-empty contact with every column present", () => {
    const csv = contactsToCsv([bare()]);
    const [header, row] = csv.trim().split("\r\n");
    expect(header.split(",")).toHaveLength(EXPORT_HEADERS.length);
    expect(row.split(",")).toHaveLength(EXPORT_HEADERS.length);
    expect(row).toContain("hr@xyz.co");
  });

  it("re-imports its own output", () => {
    const csv = contactsToCsv([
      bare({ firstName: "Sarah", companyName: "ABC, Inc" }),
    ]);
    const [row] = parseCsv(csv);
    expect(rowToContact(row)).toMatchObject({
      email: "hr@xyz.co",
      firstName: "Sarah",
      companyName: "ABC, Inc",
    });
  });
});

describe("senderName", () => {
  it("resolves each identity id", () => {
    expect(senderName("ACADEMY")).toBe("JobMingle Academy");
    expect(senderName("LIMITED")).toBe("JobMingle Limited");
    expect(senderName("OMOLE")).toBe("Omole");
  });
});
