import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Users, TrendingDown, CalendarClock, RefreshCw } from 'lucide-react';

export type Tab = 'summary' | 'headcount' | 'attrition' | 'notice';

const NAV: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'summary', label: 'Summary', icon: LayoutDashboard },
  { key: 'headcount', label: 'Headcount', icon: Users },
  { key: 'attrition', label: 'Attrition', icon: TrendingDown },
  { key: 'notice', label: 'Notice Period', icon: CalendarClock },
];

interface TopNavProps {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  source: 'live' | 'bundled';
  onRefresh: () => void;
  employeeCount: number;
  asOfLabel: string;
}

export function TopNav({ tab, onTabChange, source, onRefresh, employeeCount, asOfLabel }: TopNavProps) {
  return (
    <header className="bg-gradient-to-r from-teal-900 via-teal-800 to-teal-900 px-6 pt-4 text-white shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-base font-bold tracking-tight">
            MM
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">HR Leadership Dashboard</h1>
            <p className="text-xs font-medium text-teal-200/90">MediaMint · {asOfLabel} · {employeeCount.toLocaleString()} employees</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${
              source === 'live' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-200'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${source === 'live' ? 'bg-emerald-300' : 'bg-amber-300'}`} />
            {source === 'live' ? 'Live from Sheets' : 'Bundled snapshot'}
          </span>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 font-semibold text-teal-100 hover:bg-white/10"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <nav className="mt-4 flex gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                active ? 'bg-white text-teal-900' : 'text-teal-100 hover:bg-white/10'
              }`}
            >
              <Icon size={16} strokeWidth={2.3} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
