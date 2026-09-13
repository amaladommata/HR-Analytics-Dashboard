import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm ${
          selected.length > 0 ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 bg-white text-slate-700'
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded-full bg-teal-600 px-1.5 text-xs font-medium text-white">
            {selected.length}
          </span>
        )}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-56 overflow-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="mb-1 w-full rounded px-2 py-1 text-left text-xs text-slate-400 hover:bg-slate-50"
            >
              Clear {label}
            </button>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-teal-600"
              />
              <span className="truncate">{opt}</span>
            </label>
          ))}
          {options.length === 0 && <p className="px-2 py-1.5 text-xs text-slate-400">No options</p>}
        </div>
      )}
    </div>
  );
}
