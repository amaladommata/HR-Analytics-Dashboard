export type ExitSource = 'global' | 'exits_ytd' | null;

export interface Employee {
  mmid: string;
  name: string;
  gender: string;
  designation: string;
  employeeType: string;
  teamName: string;
  status: 'Active' | 'InActive';
  doj: Date | null;
  grade: string;
  hrbp: string;
  serviceArea: string;
  jobLocation: string;
  country: string;
  contractEndDate: string;
  resourceCapability: string;

  client: string | null;
  clientSource: 'lookup' | null;

  exitDateResolved: Date | null;
  exitSource: ExitSource;
  exitUnresolved: boolean;

  deliveryHead: string | null;
  reasonsCategory: string | null;
  voluntary: string | null;
  pgRating: string | null;
  tenurity: string | null;
}

export interface GlobalExitRow {
  mmid: string;
  memberName: string;
  teamName: string;
  employeeStatus: string;
  exitType: string;
  reason: string;
  dateOfResignation: Date | null;
  lwd: Date | null;
  confirmedLwd: Date | null;
  hrbp: string;
  doj: Date | null;
  serviceArea: string;
  grade: string;
  jobLocation: string;
}

export interface ExitsYtdRow {
  mmid: string;
  name: string;
  status: string;
  doj: Date | null;
  grade: string;
  team: string;
  client: string;
  project: string;
  businessGroup: string;
  deliveryHead: string;
  country: string;
  serviceArea: string;
  tenure: string;
  tenurity: string;
  roleFunction: string;
  exitType: string;
  lwd: Date | null;
  resignationDate: Date | null;
  voluntary: string;
  reason: string;
  reasonsCategory: string;
  pgRating: string;
  hrbp: string;
}

export interface NoticePeriodRow {
  mmid: string;
  empType: string;
  name: string;
  grade: string;
  doj: Date | null;
  exitType: string;
  resignationDate: Date | null;
  lwd: Date | null;
  teamNameRaw: string;
  team: string;
  client: string;
  deliveryHead: string;
  serviceArea: string;
  roleFunction: string;
  tenure: string;
  hrbp: string;
  reasons: string;
  exitReasonCategory: string;
  location: string;
}

/** Each dimension is a set of selected values (OR within a dimension); an empty array means "All". */
export interface Filters {
  client: string[];
  country: string[];
  grade: string[];
  serviceArea: string[];
  gender: string[];
  employeeType: string[];
  teamName: string[];
  reasonsCategory: string[];
  voluntary: string[];
  deliveryHead: string[];
}

export interface DataBundle {
  employees: Employee[];
  globalExits: GlobalExitRow[];
  exitsYtd: ExitsYtdRow[];
  noticePeriod: NoticePeriodRow[];
  unresolvedCount: number;
  totalInactive: number;
  teamClientCoverage: { mapped: number; total: number };
  /** 'live' = read from Google Sheets just now; 'bundled' = fell back to the CSV snapshot baked into the build. */
  source: 'live' | 'bundled';
}
