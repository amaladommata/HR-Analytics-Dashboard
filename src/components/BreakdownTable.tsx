import type { Employee, Filters } from '../lib/types';
import { EMPTY_FILTERS, headcount, matchesFilters } from '../lib/calc';

interface BreakdownTableProps {
  title: string;
  employees: Employee[];
  dimension: (e: Employee) => string;
  asOf: Date;
  filters: Filters;
  limit?: number;
  /** 'headcount' (default) counts only employees active as of `asOf`; 'count' counts every matching row (e.g. a list of exits). */
  mode?: 'headcount' | 'count';
}

export function BreakdownTable({
  title,
  employees,
  dimension,
  asOf,
  filters,
  limit = 10,
  mode = 'headcount',
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

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2 text-sm">
            <span className="w-32 truncate text-gray-600" title={r.key}>
              {r.key}
            </span>
            <div className="h-2 flex-1 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-indigo-500"
                style={{ width: `${total ? (r.count / total) * 100 : 0}%` }}
              />
            </div>
            <span className="w-16 text-right text-gray-700">{r.count}</span>
            <span className="w-12 text-right text-xs text-gray-400">
              {total ? ((r.count / total) * 100).toFixed(0) : 0}%
            </span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-gray-400">No data</p>}
      </div>
    </div>
  );
}
