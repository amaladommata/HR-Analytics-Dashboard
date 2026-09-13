import { AlertTriangle } from 'lucide-react';

interface DataQualityBannerProps {
  unresolvedCount: number;
  totalInactive: number;
  clientCoverage: { direct: number; lookup: number; total: number };
  onViewList: () => void;
}

export function DataQualityBanner({
  unresolvedCount,
  totalInactive,
  clientCoverage,
  onViewList,
}: DataQualityBannerProps) {
  const mapped = clientCoverage.direct + clientCoverage.lookup;
  const pct = clientCoverage.total > 0 ? Math.round((mapped / clientCoverage.total) * 100) : 0;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
      <p>
        <strong>{unresolvedCount}</strong> of {totalInactive} InActive-tagged employees have no matching
        exit record in Global Exits or Exits-YTD — excluded from headcount (not counted active, not
        counted as an exit).{' '}
        <button onClick={onViewList} className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700">
          View the list
        </button>
        . Headcount otherwise matches the source Status column exactly for today and uses resolved exit
        dates for past dates.{' '}
        {clientCoverage.total > 0 && (
          <>
            Client is known for {mapped} of {clientCoverage.total} active employees ({pct}%
            {clientCoverage.direct > 0 && clientCoverage.lookup > 0
              ? ` — ${clientCoverage.direct} from the sheet's own Client column, ${clientCoverage.lookup} reconstructed via a Team-name lookup`
              : clientCoverage.lookup > 0
                ? " — reconstructed via a Team-name lookup (Headcount has no Client column)"
                : ''}
            ) — Billing Type and PG Rating still have no source for active employees in this export.
          </>
        )}
      </p>
    </div>
  );
}
