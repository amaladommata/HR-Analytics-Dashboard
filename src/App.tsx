import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadDataBundle } from './lib/loadData';
import { distinctValues, EMPTY_FILTERS } from './lib/calc';
import type { DataBundle, Filters } from './lib/types';
import { DataQualityBanner } from './components/DataQualityBanner';
import { FilterBar } from './components/FilterBar';
import { Sidebar, type Tab } from './components/Sidebar';
import { UnresolvedListModal } from './components/UnresolvedListModal';
import { HeadcountPage } from './pages/HeadcountPage';
import { AttritionPage } from './pages/AttritionPage';
import { NoticePeriodPage } from './pages/NoticePeriodPage';
import { SummaryPage } from './pages/SummaryPage';

const PAGE_TITLES: Record<Tab, string> = {
  summary: 'Summary',
  headcount: 'Headcount',
  attrition: 'Attrition',
  notice: 'Notice Period',
};

/** Re-fetch the sheet data on this interval so open dashboards pick up edits without a manual reload. */
const AUTO_REFRESH_MS = 60_000;

function App() {
  const [data, setData] = useState<DataBundle | null>(null);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>('summary');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showUnresolved, setShowUnresolved] = useState(false);
  const asOf = useMemo(() => new Date(), [lastLoaded]);

  const refresh = useCallback(() => {
    loadDataBundle().then((bundle) => {
      setData(bundle);
      setLastLoaded(new Date());
    });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

/** Click-to-cross-filter: clicking a value anywhere on the dashboard adds/removes it from that dimension's selection and filters every tab, like clicking a mark in Looker/Tableau. Each dimension supports multiple selected values (OR). */
  const toggleFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
  }, []);

  const filterOptions = useMemo(
    () =>
      data
        ? [
            { key: 'client' as const, label: 'Client', options: distinctValues(data.employees, 'client') },
            { key: 'country' as const, label: 'Country', options: distinctValues(data.employees, 'country') },
            { key: 'grade' as const, label: 'Grade', options: distinctValues(data.employees, 'grade') },
            {
              key: 'serviceArea' as const,
              label: 'Service Area',
              options: distinctValues(data.employees, 'serviceArea'),
            },
            { key: 'gender' as const, label: 'Gender', options: distinctValues(data.employees, 'gender') },
            {
              key: 'employeeType' as const,
              label: 'Employee Type',
              options: distinctValues(data.employees, 'employeeType'),
            },
          ]
        : [],
    [data],
  );

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading HR data…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        tab={tab}
        onTabChange={setTab}
        source={data.source}
        onRefresh={refresh}
        employeeCount={data.employees.length}
        asOfLabel={asOf.toLocaleDateString()}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-8 py-5">
          <h1 className="text-lg font-semibold text-slate-900">{PAGE_TITLES[tab]}</h1>
          <p className="text-xs text-slate-400">HR Leadership Dashboard · MediaMint</p>
        </header>

        <main className="flex min-w-0 flex-1 flex-col gap-4 px-8 py-6">
          <DataQualityBanner
            unresolvedCount={data.unresolvedCount}
            totalInactive={data.totalInactive}
            teamClientCoverage={data.teamClientCoverage}
            onViewList={() => setShowUnresolved(true)}
          />

          <FilterBar
            filters={filters}
            options={filterOptions}
            onChange={(key, values) => setFilters((f) => ({ ...f, [key]: values }))}
            onReset={() => setFilters(EMPTY_FILTERS)}
          />

          {tab === 'summary' && (
            <SummaryPage data={data} filters={filters} asOf={asOf} onNavigate={setTab} />
          )}
          {tab === 'headcount' && (
            <HeadcountPage
              employees={data.employees}
              filters={filters}
              asOf={asOf}
              onFilterToggle={toggleFilter}
            />
          )}
          {tab === 'attrition' && (
            <AttritionPage data={data} filters={filters} asOf={asOf} onFilterToggle={toggleFilter} />
          )}
          {tab === 'notice' && (
            <NoticePeriodPage data={data} filters={filters} asOf={asOf} onFilterToggle={toggleFilter} />
          )}
        </main>
      </div>

      {showUnresolved && (
        <UnresolvedListModal employees={data.employees} onClose={() => setShowUnresolved(false)} />
      )}
    </div>
  );
}

export default App;
