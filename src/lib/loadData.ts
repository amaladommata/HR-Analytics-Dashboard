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

/** Team name -> Client lookup, built from Exits-YTD and Notice Period (BUILD_SPEC.md section 7.1). */
function buildTeamClientLookup(
  exitsYtd: ExitsYtdRow[],
  noticePeriod: NoticePeriodRow[],
): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const r of exitsYtd) {
    if (r.team && r.client && !lookup.has(r.team)) lookup.set(r.team, r.client);
  }
  for (const r of noticePeriod) {
    if (r.team && r.client && !lookup.has(r.team)) lookup.set(r.team, r.client);
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

  const exitsYtdByMmid = new Map<string, ExitsYtdRow>();
  for (const r of exitsYtd) if (!exitsYtdByMmid.has(r.mmid)) exitsYtdByMmid.set(r.mmid, r);

  const teamClientLookup = buildTeamClientLookup(exitsYtd, noticePeriod);

  const employees: Employee[] = [];
  const seenMmids = new Set<string>();

  // 1. Active employees, straight from the Headcount tab.
  for (const r of headcountRows) {
    const mmid = cleanStr(r['Mediamint id']);
    if (!mmid || seenMmids.has(mmid)) continue;
    seenMmids.add(mmid);

    const teamName = cleanStr(r['Team name']);
    const client = teamClientLookup.get(teamName) ?? null;
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
      clientSource: client ? 'lookup' : null,
      exitDateResolved: null,
      exitSource: null,
      exitUnresolved: false,
      deliveryHead: ey?.deliveryHead ?? null,
      reasonsCategory: ey?.reasonsCategory ?? null,
      voluntary: ey?.voluntary ?? null,
      pgRating: ey?.pgRating ?? null,
      tenurity: ey?.tenurity ?? null,
    });
  }

  let unresolvedCount = 0;
  let totalInactive = 0;

  // 2. Exited employees, from Global Exits (all-time, preferred source for DOJ + exit date).
  for (const r of globalExits) {
    if (seenMmids.has(r.mmid)) continue;
    seenMmids.add(r.mmid);
    totalInactive += 1;

    const ey = exitsYtdByMmid.get(r.mmid);
    const doj = r.doj ?? ey?.doj ?? null;
    const exitDateResolved = r.confirmedLwd ?? r.lwd ?? ey?.lwd ?? null;
    const exitUnresolved = !doj || !exitDateResolved;
    if (exitUnresolved) unresolvedCount += 1;

    const client = ey?.client || teamClientLookup.get(r.teamName) || null;

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
      exitDateResolved,
      exitSource: 'global',
      exitUnresolved,
      deliveryHead: ey?.deliveryHead ?? null,
      reasonsCategory: ey?.reasonsCategory ?? null,
      voluntary: ey?.voluntary ?? null,
      pgRating: ey?.pgRating ?? null,
      tenurity: ey?.tenurity ?? null,
    });
  }

  // 3. Exited employees present only in Exits-YTD (not yet in Global Exits — e.g. very recent).
  for (const r of exitsYtd) {
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

  const mappedTeams = new Set(
    employees.filter((e) => e.status === 'Active' && e.client).map((e) => e.teamName),
  );
  const totalActiveTeams = new Set(
    employees.filter((e) => e.status === 'Active').map((e) => e.teamName),
  );

  return {
    employees,
    globalExits,
    exitsYtd,
    noticePeriod,
    unresolvedCount,
    totalInactive,
    teamClientCoverage: { mapped: mappedTeams.size, total: totalActiveTeams.size },
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
