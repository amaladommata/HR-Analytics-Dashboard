/** Fiscal year runs Apr -> Mar, per BUILD_SPEC.md ("FY26-27 (Apr 2026 -> date)"). */
export function fyStart(d: Date): Date {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(y, 3, 1);
}

export function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function monthEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function quarterStart(d: Date): Date {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
}

export function quarterEnd(d: Date): Date {
  const start = quarterStart(d);
  return new Date(start.getFullYear(), start.getMonth() + 3, 0);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

export function formatMonth(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export interface Period {
  label: string;
  start: Date;
  end: Date;
}

/** 13-month rolling window ending at `asOf` (inclusive of the current month). */
export function rolling13Months(asOf: Date): Period[] {
  const periods: Period[] = [];
  for (let i = 12; i >= 0; i -= 1) {
    const m = addMonths(asOf, -i);
    periods.push({ label: formatMonth(m), start: monthStart(m), end: monthEnd(m) });
  }
  return periods;
}

export type Grain = 'monthly' | 'quarterly' | 'fytd';

export function currentPeriod(grain: Grain, asOf: Date): Period {
  if (grain === 'monthly') return { label: formatMonth(asOf), start: monthStart(asOf), end: monthEnd(asOf) };
  if (grain === 'quarterly') return { label: 'QTD', start: quarterStart(asOf), end: asOf };
  return { label: 'FYTD', start: fyStart(asOf), end: asOf };
}
