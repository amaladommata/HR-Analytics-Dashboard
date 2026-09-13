import type { Employee, Filters, NoticePeriodRow } from './types';

/** A dimension with no selections matches everything; otherwise the employee's value must be one of the selected values (OR). */
function matchesDimension(selected: string[], value: string | null): boolean {
  return selected.length === 0 || (value !== null && selected.includes(value));
}

export function matchesFilters(e: Employee, filters: Filters): boolean {
  if (!matchesDimension(filters.client, e.client)) return false;
  if (!matchesDimension(filters.country, e.country)) return false;
  if (!matchesDimension(filters.grade, e.grade)) return false;
  if (!matchesDimension(filters.serviceArea, e.serviceArea)) return false;
  if (!matchesDimension(filters.gender, e.gender)) return false;
  if (!matchesDimension(filters.employeeType, e.employeeType)) return false;
  if (!matchesDimension(filters.teamName, e.teamName)) return false;
  if (!matchesDimension(filters.reasonsCategory, e.reasonsCategory)) return false;
  if (!matchesDimension(filters.voluntary, e.voluntary)) return false;
  if (!matchesDimension(filters.deliveryHead, e.deliveryHead)) return false;
  if (!matchesDimension(filters.billingType, e.billingType)) return false;
  return true;
}

/**
 * Notice Period rows don't carry every dimension Employee does (no gender,
 * employee type, reason category, etc.), so this only checks the ones that
 * exist on NoticePeriodRow. Shared by the Notice Period page and the
 * Summary page's "on notice" tile so they never disagree.
 */
export function matchesNoticeFilters(r: NoticePeriodRow, filters: Filters): boolean {
  if (!matchesDimension(filters.client, r.client || null)) return false;
  if (!matchesDimension(filters.grade, r.grade || null)) return false;
  if (!matchesDimension(filters.serviceArea, r.serviceArea || null)) return false;
  if (!matchesDimension(filters.teamName, r.team || null)) return false;
  if (!matchesDimension(filters.deliveryHead, r.deliveryHead || null)) return false;
  return true;
}

export const EMPTY_FILTERS: Filters = {
  client: [],
  country: [],
  grade: [],
  serviceArea: [],
  gender: [],
  employeeType: [],
  teamName: [],
  reasonsCategory: [],
  voluntary: [],
  deliveryHead: [],
  billingType: [],
};

/**
 * Active/inactive status strictly as of date D, per BUILD_SPEC.md section 2.
 * An InActive employee with no matching exit record in Global Exits or
 * Exits-YTD has an unknown exit date and is excluded from as-of-date
 * headcount (flagged separately, see unresolvedCount) — it is never counted
 * as active, so the live "Headcount" tiles match the source Status column
 * for today and reconstruct correctly for past dates using resolved exit
 * dates for everyone else.
 */
export function isActiveAsOf(e: Employee, d: Date): boolean {
  if (!e.doj || e.doj > d) return false;
  if (e.exitUnresolved) return false;
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

/** Count of InActive employees with no matching exit record — excluded from headcount (see isActiveAsOf). */
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

/**
 * Top reasons among exits in [start,end], matching filters. Built from the
 * SAME exit population as exitsInPeriod()/the Exits tile (i.e. keyed off
 * each employee's resolved exit date, not exitsYtd's own LWD column) so the
 * reason bars always sum to the same total the page's "Exits" tile shows.
 * Exits with no Reasons Category on file (common for older Global-Exits-only
 * records; that field only exists in Exits-YTD) are grouped as "Not Categorized".
 */
export function topReasons(
  employees: Employee[],
  periodStart: Date,
  periodEnd: Date,
  filters: Filters = EMPTY_FILTERS,
  limit = 8,
): ReasonCount[] {
  const exits = exitsInPeriod(employees, periodStart, periodEnd, filters);
  const counts = new Map<string, number>();
  for (const e of exits) {
    const key = e.reasonsCategory || 'Not Categorized';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = exits.length || 1;
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

/** top_client_attrition: group by Client (within the active filters), exclude avgHeadcount < minHc (small-base noise), sort desc. */
export function topClientAttrition(
  employees: Employee[],
  periodStart: Date,
  periodEnd: Date,
  filters: Filters = EMPTY_FILTERS,
  limit = 8,
  minHc = 15,
): ClientAttrition[] {
  const clients = new Set(
    employees.filter((e) => matchesFilters(e, filters)).map((e) => e.client).filter((c): c is string => !!c),
  );
  const results: ClientAttrition[] = [];
  for (const client of clients) {
    const clientFilters = { ...filters, client: [client] };
    const avgHc = avgHeadcount(employees, periodStart, periodEnd, clientFilters);
    if (avgHc < minHc) continue;
    const exits = exitsInPeriod(employees, periodStart, periodEnd, clientFilters).length;
    results.push({ client, exits, avgHc, attritionPct: (exits / avgHc) * 100 });
  }
  return results.sort((a, b) => b.attritionPct - a.attritionPct).slice(0, limit);
}

export interface DrillDownGroup {
  dimension: 'PG Rating' | 'Grade' | 'Tenure';
  counts: { key: string; count: number }[];
}

/** Breaks exits matching `reasonsCategory` within [start,end] (same population as topReasons) down by PG Rating, Grade, and Tenure bucket. */
export function reasonDrillDown(
  employees: Employee[],
  reasonsCategory: string,
  periodStart: Date,
  periodEnd: Date,
  filters: Filters = EMPTY_FILTERS,
): DrillDownGroup[] {
  const rows = exitsInPeriod(employees, periodStart, periodEnd, filters).filter(
    (e) => (e.reasonsCategory || 'Not Categorized') === reasonsCategory,
  );
  const groupBy = (pick: (e: Employee) => string | null) => {
    const counts = new Map<string, number>();
    for (const e of rows) {
      const key = pick(e) || 'Not Available';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  };
  return [
    { dimension: 'PG Rating', counts: groupBy((e) => e.pgRating) },
    { dimension: 'Grade', counts: groupBy((e) => e.grade) },
    { dimension: 'Tenure', counts: groupBy((e) => e.tenurity) },
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
