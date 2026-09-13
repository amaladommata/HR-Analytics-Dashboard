import { X } from 'lucide-react';
import type { Filters } from '../lib/types';
import { MultiSelect } from './MultiSelect';

interface FilterOption {
  key: keyof Filters;
  label: string;
  options: string[];
}

interface FilterBarProps {
  filters: Filters;
  options: FilterOption[];
  onChange: (key: keyof Filters, values: string[]) => void;
  onReset: () => void;
}

const LABELS: Record<keyof Filters, string> = {
  client: 'Client',
  country: 'Country',
  grade: 'Grade',
  serviceArea: 'Service Area',
  gender: 'Gender',
  employeeType: 'Employee Type',
  teamName: 'Team',
  reasonsCategory: 'Exit Reason',
  voluntary: 'Voluntary/Involuntary',
  deliveryHead: 'Delivery Head',
};

export function FilterBar({ filters, options, onChange, onReset }: FilterBarProps) {
  const active = (Object.entries(filters) as [keyof Filters, string[]][]).filter(([, v]) => v.length > 0);
  const activeCount = active.reduce((sum, [, v]) => sum + v.length, 0);

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {options.map((opt) => (
          <MultiSelect
            key={opt.key}
            label={opt.label}
            options={opt.options}
            selected={filters[opt.key]}
            onChange={(values) => onChange(opt.key, values)}
          />
        ))}
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="ml-auto rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
          <span className="text-xs text-slate-400">Filtering by:</span>
          {active.map(([key, values]) =>
            values.map((value) => (
              <span
                key={`${key}:${value}`}
                className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800"
              >
                {LABELS[key]}: {value}
                <button
                  onClick={() => onChange(key, filters[key].filter((v) => v !== value))}
                  className="text-teal-500 hover:text-teal-800"
                >
                  <X size={12} />
                </button>
              </span>
            )),
          )}
        </div>
      )}
    </div>
  );
}
