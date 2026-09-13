import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadDataBundle } from './lib/loadData';
import { distinctValues, EMPTY_FILTERS } from './lib/calc';
import type { DataBundle, Filters } from './lib/types';
import { DataQualityBanner } from './components/DataQualityBanner';
import { FilterBar } from './components/FilterBar';
import { HeadcountPage } from './pages/HeadcountPage';
import { AttritionPage } from './pages/AttritionPage';
import { NoticePeriodPage } from './pages/NoticePeriodPage';
import { SummaryPage } from './pages/SummaryPage';

type Tab = 'summary' | 'headcount' | 'attrition' | 'notice';

const TABS: { key: Tab; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'headcount', label: 'Headcount' },
  { key: 'attrition', label: 'Attrition' },
  { key: 'notice', label: 'Notice Period' },
];

/** Re-fetch the sheet data on this interval so open dashboards pick up edits without a manual reload. */
const AUTO_REFRESH_MS = 60_000;

function App() {
  const [data, setData] = useState<DataBundle | null>(null);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>('summary');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        Loading HR data…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-teal-800 px-6 py-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15 text-sm font-bold">
              MM
            </div>
            <div>
              <h1 className="text-xl font-semibold">HR Leadership Dashboard</h1>
              <p className="text-sm text-teal-100">
                {asOf.toLocaleDateString()} · {data.employees.length.toLocaleString()} employees
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-teal-100">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                data.source === 'live' ? 'bg-emerald-500/20 text-emerald-100' : 'bg-amber-500/20 text-amber-100'
              }`}
              title={
                data.source === 'live'
                  ? 'Reading live from Google Sheets'
                  : 'Google Sheets not reachable — showing the bundled CSV snapshot'
              }
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${data.source === 'live' ? 'bg-emerald-300' : 'bg-amber-300'}`}
              />
              {data.source === 'live' ? 'Live from Sheets' : 'Bundled snapshot'}
            </span>
            <button onClick={refresh} className="rounded border border-white/30 px-2 py-1 hover:bg-white/10">
              Refresh
            </button>
          </div>
        </div>
      </header>

      <nav className="flex gap-1 border-b border-gray-200 bg-white px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-3 text-sm font-medium ${
              tab === t.key
                ? 'border-teal-700 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
        <DataQualityBanner
          unresolvedCount={data.unresolvedCount}
          totalInactive={data.totalInactive}
          teamClientCoverage={data.teamClientCoverage}
        />

        <FilterBar
          filters={filters}
          options={filterOptions}
          onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
          onReset={() => setFilters(EMPTY_FILTERS)}
        />

        {tab === 'summary' && <SummaryPage data={data} filters={filters} asOf={asOf} />}
        {tab === 'headcount' && <HeadcountPage employees={data.employees} filters={filters} asOf={asOf} />}
        {tab === 'attrition' && <AttritionPage data={data} filters={filters} asOf={asOf} />}
        {tab === 'notice' && <NoticePeriodPage data={data} filters={filters} asOf={asOf} />}
      </main>
    </div>
  );
}

export default App;
