interface DataQualityBannerProps {
  unresolvedCount: number;
  totalInactive: number;
  teamClientCoverage: { mapped: number; total: number };
}

export function DataQualityBanner({
  unresolvedCount,
  totalInactive,
  teamClientCoverage,
}: DataQualityBannerProps) {
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
      <strong>Note:</strong> {unresolvedCount} of {totalInactive} InActive-tagged employees have no
      matching exit record in Global Exits or Exits-YTD (no LWD, no confirmed exit) — treated as
      currently active (withdrawn resignation / reinstated absconding cases), not excluded.{' '}
      {teamClientCoverage.total > 0 && (
        <>
          Client is mapped via a Team-name lookup covering {teamClientCoverage.mapped} of{' '}
          {teamClientCoverage.total} active teams (
          {Math.round((teamClientCoverage.mapped / teamClientCoverage.total) * 100)}%) — Billing
          Type and PG Rating have no source for active employees in this export.
        </>
      )}
    </div>
  );
}
