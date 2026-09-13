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

/** Pure transform from raw parsed rows (however sourced) into the joined DataBundle. */
function buildDataBundle(raw: RawRows): DataBundle {
  const globalExits = loadGlobalExits(raw.globalExits);
  const exitsYtd = loadExitsYtd(raw.exitsYtd);
  const noticePeriod = loadNoticePeriod(raw.noticePeriod);
  const headcountRows = raw.headcount.filter((r) => cleanStr(r['Mediamint id']));

  const globalByMmid = new Map<string, GlobalExitRow>();
  for (const r of globalExits) if (!globalByMmid.has(r.mmid)) globalByMmid.set(r.mmid, r);

  const exitsYtdByMmid = new Map<string, ExitsYtdRow>();
  for (const r of exitsYtd) if (!exitsYtdByMmid.has(r.mmid)) exitsYtdByMmid.set(r.mmid, r);

  const teamClientLookup = buildTeamClientLookup(exitsYtd, noticePeriod);

  let unresolvedCount = 0;
  let totalInactive = 0;

  const employees: Employee[] = headcountRows.map((r) => {
    const mmid = cleanStr(r['Mediamint id']);
    const status = cleanStr(r['Status']) === 'Active' ? 'Active' : 'InActive';
    const teamName = cleanStr(r['Team name']);

    let exitDateResolved: Date | null = null;
    let exitSource: Employee['exitSource'] = null;
    let exitUnresolved = false;

    if (status === 'InActive') {
      totalInactive += 1;
      const ge = globalByMmid.get(mmid);
      const ey = exitsYtdByMmid.get(mmid);
      if (ge) {
        exitDateResolved = ge.confirmedLwd ?? ge.lwd;
        exitSource = 'global';
      } else if (ey) {
        exitDateResolved = ey.lwd;
        exitSource = 'exits_ytd';
      }
      if (!exitDateResolved) {
        exitUnresolved = true;
        unresolvedCount += 1;
      }
    }

    const client = teamClientLookup.get(teamName) ?? null;
    const ey = exitsYtdByMmid.get(mmid);

    return {
      mmid,
      name: cleanStr(r['Full name']),
      gender: cleanStr(r['Gender']),
      designation: cleanStr(r['Designation']),
      employeeType: cleanStr(r['Employee type']),
      teamName,
      status,
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
      exitDateResolved,
      exitSource,
      exitUnresolved,
      deliveryHead: ey?.deliveryHead ?? null,
      reasonsCategory: ey?.reasonsCategory ?? null,
      voluntary: ey?.voluntary ?? null,
    };
  });

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
