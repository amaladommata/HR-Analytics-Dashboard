import type { LucideIcon } from 'lucide-react';

interface TileProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: 'default' | 'warning' | 'good' | 'bad';
  icon?: LucideIcon;
  onClick?: () => void;
}

const ACCENT_STYLES: Record<NonNullable<TileProps['accent']>, { value: string; iconBg: string; iconColor: string }> = {
  default: { value: 'text-slate-900', iconBg: 'bg-teal-50', iconColor: 'text-teal-700' },
  warning: { value: 'text-amber-600', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  good: { value: 'text-emerald-600', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  bad: { value: 'text-rose-600', iconBg: 'bg-rose-50', iconColor: 'text-rose-600' },
};

export function Tile({ label, value, sublabel, accent = 'default', icon: Icon, onClick }: TileProps) {
  const style = ACCENT_STYLES[accent];
  return (
    <div
      onClick={onClick}
      className={`flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
        onClick ? 'cursor-pointer transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md' : ''
      }`}
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <span className={`text-2xl font-semibold tabular-nums ${style.value}`}>{value}</span>
        {sublabel && <span className="text-xs text-slate-400">{sublabel}</span>}
      </div>
      {Icon && (
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}>
          <Icon className={style.iconColor} size={18} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}
