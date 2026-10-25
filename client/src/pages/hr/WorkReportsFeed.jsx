import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/Layout';

export default function WorkReportsFeed() {
  const { user } = useAuth();
  const [logs, setLogs]               = useState([]);
  const [departments, setDepartments] = useState([]);
  const [deptFilter, setDeptFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading]         = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);

  const [form, setForm] = useState({
    departmentId: '',
    shift: 'Day Shift',
    targetOutput: 3000,
    actualOutput: 2900,
    manpowerPresent: 25,
    manpowerRequired: 28,
    status: 'On Schedule',
    blockers: '',
    notes: '',
  });

  function fetchData() {
    Promise.all([api.get('/worklogs'), api.get('/departments')])
      .then(([l, d]) => {
        setLogs(l.data);
        setDepartments(d.data);
        if (user?.departmentId && !form.departmentId) {
          setForm(f => ({ ...f, departmentId: user.departmentId }));
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  async function handleSubmitLog(e) {
    e.preventDefault();
    try {
      await api.post('/worklogs', {
        ...form,
        departmentId: parseInt(form.departmentId),
        targetOutput: parseInt(form.targetOutput),
        actualOutput: parseInt(form.actualOutput),
        manpowerPresent: parseInt(form.manpowerPresent),
        manpowerRequired: parseInt(form.manpowerRequired),
      });
      setShowLogModal(false);
      setForm({
        departmentId: user?.departmentId || '',
        shift: 'Day Shift',
        targetOutput: 3000,
        actualOutput: 2900,
        manpowerPresent: 25,
        manpowerRequired: 28,
        status: 'On Schedule',
        blockers: '',
        notes: '',
      });
      fetchData();
    } catch (err) {
      alert('Failed to submit work report');
    }
  }

  const filteredLogs = logs.filter(l => {
    if (deptFilter !== 'all' && l.departmentId !== parseInt(deptFilter)) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="p-7 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Cross-Department Daily Work Reports</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time feed of shift output, attendance counts, and blocker reports submitted by all 10 Department Heads.
          </p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="text-xs px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
        >
          + Submit Daily Work Report
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400">Department:</label>
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All 10 Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400">Status:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="On Schedule">On Schedule</option>
            <option value="Ahead">Ahead</option>
            <option value="Delayed">Delayed / Bottleneck</option>
            <option value="Halted">Halted</option>
          </select>
        </div>
        <span className="text-xs text-slate-500 ml-auto">{filteredLogs.length} reports</span>
      </div>

      {/* Feed list */}
      <div className="space-y-3.5">
        {filteredLogs.map(log => {
          const isDelayed = log.status === 'Delayed';
          const isAhead   = log.status === 'Ahead';
          const efficiency = log.targetOutput ? Math.round((log.actualOutput / log.targetOutput) * 100) : 0;

          return (
            <div
              key={log.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-sm space-y-3 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center justify-center font-black text-xs shrink-0">
                    {log.department?.code || 'DEP'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white">{log.department?.name}</h3>
                      <span className="text-[10px] text-slate-400 font-semibold">• {log.shift}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Reported by <strong className="text-slate-300">{log.reportedBy?.name}</strong> •{' '}
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-full self-start sm:self-auto ${
                    isDelayed
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : isAhead
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {log.status}
                </span>
              </div>

              {/* Data Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Shift Target</span>
                  <p className="font-extrabold text-white text-sm">{log.targetOutput?.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">units</span></p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Actual Completed</span>
                  <p className="font-extrabold text-emerald-400 text-sm">{log.actualOutput?.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">units</span></p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Staff Present</span>
                  <p className="font-extrabold text-white text-sm">{log.manpowerPresent} <span className="text-[10px] font-normal text-slate-400">/ {log.manpowerRequired}</span></p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Target Achievement</span>
                  <p className="font-extrabold text-indigo-400 text-sm">{efficiency}%</p>
                </div>
              </div>

              {/* Blockers */}
              {log.blockers && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300">
                  <span className="font-bold flex items-center gap-1.5 text-red-400 mb-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Floor Issue / Blocker Reported to HR:
                  </span>
                  <p className="text-red-200/90">{log.blockers}</p>
                </div>
              )}

              {log.notes && (
                <p className="text-xs text-slate-400 italic">"{log.notes}"</p>
              )}
            </div>
          );
        })}
        {!filteredLogs.length && (
          <p className="text-xs text-slate-500 text-center py-12">No work reports found matching the criteria.</p>
        )}
      </div>

      {/* Submit Work Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && setShowLogModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-white">Submit Department Daily Work Report</h3>
            <p className="text-xs text-slate-400">Updates will be logged into the central HR platform immediately.</p>

            <form onSubmit={handleSubmitLog} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Department *</label>
                  <select
                    required
                    value={form.departmentId}
                    onChange={e => setForm(f=>({...f, departmentId: e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                  >
                    <option value="">Select Department...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Shift</label>
                  <select
                    value={form.shift}
                    onChange={e => setForm(f=>({...f, shift: e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                  >
                    <option value="Day Shift">Day Shift</option>
                    <option value="Night Shift">Night Shift</option>
                    <option value="General Shift">General Shift</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Target Output (Units) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.targetOutput}
                    onChange={e => setForm(f=>({...f, targetOutput: e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Actual Completed (Units) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.actualOutput}
                    onChange={e => setForm(f=>({...f, actualOutput: e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Staff Present</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.manpowerPresent}
                    onChange={e => setForm(f=>({...f, manpowerPresent: e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Staff Required</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.manpowerRequired}
                    onChange={e => setForm(f=>({...f, manpowerRequired: e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Schedule Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f=>({...f, status: e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                  >
                    <option value="On Schedule">On Schedule</option>
                    <option value="Ahead">Ahead</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Halted">Halted</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Blockers / Staffing Bottlenecks</label>
                <textarea
                  rows={2}
                  value={form.blockers}
                  onChange={e => setForm(f=>({...f, blockers: e.target.value}))}
                  placeholder="Report missing staff, material shortage, machine breakdown..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Additional Notes</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f=>({...f, notes: e.target.value}))}
                  placeholder="Lot numbers, quality remarks..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowLogModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
