import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/Layout';

export default function HrDirectives() {
  const { user } = useAuth();
  const [directives, setDirectives]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);

  const isHr = user?.role === 'hr_admin' || user?.role === 'admin';

  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'Recruitment Milestone',
    priority: 'Normal',
    targetDepartmentId: '',
  });

  function fetchData() {
    Promise.all([api.get('/directives'), api.get('/departments')])
      .then(([dirRes, deptRes]) => {
        setDirectives(dirRes.data);
        setDepartments(deptRes.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  async function handlePublish(e) {
    e.preventDefault();
    try {
      await api.post('/directives', {
        ...form,
        targetDepartmentId: form.targetDepartmentId ? parseInt(form.targetDepartmentId) : null,
      });
      setShowModal(false);
      setForm({
        title: '',
        content: '',
        category: 'Recruitment Milestone',
        priority: 'Normal',
        targetDepartmentId: '',
      });
      fetchData();
    } catch (err) {
      alert('Failed to publish directive');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="p-7 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">HR Directives & Platform Broadcasts</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Official announcements, recruitment milestone progress, client contract updates, and factory-wide compliance notices.
          </p>
        </div>
        {isHr && (
          <button
            onClick={() => setShowModal(true)}
            className="text-xs px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            + New Directive Broadcast
          </button>
        )}
      </div>

      {/* Directives Cards List */}
      <div className="space-y-4">
        {directives.map(item => {
          const isUrgent = item.priority === 'Urgent';
          const isHigh   = item.priority === 'High';

          return (
            <div
              key={item.id}
              className={`bg-slate-900 border rounded-3xl p-6 shadow-sm space-y-3 transition-all ${
                isUrgent
                  ? 'border-red-500/40 bg-red-500/[0.03]'
                  : isHigh
                  ? 'border-amber-500/30'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    isUrgent
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : isHigh
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-indigo-500/20 text-indigo-300'
                  }`}>
                    {item.priority} Priority
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                    {item.category}
                  </span>
                  {item.targetDepartment && (
                    <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                      To: {item.targetDepartment.name}
                    </span>
                  )}
                  {!item.targetDepartment && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      To: All 10 Departments
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>

              <h3 className="text-base font-extrabold text-white leading-snug">{item.title}</h3>
              <p className="text-xs text-slate-300/90 leading-relaxed whitespace-pre-line">{item.content}</p>

              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <Avatar name={item.author?.name} id={item.authorId} size="w-6 h-6" textSize="text-[9px]" />
                <span className="text-[11px] text-slate-400">
                  Issued by <strong className="text-slate-200">{item.author?.name}</strong> ({item.author?.designation || 'HR Officer'})
                </span>
              </div>
            </div>
          );
        })}

        {!directives.length && (
          <p className="text-xs text-slate-500 text-center py-12">No directives published yet.</p>
        )}
      </div>

      {/* Publish Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-white">Broadcast HR Work / Policy Directive</h3>
            <p className="text-xs text-slate-400">Published directives appear instantly on all 10 Department Heads' portals.</p>

            <form onSubmit={handlePublish} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Directive Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f=>({...f, title: e.target.value}))}
                  placeholder="e.g. 10 Engineers Hired for Jan Deployment — Pre-Induction Instructions"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f=>({...f, category: e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                  >
                    <option value="Recruitment Milestone">Recruitment Milestone</option>
                    <option value="Policy Update">Policy Update</option>
                    <option value="Shift Notice">Shift Notice</option>
                    <option value="Urgent Request">Urgent Notice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f=>({...f, priority: e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Target Department (Optional)</label>
                <select
                  value={form.targetDepartmentId}
                  onChange={e => setForm(f=>({...f, targetDepartmentId: e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                >
                  <option value="">All 10 Departments (Default)</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Message Content *</label>
                <textarea
                  required
                  rows={4}
                  value={form.content}
                  onChange={e => setForm(f=>({...f, content: e.target.value}))}
                  placeholder="Detail the progress, instructions, or policy changes..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">Broadcast Directive</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
