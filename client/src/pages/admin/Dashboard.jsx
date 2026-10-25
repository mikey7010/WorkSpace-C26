import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import api from '../../api/axios';
import { Avatar } from '../../components/Layout';

const STATUS_COLORS = { todo: '#94a3b8', inprog: '#3b82f6', review: '#f59e0b', done: '#22c55e' };
const PRIO_COLORS   = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };

function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '22' }}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={color}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [byUser,   setByUser]   = useState([]);
  const [trends,   setTrends]   = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/by-user'),
      api.get('/analytics/trends'),
      api.get('/analytics/activity'),
    ]).then(([o, u, t, a]) => {
      setOverview(o.data); setByUser(u.data); setTrends(t.data); setActivity(a.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>;

  const pieData = overview ? [
    { name: 'To Do',       value: overview.todo,   color: STATUS_COLORS.todo },
    { name: 'In Progress', value: overview.inprog,  color: STATUS_COLORS.inprog },
    { name: 'Review',      value: overview.review,  color: STATUS_COLORS.review },
    { name: 'Done',        value: overview.done,    color: STATUS_COLORS.done },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Admin Dashboard</h1><p className="text-sm text-slate-400">Team overview and analytics</p></div>
        {overview?.overdue > 0 && <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-full font-semibold">⚠ {overview.overdue} overdue</span>}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks"  value={overview?.total}  color="#6366f1" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
        <StatCard label="Completed"    value={overview?.done}   color="#22c55e" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0" />
        <StatCard label="In Progress"  value={overview?.inprog} color="#3b82f6" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0" />
        <StatCard label="Overdue"      value={overview?.overdue}color="#ef4444" icon="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Tasks per Member</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byUser} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => v.split(' ')[0]} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} labelStyle={{ color: '#f1f5f9' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="done"   name="Done"        fill="#22c55e" stackId="a" radius={[0,0,0,0]} />
              <Bar dataKey="inprog" name="In Progress" fill="#3b82f6" stackId="a" />
              <Bar dataKey="review" name="Review"      fill="#f59e0b" stackId="a" />
              <Bar dataKey="todo"   name="To Do"       fill="#475569" stackId="a" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Status Split</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workload + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Member Workload</h3>
          <div className="space-y-3">
            {byUser.map(u => {
              const pct = u.total ? Math.round(u.done / u.total * 100) : 0;
              return (
                <div key={u.id} className="flex items-center gap-3">
                  <Avatar name={u.name} id={u.id} size="w-7 h-7" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1"><span className="font-medium truncate">{u.name}</span><span className="text-slate-400">{u.done}/{u.total}</span></div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {u.overdue > 0 && <span className="text-[10px] text-red-400 font-semibold shrink-0">{u.overdue} OD</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {activity.map(a => (
              <div key={a.id} className="flex items-start gap-2.5">
                <Avatar name={a.user.name} id={a.userId} size="w-6 h-6" textSize="text-[10px]" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-300">{a.action}</p>
                  <p className="text-[10px] text-slate-500">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {!activity.length && <p className="text-sm text-slate-500 text-center py-4">No activity yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
