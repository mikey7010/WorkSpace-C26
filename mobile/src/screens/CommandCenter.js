// Website: /hr-dashboard — "HR Operations & 10 Departments Command Center"
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import {
  C, Screen, PageHeader, Card, SectionTitle, Kpi, KpiGrid, Badge, Btn, Field, Select, Notice,
  BarChart, Avatar, Loading, Empty, Icon, fmtDateTime, num, u,
} from '../ui';
import { useData } from '../useData';

const STAGE_COLORS = {
  Applied: '#94a3b8', Interview: '#3b82f6', Consultation: '#8b5cf6',
  Offered: '#f59e0b', Onboarding: '#06b6d4', Joined: '#22c55e',
};

const CATEGORIES = [
  { value: 'Recruitment Milestone', label: '🎯 Recruitment Milestone (Client Updates)' },
  { value: 'Policy Update', label: '📜 Policy & Compliance Update' },
  { value: 'Shift Notice', label: '⏰ Shift & Overtime Notice' },
  { value: 'Urgent Request', label: '🚨 Urgent Staffing / Safety Notice' },
];

export default function CommandCenter({ api, refreshSignal }) {
  const { data, loading, error, reload, refreshControl } = useData(() => api('/analytics/hr-overview'), [refreshSignal]);
  const [title, setTitle]     = useState('');
  const [content, setContent] = useState('');
  const [cat, setCat]         = useState('Recruitment Milestone');
  const [sending, setSending] = useState(false);
  const [msg, setMsg]         = useState(null);

  async function broadcast() {
    if (!title.trim() || !content.trim()) { setMsg({ tone: 'red', text: 'Title and details are required.' }); return; }
    setSending(true);
    try {
      await api('/directives', 'POST', { title, content, category: cat, priority: 'High' });
      setTitle(''); setContent('');
      setMsg({ tone: 'green', text: '✓ Directive broadcasted successfully to all 10 Department Heads!' });
      setTimeout(() => setMsg(null), 3000);
      reload();
    } catch (e) {
      setMsg({ tone: 'red', text: 'Failed to publish directive: ' + e.message });
    } finally { setSending(false); }
  }

  if (loading && !data) return <Loading text="Loading command center..." />;
  if (!data) return <Screen refreshControl={refreshControl}><Empty text={error || 'No data'} /></Screen>;

  const pct = data.totalTargetManpower ? Math.round((data.totalCurrentManpower / data.totalTargetManpower) * 100) : 0;
  const stages = Object.keys(data.candidateStages || {}).map(k => ({ name: k, value: data.candidateStages[k], color: STAGE_COLORS[k] || C.indigo })).filter(s => s.value > 0);
  const stageTotal = stages.reduce((s, x) => s + x.value, 0);

  return (
    <Screen refreshControl={refreshControl}>
      <PageHeader
        live eyebrow="Live Production & HR Sync"
        title="HR Operations & 10 Departments Command Center"
        subtitle="Monitor real-time shift updates from all 10 department heads, recruitment pipelines, and onboarding milestones."
        actions={<Btn small kind="ghost" icon="refresh-outline" title="Refresh Feed" onPress={reload} />}
      />

      <KpiGrid>
        <Kpi label="10 Departments" badge="10" value={num(data.totalCurrentManpower)} suffix={`/ ${num(data.totalTargetManpower)}`} progress={pct} note={`${pct}% Staffed`} />
        <Kpi label="Today's Total Output" badge="✓" badgeColor={C.emerald} color={C.emerald} value={num(data.totalOutputToday)} suffix="units" note="Across Cutting, Assembly, Finishing & Packaging" />
        <Kpi label="Active Recruitment" badge="🎯" badgeColor={C.amber} color={C.amber} value={num(data.totalRequiredRecruits)} suffix="openings" note={`${data.activeDemandsCount} Client demands (Engineers, Supervisors)`} />
        <Kpi label="Staffing Shortages / Alerts" badge="⚠" badgeColor={C.red} color={C.red} value={data.activeBlockers?.length || 0} note="Reported by Department Heads today" />
      </KpiGrid>

      {data.activeBlockers?.length > 0 && (
        <Card tone="red">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="warning-outline" size={18} color={C.red} />
            <Text style={{ color: '#fca5a5', fontWeight: '800', fontSize: 13, flex: 1 }}>Live Department Blockers Requiring HR Attention</Text>
          </View>
          {data.activeBlockers.map(b => (
            <View key={b.id} style={{ backgroundColor: '#0f172ae6', borderWidth: 1, borderColor: '#ef444433', borderRadius: 12, padding: 10, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12, flex: 1 }}>{b.deptName}</Text>
                <Text style={{ color: C.sub, fontSize: 10 }}>Reported by {b.reporter}</Text>
              </View>
              <Text style={{ color: '#fca5a5e6', fontSize: 12, lineHeight: 17 }}>{b.blocker}</Text>
            </View>
          ))}
        </Card>
      )}

      <Card>
        <SectionTitle
          title="Workforce Capacity Across 10 Departments"
          subtitle="Current active staff vs. approved manpower target"
          right={<Badge label={`Gap: ${data.manpowerGap} vacancies`} tone="indigo" />}
        />
        <BarChart
          data={(data.departments || []).map(d => ({ label: d.code, values: [d.currentManpower, d.targetManpower] }))}
          series={[{ name: 'Current Staff', color: '#6366f1' }, { name: 'Target', color: '#334155' }]}
          height={170}
        />
      </Card>

      <Card>
        <SectionTitle title="Recruitment Pipeline" subtitle="Candidates across sourcing, interview, consultation & onboarding" />
        {stageTotal > 0 ? (
          <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2, marginBottom: 12 }}>
            {stages.map(s => <View key={s.name} style={{ flex: s.value, backgroundColor: s.color }} />)}
          </View>
        ) : <Text style={u.small}>No candidates yet.</Text>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 }}>
          {stages.map(s => (
            <View key={s.name} style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
              <Text style={{ color: C.sub, fontSize: 12, flex: 1 }}>{s.name}</Text>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{s.value}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle title="10 Departments Live Status" subtitle="Real-time shift output, department head & status" right={<Text style={u.small}>All {data.departments?.length || 0} active</Text>} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(data.departments || []).map(d => {
            const log = d.workLogs?.[0];
            const tone = log?.status === 'Delayed' ? 'red' : log?.status === 'Ahead' ? 'green' : 'blue';
            return (
              <View key={d.id} style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: '#1e293b99', borderWidth: 1, borderColor: '#33415599', borderRadius: 16, padding: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Badge label={d.code} tone="indigo" />
                  <Badge label={log?.status || 'Active'} tone={tone} />
                </View>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }} numberOfLines={1}>{d.name}</Text>
                <Text style={{ color: C.sub, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{d.head?.name || 'Head Assigned'}</Text>
                <View style={{ borderTopWidth: 1, borderTopColor: '#33415580', marginTop: 8, paddingTop: 6 }}>
                  <Text style={{ color: C.sub, fontSize: 10.5 }}>Staff: <Text style={{ color: '#fff', fontWeight: '800' }}>{d.currentManpower}</Text>/{d.targetManpower}</Text>
                  <Text style={{ color: C.sub, fontSize: 10.5 }}>Output: <Text style={{ color: C.emerald, fontWeight: '800' }}>{log?.actualOutput || '—'}</Text></Text>
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <SectionTitle title="📢 Broadcast HR Work / Directive to Platform" subtitle="Anything you update here will immediately be published and visible to all 10 Department Heads on their dashboards." />
        {msg && <Notice tone={msg.tone} text={msg.text} />}
        <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. Sourced 10 Engineer profiles for Nordic Jan batch..." />
        <Select label="Category" value={cat} options={CATEGORIES} onChange={setCat} />
        <Field label="Details & Action Required" value={content} onChange={setContent} multiline placeholder="Write the work updates or instructions for department heads..." />
        <Btn title="Broadcast to All 10 Department Heads" onPress={broadcast} loading={sending} />
      </Card>

      <Card>
        <SectionTitle title="Live Activity Stream" subtitle="Chronological log of work reported by department heads & HR actions" />
        {(data.activityLogs || []).map(a => (
          <View key={a.id} style={{ flexDirection: 'row', gap: 10, padding: 10, borderRadius: 12, backgroundColor: '#1e293b80', borderWidth: 1, borderColor: C.border, marginBottom: 8 }}>
            <Avatar name={a.user?.name || 'User'} id={a.userId} size={28} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#e2e8f0', fontSize: 12, lineHeight: 17 }}>{a.action}</Text>
              <Text style={{ color: C.dim, fontSize: 10, marginTop: 4 }}>{fmtDateTime(a.createdAt)}</Text>
            </View>
          </View>
        ))}
        {!data.activityLogs?.length && <Text style={u.small}>No activity yet.</Text>}
      </Card>
    </Screen>
  );
}
