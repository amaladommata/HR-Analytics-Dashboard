interface TileProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: 'default' | 'warning';
  onClick?: () => void;
}

export function Tile({ label, value, sublabel, accent = 'default', onClick }: TileProps) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${
        onClick ? 'cursor-pointer transition hover:border-teal-400 hover:shadow-md' : ''
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      <span className={`text-2xl font-semibold ${accent === 'warning' ? 'text-amber-600' : 'text-gray-900'}`}>
        {value}
      </span>
      {sublabel && <span className="text-xs text-gray-500">{sublabel}</span>}
    </div>
  );
}
