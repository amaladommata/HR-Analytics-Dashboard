import type { DrillDownGroup } from '../lib/calc';

export function DrillDownPanel({ title, groups }: { title: string; groups: DrillDownGroup[] }) {
  return (
    <div className="rounded-lg border border-teal-300 bg-teal-50/50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-teal-900">{title} — breakdown</h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {groups.map((g) => {
          const total = g.counts.reduce((s, c) => s + c.count, 0) || 1;
          return (
            <div key={g.dimension}>
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                By {g.dimension}
              </h5>
              <div className="flex flex-col gap-1.5">
                {g.counts.slice(0, 6).map((c) => (
                  <div key={c.key} className="flex items-center gap-2 text-xs">
                    <span className="w-16 truncate text-gray-600" title={c.key}>
                      {c.key}
                    </span>
                    <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-teal-500"
                        style={{ width: `${(c.count / total) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-gray-700">{c.count}</span>
                  </div>
                ))}
                {g.counts.length === 0 && <p className="text-xs text-gray-400">No data</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
