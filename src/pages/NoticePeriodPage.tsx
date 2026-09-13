import { useMemo, useState } from 'react';
import type { DataBundle, Filters } from '../lib/types';
import { currentPeriod, rolling13Months, type Grain } from '../lib/periods';
import { Tile } from '../components/Tile';
import { GrainToggle } from '../components/GrainToggle';
import { TrendChart } from '../components/TrendChart';

function matchesNoticeFilters(r: DataBundle['noticePeriod'][number], filters: Filters): boolean {
  if (filters.client && r.client !== filters.client) return false;
  if (filters.grade && r.grade !== filters.grade) return false;
  if (filters.serviceArea && r.serviceArea !== filters.serviceArea) return false;
  if (filters.teamName && r.team !== filters.teamName) return false;
  return true;
}

export function NoticePeriodPage({ data, filters, asOf }: { data: DataBundle; filters: Filters; asOf: Date }) {
  const { noticePeriod } = data;
  const [grain, setGrain] = useState<Grain>('monthly');

  const period = useMemo(() => currentPeriod(grain, asOf), [grain, asOf]);
  const filtered = useMemo(
    () => noticePeriod.filter((r) => matchesNoticeFilters(r, filters)),
    [noticePeriod, filters],
  );

  const resignationsInPeriod = useMemo(
    () =>
      filtered.filter(
        (r) => r.resignationDate && r.resignationDate >= period.start && r.resignationDate <= period.end,
      ).length,
    [filtered, period],
  );

  const onNotice = useMemo(
    () => filtered.filter((r) => r.lwd && r.lwd > asOf).length,
    [filtered, asOf],
  );

  const trend = useMemo(
    () =>
      rolling13Months(asOf).map((p) => ({
        label: p.label,
        value: filtered.filter(
          (r) => r.resignationDate && r.resignationDate >= p.start && r.resignationDate <= p.end,
        ).length,
      })),
    [filtered, asOf],
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
    return [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filtered]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Notice Period</h2>
        <GrainToggle value={grain} onChange={setGrain} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label={`${period.label} Resignations`} value={resignationsInPeriod.toLocaleString()} />
        <Tile label="Currently on notice" value={onNotice.toLocaleString()} />
        <Tile label="Total tracked" value={filtered.length.toLocaleString()} />
        <Tile label="As of" value={asOf.toLocaleDateString()} />
      </div>

      <TrendChart title="Resignations — 13-month rolling" data={trend} color="#0891b2" />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">By Team</h3>
          <div className="flex flex-col gap-2">
            {byTeam.map(([team, count]) => (
              <div key={team} className="flex items-center gap-2 text-sm">
                <span className="w-40 truncate text-gray-600" title={team}>
                  {team}
                </span>
                <div className="h-2 flex-1 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-cyan-500"
                    style={{ width: `${(count / filtered.length) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-gray-700">{count}</span>
              </div>
            ))}
            {byTeam.length === 0 && <p className="text-sm text-gray-400">No data</p>}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">By Exit Reason Category</h3>
          <div className="flex flex-col gap-2">
            {byReason.map(([reason, count]) => (
              <div key={reason} className="flex items-center gap-2 text-sm">
                <span className="w-40 truncate text-gray-600" title={reason}>
                  {reason}
                </span>
                <div className="h-2 flex-1 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-teal-500"
                    style={{ width: `${(count / filtered.length) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-gray-700">{count}</span>
              </div>
            ))}
            {byReason.length === 0 && <p className="text-sm text-gray-400">No data</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
