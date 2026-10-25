import { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../../api/axios';

const COLS = [
  { key: 'todo',   label: 'To Do',       color: '#94a3b8' },
  { key: 'inprog', label: 'In Progress', color: '#3b82f6' },
  { key: 'review', label: 'Review',      color: '#f59e0b' },
  { key: 'done',   label: 'Done',        color: '#22c55e' },
];

const STATUS_FLOW = ['todo','inprog','review','done'];

export default function MyTasks() {
  const [tasks,    setTasks]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  const fetchTasks = useCallback(() => api.get('/tasks').then(r => setTasks(r.data)), []);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function onDragEnd({ source, destination, draggableId }) {
    if (!destination || source.droppableId === destination.droppableId) return;
    const status = destination.droppableId;
    setTasks(prev => prev.map(t => t.id === parseInt(draggableId) ? { ...t, status } : t));
    await api.put(`/tasks/${draggableId}`, { status });
    fetchTasks();
  }

  async function openTask(task) {
    setSelected(task);
    const r = await api.get(`/comments?taskId=${task.id}`);
    setComments(r.data);
  }

  async function advanceStatus(task) {
    const i = STATUS_FLOW.indexOf(task.status);
    if (i >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[i + 1];
    await api.put(`/tasks/${task.id}`, { status: next });
    fetchTasks();
  }

  async function postComment() {
    if (!commentText.trim() || !selected) return;
    await api.post('/comments', { taskId: selected.id, text: commentText });
    setCommentText('');
    const r = await api.get(`/comments?taskId=${selected.id}`);
    setComments(r.data);
  }

  return (
    <div className="p-6">
      <div className="mb-6"><h1 className="text-xl font-bold">My Tasks</h1><p className="text-sm text-slate-400">Drag or click → to advance status</p></div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="shrink-0 w-64">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                  <h3 className="font-semibold text-sm">{col.label}</h3>
                  <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <Droppable droppableId={col.key}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`min-h-36 rounded-xl p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-500/10 border border-dashed border-indigo-500/50' : 'bg-slate-900'}`}>
                      {colTasks.map((t, i) => {
                        const overdue = t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date();
                        return (
                          <Draggable key={t.id} draggableId={String(t.id)} index={i}>
                            {(prov, snap) => (
                              <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                className={`bg-slate-800 border rounded-xl p-3 mb-2 transition-all ${
                                  snap.isDragging ? 'border-indigo-500 shadow-lg' : overdue ? 'border-red-500/50' : 'border-slate-700'
                                }`}>
                                <p className="text-sm font-semibold mb-1">{t.title}</p>
                                <p className="text-[11px] text-slate-400 mb-2 line-clamp-2">{t.description}</p>
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-[10px] ${overdue?'text-red-400 font-semibold':'text-slate-500'}`}>
                                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''}
                                  </span>
                                  <div className="flex gap-1">
                                    <button onClick={() => openTask(t)} className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-500 transition">Detail</button>
                                    {t.status !== 'done' && <button onClick={() => advanceStatus(t)} className="text-[10px] text-white bg-indigo-500 hover:bg-indigo-600 px-1.5 py-0.5 rounded transition">→</button>}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {!colTasks.length && <p className="text-[11px] text-slate-600 text-center mt-8">No tasks</p>}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Task Detail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-start justify-between mb-3">
              <h2 className="font-bold text-lg">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-2xl leading-none ml-3">&times;</button>
            </div>
            <p className="text-sm text-slate-400 mb-4">{selected.description || 'No description.'}</p>
            <h4 className="text-xs font-semibold text-slate-400 mb-2">Comments</h4>
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto scrollbar-thin">
              {comments.map(c => (
                <div key={c.id} className="bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-[11px] font-semibold text-slate-300">{c.user?.name || 'User'}</p>
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
              <button onClick={postComment} className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold">Post</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
