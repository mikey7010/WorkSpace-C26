// Website: /tasks — "Task Board" (drag & drop on web → tap "Move to" on mobile)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C, Screen, PageHeader, Card, Badge, Btn, Field, Select, Sheet, Row, Avatar, Loading, Empty, fmtDate, u } from '../ui';
import { useData } from '../useData';

const COLS = [
  { key: 'todo', label: 'To Do', color: '#94a3b8' },
  { key: 'inprog', label: 'In Progress', color: '#3b82f6' },
  { key: 'review', label: 'Review', color: '#f59e0b' },
  { key: 'done', label: 'Done', color: '#22c55e' },
];
const PRIO = { high: ['🔴 High', 'red'], medium: ['🟡 Medium', 'amber'], low: ['🟢 Low', 'green'] };
const blank = () => ({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });

export default function TaskBoard({ api, isHr, refreshSignal }) {
  const { data, setData, loading, error, reload, refreshControl } = useData(
    () => Promise.all([api('/tasks'), api('/users').catch(() => [])]).then(([tasks, users]) => ({ tasks, users: users.filter(x => x.role !== 'hr_admin' && x.role !== 'admin') })),
    [refreshSignal],
  );
  const [col, setCol]           = useState('todo');
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment]   = useState('');
  const [showCreate, setCreate] = useState(false);
  const [form, setForm]         = useState(blank());
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState(null);

  if (loading && !data) return <Loading text="Loading tasks..." />;
  const tasks = data?.tasks || [];
  const colTasks = k => tasks.filter(t => t.status === k);

  async function open(t) {
    setSelected(t); setComments([]); setErr(null);
    api(`/comments?taskId=${t.id}`).then(setComments).catch(() => {});
  }

  async function move(t, status) {
    setData(d => ({ ...d, tasks: d.tasks.map(x => (x.id === t.id ? { ...x, status } : x)) }));
    setSelected(s => (s ? { ...s, status } : s));
    try { await api(`/tasks/${t.id}`, 'PUT', { status }); reload(); } catch (e) { setErr(e.message); reload(); }
  }

  async function post() {
    if (!comment.trim()) return;
    try {
      await api('/comments', 'POST', { taskId: selected.id, text: comment });
      setComment('');
      setComments(await api(`/comments?taskId=${selected.id}`));
    } catch (e) { setErr(e.message); }
  }

  async function create() {
    if (!form.title.trim() || !form.assignedTo) { setErr('Title and assignee are required.'); return; }
    setSaving(true); setErr(null);
    try {
      await api('/tasks', 'POST', { ...form, assignedTo: Number(form.assignedTo), dueDate: form.dueDate || undefined });
      setCreate(false); setForm(blank()); reload();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  return (
    <Screen refreshControl={refreshControl}>
      <PageHeader title={isHr ? 'Task Board' : 'My Tasks'} subtitle={isHr ? 'Tap a card to update its status or add comments' : 'Tasks assigned to you by HR — tap a card to update status or comment'}
        actions={isHr ? <Btn icon="add" title="New Task" onPress={() => { setErr(null); setCreate(true); }} /> : null} />
      {error ? <Empty text={error} /> : null}

      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
        {COLS.map(c => {
          const active = c.key === col;
          return (
            <TouchableOpacity key={c.key} onPress={() => setCol(c.key)} style={{ flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: active ? C.card2 : C.card, borderWidth: 1, borderColor: active ? c.color : C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.color }} />
                <Text style={{ color: active ? '#fff' : C.sub, fontSize: 11, fontWeight: '800' }}>{c.label}</Text>
              </View>
              <Text style={{ color: active ? '#fff' : C.dim, fontWeight: '900', fontSize: 14, marginTop: 2 }}>{colTasks(c.key).length}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {colTasks(col).map(t => {
        const overdue = t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date();
        return (
          <Card key={t.id} onPress={() => open(t)} tone={overdue ? 'red' : undefined} style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, flex: 1 }}>{t.title}</Text>
              <Badge label={(PRIO[t.priority] || PRIO.medium)[0]} tone={(PRIO[t.priority] || PRIO.medium)[1]} />
            </View>
            {t.description ? <Text style={[u.small, { marginTop: 6 }]} numberOfLines={2}>{t.description}</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
              {t.assignee ? <Avatar name={t.assignee.name} id={t.assignee.id} size={22} /> : null}
              <Text style={[u.small, { marginTop: 0, flex: 1 }]}>{t.assignee?.name || 'Unassigned'}</Text>
              <Text style={{ color: overdue ? C.red : C.sub, fontSize: 11 }}>{t.dueDate ? fmtDate(t.dueDate) : '—'}</Text>
            </View>
            {overdue ? <Text style={{ color: C.red, fontSize: 11, fontWeight: '800', marginTop: 6 }}>⚠ Overdue</Text> : null}
            {t._count?.comments > 0 ? <Text style={[u.small, { marginTop: 4 }]}>💬 {t._count.comments}</Text> : null}
          </Card>
        );
      })}
      {!colTasks(col).length && <Empty text="No tasks in this column." />}

      <Sheet visible={!!selected} title={selected?.title || ''} onClose={() => setSelected(null)}>
        {selected && <>
          <Text style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 19 }}>{selected.description || 'No description.'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            <Badge label={selected.assignee?.name || 'Unassigned'} tone="indigo" />
            <Badge label={(PRIO[selected.priority] || PRIO.medium)[0]} tone={(PRIO[selected.priority] || PRIO.medium)[1]} />
            {selected.dueDate ? <Badge label={`Due: ${fmtDate(selected.dueDate)}`} tone="slate" /> : null}
          </View>
          <Text style={[u.label, { marginTop: 14 }]}>Move to</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {COLS.map(c => (
              <Btn key={c.key} small kind={selected.status === c.key ? 'primary' : 'ghost'} title={c.label} onPress={() => move(selected, c.key)} />
            ))}
          </View>
          <Text style={[u.label, { marginTop: 16 }]}>Comments ({comments.length})</Text>
          {comments.map(c => (
            <View key={c.id} style={{ backgroundColor: C.card2, borderRadius: 12, padding: 10, marginBottom: 8 }}>
              <Text style={{ color: C.indigoText, fontWeight: '800', fontSize: 12 }}>{c.user?.name}</Text>
              <Text style={{ color: '#e2e8f0', fontSize: 13, marginTop: 2 }}>{c.text}</Text>
            </View>
          ))}
          {!comments.length && <Text style={[u.small, { marginBottom: 8 }]}>No comments yet.</Text>}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}><Field value={comment} onChange={setComment} placeholder="Add a comment…" /></View>
            <Btn title="Post" onPress={post} />
          </View>
          {err ? <Text style={{ color: C.red, fontSize: 12, fontWeight: '700' }}>{err}</Text> : null}
        </>}
      </Sheet>

      <Sheet visible={showCreate} title="Create Task" onClose={() => setCreate(false)}
        footer={<Btn title="Create Task" onPress={create} loading={saving} style={{ flex: 1 }} />}>
        <Field label="Title *" value={form.title} onChange={set('title')} />
        <Field label="Description" value={form.description} onChange={set('description')} multiline />
        <Row>
          <Select label="Assign to *" value={form.assignedTo} onChange={set('assignedTo')} placeholder="Select…"
            options={(data?.users || []).map(x => ({ value: x.id, label: x.designation ? `${x.name} — ${x.designation}` : x.name }))} />
          <Select label="Priority" value={form.priority} onChange={set('priority')} options={Object.entries(PRIO).map(([k, v]) => ({ value: k, label: v[0] }))} />
        </Row>
        <Field label="Due Date (YYYY-MM-DD)" value={form.dueDate} onChange={set('dueDate')} placeholder="2026-11-15" />
        {!(data?.users || []).length ? <Text style={u.small}>No team members available to assign.</Text> : null}
        {err ? <Text style={{ color: C.red, fontSize: 12, fontWeight: '700' }}>{err}</Text> : null}
      </Sheet>
    </Screen>
  );
}
