// Website: /dept-dashboard — "My Department Live" (Department Head Portal)
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { C, Screen, Card, SectionTitle, Kpi, KpiGrid, Badge, Btn, Notice, MiniStat, Avatar, Loading, Empty, fmtDate, num, u } from '../ui';
import { useData } from '../useData';
import { WorkLogFields, logPayload, blankLog } from './WorkReports';

export default function DeptDashboard({ api, user, refreshSignal }) {
  const deptId = user?.departmentId;
  const { data, loading, error, reload, refreshControl } = useData(() => {
    if (!deptId) return Promise.resolve(null);
    return Promise.all([
      api(`/departments/${deptId}`),
      api(`/worklogs?departmentId=${deptId}`),
      api('/directives'),
      api('/recruitment/candidates'),
    ]).then(([dept, logs, directives, cands]) => ({
      dept, logs, directives, hires: cands.filter(c => c.departmentId === deptId || !c.departmentId),
    }));
  }, [refreshSignal, deptId]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ ...blankLog(deptId), targetOutput: '4000', actualOutput: '3850', manpowerPresent: '28', manpowerRequired: '30' });
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);
  const [err, setErr]           = useState(null);

  if (loading && !data) return <Loading text="Loading your department..." />;
  if (!deptId) return <Screen><Empty text="Your account is not linked to a department yet. Ask HR to assign one." /></Screen>;
  if (!data) return <Screen refreshControl={refreshControl}><Empty text={error || 'No data'} /></Screen>;

  const { dept, logs, directives, hires } = data;
  const latest = logs[0];
  const eff = latest?.targetOutput ? Math.round((latest.actualOutput / latest.targetOutput) * 100) : 0;
  const vac = (dept?.targetManpower || 0) - (dept?.currentManpower || 0);

  async function submit() {
    setSaving(true); setErr(null);
    try {
      await api('/worklogs', 'POST', logPayload({ ...form, departmentId: deptId }));
      setShowForm(false); setDone(true); setTimeout(() => setDone(false), 4000);
      reload();
    } catch (e) { setErr('Failed to submit work log: ' + e.message); } finally { setSaving(false); }
  }

  return (
    <Screen refreshControl={refreshControl}>
      <Card tone="indigo">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ backgroundColor: C.indigo6, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>{dept?.code || 'DEP'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Badge label="Department Head Portal" tone="green" />
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 19, marginTop: 4 }}>{dept?.name || 'Department Floor'}</Text>
            <Text style={u.small}>Logged in as <Text style={{ color: '#fff', fontWeight: '800' }}>{user?.name}</Text> ({user?.designation || 'Department Head'})</Text>
          </View>
        </View>
        <Btn icon={showForm ? 'close' : 'create-outline'} title={showForm ? 'Close Report Form' : 'Submit Today’s Shift Work Log'} onPress={() => setShowForm(s => !s)} style={{ marginTop: 14 }} />
      </Card>

      {done && <Notice text="✓ Your daily work log has been synchronized and sent directly to the HR Operations Dashboard!" />}

      {showForm && (
        <Card>
          <SectionTitle title="Record Shift Output & Report to HR" subtitle="Log production metrics, present worker count, and any blockers for HR support." />
          <WorkLogFields form={form} setForm={setForm} showDept={false} />
          {err ? <Text style={{ color: C.red, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>{err}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn kind="ghost" title="Cancel" onPress={() => setShowForm(false)} style={{ flex: 1 }} />
            <Btn kind="success" title="Send Work Report to HR" onPress={submit} loading={saving} style={{ flex: 2 }} />
          </View>
        </Card>
      )}

      <KpiGrid>
        <Kpi label="Current Floor Staff" value={dept?.currentManpower || 0} suffix={`/ ${dept?.targetManpower || 0}`} note={vac > 0 ? `${vac} vacancies requested from HR` : 'Full capacity'} />
        <Kpi label="Today's Shift Output" color={C.emerald} value={num(latest?.actualOutput)} suffix="units" note={`Target: ${num(latest?.targetOutput)} units`} />
        <Kpi label="Shift Efficiency" color={C.indigoText} value={`${eff}%`} note={`Status: ${latest?.status || 'Active'}`} />
        <Kpi label="HR Broadcasts" color={C.amber} value={directives.length} note="Active directives & hiring notices" />
      </KpiGrid>

      <Card>
        <SectionTitle title="📢 Directives from HR Management" subtitle="Updates on client contracts, hiring progress, and factory policies" />
        {directives.map(d => (
          <View key={d.id} style={{ backgroundColor: '#1e293b80', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge label={d.category} tone="indigo" />
              <Text style={{ color: C.dim, fontSize: 10 }}>{fmtDate(d.createdAt)}</Text>
            </View>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, marginTop: 6 }}>{d.title}</Text>
            <Text style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 17, marginTop: 4 }}>{d.content}</Text>
            <Text style={[u.small, { marginTop: 6 }]}>Issued by {d.author?.name}</Text>
          </View>
        ))}
        {!directives.length && <Text style={u.small}>No directives yet.</Text>}
      </Card>

      <Card>
        <SectionTitle title="New Recruits Arriving For Your Department" subtitle="Supervisors & engineers currently in onboarding or scheduled to join" />
        {hires.map(c => (
          <View key={c.id} style={{ backgroundColor: '#1e293b80', borderRadius: 14, padding: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={c.name} id={c.id} size={28} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{c.name}</Text>
                <Text style={u.small}>{c.appliedRole}</Text>
              </View>
              <Badge label={`${c.onboardingProgress}% Ready`} tone={c.onboardingProgress === 100 ? 'green' : 'cyan'} />
            </View>
            <Text style={[u.small, { marginTop: 8 }]}>
              Joining Date: <Text style={{ color: '#fff', fontWeight: '700' }}>{c.joiningDate ? fmtDate(c.joiningDate) : 'TBD'}</Text>  •  Mentor: <Text style={{ color: '#fff', fontWeight: '700' }}>{c.mentorAssigned ? 'Assigned' : 'Pending'}</Text>
            </Text>
          </View>
        ))}
        {!hires.length && <Text style={u.small}>No new recruits currently assigned to this department.</Text>}
      </Card>

      <Card>
        <SectionTitle title="Your Department's Shift Log History" subtitle="Past reports recorded in the HR operations database" />
        {logs.map(l => (
          <View key={l.id} style={{ backgroundColor: '#1e293b66', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{l.shift} • {fmtDate(l.createdAt)}</Text>
              <Badge label={l.status} tone={l.status === 'Delayed' ? 'red' : 'green'} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <MiniStat label="Target" value={l.targetOutput} />
              <MiniStat label="Output" value={l.actualOutput} color={C.emerald} />
              <MiniStat label="Present" value={`${l.manpowerPresent} workers`} />
              <MiniStat label="Shortfall" value={l.manpowerRequired - l.manpowerPresent} color={C.amber} />
            </View>
            {l.blockers ? <Text style={{ color: '#fca5a5', fontSize: 12, marginTop: 8 }}><Text style={{ fontWeight: '800' }}>Blocker: </Text>{l.blockers}</Text> : null}
          </View>
        ))}
        {!logs.length && <Text style={u.small}>No shift logs yet.</Text>}
      </Card>
    </Screen>
  );
}
