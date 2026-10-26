import { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../../api/axios';
import { Avatar } from '../../components/Layout';

const COLS = [
  { key: 'todo',   label: 'To Do',       color: '#94a3b8' },
  { key: 'inprog', label: 'In Progress', color: '#3b82f6' },
  { key: 'review', label: 'Review',      color: '#f59e0b' },
  { key: 'done',   label: 'Done',        color: '#22c55e' },
];

const PRIO_DOT = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-green-500' };

function TaskCard({ task, index, onClick }) {
  const overdue = task.status !== 'done' && task.dueDate && new Date(task.dueDate) < new Date();
  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-slate-800 border rounded-xl p-3 mb-2 cursor-pointer hover:border-slate-600 transition-all shadow-sm ${
            snapshot.isDragging ? 'border-indigo-500 shadow-lg rotate-1' : overdue ? 'border-red-500/50' : 'border-slate-700'
          }`}>
          <div className="flex items-start gap-2 mb-2">
            <p className="text-sm font-semibold text-slate-100 leading-snug flex-1">{task.title}</p>
            <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${PRIO_DOT[task.priority]}`} />
          </div>
          {task.description && <p className="text-[11px] text-slate-400 mb-2 line-clamp-1">{task.description}</p>}
          <div className="flex items-center justify-between">
            {task.assignee && <Avatar name={task.assignee.name} id={task.assignee.id} size="w-6 h-6" textSize="text-[9px]" />}
            <span className={`text-[10px] ml-auto ${overdue ? 'text-red-400 font-semibold' : 'text-slate-500'}`}>
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
            </span>
          </div>
          {overdue && <div className="text-[10px] text-red-400 font-semibold mt-1">⚠ Overdue</div>}
          {task._count?.comments > 0 && <div className="text-[10px] text-slate-500 mt-1">💬 {task._count.comments}</div>}
        </div>
      )}
    </Draggable>
  );
}

export default function TaskBoard() {
  const [tasks, setTasks]       = useState([]);
  const [users, setUsers]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]         = useState({ title:'', description:'', assignedTo:'', priority:'medium', dueDate:'' });
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving]     = useState(false);

  const fetchTasks = useCallback(() => api.get('/tasks').then(r => setTasks(r.data)), []);
  useEffect(() => { fetchTasks(); api.get('/users').then(r => setUsers(r.data.filter(u => u.role !== 'hr_admin' && u.role !== 'admin'))); }, [fetchTasks]);

  async function onDragEnd({ source, destination, draggableId }) {
    if (!destination || source.droppableId === destination.droppableId) return;
    const status = destination.droppableId;
    setTasks(prev => prev.map(t => t.id === parseInt(draggableId) ? { ...t, status } : t));
    await api.put(`/tasks/${draggableId}`, { status });
    fetchTasks();
  }

  async function openTask(task) {
    setSelected(task);
    setShowModal(true);
    const r = await api.get(`/comments?taskId=${task.id}`);
    setComments(r.data);
  }

  async function postComment() {
    if (!commentText.trim()) return;
    await api.post('/comments', { taskId: selected.id, text: commentText });
    setCommentText('');
    const r = await api.get(`/comments?taskId=${selected.id}`);
    setComments(r.data);
  }

  async function createTask(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/tasks', { ...form, assignedTo: parseInt(form.assignedTo) });
      setShowCreate(false);
      setForm({ title:'', description:'', assignedTo:'', priority:'medium', dueDate:'' });
      fetchTasks();
    } finally { setSaving(false); }
  }

  const colTasks = col => tasks.filter(t => t.status === col);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">Task Board</h1><p className="text-sm text-slate-400">Drag cards to update status</p></div>
        <button onClick={() => setShowCreate(true)} className="text-sm px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors">+ New Task</button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLS.map(col => (
            <div key={col.key} className="shrink-0 w-72">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: col.color }} />
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{colTasks(col.key).length}</span>
              </div>
              <Droppable droppableId={col.key}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={`min-h-40 rounded-xl p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-500/10 border border-dashed border-indigo-500/50' : 'bg-slate-900'}`}>
                    {colTasks(col.key).map((t, i) => <TaskCard key={t.id} task={t} index={i} onClick={() => openTask(t)} />)}
                    {provided.placeholder}
                    {!colTasks(col.key).length && <p className="text-[11px] text-slate-600 text-center mt-8">Drop tasks here</p>}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Task Detail Modal */}
      {showModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-bold text-lg">{selected.title}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-2xl leading-none ml-3">&times;</button>
            </div>
            <p className="text-sm text-slate-400 mb-4">{selected.description || 'No description.'}</p>
            <div className="flex flex-wrap gap-2 mb-5 text-xs">
              <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg">
                {selected.assignee?.name || 'Unassigned'}
              </span>
              <span className={`px-2.5 py-1 rounded-lg border font-semibold ${selected.priority === 'high' ? 'bg-red-500/10 border-red-500/30 text-red-400' : selected.priority === 'medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                {selected.priority}
              </span>
              {selected.dueDate && <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg">
                Due: {new Date(selected.dueDate).toLocaleDateString()}
              </span>}
            </div>

            <h4 className="text-xs font-semibold text-slate-400 mb-2">Comments ({comments.length})</h4>
            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto scrollbar-thin">
              {comments.map(c => (
                <div key={c.id} className="bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-[11px] font-semibold text-slate-300">{c.user.name}</p>
                  <p className="text-xs text-slate-400">{c.text}</p>
                </div>
              ))}
              {!comments.length && <p className="text-xs text-slate-500">No comments yet.</p>}
            </div>
            <div className="flex gap-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && postComment()}
                placeholder="Add a comment…"
                className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button onClick={postComment} className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-colors">Post</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Create Task</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={createTask} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Title *</label>
                <input required value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Assign to *</label>
                  <select required value={form.assignedTo} onChange={e => setForm(f=>({...f,assignedTo:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select…</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f=>({...f,priority:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f=>({...f,dueDate:e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-60">
                {saving ? 'Creating…' : 'Create Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
