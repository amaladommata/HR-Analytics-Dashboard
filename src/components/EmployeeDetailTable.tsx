import { useState } from 'react';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';
import type { Employee } from '../lib/types';
import { toCsv, downloadCsv } from '../lib/csv';

const COLUMNS: { header: string; get: (e: Employee) => string }[] = [
  { header: 'MMID', get: (e) => e.mmid },
  { header: 'Name', get: (e) => e.name },
  { header: 'Status', get: (e) => e.status },
  { header: 'Client', get: (e) => e.client ?? '' },
  { header: 'Delivery Head', get: (e) => e.deliveryHead ?? '' },
  { header: 'Billing Type', get: (e) => e.billingType ?? '' },
  { header: 'PG Rating', get: (e) => e.pgRating ?? '' },
  { header: 'Team', get: (e) => e.teamName },
  { header: 'Grade', get: (e) => e.grade },
  { header: 'Service Area', get: (e) => e.serviceArea },
  { header: 'Country', get: (e) => e.country },
  { header: 'Gender', get: (e) => e.gender },
  { header: 'Employee Type', get: (e) => e.employeeType },
  { header: 'DOJ', get: (e) => (e.doj ? e.doj.toLocaleDateString() : '') },
  { header: 'Exit Date', get: (e) => (e.exitDateResolved ? e.exitDateResolved.toLocaleDateString() : '') },
  { header: 'Exit Reason', get: (e) => e.reasonsCategory ?? '' },
  { header: 'Voluntary/Involuntary', get: (e) => e.voluntary ?? '' },
];

interface EmployeeDetailTableProps {
  title: string;
  employees: Employee[];
  filenamePrefix: string;
}

/** Full employee-level detail, collapsed by default (this can be a lot of rows) with a CSV export that always includes every matching row, not just what's currently rendered on screen. */
export function EmployeeDetailTable({ title, employees, filenamePrefix }: EmployeeDetailTableProps) {
  const [open, setOpen] = useState(false);
  const VISIBLE_ROWS = 50;

  const exportCsv = () => {
    const csv = toCsv(
      COLUMNS.map((c) => c.header),
      employees.map((e) => COLUMNS.map((c) => c.get(e))),
    );
    downloadCsv(`${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3.5"
      >
        <span className="text-sm font-bold text-slate-800">
          {title} <span className="font-normal text-slate-400">({employees.length.toLocaleString()})</span>
        </span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100">
          <div className="flex items-center justify-end px-4 py-2">
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              <Download size={13} />
              Download CSV ({employees.length.toLocaleString()} rows)
            </button>
          </div>
          <div className="max-h-[500px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c.header} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.slice(0, VISIBLE_ROWS).map((e) => (
                  <tr key={e.mmid} className="hover:bg-slate-50">
                    {COLUMNS.map((c) => (
                      <td key={c.header} className="whitespace-nowrap px-3 py-1.5 text-slate-700">
                        {c.get(e) || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {employees.length > VISIBLE_ROWS && (
              <p className="px-4 py-2 text-xs text-slate-400">
                Showing first {VISIBLE_ROWS} of {employees.length.toLocaleString()} — download the CSV for
                the full list.
              </p>
            )}
            {employees.length === 0 && <p className="px-4 py-3 text-xs text-slate-400">No employees match the current filters.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
