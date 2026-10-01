import Papa from "papaparse";

export interface ParsedVoter {
  email: string;
  name: string;
}

const EMAIL_RE = /[A-Z0-9._%+'-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function parsePastedList(text: string): ParsedVoter[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(EMAIL_RE);
      if (!match) return { email: line, name: "" };
      const name = line
        .replace(match[0], "")
        .replace(/[<>"(),;\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return { email: match[0].toLowerCase(), name };
    });
}

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsv(text: string): CsvParseResult {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return { headers: (result.meta.fields ?? []).filter(Boolean), rows: result.data };
}

export interface ColumnMapping {
  email: string;
  name: string;
  firstName: string;
  lastName: string;
}

export function guessMapping(headers: string[]): ColumnMapping {
  const find = (...patterns: RegExp[]) => headers.find((h) => patterns.some((p) => p.test(h))) ?? "";
  return {
    email: find(/^e-?mail/i, /email/i),
    name: find(/^(full\s*)?name$/i, /^voter\s*name$/i),
    firstName: find(/^first/i, /^given/i, /^fore/i),
    lastName: find(/^last/i, /^sur/i, /^family/i),
  };
}

export function applyMapping(rows: Record<string, string>[], mapping: ColumnMapping): ParsedVoter[] {
  return rows.map((row) => {
    const email = (row[mapping.email] ?? "").trim();
    const name = mapping.name
      ? (row[mapping.name] ?? "").trim()
      : [row[mapping.firstName], row[mapping.lastName]].map((v) => (v ?? "").trim()).filter(Boolean).join(" ");
    return { email, name };
  });
}

export function toCsv(rows: (string | number)[][]): string {
  return Papa.unparse(rows);
}

export function downloadFile(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
