import Papa from 'papaparse';

/** Parses "YYYY-MM-DD ..." / "YYYY-MM-DD" strings as local dates. Returns null for blank/invalid input. */
export function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'NA' || trimmed === '#REF!') return null;
  const datePart = trimmed.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function cleanStr(value: string | undefined | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  return trimmed === 'NA' || trimmed === '#REF!' ? '' : trimmed;
}

export function parseCsv<T extends Record<string, string>>(raw: string): T[] {
  const result = Papa.parse<T>(raw, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data;
}
