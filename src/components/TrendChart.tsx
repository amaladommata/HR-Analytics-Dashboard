import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface TrendChartProps {
  title: string;
  data: { label: string; value: number }[];
  color?: string;
  valueSuffix?: string;
  /** Formats the numeric value for point labels and the tooltip. Defaults to rounding to a whole number. */
  formatValue?: (v: number) => string;
}

export function TrendChart({
  title,
  data,
  color = '#0d9488',
  valueSuffix = '',
  formatValue = (v) => Math.round(v).toLocaleString(),
}: TrendChartProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-slate-800">{title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 20, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => [`${formatValue(Number(v))}${valueSuffix}`, title]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3 }}
            isAnimationActive={false}
            label={(props: unknown) => {
              const p = props as { x?: number; y?: number; value?: number };
              return (
                <text x={p.x} y={(p.y ?? 0) - 10} fontSize={10} textAnchor="middle" fill="#374151">
                  {formatValue(Number(p.value ?? 0))}
                  {valueSuffix}
                </text>
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
