// Minimal RFC4180-ish CSV parser: handles quoted fields, escaped quotes ("")
// embedded commas and newlines, and CRLF. Returns rows of cells.
export function splitCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Parse CSV text into objects keyed by lower-cased header names. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = splitCsvRows(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
}

/** First non-empty value among the given header aliases. */
export function field(row: Record<string, string>, aliases: string[]): string {
  for (const a of aliases) {
    const v = row[a.toLowerCase()];
    if (v) return v;
  }
  return "";
}

/**
 * Quote one cell for output. A cell needs quoting when it contains a comma, a
 * double quote, a newline/CR, or leading/trailing whitespace a reader would
 * otherwise eat. Inner quotes are doubled, per RFC4180.
 */
export function csvCell(value: string | null | undefined): string {
  const s = value ?? "";
  return /[",\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Serialize rows to CSV against a fixed header order. Every header is emitted
 * for every row and a missing value becomes an empty cell, so a half-filled
 * record still round-trips out and back in through parseCsv().
 * CRLF line endings, which is what RFC4180 and Excel expect.
 */
export function toCsv(
  headers: string[],
  rows: Record<string, string | null | undefined>[],
): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}
