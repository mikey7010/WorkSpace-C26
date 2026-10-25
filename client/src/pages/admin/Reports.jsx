import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';
import { Avatar } from '../../components/Layout';

export default function Reports() {
  const [overview, setOverview] = useState(null);
  const [byUser,   setByUser]   = useState([]);
  const [trends,   setTrends]   = useState([]);

  useEffect(() => {
    Promise.all([api.get('/analytics/overview'), api.get('/analytics/by-user'), api.get('/analytics/trends')])
      .then(([o, u, t]) => { setOverview(o.data); setByUser(u.data); setTrends(t.data); });
  }, []);

  function exportCSV() {
    const header = 'Member,Total,Done,Overdue,On-Time %';
    const rows = byUser.map(u => `"${u.name}",${u.total},${u.done},${u.overdue},${u.total ? Math.round(u.onTime / u.done * 100) + '%' : '—'}`);
    const csv = [header, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'workspace_report.csv';
    a.click();
  }

  const rate = overview?.total ? Math.round(overview.done / overview.total * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Reports & Analytics</h1><p className="text-sm text-slate-400">Team performance metrics</p></div>
        <button onClick={exportCSV} className="flex items-center gap-2 text-sm px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-200 rounded-lg font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export CSV
        </button>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Completion Rate', rate + '%', '#6366f1'],['Total Tasks', overview?.total, '#3b82f6'],['Overdue', overview?.overdue, '#ef4444'],['Done', overview?.done, '#22c55e']].map(([l,v,c]) => (
          <div key={l} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">{l}</p>
            <p className="text-2xl font-bold" style={{ color: c }}>{v ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Tasks Completed per Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trends} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
              <Line type="monotone" dataKey="count" name="Completed" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Per-user bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Completion by Member</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byUser} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.split(' ')[0]} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
              <Bar dataKey="done" name="Done" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="todo" name="Remaining" fill="#334155" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Member report table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <h3 className="font-semibold">Member Performance</h3>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-slate-800">
            {['Member','Total','Done','Overdue','On-Time'].map(h => <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-slate-400">{h}</th>)}
          </tr></thead>
          <tbody>
            {byUser.map(u => {
              const ot = u.done > 0 ? Math.round(u.onTime / u.done * 100) : 0;
              return (
                <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-3 px-4"><div className="flex items-center gap-2"><Avatar name={u.name} id={u.id} size="w-7 h-7" /><span className="text-sm font-medium">{u.name}</span></div></td>
                  <td className="py-3 px-4 text-sm">{u.total}</td>
                  <td className="py-3 px-4 text-sm text-green-400 font-semibold">{u.done}</td>
                  <td className="py-3 px-4 text-sm"><span className={u.overdue ? 'text-red-400 font-semibold' : 'text-slate-500'}>{u.overdue || '—'}</span></td>
                  <td className="py-3 px-4 text-sm">{u.done > 0 ? `${ot}%` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
