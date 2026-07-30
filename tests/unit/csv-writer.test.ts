import { describe, it, expect } from "vitest";
import { csvCell, toCsv, parseCsv } from "@/lib/csv";

describe("csvCell", () => {
  it("leaves a plain cell unquoted", () => {
    expect(csvCell("ABC Tech")).toBe("ABC Tech");
  });

  it("quotes commas, quotes, newlines and CR", () => {
    expect(csvCell("Lagos, Nigeria")).toBe('"Lagos, Nigeria"');
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("line1\rline2")).toBe('"line1\rline2"');
  });

  it("quotes edge whitespace a reader would otherwise eat", () => {
    expect(csvCell(" padded ")).toBe('" padded "');
  });

  it("turns null and undefined into an empty cell", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
});

describe("toCsv", () => {
  const headers = ["First Name", "Company", "Email"];

  it("writes the header row in the given order", () => {
    expect(toCsv(headers, []).split("\r\n")[0]).toBe("First Name,Company,Email");
  });

  // The whole point of the export: a contact we only have an email for must
  // still produce a full-width row, so it can be edited and re-imported.
  it("emits every header for every row, blank where the value is missing", () => {
    const csv = toCsv(headers, [{ Email: "a@b.co" }]);
    expect(csv.split("\r\n")[1]).toBe(",,a@b.co");
  });

  it("uses CRLF line endings", () => {
    expect(toCsv(headers, [{ Email: "a@b.co" }])).toBe(
      "First Name,Company,Email\r\n,,a@b.co\r\n",
    );
  });

  it("round-trips back through parseCsv", () => {
    const rows = [
      { "First Name": "Sarah", Company: "ABC, Inc", Email: "s@abc.co" },
      { "First Name": null, Company: null, Email: "hr@xyz.co" },
    ];
    const parsed = parseCsv(toCsv(headers, rows));
    expect(parsed).toHaveLength(2);
    expect(parsed[0]["first name"]).toBe("Sarah");
    expect(parsed[0]["company"]).toBe("ABC, Inc");
    expect(parsed[1]["email"]).toBe("hr@xyz.co");
    expect(parsed[1]["company"]).toBe("");
  });
});
