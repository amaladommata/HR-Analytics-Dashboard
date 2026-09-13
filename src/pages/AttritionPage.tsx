import { useMemo, useState } from 'react';
import type { DataBundle, Filters } from '../lib/types';
import { attritionPct, exitsInPeriod, topClientAttrition, topReasons } from '../lib/calc';
import { currentPeriod, rolling13Months, type Grain } from '../lib/periods';
import { Tile } from '../components/Tile';
import { GrainToggle } from '../components/GrainToggle';
import { TrendChart } from '../components/TrendChart';
import { BreakdownTable } from '../components/BreakdownTable';

export function AttritionPage({ data, filters, asOf }: { data: DataBundle; filters: Filters; asOf: Date }) {
  const { employees, exitsYtd } = data;
  const [grain, setGrain] = useState<Grain>('monthly');

  const period = useMemo(() => currentPeriod(grain, asOf), [grain, asOf]);
  const pct = useMemo(
    () => attritionPct(employees, period.start, period.end, filters),
    [employees, period, filters],
  );
  const exits = useMemo(
    () => exitsInPeriod(employees, period.start, period.end, filters),
    [employees, period, filters],
  );

  const trend = useMemo(
    () =>
      rolling13Months(asOf).map((p) => ({
        label: p.label,
        value: attritionPct(employees, p.start, p.end, filters),
      })),
    [employees, asOf, filters],
  );

  const reasons = useMemo(() => topReasons(exitsYtd, period.start, period.end), [exitsYtd, period]);
  const clientAttrition = useMemo(
    () => topClientAttrition(employees, period.start, period.end),
    [employees, period],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Attrition</h2>
        <GrainToggle value={grain} onChange={setGrain} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label={`${period.label} Attrition %`} value={`${pct.toFixed(1)}%`} />
        <Tile label={`${period.label} Exits`} value={exits.length.toLocaleString()} />
        <Tile
          label="Avg headcount (denominator)"
          value={exits.length && pct ? Math.round((exits.length / pct) * 100).toLocaleString() : '—'}
        />
        <Tile label="As of" value={asOf.toLocaleDateString()} />
      </div>

      <TrendChart title="Attrition % — 13-month rolling" data={trend} color="#e11d48" valueSuffix="%" />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Top exit reasons ({period.label})</h3>
          <div className="flex flex-col gap-2">
            {reasons.map((r) => (
              <div key={r.reason} className="flex items-center gap-2 text-sm">
                <span className="w-40 truncate text-gray-600">{r.reason}</span>
                <div className="h-2 flex-1 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-rose-500" style={{ width: `${r.pct}%` }} />
                </div>
                <span className="w-10 text-right text-gray-700">{r.count}</span>
                <span className="w-12 text-right text-xs text-gray-400">{r.pct.toFixed(0)}%</span>
              </div>
            ))}
            {reasons.length === 0 && <p className="text-sm text-gray-400">No exits in this period</p>}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Top client attrition ({period.label}, min. 15 avg HC)
          </h3>
          <div className="flex flex-col gap-2">
            {clientAttrition.map((c) => (
              <div key={c.client} className="flex items-center gap-2 text-sm">
                <span className="w-32 truncate text-gray-600">{c.client}</span>
                <div className="h-2 flex-1 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-orange-500"
                    style={{ width: `${Math.min(c.attritionPct, 100)}%` }}
                  />
                </div>
                <span className="w-14 text-right text-xs text-gray-400">{c.exits} exits</span>
                <span className="w-12 text-right text-gray-700">{c.attritionPct.toFixed(0)}%</span>
              </div>
            ))}
            {clientAttrition.length === 0 && (
              <p className="text-sm text-gray-400">
                No client meets the 15-avg-headcount threshold, or client mapping (16% team coverage) has no
                match for this period.
              </p>
            )}
          </div>
        </div>
      </div>

      <BreakdownTable
        title={`Exits by Voluntary/Involuntary (${period.label})`}
        employees={exits}
        dimension={(e) => e.voluntary ?? 'Unknown'}
        asOf={period.end}
        filters={filters}
        limit={5}
        mode="count"
      />
    </div>
  );
}
