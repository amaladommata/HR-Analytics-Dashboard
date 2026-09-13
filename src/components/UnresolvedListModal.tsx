import { X } from 'lucide-react';
import type { Employee } from '../lib/types';

interface UnresolvedListModalProps {
  employees: Employee[];
  onClose: () => void;
}

export function UnresolvedListModal({ employees, onClose }: UnresolvedListModalProps) {
  const rows = employees.filter((e) => e.exitUnresolved);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              {rows.length} employees with no matching exit record
            </h3>
            <p className="text-xs text-slate-500">
              InActive, but no Confirmed LWD / LWD in Global Exits or Exits-YTD — excluded from headcount.
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2 font-medium">MMID</th>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Team</th>
                <th className="px-5 py-2 font-medium">Grade</th>
                <th className="px-5 py-2 font-medium">DOJ</th>
                <th className="px-5 py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((e) => (
                <tr key={e.mmid} className="hover:bg-slate-50">
                  <td className="px-5 py-2 font-mono text-xs text-slate-600">{e.mmid}</td>
                  <td className="px-5 py-2 text-slate-800">{e.name || '—'}</td>
                  <td className="px-5 py-2 text-slate-600">{e.teamName || '—'}</td>
                  <td className="px-5 py-2 text-slate-600">{e.grade || '—'}</td>
                  <td className="px-5 py-2 text-slate-600">{e.doj ? e.doj.toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-2 text-slate-400">{e.exitSource ?? 'headcount only'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                    None — every InActive record resolved.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
