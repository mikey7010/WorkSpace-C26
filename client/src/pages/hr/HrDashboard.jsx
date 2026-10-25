import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../api/axios';
import { Avatar } from '../../components/Layout';

const STAGE_COLORS = {
  Applied: '#94a3b8',
  Interview: '#3b82f6',
  Consultation: '#8b5cf6',
  Offered: '#f59e0b',
  Onboarding: '#06b6d4',
  Joined: '#22c55e',
};

export default function HrDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [directiveTitle, setDirectiveTitle]     = useState('');
  const [directiveContent, setDirectiveContent] = useState('');
  const [directiveCat, setDirectiveCat]         = useState('Recruitment Milestone');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  function loadOverview() {
    api.get('/analytics/hr-overview')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadOverview(); }, []);

  async function handleBroadcast(e) {
    e.preventDefault();
    if (!directiveTitle.trim() || !directiveContent.trim()) return;
    try {
      await api.post('/directives', {
        title: directiveTitle,
        content: directiveContent,
        category: directiveCat,
        priority: 'High',
      });
      setDirectiveTitle('');
      setDirectiveContent('');
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 3000);
      loadOverview();
    } catch (err) {
      alert('Failed to publish directive');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const stageData = data?.candidateStages
    ? Object.keys(data.candidateStages).map(k => ({
        name: k,
        value: data.candidateStages[k],
        color: STAGE_COLORS[k] || '#6366f1',
      })).filter(d => d.value > 0)
    : [];

  const deptChartData = (data?.departments || []).map(d => ({
    name: d.code,
    fullName: d.name,
    current: d.currentManpower,
    target: d.targetManpower,
    gap: d.targetManpower - d.currentManpower,
  }));

  return (
    <div className="p-7 space-y-7 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Live Production & HR Sync</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">HR Operations & 10 Departments Command Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor real-time shift updates from all 10 department heads, recruitment pipelines, and onboarding milestones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadOverview}
            className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Feed
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">10 Departments</span>
            <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">10</span>
          </div>
          <p className="text-3xl font-extrabold text-white">{data?.totalCurrentManpower} <span className="text-sm font-normal text-slate-400">/ {data?.totalTargetManpower}</span></p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.round((data?.totalCurrentManpower / data?.totalTargetManpower) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-indigo-400 font-bold">{Math.round((data?.totalCurrentManpower / data?.totalTargetManpower) * 100)}% Staffed</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Today's Total Output</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">✓</span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-400">{data?.totalOutputToday?.toLocaleString()} <span className="text-xs font-medium text-slate-400">units</span></p>
          <p className="text-[11px] text-slate-400 mt-1">Across Cutting, Assembly, Finishing & Packaging</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Active Recruitment</span>
            <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">🎯</span>
          </div>
          <p className="text-3xl font-extrabold text-amber-400">{data?.totalRequiredRecruits} <span className="text-xs font-medium text-slate-400">openings</span></p>
          <p className="text-[11px] text-slate-400 mt-1">{data?.activeDemandsCount} Client demands (Engineers, Supervisors)</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Staffing Shortages / Alerts</span>
            <span className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-xs">⚠</span>
          </div>
          <p className="text-3xl font-extrabold text-red-400">{data?.activeBlockers?.length || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Reported by Department Heads today</p>
        </div>
      </div>

      {/* Critical Blocker Alert Banner if any */}
      {data?.activeBlockers?.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4.5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-sm font-bold text-red-300">Live Department Blockers Requiring HR Attention</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
            {data.activeBlockers.map(b => (
              <div key={b.id} className="bg-slate-900/90 border border-red-500/20 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white">{b.deptName}</span>
                  <span className="text-[10px] text-slate-400">Reported by {b.reporter}</span>
                </div>
                <p className="text-xs text-red-300/90 leading-relaxed">{b.blocker}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manpower Distribution Across 10 Depts */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white">Workforce Capacity Across 10 Departments</h3>
              <p className="text-xs text-slate-400">Current active staff vs. approved manpower target</p>
            </div>
            <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-lg font-semibold">
              Gap: {data?.manpowerGap} vacancies
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptChartData} margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}
                labelFormatter={(v, list) => list[0]?.payload?.fullName || v}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="current" name="Current Staff" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" name="Target Target" fill="#334155" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recruitment Pipeline Donut */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-white mb-1">Recruitment Pipeline</h3>
            <p className="text-xs text-slate-400 mb-3">Candidates across sourcing, interview, consultation & onboarding</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stageData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
            {stageData.map(s => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-slate-400 truncate">{s.name}</span>
                <span className="font-bold text-white ml-auto">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 10 Departments Quick Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-white">10 Departments Live Status</h3>
            <p className="text-xs text-slate-400">Real-time shift output, department head & status</p>
          </div>
          <span className="text-xs text-slate-400">All 10 active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {(data?.departments || []).map(dept => {
            const latestLog = dept.workLogs?.[0];
            const isDelayed = latestLog?.status === 'Delayed';
            const isAhead = latestLog?.status === 'Ahead';
            return (
              <div
                key={dept.id}
                className="bg-slate-800/60 border border-slate-700/60 hover:border-indigo-500/50 rounded-2xl p-3.5 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                    {dept.code}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      isDelayed
                        ? 'bg-red-500/20 text-red-300'
                        : isAhead
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {latestLog?.status || 'Active'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white truncate" title={dept.name}>{dept.name}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{dept.head?.name || 'Head Assigned'}</p>

                <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Staff: <strong className="text-white">{dept.currentManpower}</strong>/{dept.targetManpower}</span>
                  <span className="text-slate-400">Output: <strong className="text-emerald-400">{latestLog?.actualOutput || '—'}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Broadcast What HR Does to Everyone + Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HR Broadcast Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📢</span>
            <h3 className="font-bold text-base text-white">Broadcast HR Work / Directive to Platform</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Anything you update here will immediately be published and visible to all 10 Department Heads on their dashboards.
          </p>

          {broadcastSuccess && (
            <p className="mb-3 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl px-3 py-2 font-semibold">
              ✓ Directive broadcasted successfully to all 10 Department Heads!
            </p>
          )}

          <form onSubmit={handleBroadcast} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
              <input
                required
                value={directiveTitle}
                onChange={e => setDirectiveTitle(e.target.value)}
                placeholder="e.g. Sourced 10 Engineer profiles for Nordic Jan batch..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
              <select
                value={directiveCat}
                onChange={e => setDirectiveCat(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Recruitment Milestone">🎯 Recruitment Milestone (Client Updates)</option>
                <option value="Policy Update">📜 Policy & Compliance Update</option>
                <option value="Shift Notice">⏰ Shift & Overtime Notice</option>
                <option value="Urgent Request">🚨 Urgent Staffing / Safety Notice</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Details & Action Required</label>
              <textarea
                required
                rows={3}
                value={directiveContent}
                onChange={e => setDirectiveContent(e.target.value)}
                placeholder="Write the work updates or instructions for department heads..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              />
            </div>
            <button
              type="submit"
              className="mt-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md shadow-indigo-600/20"
            >
              Broadcast to All 10 Department Heads
            </button>
          </form>
        </div>

        {/* Live Activity Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-base text-white mb-1">Live Activity Stream</h3>
          <p className="text-xs text-slate-400 mb-4">Chronological log of work reported by department heads & HR actions</p>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin">
            {(data?.activityLogs || []).map(a => (
              <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/50 border border-slate-800">
                <Avatar name={a.user?.name || 'User'} id={a.userId} size="w-7 h-7" textSize="text-[10px]" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-200 leading-snug">{a.action}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
