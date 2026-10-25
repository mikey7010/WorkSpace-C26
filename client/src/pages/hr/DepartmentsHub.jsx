import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Avatar } from '../../components/Layout';

export default function DepartmentsHub() {
  const [departments, setDepartments] = useState([]);
  const [selected, setSelected]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showEdit, setShowEdit]       = useState(false);
  const [targetManpower, setTargetManpower] = useState(25);
  const [desc, setDesc]                     = useState('');

  function loadDepts() {
    api.get('/departments')
      .then(res => {
        setDepartments(res.data);
        if (!selected && res.data.length > 0) setSelected(res.data[0]);
        else if (selected) {
          const updated = res.data.find(d => d.id === selected.id);
          if (updated) setSelected(updated);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadDepts(); }, []);

  function handleSelect(d) {
    setSelected(d);
    setTargetManpower(d.targetManpower);
    setDesc(d.description || '');
  }

  async function handleSaveTarget(e) {
    e.preventDefault();
    if (!selected) return;
    try {
      await api.put(`/departments/${selected.id}`, {
        targetManpower: parseInt(targetManpower),
        description: desc,
      });
      setShowEdit(false);
      loadDepts();
    } catch (err) {
      alert('Failed to update target');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="p-7 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">10 Factory Departments Hub</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Comprehensive operational monitoring, manpower allocation, and direct oversight for all 10 department heads.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List of 10 Departments */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-3">All 10 Departments</h3>
          <div className="space-y-1.5 max-h-[700px] overflow-y-auto pr-1 scrollbar-thin">
            {departments.map(dept => {
              const active = selected?.id === dept.id;
              const gap = dept.targetManpower - dept.currentManpower;
              return (
                <button
                  key={dept.id}
                  onClick={() => handleSelect(dept)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                    active
                      ? 'bg-indigo-600/15 border-indigo-500/50 shadow-sm'
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
                      {dept.code}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{dept.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{dept.head?.name || 'No Head'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-white">{dept.currentManpower}</span>
                    <span className="text-[10px] text-slate-400">/{dept.targetManpower}</span>
                    {gap > 0 && <span className="block text-[9px] text-red-400 font-semibold">-{gap} vacancies</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Detail View of Selected Department */}
        {selected && (
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3.5">
                  <span className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-sm">
                    {selected.code}
                  </span>
                  <div>
                    <h2 className="text-xl font-black text-white">{selected.name}</h2>
                    <p className="text-xs text-slate-400">{selected.description || 'Core production department'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEdit(true)}
                  className="text-xs px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl font-semibold transition-all"
                >
                  Edit Targets
                </button>
              </div>

              {/* Head Details & Manpower Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Department Head</p>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={selected.head?.name} id={selected.head?.id} size="w-9 h-9" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{selected.head?.name}</p>
                      <p className="text-[10px] text-indigo-400 truncate">{selected.head?.designation}</p>
                      <p className="text-[10px] text-slate-500 truncate">{selected.head?.phone || selected.head?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Manpower Health</p>
                  <p className="text-2xl font-black text-white">{selected.currentManpower} <span className="text-xs font-normal text-slate-400">/ {selected.targetManpower}</span></p>
                  <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-indigo-500"
                      style={{ width: `${Math.min(100, Math.round((selected.currentManpower / selected.targetManpower) * 100))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {selected.targetManpower - selected.currentManpower > 0
                      ? `${selected.targetManpower - selected.currentManpower} staff vacancies needing recruitment`
                      : 'Full capacity reached'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Latest Shift Output</p>
                  <p className="text-2xl font-black text-emerald-400">
                    {selected.workLogs?.[0]?.actualOutput || '—'}
                    <span className="text-xs font-normal text-slate-400"> / {selected.workLogs?.[0]?.targetOutput || '—'} units</span>
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                    Status: {selected.workLogs?.[0]?.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Work Logs for this Department */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold text-base text-white mb-1">Recent Shift Work Logs from {selected.name}</h3>
              <p className="text-xs text-slate-400 mb-4">Updates submitted by {selected.head?.name} directly from factory floor</p>

              <div className="space-y-3">
                {(selected.workLogs || []).map(log => (
                  <div key={log.id} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{log.shift}</span>
                        <span className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        log.status === 'Delayed' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {log.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-1">
                      <div><span className="text-slate-400 text-[10px] block">Target Output</span><strong className="text-white">{log.targetOutput} units</strong></div>
                      <div><span className="text-slate-400 text-[10px] block">Actual Output</span><strong className="text-emerald-400">{log.actualOutput} units</strong></div>
                      <div><span className="text-slate-400 text-[10px] block">Present Staff</span><strong className="text-white">{log.manpowerPresent} workers</strong></div>
                      <div><span className="text-slate-400 text-[10px] block">Efficiency</span><strong className="text-indigo-400">{log.targetOutput ? Math.round((log.actualOutput/log.targetOutput)*100) : 0}%</strong></div>
                    </div>

                    {log.blockers && (
                      <p className="text-xs text-red-300/90 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                        <strong className="font-bold">Blocker Reported:</strong> {log.blockers}
                      </p>
                    )}
                    {log.notes && (
                      <p className="text-xs text-slate-400 italic">"{log.notes}"</p>
                    )}
                  </div>
                ))}
                {!selected.workLogs?.length && (
                  <p className="text-xs text-slate-500 text-center py-6">No shift work logs submitted yet today.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Target Modal */}
      {showEdit && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowEdit(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-lg text-white mb-2">Edit {selected.name} Target</h3>
            <p className="text-xs text-slate-400 mb-4">Set the approved workforce requirement for this department.</p>

            <form onSubmit={handleSaveTarget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Approved Target Manpower</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={targetManpower}
                  onChange={e => setTargetManpower(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Department Description / Scope</label>
                <textarea
                  rows={3}
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
