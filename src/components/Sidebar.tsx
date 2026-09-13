import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Users, TrendingDown, CalendarClock, RefreshCw } from 'lucide-react';

export type Tab = 'summary' | 'headcount' | 'attrition' | 'notice';

const NAV: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'summary', label: 'Summary', icon: LayoutDashboard },
  { key: 'headcount', label: 'Headcount', icon: Users },
  { key: 'attrition', label: 'Attrition', icon: TrendingDown },
  { key: 'notice', label: 'Notice Period', icon: CalendarClock },
];

interface SidebarProps {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  source: 'live' | 'bundled';
  onRefresh: () => void;
  employeeCount: number;
  asOfLabel: string;
}

export function Sidebar({ tab, onTabChange, source, onRefresh, employeeCount, asOfLabel }: SidebarProps) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-teal-900 text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">
          MM
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">HR Dashboard</p>
          <p className="text-xs text-teal-200">MediaMint</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:bg-white/10'
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-4 text-xs text-teal-200">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${source === 'live' ? 'bg-emerald-300' : 'bg-amber-300'}`}
          />
          {source === 'live' ? 'Live from Sheets' : 'Bundled snapshot'}
        </div>
        <p>
          {asOfLabel} · {employeeCount.toLocaleString()} employees
        </p>
        <button
          onClick={onRefresh}
          className="mt-1 flex items-center justify-center gap-1.5 rounded-md border border-white/20 py-1.5 text-teal-100 hover:bg-white/10"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
    </aside>
  );
}
