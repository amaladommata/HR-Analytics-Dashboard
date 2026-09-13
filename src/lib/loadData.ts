import headcountRaw from '../data/headcount_clean.csv?raw';
import exitsYtdRaw from '../data/exits_ytd_clean.csv?raw';
import noticePeriodRaw from '../data/notice_period_clean.csv?raw';
import globalExitsRaw from '../data/global_exits_clean.csv?raw';
import { parseCsv, parseDate, cleanStr } from './parse';
import type {
  DataBundle,
  Employee,
  ExitsYtdRow,
  GlobalExitRow,
  NoticePeriodRow,
} from './types';

type Row = Record<string, string>;

interface RawRows {
  headcount: Row[];
  exitsYtd: Row[];
  noticePeriod: Row[];
  globalExits: Row[];
  /** Where these rows came from — surfaced in the UI so it's obvious whether live data loaded. */
  source: 'live' | 'bundled';
}

function loadGlobalExits(rows: Row[]): GlobalExitRow[] {
  return rows
    .map((r) => ({
      mmid: cleanStr(r['MMID']),
      memberName: cleanStr(r['Team member name']),
      teamName: cleanStr(r['Team name']),
      employeeStatus: cleanStr(r['Employee status']),
      exitType: cleanStr(r['Exit type']),
      reason: cleanStr(r['Reason']),
      dateOfResignation: parseDate(r['Date of Resignation']),
      lwd: parseDate(r['LWD']),
      confirmedLwd: parseDate(r['Confirmed LWD']),
      dateOfAbsconding: parseDate(r['Date of absconding']),
      terminationWithdrawalDate: parseDate(r['Date of absconding/termination withdrawal']),
      hrbp: cleanStr(r['HRBP']),
      doj: parseDate(r['Date of joining']),
      serviceArea: cleanStr(r['Service area']),
      grade: cleanStr(r['Grade']),
      jobLocation: cleanStr(r['Job location']),
    }))
    .filter((r) => r.mmid);
}

function loadExitsYtd(rows: Row[]): ExitsYtdRow[] {
  return rows
    .map((r) => ({
      mmid: cleanStr(r['MMID']),
      name: cleanStr(r['Name']),
      status: cleanStr(r['Status']),
      doj: parseDate(r['DOJ']),
      grade: cleanStr(r['Grade']),
      team: cleanStr(r['Team']),
      client: cleanStr(r['Client']),
      project: cleanStr(r['Project']),
      businessGroup: cleanStr(r['Business Group']),
      deliveryHead: cleanStr(r['Delivery Head']),
      country: cleanStr(r['Country']),
      serviceArea: cleanStr(r['Service Area']),
      tenure: cleanStr(r['Tenure']),
      tenurity: cleanStr(r['Tenurity']),
      roleFunction: cleanStr(r['Role /Function']),
      exitType: cleanStr(r['Exit Type']),
      lwd: parseDate(r['LWD']),
      resignationDate: parseDate(r['Resignation Date']),
      voluntary: cleanStr(r['Voluntary/Involutnary']),
      reason: cleanStr(r['Reason']),
      reasonsCategory: cleanStr(r['Reasons Category']),
      pgRating: cleanStr(r['PG Rating']),
      hrbp: cleanStr(r['HRBP']),
    }))
    .filter((r) => r.mmid);
}

function loadNoticePeriod(rows: Row[]): NoticePeriodRow[] {
  return rows
    .map((r) => ({
      mmid: cleanStr(r['MMID']),
      empType: cleanStr(r['Emp type']),
      name: cleanStr(r['Name']),
      grade: cleanStr(r['Grade']),
      doj: parseDate(r['DOJ']),
      exitType: cleanStr(r['Exit type']),
      resignationDate: parseDate(r['Resignation/Last seen date / Terminated date']),
      lwd: parseDate(r['LWD']),
      teamNameRaw: cleanStr(r['Team name']),
      team: cleanStr(r['Team']),
      client: cleanStr(r['Client']),
      deliveryHead: cleanStr(r['Delivery Head']),
      serviceArea: cleanStr(r['Service Area']),
      roleFunction: cleanStr(r['Role/Function']),
      tenure: cleanStr(r['Tenure']),
      hrbp: cleanStr(r['HRBP']),
      reasons: cleanStr(r['Reasons']),
      exitReasonCategory: cleanStr(r['Exit Reason Category']),
      location: cleanStr(r['Location']),
    }))
    .filter((r) => r.mmid);
}

/**
 * Exit-date resolution order for a Global Exits row, per HR:
 *   1. Confirmed LWD
 *   2. LWD
 *   3. A populated "termination withdrawal" date means the absconding/
 *      termination case was reversed -- the employee is active, not exited.
 *   4. Date of absconding
 *   5. Otherwise unresolved (no evidence either way).
 */
function resolveGlobalExitDate(r: GlobalExitRow): { date: Date | null; withdrawn: boolean } {
  const confirmed = r.confirmedLwd ?? r.lwd;
  if (confirmed) return { date: confirmed, withdrawn: false };
  if (r.terminationWithdrawalDate) return { date: null, withdrawn: true };
  if (r.dateOfAbsconding) return { date: r.dateOfAbsconding, withdrawn: false };
  return { date: null, withdrawn: false };
}

/**
 * Some employees have more than one row in Global Exits for the same MMID
 * (e.g. a withdrawn resignation attempt with blank dates, followed by the
 * real exit with an LWD). Picking whichever row happens to come first in
 * the sheet was wrong — it could lock onto the blank row and mark someone
 * "unresolved" even though a real exit record exists elsewhere in the same
 * tab. Prefer any row that actually resolves to a real exit date; among
 * those, the most recent one wins. A row that resolves to "withdrawn" beats
 * a row with nothing at all, but loses to a row with a real exit date.
 */
function bestGlobalExitByMmid(rows: GlobalExitRow[]): Map<string, GlobalExitRow> {
  const best = new Map<string, GlobalExitRow>();
  const rank = (r: GlobalExitRow) => {
    const resolved = resolveGlobalExitDate(r);
    if (resolved.date) return 2;
    if (resolved.withdrawn) return 1;
    return 0;
  };
  for (const r of rows) {
    const existing = best.get(r.mmid);
    if (!existing) {
      best.set(r.mmid, r);
      continue;
    }
    const existingRank = rank(existing);
    const candidateRank = rank(r);
    if (candidateRank > existingRank) {
      best.set(r.mmid, r);
    } else if (candidateRank === 2 && existingRank === 2) {
      const existingDate = resolveGlobalExitDate(existing).date!;
      const candidateDate = resolveGlobalExitDate(r).date!;
      if (candidateDate > existingDate) best.set(r.mmid, r);
    }
  }
  return best;
}

/** Same duplicate-row problem as Global Exits, applied to Exits-YTD (keyed off its own LWD). */
function bestExitsYtdByMmid(rows: ExitsYtdRow[]): Map<string, ExitsYtdRow> {
  const best = new Map<string, ExitsYtdRow>();
  for (const r of rows) {
    const existing = best.get(r.mmid);
    if (!existing) {
      best.set(r.mmid, r);
      continue;
    }
    if (r.lwd && (!existing.lwd || r.lwd > existing.lwd)) {
      best.set(r.mmid, r);
    }
  }
  return best;
}

/**
 * Team name -> value lookup, built from Exits-YTD and Notice Period (the only
 * two tabs that carry Client/Delivery Head at all — BUILD_SPEC.md section
 * 7.1). Used to reconstruct Client and Delivery Head for employees that
 * don't have a direct match in either tab (i.e. most active employees).
 */
function buildTeamLookup(
  exitsYtd: ExitsYtdRow[],
  noticePeriod: NoticePeriodRow[],
  pick: (r: ExitsYtdRow | NoticePeriodRow) => { team: string; value: string },
): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const r of [...exitsYtd, ...noticePeriod]) {
    const { team, value } = pick(r);
    if (team && value && !lookup.has(team)) lookup.set(team, value);
  }
  return lookup;
}

/**
 * Pure transform from raw parsed rows (however sourced) into the joined
 * DataBundle.
 *
 * The Headcount tab now lists ONLY currently-active employees — it no
 * longer carries anyone who has exited. So the full employee population for
 * date-based headcount/attrition has to be assembled from two places:
 *   1. Headcount tab -> today's active employees (always active from their
 *      DOJ onward; exitDateResolved stays null).
 *   2. Global Exits (all-time ledger, preferred) -> everyone who has ever
 *      exited, with their own DOJ and resolved exit date (Confirmed LWD,
 *      falling back to LWD). Exits-YTD fills in anyone missing from Global
 *      Exits (e.g. a very recent exit not yet in the all-time ledger).
 * isActiveAsOf() (calc.ts) then does date <= exitDateResolved as before —
 * unchanged, since that logic was already correct; only the population
 * feeding it needed to change.
 */
function buildDataBundle(raw: RawRows): DataBundle {
  const globalExits = loadGlobalExits(raw.globalExits);
  const exitsYtd = loadExitsYtd(raw.exitsYtd);
  const noticePeriod = loadNoticePeriod(raw.noticePeriod);
  // The Headcount tab is meant to hold only currently-active employees now, but stay
  // defensive: if a Status column is still present, honor it rather than assume every
  // row is active (matters for the bundled CSV fallback, which predates this change).
  const headcountRows = raw.headcount.filter((r) => {
    if (!cleanStr(r['Mediamint id'])) return false;
    const status = cleanStr(r['Status']);
    return !status || status === 'Active';
  });

  const exitsYtdByMmid = bestExitsYtdByMmid(exitsYtd);
  const globalExitsByMmid = bestGlobalExitByMmid(globalExits);

  const teamClientLookup = buildTeamLookup(exitsYtd, noticePeriod, (r) => ({ team: r.team, value: r.client }));
  const teamDeliveryHeadLookup = buildTeamLookup(exitsYtd, noticePeriod, (r) => ({
    team: r.team,
    value: r.deliveryHead,
  }));

  const employees: Employee[] = [];
  const seenMmids = new Set<string>();

  // 1. Active employees, straight from the Headcount tab.
  for (const r of headcountRows) {
    const mmid = cleanStr(r['Mediamint id']);
    if (!mmid || seenMmids.has(mmid)) continue;
    seenMmids.add(mmid);

    const teamName = cleanStr(r['Team name']);
    // Prefer a direct Client column on Headcount itself, if the sheet has one — the
    // team-name lookup below only exists as a fallback reconstruction for when it doesn't.
    const directClient = cleanStr(r['Client']);
    const client = directClient || teamClientLookup.get(teamName) || null;
    const clientSource: Employee['clientSource'] = directClient ? 'direct' : client ? 'lookup' : null;
    const billingType = cleanStr(r['Billing Type']) || null;
    const deliveryHead = teamDeliveryHeadLookup.get(teamName) ?? null;
    const ey = exitsYtdByMmid.get(mmid);

    employees.push({
      mmid,
      name: cleanStr(r['Full name']),
      gender: cleanStr(r['Gender']),
      designation: cleanStr(r['Designation']),
      employeeType: cleanStr(r['Employee type']),
      teamName,
      status: 'Active',
      doj: parseDate(r['Date Of Joining/Permanent']),
      grade: cleanStr(r['Grade']),
      hrbp: cleanStr(r['HRBP']),
      serviceArea: cleanStr(r['Service Area']),
      jobLocation: cleanStr(r['Job Location']),
      country: cleanStr(r['Country']),
      contractEndDate: cleanStr(r['Contract End Date']),
      resourceCapability: cleanStr(r['Resource Capability']),
      client,
      clientSource,
      billingType,
      exitDateResolved: null,
      exitSource: null,
      exitUnresolved: false,
      deliveryHead: ey?.deliveryHead || deliveryHead,
      reasonsCategory: ey?.reasonsCategory ?? null,
      voluntary: ey?.voluntary ?? null,
      pgRating: ey?.pgRating ?? null,
      tenurity: ey?.tenurity ?? null,
    });
  }

  let unresolvedCount = 0;
  let totalInactive = 0;

  // 2. Exited employees, from Global Exits (all-time, preferred source for DOJ + exit date).
  //    Uses the best (most-complete) row per MMID — see bestGlobalExitByMmid.
  for (const r of globalExitsByMmid.values()) {
    if (seenMmids.has(r.mmid)) continue;
    const resolved = resolveGlobalExitDate(r);
    // A withdrawn absconding/termination case is not an exit at all -- skip it entirely
    // (it's neither counted active here nor flagged as an unresolved exit).
    if (resolved.withdrawn) continue;
    seenMmids.add(r.mmid);
    totalInactive += 1;

    const ey = exitsYtdByMmid.get(r.mmid);
    const doj = r.doj ?? ey?.doj ?? null;
    const exitDateResolved = resolved.date ?? ey?.lwd ?? null;
    const exitUnresolved = !doj || !exitDateResolved;
    if (exitUnresolved) unresolvedCount += 1;

    const client = ey?.client || teamClientLookup.get(r.teamName) || null;
    const deliveryHead = ey?.deliveryHead || teamDeliveryHeadLookup.get(r.teamName) || null;

    employees.push({
      mmid: r.mmid,
      name: r.memberName,
      gender: '',
      designation: '',
      employeeType: '',
      teamName: r.teamName,
      status: 'InActive',
      doj,
      grade: r.grade || ey?.grade || '',
      hrbp: r.hrbp,
      serviceArea: r.serviceArea || ey?.serviceArea || '',
      jobLocation: r.jobLocation,
      country: ey?.country ?? '',
      contractEndDate: '',
      resourceCapability: '',
      client,
      clientSource: client ? 'lookup' : null,
      billingType: null,
      exitDateResolved,
      exitSource: 'global',
      exitUnresolved,
      deliveryHead,
      reasonsCategory: ey?.reasonsCategory ?? null,
      voluntary: ey?.voluntary ?? null,
      pgRating: ey?.pgRating ?? null,
      tenurity: ey?.tenurity ?? null,
    });
  }

  // 3. Exited employees present only in Exits-YTD (not yet in Global Exits — e.g. very recent).
  for (const r of exitsYtdByMmid.values()) {
    if (seenMmids.has(r.mmid)) continue;
    seenMmids.add(r.mmid);
    totalInactive += 1;

    const exitDateResolved = r.lwd;
    const exitUnresolved = !r.doj || !exitDateResolved;
    if (exitUnresolved) unresolvedCount += 1;

    const client = r.client || teamClientLookup.get(r.team) || null;

    employees.push({
      mmid: r.mmid,
      name: r.name,
      gender: '',
      designation: '',
      employeeType: '',
      teamName: r.team,
      status: 'InActive',
      doj: r.doj,
      grade: r.grade,
      hrbp: r.hrbp,
      serviceArea: r.serviceArea,
      jobLocation: '',
      country: r.country,
      contractEndDate: '',
      resourceCapability: '',
      client,
      clientSource: client ? 'lookup' : null,
      billingType: null,
      exitDateResolved,
      exitSource: 'exits_ytd',
      exitUnresolved,
      deliveryHead: r.deliveryHead || null,
      reasonsCategory: r.reasonsCategory || null,
      voluntary: r.voluntary || null,
      pgRating: r.pgRating || null,
      tenurity: r.tenurity || null,
    });
  }

  const activeEmployees = employees.filter((e) => e.status === 'Active');
  const clientCoverage = {
    direct: activeEmployees.filter((e) => e.clientSource === 'direct').length,
    lookup: activeEmployees.filter((e) => e.clientSource === 'lookup').length,
    total: activeEmployees.length,
  };
  const billingTypeKnown = activeEmployees.filter((e) => e.billingType).length;

  return {
    employees,
    globalExits,
    exitsYtd,
    noticePeriod,
    unresolvedCount,
    totalInactive,
    clientCoverage,
    billingTypeKnown,
    source: raw.source,
  };
}

function loadBundledCsvRows(): RawRows {
  return {
    headcount: parseCsv<Row>(headcountRaw),
    exitsYtd: parseCsv<Row>(exitsYtdRaw),
    noticePeriod: parseCsv<Row>(noticePeriodRaw),
    globalExits: parseCsv<Row>(globalExitsRaw),
    source: 'bundled',
  };
}

/** Tries the live Google Sheets API endpoint first (see api/sheets-data.ts); falls back to the bundled CSV snapshot if it's unavailable (e.g. local `vite dev` without `vercel dev`, or sheets not configured yet). */
async function loadRawRows(): Promise<RawRows> {
  try {
    const res = await fetch('/api/sheets-data', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`sheets-data ${res.status}`);
    const json = (await res.json()) as Omit<RawRows, 'source'>;
    return { ...json, source: 'live' };
  } catch {
    return loadBundledCsvRows();
  }
}

export async function loadDataBundle(): Promise<DataBundle> {
  const raw = await loadRawRows();
  return buildDataBundle(raw);
}
