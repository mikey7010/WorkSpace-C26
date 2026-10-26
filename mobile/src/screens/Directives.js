// Website: /directives — "HR Directives & Platform Broadcasts"
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { C, Screen, PageHeader, Card, Badge, Btn, Field, Select, Sheet, Row, Avatar, Loading, Empty, fmtDate, u } from '../ui';
import { useData } from '../useData';

const blank = () => ({ title: '', content: '', category: 'Recruitment Milestone', priority: 'Normal', targetDepartmentId: '' });

export default function Directives({ api, isHr, refreshSignal }) {
  const { data, loading, error, reload, refreshControl } = useData(
    () => Promise.all([api('/directives'), api('/departments')]).then(([directives, departments]) => ({ directives, departments })),
    [refreshSignal],
  );
  const [show, setShow]     = useState(false);
  const [form, setForm]     = useState(blank());
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState(null);

  if (loading && !data) return <Loading text="Loading directives..." />;
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  async function publish() {
    if (!form.title.trim() || !form.content.trim()) { setErr('Title and message are required.'); return; }
    setSaving(true); setErr(null);
    try {
      await api('/directives', 'POST', { ...form, targetDepartmentId: form.targetDepartmentId ? Number(form.targetDepartmentId) : null });
      setShow(false); setForm(blank()); reload();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <Screen refreshControl={refreshControl}>
      <PageHeader
        title={isHr ? 'HR Directives & Platform Broadcasts' : 'HR Directives'}
        subtitle="Official announcements, recruitment milestone progress, client contract updates, and factory-wide compliance notices."
        actions={isHr ? <Btn icon="add" title="New Directive Broadcast" onPress={() => { setErr(null); setShow(true); }} /> : null}
      />
      {error ? <Empty text={error} /> : null}

      {(data?.directives || []).map(d => {
        const urgent = d.priority === 'Urgent';
        const high = d.priority === 'High';
        return (
          <Card key={d.id} tone={urgent ? 'red' : high ? 'amber' : undefined}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <Badge label={`${d.priority} Priority`} tone={urgent ? 'red' : high ? 'amber' : 'indigo'} />
              <Badge label={d.category} tone="slate" />
              <Badge label={d.targetDepartment ? `To: ${d.targetDepartment.name}` : 'To: All 10 Departments'} tone={d.targetDepartment ? 'purple' : 'green'} />
            </View>
            <Text style={[u.small, { marginTop: 8 }]}>{fmtDate(d.createdAt)}</Text>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16, marginTop: 4 }}>{d.title}</Text>
            <Text style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 19, marginTop: 6 }}>{d.content}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 }}>
              <Avatar name={d.author?.name || ''} id={d.authorId} size={24} />
              <Text style={[u.small, { marginTop: 0, flex: 1 }]}>Issued by <Text style={{ color: '#e2e8f0', fontWeight: '800' }}>{d.author?.name}</Text> ({d.author?.designation || 'HR Officer'})</Text>
            </View>
          </Card>
        );
      })}
      {!data?.directives?.length && <Empty text="No directives published yet." />}

      <Sheet visible={show} title="Broadcast HR Work / Policy Directive" subtitle="Published directives appear instantly on all 10 Department Heads' portals." onClose={() => setShow(false)}
        footer={<><Btn kind="ghost" title="Cancel" onPress={() => setShow(false)} style={{ flex: 1 }} /><Btn title="Broadcast Directive" onPress={publish} loading={saving} style={{ flex: 1 }} /></>}>
        <Field label="Directive Title *" value={form.title} onChange={set('title')} placeholder="e.g. 10 Engineers Hired for Jan Deployment — Pre-Induction Instructions" />
        <Row>
          <Select label="Category" value={form.category} onChange={set('category')} options={[
            { value: 'Recruitment Milestone', label: 'Recruitment Milestone' }, { value: 'Policy Update', label: 'Policy Update' },
            { value: 'Shift Notice', label: 'Shift Notice' }, { value: 'Urgent Request', label: 'Urgent Notice' },
          ]} />
          <Select label="Priority" value={form.priority} onChange={set('priority')} options={['Normal', 'High', 'Urgent'].map(p => ({ value: p, label: p }))} />
        </Row>
        <Select label="Target Department (Optional)" value={form.targetDepartmentId} onChange={set('targetDepartmentId')}
          options={[{ value: '', label: 'All 10 Departments (Default)' }, ...(data?.departments || []).map(d => ({ value: d.id, label: d.name }))]} />
        <Field label="Message Content *" value={form.content} onChange={set('content')} multiline placeholder="Detail the progress, instructions, or policy changes..." />
        {err ? <Text style={{ color: C.red, fontSize: 12, fontWeight: '700' }}>{err}</Text> : null}
      </Sheet>
    </Screen>
  );
}
