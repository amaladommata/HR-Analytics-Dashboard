import Papa from 'papaparse';

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parses dates in whichever format the row actually carries:
 *   - "YYYY-MM-DD" / "YYYY-MM-DD HH:MM:SS" (the CSV export format)
 *   - "DD-Mon-YYYY" / "D-Mon-YY" (a common Google Sheets text/display format,
 *     e.g. "01-Dec-2019" — seen directly in the live sheet)
 *   - "MM/DD/YYYY" (another common spreadsheet format)
 * Returns null for blank/invalid input rather than guessing.
 */
export function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'NA' || trimmed === '#REF!') return null;

  // YYYY-MM-DD (optionally with a time suffix, which is ignored)
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    const [, y, mo, d] = isoMatch;
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // DD-Mon-YYYY or D-Mon-YY, e.g. "01-Dec-2019", "1-Dec-19"
  const monthNameMatch = /^(\d{1,2})-([A-Za-z]{3,})-(\d{2,4})$/.exec(trimmed);
  if (monthNameMatch) {
    const [, d, monRaw, yRaw] = monthNameMatch;
    const month = MONTHS[monRaw.slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    const year = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
    const date = new Date(year, month, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // MM/DD/YYYY
  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (slashMatch) {
    const [, mo, d, y] = slashMatch;
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
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
