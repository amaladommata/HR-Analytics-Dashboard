import type { Grain } from '../lib/periods';

const GRAINS: { key: Grain; label: string }[] = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'QTD' },
  { key: 'fytd', label: 'FYTD' },
];

export function GrainToggle({ value, onChange }: { value: Grain; onChange: (g: Grain) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 text-sm">
      {GRAINS.map((g) => (
        <button
          key={g.key}
          onClick={() => onChange(g.key)}
          className={`rounded-md px-3 py-1 ${
            value === g.key ? 'bg-teal-700 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}
