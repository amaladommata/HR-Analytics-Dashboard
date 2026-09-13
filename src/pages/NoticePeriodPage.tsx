import { useMemo, useState } from 'react';
import type { DataBundle, Filters, GlobalExitRow } from '../lib/types';
import { currentPeriod, rolling13Months, type Grain } from '../lib/periods';
import { Tile } from '../components/Tile';
import { GrainToggle } from '../components/GrainToggle';
import { TrendChart } from '../components/TrendChart';

function matchesNoticeFilters(r: DataBundle['noticePeriod'][number], filters: Filters): boolean {
  if (filters.client.length && !filters.client.includes(r.client)) return false;
  if (filters.grade.length && !filters.grade.includes(r.grade)) return false;
  if (filters.serviceArea.length && !filters.serviceArea.includes(r.serviceArea)) return false;
  if (filters.teamName.length && !filters.teamName.includes(r.team)) return false;
  return true;
}

interface Resignation {
  mmid: string;
  date: Date;
  grade: string;
  serviceArea: string;
}

/** Historical resignation events, deduped by MMID, preferring Global Exits' Date of Resignation (all-time) with Exits-YTD as fallback (richer for the current FY). */
function buildResignationHistory(
  globalExits: GlobalExitRow[],
  exitsYtd: DataBundle['exitsYtd'],
): Resignation[] {
  const byMmid = new Map<string, Resignation>();
  for (const r of globalExits) {
    if (r.dateOfResignation) {
      byMmid.set(r.mmid, { mmid: r.mmid, date: r.dateOfResignation, grade: r.grade, serviceArea: r.serviceArea });
    }
  }
  for (const r of exitsYtd) {
    if (!byMmid.has(r.mmid) && r.resignationDate) {
      byMmid.set(r.mmid, { mmid: r.mmid, date: r.resignationDate, grade: r.grade, serviceArea: r.serviceArea });
    }
  }
  return [...byMmid.values()];
}

interface NoticePeriodPageProps {
  data: DataBundle;
  filters: Filters;
  asOf: Date;
  onFilterToggle: (key: keyof Filters, value: string) => void;
}

export function NoticePeriodPage({ data, filters, asOf, onFilterToggle }: NoticePeriodPageProps) {
  const { noticePeriod, globalExits, exitsYtd } = data;
  const [grain, setGrain] = useState<Grain>('monthly');

  const period = useMemo(() => currentPeriod(grain, asOf), [grain, asOf]);
  const filtered = useMemo(
    () => noticePeriod.filter((r) => matchesNoticeFilters(r, filters)),
    [noticePeriod, filters],
  );

  const resignationHistory = useMemo(
    () => buildResignationHistory(globalExits, exitsYtd),
    [globalExits, exitsYtd],
  );

  const resignationsInPeriod = useMemo(
    () => resignationHistory.filter((r) => r.date >= period.start && r.date <= period.end).length,
    [resignationHistory, period],
  );

  const onNotice = useMemo(
    () => filtered.filter((r) => r.lwd && r.lwd > asOf).length,
    [filtered, asOf],
  );

  const trend = useMemo(
    () =>
      rolling13Months(asOf).map((p) => ({
        label: p.label,
        value: resignationHistory.filter((r) => r.date >= p.start && r.date <= p.end).length,
      })),
    [resignationHistory, asOf],
  );

  const byTeam = useMemo(() => {
    const groups = new Map<string, number>();
    for (const r of filtered) {
      const key = r.team || 'Unknown';
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    return [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filtered]);

  const byReason = useMemo(() => {
    const groups = new Map<string, number>();
    for (const r of filtered) {
      const key = r.exitReasonCategory || 'Unknown';
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    return [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);

  const byGrade = useMemo(() => {
    const groups = new Map<string, number>();
    for (const r of filtered) {
      const key = r.grade || 'Unknown';
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    return [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);

  const byServiceArea = useMemo(() => {
    const groups = new Map<string, number>();
    for (const r of filtered) {
      const key = r.serviceArea || 'Unknown';
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    return [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);

  const bar = (
    label: string,
    count: number,
    denom: number,
    color: string,
    filterKey?: keyof Filters,
  ) => {
    const clickable = filterKey && label !== 'Unknown';
    const selected = filterKey && filters[filterKey].includes(label);
    return (
      <div
        key={label}
        onClick={() => clickable && onFilterToggle(filterKey, label)}
        className={`flex items-center gap-2 rounded text-sm ${
          clickable ? 'cursor-pointer px-1 py-0.5 hover:bg-teal-50' : ''
        } ${selected ? 'bg-teal-50 ring-1 ring-teal-300' : ''}`}
      >
        <span className="w-32 truncate text-slate-600" title={label}>
          {label}
        </span>
        <div className="h-2 flex-1 rounded-full bg-slate-100">
          <div className={`h-2 rounded-full ${color}`} style={{ width: `${denom ? (count / denom) * 100 : 0}%` }} />
        </div>
        <span className="w-8 text-right text-slate-700">{count}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <GrainToggle value={grain} onChange={setGrain} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label={`${period.label} Resignations`} value={resignationsInPeriod.toLocaleString()} />
        <Tile
          label="Currently on notice"
          value={onNotice.toLocaleString()}
          sublabel="live snapshot, not historized"
        />
        <Tile label="Total tracked on notice" value={filtered.length.toLocaleString()} />
      </div>

      <TrendChart
        title="Resignations — 13-month rolling (all-time resignation date, Global Exits + Exits-YTD)"
        data={trend}
        color="#0f766e"
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">On Notice — By Team</h3>
          <div className="flex flex-col gap-2">
            {byTeam.map(([team, count]) => bar(team, count, filtered.length, 'bg-teal-600', 'teamName'))}
            {byTeam.length === 0 && <p className="text-sm text-slate-400">No data</p>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">On Notice — By Exit Reason Category</h3>
          <div className="flex flex-col gap-2">
            {byReason.map(([reason, count]) => bar(reason, count, filtered.length, 'bg-teal-500'))}
            {byReason.length === 0 && <p className="text-sm text-slate-400">No data</p>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">On Notice — By Grade</h3>
          <div className="flex flex-col gap-2">
            {byGrade.map(([grade, count]) => bar(grade, count, filtered.length, 'bg-cyan-600', 'grade'))}
            {byGrade.length === 0 && <p className="text-sm text-slate-400">No data</p>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">On Notice — By Service Area</h3>
          <div className="flex flex-col gap-2">
            {byServiceArea.map(([area, count]) => bar(area, count, filtered.length, 'bg-cyan-500', 'serviceArea'))}
            {byServiceArea.length === 0 && <p className="text-sm text-slate-400">No data</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
