import type { Filters } from '../lib/types';

interface FilterOption {
  key: keyof Filters;
  label: string;
  options: string[];
}

interface FilterBarProps {
  filters: Filters;
  options: FilterOption[];
  onChange: (key: keyof Filters, value: string | null) => void;
  onReset: () => void;
}

export function FilterBar({ filters, options, onChange, onReset }: FilterBarProps) {
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
      {options.map((opt) => (
        <select
          key={opt.key}
          value={filters[opt.key] ?? ''}
          onChange={(e) => onChange(opt.key, e.target.value || null)}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700"
        >
          <option value="">{opt.label}: All</option>
          {opt.options.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      ))}
      {activeCount > 0 && (
        <button
          onClick={onReset}
          className="ml-auto rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          Clear filters ({activeCount})
        </button>
      )}
    </div>
  );
}
