import { useMemo, useState } from 'react';
import type { DataBundle, Filters } from '../lib/types';
import { attritionPct, exitsInPeriod, reasonDrillDown, topClientAttrition, topReasons } from '../lib/calc';
import { currentPeriod, rolling13Months, type Grain } from '../lib/periods';
import { Tile } from '../components/Tile';
import { GrainToggle } from '../components/GrainToggle';
import { TrendChart } from '../components/TrendChart';
import { BreakdownTable } from '../components/BreakdownTable';
import { DrillDownPanel } from '../components/DrillDownPanel';

export function AttritionPage({ data, filters, asOf }: { data: DataBundle; filters: Filters; asOf: Date }) {
  const { employees, exitsYtd } = data;
  const [grain, setGrain] = useState<Grain>('monthly');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const period = useMemo(() => currentPeriod(grain, asOf), [grain, asOf]);
  const pct = useMemo(
    () => attritionPct(employees, period.start, period.end, filters),
    [employees, period, filters],
  );
  const exits = useMemo(
    () => exitsInPeriod(employees, period.start, period.end, filters),
    [employees, period, filters],
  );
  const avgHc = useMemo(
    () => (exits.length && pct ? Math.round((exits.length / pct) * 100) : 0),
    [exits, pct],
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

  const drillDown = useMemo(
    () => (selectedReason ? reasonDrillDown(exitsYtd, selectedReason, period.start, period.end) : null),
    [exitsYtd, selectedReason, period],
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
        <Tile label="Avg headcount (denominator)" value={avgHc ? avgHc.toLocaleString() : '—'} />
        <Tile label="Voluntary exits" value={exits.filter((e) => e.voluntary === 'Voluntary').length.toLocaleString()} />
      </div>

      <TrendChart
        title="Attrition % — 13-month rolling"
        data={trend}
        color="#0f766e"
        valueSuffix="%"
        formatValue={(v) => v.toFixed(1)}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Top exit reasons ({period.label})</h3>
            <span className="text-xs text-gray-400">click a reason to break it down</span>
          </div>
          <div className="flex flex-col gap-2">
            {reasons.map((r) => (
              <div
                key={r.reason}
                onClick={() => setSelectedReason(selectedReason === r.reason ? null : r.reason)}
                className={`flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-teal-50 ${
                  selectedReason === r.reason ? 'bg-teal-50 ring-1 ring-teal-300' : ''
                }`}
              >
                <span className="w-40 truncate text-gray-600" title={r.reason}>
                  {r.reason}
                </span>
                <div className="h-2 flex-1 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-teal-600" style={{ width: `${r.pct}%` }} />
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
                No client meets the 15-avg-headcount threshold, or client mapping has no match for this
                period.
              </p>
            )}
          </div>
        </div>
      </div>

      {drillDown && selectedReason && <DrillDownPanel title={selectedReason} groups={drillDown} />}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <BreakdownTable
          title={`Exits by Voluntary/Involuntary (${period.label})`}
          employees={exits}
          dimension={(e) => e.voluntary ?? 'Unknown'}
          asOf={period.end}
          filters={filters}
          limit={5}
          mode="count"
        />
        <BreakdownTable
          title={`Exits by Grade (${period.label})`}
          employees={exits}
          dimension={(e) => e.grade}
          asOf={period.end}
          filters={filters}
          limit={8}
          mode="count"
        />
        <BreakdownTable
          title={`Exits by Service Area (${period.label})`}
          employees={exits}
          dimension={(e) => e.serviceArea}
          asOf={period.end}
          filters={filters}
          limit={8}
          mode="count"
        />
        <BreakdownTable
          title={`Exits by Country (${period.label})`}
          employees={exits}
          dimension={(e) => e.country}
          asOf={period.end}
          filters={filters}
          limit={8}
          mode="count"
        />
        <BreakdownTable
          title={`Exits by Delivery Head (${period.label})`}
          employees={exits}
          dimension={(e) => e.deliveryHead ?? 'Not Available'}
          asOf={period.end}
          filters={filters}
          limit={8}
          mode="count"
        />
        <BreakdownTable
          title={`Exits by Team (${period.label})`}
          employees={exits}
          dimension={(e) => e.teamName}
          asOf={period.end}
          filters={filters}
          limit={8}
          mode="count"
        />
      </div>
    </div>
  );
}
