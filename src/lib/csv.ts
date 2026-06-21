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
