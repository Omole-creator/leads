import { describe, it, expect } from "vitest";
import {
  certificateCourseTitle,
  certificateIndustry,
  certificateStatement,
  certificateDefaults,
  certificateFileName,
  formatIssueDate,
} from "@/lib/certificate";
import { TRACKS } from "../../prisma/tracks.data";

describe("certificateCourseTitle", () => {
  it("uppercases the track name and appends COURSE", () => {
    expect(certificateCourseTitle("Product Design")).toBe("PRODUCT DESIGN COURSE");
  });

  it("does not double up when the name already ends in Course", () => {
    expect(certificateCourseTitle("Data Analysis Course")).toBe(
      "DATA ANALYSIS COURSE",
    );
  });

  it("trims and collapses stray whitespace (legacy track names)", () => {
    expect(certificateCourseTitle("  Backend   Development ")).toBe(
      "BACKEND DEVELOPMENT COURSE",
    );
  });

  it("survives an empty track name", () => {
    expect(certificateCourseTitle("   ")).toBe("COURSE");
  });
});

describe("certificateIndustry", () => {
  it("maps Product Design to the product (UI/UX) design industry", () => {
    expect(certificateIndustry("Product Design")).toBe("product (UI/UX) design");
  });

  it("keeps acronym casing", () => {
    expect(certificateIndustry("AI Engineering")).toBe("AI engineering");
    expect(certificateIndustry("Cloud/DevOps Engineering")).toBe(
      "cloud and DevOps engineering",
    );
  });

  it("treats the combined track as software development", () => {
    expect(certificateIndustry("Frontend/Backend/Fullstack")).toBe(
      "software development",
    );
  });

  it("falls back to the lower-cased name for auto-created tracks", () => {
    expect(certificateIndustry("Technical Writing")).toBe("technical writing");
    expect(certificateIndustry("Technical Writing Course")).toBe(
      "technical writing",
    );
  });

  it("never returns an empty phrase", () => {
    expect(certificateIndustry("  ")).toBe("technology");
  });

  it("resolves a non-empty phrase for every seeded track", () => {
    for (const t of TRACKS) {
      expect(certificateIndustry(t.name).length).toBeGreaterThan(0);
    }
  });
});

describe("certificateStatement", () => {
  it("fills the industry placeholder", () => {
    expect(certificateStatement("product (UI/UX) design")).toBe(
      "This achievement demonstrates a dedication to developing the skills, knowledge, and practical expertise required to make meaningful contributions to the product (UI/UX) design industry.",
    );
  });
});

describe("formatIssueDate", () => {
  it("formats as DAY MONTH, YEAR", () => {
    expect(formatIssueDate(new Date(2026, 6, 29))).toBe("29 JULY, 2026");
    expect(formatIssueDate(new Date(2024, 10, 20))).toBe("20 NOVEMBER, 2024");
  });
});

describe("certificateDefaults", () => {
  it("prefills every field from the student and track", () => {
    expect(
      certificateDefaults(" Ada Obi ", "Product Design", new Date(2026, 6, 29)),
    ).toEqual({
      name: "Ada Obi",
      course: "PRODUCT DESIGN COURSE",
      issuedOn: "29 JULY, 2026",
      industry: "product (UI/UX) design",
    });
  });
});

describe("certificateFileName", () => {
  it("slugifies the recipient name", () => {
    expect(certificateFileName("Ada Obi")).toBe("JobMingle-Certificate-Ada-Obi");
  });

  it("strips punctuation and falls back when empty", () => {
    expect(certificateFileName("O'Neil, Ada")).toBe(
      "JobMingle-Certificate-O-Neil-Ada",
    );
    expect(certificateFileName("!!!")).toBe("JobMingle-Certificate-Student");
  });
});
