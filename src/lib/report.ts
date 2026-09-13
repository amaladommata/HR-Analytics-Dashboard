import type { DataBundle, Filters } from './types';
import { attritionPct, exitsInPeriod, headcount, topReasons } from './calc';
import { currentPeriod } from './periods';

const FILTER_LABELS: Record<keyof Filters, string> = {
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
  billingType: 'Billing Type',
};

/** Builds a plain-text monthly summary for whatever filters are currently active — e.g. set Delivery Head then export to get that person's own portfolio. */
export function buildMonthlyReportText(data: DataBundle, filters: Filters, asOf: Date): string {
  const period = currentPeriod('monthly', asOf);
  const { employees, noticePeriod } = data;

  const activeFilters = (Object.entries(filters) as [keyof Filters, string[]][])
    .filter(([, v]) => v.length > 0)
    .map(([k, v]) => `${FILTER_LABELS[k]}: ${v.join(', ')}`);

  const hc = headcount(employees, period.end, filters);
  const hcStart = headcount(employees, period.start, filters);
  const exits = exitsInPeriod(employees, period.start, period.end, filters);
  const pct = attritionPct(employees, period.start, period.end, filters);
  const voluntary = exits.filter((e) => e.voluntary === 'Voluntary').length;
  const reasons = topReasons(employees, period.start, period.end, filters, 5);

  const onNotice = noticePeriod.filter((r) => {
    if (r.lwd && r.lwd <= asOf) return false;
    if (filters.client.length && !filters.client.includes(r.client)) return false;
    if (filters.grade.length && !filters.grade.includes(r.grade)) return false;
    if (filters.serviceArea.length && !filters.serviceArea.includes(r.serviceArea)) return false;
    if (filters.teamName.length && !filters.teamName.includes(r.team)) return false;
    return true;
  }).length;

  const lines: string[] = [];
  lines.push(`HR MONTHLY SUMMARY — ${period.label}`);
  lines.push(`MediaMint HR Leadership Dashboard · generated ${asOf.toLocaleString()}`);
  lines.push('');
  lines.push(activeFilters.length ? `Scope: ${activeFilters.join(' | ')}` : 'Scope: Company-wide (no filters applied)');
  lines.push('');
  lines.push('HEADCOUNT');
  lines.push(`  Opening: ${hcStart.toLocaleString()}`);
  lines.push(`  Closing: ${hc.toLocaleString()}`);
  lines.push(`  Net change: ${hc - hcStart >= 0 ? '+' : ''}${hc - hcStart}`);
  lines.push('');
  lines.push('ATTRITION');
  lines.push(`  Attrition %: ${pct.toFixed(1)}%`);
  lines.push(`  Exits: ${exits.length} (${voluntary} voluntary, ${exits.length - voluntary} involuntary)`);
  lines.push('');
  if (reasons.length) {
    lines.push('TOP EXIT REASONS');
    for (const r of reasons) lines.push(`  ${r.reason}: ${r.count} (${r.pct.toFixed(0)}%)`);
    lines.push('');
  }
  lines.push('NOTICE PERIOD');
  lines.push(`  Currently on notice: ${onNotice}`);
  lines.push('');
  lines.push(
    `Note: ${data.unresolvedCount} InActive-tagged employees company-wide have no matching exit record and are excluded from headcount figures above.`,
  );

  return lines.join('\n');
}
