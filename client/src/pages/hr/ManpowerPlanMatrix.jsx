import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';

const STATUS_CONFIG = {
  appointed:   { label: 'Appointed (1st Wave)', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  pending_doi: { label: 'Pending Johnny DOI',   bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  sourcing:    { label: 'Sourcing in Progress', bg: 'bg-red-500/20 text-red-300 border-red-500/30' },
  discussion:  { label: 'Discuss with HOD',     bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  planned:     { label: 'Planned Wave',         bg: 'bg-slate-800 text-slate-400 border-slate-700' },
};

export default function ManpowerPlanMatrix() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm]     = useState('');
  const [editingRow, setEditingRow]     = useState(null);

  function loadPlan() {
    api.get('/manpower-plan')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPlan(); }, []);

  async function handleUpdateRow(e) {
    e.preventDefault();
    if (!editingRow) return;
    try {
      await api.put(`/manpower-plan/${editingRow.id}`, {
        status: editingRow.status,
        remarks: editingRow.remarks,
        appointedNames: editingRow.appointedNames,
      });
      setEditingRow(null);
      loadPlan();
    } catch (err) {
      alert('Failed to update row');
    }
  }

  function exportCSV() {
    if (!data?.rows) return;
    const header = 'Dept,Position,Total,Sep,Oct,Nov,Dec,Jan,Feb,Mar,Apr,May,Status,Remarks,Appointed';
    const rows = data.rows.map(r =>
      `"${r.dept}","${r.position}",${r.plannedTotal},${r.sep},${r.oct},${r.nov},${r.dec},${r.jan},${r.feb},${r.mar},${r.apr},${r.may},"${r.status}","${r.remarks || ''}","${r.appointedNames || ''}"`
    );
    const csv = [header, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'C26_Master_Manpower_Plan.csv';
    a.click();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>;
  }

  const allDepts = Array.from(new Set((data?.rows || []).map(r => r.dept)));

  const filteredRows = (data?.rows || []).filter(r => {
    if (deptFilter !== 'all' && r.dept !== deptFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchPos  = r.position.toLowerCase().includes(q);
      const matchDept = r.dept.toLowerCase().includes(q);
      const matchRem  = (r.remarks || '').toLowerCase().includes(q);
      const matchName = (r.appointedNames || '').toLowerCase().includes(q);
      if (!matchPos && !matchDept && !matchRem && !matchName) return false;
    }
    return true;
  });

  const chartData = [
    { month: 'Sep', count: data?.totals?.sep || 0 },
    { month: 'Oct', count: data?.totals?.oct || 0 },
    { month: 'Nov', count: data?.totals?.nov || 0 },
    { month: 'Dec', count: data?.totals?.dec || 0 },
    { month: 'Jan', count: data?.totals?.jan || 0 },
    { month: 'Feb', count: data?.totals?.feb || 0 },
    { month: 'Mar', count: data?.totals?.mar || 0 },
    { month: 'Apr', count: data?.totals?.apr || 0 },
    { month: 'May', count: data?.totals?.may || 0 },
  ];

  return (
    <div className="p-7 space-y-7 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Company C26 Master Plan</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">C26 Master Headcount & Deployment Schedule</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full ramp-up matrix: 1,157 planned positions across Assembly, Cutting, Printing, Stockfitting, IP Injection, QC, ME & GAP Admin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="text-xs px-3.5 py-2.5 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Sheet (CSV)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Planned Headcount</span>
          <p className="text-3xl font-extrabold text-white">{data?.totals?.plannedTotal} <span className="text-xs font-normal text-slate-400">positions</span></p>
          <p className="text-[11px] text-slate-400 mt-1">Across 87 role specifications</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Appointed (1st Wave)</span>
          <p className="text-3xl font-extrabold text-emerald-400">{data?.appointedCount} <span className="text-xs font-normal text-slate-400">leaders</span></p>
          <p className="text-[11px] text-emerald-400/80 mt-1">Tamil selvan, Rajasekar, Manogar, Mohan Raj, etc.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Pending Johnny DOI</span>
          <p className="text-3xl font-extrabold text-amber-400">{data?.pendingDoiCount} <span className="text-xs font-normal text-slate-400">roles</span></p>
          <p className="text-[11px] text-amber-400/80 mt-1">GAP Regional Exec Assistants (Target: 27.10)</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Active Sourcing Stage</span>
          <p className="text-3xl font-extrabold text-red-400">{data?.sourcingCount} <span className="text-xs font-normal text-slate-400">roles</span></p>
          <p className="text-[11px] text-red-400/80 mt-1">ME Manager, QC Supervisor, QC Assistant</p>
        </div>
      </div>

      {/* Ramp-up Curve */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-white">Monthly Deployment Schedule Ramp-Up</h3>
            <p className="text-xs text-slate-400">Planned joinings per wave: Sep to May (Peak in March: 494 headcount validation)</p>
          </div>
          <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-lg font-semibold">
            Validation Milestone: 1st Week of March
          </span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
            <Bar dataKey="count" name="Headcount Joining" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by position, appointed candidate name (e.g. Tamil, Rajasekar)..."
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400">Department:</label>
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Departments ({allDepts.length})</option>
            {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400">Status:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="appointed">Appointed (1st Wave)</option>
            <option value="pending_doi">Pending Johnny DOI</option>
            <option value="sourcing">Sourcing</option>
            <option value="discussion">Discuss with HOD</option>
            <option value="planned">Planned</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 ml-auto font-medium">{filteredRows.length} rows matched</span>
      </div>

      {/* Master Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5 text-left">Department</th>
                <th className="py-3 px-3.5 text-left">Position</th>
                <th className="py-3 px-2 text-center text-white bg-indigo-900/40">Total</th>
                <th className="py-3 px-2 text-center">Sep</th>
                <th className="py-3 px-2 text-center bg-emerald-950/30 text-emerald-300">Oct</th>
                <th className="py-3 px-2 text-center">Nov</th>
                <th className="py-3 px-2 text-center">Dec</th>
                <th className="py-3 px-2 text-center">Jan</th>
                <th className="py-3 px-2 text-center">Feb</th>
                <th className="py-3 px-2 text-center bg-blue-950/30 text-blue-300">Mar (Val)</th>
                <th className="py-3 px-2 text-center">Apr</th>
                <th className="py-3 px-2 text-center">May</th>
                <th className="py-3 px-3.5 text-left">Status & Remarks</th>
                <th className="py-3 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRows.map(row => {
                const conf = STATUS_CONFIG[row.status] || STATUS_CONFIG.planned;
                const isAppointed = row.status === 'appointed';
                const isPendingDoi = row.status === 'pending_doi';
                const isSourcing   = row.status === 'sourcing';

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isAppointed ? 'bg-emerald-950/[0.04]' : isPendingDoi ? 'bg-amber-950/[0.06]' : isSourcing ? 'bg-red-950/[0.06]' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3.5 font-bold text-white max-w-[180px] truncate" title={row.dept}>
                      {row.dept}
                    </td>
                    <td className="py-2.5 px-3.5 font-medium text-slate-300 max-w-[200px] truncate" title={row.position}>
                      {row.position}
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-white bg-indigo-950/20">
                      {row.plannedTotal}
                    </td>
                    <td className={`py-2.5 px-2 text-center ${row.sep > 0 ? 'font-bold text-purple-300 bg-purple-950/30' : 'text-slate-600'}`}>{row.sep || '—'}</td>
                    <td className={`py-2.5 px-2 text-center ${row.oct > 0 ? 'font-black text-emerald-300 bg-emerald-950/40' : 'text-slate-600'}`}>{row.oct || '—'}</td>
                    <td className={`py-2.5 px-2 text-center ${row.nov > 0 ? 'font-bold text-cyan-300 bg-cyan-950/30' : 'text-slate-600'}`}>{row.nov || '—'}</td>
                    <td className={`py-2.5 px-2 text-center ${row.dec > 0 ? 'font-bold text-indigo-300 bg-indigo-950/30' : 'text-slate-600'}`}>{row.dec || '—'}</td>
                    <td className={`py-2.5 px-2 text-center ${row.jan > 0 ? 'font-bold text-white' : 'text-slate-600'}`}>{row.jan || '—'}</td>
                    <td className={`py-2.5 px-2 text-center ${row.feb > 0 ? 'font-bold text-white' : 'text-slate-600'}`}>{row.feb || '—'}</td>
                    <td className={`py-2.5 px-2 text-center ${row.mar > 0 ? 'font-black text-blue-300 bg-blue-950/30' : 'text-slate-600'}`}>{row.mar || '—'}</td>
                    <td className={`py-2.5 px-2 text-center ${row.apr > 0 ? 'font-bold text-white' : 'text-slate-600'}`}>{row.apr || '—'}</td>
                    <td className={`py-2.5 px-2 text-center ${row.may > 0 ? 'font-bold text-white' : 'text-slate-600'}`}>{row.may || '—'}</td>
                    <td className="py-2.5 px-3.5 max-w-[280px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${conf.bg}`}>
                          {conf.label}
                        </span>
                        {row.appointedNames && (
                          <span className="text-[10px] font-bold text-emerald-400">
                            👤 {row.appointedNames}
                          </span>
                        )}
                      </div>
                      {row.remarks && (
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate" title={row.remarks}>
                          {row.remarks}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => setEditingRow(row)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Edit Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && setEditingRow(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-white">Update Headcount Row</h3>
            <p className="text-xs text-slate-400">
              <strong className="text-white">{editingRow.dept}</strong> — {editingRow.position} ({editingRow.plannedTotal} Planned)
            </p>

            <form onSubmit={handleUpdateRow} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Status</label>
                <select
                  value={editingRow.status}
                  onChange={e => setEditingRow(r=>({...r, status: e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                >
                  <option value="appointed">Appointed (1st Wave)</option>
                  <option value="pending_doi">Pending Johnny DOI</option>
                  <option value="sourcing">Sourcing in Progress</option>
                  <option value="discussion">To be discussed with HOD</option>
                  <option value="planned">Planned</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Appointed Candidate Name(s)</label>
                <input
                  value={editingRow.appointedNames || ''}
                  onChange={e => setEditingRow(r=>({...r, appointedNames: e.target.value}))}
                  placeholder="e.g. Tamil selvan, Manogar..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={editingRow.remarks || ''}
                  onChange={e => setEditingRow(r=>({...r, remarks: e.target.value}))}
                  placeholder="e.g. Need Johnny DOI OF Candidate- 27.10.2026..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setEditingRow(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">Save Row</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
