import { AlertTriangle } from 'lucide-react';

interface DataQualityBannerProps {
  unresolvedCount: number;
  totalInactive: number;
  teamClientCoverage: { mapped: number; total: number };
  onViewList: () => void;
}

export function DataQualityBanner({
  unresolvedCount,
  totalInactive,
  teamClientCoverage,
  onViewList,
}: DataQualityBannerProps) {
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
        {teamClientCoverage.total > 0 && (
          <>
            Client is mapped via a Team-name lookup covering {teamClientCoverage.mapped} of{' '}
            {teamClientCoverage.total} active teams (
            {Math.round((teamClientCoverage.mapped / teamClientCoverage.total) * 100)}%) — Billing Type
            and PG Rating have no source for active employees in this export.
          </>
        )}
      </p>
    </div>
  );
}
