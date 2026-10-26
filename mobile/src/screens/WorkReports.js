// Website: /work-reports — "Cross-Department Daily Work Reports" (HR) / "Department Logs" (Dept Head)
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import {
  C, Screen, PageHeader, Card, Badge, Btn, Field, Select, Sheet, MiniStat, Row,
  Loading, Empty, fmtDateTime, num, u,
} from '../ui';
import { useData } from '../useData';

export const SHIFTS = ['Day Shift', 'Night Shift', 'General Shift'].map(s => ({ value: s, label: s }));
export const LOG_STATUSES = [
  { value: 'On Schedule', label: 'On Schedule' },
  { value: 'Ahead', label: 'Ahead of Plan' },
  { value: 'Delayed', label: 'Delayed / Bottleneck' },
  { value: 'Halted', label: 'Halted / Maintenance' },
];

export const statusTone = s => (s === 'Delayed' || s === 'Halted' ? 'red' : s === 'Ahead' ? 'green' : 'blue');

export function blankLog(deptId) {
  return {
    departmentId: deptId || '', shift: 'Day Shift', targetOutput: '3000', actualOutput: '2900',
    manpowerPresent: '25', manpowerRequired: '28', status: 'On Schedule', blockers: '', notes: '',
  };
}

// Shared form body (used here and on the Dept Head dashboard)
export function WorkLogFields({ form, setForm, departments, showDept = true }) {
  const set = k => v => setForm(f => ({ ...f, [k]: v }));
  return (
    <>
      {showDept && (
        <Select label="Department *" value={form.departmentId} onChange={set('departmentId')} placeholder="Select Department..."
          options={(departments || []).map(d => ({ value: d.id, label: d.name }))} />
      )}
      <Select label="Shift" value={form.shift} onChange={set('shift')} options={SHIFTS} />
      <Row>
        <Field label="Target Output (Units) *" value={form.targetOutput} onChange={set('targetOutput')} keyboardType="number-pad" />
        <Field label="Actual Completed *" value={form.actualOutput} onChange={set('actualOutput')} keyboardType="number-pad" />
      </Row>
      <Row>
        <Field label="Workers Present *" value={form.manpowerPresent} onChange={set('manpowerPresent')} keyboardType="number-pad" />
        <Field label="Workers Required" value={form.manpowerRequired} onChange={set('manpowerRequired')} keyboardType="number-pad" />
      </Row>
      <Select label="Schedule Status" value={form.status} onChange={set('status')} options={LOG_STATUSES} />
      <Field label="Report Blocker / Request Staffing from HR" value={form.blockers} onChange={set('blockers')} multiline placeholder="Report missing staff, material shortage, machine breakdown..." />
      <Field label="Notes / Batch Remarks" value={form.notes} onChange={set('notes')} placeholder="Lot numbers, quality remarks..." />
    </>
  );
}

export function logPayload(form) {
  const n = v => parseInt(v, 10) || 0;
  return {
    departmentId: n(form.departmentId), shift: form.shift, targetOutput: n(form.targetOutput), actualOutput: n(form.actualOutput),
    manpowerPresent: n(form.manpowerPresent), manpowerRequired: n(form.manpowerRequired), status: form.status,
    blockers: form.blockers || undefined, notes: form.notes || undefined,
  };
}

export function WorkLogCard({ log }) {
  const eff = log.targetOutput ? Math.round((log.actualOutput / log.targetOutput) * 100) : 0;
  return (
    <Card tone={log.status === 'Delayed' ? 'red' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ backgroundColor: '#6366f133', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 }}>
          <Text style={{ color: C.indigoText, fontWeight: '900', fontSize: 11 }}>{log.department?.code || 'DEP'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{log.department?.name} <Text style={{ color: C.sub, fontSize: 12, fontWeight: '500' }}>• {log.shift}</Text></Text>
          <Text style={u.small}>Reported by <Text style={{ color: '#e2e8f0', fontWeight: '700' }}>{log.reportedBy?.name}</Text> • {fmtDateTime(log.createdAt)}</Text>
        </View>
        <Badge label={log.status} tone={statusTone(log.status)} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <MiniStat label="Shift Target" value={`${num(log.targetOutput)} units`} />
        <MiniStat label="Actual Completed" value={`${num(log.actualOutput)} units`} color={C.emerald} />
        <MiniStat label="Staff Present" value={`${log.manpowerPresent} / ${log.manpowerRequired}`} />
        <MiniStat label="Target Achievement" value={`${eff}%`} color={eff >= 100 ? C.emerald : eff >= 90 ? C.indigoText : C.amber} />
      </View>
      {log.blockers ? (
        <View style={{ backgroundColor: '#ef44441a', borderWidth: 1, borderColor: '#ef444433', borderRadius: 12, padding: 10, marginTop: 10 }}>
          <Text style={{ color: '#fca5a5', fontSize: 11, fontWeight: '800', marginBottom: 2 }}>Floor Issue / Blocker Reported to HR:</Text>
          <Text style={{ color: '#fecaca', fontSize: 12 }}>{log.blockers}</Text>
        </View>
      ) : null}
      {log.notes ? <Text style={{ color: C.sub, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>"{log.notes}"</Text> : null}
    </Card>
  );
}

export default function WorkReports({ api, user, isHr, refreshSignal }) {
  const { data, loading, error, reload, refreshControl } = useData(
    () => Promise.all([api('/worklogs'), api('/departments')]).then(([logs, departments]) => ({ logs, departments })),
    [refreshSignal],
  );
  const [deptFilter, setDept]     = useState('all');
  const [statusFilter, setStatus] = useState('all');
  const [show, setShow]           = useState(false);
  const [form, setForm]           = useState(blankLog(user?.departmentId));
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState(null);

  if (loading && !data) return <Loading text="Loading work reports..." />;

  const logs = (data?.logs || []).filter(l =>
    (deptFilter === 'all' || l.departmentId === deptFilter) && (statusFilter === 'all' || l.status === statusFilter));

  async function submit() {
    if (!form.departmentId) { setErr('Select a department.'); return; }
    setSaving(true); setErr(null);
    try {
      await api('/worklogs', 'POST', logPayload(form));
      setShow(false);
      setForm(blankLog(user?.departmentId));
      reload();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <Screen refreshControl={refreshControl}>
      <PageHeader
        title={isHr ? 'Cross-Department Daily Work Reports' : 'Department Logs'}
        subtitle="Real-time feed of shift output, attendance counts, and blocker reports submitted by all 10 Department Heads."
        actions={<Btn icon="add" title="Submit Daily Work Report" onPress={() => { setErr(null); setShow(true); }} />}
      />
      {error ? <Empty text={error} /> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Select label="Department" value={deptFilter} onChange={setDept}
            options={[{ value: 'all', label: 'All 10 Departments' }, ...(data?.departments || []).map(d => ({ value: d.id, label: d.name }))]} />
        </View>
        <View style={{ flex: 1 }}>
          <Select label="Status" value={statusFilter} onChange={setStatus}
            options={[{ value: 'all', label: 'All Statuses' }, { value: 'On Schedule', label: 'On Schedule' }, { value: 'Ahead', label: 'Ahead' }, { value: 'Delayed', label: 'Delayed / Bottleneck' }, { value: 'Halted', label: 'Halted' }]} />
        </View>
      </View>
      <Text style={[u.small, { marginBottom: 10 }]}>{logs.length} reports</Text>

      {logs.map(l => <WorkLogCard key={l.id} log={l} />)}
      {!logs.length && <Empty text="No work reports found matching the criteria." />}

      <Sheet visible={show} title="Submit Department Daily Work Report" subtitle="Updates will be logged into the central HR platform immediately." onClose={() => setShow(false)}
        footer={<>
          <Btn kind="ghost" title="Cancel" onPress={() => setShow(false)} style={{ flex: 1 }} />
          <Btn title="Submit Report" onPress={submit} loading={saving} style={{ flex: 1 }} />
        </>}>
        <WorkLogFields form={form} setForm={setForm} departments={data?.departments} />
        {err ? <Text style={{ color: C.red, fontSize: 12, fontWeight: '700' }}>{err}</Text> : null}
      </Sheet>
    </Screen>
  );
}
