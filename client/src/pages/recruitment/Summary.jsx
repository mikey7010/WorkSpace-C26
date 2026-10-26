// Recruitment Management → Summary (mirrors the SUMMARY worksheet; all numbers calculated from candidates)
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { PageTitle, Btn, Filters, useMeta, useToast, toQuery, downloadExport, errMsg, Loader, ErrorBox } from './shared';

const COLS = [
  ['hod', 'HOD', 'text-indigo-300'], ['selected', 'HR', 'text-emerald-300'], ['sourcing', 'Sourcing'], ['onboarding', 'Onboarding'],
  ['offer_issued', 'Offer Issued'], ['joining', 'Joining Date'], ['on_hold', 'On Hold', 'text-orange-300'], ['joined', 'Actually Joined', 'text-emerald-300'],
  ['balance', 'Balance', 'text-red-300'], ['pendingAllocation', 'Pending Allocation', 'text-amber-300'],
];

export default function Summary() {
  const navigate = useNavigate();
  const { meta, error: metaErr } = useMeta();
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const { show, node } = useToast();

  const load = useCallback(() => api.get(`/hiring/summary${toQuery(filters)}`).then(r => { setData(r.data); setErr(null); }).catch(e => setErr(errMsg(e))), [filters]);
  useEffect(() => { load(); }, [load]);

  if (metaErr) return <div className="p-7"><ErrorBox text={metaErr} /></div>;
  if (!meta || !data) return <Loader />;
  const c = data.cards;

  const cards = [
    ['Total Workers Required', c.hod, 'text-white'], ['Total HR-Selected', c.selected, 'text-emerald-400'], ['Currently in Sourcing', c.sourcing, 'text-blue-300'],
    ['Currently in Onboarding', c.onboarding, 'text-violet-300'], ['Offers Issued', c.offer_issued, 'text-amber-300'], ['At Joining Date', c.joining, 'text-cyan-300'],
    ['Actual Joined', c.joined, 'text-emerald-400'], ['Remaining Requirement', c.balance, 'text-red-300'],
  ];

  return (
    <div className="p-7 space-y-5 max-w-[1600px] mx-auto">
      <PageTitle title="Recruitment Summary" subtitle="Month-wise requirement vs. progress. Every figure is calculated live from candidate records — there is no separate copy to maintain.">
        <Btn kind="ghost" onClick={() => setShowRules(s => !s)}>Counting rules</Btn>
        <Btn kind="ghost" onClick={() => window.print()}>Print</Btn>
        <Btn onClick={() => downloadExport('summary', filters).catch(e => show(errMsg(e), 'err'))}>Export Excel</Btn>
      </PageTitle>

      {showRules && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 text-xs text-slate-300 space-y-1">
          {data.rules.map(r => <p key={r}>• {r}</p>)}
        </div>
      )}

      <Filters meta={meta} value={filters} onChange={setFilters} show={['year', 'month', 'dept', 'position', 'departmentId', 'ownerId', 'stage']} />
      {err && <ErrorBox text={err} />}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {cards.map(([l, v, cl]) => (
          <div key={l} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-slate-400">{l}</p>
            <p className={`text-2xl font-black mt-1 ${cl}`}>{v.toLocaleString()}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">Pending allocation (still to be selected by HR): <b className="text-amber-300">{c.pendingAllocation}</b> · Remaining requirement = HOD − actually joined.</p>

      {data.sections.map(sec => (
        <div key={sec.month} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-slate-800/60 border-b border-slate-800">
            <h3 className="text-sm font-black text-white">{sec.label}</h3>
            <span className="text-[11px] text-slate-400">{sec.rows.length} positions · HOD {sec.totals.hod} · HR {sec.totals.selected} · Joined {sec.totals.joined}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left px-3 py-2 font-bold">Department</th>
                  <th className="text-left px-3 py-2 font-bold">Position</th>
                  <th className="px-2 py-2 font-bold">No. of Workers Needed</th>
                  {COLS.map(([k, l, cl]) => <th key={k} className={`px-2 py-2 font-bold ${cl || ''}`}>{l}</th>)}
                  <th className="text-left px-3 py-2 font-bold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {sec.rows.map(r => (
                  <tr key={r.positionId} onClick={() => navigate(`/recruitment/candidates?positionId=${r.positionId}&month=${sec.month}`)} className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer">
                    <td className="px-3 py-2 text-indigo-300 font-semibold max-w-[220px] truncate" title={r.dept}>{r.dept}</td>
                    <td className="px-3 py-2 text-white font-semibold">{r.position}</td>
                    <td className="px-2 py-2 text-center text-white">{r.totalNeed}</td>
                    {COLS.map(([k, , cl]) => <td key={k} className={`px-2 py-2 text-center font-bold ${r.counts[k] ? (cl || 'text-white') : 'text-slate-600'}`}>{r.counts[k] || '–'}</td>)}
                    <td className="px-3 py-2 text-slate-400 max-w-[260px] truncate" title={r.remarks || ''}>{r.remarks}</td>
                  </tr>
                ))}
                <tr className="bg-slate-800/40 font-black">
                  <td className="px-3 py-2 text-white" colSpan={3}>TOTAL — {sec.label}</td>
                  {COLS.map(([k, , cl]) => <td key={k} className={`px-2 py-2 text-center ${cl || 'text-white'}`}>{sec.totals[k]}</td>)}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {!data.sections.length && <ErrorBox text="No months match these filters." />}
      {node}
    </div>
  );
}
