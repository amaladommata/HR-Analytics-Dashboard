import type { Employee, Filters } from '../lib/types';
import { EMPTY_FILTERS, headcount, matchesFilters } from '../lib/calc';

const NON_FILTERABLE = new Set(['Unmapped', 'Unknown', 'Not Available', '']);

interface BreakdownTableProps {
  title: string;
  employees: Employee[];
  dimension: (e: Employee) => string;
  asOf: Date;
  filters: Filters;
  limit?: number;
  /** 'headcount' (default) counts only employees active as of `asOf`; 'count' counts every matching row (e.g. a list of exits). */
  mode?: 'headcount' | 'count';
  /**
   * When set, clicking a row toggles that value as a real, dashboard-wide
   * filter (cross-filtering, like clicking a mark in Looker/Tableau) rather
   * than a local selection. Requires `onFilterToggle`.
   */
  filterKey?: keyof Filters;
  onFilterToggle?: (key: keyof Filters, value: string) => void;
  /** Local-only selection (informational drill-down), used instead of filterKey when the dimension isn't a real filter (e.g. PG Rating). */
  onRowClick?: (key: string) => void;
  selectedKey?: string | null;
}

export function BreakdownTable({
  title,
  employees,
  dimension,
  asOf,
  filters,
  limit = 10,
  mode = 'headcount',
  filterKey,
  onFilterToggle,
  onRowClick,
  selectedKey,
}: BreakdownTableProps) {
  const matched = employees.filter((e) => matchesFilters(e, filters));
  const total = mode === 'headcount' ? headcount(employees, asOf, filters) : matched.length;

  const byKey = new Map<string, Employee[]>();
  for (const e of matched) {
    const key = dimension(e) || 'Unknown';
    const arr = byKey.get(key) ?? [];
    arr.push(e);
    byKey.set(key, arr);
  }

  const rows = [...byKey.entries()]
    .map(([key, group]) => ({
      key,
      count: mode === 'headcount' ? headcount(group, asOf, EMPTY_FILTERS) : group.length,
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  const isSelected = (key: string) =>
    filterKey ? filters[filterKey] === key : selectedKey === key;
  const isClickable = (key: string) =>
    filterKey ? !NON_FILTERABLE.has(key) : Boolean(onRowClick);

  const handleClick = (key: string) => {
    if (filterKey && onFilterToggle) {
      if (NON_FILTERABLE.has(key)) return;
      onFilterToggle(filterKey, key);
      return;
    }
    onRowClick?.(key);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div
            key={r.key}
            onClick={() => handleClick(r.key)}
            className={`flex items-center gap-2 rounded text-sm ${
              isClickable(r.key) ? 'cursor-pointer px-1 py-0.5 hover:bg-teal-50' : ''
            } ${isSelected(r.key) ? 'bg-teal-50 ring-1 ring-teal-300' : ''}`}
            title={isClickable(r.key) ? `Filter to ${r.key}` : undefined}
          >
            <span className="w-32 truncate text-slate-600" title={r.key}>
              {r.key}
            </span>
            <div className="h-2 flex-1 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-teal-600"
                style={{ width: `${total ? (r.count / total) * 100 : 0}%` }}
              />
            </div>
            <span className="w-16 text-right text-slate-700">{r.count.toLocaleString()}</span>
            <span className="w-12 text-right text-xs text-slate-400">
              {total ? ((r.count / total) * 100).toFixed(0) : 0}%
            </span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-400">No data</p>}
      </div>
    </div>
  );
}
