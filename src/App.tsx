import { useMemo, useState } from 'react';
import { loadDataBundle } from './lib/loadData';
import { distinctValues, EMPTY_FILTERS } from './lib/calc';
import type { Filters } from './lib/types';
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

function App() {
  const data = useMemo(() => loadDataBundle(), []);
  const asOf = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<Tab>('summary');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const filterOptions = useMemo(
    () => [
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
    ],
    [data.employees],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">HR Leadership Dashboard</h1>
        <p className="text-sm text-gray-500">
          Data as of {asOf.toLocaleDateString()} · {data.employees.length.toLocaleString()} employees loaded
        </p>
      </header>

      <nav className="flex gap-1 border-b border-gray-200 bg-white px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-3 text-sm font-medium ${
              tab === t.key
                ? 'border-indigo-600 text-indigo-600'
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
