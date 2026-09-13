import { useMemo } from 'react';
import type { DataBundle, Filters } from '../lib/types';
import { attritionPct, exitsInPeriod, headcount } from '../lib/calc';
import { rolling13Months } from '../lib/periods';
import { Tile } from '../components/Tile';
import { TrendChart } from '../components/TrendChart';

export function SummaryPage({ data, filters, asOf }: { data: DataBundle; filters: Filters; asOf: Date }) {
  const { employees, noticePeriod } = data;
  const months = useMemo(() => rolling13Months(asOf), [asOf]);
  const latest = months[months.length - 1];

  const hc = useMemo(() => headcount(employees, latest.end, filters), [employees, latest, filters]);
  const exits = useMemo(() => exitsInPeriod(employees, latest.start, latest.end, filters), [employees, latest, filters]);
  const pct = useMemo(() => attritionPct(employees, latest.start, latest.end, filters), [employees, latest, filters]);

  const joinersTrend = useMemo(
    () =>
      months.map((p) => ({
        label: p.label,
        value: employees.filter((e) => e.doj && e.doj >= p.start && e.doj <= p.end).length,
      })),
    [employees, months],
  );

  const avgHcTrend = useMemo(
    () =>
      months.map((p) => ({
        label: p.label,
        value: (headcount(employees, p.start, filters) + headcount(employees, p.end, filters)) / 2,
      })),
    [employees, months, filters],
  );

  const resignationsTrend = useMemo(
    () =>
      months.map((p) => ({
        label: p.label,
        value: exitsInPeriod(employees, p.start, p.end, filters).length,
      })),
    [employees, months, filters],
  );

  const attritionTrend = useMemo(
    () => months.map((p) => ({ label: p.label, value: attritionPct(employees, p.start, p.end, filters) })),
    [employees, months, filters],
  );

  const onNotice = useMemo(() => noticePeriod.filter((r) => r.lwd && r.lwd > asOf).length, [noticePeriod, asOf]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-800">Summary — {latest.label}</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="Headcount" value={hc.toLocaleString()} />
        <Tile label="Exits (month)" value={exits.length.toLocaleString()} />
        <Tile label="Attrition %" value={`${pct.toFixed(1)}%`} />
        <Tile label="On notice" value={onNotice.toLocaleString()} />
        <Tile
          label="Data gaps"
          value={`${data.unresolvedCount}`}
          sublabel="unresolved exit dates"
          accent="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TrendChart title="Joiners — 13-month rolling" data={joinersTrend} color="#16a34a" />
        <TrendChart title="Average Headcount — 13-month rolling" data={avgHcTrend} color="#6366f1" />
        <TrendChart title="Resignations — 13-month rolling" data={resignationsTrend} color="#0891b2" />
        <TrendChart title="Attrition % — 13-month rolling" data={attritionTrend} color="#e11d48" valueSuffix="%" />
      </div>
    </div>
  );
}
