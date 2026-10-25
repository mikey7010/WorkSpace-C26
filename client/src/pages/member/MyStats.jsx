import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/Layout';

const STATUS_COLORS = { todo: '#94a3b8', inprog: '#3b82f6', review: '#f59e0b', done: '#22c55e' };

export default function MyStats() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);

  useEffect(() => { api.get('/tasks').then(r => setTasks(r.data)); }, []);

  const done   = tasks.filter(t => t.status === 'done').length;
  const inprog = tasks.filter(t => t.status === 'inprog').length;
  const review = tasks.filter(t => t.status === 'review').length;
  const todo   = tasks.filter(t => t.status === 'todo').length;
  const overdue = tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const rate   = tasks.length ? Math.round(done / tasks.length * 100) : 0;

  const pieData = [
    { name: 'Done',        value: done,   color: '#22c55e' },
    { name: 'In Progress', value: inprog, color: '#3b82f6' },
    { name: 'Review',      value: review, color: '#f59e0b' },
    { name: 'To Do',       value: todo,   color: '#475569' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6"><h1 className="text-xl font-bold">My Stats</h1><p className="text-sm text-slate-400">Personal performance overview</p></div>

      {/* Profile */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4 flex items-center gap-4">
        {user && <Avatar name={user.name} id={user.id} size="w-14 h-14" textSize="text-base" />}
        <div className="flex-1">
          <h2 className="font-bold text-lg">{user?.name}</h2>
          <p className="text-sm text-slate-400 capitalize">{user?.role}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-indigo-400">{rate}%</p>
          <p className="text-xs text-slate-400">Completion</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[['Total', tasks.length, '#6366f1'],['Done', done, '#22c55e'],['Active', inprog + review, '#3b82f6'],['Overdue', overdue, '#ef4444']].map(([l,v,c]) => (
          <div key={l} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <p className="text-xl font-bold" style={{ color: c }}>{v}</p>
            <p className="text-xs text-slate-400">{l}</p>
          </div>
        ))}
      </div>

      {/* Progress + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between text-xs mb-2"><span className="font-semibold">Overall Progress</span><span className="text-indigo-400">{done}/{tasks.length}</span></div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden mb-4">
            <div className="h-3 rounded-full bg-indigo-500 transition-all" style={{ width: `${rate}%` }} />
          </div>
          <div className="space-y-2">
            {[{l:'Done',v:done,c:'#22c55e'},{l:'In Progress',v:inprog,c:'#3b82f6'},{l:'Review',v:review,c:'#f59e0b'},{l:'To Do',v:todo,c:'#475569'}].map(s => (
              <div key={s.l} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.c }} />
                <span className="text-slate-400 flex-1">{s.l}</span>
                <span className="font-semibold">{s.v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Task list */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="font-semibold mb-3">All My Tasks</h3>
        <div className="space-y-2">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800 transition-colors">
              <span className={`w-2 h-2 rounded-full shrink-0 ${t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`} />
              <span className={`flex-1 text-sm ${t.status === 'done' ? 'line-through text-slate-500' : ''}`}>{t.title}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold`} style={{ background: STATUS_COLORS[t.status] + '25', color: STATUS_COLORS[t.status] }}>
                {t.status === 'todo' ? 'To Do' : t.status === 'inprog' ? 'In Progress' : t.status === 'review' ? 'Review' : 'Done'}
              </span>
            </div>
          ))}
          {!tasks.length && <p className="text-sm text-slate-500 text-center py-4">No tasks assigned yet.</p>}
        </div>
      </div>
    </div>
  );
}
