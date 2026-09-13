import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import type { Employee, Filters } from '../lib/types';
import { headcount } from '../lib/calc';
import { currentPeriod, rolling13Months, type Grain } from '../lib/periods';
import { Tile } from '../components/Tile';
import { GrainToggle } from '../components/GrainToggle';
import { BreakdownTable } from '../components/BreakdownTable';
import { TrendChart } from '../components/TrendChart';

interface HeadcountPageProps {
  employees: Employee[];
  filters: Filters;
  asOf: Date;
  onFilterToggle: (key: keyof Filters, value: string) => void;
}

export function HeadcountPage({ employees, filters, asOf, onFilterToggle }: HeadcountPageProps) {
  const [grain, setGrain] = useState<Grain>('monthly');

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <GrainToggle value={grain} onChange={setGrain} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label={`${period.label} closing HC`} value={hc.toLocaleString()} icon={Users} />
        <Tile label={`${period.label} opening HC`} value={hcStart.toLocaleString()} />
        <Tile
          label="Net change"
          value={`${hc - hcStart >= 0 ? '+' : ''}${(hc - hcStart).toLocaleString()}`}
          accent={hc - hcStart >= 0 ? 'good' : 'bad'}
        />
      </div>

      <TrendChart title="Headcount — 13-month rolling" data={trend} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <BreakdownTable
          title="By Client (partial coverage — see note above)"
          employees={employees}
          dimension={(e) => e.client ?? 'Unmapped'}
          asOf={period.end}
          filters={filters}
          filterKey="client"
          onFilterToggle={onFilterToggle}
        />
        <BreakdownTable
          title="By Delivery Head (partial coverage — see note above)"
          employees={employees}
          dimension={(e) => e.deliveryHead ?? 'Unmapped'}
          asOf={period.end}
          filters={filters}
          filterKey="deliveryHead"
          onFilterToggle={onFilterToggle}
        />
        <BreakdownTable
          title="By Country"
          employees={employees}
          dimension={(e) => e.country}
          asOf={period.end}
          filters={filters}
          filterKey="country"
          onFilterToggle={onFilterToggle}
        />
        <BreakdownTable
          title="By Grade"
          employees={employees}
          dimension={(e) => e.grade}
          asOf={period.end}
          filters={filters}
          filterKey="grade"
          onFilterToggle={onFilterToggle}
        />
        <BreakdownTable
          title="By Service Area"
          employees={employees}
          dimension={(e) => e.serviceArea}
          asOf={period.end}
          filters={filters}
          filterKey="serviceArea"
          onFilterToggle={onFilterToggle}
        />
        <BreakdownTable
          title="By Employee Type"
          employees={employees}
          dimension={(e) => e.employeeType}
          asOf={period.end}
          filters={filters}
          filterKey="employeeType"
          onFilterToggle={onFilterToggle}
        />
        <BreakdownTable
          title="By Gender"
          employees={employees}
          dimension={(e) => e.gender}
          asOf={period.end}
          filters={filters}
          filterKey="gender"
          onFilterToggle={onFilterToggle}
        />
      </div>
    </div>
  );
}
