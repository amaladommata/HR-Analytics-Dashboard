import { useMemo, useState } from 'react';
import type { Employee, Filters } from '../lib/types';
import { EMPTY_FILTERS, headcount } from '../lib/calc';
import { currentPeriod, rolling13Months, type Grain } from '../lib/periods';
import { Tile } from '../components/Tile';
import { GrainToggle } from '../components/GrainToggle';
import { BreakdownTable } from '../components/BreakdownTable';
import { TrendChart } from '../components/TrendChart';

export function HeadcountPage({ employees, filters, asOf }: { employees: Employee[]; filters: Filters; asOf: Date }) {
  const [grain, setGrain] = useState<Grain>('monthly');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const period = useMemo(() => currentPeriod(grain, asOf), [grain, asOf]);
  const hc = useMemo(() => headcount(employees, period.end, filters), [employees, period, filters]);
  const hcStart = useMemo(() => headcount(employees, period.start, filters), [employees, period, filters]);

  const trend = useMemo(
    () =>
      rolling13Months(asOf).map((p) => ({
        label: p.label,
        value: headcount(employees, p.end, filters),
      })),
    [employees, asOf, filters],
  );

  const clientScoped = useMemo(() => {
    if (!selectedClient) return [];
    if (selectedClient === 'Unmapped') return employees.filter((e) => !e.client);
    return employees.filter((e) => e.client === selectedClient);
  }, [employees, selectedClient]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Headcount</h2>
        <GrainToggle value={grain} onChange={setGrain} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label={`${period.label} closing HC`} value={hc.toLocaleString()} />
        <Tile label={`${period.label} opening HC`} value={hcStart.toLocaleString()} />
        <Tile label="Net change" value={`${hc - hcStart >= 0 ? '+' : ''}${(hc - hcStart).toLocaleString()}`} />
      </div>

      <TrendChart title="Headcount — 13-month rolling" data={trend} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <BreakdownTable
          title="By Client (partial coverage — see note above; click to break down)"
          employees={employees}
          dimension={(e) => e.client ?? 'Unmapped'}
          asOf={period.end}
          filters={filters}
          onRowClick={(key) => setSelectedClient(selectedClient === key ? null : key)}
          selectedKey={selectedClient}
        />
        <BreakdownTable
          title="By Country"
          employees={employees}
          dimension={(e) => e.country}
          asOf={period.end}
          filters={filters}
        />
        <BreakdownTable
          title="By Grade"
          employees={employees}
          dimension={(e) => e.grade}
          asOf={period.end}
          filters={filters}
        />
        <BreakdownTable
          title="By Service Area"
          employees={employees}
          dimension={(e) => e.serviceArea}
          asOf={period.end}
          filters={filters}
        />
        <BreakdownTable
          title="By Employee Type"
          employees={employees}
          dimension={(e) => e.employeeType}
          asOf={period.end}
          filters={filters}
        />
        <BreakdownTable
          title="By Gender"
          employees={employees}
          dimension={(e) => e.gender}
          asOf={period.end}
          filters={filters}
        />
      </div>

      {selectedClient && (
        <div className="rounded-lg border border-teal-300 bg-teal-50/50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-teal-900">{selectedClient} — breakdown</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <BreakdownTable
              title="By Grade"
              employees={clientScoped}
              dimension={(e) => e.grade}
              asOf={period.end}
              filters={EMPTY_FILTERS}
              limit={6}
            />
            <BreakdownTable
              title="By Service Area"
              employees={clientScoped}
              dimension={(e) => e.serviceArea}
              asOf={period.end}
              filters={EMPTY_FILTERS}
              limit={6}
            />
            <BreakdownTable
              title="By Gender"
              employees={clientScoped}
              dimension={(e) => e.gender}
              asOf={period.end}
              filters={EMPTY_FILTERS}
              limit={6}
            />
          </div>
        </div>
      )}
    </div>
  );
}
