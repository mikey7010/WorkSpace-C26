import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/Layout';

export default function DeptDashboard() {
  const { user } = useAuth();
  const [dept, setDept]         = useState(null);
  const [workLogs, setWorkLogs] = useState([]);
  const [directives, setDirectives] = useState([]);
  const [newHires, setNewHires]     = useState([]);
  const [loading, setLoading]       = useState(true);

  // Form for quick shift report submission
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    shift: 'Day Shift',
    targetOutput: 4000,
    actualOutput: 3850,
    manpowerPresent: 28,
    manpowerRequired: 30,
    status: 'On Schedule',
    blockers: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);

  function fetchData() {
    if (!user?.departmentId) {
      setLoading(false);
      return;
    }
    Promise.all([
      api.get(`/departments/${user.departmentId}`),
      api.get(`/worklogs?departmentId=${user.departmentId}`),
      api.get('/directives'),
      api.get('/recruitment/candidates'),
    ])
      .then(([deptRes, logsRes, dirRes, candRes]) => {
        setDept(deptRes.data);
        setWorkLogs(logsRes.data);
        setDirectives(dirRes.data);
        setNewHires(candRes.data.filter(c => c.departmentId === user.departmentId || !c.departmentId));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, [user]);

  async function handleSubmitWork(e) {
    e.preventDefault();
    if (!user?.departmentId) return;
    try {
      await api.post('/worklogs', {
        ...form,
        departmentId: user.departmentId,
        targetOutput: parseInt(form.targetOutput),
        actualOutput: parseInt(form.actualOutput),
        manpowerPresent: parseInt(form.manpowerPresent),
        manpowerRequired: parseInt(form.manpowerRequired),
      });
      setShowForm(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
      fetchData();
    } catch (err) {
      alert('Failed to submit work log: ' + (err.response?.data?.error || err.message));
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>;
  }

  const latestLog = workLogs[0];
  const efficiency = latestLog?.targetOutput ? Math.round((latestLog.actualOutput / latestLog.targetOutput) * 100) : 0;

  return (
    <div className="p-7 space-y-7 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-indigo-600/30">
            {dept?.code || 'DEP'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                Department Head Portal
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">{dept?.name || 'Department Floor'}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Logged in as <strong className="text-white">{user?.name}</strong> ({user?.designation || 'Department Head'})
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-600/25 flex items-center gap-2 self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showForm ? 'Close Report Form' : 'Submit Today’s Shift Work Log'}
        </button>
      </div>

      {submitted && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <span>✓</span>
          <span>Your daily work log has been synchronized and sent directly to the HR Operations Dashboard!</span>
        </div>
      )}

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Current Floor Staff</span>
          <p className="text-2xl font-extrabold text-white">{dept?.currentManpower || 0} <span className="text-xs font-normal text-slate-400">/ {dept?.targetManpower || 0}</span></p>
          <p className="text-[10px] text-slate-400 mt-1">
            {(dept?.targetManpower || 0) - (dept?.currentManpower || 0) > 0
              ? `${(dept?.targetManpower || 0) - (dept?.currentManpower || 0)} vacancies requested from HR`
              : 'Full capacity'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Today's Shift Output</span>
          <p className="text-2xl font-extrabold text-emerald-400">{latestLog?.actualOutput?.toLocaleString() || '—'} <span className="text-xs font-normal text-slate-400">units</span></p>
          <p className="text-[10px] text-slate-400 mt-1">Target: {latestLog?.targetOutput?.toLocaleString() || '—'} units</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Shift Efficiency</span>
          <p className="text-2xl font-extrabold text-indigo-400">{efficiency}%</p>
          <p className="text-[10px] text-slate-400 mt-1">Status: <strong className="text-slate-300">{latestLog?.status || 'Active'}</strong></p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">HR Broadcasts</span>
          <p className="text-2xl font-extrabold text-amber-400">{directives.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">Active directives & hiring notices</p>
        </div>
      </div>

      {/* Inline Form to Submit Work Log */}
      {showForm && (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-extrabold text-base text-white">Record Shift Output & Report to HR</h3>
              <p className="text-xs text-slate-400">Log production metrics, present worker count, and any blockers for HR support.</p>
            </div>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white text-lg">&times;</button>
          </div>

          <form onSubmit={handleSubmitWork} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Workers Present Today *</label>
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
                <label className="block text-slate-400 font-semibold mb-1">Workers Required</label>
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
                <label className="block text-slate-400 font-semibold mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f=>({...f, status: e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                >
                  <option value="On Schedule">On Schedule</option>
                  <option value="Ahead">Ahead of Plan</option>
                  <option value="Delayed">Delayed / Bottleneck</option>
                  <option value="Halted">Halted / Maintenance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Report Blocker / Request Staffing from HR</label>
              <textarea
                rows={2}
                value={form.blockers}
                onChange={e => setForm(f=>({...f, blockers: e.target.value}))}
                placeholder="e.g. Need 4 additional stitchers for second line, machine calibration pending..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 resize-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Notes / Batch Remarks</label>
              <input
                value={form.notes}
                onChange={e => setForm(f=>({...f, notes: e.target.value}))}
                placeholder="Lot numbers, export shipment details..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20"
              >
                Send Work Report to HR
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Two Column Section: HR Directives to this Department + Onboarding Recruits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* What HR does updated to Department Heads */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📢</span>
            <div>
              <h3 className="font-extrabold text-base text-white">Directives from HR Management</h3>
              <p className="text-xs text-slate-400">Updates on client contracts, hiring progress, and factory policies</p>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
            {directives.map(dir => (
              <div key={dir.id} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-indigo-400 uppercase tracking-wide">{dir.category}</span>
                  <span className="text-slate-500">{new Date(dir.createdAt).toLocaleDateString()}</span>
                </div>
                <h4 className="text-xs font-bold text-white">{dir.title}</h4>
                <p className="text-xs text-slate-300/90 leading-relaxed">{dir.content}</p>
                <p className="text-[10px] text-slate-500 pt-1">Issued by {dir.author?.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* New Recruits Arriving / Induction */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-base text-white">New Recruits Arriving For Your Department</h3>
            <p className="text-xs text-slate-400">Supervisors & engineers currently in onboarding or scheduled to join</p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
            {newHires.map(cand => (
              <div key={cand.id} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={cand.name} id={cand.id} size="w-7 h-7" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{cand.name}</h4>
                      <p className="text-[10px] text-indigo-400 font-semibold">{cand.appliedRole}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    {cand.onboardingProgress}% Ready
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Joining Date: <strong className="text-white">{cand.joiningDate ? new Date(cand.joiningDate).toLocaleDateString() : 'TBD'}</strong></span>
                  <span>Mentor: <strong className="text-indigo-400">{cand.mentorAssigned ? 'Assigned' : 'Pending'}</strong></span>
                </div>
              </div>
            ))}
            {!newHires.length && (
              <p className="text-xs text-slate-500 text-center py-8">No new recruits currently assigned to this department.</p>
            )}
          </div>
        </div>
      </div>

      {/* History of Recent Shift Logs for this Department */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 className="font-extrabold text-base text-white mb-1">Your Department's Shift Log History</h3>
        <p className="text-xs text-slate-400 mb-4">Past reports recorded in the HR operations database</p>

        <div className="space-y-3">
          {workLogs.map(log => (
            <div key={log.id} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">{log.shift} • {new Date(log.createdAt).toLocaleDateString()}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  log.status === 'Delayed' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {log.status}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><span className="text-[10px] text-slate-400 block">Target</span><strong className="text-white">{log.targetOutput}</strong></div>
                <div><span className="text-[10px] text-slate-400 block">Output</span><strong className="text-emerald-400">{log.actualOutput}</strong></div>
                <div><span className="text-[10px] text-slate-400 block">Present</span><strong className="text-white">{log.manpowerPresent} workers</strong></div>
                <div><span className="text-[10px] text-slate-400 block">Shortfall</span><strong className="text-red-400">{log.manpowerRequired - log.manpowerPresent}</strong></div>
              </div>
              {log.blockers && (
                <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5">
                  <strong>Blocker:</strong> {log.blockers}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
