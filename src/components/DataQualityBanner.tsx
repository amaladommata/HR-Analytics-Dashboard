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
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <strong>Data quality:</strong> {unresolvedCount} of {totalInactive} InActive-tagged employees have
      no matching exit record in Global Exits or Exits-YTD — their exit date is unknown, so they're
      excluded from headcount (not counted active, not counted as an exit). Headcount otherwise matches
      the source Status column exactly for today and uses resolved exit dates for past dates.{' '}
      {teamClientCoverage.total > 0 && (
        <>
          Client is mapped via a Team-name lookup covering {teamClientCoverage.mapped} of{' '}
          {teamClientCoverage.total} active teams (
          {Math.round((teamClientCoverage.mapped / teamClientCoverage.total) * 100)}%) — Billing Type
          and PG Rating have no source for active employees in this export.
        </>
      )}
    </div>
  );
}
