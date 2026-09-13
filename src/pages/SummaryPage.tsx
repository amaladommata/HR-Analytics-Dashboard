import { useMemo } from 'react';
import { Users, TrendingDown, CalendarClock, AlertTriangle, UserMinus } from 'lucide-react';
import type { DataBundle, Filters } from '../lib/types';
import { attritionPct, exitsInPeriod, headcount, matchesFilters, matchesNoticeFilters } from '../lib/calc';
import { rolling13Months } from '../lib/periods';
import { Tile } from '../components/Tile';
import { TrendChart } from '../components/TrendChart';
import type { Tab } from '../components/TopNav';

interface SummaryPageProps {
  data: DataBundle;
  filters: Filters;
  asOf: Date;
  onNavigate: (tab: Tab) => void;
}

export function SummaryPage({ data, filters, asOf, onNavigate }: SummaryPageProps) {
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
        value: employees.filter(
          (e) => matchesFilters(e, filters) && e.doj && e.doj >= p.start && e.doj <= p.end,
        ).length,
      })),
    [employees, months, filters],
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

  const onNotice = useMemo(
    () => noticePeriod.filter((r) => r.lwd && r.lwd > asOf && matchesNoticeFilters(r, filters)).length,
    [noticePeriod, asOf, filters],
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="-mt-1 text-sm text-slate-500">As of {latest.label}. Click a tile to jump to that view.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="Headcount" value={hc.toLocaleString()} icon={Users} onClick={() => onNavigate('headcount')} />
        <Tile
          label="Exits (month)"
          value={exits.length.toLocaleString()}
          icon={UserMinus}
          onClick={() => onNavigate('attrition')}
        />
        <Tile
          label="Attrition %"
          value={`${pct.toFixed(1)}%`}
          icon={TrendingDown}
          accent="bad"
          onClick={() => onNavigate('attrition')}
        />
        <Tile
          label="On notice"
          value={onNotice.toLocaleString()}
          icon={CalendarClock}
          onClick={() => onNavigate('notice')}
        />
        <Tile
          label="No exit record"
          value={`${data.unresolvedCount}`}
          sublabel="InActive tag, excluded from HC"
          accent="warning"
          icon={AlertTriangle}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TrendChart title="Joiners — 13-month rolling" data={joinersTrend} color="#16a34a" />
        <TrendChart title="Average Headcount — 13-month rolling" data={avgHcTrend} color="#0f766e" />
        <TrendChart title="Exits — 13-month rolling" data={resignationsTrend} color="#0891b2" />
        <TrendChart
          title="Attrition % — 13-month rolling"
          data={attritionTrend}
          color="#e11d48"
          valueSuffix="%"
          formatValue={(v) => v.toFixed(1)}
        />
      </div>
    </div>
  );
}
