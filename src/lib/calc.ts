import type { Employee, ExitsYtdRow, Filters } from './types';

export function matchesFilters(e: Employee, filters: Filters): boolean {
  if (filters.client && e.client !== filters.client) return false;
  if (filters.country && e.country !== filters.country) return false;
  if (filters.grade && e.grade !== filters.grade) return false;
  if (filters.serviceArea && e.serviceArea !== filters.serviceArea) return false;
  if (filters.gender && e.gender !== filters.gender) return false;
  if (filters.employeeType && e.employeeType !== filters.employeeType) return false;
  if (filters.teamName && e.teamName !== filters.teamName) return false;
  return true;
}

export const EMPTY_FILTERS: Filters = {
  client: null,
  country: null,
  grade: null,
  serviceArea: null,
  gender: null,
  employeeType: null,
  teamName: null,
};

/**
 * Active/inactive status strictly as of date D, per BUILD_SPEC.md section 2,
 * with a business-rule override: an InActive employee with no matching exit
 * record in Global Exits or Exits-YTD (no LWD, no resignation/confirmed
 * date) is treated as ACTIVE, not excluded. In practice these are withdrawn
 * resignations, reinstated absconding cases, or other InActive tags that
 * never produced a real exit event — there is no evidence they ever left.
 */
export function isActiveAsOf(e: Employee, d: Date): boolean {
  if (!e.doj || e.doj > d) return false;
  if (e.exitUnresolved) return true;
  if (!e.exitDateResolved) return e.status === 'Active';
  return d <= e.exitDateResolved;
}

/** Point-in-time headcount as of date D matching filters. */
export function headcount(employees: Employee[], d: Date, filters: Filters = EMPTY_FILTERS): number {
  let count = 0;
  for (const e of employees) {
    if (!matchesFilters(e, filters)) continue;
    if (isActiveAsOf(e, d)) count += 1;
  }
  return count;
}

/** Count of InActive employees with no matching exit record — now counted as active (see isActiveAsOf). */
export function unresolvedCount(employees: Employee[], filters: Filters = EMPTY_FILTERS): number {
  return employees.filter((e) => matchesFilters(e, filters) && e.exitUnresolved).length;
}

/** avg_headcount(period) = (HC at period start + HC at period end) / 2, per BUILD_SPEC.md section 4. */
export function avgHeadcount(
  employees: Employee[],
  periodStart: Date,
  periodEnd: Date,
  filters: Filters = EMPTY_FILTERS,
): number {
  return (headcount(employees, periodStart, filters) + headcount(employees, periodEnd, filters)) / 2;
}

/** Exits whose exit_date_resolved falls inside [periodStart, periodEnd], matching filters. */
export function exitsInPeriod(
  employees: Employee[],
  periodStart: Date,
  periodEnd: Date,
  filters: Filters = EMPTY_FILTERS,
): Employee[] {
  return employees.filter(
    (e) =>
      matchesFilters(e, filters) &&
      e.exitDateResolved &&
      e.exitDateResolved >= periodStart &&
      e.exitDateResolved <= periodEnd,
  );
}

/** attrition_pct(period, filters) = exits(period) / avg_headcount(period) * 100, per BUILD_SPEC.md section 5. */
export function attritionPct(
  employees: Employee[],
  periodStart: Date,
  periodEnd: Date,
  filters: Filters = EMPTY_FILTERS,
): number {
  const denom = avgHeadcount(employees, periodStart, periodEnd, filters);
  if (denom === 0) return 0;
  return (exitsInPeriod(employees, periodStart, periodEnd, filters).length / denom) * 100;
}

export interface ReasonCount {
  reason: string;
  count: number;
  pct: number;
}

/** Top reasons by "Reasons Category" (exits_ytd_clean), joined on MMID within [start,end]. */
export function topReasons(
  exitsYtd: ExitsYtdRow[],
  periodStart: Date,
  periodEnd: Date,
  limit = 8,
): ReasonCount[] {
  const inPeriod = exitsYtd.filter(
    (r) => r.lwd && r.lwd >= periodStart && r.lwd <= periodEnd && r.reasonsCategory,
  );
  const counts = new Map<string, number>();
  for (const r of inPeriod) counts.set(r.reasonsCategory, (counts.get(r.reasonsCategory) ?? 0) + 1);
  const total = inPeriod.length || 1;
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export interface ClientAttrition {
  client: string;
  exits: number;
  avgHc: number;
  attritionPct: number;
}

/** top_client_attrition: group by Client, exclude avgHeadcount < minHc (small-base noise), sort desc. */
export function topClientAttrition(
  employees: Employee[],
  periodStart: Date,
  periodEnd: Date,
  limit = 8,
  minHc = 15,
): ClientAttrition[] {
  const clients = new Set(employees.map((e) => e.client).filter((c): c is string => !!c));
  const results: ClientAttrition[] = [];
  for (const client of clients) {
    const filters = { ...EMPTY_FILTERS, client };
    const avgHc = avgHeadcount(employees, periodStart, periodEnd, filters);
    if (avgHc < minHc) continue;
    const exits = exitsInPeriod(employees, periodStart, periodEnd, filters).length;
    results.push({ client, exits, avgHc, attritionPct: (exits / avgHc) * 100 });
  }
  return results.sort((a, b) => b.attritionPct - a.attritionPct).slice(0, limit);
}

export interface DrillDownGroup {
  dimension: 'PG Rating' | 'Grade' | 'Tenure';
  counts: { key: string; count: number }[];
}

/** Breaks exits matching `reasonsCategory` within [start,end] down by PG Rating, Grade, and Tenure bucket. */
export function reasonDrillDown(
  exitsYtd: ExitsYtdRow[],
  reasonsCategory: string,
  periodStart: Date,
  periodEnd: Date,
): DrillDownGroup[] {
  const rows = exitsYtd.filter(
    (r) =>
      r.reasonsCategory === reasonsCategory &&
      r.lwd &&
      r.lwd >= periodStart &&
      r.lwd <= periodEnd,
  );
  const groupBy = (pick: (r: ExitsYtdRow) => string) => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = pick(r) || 'Not Available';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  };
  return [
    { dimension: 'PG Rating', counts: groupBy((r) => r.pgRating) },
    { dimension: 'Grade', counts: groupBy((r) => r.grade) },
    { dimension: 'Tenure', counts: groupBy((r) => r.tenurity) },
  ];
}

export function distinctValues(employees: Employee[], key: keyof Employee): string[] {
  const values = new Set<string>();
  for (const e of employees) {
    const v = e[key];
    if (typeof v === 'string' && v) values.add(v);
  }
  return [...values].sort();
}
