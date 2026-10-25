import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Avatar } from '../../components/Layout';

export default function Team() {
  const [users, setUsers]     = useState([]);
  const [tasks, setTasks]     = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name:'', email:'', password:'', role:'member' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  function fetchData() {
    api.get('/users').then(r => setUsers(r.data));
    api.get('/tasks').then(r => setTasks(r.data));
  }
  useEffect(fetchData, []);

  async function addUser(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/users', form);
      setShowAdd(false);
      setForm({ name:'', email:'', password:'', role:'member' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user.');
    } finally { setSaving(false); }
  }

  async function deleteUser(id) {
    if (!confirm('Remove this member?')) return;
    await api.delete(`/users/${id}`);
    fetchData();
  }

  const members = users.filter(u => u.role === 'member');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">Team</h1><p className="text-sm text-slate-400">{members.length} members</p></div>
        <button onClick={() => setShowAdd(true)} className="text-sm px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors">+ Add Member</button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {['Member','Tasks','Done','In Progress','Overdue','Rate',''].map(h => (
                <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map(u => {
              const mt    = tasks.filter(t => t.assignee?.id === u.id);
              const done  = mt.filter(t => t.status === 'done').length;
              const inp   = mt.filter(t => t.status === 'inprog').length;
              const ov    = mt.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
              const rate  = mt.length ? Math.round(done / mt.length * 100) : 0;
              return (
                <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} id={u.id} size="w-8 h-8" />
                      <div><p className="text-sm font-medium">{u.name}</p><p className="text-[11px] text-slate-400">{u.email}</p></div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">{mt.length}</td>
                  <td className="py-3 px-4 text-sm text-green-400 font-semibold">{done}</td>
                  <td className="py-3 px-4 text-sm text-blue-400">{inp}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className={ov ? 'text-red-400 font-semibold' : 'text-slate-500'}>{ov || '—'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="text-xs font-semibold">{rate}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => deleteUser(u.id)} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Remove</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Add Member</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            {error && <p className="mb-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
            <form onSubmit={addUser} className="flex flex-col gap-4">
              <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Name *</label>
                <input required value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Password *</label>
                <input required type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Role</label>
                <select value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select></div>
              <button type="submit" disabled={saving} className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-60">{saving ? 'Adding…' : 'Add Member'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
