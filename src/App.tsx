import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Users, TrendingDown, CalendarClock, FileText } from 'lucide-react';
import { loadDataBundle } from './lib/loadData';
import { distinctValues, EMPTY_FILTERS } from './lib/calc';
import { buildMonthlyReportText } from './lib/report';
import type { DataBundle, Filters } from './lib/types';
import { DataQualityBanner } from './components/DataQualityBanner';
import { FilterBar } from './components/FilterBar';
import { TopNav, type Tab } from './components/TopNav';
import { UnresolvedListModal } from './components/UnresolvedListModal';
import { ReportModal } from './components/ReportModal';
import { HeadcountPage } from './pages/HeadcountPage';
import { AttritionPage } from './pages/AttritionPage';
import { NoticePeriodPage } from './pages/NoticePeriodPage';
import { SummaryPage } from './pages/SummaryPage';

const PAGE_META = {
  summary: { title: 'Summary', subtitle: 'Company-wide pulse across every metric', icon: LayoutDashboard, color: 'text-teal-700 bg-teal-50' },
  headcount: { title: 'Headcount', subtitle: 'Who’s active, and where', icon: Users, color: 'text-teal-700 bg-teal-50' },
  attrition: { title: 'Attrition', subtitle: 'Exits, reasons, and who they hit hardest', icon: TrendingDown, color: 'text-rose-700 bg-rose-50' },
  notice: { title: 'Notice Period', subtitle: 'Who’s leaving, and when', icon: CalendarClock, color: 'text-amber-700 bg-amber-50' },
} as const;

/** Re-fetch the sheet data on this interval so open dashboards pick up edits without a manual reload. */
const AUTO_REFRESH_MS = 60_000;

function App() {
  const [data, setData] = useState<DataBundle | null>(null);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>('summary');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showUnresolved, setShowUnresolved] = useState(false);
  const [reportText, setReportText] = useState<string | null>(null);
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
            {
              key: 'deliveryHead' as const,
              label: 'Delivery Head',
              options: distinctValues(data.employees, 'deliveryHead'),
            },
            {
              key: 'billingType' as const,
              label: 'Billing Type',
              options: distinctValues(data.employees, 'billingType'),
            },
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

  const meta = PAGE_META[tab];
  const Icon = meta.icon;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav
        tab={tab}
        onTabChange={setTab}
        source={data.source}
        onRefresh={refresh}
        employeeCount={data.employees.length}
        asOfLabel={asOf.toLocaleDateString()}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-7">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${meta.color}`}>
            <Icon size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{meta.title}</h2>
            <p className="text-sm text-slate-500">{meta.subtitle}</p>
          </div>
          <button
            onClick={() => setReportText(buildMonthlyReportText(data, filters, asOf))}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3.5 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100"
            title="Export a text summary scoped to your active filters — e.g. set Delivery Head, then export their portfolio"
          >
            <FileText size={15} />
            Export report
          </button>
        </div>

        <DataQualityBanner
          unresolvedCount={data.unresolvedCount}
          totalInactive={data.totalInactive}
          clientCoverage={data.clientCoverage}
          billingTypeKnown={data.billingTypeKnown}
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

      {showUnresolved && (
        <UnresolvedListModal employees={data.employees} onClose={() => setShowUnresolved(false)} />
      )}
      {reportText && <ReportModal text={reportText} onClose={() => setReportText(null)} />}
    </div>
  );
}

export default App;
